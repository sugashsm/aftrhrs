import { Router } from 'express';
import { all, get, now, run } from '../db';
import { HttpError, idParam, optionalAuth, requireAuth, viewerId } from '../http';
import { BLOCK_CLAUSE, listDrops, listRooms, miniUser, notify, playlistSummary, prefsOf, songsByIds, USER_MINI } from '../queries';
import { soundOfMe } from '../recommend';

export const users = Router();

const PAGE = 9;
const page = (q: any) => Math.max(0, Math.min(500, Number(q.page) || 0));

function target(username: string, v: number) {
  const u = get('SELECT * FROM users WHERE username = ?', username);
  if (!u) throw new HttpError(404, 'We could not find that listener.');
  const blocked = v ? get('SELECT blocker_id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)', v, u.id, u.id, v) : undefined;
  if (blocked && blocked.blocker_id !== v) throw new HttpError(404, 'We could not find that listener.');
  const following = !!get('SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?', v, u.id);
  const canSee = !u.is_private || u.id === v || following;
  return { u, following, canSee, blockedByMe: !!blocked };
}

users.get('/users/search', optionalAuth, (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  const v = viewerId(req);
  if (!q) return res.json({ users: [] });
  const rows = all(
    `SELECT ${USER_MINI}, u.bio, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = u.id) AS following
     FROM users u WHERE (u.username LIKE $q OR u.display_name LIKE $q) AND u.is_demo <> 2 AND ${BLOCK_CLAUSE('u.id')} ORDER BY u.username LIMIT 20`,
    { v, q: `%${q.replace(/[%_]/g, '')}%` },
  );
  res.json({ users: rows.map((r) => ({ ...miniUser(r), bio: r.bio, following: !!r.following })) });
});

users.get('/users/:username', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const { u, following, canSee, blockedByMe } = target(String(req.params.username), v);
  const count = (sql: string) => get<{ n: number }>(sql, u.id)!.n;
  const mood = u.current_mood_id ? get('SELECT name, color1, color2 FROM moods WHERE id = ?', u.current_mood_id) : undefined;
  const p = prefsOf(u.id);
  res.json({
    profile: {
      ...miniUser(u),
      bio: u.bio,
      joinedAt: u.created_at,
      isPrivate: !!u.is_private,
      isMe: u.id === v,
      following,
      followsMe: !!get('SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?', u.id, v),
      blockedByMe,
      canSee,
      showSaved: !!u.show_saved || u.id === v,
      followers: count('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?'),
      followingCount: count('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?'),
      dropCount: count('SELECT COUNT(*) AS n FROM mood_drops WHERE user_id = ?'),
      currentMood: canSee && mood ? { name: mood.name, c1: mood.color1, c2: mood.color2 } : null,
      favouriteArtists: canSee ? p.artists.slice(0, 8) : [],
      favouriteGenres: canSee ? p.genres.slice(0, 8) : [],
      languages: canSee ? p.languages : [],
      soundOfMe: canSee ? soundOfMe(u.id) : null,
      rooms: canSee ? listRooms(v, 'EXISTS(SELECT 1 FROM room_memberships x WHERE x.room_id = r.id AND x.user_id = $u)', { u: u.id }) : [],
    },
  });
});

users.get('/users/:username/drops', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const { u, canSee } = target(String(req.params.username), v);
  if (!canSee) return res.json({ items: [], nextPage: null });
  const p = page(req.query);
  const items = listDrops(v, { where: 'd.user_id = $u', params: { u: u.id }, limit: PAGE + 1, offset: p * PAGE });
  res.json({ items: items.slice(0, PAGE), nextPage: items.length > PAGE ? p + 1 : null });
});

users.get('/users/:username/saved-songs', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const { u, canSee } = target(String(req.params.username), v);
  if (!canSee || (!u.show_saved && u.id !== v)) return res.json({ songs: [], hidden: u.id !== v });
  const ids = all<{ song_id: number }>('SELECT song_id FROM saved_music WHERE user_id = ? ORDER BY created_at DESC LIMIT 200', u.id).map((r) => r.song_id);
  res.json({ songs: songsByIds(ids, v), hidden: false });
});

users.get('/users/:username/saved-posts', requireAuth, (req, res) => {
  const v = viewerId(req);
  const { u } = target(String(req.params.username), v);
  if (u.id !== v) throw new HttpError(403, 'Saved posts are private.');
  const items = listDrops(v, { where: 'EXISTS(SELECT 1 FROM saved_posts s WHERE s.drop_id = d.id AND s.user_id = $v)', limit: 100 });
  res.json({ items, nextPage: null });
});

users.get('/users/:username/playlists', optionalAuth, (req, res) => {
  const v = viewerId(req);
  const { u, canSee } = target(String(req.params.username), v);
  if (!canSee) return res.json({ playlists: [] });
  res.json({ playlists: playlistSummary('p.user_id = $u', { u: u.id }, v) });
});

users.get(['/users/:username/followers', '/users/:username/following'], optionalAuth, (req, res) => {
  const v = viewerId(req);
  const { u, canSee } = target(String(req.params.username), v);
  if (!canSee) return res.json({ users: [] });
  const followers = req.path.endsWith('/followers');
  const rows = all(
    `SELECT ${USER_MINI}, u.bio, EXISTS(SELECT 1 FROM follows x WHERE x.follower_id = $v AND x.following_id = u.id) AS following
     FROM follows f JOIN users u ON u.id = ${followers ? 'f.follower_id' : 'f.following_id'}
     WHERE ${followers ? 'f.following_id' : 'f.follower_id'} = $u AND ${BLOCK_CLAUSE('u.id')} ORDER BY f.created_at DESC LIMIT 200`,
    { v, u: u.id },
  );
  res.json({ users: rows.map((r) => ({ ...miniUser(r), bio: r.bio, following: !!r.following, isMe: r.id === v })) });
});

// ── Follow / block ──────────────────────────────────────────────────────────
function other(req: any) {
  const id = idParam(req);
  if (id === req.user.id) throw new HttpError(400, 'That is you.');
  const u = get('SELECT id FROM users WHERE id = ?', id);
  if (!u) throw new HttpError(404, 'We could not find that listener.');
  return id;
}

users.post('/users/:id/follow', requireAuth, (req, res) => {
  const id = other(req);
  const me = req.user!.id;
  if (get('SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)', me, id, id, me)) throw new HttpError(403, 'You cannot follow this listener.');
  const r = run('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', me, id, now());
  if (r.changes) notify(id, me, 'follow');
  res.json({ following: true });
});

users.delete('/users/:id/follow', requireAuth, (req, res) => {
  run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', req.user!.id, other(req));
  res.json({ following: false });
});

users.post('/users/:id/block', requireAuth, (req, res) => {
  const id = other(req);
  const me = req.user!.id;
  run('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)', me, id, now());
  run('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', me, id, id, me);
  res.json({ blocked: true });
});

users.delete('/users/:id/block', requireAuth, (req, res) => {
  run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', req.user!.id, other(req));
  res.json({ blocked: false });
});
