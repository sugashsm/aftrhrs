import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { HttpError, idParam, optionalAuth, parse, requireAuth, viewerId } from '../http';
import { allSongs, BLOCK_CLAUSE, listDrops, listRooms, miniUser, playlistSummary, songsByIds, USER_MINI } from '../queries';
import { recommender, scoreSong, tasteOf } from '../recommend';

export const community = Router();

// ── Sound Rooms ─────────────────────────────────────────────────────────────
community.get('/rooms', optionalAuth, (req, res) => {
  res.json({ rooms: listRooms(viewerId(req)) });
});

function room(slug: string, v: number) {
  const r = listRooms(v, 'r.slug = $slug', { slug })[0];
  if (!r) throw new HttpError(404, 'That Sound Room does not exist.');
  return r;
}

const discussionRows = (roomId: number, v: number) =>
  all(
    `SELECT x.id AS xid, x.body, x.created_at AS posted_at, ${USER_MINI} FROM room_discussions x JOIN users u ON u.id = x.user_id
     WHERE x.room_id = $r AND ${BLOCK_CLAUSE('u.id')} ORDER BY x.created_at DESC, x.id DESC LIMIT 100`,
    { r: roomId, v },
  ).map((x) => ({ id: x.xid, body: x.body, createdAt: x.posted_at, author: miniUser(x), mine: x.id === v }));

community.get('/rooms/:slug', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const r = room(String(req.params.slug), v);
  const songIds = all<{ song_id: number }>('SELECT song_id FROM room_songs WHERE room_id = ? ORDER BY position', r.id).map((x) => x.song_id);
  const members = all(
    `SELECT ${USER_MINI}, u.bio, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = u.id) AS following
     FROM room_memberships rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = $r AND ${BLOCK_CLAUSE('u.id')} ORDER BY rm.joined_at DESC LIMIT 60`,
    { v, r: r.id },
  ).map((m) => ({ ...miniUser(m), bio: m.bio, following: !!m.following, isMe: m.id === v }));
  res.json({
    room: r,
    songs: songsByIds(songIds, v),
    drops: listDrops(v, { where: 'd.room_id = $r', params: { r: r.id }, limit: 30 }),
    discussions: discussionRows(r.id, v),
    members,
  });
});

community.post('/rooms/:slug/join', requireAuth, (req, res) => {
  const r = room(String(req.params.slug), req.user!.id);
  run('INSERT OR IGNORE INTO room_memberships (room_id, user_id, joined_at) VALUES (?, ?, ?)', r.id, req.user!.id, now());
  res.json({ room: room(r.slug, req.user!.id) });
});

community.delete('/rooms/:slug/join', requireAuth, (req, res) => {
  const r = room(String(req.params.slug), req.user!.id);
  run('DELETE FROM room_memberships WHERE room_id = ? AND user_id = ?', r.id, req.user!.id);
  res.json({ room: room(r.slug, req.user!.id) });
});

community.post('/rooms/:slug/discussions', requireAuth, (req, res) => {
  const r = room(String(req.params.slug), req.user!.id);
  if (!r.joined) throw new HttpError(403, 'Join the room to take part in the conversation.');
  const b = parse(z.object({ body: z.string().trim().min(1, 'Say something first.').max(500, 'Keep it under 500 characters') }), req.body);
  run('INSERT INTO room_discussions (room_id, user_id, body, created_at) VALUES (?, ?, ?, ?)', r.id, req.user!.id, b.body, now());
  res.status(201).json({ discussions: discussionRows(r.id, req.user!.id) });
});

community.delete('/discussions/:id', requireAuth, (req, res) => {
  const id = idParam(req);
  const d = get('SELECT user_id, room_id FROM room_discussions WHERE id = ?', id);
  if (!d) throw new HttpError(404, 'That message is already gone.');
  if (d.user_id !== req.user!.id) throw new HttpError(403, 'You can only remove your own messages.');
  run('DELETE FROM room_discussions WHERE id = ?', id);
  res.json({ discussions: discussionRows(d.room_id, req.user!.id) });
});

// ── Notifications ───────────────────────────────────────────────────────────
community.get('/notifications', requireAuth, (req, res) => {
  const v = req.user!.id;
  const rows = all(
    `SELECT n.id AS nid, n.type, n.body, n.is_read, n.drop_id, n.created_at AS at, u.id, u.username, u.display_name, u.avatar, u.is_demo,
       (SELECT s.title FROM mood_drops d JOIN songs s ON s.id = d.song_id WHERE d.id = n.drop_id) AS song_title
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 80`,
    v,
  );
  res.json({
    notifications: rows.map((n) => ({
      id: n.nid,
      type: n.type,
      body: n.body,
      read: !!n.is_read,
      dropId: n.drop_id,
      songTitle: n.song_title,
      createdAt: n.at,
      actor: n.username ? miniUser(n) : null,
    })),
  });
});

community.post('/notifications/read', requireAuth, (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', req.user!.id);
  res.json({ ok: true, unread: 0 });
});

community.delete('/notifications', requireAuth, (req, res) => {
  run('DELETE FROM notifications WHERE user_id = ?', req.user!.id);
  res.json({ ok: true });
});

