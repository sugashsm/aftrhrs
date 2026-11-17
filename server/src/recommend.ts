/**
 * Rule-based recommendation engine.
 *
 * Everything is derived from a "taste profile": weighted counts of genres, languages, artists and moods
 * built from onboarding answers and real interactions. The `Recommender` interface is the seam where an
 * embedding/LLM-based implementation can be swapped in later without touching routes or the frontend.
 */
import { all, get, json } from './db';
import { allSongs, listDrops, listRooms, miniUser, prefsOf, type Drop, type Song } from './queries';

export interface Taste {
  genres: Record<string, number>;
  languages: Record<string, number>;
  artists: Record<string, number>;
  moods: Record<string, number>;
  energy: number; // average energy of songs the person has engaged with (1..5), 0 = unknown
  signals: number;
}

const bump = (m: Record<string, number>, k: string | null | undefined, w: number) => {
  if (k) m[k] = (m[k] || 0) + w;
};

export function tasteOf(userId: number): Taste {
  const t: Taste = { genres: {}, languages: {}, artists: {}, moods: {}, energy: 0, signals: 0 };
  if (!userId) return t;
  const p = prefsOf(userId);
  p.genres.forEach((g) => bump(t.genres, g, 3));
  p.languages.forEach((l) => bump(t.languages, l, 3));
  p.artists.forEach((a) => bump(t.artists, a, 4));
  p.moods.forEach((m) => bump(t.moods, m, 3));

  const cur = get('SELECT m.name FROM users u JOIN moods m ON m.id = u.current_mood_id WHERE u.id = ?', userId);
  bump(t.moods, cur?.name, 2);

  const engaged = all(
    `SELECT s.genre, s.language, s.energy, a.name AS artist, w.w,
       (SELECT group_concat(m.name, '|') FROM song_moods sm JOIN moods m ON m.id = sm.mood_id WHERE sm.song_id = s.id) AS moods
     FROM (
       SELECT song_id, 1.5 AS w FROM saved_music WHERE user_id = $u
       UNION ALL SELECT song_id, 1.5 FROM mood_drops WHERE user_id = $u
       UNION ALL SELECT d.song_id, 0.75 FROM likes l JOIN mood_drops d ON d.id = l.drop_id WHERE l.user_id = $u
       UNION ALL SELECT d.song_id, 1.0 FROM saved_posts sp JOIN mood_drops d ON d.id = sp.drop_id WHERE sp.user_id = $u
     ) w JOIN songs s ON s.id = w.song_id JOIN artists a ON a.id = s.artist_id`,
    { u: userId },
  );
  let eSum = 0;
  for (const r of engaged) {
    bump(t.genres, r.genre, r.w);
    bump(t.languages, r.language, r.w * 0.7);
    bump(t.artists, r.artist, r.w);
    String(r.moods || '').split('|').filter(Boolean).forEach((m) => bump(t.moods, m, r.w * 0.5));
    eSum += r.energy;
  }
  if (engaged.length) t.energy = eSum / engaged.length;

  // Moods people post with / like, and the rooms they sit in.
  all(
    `SELECT m.name, 1.0 AS w FROM mood_drops d JOIN moods m ON m.id = d.mood_id WHERE d.user_id = $u
     UNION ALL SELECT m.name, 0.6 FROM likes l JOIN mood_drops d ON d.id = l.drop_id JOIN moods m ON m.id = d.mood_id WHERE l.user_id = $u`,
    { u: userId },
  ).forEach((r) => bump(t.moods, r.name, r.w));
  all('SELECT r.mood_tags FROM room_memberships rm JOIN sound_rooms r ON r.id = rm.room_id WHERE rm.user_id = ?', userId).forEach((r) =>
    json<string[]>(r.mood_tags, []).forEach((m) => bump(t.moods, m, 1)),
  );

  t.signals = Object.keys(t.genres).length + Object.keys(t.moods).length + engaged.length;
  return t;
}

const cap = (n: number | undefined, max: number) => Math.min(n || 0, max);

/** A small stable shuffle so lists rotate daily without flickering between requests. */
export function jitter(id: number, salt = 0) {
  const day = Math.floor(Date.now() / 86_400_000);
  let x = (id * 2654435761 + day * 40503 + salt * 97) >>> 0;
  x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
  return (x % 1000) / 1000;
}

