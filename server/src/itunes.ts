/**
 * Optional music metadata enrichment through Apple's public iTunes Search API.
 * It gives us official cover art and a 30-second preview clip per track, served from Apple's CDN.
 * Nothing is downloaded or re-hosted; we only cache the URLs. Disable with MUSIC_METADATA=off.
 */
import { all, get, run } from './db';

const enabled = () => (process.env.MUSIC_METADATA || 'itunes') === 'itunes' && process.env.NODE_ENV !== 'test';
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => new Set(norm(s).split(' ').filter((t) => t.length >= 3));
const ALT_VERSION = /\b(remix|cover|covered|karaoke|lo-?fi|flip|slowed|reverb|sped up|8d|tribute|acoustic|unplugged|reprise|mashup|instrumental version|live)\b/i;
const INDIAN = new Set(['Tamil', 'Hindi', 'Malayalam', 'Telugu', 'Punjabi']);

export interface Enrichment {
  previewUrl: string | null;
  artworkUrl: string | null;
  appleUrl: string | null;
}

async function lookup(song: { title: string; artist: string; album: string; language: string }): Promise<Enrichment | null> {
  const lead = song.artist.split(/,|&| ft\. /)[0].trim();
  const countries = INDIAN.has(song.language) ? ['in', 'us'] : ['us', 'in'];
  const wantTitle = norm(song.title);
  const wantArtist = tokens(song.artist);
  const wantAlbum = tokens(song.album);
  for (const country of countries) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${song.title} ${lead}`)}&entity=song&limit=8&country=${country}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'aftrhrs-catalogue/1.0' } });
    if (res.status === 403 || res.status === 429) throw new Error('rate-limited');
    if (!res.ok) continue;
    const data = (await res.json()) as { results?: any[] };
    // Only accept a confident match: same title, not an alternate version, and an overlapping artist
    // (preferred) or album name.
    const candidates = (data.results || []).filter((r) => {
      const raw = `${r.trackName || ''} ${r.collectionName || ''}`;
      if (ALT_VERSION.test(raw) && !ALT_VERSION.test(song.title)) return false;
      const t = norm(r.trackName || '');
      return t.length > 0 && (t === wantTitle || t.startsWith(wantTitle) || wantTitle.startsWith(t));
    });
    const artistHit = (r: any) => [...wantArtist].some((x) => tokens(r.artistName || '').has(x));
    const albumHit = (r: any) => [...wantAlbum].some((x) => tokens(r.collectionName || '').has(x));
    const hit = candidates.find(artistHit) || candidates.find(albumHit);
    if (hit) {
      return {
        previewUrl: hit.previewUrl || null,
        artworkUrl: hit.artworkUrl100 ? String(hit.artworkUrl100).replace('100x100bb', '600x600bb') : null,
        appleUrl: hit.trackViewUrl || null,
      };
    }
  }
  return null;
}

/** Looks a song up once and caches the outcome (including "no confident match"). */
export async function enrichSong(id: number): Promise<Enrichment> {
  const s = get('SELECT s.*, a.name AS artist FROM songs s JOIN artists a ON a.id = s.artist_id WHERE s.id = ?', id);
  if (!s) return { previewUrl: null, artworkUrl: null, appleUrl: null };
  if (s.enriched || !enabled()) return { previewUrl: s.preview_url, artworkUrl: s.artwork_url, appleUrl: s.apple_url };
  const hit = await lookup(s as any);
  if (hit) run('UPDATE songs SET preview_url = ?, artwork_url = ?, apple_url = ?, enriched = 1 WHERE id = ?', hit.previewUrl, hit.artworkUrl, hit.appleUrl, id);
  else run('UPDATE songs SET enriched = 2 WHERE id = ?', id);
  return hit || { previewUrl: null, artworkUrl: null, appleUrl: null };
}

/** Slowly walks the catalogue in the background, staying well under the API's rate limit. */
export function startBackgroundEnrichment() {
  if (!enabled()) return;
  let failures = 0;
  const tick = async () => {
    const next = get<{ id: number }>('SELECT id FROM songs WHERE enriched = 0 ORDER BY popularity DESC LIMIT 1');
    if (!next) return console.log('[music] catalogue artwork + previews are up to date');
    let delay = 3400;
    try {
      await enrichSong(next.id);
      failures = 0;
    } catch {
      failures += 1;
      if (failures >= 5) return console.log('[music] metadata lookups unavailable right now; using generated artwork. Will retry on next start.');
      delay = 30_000 * failures;
    }
    setTimeout(tick, delay).unref();
  };
  const pending = all('SELECT id FROM songs WHERE enriched = 0').length;
  if (pending) console.log(`[music] looking up artwork + previews for ${pending} songs in the background (iTunes Search API)`);
  setTimeout(tick, 1500).unref();
}
