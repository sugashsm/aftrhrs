import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Download, Search, Sparkles } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth, useToast } from '../lib/store';
import type { Drop, Mood, Room, Song } from '../lib/types';
import { bgStyle, cx } from '../lib/util';
import { DropVisual, downloadDrop } from '../components/DropCard';
import { PageHeader } from '../components/Shell';
import { Artwork, Spinner } from '../components/ui';
import { AddCustom } from './Onboarding';
import { BACKGROUNDS } from '../../../shared/constants';

const STEPS = ['Song', 'Mood', 'Caption', 'Backdrop', 'Preview'] as const;
const PROMPTS = ['What would you say if nobody replied?', 'Where does this song take you?', 'Finish this: “Today feels like…”', 'Who is this song about? You do not have to name them.'];

export function Create() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [song, setSong] = useState<Song | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [caption, setCaption] = useState(params.get('caption') || '');
  const [bg, setBg] = useState('dusk');
  const [roomSlug, setRoomSlug] = useState(params.get('room') || '');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [busy, setBusy] = useState(false);
  const source = params.get('source') === 'ai' ? 'ai' : 'user';
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], []);

  const moods = useLoad<{ moods: Mood[] }>('/moods');
  const rooms = useLoad<{ rooms: Room[] }>('/rooms');
  const results = useLoad<{ songs: Song[] }>(`/songs?limit=30&sort=${debounced ? 'popular' : 'foryou'}&q=${encodeURIComponent(debounced)}`);
  const joined = (rooms.data?.rooms || []).filter((r) => r.joined);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Prefill from Mood AI, a song page or a room.
  useEffect(() => {
    const id = Number(params.get('song'));
    if (id) api<{ song: Song }>(`/songs/${id}`).then((r) => { setSong(r.song); setStep((s) => Math.max(s, params.get('mood') ? 2 : 1)); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const name = params.get('mood');
    if (name && moods.data && !mood) {
      const m = moods.data.moods.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (m) setMood(m);
    }
  }, [moods.data, params, mood]);

  const ok = [!!song, !!mood, caption.trim().length > 0, true, true];
  const reachable = (i: number) => ok.slice(0, i).every(Boolean);

  const addMood = async (name: string) => {
    try {
      const r = await api<{ mood: Mood }>('/moods', { body: { name } });
      moods.setData((d) => (d && !d.moods.some((m) => m.name === r.mood.name) ? { moods: [...d.moods, r.mood] } : d));
      setMood(r.mood);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const publish = async () => {
    if (!song || !mood) return;
    setBusy(true);
    try {
      const r = await api<{ drop: Drop }>('/drops', { body: { songId: song.id, mood: mood.name, caption: caption.trim(), background: bg, roomSlug: roomSlug || null, source } });
      toast('Your Mood Drop is live');
      refresh();
      nav(roomSlug ? `/rooms/${roomSlug}` : `/drop/${r.drop.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const preview = {
    caption: caption.trim(),
    background: bg,
    mood: mood || { name: 'Choose a mood', c1: '#9693A3', c2: '#20202B' },
    song: song || ({ id: 0, title: 'Pick a song', artist: 'Step one', moods: [], artworkUrl: null } as unknown as Song),
  };

  return (
    <div>
      <PageHeader eyebrow={source === 'ai' ? 'From your Mood AI conversation' : 'Create'} title="Drop a mood." sub="One song, one feeling, one line you could not say out loud." />

      <ol className="mb-8 flex gap-2 overflow-x-auto" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button disabled={!reachable(i)} onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined} className={cx('flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition disabled:opacity-40', step === i ? 'border-lav/60 bg-lav/10 text-fg' : 'border-line text-mute hover:text-fg')}>
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px]', ok[i] && i < 3 ? 'bg-lav text-ink' : 'bg-raised')}>{ok[i] && i < 3 ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {step === 0 && (
            <div className="animate-rise">
              <h2 className="display mb-5 text-4xl">Which song is it?</h2>
              <div className="relative mb-4">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input autoFocus className="field !pl-11" placeholder="Search by song, artist or album" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the catalogue" />
              </div>
              <div className="eyebrow mb-2">{debounced ? 'Results' : 'Suggested for you'}</div>
              {results.loading && !results.data ? <Spinner className="my-8" /> : (
                <ul className="max-h-[30rem] space-y-1 overflow-y-auto pr-1">
                  {(results.data?.songs || []).map((s) => (
                    <li key={s.id}>
                      <button onClick={() => { setSong(s); setStep(1); }} aria-pressed={song?.id === s.id} className={cx('flex w-full items-center gap-3.5 rounded-2xl p-2 text-left transition hover:bg-white/5', song?.id === s.id && 'bg-lav/10 ring-1 ring-lav/50')}>
                        <Artwork song={s} className="h-12 w-12" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{s.title}</span>
                          <span className="block truncate text-[13px] text-mute">{s.artist} · {s.language}</span>
                        </span>
                        {song?.id === s.id && <Check size={18} className="mr-2 text-lav" />}
                      </button>
                    </li>
                  ))}
                  {results.data && !results.data.songs.length && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute">Nothing in the sample catalogue matches “{debounced}”. Try an artist name.</li>}
                </ul>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="animate-rise">
              <h2 className="display mb-5 text-4xl">What is the feeling?</h2>
              {song && <p className="mb-4 text-sm text-mute">People usually hear {song.title} as {song.moods.slice(0, 3).join(', ').toLowerCase()}. You do not have to agree.</p>}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(moods.data?.moods || []).map((m) => (
                  <button key={m.name} onClick={() => setMood(m)} aria-pressed={mood?.name === m.name} className={cx('rounded-2xl border p-3.5 text-left transition', mood?.name === m.name ? 'border-lav/70 bg-lav/10' : 'border-line hover:border-white/20')}>
                    <span className="mb-2 block h-1.5 w-8 rounded-full" style={{ background: `linear-gradient(90deg, ${m.c1}, ${m.c2})` }} />
                    <span className="block text-sm font-semibold">{m.name}</span>
                    {m.line && <span className="mt-0.5 block text-xs leading-snug text-mute">{m.line}</span>}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <div className="label">None of these? Name your own.</div>
                <AddCustom placeholder="e.g. Monsoon Brain" onAdd={addMood} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-rise">
              <h2 className="display mb-5 text-4xl">Say the quiet part.</h2>
              <label className="label" htmlFor="caption">Caption</label>
              <textarea id="caption" autoFocus className="field min-h-[9rem] resize-y font-serif text-2xl leading-snug" maxLength={280} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={prompt} />
              <div className="mt-2 flex justify-between text-xs text-mute">
                <span>{source === 'ai' && params.get('caption') ? 'Suggested by Mood AI. Make it yours.' : 'Short is good. True is better.'}</span>
                <span className={cx('tabular-nums', caption.length > 260 && 'text-pink')}>{caption.length}/280</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-rise">
              <h2 className="display mb-5 text-4xl">Choose the light.</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BACKGROUNDS.map((b) => (
                  <button key={b.key} onClick={() => setBg(b.key)} aria-pressed={bg === b.key} aria-label={`${b.name} backdrop`} className={cx('grain aspect-[4/5] overflow-hidden rounded-2xl text-left ring-2 ring-offset-2 ring-offset-ink transition', bg === b.key ? 'ring-lav' : 'ring-transparent hover:ring-white/20')} style={bgStyle(b.key)}>
                    <span className="flex h-full items-end p-3 text-xs font-bold uppercase tracking-label">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && song && mood && (
            <div className="animate-rise">
              <h2 className="display mb-5 text-4xl">Ready when you are.</h2>
              <div className="lg:hidden"><DropVisual drop={preview} className="rounded-3xl" /></div>
              <div className="mt-6 lg:mt-0">
                <label className="label" htmlFor="room">Post to a Sound Room (optional)</label>
                <select id="room" className="field" value={roomSlug} onChange={(e) => setRoomSlug(e.target.value)}>
                  <option value="">Just my profile and the feed</option>
                  {joined.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                </select>
                {!joined.length && <p className="mt-2 text-xs text-mute">Join a Sound Room to post inside it.</p>}
              </div>
              <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-sm">
                {[['Song', `${song.title} · ${song.artist}`], ['Mood', mood.name], ['Backdrop', BACKGROUNDS.find((b) => b.key === bg)!.name], ['Posting as', `@${user!.username}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-mute">{k}</dt><dd className="truncate font-medium">{v}</dd></div>
                ))}
              </dl>
              {source === 'ai' && <p className="mt-4 flex items-center gap-2 text-xs text-mute"><Sparkles size={13} /> This drop will be marked as a Mood AI find.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn-primary px-8 py-3.5 text-[15px]" onClick={publish} disabled={busy}>{busy ? <Spinner className="!text-ink" /> : 'Publish Mood Drop'}</button>
                <button className="btn-ghost" onClick={() => downloadDrop({ ...preview, author: { username: user!.username } } as any, toast)}><Download size={16} /> Download card</button>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-between border-t border-line pt-6">
            <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
            {step < 4 && <button className="btn-light" disabled={!ok[step]} onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>}
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Live preview">
          <div className="sticky top-24">
            <div className="eyebrow mb-3">Live preview</div>
            <DropVisual drop={preview} className="rounded-3xl" />
          </div>
        </aside>
      </div>
    </div>
  );
}
