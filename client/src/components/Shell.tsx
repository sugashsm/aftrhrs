import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Compass, Home, LogOut, Pause, Play, PlusSquare, Search, Settings, Sparkles, User, Users, X } from 'lucide-react';
import { useAuth, usePlayer } from '../lib/store';
import { cx } from '../lib/util';
import { Artwork, Avatar, Logo, Spinner } from './ui';

function useNav() {
  const { user } = useAuth();
  return [
    { to: '/home', label: 'Home', icon: Home, mobile: true },
    { to: '/discover', label: 'Discover', icon: Compass, mobile: true },
    { to: '/ai', label: 'Mood AI', icon: Sparkles, mobile: true },
    { to: '/create', label: 'Create Mood Drop', short: 'Create', icon: PlusSquare, mobile: true },
    { to: '/rooms', label: 'Sound Rooms', icon: Users },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: user?.unread || 0 },
    { to: `/u/${user?.username}`, label: 'Profile', icon: User, mobile: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
}

function SearchBox({ className = '' }: { className?: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (loc.pathname === '/search') setQ(new URLSearchParams(loc.search).get('q') || '');
  }, [loc]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form onSubmit={submit} role="search" className={cx('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
      <input value={q} onChange={(e) => setQ(e.target.value)} className="field !rounded-full !bg-card !py-2.5 !pl-11 text-sm" placeholder="Search songs, people, rooms" aria-label="Search songs, people and rooms" maxLength={60} />
    </form>
  );
}

function MiniPlayer() {
  const { current, status, progress, toggle, close } = usePlayer();
  const { user } = useAuth();
  if (!current) return null;
  const service = user?.linkService || 'spotify';
  const name = { spotify: 'Spotify', youtube: 'YouTube', apple: 'Apple Music' }[service];
  return (
    <div className="fixed inset-x-3 bottom-[5.25rem] z-40 animate-rise lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[23rem]" role="region" aria-label="Preview player">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-raised/95 shadow-2xl shadow-black/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 p-2.5">
          <Artwork song={current} className="h-12 w-12" rounded="rounded-lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{current.title}</div>
            <div className="truncate text-xs text-mute">
              {status === 'none' ? (
                <>No preview available. <a className="font-semibold text-lav hover:underline" href={current.links[service]} target="_blank" rel="noopener noreferrer">Open on {name}</a></>
              ) : status === 'loading' ? 'Finding a preview…' : (
                <>{current.artist} · 30s preview</>
              )}
            </div>
          </div>
          {status === 'loading' ? <Spinner className="mx-2.5" /> : status !== 'none' && (
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fg text-ink" onClick={() => toggle(current)} aria-label={status === 'playing' ? 'Pause preview' : 'Play preview'}>
              {status === 'playing' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-px" />}
            </button>
          )}
          <button className="icon-btn" onClick={close} aria-label="Close player"><X size={16} /></button>
        </div>
        {status !== 'none' && <div className="h-0.5 bg-white/5"><div className="h-full bg-lav transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></div>}
      </div>
    </div>
  );
}

export function Shell() {
  const nav = useNav();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  if (!user) return null;

  return (
    <div className="min-h-screen lg:pl-[17rem]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-line bg-ink px-4 py-6 lg:flex">
        <Link to="/home" className="px-3 text-[15px]" aria-label="AFTRHRS home"><Logo /></Link>
        <nav className="mt-9 flex flex-1 flex-col gap-1" aria-label="Primary">
          {nav.map((n) => (
            <NavLink key={n.label} to={n.to} className={({ isActive }) => cx('group flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition', isActive ? 'bg-card text-fg' : 'text-mute hover:bg-white/[0.04] hover:text-fg')}>
              {({ isActive }) => (
                <>
                  <n.icon size={19} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-lav' : ''} />
                  <span className="flex-1">{n.label}</span>
                  {!!n.badge && <span className="min-w-5 rounded-full bg-violet px-1.5 py-0.5 text-center text-[11px] font-bold text-ink" aria-label={`${n.badge} unread`}>{n.badge}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {user.isGuest && (
          <div className="mb-3 rounded-2xl border border-line p-3.5 text-[12.5px] leading-relaxed text-mute">
            <div className="eyebrow mb-1 !text-lav">Demo mode</div>
            Temporary guest account. Listeners marked <span className="font-bold text-fg/80">DEMO</span> are fictional sample profiles.
            <Link to="/register" className="mt-2 block font-semibold text-fg hover:underline">Create a real account</Link>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-2xl p-2">
          <Link to={`/u/${user.username}`}><Avatar user={user} size={38} /></Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.displayName}</div>
            <div className="truncate text-xs text-mute">@{user.username}</div>
          </div>
          <button className="icon-btn" aria-label="Log out" title="Log out" onClick={() => logout().then(() => navigate('/'))}><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <Link to="/home" className="text-sm lg:hidden" aria-label="AFTRHRS home"><Logo /></Link>
          <SearchBox className="ml-auto hidden w-full max-w-sm sm:block lg:ml-0" />
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <Link to="/search" className="icon-btn sm:hidden" aria-label="Search"><Search size={19} /></Link>
            <Link to="/rooms" className="icon-btn" aria-label="Sound Rooms"><Users size={19} /></Link>
            <Link to="/notifications" className="icon-btn relative" aria-label={`Notifications${user.unread ? `, ${user.unread} unread` : ''}`}>
              <Bell size={19} />
              {!!user.unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet ring-2 ring-ink" />}
            </Link>
            <Link to="/settings" className="icon-btn" aria-label="Settings"><Settings size={19} /></Link>
          </div>
          <Link to="/create" className="btn-primary btn-sm ml-auto hidden lg:inline-flex"><PlusSquare size={15} /> New Mood Drop</Link>
        </div>
      </header>

      {user.isGuest && (
        <div className="border-b border-line bg-card/60 px-4 py-2 text-center text-[12.5px] text-mute lg:hidden">
          Demo mode · sample listeners are fictional · <Link to="/register" className="font-semibold text-fg underline-offset-2 hover:underline">Create an account</Link>
        </div>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 pb-40 pt-7 sm:px-6 lg:px-10 lg:pb-24 lg:pt-10">
        <Outlet />
      </main>

      <MiniPlayer />

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {nav.filter((n) => n.mobile).map((n) => (
            <NavLink key={n.label} to={n.to} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-3 text-[10.5px] font-semibold transition', isActive ? 'text-fg' : 'text-mute')}>
              {({ isActive }) => (
                <>
                  <n.icon size={21} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-lav' : ''} />
                  {n.short || n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="display text-5xl sm:text-6xl">{title}</h1>
        {sub && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
