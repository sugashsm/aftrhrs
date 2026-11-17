import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { all, get, json, now, run } from '../db';
import { HttpError, idParam, parse, requireAuth } from '../http';
import { allSongs, songsByIds } from '../queries';
import { tasteOf } from '../recommend';
import { initialState, type ConvState, type EngineReply } from '../ai/engine';
import { getProvider } from '../ai/provider';
import { STYLE_OPENERS } from '../ai/lexicon';
import { CONVERSATION_STYLES } from '../../../shared/constants';

export const ai = Router();

const limiter = rateLimit({ windowMs: 60_000, limit: 60, skip: () => process.env.NODE_ENV === 'test', message: { error: 'Give me a second to catch up. Try again shortly.' } });
const styles = CONVERSATION_STYLES.map((s) => s.key) as [string, ...string[]];
const hour = z.number().int().min(0).max(23).optional();

/** Stored payloads keep song ids only; hydrate them so saved-state is always current. */
function hydrate(payload: any, v: number) {
  const ids: number[] = [...(payload.recommendations || []), ...(payload.playlist?.songs || [])].map((p: any) => p.songId);
  const map = new Map(songsByIds(ids, v).map((s) => [s.id, s]));
  const fix = (list: any[]) => list.map((p) => ({ song: map.get(p.songId), reason: p.reason })).filter((p) => p.song);
  return {
    ...payload,
    recommendations: payload.recommendations ? fix(payload.recommendations) : undefined,
    playlist: payload.playlist ? { ...payload.playlist, songs: fix(payload.playlist.songs) } : undefined,
  };
}

const toMessage = (m: any, v: number) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at, ...hydrate(json(m.payload, {}), v) });

function compact(r: EngineReply & { engine: string }) {
  const slim = (list: { song: { id: number }; reason: string }[]) => list.map((p) => ({ songId: p.song.id, reason: p.reason }));
  return {
    quickReplies: r.quickReplies,
    detected: r.detected,
    suggestedCaption: r.suggestedCaption,
    engine: r.engine,
    recommendations: r.recommendations ? slim(r.recommendations) : undefined,
    playlist: r.playlist ? { ...r.playlist, songs: slim(r.playlist.songs) } : undefined,
  };
}

ai.get('/ai/status', (_req, res) => {
  const p = getProvider();
  res.json({ engine: p.id, label: p.label, external: p.external, styles: CONVERSATION_STYLES });
});

ai.post('/ai/conversations', requireAuth, limiter, (req, res) => {
  const b = parse(z.object({ style: z.enum(styles).optional(), hour }), req.body ?? {});
  const style = (b.style || 'casual') as ConvState['style'];
  const state = initialState(style, b.hour ?? new Date().getHours());
  const opener = STYLE_OPENERS[style][Math.floor(Math.random() * STYLE_OPENERS[style].length)];
  const { id } = run('INSERT INTO conversations (user_id, style, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', req.user!.id, style, JSON.stringify(state), now(), now());
  const quick = style === 'situational' ? ['Driving', 'Studying', "Can't sleep", 'Cooking'] : ['Play something', 'Something nostalgic', 'Rough day', 'Surprise me'];
  run('INSERT INTO conversation_messages (conversation_id, role, content, payload, created_at) VALUES (?, ?, ?, ?, ?)', id, 'assistant', opener, JSON.stringify({ quickReplies: quick, engine: 'rule-based' }), now());
  res.status(201).json(conversation(id, req.user!.id));
});

function conversation(id: number, v: number) {
  const c = get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', id, v);
  if (!c) throw new HttpError(404, 'That conversation does not exist.');
  const messages = all('SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id', id).map((m) => toMessage(m, v));
  return { conversation: { id: c.id, style: c.style, createdAt: c.created_at, messages } };
}

ai.get('/ai/conversations', requireAuth, (req, res) => {
  const rows = all(
    `SELECT c.id, c.style, c.updated_at, c.state,
       (SELECT content FROM conversation_messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.id LIMIT 1) AS first
     FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 12`,
    req.user!.id,
  );
  res.json({ conversations: rows.filter((r) => r.first).map((r) => ({ id: r.id, style: r.style, updatedAt: r.updated_at, preview: r.first, mood: json<ConvState | null>(r.state, null)?.mood || null })) });
});

ai.get('/ai/conversations/:id', requireAuth, (req, res) => {
  res.json(conversation(idParam(req), req.user!.id));
});

ai.delete('/ai/conversations/:id', requireAuth, (req, res) => {
  run('DELETE FROM conversations WHERE id = ? AND user_id = ?', idParam(req), req.user!.id);
  res.json({ ok: true });
});

ai.post('/ai/conversations/:id/messages', requireAuth, limiter, async (req, res) => {
  const id = idParam(req);
  const v = req.user!.id;
  const b = parse(z.object({ text: z.string().trim().max(500, 'Keep it under 500 characters').optional(), action: z.enum(['regenerate', 'playlist']).optional(), hour }), req.body);
  if (!b.text && !b.action) throw new HttpError(400, 'Say something, or do not. But send something.');
  const c = get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', id, v);
  if (!c) throw new HttpError(404, 'That conversation does not exist.');

  const state = { ...initialState(c.style, b.hour ?? new Date().getHours()), ...json<Partial<ConvState>>(c.state, {}) } as ConvState;
  if (b.hour !== undefined) state.hour = b.hour;
  const history = all<{ role: string; content: string }>('SELECT role, content FROM conversation_messages WHERE conversation_id = ? ORDER BY id', id);
  const text = b.text || (b.action === 'playlist' ? 'Make it a playlist' : 'Another take');

  const reply = await getProvider().reply({ state, text, action: b.action, songs: allSongs(v), taste: tasteOf(v) }, history);

  const userMsg = run('INSERT INTO conversation_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)', id, 'user', text, now());
  const botMsg = run('INSERT INTO conversation_messages (conversation_id, role, content, payload, created_at) VALUES (?, ?, ?, ?, ?)', id, 'assistant', reply.text, JSON.stringify(compact(reply)), now());
  run('UPDATE conversations SET state = ?, updated_at = ? WHERE id = ?', JSON.stringify(reply.state), now(), id);

  const rows = all(`SELECT * FROM conversation_messages WHERE id IN (?, ?) ORDER BY id`, userMsg.id, botMsg.id);
  res.status(201).json({ messages: rows.map((m) => toMessage(m, v)) });
});
