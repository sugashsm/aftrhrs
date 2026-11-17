import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run, tx } from '../db';
import { HttpError, idParam, optionalAuth, parse, requireAuth, viewerId } from '../http';
import { allSongs, playlistSummary, songById, songsByIds } from '../queries';
import { enrichSong } from '../itunes';
import { recommender, scoreSong, tasteOf } from '../recommend';

export const music = Router();

// ── Moods ───────────────────────────────────────────────────────────────────
music.get('/moods', optionalAuth, (req, res) => {
  const rows = all('SELECT * FROM moods WHERE is_custom = 0 OR created_by = ? ORDER BY is_custom, id', viewerId(req));
  res.json({ moods: rows.map((m) => ({ id: m.id, name: m.name, c1: m.color1, c2: m.color2, line: m.tagline, custom: !!m.is_custom })) });
});

const PALETTE: [string, string][] = [['#A78BFA', '#3B2F6B'], ['#F0A6C8', '#5A2E4F'], ['#8FB8A8', '#2E4A55'], ['#E9B15C', '#6B3A3A'], ['#6EC1E4', '#34407A']];

music.post('/moods', requireAuth, (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2, 'Give your mood a name').max(28, 'Keep mood names under 28 characters').regex(/^[\p{L}\p{N} '&-]+$/u, 'Letters, numbers and spaces only') }), req.body);
  const existing = get('SELECT * FROM moods WHERE name = ?', b.name);
  if (existing) return res.json({ mood: { id: existing.id, name: existing.name, c1: existing.color1, c2: existing.color2, line: existing.tagline, custom: !!existing.is_custom } });
  const mine = get<{ n: number }>('SELECT COUNT(*) AS n FROM moods WHERE created_by = ?', req.user!.id)!.n;
  if (mine >= 20) throw new HttpError(400, 'You have reached the limit of custom moods.');
  const [c1, c2] = PALETTE[b.name.length % PALETTE.length];
  const name = b.name.replace(/\s+/g, ' ');
  const { id } = run('INSERT INTO moods (name, color1, color2, energy, tagline, is_custom, created_by) VALUES (?, ?, ?, 3, ?, 1, ?)', name, c1, c2, 'a feeling someone named themselves', req.user!.id);
  res.status(201).json({ mood: { id, name, c1, c2, line: 'a feeling someone named themselves', custom: true } });
});

// ── Song catalogue ──────────────────────────────────────────────────────────
music.get('/songs', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
  const f = (k: string) => (req.query[k] ? String(req.query[k]).slice(0, 60) : '');
  const [mood, genre, language, artist, sort] = [f('mood'), f('genre'), f('language'), f('artist'), f('sort') || 'foryou'];
  const p = Math.max(0, Math.min(200, Number(req.query.page) || 0));
  const size = Math.max(1, Math.min(48, Number(req.query.limit) || 24));

  let list = allSongs(v).filter(
    (s) =>
      (!q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.album.toLowerCase().includes(q)) &&
      (!mood || s.moods.includes(mood)) &&
      (!genre || s.genre === genre) &&
      (!language || s.language === language) &&
      (!artist || s.artist.toLowerCase().includes(artist.toLowerCase())),
  );
  if (sort === 'popular') list.sort((a, b) => b.popularity - a.popularity);
  else if (sort === 'hidden') list.sort((a, b) => a.popularity - b.popularity);
  else if (sort === 'recent') {
    // "Recently posted": most recently used in a Mood Drop first.
    const last = new Map(all<{ song_id: number; t: string }>('SELECT song_id, MAX(created_at) AS t FROM mood_drops GROUP BY song_id').map((r) => [r.song_id, r.t]));
    list.sort((a, b) => (last.get(b.id) || '').localeCompare(last.get(a.id) || '') || b.popularity - a.popularity);
  } else if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
  else {
    const t = tasteOf(v);
    const sc = new Map(list.map((s) => [s.id, scoreSong(s, t)]));
    list.sort((a, b) => sc.get(b.id)! - sc.get(a.id)!);
  }
  const items = list.slice(p * size, p * size + size);
  res.json({ songs: items, total: list.length, nextPage: list.length > (p + 1) * size ? p + 1 : null });
});

music.get('/songs/facets', (_req, res) => {
  res.json({
    genres: all<{ genre: string }>('SELECT DISTINCT genre FROM songs ORDER BY genre').map((r) => r.genre),
    languages: all<{ language: string; n: number }>('SELECT language, COUNT(*) AS n FROM songs GROUP BY language ORDER BY n DESC').map((r) => r.language),
    artists: all<{ name: string }>('SELECT a.name FROM artists a ORDER BY a.name').map((r) => r.name),
    total: get<{ n: number }>('SELECT COUNT(*) AS n FROM songs')!.n,
  });
});

