import 'dotenv/config';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { all, dbPath, get, openDb, run, tx } from './db';
import { MOODS } from '../../shared/constants';
import { CATALOGUE, EMERGING_ARTISTS, MOOD_CODES } from './seed/catalogue';
import { COMMENTS, DROPS, PLAYLISTS, ROOMS, USERS } from './seed/data';

/** Deterministic PRNG so every fresh install gets the same believable sample world. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export function seedIfEmpty() {
  if (get('SELECT 1 AS x FROM songs LIMIT 1')) return false;
  const rnd = mulberry32(20261116);
  const pick = <T>(list: T[], n: number) => [...list].sort(() => rnd() - 0.5).slice(0, n);

  tx(() => {
    // Moods
    const moodId = new Map<string, number>();
    for (const m of MOODS) moodId.set(m.name, run('INSERT INTO moods (name, color1, color2, energy, tagline) VALUES (?, ?, ?, ?, ?)', m.name, m.c1, m.c2, m.energy, m.line).id);

    // Catalogue
    const artistId = new Map<string, number>();
    const songId = new Map<string, number>();
    const songMeta: { id: number; moods: string[]; language: string; genre: string; popularity: number }[] = [];
    for (const line of CATALOGUE.split('\n')) {
      const [title, artist, album, year, genre, language, energy, popularity, codes] = line.split('|').map((x) => x.trim());
      if (!artistId.has(artist)) artistId.set(artist, run('INSERT INTO artists (name, is_emerging) VALUES (?, ?)', artist, EMERGING_ARTISTS.includes(artist) ? 1 : 0).id);
      const { id } = run('INSERT INTO songs (title, artist_id, album, year, genre, language, energy, popularity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', title, artistId.get(artist)!, album, Number(year), genre, language, Number(energy), Number(popularity));
      const moods = codes.split(',').map((c) => MOOD_CODES[c]);
      moods.forEach((m) => run('INSERT INTO song_moods (song_id, mood_id) VALUES (?, ?)', id, moodId.get(m)!));
      songId.set(title, id);
      songMeta.push({ id, moods, language, genre, popularity: Number(popularity) });
    }

    // Fictional demo listeners (cannot be logged into; password hash is intentionally unusable)
    const userId = new Map<string, number>();
    USERS.forEach(([username, name, bio, languages, genres, artists, moods], i) => {
      const { id } = run(
        'INSERT INTO users (email, username, display_name, password_hash, bio, is_demo, onboarded, current_mood_id, created_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)',
        `${username}@demo.aftrhrs.local`, username, name, '!demo-account-no-login', bio, moodId.get(moods[0])!, ago(24 * (60 - i * 2)),
      );
      run('INSERT INTO user_preferences (user_id, languages, genres, artists, moods, discovery, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, JSON.stringify(languages), JSON.stringify(genres), JSON.stringify(artists), JSON.stringify(moods), '[]', ago(24 * 30));
      userId.set(username, id);
    });
    const ids = [...userId.values()];
    const prefMoods = new Map(USERS.map((u) => [userId.get(u[0])!, u[6]]));

    // Follows
    for (const a of ids) for (const b of pick(ids.filter((x) => x !== a), 4 + Math.floor(rnd() * 5))) run('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', a, b, ago(24 * (2 + rnd() * 40)));

    // Sound Rooms
    const roomId = new Map<string, number>();
    for (const r of ROOMS) {
      const { id } = run('INSERT INTO sound_rooms (slug, name, tagline, description, color1, color2, motif, mood_tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', r.slug, r.name, r.tagline, r.description, r.c1, r.c2, r.motif, JSON.stringify(r.moods), ago(24 * 70));
      roomId.set(r.slug, id);
      const featured = songMeta
        .filter((s) => (r.language ? s.language === r.language : r.genre ? s.genre === r.genre : s.moods.includes(r.moods[0]) || s.moods.includes(r.moods[1])))
        .map((s) => ({ s, n: (s.moods.includes(r.moods[0]) ? 2 : 0) + (s.moods.includes(r.moods[1]) ? 1 : 0) + rnd() }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 8);
      featured.forEach((f, i) => run('INSERT INTO room_songs (room_id, song_id, position) VALUES (?, ?, ?)', id, f.s.id, i));
      const members = ids.filter((u) => prefMoods.get(u)!.some((m) => r.moods.includes(m)) && rnd() < 0.8);
      members.forEach((u) => run('INSERT OR IGNORE INTO room_memberships (room_id, user_id, joined_at) VALUES (?, ?, ?)', id, u, ago(24 * (1 + rnd() * 50))));
    }

    // Mood Drops
    const dropIds: { id: number; user: number; hours: number }[] = [];
    for (const [username, title, mood, caption, bg, room, hours, featured] of DROPS) {
      const u = userId.get(username)!;
      const s = songId.get(title);
      if (!s) throw new Error(`Seed drop references unknown song "${title}"`);
      if (room) run('INSERT OR IGNORE INTO room_memberships (room_id, user_id, joined_at) VALUES (?, ?, ?)', roomId.get(room)!, u, ago(hours + 48));
      const { id } = run('INSERT INTO mood_drops (user_id, song_id, mood_id, caption, background, room_id, source, is_featured, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', u, s, moodId.get(mood)!, caption, bg, room ? roomId.get(room)! : null, 'user', featured ? 1 : 0, ago(hours));
      dropIds.push({ id, user: u, hours });
    }

    // Likes, comments, saves (and the notifications they would have produced)
    for (const d of dropIds) {
      const others = ids.filter((x) => x !== d.user);
      for (const u of pick(others, 3 + Math.floor(rnd() * 11))) {
        const at = ago(d.hours * rnd());
        run('INSERT INTO likes (user_id, drop_id, created_at) VALUES (?, ?, ?)', u, d.id, at);
        if (rnd() < 0.25) run('INSERT INTO notifications (user_id, actor_id, type, drop_id, created_at) VALUES (?, ?, ?, ?, ?)', d.user, u, 'like', d.id, at);
      }
      for (const u of pick(others, Math.floor(rnd() * 5))) {
        const at = ago(d.hours * rnd());
        const body = COMMENTS[Math.floor(rnd() * COMMENTS.length)];
        run('INSERT INTO comments (drop_id, user_id, body, created_at) VALUES (?, ?, ?, ?)', d.id, u, body, at);
        run('INSERT INTO notifications (user_id, actor_id, type, drop_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)', d.user, u, 'comment', d.id, body, at);
      }
      for (const u of pick(others, Math.floor(rnd() * 4))) run('INSERT OR IGNORE INTO saved_posts (user_id, drop_id, created_at) VALUES (?, ?, ?)', u, d.id, ago(d.hours * rnd()));
    }
    for (const u of ids) {
      const liked = songMeta.filter((s) => s.moods.some((m) => prefMoods.get(u)!.includes(m)));
      for (const s of pick(liked, 5 + Math.floor(rnd() * 6))) run('INSERT OR IGNORE INTO saved_music (user_id, song_id, created_at) VALUES (?, ?, ?)', u, s.id, ago(24 * rnd() * 30));
    }

    // Room discussions
    for (const r of ROOMS) {
      const members = all<{ user_id: number }>('SELECT user_id FROM room_memberships WHERE room_id = ?', roomId.get(r.slug)!).map((m) => m.user_id);
      r.talk.forEach((body, i) => run('INSERT INTO room_discussions (room_id, user_id, body, created_at) VALUES (?, ?, ?, ?)', roomId.get(r.slug)!, members[Math.floor(rnd() * members.length)], body, ago(5 + i * 19 + rnd() * 10)));
    }

    // Curated playlists (owned by AFTRHRS, user_id NULL)
    PLAYLISTS.forEach(([title, description, mood, language, maxPop], i) => {
      const { id } = run('INSERT INTO playlists (user_id, title, description, mood, source, created_at) VALUES (NULL, ?, ?, ?, ?, ?)', title, description, mood || '', 'curated', ago(24 * (i + 1)));
      const seen = new Set<number>();
      const songs = songMeta
        .filter((s) => (!mood || s.moods.includes(mood)) && (!language || s.language === language) && (!maxPop || s.popularity <= maxPop))
        .map((s) => ({ s, n: rnd() + s.popularity / 200 }))
        .sort((a, b) => b.n - a.n)
        .filter(({ s }) => {
          const a = get<{ artist_id: number }>('SELECT artist_id FROM songs WHERE id = ?', s.id)!.artist_id;
          if (seen.has(a) && seen.size > 4) return false;
          seen.add(a);
          return true;
        })
        .slice(0, 9);
      songs.forEach(({ s }, pos) => run('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)', id, s.id, pos));
    });
  });

  const n = (t: string) => get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)!.n;
  if (process.env.NODE_ENV !== 'test') console.log(`[seed] sample world created: ${n('songs')} songs, ${n('users')} demo listeners, ${n('mood_drops')} Mood Drops, ${n('sound_rooms')} Sound Rooms, ${n('playlists')} playlists`);
  return true;
}

/** Temporary demo-mode guests are removed after two days. */
export function pruneGuests() {
  run('DELETE FROM users WHERE is_demo = 2 AND created_at < ?', ago(48));
}

// CLI: `npm run db:reset`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = dbPath();
  if (process.argv.includes('--reset')) for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
  openDb();
  console.log(seedIfEmpty() ? '[seed] done' : '[seed] database already has data (use --reset to start over)');
}
