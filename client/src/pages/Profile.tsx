import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Lock, MoreHorizontal, Settings } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth, useToast } from '../lib/store';
import type { Drop, Me, MiniUser, Mood, Playlist, Profile, Song } from '../lib/types';
import { cx, moodColors, plural } from '../lib/util';
import { DropCard } from '../components/DropCard';
import { Avatar, DemoTag, Empty, ErrorState, FollowButton, Loading, Modal, MoodChip, PlaylistCard, RoomCard, SongRow, Spinner, UserRow } from '../components/ui';
import { useFeed } from './Home';

function PeopleModal({ username, kind, onClose }: { username: string; kind: 'followers' | 'following' | null; onClose: () => void }) {
  const { data } = useLoad<{ users: MiniUser[] }>(kind ? `/users/${username}/${kind}` : null, [kind]);
  return (
    <Modal open={!!kind} onClose={onClose} title={kind === 'followers' ? 'Followers' : 'Following'}>
      {!data ? <Spinner className="mx-auto my-6" /> : data.users.length ? <div className="space-y-4" onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>{data.users.map((u) => <UserRow key={u.id} user={u} />)}</div> : <p className="text-sm text-mute">{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>}
    </Modal>
  );
}

function MoodPicker({ open, onClose, current }: { open: boolean; onClose: (changed?: boolean) => void; current: string | null }) {
  const { data } = useLoad<{ moods: Mood[] }>(open ? '/moods' : null, [open]);
  const { setUser } = useAuth();
  const toast = useToast();
  const choose = async (name: string | null) => {
    try {
      const r = await api<{ user: Me }>('/me', { method: 'PUT', body: { currentMood: name } });
      setUser(r.user);
      onClose(true);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <Modal open={open} onClose={() => onClose()} title="How are you, really?" wide>
      <div className="flex flex-wrap gap-2.5">
        {(data?.moods || []).map((m) => (
          <button key={m.name} className={cx('chip !py-2.5', current === m.name && 'chip-on')} onClick={() => choose(m.name)}>
            <span className="h-2 w-2 rounded-full" style={{ background: m.c1 }} /> {m.name}
          </button>
        ))}
      </div>
      {current && <button className="mt-6 text-sm text-mute underline-offset-4 hover:text-fg hover:underline" onClick={() => choose(null)}>Clear my current mood</button>}
    </Modal>
  );
}

function Drops({ username }: { username: string }) {
  const f = useFeed(`/users/${username}/drops`);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {f.items.map((d) => <DropCard key={d.id} drop={d} onRemoved={f.remove} />)}
      {f.loading && <div className="flex justify-center py-6"><Spinner /></div>}
      {f.error && <ErrorState message={f.error} retry={f.retry} />}
      <div ref={f.sentinel} />
    </div>
  );
}

const TABS = ['Mood Drops', 'Saved songs', 'Saved posts', 'Playlists', 'Sound Rooms'] as const;
type Tab = (typeof TABS)[number];

export function ProfilePage() {
  const { username = '' } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad<{ profile: Profile }>(`/users/${username}`, [me?.currentMood, me?.displayName, me?.avatar]);
  const [tab, setTab] = useState<Tab>('Mood Drops');
  const [people, setPeople] = useState<'followers' | 'following' | null>(null);
  const [menu, setMenu] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const p = data?.profile;

  useEffect(() => setTab('Mood Drops'), [username]);
  const songs = useLoad<{ songs: Song[]; hidden: boolean }>(p && tab === 'Saved songs' ? `/users/${username}/saved-songs` : null, [tab, p?.id]);
  const posts = useLoad<{ items: Drop[] }>(p?.isMe && tab === 'Saved posts' ? `/users/${username}/saved-posts` : null, [tab, p?.id]);
  const lists = useLoad<{ playlists: Playlist[] }>(p && tab === 'Playlists' ? `/users/${username}/playlists` : null, [tab, p?.id]);

  if (loading && !p) return <Loading />;
  if (error && !p) return <ErrorState message={error.message} retry={error.status === 404 ? undefined : reload} />;
  if (!p) return null;

  const block = async () => {
    setMenu(false);
    try {
      await api(`/users/${p.id}/block`, { method: p.blockedByMe ? 'DELETE' : 'POST' });
      toast(p.blockedByMe ? `Unblocked @${p.username}` : `Blocked @${p.username}`);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const som = p.soundOfMe;
  const tabs = TABS.filter((t) => (t === 'Saved posts' ? p.isMe : t === 'Saved songs' ? p.showSaved : true));
  const [c1, c2] = moodColors(p.currentMood?.name || som?.moods[0] || 'Dreamy');

  return (
    <div>
      {/* Header */}
      <div className="grain relative rounded-[2rem]" style={{ background: `radial-gradient(90% 140% at 100% 0%, ${c1}66 0%, transparent 60%), radial-gradient(80% 120% at 0% 100%, ${c2}aa 0%, transparent 65%), #15151D` }}>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          <Avatar user={p} size={112} className="ring-4 ring-ink/40" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="display text-5xl sm:text-6xl">{p.displayName}</h1>
              {p.isDemo && <DemoTag />}
              {p.isGuest && <span className="rounded border border-line px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.14em] text-mute">guest</span>}
              {p.isPrivate && <Lock size={15} className="text-mute" aria-label="Private account" />}
            </div>
            <div className="mt-1 text-sm text-fg/70">@{p.username}{p.followsMe && !p.isMe && <span className="ml-2 rounded-full bg-ink/40 px-2 py-0.5 text-[11px] font-semibold">Follows you</span>}</div>
            {p.bio && <p className="mt-3 max-w-xl font-serif text-xl italic leading-snug text-fg/85">{p.bio}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <button className="hover:underline" onClick={() => p.canSee && setPeople('followers')}><b className="tabular-nums">{p.followers}</b> <span className="text-fg/65">followers</span></button>
              <button className="hover:underline" onClick={() => p.canSee && setPeople('following')}><b className="tabular-nums">{p.followingCount}</b> <span className="text-fg/65">following</span></button>
              <span><b className="tabular-nums">{p.dropCount}</b> <span className="text-fg/65">Mood Drops</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {p.isMe ? (
              <Link to="/settings" className="btn-ghost bg-ink/40"><Settings size={15} /> Edit profile</Link>
            ) : (
              <>
                {!p.blockedByMe && <FollowButton user={p} onChange={reload} className="!px-6 !py-2.5 !text-sm" />}
                <div className="relative">
                  <button className="icon-btn bg-ink/40" aria-label="More options" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><MoreHorizontal size={18} /></button>
                  {menu && (
                    <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-2xl border border-line bg-raised py-1.5 shadow-2xl shadow-black/60">
                      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#F2A0AE] hover:bg-white/5" onClick={block}><Ban size={15} /> {p.blockedByMe ? 'Unblock' : 'Block'} @{p.username}</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-6 py-4 sm:px-10">
          <span className="eyebrow !text-fg/60">Current mood</span>
          {p.currentMood ? <MoodChip name={p.currentMood.name} c1={p.currentMood.c1} /> : <span className="text-sm text-fg/60">{p.canSee ? 'Not set' : 'Private'}</span>}
          {p.isMe && <button className="chip !border-white/15 !py-1 !text-xs" onClick={() => setMoodOpen(true)}>Change</button>}
        </div>
      </div>

      {p.blockedByMe ? (
        <div className="mt-8"><Empty icon={<Ban size={22} />} title="You blocked this listener." body="You will not see each other's Mood Drops or comments." action={<button className="btn-ghost" onClick={block}>Unblock</button>} /></div>
      ) : !p.canSee ? (
        <div className="mt-8"><Empty icon={<Lock size={22} />} title="This account is private." body="Follow to see their Mood Drops, saved songs and musical identity." /></div>
      ) : (
        <>
          {/* THE SOUND OF ME */}
          {som && (
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]" aria-label="The sound of me">
              <div>
                <div className="eyebrow mb-4 !tracking-[0.3em]">The sound of {p.isMe ? 'me' : p.displayName.split(' ')[0]}</div>
                <h2 className="display text-6xl italic sm:text-7xl" style={{ color: c1 }}>{som.archetype}</h2>
                <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-fg/80">{som.summary}</p>
                {som.ready && <p className="mt-4 text-xs text-mute">Written by a rule-based engine from {p.isMe ? 'your' : 'their'} preferences, saves, likes and Mood Drops. It changes as {p.isMe ? 'you do' : 'they do'}.</p>}
                {!som.ready && p.isMe && <Link to="/discover" className="btn-primary mt-6">Start listening</Link>}
              </div>
              {som.ready && (
                <div className="panel space-y-6 p-6">
                  <div>
                    <div className="label">Mood signature</div>
                    <div className="space-y-3">
                      {som.traits.map((t) => (
                        <div key={t.label}>
                          <div className="mb-1.5 flex justify-between text-[13px]"><span className="font-semibold">{t.label}</span><span className="tabular-nums text-mute">{t.value}%</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${Math.max(6, t.value)}%`, background: `linear-gradient(90deg, ${moodColors(t.label)[0]}, ${moodColors(t.label)[1]})` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-sm">
                    <div><div className="label">Energy</div><div className="flex gap-1" aria-label={`Average energy ${som.energy} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cx('h-5 w-1.5 rounded-full', i <= Math.round(som.energy) ? 'bg-lav' : 'bg-raised')} />)}</div></div>
                    <div><div className="label">Languages</div><div className="text-fg/85">{som.languages.join(', ') || 'Open'}</div></div>
                  </div>
                  {!!p.favouriteArtists.length && <div><div className="label">Favourite artists</div><div className="flex flex-wrap gap-2">{p.favouriteArtists.map((a) => <Link key={a} to={`/search?q=${encodeURIComponent(a)}`} className="chip !py-1 !text-xs">{a}</Link>)}</div></div>}
                  {!!p.favouriteGenres.length && <div><div className="label">Favourite genres</div><div className="flex flex-wrap gap-2">{p.favouriteGenres.map((g) => <span key={g} className="rounded-full bg-raised px-3 py-1 text-xs font-medium text-fg/80">{g}</span>)}</div></div>}
                </div>
              )}
            </section>
          )}

          <div className="mt-12 flex gap-6 overflow-x-auto border-b border-line" role="tablist">
            {tabs.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('relative whitespace-nowrap py-4 text-sm font-semibold transition', tab === t ? 'text-fg' : 'text-mute hover:text-fg')}>
                {t}
                {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-lav" />}
              </button>
            ))}
          </div>

          <div className="mt-7" role="tabpanel">
            {tab === 'Mood Drops' && (p.dropCount ? <Drops username={p.username} key={p.username} /> : <Empty title={p.isMe ? 'Your first drop is waiting.' : 'Nothing posted yet.'} body={p.isMe ? 'Pick the song that sounds like today and say one true thing about it.' : `${p.displayName} is still listening.`} action={p.isMe && <Link to="/create" className="btn-primary">Create a Mood Drop</Link>} />)}
            {tab === 'Saved songs' && (!songs.data ? <Spinner className="mx-auto" /> : songs.data.songs.length ? <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">{songs.data.songs.map((s) => <SongRow key={s.id} song={s} onSaveChange={() => p.isMe && songs.reload()} />)}</div> : <Empty title="No saved songs yet." body={p.isMe ? 'Tap the bookmark on any song and it will wait for you here.' : 'Nothing saved, or nothing shared.'} action={p.isMe && <Link to="/discover" className="btn-primary">Discover music</Link>} />)}
            {tab === 'Saved posts' && (!posts.data ? <Spinner className="mx-auto" /> : posts.data.items.length ? <div className="mx-auto max-w-2xl space-y-6">{posts.data.items.map((d) => <DropCard key={d.id} drop={d} onRemoved={posts.reload} />)}</div> : <Empty title="Nothing saved yet." body="Save the Mood Drops that say it better than you could. Only you can see this tab." />)}
            {tab === 'Playlists' && (!lists.data ? <Spinner className="mx-auto" /> : lists.data.playlists.length ? <div className="flex flex-wrap gap-6">{lists.data.playlists.map((pl) => <PlaylistCard key={pl.id} playlist={pl} />)}</div> : <Empty title="No playlists yet." body={p.isMe ? 'Ask Mood AI to turn a feeling into a playlist, then save it.' : 'Nothing here yet.'} action={p.isMe && <Link to="/ai" className="btn-primary">Open Mood AI</Link>} />)}
            {tab === 'Sound Rooms' && (p.rooms.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{p.rooms.map((r) => <RoomCard key={r.id} room={r} />)}</div> : <Empty title="Not in any rooms yet." body="Sound Rooms are small communities built around a feeling." action={p.isMe && <Link to="/rooms" className="btn-primary">Browse rooms</Link>} />)}
          </div>
        </>
      )}

      <PeopleModal username={p.username} kind={people} onClose={() => setPeople(null)} />
      <MoodPicker open={moodOpen} onClose={() => setMoodOpen(false)} current={me?.currentMood || null} />
      {!p.isMe && p.canSee && <p className="sr-only">{plural(p.dropCount, 'Mood Drop')}</p>}
    </div>
  );
}
