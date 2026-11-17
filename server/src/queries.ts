import { all, get, json, now, run, type Row } from './db';

// ── Songs ───────────────────────────────────────────────────────────────────
export interface Song {
  id: number;
  title: string;
  artist: string;
  artistId: number;
  album: string;
  year: number | null;
  genre: string;
  language: string;
  energy: number;
  popularity: number;
  moods: string[];
  artworkUrl: string | null;
  previewUrl: string | null;
  emergingArtist: boolean;
  saved: boolean;
  links: { spotify: string; youtube: string; apple: string };
}

const SONG_SQL = `SELECT s.*, a.name AS artist, a.is_emerging,
  (SELECT group_concat(m.name, '|') FROM song_moods sm JOIN moods m ON m.id = sm.mood_id WHERE sm.song_id = s.id) AS moods,
  EXISTS(SELECT 1 FROM saved_music x WHERE x.song_id = s.id AND x.user_id = $v) AS saved
  FROM songs s JOIN artists a ON a.id = s.artist_id`;

export function toSong(r: Row): Song {
  const q = encodeURIComponent(`${r.title} ${r.artist}`);
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    artistId: r.artist_id,
    album: r.album,
    year: r.year,
    genre: r.genre,
    language: r.language,
    energy: r.energy,
    popularity: r.popularity,
    moods: r.moods ? String(r.moods).split('|') : [],
    artworkUrl: r.artwork_url,
    previewUrl: r.preview_url,
    emergingArtist: !!r.is_emerging,
    saved: !!r.saved,
    // Legitimate outbound search links. No audio is hosted or proxied by AFTRHRS.
    links: {
      spotify: `https://open.spotify.com/search/${q}`,
      youtube: `https://www.youtube.com/results?search_query=${q}`,
      apple: r.apple_url || `https://music.apple.com/search?term=${q}`,
    },
  };
}

export const allSongs = (v: number) => all(SONG_SQL, { v }).map(toSong);

export function songsByIds(ids: number[], v: number): Song[] {
  if (!ids.length) return [];
  const clean = [...new Set(ids.map(Number).filter(Number.isInteger))];
  const rows = all(`${SONG_SQL} WHERE s.id IN (${clean.join(',')})`, { v }).map(toSong);
  const map = new Map(rows.map((s) => [s.id, s]));
  return ids.map((i) => map.get(i)).filter(Boolean) as Song[];
}

export const songById = (id: number, v: number) => songsByIds([id], v)[0];

// ── Users ───────────────────────────────────────────────────────────────────
export const miniUser = (r: Row, p = '') => ({
  id: r[p + 'id'] ?? r.user_id,
  username: r.username,
  displayName: r.display_name,
  avatar: r.avatar ?? null,
  isDemo: r.is_demo === 1,
  isGuest: r.is_demo === 2,
});

export const USER_MINI = 'u.id, u.username, u.display_name, u.avatar, u.is_demo';

export const BLOCK_CLAUSE = (col: string) =>
  `NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id = $v AND b.blocked_id = ${col}) OR (b.blocker_id = ${col} AND b.blocked_id = $v))`;

export function prefsOf(userId: number) {
  const p = get('SELECT * FROM user_preferences WHERE user_id = ?', userId);
  return {
    languages: json<string[]>(p?.languages, []),
    genres: json<string[]>(p?.genres, []),
    artists: json<string[]>(p?.artists, []),
    moods: json<string[]>(p?.moods, []),
    discovery: json<string[]>(p?.discovery, []),
  };
}

/** The private view of the signed-in account. */
export function selfUser(u: Row) {
  const mood = u.current_mood_id ? get('SELECT name FROM moods WHERE id = ?', u.current_mood_id) : undefined;
  return {
    ...miniUser(u),
    email: u.email,
    bio: u.bio,
    currentMood: mood?.name ?? null,
    isPrivate: !!u.is_private,
    showSaved: !!u.show_saved,
    onboarded: !!u.onboarded,
    notifPrefs: json(u.notif_prefs, { likes: true, comments: true, follows: true }),
    linkService: u.link_service,
    preferences: prefsOf(u.id),
    unread: get<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', u.id)!.n,
  };
}

// ── Mood Drops ──────────────────────────────────────────────────────────────
const DROP_SQL = `SELECT d.id, d.caption, d.background, d.source, d.is_featured, d.created_at, d.user_id, d.song_id,
  u.username, u.display_name, u.avatar, u.is_demo,
  m.name AS mood, m.color1, m.color2, r.slug AS room_slug, r.name AS room_name,
  (SELECT COUNT(*) FROM likes l WHERE l.drop_id = d.id) AS like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.drop_id = d.id) AS comment_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.drop_id = d.id AND l.user_id = $v) AS liked,
  EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.drop_id = d.id AND sp.user_id = $v) AS saved,
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = d.user_id) AS following_author
  FROM mood_drops d
  JOIN users u ON u.id = d.user_id
  JOIN moods m ON m.id = d.mood_id
  LEFT JOIN sound_rooms r ON r.id = d.room_id
  WHERE (u.is_private = 0 OR u.id = $v OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = u.id))
  AND ${BLOCK_CLAUSE('u.id')}
  AND NOT EXISTS(SELECT 1 FROM reports rp WHERE rp.reporter_id = $v AND rp.drop_id = d.id)`;

