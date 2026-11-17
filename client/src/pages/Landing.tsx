import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth, useToast } from '../lib/store';
import type { Drop, Me, MiniUser, Mood, Room, Song } from '../lib/types';
import { bgStyle, plural } from '../lib/util';
import { DropVisual } from '../components/DropCard';
import { Artwork, Avatar, DemoTag, Logo, MoodChip, RoomCover, Spinner } from '../components/ui';

interface HomeData {
  featured: Drop[];
  moods: Mood[];
  rooms: Room[];
  songs: Song[];
  creators: (MiniUser & { drops: number; mood: string | null })[];
  counts: { songs: number; languages: number; rooms: number };
}

const CHAT: [('you' | 'ai'), string][] = [
  ['ai', "Tell me what's going on. Or don't. We can figure out the soundtrack together."],
  ['you', 'Play something.'],
  ['ai', 'What kind of night are we having?'],
  ['you', 'Anything.'],
  ['ai', 'Anything is a dangerous answer. Are we feeling nostalgic, peaceful, restless or just existing?'],
  ['you', 'Just existing.'],
  ['ai', "I think I know the feeling. Let's find something for that."],
];

export function useDemo() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const enter = async (to = '/home') => {
    setBusy(true);
    try {
      const r = await api<{ user: Me }>('/auth/demo', { method: 'POST' });
      setUser(r.user);
      nav(to);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return { enter, busy };
}

export function Landing() {
  const { user, ready } = useAuth();
  const { data } = useLoad<HomeData>('/public/home');
  const demo = useDemo();
  if (ready && user) return <Navigate to={user.onboarded ? '/home' : '/onboarding'} replace />;

  const hero = data?.featured.slice(0, 3) || [];
  return (
    <div className="overflow-x-clip">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo className="text-sm sm:text-[15px]" />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to="/login" className="btn px-4 text-fg/80 hover:text-fg">Log in</Link>
            <Link to="/register" className="btn-light btn-sm">Join AFTRHRS</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="grain relative min-h-[100svh] overflow-hidden">
        <div className="!absolute inset-0" aria-hidden>
          <div className="absolute -left-[20%] top-[-10%] h-[70vmax] w-[70vmax] animate-drift rounded-full bg-[#5B3FB8] opacity-50 blur-[120px]" />
          <div className="absolute -right-[15%] bottom-[-25%] h-[60vmax] w-[60vmax] animate-drift rounded-full bg-[#B8517E] opacity-40 blur-[130px] [animation-delay:-6s]" />
          <div className="absolute left-[35%] top-[30%] h-[36vmax] w-[36vmax] animate-drift rounded-full bg-[#27306E] opacity-70 blur-[110px] [animation-delay:-11s]" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />
        </div>

        <div className="mx-auto grid min-h-[100svh] max-w-7xl items-center gap-12 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
          <div className="animate-rise">
            <div className="eyebrow mb-6 !text-fg/70">Every feeling has a soundtrack</div>
            <h1 className="display text-[clamp(3.6rem,10.5vw,8.5rem)] [text-wrap:balance]">
              How does life <em className="text-lav">sound</em> today?
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-fg/75 sm:text-xl">Discover the music that feels like you.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-7 py-3.5 text-[15px]">Find My Sound <ArrowRight size={17} /></Link>
              <button onClick={() => demo.enter('/home')} disabled={demo.busy} className="btn-ghost px-7 py-3.5 text-[15px]">
                {demo.busy ? <Spinner /> : 'Explore the Community'}
              </button>
            </div>
            <p className="mt-4 text-[13px] text-fg/50">Explore opens a temporary demo account. No sign-up needed.</p>
          </div>

          {/* Cinematic stack of Mood Drops */}
          <div className="relative mx-auto hidden h-[34rem] w-full max-w-md lg:block" aria-hidden>
            {hero.map((d, i) => (
              <div key={d.id} className="absolute w-[19.5rem]" style={{ left: `${[2, 26, 12][i]}%`, top: `${[4, 20, 46][i]}%`, transform: `rotate(${[-7, 5, -2][i]}deg)`, zIndex: i }}>
                <div className="animate-rise rounded-3xl shadow-2xl shadow-black/70" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                  <DropVisual drop={d} compact className="rounded-3xl ring-1 ring-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mood marquee */}
      {data && (
        <div className="relative border-y border-line py-5" aria-label="Trending moods">
          <div className="flex w-max animate-marquee gap-10 pr-10">
            {[...data.moods, ...data.moods].map((m, i) => (
              <span key={i} className="flex items-center gap-10 font-serif text-3xl italic text-fg/80 sm:text-4xl">
                {m.name}
                <span className="h-2 w-2 rounded-full" style={{ background: m.c1 }} />
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Featured Mood Drops */}
        <section className="py-24">
          <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <div className="eyebrow mb-4">Featured Mood Drops</div>
              <h2 className="display text-5xl sm:text-7xl">A song can say what a person cannot.</h2>
            </div>
            <p className="max-w-md text-[17px] leading-relaxed text-mute lg:justify-self-end">A Mood Drop is one song, one feeling and one line you could not say out loud. No follower counts on the front. Just what it sounds like to be someone today.</p>
          </div>
          {!data ? <div className="flex justify-center py-20"><Spinner /></div> : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.featured.slice(0, 6).map((d, i) => (
                <article key={d.id} className={i % 3 === 1 ? 'lg:translate-y-10' : ''}>
                  <DropVisual drop={d} compact className="min-h-[21rem] rounded-[1.75rem]" />
                  <div className="mt-3.5 flex items-center gap-2.5 text-sm">
                    <Avatar user={d.author} size={26} />
                    <span className="font-semibold">{d.author.displayName}</span>
                    <DemoTag />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Mood AI preview */}
        <section className="grid grid-cols-1 gap-12 border-t border-line py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="eyebrow mb-4">Mood AI</div>
            <h2 className="display text-5xl sm:text-7xl">You do not have to know what you want to hear.</h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-mute">Say “anything”. Say “I don’t know”. Say nothing useful at all. The companion asks the kind of question a friend would, then finds the song and tells you why it fits.</p>
            <button onClick={() => demo.enter('/ai')} disabled={demo.busy} className="btn-light mt-9">Talk to Mood AI <ArrowUpRight size={16} /></button>
            <p className="mt-3 text-[13px] text-mute">Runs on a built-in conversation engine. No external AI service is connected.</p>
          </div>
          <div className="panel grain overflow-hidden p-5 sm:p-7" style={bgStyle('dusk')}>
            <div className="space-y-3">
              {CHAT.map(([who, text], i) => (
                <div key={i} className={`flex ${who === 'you' ? 'justify-end' : ''}`}>
                  <p className={who === 'you' ? 'max-w-[80%] rounded-3xl rounded-br-lg bg-fg px-4 py-2.5 text-sm font-medium text-ink' : 'max-w-[85%] rounded-3xl rounded-bl-lg bg-ink/60 px-4 py-3 font-serif text-xl leading-snug backdrop-blur'}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sound Rooms */}
        {data && (
          <section className="border-t border-line py-24">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="eyebrow mb-4">Popular Sound Rooms</div>
                <h2 className="display text-5xl sm:text-7xl">Rooms for every hour.</h2>
              </div>
              <p className="max-w-sm text-[17px] leading-relaxed text-mute">Small communities built around a feeling, a time of night, or a corner of music.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.rooms.map((r) => (
                <RoomCover key={r.id} room={r} className="aspect-[5/4] rounded-[1.75rem]">
                  <div className="flex h-full flex-col justify-end p-6">
                    <div className="text-2xl font-extrabold tracking-[0.04em]">{r.name}</div>
                    <div className="mt-1 font-serif text-xl italic text-fg/75">{r.tagline}</div>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-label text-fg/60">{plural(r.memberCount, 'sample member')}</div>
                  </div>
                </RoomCover>
              ))}
            </div>
          </section>
        )}

        {/* Discoveries + creators */}
        {data && (
          <section className="grid grid-cols-1 gap-16 border-t border-line py-24 lg:grid-cols-2">
            <div>
              <div className="eyebrow mb-4">Featured discoveries</div>
              <h2 className="display mb-8 text-4xl sm:text-5xl">What people are feeling to.</h2>
              <ol className="divide-y divide-line">
                {data.songs.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-4 py-3.5">
                    <span className="w-6 font-serif text-2xl italic text-mute">{i + 1}</span>
                    <Artwork song={s} className="h-14 w-14" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{s.title}</div>
                      <div className="truncate text-sm text-mute">{s.artist}</div>
                    </div>
                    <span className="hidden sm:block"><MoodChip name={s.moods[0]} small /></span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-[13px] text-mute">{data.counts.songs} songs across {data.counts.languages} languages in the curated sample catalogue, including Tamil, Hindi, Malayalam and Telugu.</p>
            </div>
            <div>
              <div className="eyebrow mb-4">Featured creators</div>
              <h2 className="display mb-8 text-4xl sm:text-5xl">People worth listening to.</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.creators.map((c) => (
                  <div key={c.id} className="panel p-5">
                    <div className="flex items-center gap-3">
                      <Avatar user={c} size={46} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate font-semibold">{c.displayName} <DemoTag /></div>
                        <div className="truncate text-[13px] text-mute">@{c.username}</div>
                      </div>
                    </div>
                    <p className="mt-4 font-serif text-xl italic leading-snug text-fg/85">{c.bio}</p>
                    {c.mood && <div className="mt-4"><MoodChip name={c.mood} small /></div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Closing */}
        <section className="border-t border-line py-28 text-center">
          <h2 className="display mx-auto max-w-4xl text-6xl sm:text-8xl">A different corner of the internet.</h2>
          <p className="mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-mute">A place where you do not need to explain everything. Where music is the language, and the feeling is enough.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary px-7 py-3.5 text-[15px]">Find My Sound</Link>
            <button onClick={() => demo.enter('/home')} disabled={demo.busy} className="btn-ghost px-7 py-3.5 text-[15px]">Explore the Community</button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-[13px] text-mute sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="text-xs text-fg/80" />
          <p className="max-w-xl sm:text-right">Listeners, Mood Drops and member counts shown here are fictional sample data, labelled DEMO. Song metadata is a curated sample catalogue. AFTRHRS links out to streaming services and does not host music.</p>
        </div>
      </footer>
    </div>
  );
}
