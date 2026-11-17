import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';
import type { Me } from '../lib/types';
import { bgStyle, cx } from '../lib/util';
import { Logo, Spinner } from '../components/ui';
import { useDemo } from './Landing';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, ready, setUser } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const demo = useDemo();
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', identifier: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = (loc.state as any)?.from || '/home';

  // A guest in demo mode may come here to create a real account.
  if (ready && user && !user.isGuest) return <Navigate to={user.onboarded ? from : '/onboarding'} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const rules = [
    ['8 or more characters', form.password.length >= 8],
    ['A letter', /[A-Za-z]/.test(form.password)],
    ['A number', /[0-9]/.test(form.password)],
  ] as const;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !rules.every((r) => r[1])) return setError('Choose a stronger password: at least 8 characters with a letter and a number.');
    setBusy(true);
    try {
      const r = await api<{ user: Me }>(mode === 'login' ? '/auth/login' : '/auth/register', {
        body: mode === 'login' ? { identifier: form.identifier, password: form.password } : { email: form.email, username: form.username, displayName: form.displayName, password: form.password },
      });
      setUser(r.user);
      nav(r.user.onboarded ? from : '/onboarding', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grain relative hidden overflow-hidden lg:block" style={bgStyle(mode === 'login' ? 'dusk' : 'bloom')}>
        <div className="flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label="AFTRHRS home"><Logo className="text-[15px]" /></Link>
          <div>
            <p className="display max-w-lg text-6xl xl:text-7xl">{mode === 'login' ? '“Some nights are better left unexplained.”' : '“Everything is changing, and somehow I’m okay with it.”'}</p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-label text-fg/60">{mode === 'login' ? 'The Night We Met · Lord Huron' : 'A Sky Full of Stars · Coldplay'}</p>
          </div>
          <p className="text-sm text-fg/60">Every feeling has a soundtrack.</p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-12 inline-block text-sm lg:hidden" aria-label="AFTRHRS home"><Logo /></Link>
          <h1 className="display text-5xl">{mode === 'login' ? 'Welcome back.' : 'Find your sound.'}</h1>
          <p className="mt-3 text-mute">{mode === 'login' ? 'Pick up where the last song left off.' : 'Two minutes, five questions, then the music.'}</p>

          <form onSubmit={submit} className="mt-9 space-y-4" noValidate>
            {mode === 'register' ? (
              <>
                <div>
                  <label className="label" htmlFor="displayName">Name</label>
                  <input id="displayName" className="field" value={form.displayName} onChange={set('displayName')} autoComplete="name" required maxLength={40} placeholder="What should we call you?" />
                </div>
                <div>
                  <label className="label" htmlFor="username">Username</label>
                  <input id="username" className="field" value={form.username} onChange={set('username')} autoComplete="username" required maxLength={24} placeholder="letters, numbers, dots" autoCapitalize="none" />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="field" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="you@example.com" />
                </div>
              </>
            ) : (
              <div>
                <label className="label" htmlFor="identifier">Email or username</label>
                <input id="identifier" className="field" value={form.identifier} onChange={set('identifier')} autoComplete="username" required autoCapitalize="none" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} className="field pr-12" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required maxLength={128} />
                <button type="button" className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {mode === 'register' && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {rules.map(([label, ok]) => (
                    <li key={label} className={cx('flex items-center gap-1.5', ok ? 'text-[#9AD1C3]' : 'text-mute')}>
                      <Check size={12} className={ok ? '' : 'opacity-30'} /> {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p role="alert" className="rounded-2xl border border-[#E5677C]/40 bg-[#E5677C]/10 px-4 py-3 text-sm text-[#F6C1CA]">{error}</p>}

            <button className="btn-primary w-full py-3.5 text-[15px]" disabled={busy}>
              {busy ? <Spinner className="!text-ink" /> : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-label text-mute">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          {!user?.isGuest && (
            <button className="btn-ghost w-full py-3" disabled={demo.busy} onClick={() => demo.enter('/home')}>
              {demo.busy ? <Spinner /> : 'Look around in demo mode'}
            </button>
          )}
          <p className="mt-7 text-center text-sm text-mute">
            {mode === 'login' ? (
              <>New here? <Link to="/register" className="font-semibold text-fg hover:underline">Create an account</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="font-semibold text-fg hover:underline">Log in</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
