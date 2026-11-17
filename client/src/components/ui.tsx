import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Loader2, Pause, Play, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, usePlayer, useToast } from '../lib/store';
import type { MiniUser, Playlist, Room, Song } from '../lib/types';
import { cx, hash, moodColors, plural } from '../lib/util';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 font-extrabold tracking-[0.32em]', className)}>
      <svg viewBox="0 0 64 64" className="h-[1.15em] w-[1.15em]" aria-hidden>
        <defs>
          <radialGradient id="logo-g" cx="30%" cy="25%" r="90%">
            <stop offset="0" stopColor="#C4B5FD" />
            <stop offset=".55" stopColor="#A78BFA" />
            <stop offset="1" stopColor="#F0A6C8" />
          </radialGradient>
        </defs>
        <circle cx="30" cy="34" r="24" fill="url(#logo-g)" />
        <circle cx="42" cy="25" r="21" fill="#09090D" />
      </svg>
      AFTRHRS
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-mute', className)} aria-label="Loading" />;
}

export function Loading({ label = 'Tuning in' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-mute">
      <div className="flex h-6 items-end gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="eq-bar h-full w-1 animate-eq rounded-full bg-lav/70" style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-raised text-lav">{icon}</div>}
      <h3 className="display text-3xl text-fg">{title}</h3>
      {body && <p className="mt-3 max-w-sm text-sm leading-relaxed text-mute">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <Empty title="That did not load." body={message} action={retry && <button className="btn-ghost" onClick={retry}>Try again</button>} />;
}

export function DemoTag() {
  return (
    <span title="Fictional sample account" className="rounded border border-line px-1 py-px text-[9px] font-bold uppercase tracking-[0.14em] text-mute">
      demo
    </span>
  );
}

export function Avatar({ user, size = 40, className = '' }: { user: Pick<MiniUser, 'username' | 'displayName' | 'avatar'>; size?: number; className?: string }) {
  const h = hash(user.username);
  const hue = h % 360;
  const initials = user.displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (user.avatar) return <img src={user.avatar} alt="" width={size} height={size} className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink/80', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(${(h >> 3) % 360}deg, hsl(${hue} 70% 78%), hsl(${(hue + 60) % 360} 55% 62%))` }}
    >
      {initials}
    </span>
  );
}

/**
 * Album artwork. Uses the official cover when the metadata service has resolved one,
 * otherwise a generated cover derived from the song's mood so nothing ever looks empty.
 */
