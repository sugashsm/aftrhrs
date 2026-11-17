import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Sparkles } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth } from '../lib/store';
import type { Drop, MiniUser, Mood, Room, Song } from '../lib/types';
import { cx, greeting } from '../lib/util';
import { DropCard, DropTile } from '../components/DropCard';
import { Empty, ErrorState, Loading, RoomCover, SongRow, Spinner, UserRow } from '../components/ui';

const FEEDS = [
  { key: 'foryou', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
] as const;
type FeedKey = (typeof FEEDS)[number]['key'];

/** Paginated feed with an IntersectionObserver sentinel for infinite scroll. */
export function useFeed(path: string) {
  const [items, setItems] = useState<Drop[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const busy = useRef(false);

  const load = useCallback(
    async (page: number, reset = false) => {
      if (busy.current && !reset) return;
      busy.current = true;
      const mine = reset ? ++seq.current : seq.current;
      setLoading(true);
      setError('');
      try {
        const r = await api<{ items: Drop[]; nextPage: number | null }>(`${path}${path.includes('?') ? '&' : '?'}page=${page}`);
        if (mine !== seq.current) return;
        setItems((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((d) => d.id));
          return [...base, ...r.items.filter((d) => !seen.has(d.id))];
        });
        setNext(r.nextPage);
      } catch (e) {
        if (mine === seq.current) setError((e as Error).message);
      } finally {
        if (mine === seq.current) {
          setLoading(false);
          busy.current = false;
        }
      }
    },
    [path],
  );

  useEffect(() => {
    setItems([]);
    setNext(0);
    busy.current = false;
    load(0, true);
  }, [load]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || next === null || next === 0) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && load(next), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, load]);

  const remove = (id: number) => setItems((list) => list.filter((d) => d.id !== id));
  return { items, loading, error, sentinel, hasMore: next !== null, remove, retry: () => load(next ?? 0, items.length === 0) };
}

interface Suggestions {
  people: MiniUser[];
  rooms: Room[];
  songs: Song[];
  moods: Mood[];
}

export function HomePage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedKey>(() => (sessionStorage.getItem('aftrhrs:feed') as FeedKey) || 'foryou');
  const [mood, setMood] = useState('');
  const sug = useLoad<Suggestions>('/suggestions');
  const featured = useLoad<{ items: Drop[] }>('/drops?feed=featured');
  const f = useFeed(`/drops?feed=${feed}${mood ? `&mood=${encodeURIComponent(mood)}` : ''}`);

  useEffect(() => {
    try {
      sessionStorage.setItem('aftrhrs:feed', feed);
    } catch {
      /* storage unavailable */
    }
  }, [feed]);

  return (
    <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        <div className="eyebrow mb-3">{greeting()}, {user!.displayName.split(' ')[0]}</div>
        <h1 className="display text-5xl sm:text-6xl">How does life sound today?</h1>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link to="/ai" className="panel group flex items-center gap-4 p-4 transition hover:border-white/15">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet/15 text-lav"><Sparkles size={19} /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">Not sure what you feel?</span>
              <span className="block truncate text-[13px] text-mute">Talk it through with Mood AI</span>
            </span>
          </Link>
          <Link to="/create" className="panel group flex items-center gap-4 p-4 transition hover:border-white/15">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink/15 text-pink"><PenLine size={19} /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">Know exactly what you feel?</span>
              <span className="block truncate text-[13px] text-mute">Drop the song that says it</span>
            </span>
          </Link>
        </div>

        {!!featured.data?.items.length && (
          <section className="mt-10" aria-label="Featured Mood Drops">
            <div className="eyebrow mb-4">Featured this week</div>
            <div className="hscroll">
              {featured.data.items.map((d) => <DropTile key={d.id} drop={d} className="w-64" />)}
            </div>
          </section>
        )}

        <div className="sticky top-16 z-10 -mx-4 mt-10 border-b border-line bg-ink/90 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <div className="flex gap-6" role="tablist" aria-label="Feed">
            {FEEDS.map((x) => (
              <button key={x.key} role="tab" aria-selected={feed === x.key} onClick={() => setFeed(x.key)} className={cx('relative py-4 text-sm font-semibold transition', feed === x.key ? 'text-fg' : 'text-mute hover:text-fg')}>
                {x.label}
                {feed === x.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-lav" />}
              </button>
            ))}
          </div>
        </div>

        <div className="hscroll mt-5 !gap-2" aria-label="Filter by mood">
          <button className={cx('chip', !mood && 'chip-on')} onClick={() => setMood('')} aria-pressed={!mood}>All moods</button>
          {(sug.data?.moods || []).map((m) => (
            <button key={m.name} className={cx('chip', mood === m.name && 'chip-on')} onClick={() => setMood(mood === m.name ? '' : m.name)} aria-pressed={mood === m.name}>
              <span className="h-2 w-2 rounded-full" style={{ background: m.c1 }} /> {m.name}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6" aria-live="polite" aria-busy={f.loading}>
          {f.items.map((d) => <DropCard key={d.id} drop={d} onRemoved={f.remove} />)}
          {f.loading && (f.items.length ? <div className="flex justify-center py-6"><Spinner /></div> : <Loading />)}
          {f.error && <ErrorState message={f.error} retry={f.retry} />}
          {!f.loading && !f.error && !f.items.length && (
            feed === 'following' ? (
              <Empty title="It is quiet in here." body="Follow a few listeners and their Mood Drops will collect here. Discover has people who hear the world like you do." action={<Link to="/discover" className="btn-primary">Find your people</Link>} />
            ) : (
              <Empty title={mood ? `Nobody has posted ${mood.toLowerCase()} yet.` : 'Nothing here yet.'} body="Be the first. One song, one line." action={<Link to={`/create${mood ? `?mood=${encodeURIComponent(mood)}` : ''}`} className="btn-primary">Create a Mood Drop</Link>} />
            )
          )}
          {!f.hasMore && f.items.length > 0 && <p className="py-8 text-center font-serif text-xl italic text-mute">That is everything, for now.</p>}
          <div ref={f.sentinel} aria-hidden />
        </div>
      </div>

      {/* Right rail */}
      <aside className="hidden space-y-10 xl:block" aria-label="Suggestions">
        {sug.loading && !sug.data ? <Spinner /> : sug.data && (
          <>
            <div>
              <div className="eyebrow mb-4">Listeners like you</div>
              <div className="space-y-4">{sug.data.people.map((p) => <UserRow key={p.id} user={p} />)}</div>
              {!sug.data.people.length && <p className="text-sm text-mute">You already follow everyone we would suggest.</p>}
            </div>
            <div>
              <div className="eyebrow mb-4">Songs you might feel</div>
              <div className="-mx-2">{sug.data.songs.map((s) => <SongRow key={s.id} song={s} />)}</div>
            </div>
            {!!sug.data.rooms.length && (
              <div>
                <div className="eyebrow mb-4">Rooms for you</div>
                <div className="space-y-3">
                  {sug.data.rooms.map((r) => (
                    <Link key={r.id} to={`/rooms/${r.slug}`} className="block">
                      <RoomCover room={r} className="rounded-2xl">
                        <div className="p-4">
                          <div className="text-sm font-extrabold tracking-[0.04em]">{r.name}</div>
                          <div className="font-serif text-[15px] italic text-fg/70">{r.tagline}</div>
                        </div>
                      </RoomCover>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs leading-relaxed text-mute/80">Profiles marked DEMO are fictional sample listeners. Suggestions come from a rule-based engine using your preferences, saves and follows.</p>
          </>
        )}
      </aside>
    </div>
  );
}
