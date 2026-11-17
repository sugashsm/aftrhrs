import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Me, Song } from './types';

// ── Toasts ──────────────────────────────────────────────────────────────────
interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-8" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto animate-rise rounded-full border px-5 py-2.5 text-sm font-medium shadow-2xl shadow-black/60 ${t.tone === 'error' ? 'border-[#E5677C]/40 bg-[#2A1519] text-[#F6C1CA]' : 'border-line bg-raised text-fg'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────
interface AuthValue {
  user: Me | null;
  ready: boolean;
  setUser: (u: Me | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const AuthCtx = createContext<AuthValue>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: Me | null }>('/auth/me');
      setUser(r.user);
    } catch {
      /* keep whatever we had; the UI shows its own error states */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('aftrhrs:unauthorized', onUnauthorized);
    return () => window.removeEventListener('aftrhrs:unauthorized', onUnauthorized);
  }, [refresh]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('aftrhrs:conversation');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, setUser, refresh, logout }), [user, ready, refresh, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ── Preview player ──────────────────────────────────────────────────────────
// Plays 30-second preview clips when the metadata service has one. Never full tracks.
interface PlayerValue {
  current: Song | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'none';
  progress: number;
  toggle: (song: Song) => void;
  close: () => void;
}
const PlayerCtx = createContext<PlayerValue>(null as any);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Song | null>(null);
  const [status, setStatus] = useState<PlayerValue['status']>('idle');
  const [progress, setProgress] = useState(0);
  const token = useRef(0);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audio.current = a;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnd = () => {
      setStatus('paused');
      setProgress(0);
    };
    const onPause = () => setStatus((s) => (s === 'playing' ? 'paused' : s));
    const onPlay = () => setStatus('playing');
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('pause', onPause);
    a.addEventListener('playing', onPlay);
    return () => {
      a.pause();
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('playing', onPlay);
    };
  }, []);

  const toggle = useCallback(
    async (song: Song) => {
      const a = audio.current!;
      if (current?.id === song.id && status !== 'none' && status !== 'idle') {
        if (a.paused) a.play().catch(() => setStatus('paused'));
        else a.pause();
        return;
      }
      const mine = ++token.current;
      a.pause();
      setCurrent(song);
      setProgress(0);
      setStatus('loading');
      let url = song.previewUrl;
      if (!url) {
        try {
          const r = await api<{ previewUrl: string | null; artworkUrl: string | null }>(`/songs/${song.id}/preview`);
          url = r.previewUrl;
          if (mine === token.current && r.artworkUrl) setCurrent({ ...song, artworkUrl: r.artworkUrl, previewUrl: r.previewUrl });
        } catch {
          url = null;
        }
      }
      if (mine !== token.current) return;
      if (!url) return setStatus('none');
      a.src = url;
      a.play().catch(() => setStatus('none'));
    },
    [current, status],
  );

  const close = useCallback(() => {
    token.current++;
    audio.current?.pause();
    setCurrent(null);
    setStatus('idle');
  }, []);

  const value = useMemo(() => ({ current, status, progress, toggle, close }), [current, status, progress, toggle, close]);
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
