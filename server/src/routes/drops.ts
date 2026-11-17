import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { HttpError, idParam, optionalAuth, parse, requireAuth, viewerId } from '../http';
import { BLOCK_CLAUSE, dropById, listDrops, miniUser, notify, USER_MINI } from '../queries';
import { recommender } from '../recommend';
import { BACKGROUND_KEYS } from '../../../shared/constants';

export const drops = Router();

const PAGE = 8;
const writeLimiter = rateLimit({ windowMs: 60_000, limit: 40, skip: () => process.env.NODE_ENV === 'test', message: { error: 'Slow down a little. Try again in a minute.' } });

const TRENDING = '((SELECT COUNT(*) FROM likes l WHERE l.drop_id = d.id) * 2 + (SELECT COUNT(*) FROM comments c WHERE c.drop_id = d.id) * 3) DESC, d.created_at DESC';

drops.get('/drops', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const feed = String(req.query.feed || 'latest');
  const mood = req.query.mood ? String(req.query.mood).slice(0, 40) : undefined;
  const p = Math.max(0, Math.min(200, Number(req.query.page) || 0));
  const offset = p * PAGE;

  if (feed === 'foryou' && v) {
    const r = recommender.feed(v, PAGE, offset, mood);
    return res.json({ items: r.items, nextPage: r.hasMore ? p + 1 : null });
  }
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  if (mood) {
    where.push('m.name = $mood');
    params.mood = mood;
  }
  if (feed === 'following') {
    if (!v) throw new HttpError(401, 'Log in to see who you follow.');
    where.push('(d.user_id = $v OR EXISTS(SELECT 1 FROM follows ff WHERE ff.follower_id = $v AND ff.following_id = d.user_id))');
  }
  if (feed === 'featured') where.push('d.is_featured = 1');
  const items = listDrops(v, { where: where.join(' AND ') || undefined, params, order: feed === 'trending' ? TRENDING : undefined, limit: PAGE + 1, offset });
  res.json({ items: items.slice(0, PAGE), nextPage: items.length > PAGE ? p + 1 : null });
});

drops.get('/drops/:id', optionalAuth, (req, res) => {
  const d = dropById(idParam(req), viewerId(req));
  if (!d) throw new HttpError(404, 'This Mood Drop is gone, or was never here.');
  res.json({ drop: d });
});

drops.post('/drops', requireAuth, writeLimiter, (req, res) => {
  const b = parse(
    z.object({
      songId: z.number().int().positive(),
      mood: z.string().trim().min(1, 'Choose a mood').max(40),
      caption: z.string().trim().min(1, 'Write a caption. Even one line.').max(280, 'Captions can be up to 280 characters'),
      background: z.enum(BACKGROUND_KEYS as [string, ...string[]]),
      roomSlug: z.string().max(60).nullable().optional(),
      source: z.enum(['user', 'ai']).optional(),
    }),
    req.body,
  );
  const me = req.user!.id;
  if (!get('SELECT 1 AS x FROM songs WHERE id = ?', b.songId)) throw new HttpError(400, 'That song is not in the catalogue.');
  const mood = get('SELECT id FROM moods WHERE name = ?', b.mood);
  if (!mood) throw new HttpError(400, 'Unknown mood.');
  let roomId: number | null = null;
  if (b.roomSlug) {
    const room = get('SELECT id FROM sound_rooms WHERE slug = ?', b.roomSlug);
    if (!room) throw new HttpError(400, 'That Sound Room does not exist.');
    if (!get('SELECT 1 AS x FROM room_memberships WHERE room_id = ? AND user_id = ?', room.id, me)) throw new HttpError(403, 'Join the room before posting in it.');
    roomId = room.id;
  }
  const { id } = run('INSERT INTO mood_drops (user_id, song_id, mood_id, caption, background, room_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', me, b.songId, mood.id, b.caption, b.background, roomId, b.source || 'user', now());
  run('UPDATE users SET current_mood_id = ? WHERE id = ?', mood.id, me);
  res.status(201).json({ drop: dropById(id, me) });
});

drops.delete('/drops/:id', requireAuth, (req, res) => {
  const id = idParam(req);
  const d = get('SELECT user_id FROM mood_drops WHERE id = ?', id);
  if (!d) throw new HttpError(404, 'This Mood Drop is already gone.');
  if (d.user_id !== req.user!.id) throw new HttpError(403, 'You can only delete your own Mood Drops.');
  run('DELETE FROM mood_drops WHERE id = ?', id);
  res.json({ ok: true });
});