export function scoreSong(s: Song, t: Taste) {
  const artistTokens = s.artist.split(/,|&| ft\. /).map((a) => a.trim());
  const artist = Math.max(0, ...Object.keys(t.artists).map((a) => (artistTokens.some((x) => x.toLowerCase() === a.toLowerCase()) || s.artist.toLowerCase().includes(a.toLowerCase()) ? t.artists[a] : 0)));
  const mood = s.moods.reduce((n, m) => n + cap(t.moods[m], 6), 0);
  return cap(t.genres[s.genre], 8) * 1.1 + cap(t.languages[s.language], 8) * 0.9 + cap(artist, 8) * 1.4 + mood * 0.55 + (s.popularity / 100) * 0.8 + jitter(s.id) * 1.2;
}

export const topKeys = (m: Record<string, number>, n: number) =>
  Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

export interface Recommender {
  songs(userId: number, n: number, opts?: { exclude?: Set<number>; filter?: (s: Song) => boolean }): Song[];
  users(userId: number, n: number): any[];
  rooms(userId: number, n: number): any[];
  feed(userId: number, limit: number, offset: number, mood?: string): { items: Drop[]; hasMore: boolean };
}

function spreadArtists<T extends { artist: string }>(list: T[], n: number) {
  // One song per artist first; only repeat an artist if the pool runs dry.
  const seen = new Set<string>();
  const out: T[] = [];
  const rest: T[] = [];
  for (const s of list) {
    if (seen.has(s.artist)) rest.push(s);
    else {
      seen.add(s.artist);
      out.push(s);
    }
    if (out.length >= n) return out;
  }
  return [...out, ...rest].slice(0, n);
}

