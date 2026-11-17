import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, PenLine, Send, Trash2 } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useToast } from '../lib/store';
import type { Drop, MiniUser, Room, Song } from '../lib/types';
import { cx, plural, timeAgo } from '../lib/util';
import { DropCard } from '../components/DropCard';
import { PageHeader } from '../components/Shell';
import { Avatar, DemoTag, Empty, ErrorState, Loading, MoodChip, RoomCard, RoomCover, SongRow, Spinner, UserRow } from '../components/ui';

export function Rooms() {
  const { data, error, loading, reload } = useLoad<{ rooms: Room[] }>('/rooms');
  if (loading && !data) return <Loading label="Opening the doors" />;
  if (error && !data) return <ErrorState message={error.message} retry={reload} />;
  const rooms = data?.rooms || [];
  const mine = rooms.filter((r) => r.joined);
  return (
    <div>
      <PageHeader eyebrow="Sound Rooms" title="Find your room." sub="Small communities built around a feeling, an hour, or a corner of music. Join a few. Leave whenever." />
      {!!mine.length && (
        <>
          <div className="eyebrow mb-4">Your rooms</div>
          <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{mine.map((r) => <RoomCard key={r.id} room={r} />)}</div>
          <div className="eyebrow mb-4">All rooms</div>
        </>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{rooms.filter((r) => !r.joined).map((r) => <RoomCard key={r.id} room={r} />)}</div>
      {!rooms.filter((r) => !r.joined).length && <p className="text-mute">You are in every room. Impressive.</p>}
    </div>
  );
}

interface Discussion {
  id: number;
  body: string;
  createdAt: string;
  author: MiniUser;
  mine: boolean;
}
interface RoomData {
  room: Room;
  songs: Song[];
  drops: Drop[];
  discussions: Discussion[];
  members: MiniUser[];
}

const TABS = ['Mood Drops', 'Featured songs', 'Discussion', 'Members'] as const;

export function RoomPage() {
  const { slug } = useParams();
  const { data, setData, error, loading, reload } = useLoad<RoomData>(`/rooms/${slug}`);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Mood Drops');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  if (loading && !data) return <Loading label="Finding the room" />;
  if (error && !data) return <ErrorState message={error.message} retry={error.status === 404 ? undefined : reload} />;
  if (!data) return null;
  const { room } = data;

  const toggle = async () => {
    setBusy(true);
    try {
      await api(`/rooms/${room.slug}/join`, { method: room.joined ? 'DELETE' : 'POST' });
      toast(room.joined ? `You left ${room.name}` : `Welcome to ${room.name}`);
      await reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const post = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await api<{ discussions: Discussion[] }>(`/rooms/${room.slug}/discussions`, { body: { body: text } });
      setData({ ...data, discussions: r.discussions });
      setText('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };
  const removeMessage = async (id: number) => {
    try {
      const r = await api<{ discussions: Discussion[] }>(`/discussions/${id}`, { method: 'DELETE' });
      setData({ ...data, discussions: r.discussions });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const counts: Record<string, number> = { 'Mood Drops': data.drops.length, 'Featured songs': data.songs.length, Discussion: data.discussions.length, Members: room.memberCount };
  return (
    <div>
      <Link to="/rooms" className="mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> All rooms</Link>
      <RoomCover room={room} className="rounded-[2rem]">
        <div className="flex min-h-[19rem] flex-col justify-end p-6 sm:min-h-[22rem] sm:p-10">
          <div className="flex flex-wrap gap-4">{room.moods.map((m) => <MoodChip key={m} name={m} small />)}</div>
          <h1 className="mt-4 text-4xl font-extrabold leading-none tracking-[0.03em] sm:text-6xl">{room.name}</h1>
          <p className="mt-2 font-serif text-2xl italic text-fg/80 sm:text-3xl">{room.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className={room.joined ? 'btn-ghost bg-ink/40' : 'btn-light'} disabled={busy} onClick={toggle}>{busy ? <Spinner /> : room.joined ? 'Leave room' : 'Join room'}</button>
            {room.joined && <Link to={`/create?room=${room.slug}`} className="btn-primary"><PenLine size={15} /> Post a Mood Drop here</Link>}
            <span className="text-[13px] font-semibold text-fg/70">{plural(room.memberCount, 'member')} · {plural(room.dropCount, 'Mood Drop')}</span>
          </div>
        </div>
      </RoomCover>
      <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-mute">{room.description}</p>

      <div className="mt-8 flex gap-6 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('relative whitespace-nowrap py-4 text-sm font-semibold transition', tab === t ? 'text-fg' : 'text-mute hover:text-fg')}>
            {t} <span className="ml-1 text-xs tabular-nums text-mute">{counts[t]}</span>
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-lav" />}
          </button>
        ))}
      </div>

      <div className="mt-7" role="tabpanel">
        {tab === 'Mood Drops' && (
          data.drops.length ? <div className="mx-auto max-w-2xl space-y-6">{data.drops.map((d) => <DropCard key={d.id} drop={d} onRemoved={(id) => setData({ ...data, drops: data.drops.filter((x) => x.id !== id) })} />)}</div>
            : <Empty title="The room is listening." body="Nobody has posted here yet. Go first." action={room.joined ? <Link to={`/create?room=${room.slug}`} className="btn-primary">Post a Mood Drop</Link> : <button className="btn-primary" onClick={toggle}>Join to post</button>} />
        )}
        {tab === 'Featured songs' && <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">{data.songs.map((s, i) => <SongRow key={s.id} song={s} index={i} />)}</div>}
        {tab === 'Discussion' && (
          <div className="mx-auto max-w-2xl">
            {room.joined ? (
              <form onSubmit={post} className="mb-7 flex gap-2">
                <input className="field !rounded-full" placeholder={`Say something to ${room.name}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Write a message" />
                <button className="btn-primary !h-12 !w-12 shrink-0 !p-0" disabled={!text.trim() || sending} aria-label="Post message"><Send size={16} /></button>
              </form>
            ) : (
              <div className="panel mb-7 flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-mute">Join the room to take part in the conversation. <button className="btn-light btn-sm" onClick={toggle} disabled={busy}>Join room</button></div>
            )}
            {data.discussions.length ? (
              <ul className="space-y-5">
                {data.discussions.map((d) => (
                  <li key={d.id} className="flex gap-3">
                    <Link to={`/u/${d.author.username}`}><Avatar user={d.author} size={38} /></Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Link to={`/u/${d.author.username}`} className="font-semibold hover:underline">{d.author.displayName}</Link>
                        {d.author.isDemo && <DemoTag />}
                        <span className="text-xs text-mute">{timeAgo(d.createdAt)}</span>
                      </div>
                      <p className="mt-1 break-words text-[15px] leading-relaxed text-fg/85">{d.body}</p>
                    </div>
                    {d.mine && <button className="icon-btn" onClick={() => removeMessage(d.id)} aria-label="Delete message"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
            ) : <Empty icon={<MessageSquare size={22} />} title="No one has spoken yet." body="Ask the room a question. Someone will have a song for it." />}
          </div>
        )}
        {tab === 'Members' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.members.map((m) => <div key={m.id} className="panel p-4"><UserRow user={m} /></div>)}</div>}
      </div>
    </div>
  );
}