/** Ensures the drop exists and is visible to the viewer before any interaction. */
function visible(req: any) {
  const d = dropById(idParam(req), req.user.id);
  if (!d) throw new HttpError(404, 'This Mood Drop is gone, or was never here.');
  return d;
}
const counts = (id: number) => ({
  likeCount: get<{ n: number }>('SELECT COUNT(*) AS n FROM likes WHERE drop_id = ?', id)!.n,
  commentCount: get<{ n: number }>('SELECT COUNT(*) AS n FROM comments WHERE drop_id = ?', id)!.n,
});

drops.post('/drops/:id/like', requireAuth, writeLimiter, (req, res) => {
  const d = visible(req);
  const r = run('INSERT OR IGNORE INTO likes (user_id, drop_id, created_at) VALUES (?, ?, ?)', req.user!.id, d.id, now());
  if (r.changes) notify(d.author.id, req.user!.id, 'like', { dropId: d.id });
  res.json({ liked: true, ...counts(d.id) });
});
drops.delete('/drops/:id/like', requireAuth, (req, res) => {
  const id = idParam(req);
  run('DELETE FROM likes WHERE user_id = ? AND drop_id = ?', req.user!.id, id);
  res.json({ liked: false, ...counts(id) });
});

drops.post('/drops/:id/save', requireAuth, writeLimiter, (req, res) => {
  const d = visible(req);
  run('INSERT OR IGNORE INTO saved_posts (user_id, drop_id, created_at) VALUES (?, ?, ?)', req.user!.id, d.id, now());
  res.json({ saved: true });
});
drops.delete('/drops/:id/save', requireAuth, (req, res) => {
  run('DELETE FROM saved_posts WHERE user_id = ? AND drop_id = ?', req.user!.id, idParam(req));
  res.json({ saved: false });
});

// ── Comments ────────────────────────────────────────────────────────────────
const commentRows = (dropId: number, v: number, extra = '') =>
  all(
    `SELECT c.id AS cid, c.body, c.created_at AS commented_at, ${USER_MINI} FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.drop_id = $d AND ${BLOCK_CLAUSE('u.id')} ${extra} ORDER BY c.created_at, c.id LIMIT 200`,
    { d: dropId, v },
  ).map((c) => ({ id: c.cid, body: c.body, createdAt: c.commented_at, author: miniUser(c), mine: c.id === v }));

drops.get('/drops/:id/comments', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const d = dropById(idParam(req), v);
  if (!d) throw new HttpError(404, 'This Mood Drop is gone, or was never here.');
  res.json({ comments: commentRows(d.id, v) });
});

drops.post('/drops/:id/comments', requireAuth, writeLimiter, (req, res) => {
  const d = visible(req);
  const b = parse(z.object({ body: z.string().trim().min(1, 'Say something first.').max(400, 'Comments can be up to 400 characters') }), req.body);
  const { id } = run('INSERT INTO comments (drop_id, user_id, body, created_at) VALUES (?, ?, ?, ?)', d.id, req.user!.id, b.body, now());
  notify(d.author.id, req.user!.id, 'comment', { dropId: d.id, body: b.body.slice(0, 120) });
  res.status(201).json({ comment: commentRows(d.id, req.user!.id).find((c) => c.id === id), ...counts(d.id) });
});

drops.delete('/comments/:id', requireAuth, (req, res) => {
  const id = idParam(req);
  const c = get('SELECT c.user_id, c.drop_id, d.user_id AS owner FROM comments c JOIN mood_drops d ON d.id = c.drop_id WHERE c.id = ?', id);
  if (!c) throw new HttpError(404, 'That comment is already gone.');
  // Authors can remove their own comment; drop owners can remove comments on their drop.
  if (c.user_id !== req.user!.id && c.owner !== req.user!.id) throw new HttpError(403, 'You cannot remove that comment.');
  run('DELETE FROM comments WHERE id = ?', id);
  res.json({ ok: true, ...counts(c.drop_id) });
});

// ── Reports ─────────────────────────────────────────────────────────────────
drops.post('/drops/:id/report', requireAuth, writeLimiter, (req, res) => {
  const d = visible(req);
  if (d.mine) throw new HttpError(400, 'You cannot report your own Mood Drop.');
  const b = parse(z.object({ reason: z.enum(['spam', 'harassment', 'hate', 'self-harm', 'other']), details: z.string().trim().max(500).optional() }), req.body);
  run('INSERT OR IGNORE INTO reports (reporter_id, drop_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?)', req.user!.id, d.id, b.reason, b.details || '', now());
  res.status(201).json({ ok: true });
});
