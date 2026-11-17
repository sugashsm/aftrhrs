import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Heart, MessageCircle, Search, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth, useToast } from '../lib/store';
import type { Drop, MiniUser, Notification, Playlist, Room, Song } from '../lib/types';
import { bgStyle, plural, timeAgo } from '../lib/util';
import { DropCard } from '../components/DropCard';
import { PageHeader } from '../components/Shell';
import { Artwork, Avatar, Empty, ErrorState, Loading, MoodChip, RoomCard, SongRow, UserRow } from '../components/ui';

// ── Single Mood Drop ────────────────────────────────────────────────────────
export function DropPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading } = useLoad<{ drop: Drop }>(`/drops/${id}`);
  const more = useLoad<{ items: Drop[] }>(data ? `/drops?feed=latest&mood=${encodeURIComponent(data.drop.mood.name)}` : null, [data?.drop.id]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <Empty title="This Mood Drop is gone." body="It may have been deleted, or its author's account is private." action={<Link to="/home" className="btn-primary">Back to the feed</Link>} />;
  const others = (more.data?.items || []).filter((d) => d.id !== data.drop.id).slice(0, 3);
  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/home'))} className="mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> Back</button>
      <DropCard drop={data.drop} expanded onRemoved={() => nav('/home')} />
      {!!others.length && (
        <div className="mt-12">
          <div className="eyebrow mb-4">More {data.drop.mood.name.toLowerCase()}</div>
          <div className="space-y-6">{others.map((d) => <DropCard key={d.id} drop={d} />)}</div>
        </div>
      )}
    </div>
  );
}

// ── Notifications ───────────────────────────────────────────────────────────
const ICON = { like: Heart, comment: MessageCircle, follow: UserPlus, welcome: Sparkles } as const;

