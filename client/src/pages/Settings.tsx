import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ExternalLink } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useAuth, useToast } from '../lib/store';
import type { Me, MiniUser, Preferences } from '../lib/types';
import { cx, fileToAvatar } from '../lib/util';
import { PageHeader } from '../components/Shell';
import { Avatar, Modal, Spinner } from '../components/ui';
import { AddCustom, ChipGroup } from './Onboarding';
import { DISCOVERY_GOALS, GENRES, LANGUAGES, MOOD_NAMES } from '../../../shared/constants';

const SECTIONS = ['Profile', 'Music preferences', 'Notifications', 'Privacy', 'Blocked users', 'Connected services', 'Account'] as const;
type SectionKey = (typeof SECTIONS)[number];

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="panel animate-rise p-6 sm:p-8">
      <h2 className="display text-4xl">{title}</h2>
      {sub && <p className="mt-2 text-sm text-mute">{sub}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-4">
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-relaxed text-mute">{hint}</span>}
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-7 w-12 rounded-full bg-raised transition peer-checked:bg-violet peer-focus-visible:ring-2 peer-focus-visible:ring-lav" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-fg transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [section, setSection] = useState<SectionKey>('Profile');
  const me = user!;

  const save = async (path: string, body: unknown, done = 'Saved') => {
    try {
      const r = await api<{ user: Me }>(path, { method: 'PUT', body });
      setUser(r.user);
      toast(done);
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    }
  };

  // ── Profile ──
  const [profile, setProfile] = useState({ displayName: me.displayName, username: me.username, bio: me.bio });
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await save('/me', me.isGuest ? { displayName: profile.displayName, bio: profile.bio } : profile, 'Profile updated');
    setBusy(false);
  };
  const pickAvatar = async (f?: File) => {
    if (!f) return;
    try {
      await save('/me', { avatar: await fileToAvatar(f) }, 'Profile picture updated');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    if (file.current) file.current.value = '';
  };

  // ── Preferences ──
  const [prefs, setPrefs] = useState<Preferences>(me.preferences);
  const setPref = (k: keyof Preferences) => (v: string[]) => setPrefs((p) => ({ ...p, [k]: v }));

  // ── Blocked ──
  const blocked = useLoad<{ users: MiniUser[] }>(section === 'Blocked users' ? '/me/blocked' : null, [section]);
  const unblock = async (u: MiniUser) => {
    try {
      await api(`/users/${u.id}/block`, { method: 'DELETE' });
      blocked.setData((d) => d && { users: d.users.filter((x) => x.id !== u.id) });
      toast(`Unblocked @${u.username}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  // ── Account ──
  const [pw, setPw] = useState({ current: '', next: '' });
  const [del, setDel] = useState(false);
  const [delForm, setDelForm] = useState({ confirm: '', password: '' });
  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/me/password', { method: 'PUT', body: pw });
      setPw({ current: '', next: '' });
      toast('Password changed');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/me', { method: 'DELETE', body: delForm });
      sessionStorage.clear();
      setUser(null);
      toast('Your account and everything in it has been deleted');
      nav('/');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  useEffect(() => setProfile({ displayName: me.displayName, username: me.username, bio: me.bio }), [me.displayName, me.username, me.bio]);

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Tune it your way." />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="hscroll !gap-2 lg:!mx-0 lg:flex-col lg:!gap-1 lg:overflow-visible lg:!px-0" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)} aria-current={section === s ? 'page' : undefined} className={cx('whitespace-nowrap rounded-full px-4 py-2.5 text-left text-sm font-semibold transition lg:rounded-2xl', section === s ? 'bg-card text-fg' : 'text-mute hover:bg-white/[0.04] hover:text-fg')}>{s}</button>
          ))}
        </nav>

        <div className="min-w-0 max-w-2xl">
          {section === 'Profile' && (
            <Card title="Profile" sub="How you appear to other listeners.">
              <div className="mb-7 flex items-center gap-5">
                <Avatar user={me} size={88} />
                <div className="flex flex-wrap gap-2">
                  <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar-file" onChange={(e) => pickAvatar(e.target.files?.[0])} />
                  <label htmlFor="avatar-file" className="btn-quiet btn-sm cursor-pointer focus-within:ring-2 focus-within:ring-lav"><Camera size={14} /> Change picture</label>
                  {me.avatar && <button className="btn-ghost btn-sm" onClick={() => save('/me', { avatar: null }, 'Profile picture removed')}>Remove</button>}
                </div>
              </div>
              <form onSubmit={saveProfile} className="space-y-5">
                <div><label className="label" htmlFor="s-name">Display name</label><input id="s-name" className="field" value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} maxLength={40} required /></div>
                <div>
                  <label className="label" htmlFor="s-user">Username</label>
                  <input id="s-user" className="field disabled:opacity-50" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} maxLength={24} disabled={me.isGuest} autoCapitalize="none" />
                  {me.isGuest && <p className="mt-2 text-xs text-mute">Demo accounts keep their generated username.</p>}
                </div>
                <div>
                  <label className="label" htmlFor="s-bio">Bio</label>
                  <textarea id="s-bio" className="field min-h-[6rem] resize-y" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={240} placeholder="A line about how you listen." />
                  <div className="mt-1 text-right text-xs tabular-nums text-mute">{profile.bio.length}/240</div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="!text-ink" /> : 'Save profile'}</button>
                  <Link to={`/u/${me.username}`} className="btn-ghost">View profile</Link>
                </div>
              </form>
            </Card>
          )}

          {section === 'Music preferences' && (
            <Card title="Music preferences" sub="These shape your feed, Discover and what Mood AI reaches for first.">
              <div className="space-y-8">
                <div><div className="label">Languages</div><ChipGroup options={[...new Set([...LANGUAGES, ...prefs.languages])]} value={prefs.languages} onChange={setPref('languages')} /></div>
                <div><div className="label">Genres</div><ChipGroup options={[...new Set([...GENRES, ...prefs.genres])]} value={prefs.genres} onChange={setPref('genres')} /></div>
                <div>
                  <div className="label">Artists you love</div>
                  {prefs.artists.length ? <ChipGroup options={prefs.artists} value={prefs.artists} onChange={setPref('artists')} /> : <p className="text-sm text-mute">None yet.</p>}
                  <AddCustom placeholder="Add an artist" onAdd={(v) => setPref('artists')([...new Set([...prefs.artists, v])])} />
                </div>
                <div><div className="label">Moods that describe you</div><ChipGroup options={[...new Set([...MOOD_NAMES, ...prefs.moods])]} value={prefs.moods} onChange={setPref('moods')} dots /></div>
                <div><div className="label">What you want to discover</div><ChipGroup options={DISCOVERY_GOALS} value={prefs.discovery} onChange={setPref('discovery')} /></div>
                <button className="btn-primary" onClick={() => save('/me/preferences', prefs, 'Preferences updated')}>Save preferences</button>
              </div>
            </Card>
          )}

          {section === 'Notifications' && (
            <Card title="Notifications" sub="Choose what earns a place in your notifications.">
              <div className="divide-y divide-line">
                {([['likes', 'Likes', 'When someone likes one of your Mood Drops.'], ['comments', 'Comments', 'When someone replies to a Mood Drop.'], ['follows', 'New followers', 'When someone starts following you.']] as const).map(([k, label, hint]) => (
                  <Toggle key={k} label={label} hint={hint} checked={me.notifPrefs[k]} onChange={(v) => save('/me/settings', { notifPrefs: { ...me.notifPrefs, [k]: v } }, v ? `${label} on` : `${label} off`)} />
                ))}
              </div>
              <p className="mt-4 text-xs text-mute">Notifications appear inside AFTRHRS only. This build does not send email or push notifications.</p>
            </Card>
          )}

          {section === 'Privacy' && (
            <Card title="Privacy" sub="You decide who sees what.">
              <div className="divide-y divide-line">
                <Toggle label="Private account" hint="Only people who already follow you can see your Mood Drops, saved songs and musical identity." checked={me.isPrivate} onChange={(v) => save('/me/settings', { isPrivate: v }, v ? 'Your account is private' : 'Your account is public')} />
                <Toggle label="Show saved songs on my profile" hint="Saved posts are always private. This only controls the Saved songs tab." checked={me.showSaved} onChange={(v) => save('/me/settings', { showSaved: v }, v ? 'Saved songs are visible' : 'Saved songs are hidden')} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mute">Likes are counted but never ranked. Mood AI conversations are visible only to you and can be deleted from the Mood AI history.</p>
            </Card>
          )}

          {section === 'Blocked users' && (
            <Card title="Blocked users" sub="Blocked listeners cannot see your profile or Mood Drops, and you will not see theirs.">
              {!blocked.data ? <Spinner /> : blocked.data.users.length ? (
                <ul className="space-y-4">
                  {blocked.data.users.map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <Avatar user={u} size={42} />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{u.displayName}</div><div className="truncate text-[13px] text-mute">@{u.username}</div></div>
                      <button className="btn-ghost btn-sm" onClick={() => unblock(u)}>Unblock</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-mute">You have not blocked anyone. Good.</p>}
            </Card>
          )}

          {section === 'Connected services' && (
            <Card title="Connected music services" sub="AFTRHRS links out to streaming services. It never hosts or downloads music.">
              <div className="label">Open songs in</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Preferred music service">
                {([['spotify', 'Spotify'], ['youtube', 'YouTube'], ['apple', 'Apple Music']] as const).map(([k, label]) => (
                  <button key={k} role="radio" aria-checked={me.linkService === k} onClick={() => save('/me/settings', { linkService: k }, `Songs will open in ${label}`)} className={cx('rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition', me.linkService === k ? 'border-lav/60 bg-lav/10' : 'border-line hover:border-white/20')}>
                    {label}
                    <span className="mt-1 flex items-center gap-1 text-xs font-normal text-mute"><ExternalLink size={11} /> search link</span>
                  </button>
                ))}
              </div>
              <div className="mt-7 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
                  <div><div className="font-semibold">30-second previews and cover art</div><p className="mt-1 text-[13px] leading-relaxed text-mute">Provided through Apple’s public iTunes Search API when a confident match exists. No account needed.</p></div>
                  <span className="shrink-0 rounded-full bg-[#9AD1C3]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9AD1C3]">Active</span>
                </div>
                {['Spotify account', 'YouTube Music account'].map((s) => (
                  <div key={s} className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
                    <div><div className="font-semibold">{s}</div><p className="mt-1 text-[13px] leading-relaxed text-mute">Account linking, in-app playback and playlist export need API credentials that are not configured in this build. See the README for what is required.</p></div>
                    <span className="shrink-0 rounded-full bg-raised px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-mute">Not available</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'Account' && (
            <div className="space-y-6">
              <Card title="Account" sub={me.isGuest ? 'You are using a temporary demo account. It is removed automatically after two days.' : me.email}>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-quiet" onClick={() => logout().then(() => nav('/'))}>Log out</button>
                  {me.isGuest && <Link to="/register" className="btn-primary">Create a real account</Link>}
                </div>
              </Card>
              {!me.isGuest && (
                <Card title="Change password">
                  <form onSubmit={changePassword} className="space-y-4">
                    <div><label className="label" htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" className="field" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
                    <div><label className="label" htmlFor="pw-new">New password</label><input id="pw-new" type="password" className="field" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} /><p className="mt-2 text-xs text-mute">At least 8 characters, with a letter and a number.</p></div>
                    <button className="btn-primary" disabled={!pw.current || pw.next.length < 8}>Update password</button>
                  </form>
                </Card>
              )}
              <Card title="Delete account" sub="This permanently removes your profile, Mood Drops, comments, playlists, conversations and saved music.">
                <button className="btn-danger" onClick={() => setDel(true)}>Delete my account</button>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Modal open={del} onClose={() => setDel(false)} title="Delete your account?">
        <form onSubmit={deleteAccount} className="space-y-4">
          <p className="text-sm leading-relaxed text-mute">This cannot be undone. Type <b className="text-fg">{me.username}</b> to confirm.</p>
          <input className="field" value={delForm.confirm} onChange={(e) => setDelForm({ ...delForm, confirm: e.target.value })} aria-label="Type your username to confirm" autoCapitalize="none" autoComplete="off" />
          {!me.isGuest && <input type="password" className="field" placeholder="Your password" autoComplete="current-password" value={delForm.password} onChange={(e) => setDelForm({ ...delForm, password: e.target.value })} aria-label="Your password" />}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setDel(false)}>Keep my account</button>
            <button className="btn-danger" disabled={delForm.confirm.toLowerCase() !== me.username.toLowerCase()}>Delete forever</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