export interface DropQuery {
  where?: string;
  params?: Record<string, string | number | null>;
  order?: string;
  limit?: number;
  offset?: number;
}

export function listDrops(v: number, q: DropQuery = {}) {
  const sql = `${DROP_SQL} ${q.where ? `AND (${q.where})` : ''} ORDER BY ${q.order || 'd.created_at DESC, d.id DESC'} LIMIT $limit OFFSET $offset`;
  const rows = all(sql, { v, ...(q.params || {}), limit: q.limit ?? 10, offset: q.offset ?? 0 });
  return hydrateDrops(rows, v);
}

export function hydrateDrops(rows: Row[], v: number) {
  const songs = new Map(songsByIds(rows.map((r) => r.song_id), v).map((s) => [s.id, s]));
  return rows.map((r) => ({
    id: r.id as number,
    caption: r.caption as string,
    background: r.background as string,
    source: r.source as string,
    featured: !!r.is_featured,
    createdAt: r.created_at as string,
    mood: { name: r.mood as string, c1: r.color1 as string, c2: r.color2 as string },
    room: r.room_slug ? { slug: r.room_slug, name: r.room_name } : null,
    author: { ...miniUser({ ...r, id: r.user_id }), following: !!r.following_author },
    song: songs.get(r.song_id)!,
    likeCount: r.like_count as number,
    commentCount: r.comment_count as number,
    liked: !!r.liked,
    saved: !!r.saved,
    mine: r.user_id === v,
  }));
}

export type Drop = ReturnType<typeof hydrateDrops>[number];

export const dropById = (id: number, v: number) => listDrops(v, { where: 'd.id = $id', params: { id }, limit: 1 })[0];

// ── Notifications ───────────────────────────────────────────────────────────
export function notify(userId: number, actorId: number | null, type: 'like' | 'comment' | 'follow' | 'welcome', opts: { dropId?: number; body?: string } = {}) {
  if (actorId && actorId === userId) return;
  const u = get('SELECT notif_prefs FROM users WHERE id = ?', userId);
  if (!u) return;
  const prefs = json<Record<string, boolean>>(u.notif_prefs, {});
  const key = type === 'like' ? 'likes' : type === 'comment' ? 'comments' : type === 'follow' ? 'follows' : '';
  if (key && prefs[key] === false) return;
  if (actorId && get('SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)', userId, actorId, actorId, userId)) return;
  // Collapse repeated like/follow toggles into a single notification.
  if (type !== 'comment' && actorId) {
    const dup = get('SELECT id FROM notifications WHERE user_id = ? AND actor_id = ? AND type = ? AND drop_id IS ?', userId, actorId, type, opts.dropId ?? null);
    if (dup) return;
  }
  run('INSERT INTO notifications (user_id, actor_id, type, drop_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)', userId, actorId, type, opts.dropId ?? null, opts.body ?? '', now());
}

// ── Rooms ───────────────────────────────────────────────────────────────────
export function listRooms(v: number, where = '', params: Record<string, string | number> = {}) {
  return all(
    `SELECT r.*, (SELECT COUNT(*) FROM room_memberships rm WHERE rm.room_id = r.id) AS member_count,
      (SELECT COUNT(*) FROM mood_drops d WHERE d.room_id = r.id) AS drop_count,
      EXISTS(SELECT 1 FROM room_memberships rm WHERE rm.room_id = r.id AND rm.user_id = $v) AS joined
     FROM sound_rooms r ${where ? `WHERE ${where}` : ''} ORDER BY member_count DESC, r.id`,
    { v, ...params },
  ).map(toRoom);
}

export const toRoom = (r: Row) => ({
  id: r.id as number,
  slug: r.slug as string,
  name: r.name as string,
  tagline: r.tagline as string,
  description: r.description as string,
  c1: r.color1 as string,
  c2: r.color2 as string,
  motif: r.motif as string,
  moods: json<string[]>(r.mood_tags, []),
  memberCount: r.member_count as number,
  dropCount: r.drop_count as number,
  joined: !!r.joined,
});

// ── Playlists ───────────────────────────────────────────────────────────────
export function playlistSummary(where: string, params: Record<string, string | number | null>, v: number) {
  return all(
    `SELECT p.*, u.username, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
     FROM playlists p LEFT JOIN users u ON u.id = p.user_id WHERE ${where} ORDER BY p.created_at DESC, p.id DESC`,
    params,
  ).map((p) => {
    const cover = all<{ song_id: number }>('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY position LIMIT 4', p.id).map((r) => r.song_id);
    return {
      id: p.id as number,
      title: p.title as string,
      description: p.description as string,
      mood: p.mood as string,
      source: p.source as string,
      owner: p.username ?? null,
      mine: p.user_id === v && v !== 0,
      songCount: p.song_count as number,
      cover: songsByIds(cover, v),
      createdAt: p.created_at as string,
    };
  });
}