music.get('/songs/:id', optionalAuth, (req, res) => {
  const s = songById(idParam(req), viewerId(req));
  if (!s) throw new HttpError(404, 'That song is not in the catalogue.');
  res.json({ song: s });
});

/** Resolves official artwork + a 30s preview for one song on demand (cached). */
music.get('/songs/:id/preview', optionalAuth, async (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 AS x FROM songs WHERE id = ?', id)) throw new HttpError(404, 'That song is not in the catalogue.');
  try {
    res.json(await enrichSong(id));
  } catch {
    res.json({ previewUrl: null, artworkUrl: null, appleUrl: null, unavailable: true });
  }
});

music.post('/songs/:id/save', requireAuth, (req, res) => {
  const id = idParam(req);
  if (!get('SELECT 1 AS x FROM songs WHERE id = ?', id)) throw new HttpError(404, 'That song is not in the catalogue.');
  run('INSERT OR IGNORE INTO saved_music (user_id, song_id, created_at) VALUES (?, ?, ?)', req.user!.id, id, now());
  res.json({ saved: true });
});
music.delete('/songs/:id/save', requireAuth, (req, res) => {
  run('DELETE FROM saved_music WHERE user_id = ? AND song_id = ?', req.user!.id, idParam(req));
  res.json({ saved: false });
});

// ── Playlists ───────────────────────────────────────────────────────────────
music.get('/playlists', optionalAuth, (req, res) => {
  const v = viewerId(req);
  res.json({
    curated: playlistSummary('p.user_id IS NULL', {}, v),
    mine: v ? playlistSummary('p.user_id = $u', { u: v }, v) : [],
  });
});

music.get('/playlists/:id', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const id = idParam(req);
  const p = playlistSummary('p.id = $id', { id }, v)[0];
  if (!p) throw new HttpError(404, 'That playlist does not exist.');
  const rows = all<{ song_id: number; reason: string }>('SELECT song_id, reason FROM playlist_songs WHERE playlist_id = ? ORDER BY position', id);
  const reasons = new Map(rows.map((r) => [r.song_id, r.reason]));
  res.json({ playlist: { ...p, songs: songsByIds(rows.map((r) => r.song_id), v).map((s) => ({ song: s, reason: reasons.get(s.id) || '' })) } });
});

music.post('/playlists', requireAuth, (req, res) => {
  const b = parse(
    z.object({
      title: z.string().trim().min(1, 'Give the playlist a title').max(80),
      description: z.string().trim().max(300).optional(),
      mood: z.string().trim().max(40).optional(),
      source: z.enum(['ai', 'user']).optional(),
      songs: z.array(z.object({ id: z.number().int().positive(), reason: z.string().max(300).optional() })).min(1, 'A playlist needs at least one song').max(50),
    }),
    req.body,
  );
  const valid = new Set(songsByIds(b.songs.map((s) => s.id), 0).map((s) => s.id));
  const songs = b.songs.filter((s, i, arr) => valid.has(s.id) && arr.findIndex((x) => x.id === s.id) === i);
  if (!songs.length) throw new HttpError(400, 'None of those songs are in the catalogue.');
  const id = tx(() => {
    const { id } = run('INSERT INTO playlists (user_id, title, description, mood, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', req.user!.id, b.title, b.description || '', b.mood || '', b.source || 'user', now());
    songs.forEach((s, i) => run('INSERT INTO playlist_songs (playlist_id, song_id, position, reason) VALUES (?, ?, ?, ?)', id, s.id, i, s.reason || ''));
    return id;
  });
  res.status(201).json({ playlist: playlistSummary('p.id = $id', { id }, req.user!.id)[0] });
});

music.delete('/playlists/:id', requireAuth, (req, res) => {
  const id = idParam(req);
  const p = get('SELECT user_id FROM playlists WHERE id = ?', id);
  if (!p) throw new HttpError(404, 'That playlist does not exist.');
  if (p.user_id !== req.user!.id) throw new HttpError(403, 'You can only delete your own playlists.');
  run('DELETE FROM playlists WHERE id = ?', id);
  res.json({ ok: true });
});

music.get('/recommendations/songs', requireAuth, (req, res) => {
  res.json({ songs: recommender.songs(req.user!.id, 12) });
});