export const ruleRecommender: Recommender = {
  songs(userId, n, opts = {}) {
    const t = tasteOf(userId);
    const ranked = allSongs(userId)
      .filter((s) => !s.saved && !opts.exclude?.has(s.id) && (!opts.filter || opts.filter(s)))
      .map((s) => ({ s, score: scoreSong(s, t) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
    return spreadArtists(ranked, n);
  },

  users(userId, n) {
    const mine = tasteOf(userId);
    const myGenres = new Set(topKeys(mine.genres, 5));
    const myMoods = new Set(topKeys(mine.moods, 5));
    const myArtists = new Set(topKeys(mine.artists, 8).map((a) => a.toLowerCase()));
    const myLangs = new Set(topKeys(mine.languages, 4));
    const others = all(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.is_demo, u.bio,
         (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers
       FROM users u
       WHERE u.id <> $v AND u.is_demo <> 2 AND u.onboarded = 1
         AND NOT EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $v AND f.following_id = u.id)
         AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id = $v AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $v))`,
      { v: userId },
    );
    return others
      .map((u) => {
        const p = prefsOf(u.id);
        const sharedArtists = p.artists.filter((a) => myArtists.has(a.toLowerCase()));
        const sharedGenres = p.genres.filter((g) => myGenres.has(g));
        const sharedMoods = p.moods.filter((m) => myMoods.has(m));
        const sharedLangs = p.languages.filter((l) => myLangs.has(l));
        const score = sharedArtists.length * 3 + sharedGenres.length * 1.5 + sharedMoods.length * 1.5 + sharedLangs.length + jitter(u.id, 7) * 0.9 + Math.min(u.followers, 10) * 0.05;
        return {
          ...miniUser(u),
          bio: u.bio as string,
          followers: u.followers as number,
          following: false,
          shared: [...sharedArtists.slice(0, 2), ...sharedMoods.slice(0, 2), ...sharedGenres.slice(0, 2)].slice(0, 3),
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  },

  rooms(userId, n) {
    const t = tasteOf(userId);
    return listRooms(userId)
      .filter((r) => !r.joined)
      .map((r) => ({ r, score: r.moods.reduce((s, m) => s + cap(t.moods[m], 6), 0) + Math.min(r.memberCount, 20) * 0.05 + jitter(r.id, 3) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((x) => x.r);
  },

  feed(userId, limit, offset, mood) {
    const t = tasteOf(userId);
    const pool = listDrops(userId, {
      where: mood ? 'm.name = $mood' : undefined,
      params: mood ? { mood } : undefined,
      limit: 300,
    });
    const nowMs = Date.now();
    const ranked = pool
      .map((d) => {
        const ageH = (nowMs - Date.parse(d.createdAt)) / 3_600_000;
        const fresh = 6 / (1 + ageH / 30);
        const social = (d.author.following ? 3 : 0) + (d.mine ? 1.5 : 0) + Math.log2(1 + d.likeCount + d.commentCount * 2) * 0.6;
        const score = cap(t.moods[d.mood.name], 6) * 0.7 + scoreSong(d.song, t) * 0.45 + fresh + social + (d.featured ? 0.6 : 0);
        return { d, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.d);
    return { items: ranked.slice(offset, offset + limit), hasMore: ranked.length > offset + limit };
  },
};

/** Single access point so a future AI-backed recommender can be dropped in via configuration. */
export const recommender: Recommender = ruleRecommender;

// ── "The Sound of Me" ───────────────────────────────────────────────────────
const ARCHETYPES: Record<string, [string, string]> = {
  Nostalgic: ['The Archivist', 'You keep songs the way other people keep photographs. Every track is a door back into a room that no longer exists.'],
  Melancholic: ['The Blue Hour', 'You are not afraid of the minor key. You let a song be sad without asking it to apologise.'],
  Peaceful: ['The Slow Morning', 'You listen for the space between notes. Your music does not ask for attention; it makes room.'],
  Euphoric: ['The Last Chorus', 'You chase the moment the drums come back in. Music, for you, is something that happens to the whole body.'],
  Heartbroken: ['The Open Letter', 'You let songs say the things you never sent. There is a whole unsent inbox in your listening history.'],
  Romantic: ['The Slow Burn', 'You hear love songs as architecture: somewhere warm to stand inside for three and a half minutes.'],
  Dreamy: ['The Soft Focus', 'You like your edges blurred. Reverb is a place you go, not an effect.'],
  Confident: ['The Entrance', 'You pick songs like you pick outfits: for the version of you about to walk in.'],
  Lonely: ['The Night Radio', 'You find company in voices that sound like they are singing to one person. Usually you.'],
  'Main Character': ['The Director', 'You do not just hear a song, you see the scene. Every walk home has a score and you chose it.'],
  Restless: ['The Open Tab', 'Your music moves because your mind does. You listen like you are looking for something.'],
  Hopeful: ['The First Light', 'You lean toward songs that leave a window open. Even your sad ones resolve upward.'],
  'Late Night': ['The Night Shift', 'Your truest listening happens after midnight, when the city gets quiet enough to hear what you actually feel.'],
  Unbothered: ['The Easy Exit', 'You keep it light on purpose. Your soundtrack shrugs beautifully.'],
  Freedom: ['The Long Road', 'You listen in motion. Your favourite songs all sound like leaving, in the best way.'],
  Lost: ['The Cartographer', 'You use songs to map what you cannot name yet. Not knowing is part of your sound.'],
  Inspired: ['The Sketchbook', 'You listen like someone about to make something. Music is fuel, not wallpaper.'],
  'Peaceful Chaos': ['The Beautiful Mess', 'You hold contradictions well. Your queue goes from strings to sub-bass and it somehow makes sense.'],
};

export function soundOfMe(userId: number) {
  const t = tasteOf(userId);
  const moods = topKeys(t.moods, 3);
  const genres = topKeys(t.genres, 3);
  const languages = topKeys(t.languages, 3);
  const artists = topKeys(t.artists, 4);
  if (!moods.length && !genres.length) {
    return { ready: false, archetype: 'Still tuning', summary: 'Not enough listening signals yet. Save a few songs or post a Mood Drop and this will start to sound like you.', moods: [], genres: [], languages: [], artists: [], energy: 0, traits: [] as { label: string; value: number }[] };
  }
  const [archetype, line] = ARCHETYPES[moods[0]] || ['The Original', 'Your taste does not fit an existing shelf, which is the point.'];
  const energy = t.energy || 3;
  const tempo = energy < 2.3 ? 'You mostly keep things quiet and close.' : energy > 3.6 ? 'You like it loud enough to feel in your chest.' : 'You move easily between hush and volume.';
  const lang = languages.length > 1 ? `You listen across ${languages.slice(0, 3).join(', ')}, and feelings rarely need translating.` : languages[0] ? `Most of your listening lives in ${languages[0]}.` : '';
  const genreLine = genres.length ? `Your centre of gravity is ${genres.slice(0, 2).join(' and ')}${moods[1] ? `, usually in a ${moods[1].toLowerCase()} light` : ''}.` : '';
  const total = Object.values(t.moods).reduce((a, b) => a + b, 0) || 1;
  return {
    ready: true,
    archetype,
    summary: [line, genreLine, tempo, lang].filter(Boolean).join(' '),
    moods,
    genres,
    languages,
    artists,
    energy: Math.round(energy * 10) / 10,
    traits: topKeys(t.moods, 4).map((m) => ({ label: m, value: Math.round((t.moods[m] / total) * 100) })),
  };
}