export function NotificationsPage() {
  const { data, setData, error, loading, reload } = useLoad<{ notifications: Notification[] }>('/notifications');
  const { refresh } = useAuth();
  const toast = useToast();

  // Opening the page marks everything as read (the list keeps its "new" markers until you leave).
  useEffect(() => {
    if (data?.notifications.some((n) => !n.read)) api('/notifications/read', { method: 'POST' }).then(refresh).catch(() => {});
  }, [data, refresh]);

  const clear = async () => {
    try {
      await api('/notifications', { method: 'DELETE' });
      setData({ notifications: [] });
      refresh();
      toast('Notifications cleared');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error.message} retry={reload} />;
  const list = data?.notifications || [];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Notifications" title="While you were listening." action={!!list.length && <button className="btn-ghost btn-sm" onClick={clear}><Trash2 size={14} /> Clear all</button>} />
      {!list.length ? (
        <Empty icon={<Bell size={22} />} title="All quiet." body="When someone likes, comments on or follows your sound, it will show up here." action={<Link to="/create" className="btn-primary">Create a Mood Drop</Link>} />
      ) : (
        <ul className="divide-y divide-line">
          {list.map((n) => {
            const Icon = ICON[n.type] || Bell;
            const to = n.type === 'follow' && n.actor ? `/u/${n.actor.username}` : n.dropId ? `/drop/${n.dropId}` : n.type === 'welcome' ? '/ai' : '/home';
            return (
              <li key={n.id}>
                <Link to={to} className="flex items-start gap-4 py-4 transition hover:bg-white/[0.02]">
                  <span className="relative shrink-0">
                    {n.actor ? <Avatar user={n.actor} size={44} /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet/15 text-lav"><Sparkles size={18} /></span>}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-raised text-lav ring-2 ring-ink"><Icon size={11} /></span>
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    {n.type === 'welcome' ? <span className="text-fg/90">{n.body}</span> : (
                      <>
                        <b className="font-semibold">{n.actor?.displayName || 'Someone'}</b>{' '}
                        <span className="text-fg/75">
                          {n.type === 'like' && <>liked your Mood Drop{n.songTitle ? <> for <i>{n.songTitle}</i></> : ''}.</>}
                          {n.type === 'comment' && <>commented{n.songTitle ? <> on <i>{n.songTitle}</i></> : ''}: “{n.body}”</>}
                          {n.type === 'follow' && <>started following you.</>}
                        </span>
                        {n.actor?.isDemo && <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">demo activity</span>}
                      </>
                    )}
                    <span className="mt-1 block text-xs text-mute">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Playlist ────────────────────────────────────────────────────────────────
export function PlaylistPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, error, loading } = useLoad<{ playlist: Playlist }>(`/playlists/${id}`);
  const [confirm, setConfirm] = useState(false);
  if (loading && !data) return <Loading />;
  if (error || !data) return <Empty title="That playlist is not here." body="It may have been deleted by its owner." action={<Link to="/discover" className="btn-primary">Back to Discover</Link>} />;
  const p = data.playlist;
  const remove = async () => {
    try {
      await api(`/playlists/${p.id}`, { method: 'DELETE' });
      toast('Playlist deleted');
      nav(-1);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div>
      <button onClick={() => nav(-1)} className="mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> Back</button>
      <div className="grain overflow-hidden rounded-[2rem]" style={bgStyle(p.source === 'ai' ? 'haze' : 'dusk')}>
        <div className="flex flex-col gap-7 p-6 sm:flex-row sm:items-end sm:p-10">
          <div className="grid h-44 w-44 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-2xl shadow-2xl shadow-black/60">
            {p.cover.slice(0, 4).map((s) => <Artwork key={s.id} song={s} rounded="rounded-none" className="h-full w-full" />)}
          </div>
          <div className="min-w-0">
            <div className="eyebrow !text-fg/70">{p.source === 'curated' ? 'Curated by AFTRHRS' : p.source === 'ai' ? `Made with Mood AI${p.owner ? ` · @${p.owner}` : ''}` : `Playlist · @${p.owner}`}</div>
            <h1 className="display mt-3 text-6xl italic sm:text-7xl">{p.title}</h1>
            <p className="mt-3 max-w-lg text-[15px] text-fg/75">{p.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-fg/70">
              {p.mood && <MoodChip name={p.mood} small />}
              <span>{plural(p.songs?.length || 0, 'song')}</span>
              {p.mine && (confirm ? <span className="flex items-center gap-2">Delete this playlist? <button className="font-semibold text-[#F2A0AE] hover:underline" onClick={remove}>Yes, delete</button><button className="font-semibold hover:underline" onClick={() => setConfirm(false)}>Keep</button></span> : <button className="inline-flex items-center gap-1.5 font-semibold hover:text-fg" onClick={() => setConfirm(true)}><Trash2 size={13} /> Delete</button>)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 max-w-3xl">{(p.songs || []).map((x, i) => <SongRow key={x.song.id} song={x.song} index={i} reason={x.reason || undefined} />)}</div>
      <p className="mt-6 text-xs text-mute">Songs open in your chosen streaming service. Previews are 30-second clips where available.</p>
    </div>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  const { data, loading, error, reload } = useLoad<{ songs: Song[]; users: MiniUser[]; rooms: Room[] }>(q ? `/search?q=${encodeURIComponent(q)}` : null, [q]);
  const empty = data && !data.songs.length && !data.users.length && !data.rooms.length;
  return (
    <div>
      <PageHeader eyebrow="Search" title={q ? <>Results for <em className="text-lav">{q}</em></> : 'Look for something.'} />
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) setParams({ q: text.trim() }); }} role="search" className="relative mb-8 max-w-xl sm:hidden">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input autoFocus className="field !rounded-full !pl-11" placeholder="Songs, people, rooms" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search" />
      </form>
      {!q && <Empty icon={<Search size={22} />} title="Songs, people, rooms." body="Search by song title, artist, a listener's name or a Sound Room." />}
      {q && loading && !data && <Loading label="Searching" />}
      {error && <ErrorState message={error.message} retry={reload} />}
      {empty && <Empty title="Nothing by that name." body="The sample catalogue is small. Try an artist like A.R. Rahman or Frank Ocean, or a listener like mira." />}
      {data && !empty && (
        <div className="space-y-12">
          {!!data.users.length && <section><div className="eyebrow mb-4">People</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.users.map((u) => <div key={u.id} className="panel p-4"><UserRow user={u} /></div>)}</div></section>}
          {!!data.songs.length && <section><div className="eyebrow mb-4">Songs</div><div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">{data.songs.map((s) => <SongRow key={s.id} song={s} />)}</div></section>}
          {!!data.rooms.length && <section><div className="eyebrow mb-4">Sound Rooms</div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.rooms.map((r) => <RoomCard key={r.id} room={r} />)}</div></section>}
        </div>
      )}
    </div>
  );
}
