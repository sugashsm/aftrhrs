import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import type { Drop, MiniUser, Mood, Playlist, Room, Song } from '../lib/types';
import { bgStyle, cx, plural } from '../lib/util';
import { DropTile } from '../components/DropCard';
import { PageHeader } from '../components/Shell';
import { Empty, ErrorState, Loading, MoodChip, PlaylistCard, RoomCard, Section, SongRow, SongTile, Spinner, UserRow } from '../components/ui';

interface DiscoverData {
  trending: Song[];
  moods: Mood[];
  forYou: Song[];
  hiddenGems: Song[];
  newArtists: Song[];
  people: MiniUser[];
  soundtracks: Playlist[];
  moodOfTheWeek: { mood: Mood; songs: Song[]; drops: Drop[] } | null;
  popularDrops: Drop[];
  rooms: Room[];
}

const SORTS = [['foryou', 'Best for you'], ['popular', 'Most popular'], ['recent', 'Recently posted'], ['hidden', 'Least known first'], ['az', 'A to Z']] as const;

function Catalogue({ presetMood }: { presetMood: string }) {
  const facets = useLoad<{ genres: string[]; languages: string[]; artists: string[]; total: number }>('/songs/facets');
  const [f, setF] = useState({ q: '', mood: '', genre: '', language: '', artist: '', sort: 'foryou' });
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const moods = useLoad<{ moods: Mood[] }>('/moods');

  useEffect(() => {
    if (presetMood) setF((x) => ({ ...x, mood: presetMood }));
  }, [presetMood]);

  const load = async (page: number) => {
    const mine = page === 0 ? ++seq.current : seq.current;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ ...f, page: String(page), limit: '18' });
      const r = await api<{ songs: Song[]; total: number; nextPage: number | null }>(`/songs?${qs}`);
      if (mine !== seq.current) return;
      setSongs((prev) => (page === 0 ? r.songs : [...prev, ...r.songs]));
      setTotal(r.total);
      setNext(r.nextPage);
    } catch (e) {
      if (mine === seq.current) setError((e as Error).message);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => load(0), f.q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const active = (['mood', 'genre', 'language', 'artist'] as const).filter((k) => f[k]);
  const sel = 'field !w-auto !rounded-full !py-2 !pl-4 !pr-9 text-[13px] font-medium';
  return (
    <Section eyebrow="The catalogue" title="Browse everything." className="scroll-mt-24" >
      <div id="catalogue" className="scroll-mt-24">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input className="field !rounded-full !py-2 !pl-11 text-sm" placeholder="Song, artist or album" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search the catalogue" />
          </div>
          <SlidersHorizontal size={16} className="ml-1 hidden text-mute sm:block" aria-hidden />
          <select className={sel} value={f.mood} onChange={(e) => setF({ ...f, mood: e.target.value })} aria-label="Filter by mood">
            <option value="">Any mood</option>
            {(moods.data?.moods || []).filter((m) => !m.custom).map((m) => <option key={m.name}>{m.name}</option>)}
          </select>
          <select className={sel} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })} aria-label="Filter by genre">
            <option value="">Any genre</option>
            {(facets.data?.genres || []).map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className={sel} value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} aria-label="Filter by language">
            <option value="">Any language</option>
            {(facets.data?.languages || []).map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className={cx(sel, 'max-w-[11rem]')} value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} aria-label="Filter by artist">
            <option value="">Any artist</option>
            {(facets.data?.artists || []).map((a) => <option key={a}>{a}</option>)}
          </select>
          <select className={sel} value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} aria-label="Sort by">
            {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-mute">
          <span>{loading && !songs.length ? 'Searching…' : `${plural(total, 'song')}${facets.data ? ` of ${facets.data.total} in the sample catalogue` : ''}`}</span>
          {active.map((k) => (
            <button key={k} className="chip chip-on !py-1" onClick={() => setF({ ...f, [k]: '' })} aria-label={`Remove ${k} filter`}>{f[k]} <X size={12} /></button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {songs.map((s) => <SongRow key={s.id} song={s} />)}
        </div>
        {error && <ErrorState message={error} retry={() => load(0)} />}
        {!loading && !error && !songs.length && <Empty title="Nothing matches that." body="The sample catalogue is small on purpose. Loosen a filter, or try an artist name." action={<button className="btn-ghost" onClick={() => setF({ q: '', mood: '', genre: '', language: '', artist: '', sort: 'foryou' })}>Clear filters</button>} />}
        {next !== null && <div className="mt-6 flex justify-center"><button className="btn-ghost" disabled={loading} onClick={() => load(next)}>{loading ? <Spinner /> : 'Show more'}</button></div>}
      </div>
    </Section>
  );
}

export function Discover() {
  const { data, error, loading, reload } = useLoad<DiscoverData>('/discover');
  const [mood, setMood] = useState('');
  const pick = (name: string) => {
    setMood(name);
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading && !data) return <Loading label="Digging through the crates" />;
  if (error && !data) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return null;
  const week = data.moodOfTheWeek;

  return (
    <div>
      <PageHeader eyebrow="Discover" title="Find the feeling first." sub="Music sorted by what it does to you, not by what it is called." />

      {week && (
        <section className="grain overflow-hidden rounded-[2rem]" style={bgStyle('dusk')} aria-label="Mood of the week">
          <div className="grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col">
              <div className="eyebrow !text-fg/70">Mood of the week</div>
              <h2 className="display mt-4 text-6xl sm:text-8xl">{week.mood.name}</h2>
              <p className="mt-3 font-serif text-2xl italic text-fg/75">{week.mood.line}</p>
              <p className="mt-auto pt-8 text-[13px] text-fg/60">{plural(week.mood.recent || 0, 'Mood Drop')} in the last seven days on this instance.</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button className="btn-light" onClick={() => pick(week.mood.name)}>Hear more {week.mood.name.toLowerCase()}</button>
                <Link to={`/create?mood=${encodeURIComponent(week.mood.name)}`} className="btn-ghost">Post yours</Link>
              </div>
            </div>
            <div className="min-w-0 rounded-3xl bg-ink/45 p-3 backdrop-blur-md">{week.songs.map((s, i) => <SongRow key={s.id} song={s} index={i} />)}</div>
          </div>
        </section>
      )}

      <Section eyebrow="Based on drops, likes and saves here" title="Trending right now.">
        <div className="hscroll">{data.trending.map((s, i) => <SongTile key={s.id} song={s} note={`No. ${i + 1}`} />)}</div>
      </Section>

      <Section title="Today's moods.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.moods.map((m) => (
            <button key={m.name} onClick={() => pick(m.name)} className="grain group overflow-hidden rounded-2xl p-4 text-left transition hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${m.c1}55, ${m.c2}cc)` }}>
              <span className="block font-serif text-2xl italic">{m.name}</span>
              <span className="mt-1 block text-xs text-fg/70">{plural(m.drops || 0, 'drop')}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section eyebrow="From your preferences, saves and follows" title="Songs you might feel.">
        <div className="hscroll">{data.forYou.map((s) => <SongTile key={s.id} song={s} note={s.moods[0]} />)}</div>
      </Section>

      <Section eyebrow="Lower on the popularity scale, high on feeling" title="Hidden gems.">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">{data.hiddenGems.map((s) => <SongRow key={s.id} song={s} />)}</div>
      </Section>

      <Section title="New artist discoveries.">
        <div className="hscroll">{data.newArtists.map((s) => <SongTile key={s.id} song={s} note={s.artist.length < 22 ? 'Artist to watch' : undefined} />)}</div>
      </Section>

      {!!data.people.length && (
        <Section eyebrow="Overlapping artists, moods and genres" title="People like your music taste.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.people.map((p) => <div key={p.id} className="panel p-4"><UserRow user={p} /></div>)}</div>
        </Section>
      )}

      <Section eyebrow="Curated playlists" title="Trending soundtracks." action={<Link to="/ai" className="btn-ghost btn-sm hidden sm:inline-flex">Make your own with Mood AI</Link>}>
        <div className="hscroll">{data.soundtracks.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</div>
      </Section>

      <Section title="Popular Mood Drops.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.popularDrops.map((d) => <DropTile key={d.id} drop={d} />)}</div>
      </Section>

      {!!data.rooms.length && (
        <Section title="Rooms you might like." action={<Link to="/rooms" className="btn-ghost btn-sm">All rooms</Link>}>
          <div className="hscroll sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">{data.rooms.map((r) => <RoomCard key={r.id} room={r} />)}</div>
        </Section>
      )}

      <Catalogue presetMood={mood} />
      <p className="mt-12 flex items-center gap-2 text-xs text-mute"><MoodChip name="Sample content" small /> Catalogue metadata and demo activity are seeded for this build. Artwork and 30-second previews, where shown, come from the iTunes Search API.</p>
    </div>
  );
}
