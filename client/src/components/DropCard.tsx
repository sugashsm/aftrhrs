import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Bookmark, Download, Flag, Heart, Link2, MessageCircle, MoreHorizontal, Send, Share2, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/store';
import type { Comment, Drop } from '../lib/types';
import { bgStyle, cx, downloadBlob, renderDropCard, timeAgo } from '../lib/util';
import { Artwork, Avatar, DemoTag, Modal, MoodChip, OpenLink, PlayButton, SaveSongButton, Spinner } from './ui';

/** The visual "artwork" of a Mood Drop. Also used for the Create preview. */
export function DropVisual({ drop, className = '', compact }: { drop: Pick<Drop, 'caption' | 'background' | 'mood' | 'song'>; className?: string; compact?: boolean }) {
  const len = drop.caption.length;
  const size = compact ? (len < 70 ? 'text-xl' : 'text-lg') : len < 60 ? 'text-[2rem] sm:text-[2.6rem]' : len < 130 ? 'text-[1.7rem] sm:text-[2.1rem]' : 'text-2xl sm:text-[1.7rem]';
  return (
    <div className={cx('grain flex flex-col overflow-hidden', compact ? 'min-h-[15rem] p-5' : 'min-h-[24rem] p-6 sm:min-h-[27rem] sm:p-9', className)} style={bgStyle(drop.background)}>
      <MoodChip name={drop.mood.name} c1={drop.mood.c1} small={compact} />
      <blockquote className={cx('display my-auto py-6 text-fg [text-wrap:balance]', size)}>
        <span className="text-fg/50">“</span>
        {drop.caption || 'Your caption will sit here.'}
        <span className="text-fg/50">”</span>
      </blockquote>
      <div className="flex items-center gap-3 rounded-2xl bg-ink/45 p-2.5 backdrop-blur-md">
        <Artwork song={drop.song} className={compact ? 'h-10 w-10' : 'h-12 w-12'} rounded="rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className={cx('truncate font-semibold', compact ? 'text-[13px]' : 'text-sm')}>{drop.song.title}</div>
          <div className="truncate text-xs text-fg/65">{drop.song.artist}</div>
        </div>
        {!compact && 'links' in drop.song && <PlayButton song={drop.song} size={38} />}
      </div>
    </div>
  );
}