// ── Discover ────────────────────────────────────────────────────────────────
function trendingSongs(v: number, n: number) {
  // Real activity inside this instance: drops, likes on those drops, and saves.
  const rows = all<{ song_id: number; score: number }>(
    `SELECT song_id, SUM(w) AS score FROM (
       SELECT d.song_id, 3 AS w FROM mood_drops d
       UNION ALL SELECT d.song_id, 1 FROM likes l JOIN mood_drops d ON d.id = l.drop_id
       UNION ALL SELECT song_id, 2 FROM saved_music
     ) GROUP BY song_id ORDER BY score DESC LIMIT ?`,
    n,
  );
  return songsByIds(rows.map((r) => r.song_id), v);
}

function moodStats() {
  return all(
    `SELECT m.name, m.color1, m.color2, m.tagline,
       (SELECT COUNT(*) FROM mood_drops d WHERE d.mood_id = m.id) AS drops,
       (SELECT COUNT(*) FROM mood_drops d WHERE d.mood_id = m.id AND d.created_at > ?) AS recent
     FROM moods m WHERE m.is_custom = 0 ORDER BY recent DESC, drops DESC, m.id`,
    new Date(Date.now() - 7 * 86_400_000).toISOString(),
  ).map((m) => ({ name: m.name, c1: m.color1, c2: m.color2, line: m.tagline, drops: m.drops, recent: m.recent }));
}

community.get('/discover', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const t = tasteOf(v);
  const songs = allSongs(v);
  const ranked = (list: typeof songs) => [...list].sort((a, b) => scoreSong(b, t) - scoreSong(a, t));
  const moods = moodStats();
  const week = moods[0];
  const dedupeArtist = (list: typeof songs, n: number) => {
    const seen = new Set<string>();
    return list.filter((s) => (seen.has(s.artist) ? false : (seen.add(s.artist), true))).slice(0, n);
  };
  res.json({
    trending: trendingSongs(v, 10),
    moods: moods.slice(0, 12),
    forYou: v ? recommender.songs(v, 10) : dedupeArtist(ranked(songs), 10),
    hiddenGems: dedupeArtist(ranked(songs.filter((s) => s.popularity <= 84 && !s.saved)), 8),
    newArtists: dedupeArtist(ranked(songs.filter((s) => s.emergingArtist)), 8),
    people: v ? recommender.users(v, 6) : [],
    soundtracks: playlistSummary('p.user_id IS NULL', {}, v).slice(0, 8),
    moodOfTheWeek: week
      ? {
          mood: week,
          songs: dedupeArtist(ranked(songs.filter((s) => s.moods.includes(week.name))), 5),
          drops: listDrops(v, { where: 'm.name = $m', params: { m: week.name }, limit: 3 }),
        }
      : null,
    popularDrops: listDrops(v, {
      order: '((SELECT COUNT(*) FROM likes l WHERE l.drop_id = d.id) * 2 + (SELECT COUNT(*) FROM comments c WHERE c.drop_id = d.id) * 3) DESC, d.created_at DESC',
      limit: 6,
    }),
    rooms: v ? recommender.rooms(v, 4) : listRooms(v).slice(0, 4),
  });
});

/** Sidebar suggestions for the feed. */
community.get('/suggestions', requireAuth, (req, res) => {
  const v = req.user!.id;
  res.json({ people: recommender.users(v, 5), rooms: recommender.rooms(v, 3), songs: recommender.songs(v, 4), moods: moodStats().slice(0, 8) });
});

/** Public landing page data. Everything here is seeded sample content and labelled as such in the UI. */
community.get('/public/home', (_req, res) => {
  const creators = all(
    `SELECT ${USER_MINI}, u.bio, (SELECT COUNT(*) FROM mood_drops d WHERE d.user_id = u.id) AS drops,
       (SELECT m.name FROM moods m WHERE m.id = u.current_mood_id) AS mood
     FROM users u WHERE u.is_demo = 1 AND u.is_private = 0 ORDER BY drops DESC, u.id LIMIT 6`,
  ).map((c) => ({ ...miniUser(c), bio: c.bio, drops: c.drops, mood: c.mood }));
  res.json({
    featured: listDrops(0, { where: 'd.is_featured = 1', limit: 6 }),
    moods: moodStats().slice(0, 14),
    rooms: listRooms(0).slice(0, 6),
    songs: trendingSongs(0, 8),
    creators,
    counts: {
      songs: get<{ n: number }>('SELECT COUNT(*) AS n FROM songs')!.n,
      languages: get<{ n: number }>('SELECT COUNT(DISTINCT language) AS n FROM songs')!.n,
      rooms: get<{ n: number }>('SELECT COUNT(*) AS n FROM sound_rooms')!.n,
    },
  });
});

community.get('/search', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
  if (!q) return res.json({ songs: [], users: [], rooms: [] });
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const users = all(
    `SELECT ${USER_MINI}, u.bio, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = u.id) AS following
     FROM users u WHERE (u.username LIKE $q OR u.display_name LIKE $q) AND u.is_demo <> 2 AND ${BLOCK_CLAUSE('u.id')} ORDER BY u.username LIMIT 12`,
    { v, q: like },
  ).map((r) => ({ ...miniUser(r), bio: r.bio, following: !!r.following, isMe: r.id === v }));
  const songs = allSongs(v).filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.album.toLowerCase().includes(q)).sort((a, b) => b.popularity - a.popularity).slice(0, 20);
  const rooms = listRooms(v, '(r.name LIKE $q OR r.description LIKE $q)', { q: like });
  res.json({ songs, users, rooms });
});
