import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth } from '../lib/store';
import type { Me, Preferences } from '../lib/types';
import { cx, moodColors } from '../lib/util';
import { Loading, Logo, Spinner } from '../components/ui';
import { DISCOVERY_GOALS, GENRES, LANGUAGES, MOOD_NAMES } from '../../../shared/constants';

export function ChipGroup({ options, value, onChange, dots }: { options: string[]; value: string[]; onChange: (v: string[]) => void; dots?: boolean }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} aria-pressed={on} onClick={() => toggle(o)} className={cx('chip !px-4 !py-2.5 !text-sm', on && 'chip-on')}>
            {dots && <span className="h-2 w-2 rounded-full" style={{ background: moodColors(o)[0] }} />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Shared by onboarding and Settings → Music preferences. */
export function AddCustom({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (v.trim()) onAdd(v.trim().slice(0, 40));
    setV('');
  };
  return (
    <form onSubmit={submit} className="mt-4 flex max-w-sm gap-2">
      <input className="field !rounded-full !py-2.5 text-sm" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} maxLength={40} aria-label={placeholder} />
      <button className="btn-quiet !h-11 !w-11 shrink-0 !p-0" aria-label="Add" disabled={!v.trim()}><Plus size={16} /></button>
    </form>
  );
}

const STEPS = [
  { key: 'languages', q: 'What languages do you listen to?', hint: 'Pick every language your playlists speak.' },
  { key: 'genres', q: 'Which genres do you enjoy?', hint: 'No wrong answers. Guilty pleasures count.' },
  { key: 'artists', q: 'Which artists do you love?', hint: 'A few is plenty. We will take it from there.' },
  { key: 'moods', q: 'What moods describe you most often?', hint: 'The ones you keep coming back to.' },
  { key: 'discovery', q: 'What kind of music do you want to discover?', hint: 'This shapes what we put in front of you first.' },
] as const;

export function Onboarding() {
  const { user, ready, setUser, logout } = useAuth();
  const nav = useNavigate();
  const facets = useLoad<{ artists: string[] }>('/songs/facets');
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>({ languages: [], genres: [], artists: [], moods: [], discovery: [] });
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const artistOptions = useMemo(() => {
    const names = new Set<string>();
    (facets.data?.artists || []).forEach((a) => a.split(/,| & | ft\. /).forEach((x) => x.trim() && names.add(x.trim())));
    const all = [...new Set([...prefs.artists, ...[...names].sort((a, b) => a.localeCompare(b))])];
    const f = filter.trim().toLowerCase();
    return f ? all.filter((a) => a.toLowerCase().includes(f) || prefs.artists.includes(a)) : all;
  }, [facets.data, prefs.artists, filter]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/home" replace />;

  const cur = STEPS[step];
  const value = prefs[cur.key];
  const set = (v: string[]) => setPrefs((p) => ({ ...p, [cur.key]: v }));
  const required = cur.key === 'languages' || cur.key === 'genres';
  const canNext = !required || value.length > 0;

  const next = async () => {
    setError('');
    if (step < STEPS.length - 1) return setStep(step + 1);
    setBusy(true);
    try {
      const r = await api<{ user: Me }>('/me/preferences', { method: 'PUT', body: prefs });
      setUser(r.user);
      nav('/home', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-7">
        <Logo className="text-sm" />
        <button className="text-sm text-mute hover:text-fg" onClick={() => logout().then(() => nav('/'))}>Log out</button>
      </header>
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Onboarding progress">
          {STEPS.map((_, i) => <span key={i} className={cx('h-1 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-lav' : 'bg-raised')} />)}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-36 pt-14">
        <div key={step} className="animate-rise">
          <div className="eyebrow mb-4">Question {step + 1} of {STEPS.length}</div>
          <h1 className="display text-5xl sm:text-6xl">{cur.q}</h1>
          <p className="mt-4 text-mute">{cur.hint}</p>

          <div className="mt-10">
            {cur.key === 'languages' && (<><ChipGroup options={[...new Set([...LANGUAGES, ...value])]} value={value} onChange={set} /><AddCustom placeholder="Add another language" onAdd={(v) => set([...new Set([...value, v])])} /></>)}
            {cur.key === 'genres' && (<><ChipGroup options={[...new Set([...GENRES, ...value])]} value={value} onChange={set} /><AddCustom placeholder="Add another genre" onAdd={(v) => set([...new Set([...value, v])])} /></>)}
            {cur.key === 'artists' && (
              <>
                <input className="field mb-5 max-w-sm !rounded-full !py-2.5 text-sm" placeholder="Filter artists" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter artists" />
                {facets.loading ? <Spinner /> : <div className="max-h-[22rem] overflow-y-auto pr-2"><ChipGroup options={artistOptions} value={value} onChange={set} /></div>}
                <AddCustom placeholder="Someone we missed?" onAdd={(v) => set([...new Set([...value, v])])} />
              </>
            )}
            {cur.key === 'moods' && <ChipGroup options={MOOD_NAMES} value={value} onChange={set} dots />}
            {cur.key === 'discovery' && <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{DISCOVERY_GOALS.map((g) => {
              const on = value.includes(g);
              return <button key={g} type="button" aria-pressed={on} onClick={() => set(on ? value.filter((x) => x !== g) : [...value, g])} className={cx('rounded-2xl border px-5 py-4 text-left text-[15px] font-medium transition', on ? 'border-lav/60 bg-lav/10' : 'border-line text-fg/80 hover:border-white/20')}>{g}</button>;
            })}</div>}
          </div>
          {error && <p role="alert" className="mt-6 text-sm text-[#F6C1CA]">{error}</p>}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
          <div className="flex items-center gap-3">
            {!required && !value.length && <span className="hidden text-sm text-mute sm:block">Optional</span>}
            <button className="btn-primary px-7" disabled={!canNext || busy} onClick={next}>
              {busy ? <Spinner className="!text-ink" /> : step === STEPS.length - 1 ? 'Take me in' : !required && !value.length ? 'Skip' : 'Continue'} {!busy && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