export async function shareDrop(drop: Drop, toast: (t: string, tone?: 'ok' | 'error') => void) {
  const url = `${location.origin}/drop/${drop.id}`;
  const text = `“${drop.caption}” — ${drop.song.title}, ${drop.song.artist}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'AFTRHRS Mood Drop', text, url });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch {
    toast('Copy this link: ' + url);
  }
}

export async function downloadDrop(drop: Pick<Drop, 'caption' | 'background' | 'mood' | 'song'> & { author?: { username: string } }, toast: (t: string, tone?: 'ok' | 'error') => void) {
  try {
    downloadBlob(await renderDropCard(drop), `aftrhrs-${drop.mood.name.toLowerCase().replace(/\s+/g, '-')}.png`);
    toast('Card saved as an image');
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

const REASONS = [['spam', 'Spam or misleading'], ['harassment', 'Harassment or bullying'], ['hate', 'Hate or discrimination'], ['self-harm', 'Self-harm concern'], ['other', 'Something else']] as const;

export function DropCard({ drop: initial, onRemoved, expanded }: { drop: Drop; onRemoved?: (id: number) => void; expanded?: boolean }) {
  const [drop, setDrop] = useState(initial);
  const [menu, setMenu] = useState(false);
  const [showComments, setShowComments] = useState(!!expanded);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState<string>('spam');
  const [confirm, setConfirm] = useState<null | 'delete' | 'block'>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => setDrop(initial), [initial]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, [menu]);
  useEffect(() => {
    if (showComments && comments === null) api<{ comments: Comment[] }>(`/drops/${drop.id}/comments`).then((r) => setComments(r.comments)).catch(() => setComments([]));
  }, [showComments, comments, drop.id]);

  const like = async () => {
    const next = !drop.liked;
    setDrop((d) => ({ ...d, liked: next, likeCount: d.likeCount + (next ? 1 : -1) }));
    try {
      const r = await api<{ likeCount: number }>(`/drops/${drop.id}/like`, { method: next ? 'POST' : 'DELETE' });
      setDrop((d) => ({ ...d, likeCount: r.likeCount }));
    } catch (e) {
      setDrop((d) => ({ ...d, liked: !next, likeCount: d.likeCount + (next ? -1 : 1) }));
      toast((e as Error).message, 'error');
    }
  };
  const save = async () => {
    const next = !drop.saved;
    setDrop((d) => ({ ...d, saved: next }));
    try {
      await api(`/drops/${drop.id}/save`, { method: next ? 'POST' : 'DELETE' });
      toast(next ? 'Saved to your profile' : 'Removed from saved');
    } catch (e) {
      setDrop((d) => ({ ...d, saved: !next }));
      toast((e as Error).message, 'error');
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await api<{ comment: Comment; commentCount: number }>(`/drops/${drop.id}/comments`, { body: { body: text } });
      setComments((c) => [...(c || []), r.comment]);
      setDrop((d) => ({ ...d, commentCount: r.commentCount }));
      setText('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };
  const removeComment = async (id: number) => {
    try {
      const r = await api<{ commentCount: number }>(`/comments/${id}`, { method: 'DELETE' });
      setComments((c) => (c || []).filter((x) => x.id !== id));
      setDrop((d) => ({ ...d, commentCount: r.commentCount }));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const act = async (fn: () => Promise<unknown>, done: string, remove = true) => {
    try {
      await fn();
      toast(done);
      if (remove) onRemoved?.(drop.id);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setConfirm(null);
    setReport(false);
  };

  const item = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-fg/90 hover:bg-white/5';
  return (
    <article className="panel animate-rise overflow-hidden">
      <header className="flex items-center gap-3 p-4 sm:px-5">
        <Link to={`/u/${drop.author.username}`} aria-label={`${drop.author.displayName}'s profile`}>
          <Avatar user={drop.author} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link to={`/u/${drop.author.username}`} className="truncate text-sm font-semibold hover:underline">
              {drop.author.displayName}
            </Link>
            {drop.author.isDemo && <DemoTag />}
          </div>
          <div className="truncate text-[13px] text-mute">
            @{drop.author.username} · <Link to={`/drop/${drop.id}`} className="hover:text-fg">{timeAgo(drop.createdAt)}</Link>
            {drop.room && (
              <>
                {' · in '}
                <Link to={`/rooms/${drop.room.slug}`} className="font-semibold text-fg/80 hover:text-fg">{drop.room.name}</Link>
              </>
            )}
          </div>
        </div>
        {drop.source === 'ai' && (
          <span className="hidden items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mute sm:inline-flex" title="Song found through Mood AI">
            <Sparkles size={11} /> Mood AI find
          </span>
        )}
        <div className="relative" ref={menuRef}>
          <button className="icon-btn" aria-haspopup="menu" aria-expanded={menu} aria-label="More options" onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-10 z-20 w-56 animate-fade overflow-hidden rounded-2xl border border-line bg-raised py-1.5 shadow-2xl shadow-black/60" onClick={() => setMenu(false)}>
              <button role="menuitem" className={item} onClick={() => navigator.clipboard.writeText(`${location.origin}/drop/${drop.id}`).then(() => toast('Link copied'), () => toast('Could not copy the link', 'error'))}><Link2 size={15} /> Copy link</button>
              <button role="menuitem" className={item} onClick={() => downloadDrop(drop, toast)}><Download size={15} /> Download as image</button>
              {drop.mine ? (
                <button role="menuitem" className={cx(item, 'text-[#F2A0AE]')} onClick={() => setConfirm('delete')}><Trash2 size={15} /> Delete Mood Drop</button>
              ) : (
                <>
                  <button role="menuitem" className={item} onClick={() => setReport(true)}><Flag size={15} /> Report</button>
                  <button role="menuitem" className={cx(item, 'text-[#F2A0AE]')} onClick={() => setConfirm('block')}><Ban size={15} /> Block @{drop.author.username}</button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <DropVisual drop={drop} className="mx-2 rounded-[1.4rem] sm:mx-3" />

      <div className="flex items-center gap-1 px-3 py-2.5 sm:px-4">
        <button onClick={like} aria-pressed={drop.liked} aria-label={drop.liked ? 'Unlike' : 'Like'} className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-white/5', drop.liked ? 'text-pink' : 'text-mute hover:text-fg')}>
          <Heart size={18} fill={drop.liked ? 'currentColor' : 'none'} className={cx('transition', drop.liked && 'scale-110')} />
          <span className="tabular-nums">{drop.likeCount}</span>
        </button>
        <button onClick={() => setShowComments((s) => !s)} aria-expanded={showComments} aria-label="Comments" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-mute transition hover:bg-white/5 hover:text-fg">
          <MessageCircle size={18} />
          <span className="tabular-nums">{drop.commentCount}</span>
        </button>
        <button onClick={save} aria-pressed={drop.saved} aria-label={drop.saved ? 'Remove from saved posts' : 'Save post'} className={cx('icon-btn', drop.saved && 'text-lav')}>
          <Bookmark size={18} fill={drop.saved ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => shareDrop(drop, toast)} aria-label="Share" className="icon-btn">
          <Share2 size={17} />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <SaveSongButton song={drop.song} />
          <OpenLink song={drop.song} />
        </div>
      </div>

      {showComments && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          {comments === null ? (
            <Spinner className="mx-auto my-3" />
          ) : comments.length === 0 ? (
            <p className="py-2 text-sm text-mute">No one has said anything yet. Sometimes the song says enough.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="group/c flex gap-3">
                  <Link to={`/u/${c.author.username}`}><Avatar user={c.author} size={30} /></Link>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link to={`/u/${c.author.username}`} className="font-semibold hover:underline">{c.author.displayName}</Link>
                    <span className="ml-2 text-xs text-mute">{timeAgo(c.createdAt)}</span>
                    <p className="mt-0.5 break-words leading-relaxed text-fg/85">{c.body}</p>
                  </div>
                  {(c.mine || drop.mine) && (
                    <button className="icon-btn h-7 w-7 opacity-60 hover:opacity-100" aria-label="Delete comment" onClick={() => removeComment(c.id)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submit} className="mt-4 flex items-center gap-2">
            <input className="field !rounded-full !py-2.5 text-sm" placeholder="Say something kind, or true." maxLength={400} value={text} onChange={(e) => setText(e.target.value)} aria-label="Write a comment" />
            <button className="btn-primary !h-10 !w-10 shrink-0 !p-0" disabled={!text.trim() || sending} aria-label="Post comment">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <Modal open={report} onClose={() => setReport(false)} title="Report this drop">
        <p className="mb-4 text-sm text-mute">Reports are private. This drop will be hidden from your feed and flagged for review.</p>
        <div className="space-y-2">
          {REASONS.map(([k, label]) => (
            <label key={k} className={cx('flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm', reason === k ? 'border-lav/60 bg-lav/10' : 'border-line')}>
              <input type="radio" name={`reason-${drop.id}`} className="accent-violet" checked={reason === k} onChange={() => setReason(k)} />
              {label}
            </label>
          ))}
        </div>
        <button className="btn-primary mt-5 w-full" onClick={() => act(() => api(`/drops/${drop.id}/report`, { body: { reason } }), 'Thanks. We have hidden it from your feed.')}>Send report</button>
      </Modal>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'delete' ? 'Delete this drop?' : `Block @${drop.author.username}?`}>
        <p className="text-sm leading-relaxed text-mute">{confirm === 'delete' ? 'It will be removed for everyone, along with its likes and comments. This cannot be undone.' : 'You will stop seeing each other’s Mood Drops, comments and profiles. You can unblock them in Settings.'}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
          {confirm === 'delete' ? (
            <button className="btn-danger" onClick={() => act(() => api(`/drops/${drop.id}`, { method: 'DELETE' }), 'Mood Drop deleted')}>Delete</button>
          ) : (
            <button className="btn-danger" onClick={() => act(() => api(`/users/${drop.author.id}/block`, { method: 'POST' }), `Blocked @${drop.author.username}`)}>Block</button>
          )}
        </div>
      </Modal>
    </article>
  );
}

/** Small, link-only version for grids and rails. */
export function DropTile({ drop, className = '' }: { drop: Drop; className?: string }) {
  return (
    <Link to={`/drop/${drop.id}`} className={cx('group block shrink-0 snap-start', className)}>
      <DropVisual drop={drop} compact className="rounded-3xl transition duration-500 group-hover:-translate-y-1" />
      <div className="mt-3 flex items-center gap-2 text-[13px] text-mute">
        <Avatar user={drop.author} size={22} />
        <span className="truncate font-medium text-fg/80">{drop.author.displayName}</span>
        <span className="ml-auto flex items-center gap-1 tabular-nums"><Heart size={12} /> {drop.likeCount}</span>
      </div>
    </Link>
  );
}