export function Artwork({ song, className = '', rounded = 'rounded-xl' }: { song: Pick<Song, 'id' | 'title' | 'artist' | 'moods' | 'artworkUrl'>; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const uid = useId().replace(/:/g, '');
  useEffect(() => setFailed(false), [song.artworkUrl]);
  if (song.artworkUrl && !failed) {
    return <img src={song.artworkUrl} alt={`${song.title} cover`} loading="lazy" onError={() => setFailed(true)} className={cx('aspect-square shrink-0 bg-raised object-cover', rounded, className)} />;
  }
  const h = hash(song.title + song.artist);
  const [c1, c2] = moodColors(song.moods[0] || '');
  const [c3] = moodColors(song.moods[1] || song.moods[0] || '');
  const motif = h % 4;
  const x = 20 + (h % 60), y = 20 + ((h >> 4) % 60);
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Generated cover for ${song.title}`} className={cx('aspect-square shrink-0', rounded, className)} preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id={`b${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id={`c${uid}`}>
          <rect width="100" height="100" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="100" height="100" fill="#14141C" />
        <g filter={`url(#b${uid})`}>
          <circle cx={x} cy={y} r="42" fill={c1} opacity=".9" />
          <circle cx={100 - x} cy={100 - y} r="38" fill={c2} />
          <circle cx={y} cy={100 - x * 0.6} r="22" fill={c3} opacity=".55" />
        </g>
        <g fill="none" stroke="#F5F3FA" strokeOpacity=".5" strokeWidth=".6">
          {motif === 0 && [10, 17, 24, 31].map((r) => <circle key={r} cx="50" cy="50" r={r} />)}
          {motif === 1 && [30, 38, 46, 54, 62, 70].map((l, i) => <line key={l} x1={22 + i * 3} x2={78 - i * 3} y1={l} y2={l} />)}
          {motif === 2 && (
            <>
              <path d="M18 62 A32 32 0 0 1 82 62" />
              <line x1="10" x2="90" y1="62" y2="62" />
              <line x1="22" x2="78" y1="69" y2="69" strokeOpacity=".3" />
              <line x1="34" x2="66" y1="76" y2="76" strokeOpacity=".2" />
            </>
          )}
          {motif === 3 && (
            <>
              <rect x="26" y="26" width="48" height="48" />
              <line x1="26" y1="74" x2="74" y2="26" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

export function MoodChip({ name, c1, small }: { name: string; c1?: string; small?: boolean }) {
  const color = c1 || moodColors(name)[0];
  return (
    <span className={cx('inline-flex items-center gap-2 font-bold uppercase tracking-label text-fg/90', small ? 'text-[10px]' : 'text-[11px]')}>
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      {name}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 animate-fade cursor-default bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative max-h-[88vh] w-full animate-rise overflow-y-auto rounded-t-3xl border border-line bg-card p-6 sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="display text-3xl">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Section({ eyebrow, title, action, children, className = '' }: { eyebrow?: string; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-14 first:mt-0', className)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <h2 className="display text-[2rem] sm:text-4xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Songs ───────────────────────────────────────────────────────────────────
export function PlayButton({ song, size = 40, className = '' }: { song: Song; size?: number; className?: string }) {
  const { current, status, toggle } = usePlayer();
  const active = current?.id === song.id;
  const icon = active && status === 'loading' ? <Loader2 size={size * 0.42} className="animate-spin" /> : active && status === 'playing' ? <Pause size={size * 0.42} fill="currentColor" /> : <Play size={size * 0.42} fill="currentColor" className="translate-x-[1px]" />;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(song);
      }}
      aria-label={active && status === 'playing' ? `Pause preview of ${song.title}` : `Play 30 second preview of ${song.title}`}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-fg text-ink transition hover:scale-105 active:scale-95', className)}
      style={{ width: size, height: size }}
    >
      {icon}
    </button>
  );
}

export function useSongSave(song: Song, onChange?: (saved: boolean) => void) {
  const [saved, setSaved] = useState(song.saved);
  const toast = useToast();
  useEffect(() => setSaved(song.saved), [song.id, song.saved]);
  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await api(`/songs/${song.id}/save`, { method: next ? 'POST' : 'DELETE' });
      song.saved = next;
      onChange?.(next);
      toast(next ? 'Saved to your songs' : 'Removed from your songs');
    } catch (e) {
      setSaved(!next);
      toast((e as Error).message, 'error');
    }
  };
  return { saved, toggle };
}

export function SaveSongButton({ song, onChange, className = '' }: { song: Song; onChange?: (saved: boolean) => void; className?: string }) {
  const { saved, toggle } = useSongSave(song, onChange);
  return (
    <button className={cx('icon-btn', saved && 'text-lav', className)} onClick={toggle} aria-pressed={saved} aria-label={saved ? `Remove ${song.title} from saved songs` : `Save ${song.title}`}>
      <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

const SERVICE = { spotify: 'Spotify', youtube: 'YouTube', apple: 'Apple Music' } as const;

export function OpenLink({ song, className = '', label = true }: { song: Song; className?: string; label?: boolean }) {
  const { user } = useAuth();
  const s = user?.linkService || 'spotify';
  return (
    <a href={song.links[s]} target="_blank" rel="noopener noreferrer" className={cx(label ? 'chip' : 'icon-btn', className)} aria-label={`Open ${song.title} on ${SERVICE[s]} (new tab)`} title={`Open on ${SERVICE[s]}`}>
      <ExternalLink size={label ? 13 : 16} />
      {label && SERVICE[s]}
    </a>
  );
}

export function SongRow({ song, index, reason, actions, onSaveChange }: { song: Song; index?: number; reason?: string; actions?: ReactNode; onSaveChange?: (saved: boolean) => void }) {
  return (
    <div className="group flex min-w-0 items-center gap-3.5 rounded-2xl p-2 transition hover:bg-white/[0.035]">
      {index !== undefined && <span className="w-5 shrink-0 text-center text-xs tabular-nums text-mute">{index + 1}</span>}
      <div className="relative shrink-0">
        <Artwork song={song} className="h-14 w-14" />
        <PlayButton song={song} size={34} className="absolute inset-0 m-auto opacity-0 shadow-lg shadow-black/50 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-90" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{song.title}</div>
        <div className="truncate text-[13px] text-mute">
          {song.artist} <span className="text-mute/50">·</span> {song.language}
        </div>
        {reason && <p className="mt-1.5 text-[13px] leading-snug text-fg/70">{reason}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {actions}
        <SaveSongButton song={song} onChange={onSaveChange} />
        <OpenLink song={song} label={false} />
      </div>
    </div>
  );
}

export function SongTile({ song, note }: { song: Song; note?: string }) {
  return (
    <div className="group w-40 shrink-0 snap-start sm:w-44">
      <div className="relative">
        <Artwork song={song} className="w-full" rounded="rounded-2xl" />
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <PlayButton song={song} size={38} className="shadow-lg shadow-black/60" />
          <span className="flex rounded-full bg-ink/70 backdrop-blur">
            <SaveSongButton song={song} />
            <OpenLink song={song} label={false} />
          </span>
        </div>
      </div>
      <div className="mt-3 truncate text-sm font-semibold">{song.title}</div>
      <div className="truncate text-[13px] text-mute">{song.artist}</div>
      {note && <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-lav/80">{note}</div>}
    </div>
  );
}

// ── People ──────────────────────────────────────────────────────────────────
export function FollowButton({ user, onChange, className = '' }: { user: MiniUser; onChange?: (following: boolean) => void; className?: string }) {
  const [following, setFollowing] = useState(!!user.following);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setFollowing(!!user.following), [user.id, user.following]);
  const toggle = async () => {
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      await api(`/users/${user.id}/follow`, { method: next ? 'POST' : 'DELETE' });
      user.following = next;
      onChange?.(next);
    } catch (e) {
      setFollowing(!next);
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button disabled={busy} onClick={toggle} aria-pressed={following} className={cx(following ? 'btn-ghost' : 'btn-light', 'btn-sm', className)}>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

export function UserRow({ user, onFollowChange }: { user: MiniUser; onFollowChange?: (f: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Link to={`/u/${user.username}`} className="shrink-0" aria-label={`${user.displayName}'s profile`}>
        <Avatar user={user} size={44} />
      </Link>
      <Link to={`/u/${user.username}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <span className="truncate">{user.displayName}</span>
          {user.isDemo && <DemoTag />}
        </div>
        <div className="truncate text-[13px] text-mute">{user.shared?.length ? `Also into ${user.shared.join(', ')}` : user.bio || `@${user.username}`}</div>
      </Link>
      {!user.isMe && <FollowButton user={user} onChange={onFollowChange} />}
    </div>
  );
}

// ── Rooms ───────────────────────────────────────────────────────────────────
function Motif({ kind }: { kind: string }) {
  const s = { fill: 'none', stroke: '#F5F3FA', strokeOpacity: 0.55, strokeWidth: 0.7 } as const;
  switch (kind) {
    case 'moon':
      return (<g {...s}><circle cx="150" cy="46" r="26" /><path d="M150 20a26 26 0 1 0 22 40 21 21 0 0 1-22-40z" fill="#F5F3FA" fillOpacity=".14" /></g>);
    case 'door':
      return (<g {...s}><rect x="128" y="18" width="40" height="66" rx="20" /><rect x="136" y="28" width="24" height="56" rx="12" strokeOpacity=".3" /><circle cx="155" cy="56" r="1.4" fill="#F5F3FA" /></g>);
    case 'frame':
      return (<g {...s}><path d="M118 22h14M118 22v14M182 22h-14M182 22v14M118 80h14M118 80v-14M182 80h-14M182 80v-14" /><circle cx="150" cy="51" r="10" /><circle cx="150" cy="51" r="2" fill="#F5F3FA" /></g>);
    case 'rain':
      return (<g {...s}>{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={112 + i * 11} y1={14 + (i % 3) * 8} x2={104 + i * 11} y2={48 + (i % 3) * 14} />)}</g>);
    case 'sun':
      return (<g {...s}><path d="M112 78a38 38 0 0 1 76 0" /><path d="M126 78a24 24 0 0 1 48 0" strokeOpacity=".35" /><line x1="100" x2="196" y1="78" y2="78" /></g>);
    case 'road':
      return (<g {...s}><path d="M150 14 108 92M150 14l42 78" /><path d="M150 26v8M150 44v10M150 66v14" strokeDasharray="0" strokeOpacity=".8" /></g>);
    case 'vinyl':
      return (<g {...s}>{[32, 25, 18, 11].map((r) => <circle key={r} cx="150" cy="50" r={r} strokeOpacity={r === 32 ? 0.6 : 0.3} />)}<circle cx="150" cy="50" r="3" fill="#F5F3FA" /></g>);
    case 'wave':
      return (<g {...s}>{[0, 1, 2, 3].map((i) => <path key={i} d={`M104 ${34 + i * 12}c12-14 24-14 36 0s24 14 36 0 12-8 20-8`} strokeOpacity={0.6 - i * 0.12} />)}</g>);
    case 'bars':
      return (<g fill="#F5F3FA" fillOpacity=".5">{[22, 44, 30, 58, 36, 50, 18, 40].map((h, i) => <rect key={i} x={112 + i * 10} y={82 - h} width="3" height={h} rx="1.5" />)}</g>);
    default:
      return (<g {...s}>{[12, 20, 28, 36].map((r) => <circle key={r} cx="150" cy="50" r={r} />)}</g>);
  }
}

export function RoomCover({ room, className = '', children }: { room: Pick<Room, 'c1' | 'c2' | 'motif' | 'name'>; className?: string; children?: ReactNode }) {
  return (
    <div className={cx('grain relative overflow-hidden', className)} style={{ background: `radial-gradient(120% 120% at 85% 0%, ${room.c1} 0%, ${room.c1}00 55%), radial-gradient(90% 90% at 0% 100%, ${room.c2} 0%, ${room.c2}00 70%), linear-gradient(160deg, ${room.c2}, #0B0B10)` }}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="xMaxYMid slice" className="!absolute inset-0 h-full w-full" aria-hidden>
        <Motif kind={room.motif} />
      </svg>
      <div className="!absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
      {children}
    </div>
  );
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link to={`/rooms/${room.slug}`} className="group block w-72 shrink-0 snap-start sm:w-auto">
      <RoomCover room={room} className="aspect-[5/4] rounded-3xl transition duration-500 group-hover:-translate-y-1">
        <div className="flex h-full flex-col justify-end p-5">
          <div className="text-xl font-extrabold leading-tight tracking-[0.04em]">{room.name}</div>
          <div className="mt-1 font-serif text-lg italic text-fg/75">{room.tagline}</div>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-label text-fg/70">
            <span>{plural(room.memberCount, 'member')}</span>
            {room.joined && <span className="rounded-full bg-fg/15 px-2 py-0.5 text-fg">Joined</span>}
          </div>
        </div>
      </RoomCover>
    </Link>
  );
}

// ── Playlists ───────────────────────────────────────────────────────────────
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const cover = playlist.cover.slice(0, 4);
  return (
    <Link to={`/playlist/${playlist.id}`} className="group block w-44 shrink-0 snap-start sm:w-48">
      <div className="grid aspect-square grid-cols-2 gap-px overflow-hidden rounded-2xl bg-raised transition duration-500 group-hover:-translate-y-1">
        {cover.map((s) => <Artwork key={s.id} song={s} rounded="rounded-none" className="h-full w-full" />)}
      </div>
      <div className="mt-3 truncate font-serif text-xl italic">{playlist.title}</div>
      <div className="truncate text-[13px] text-mute">
        {plural(playlist.songCount, 'song')} · {playlist.source === 'curated' ? 'AFTRHRS' : playlist.source === 'ai' ? 'From Mood AI' : `@${playlist.owner}`}
      </div>
    </Link>
  );
}
