import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Check, History, ListMusic, PenLine, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, useLoad } from '../lib/api';
import { useToast } from '../lib/store';
import type { AiMessage, Pick } from '../lib/types';
import { bgStyle, cx, timeAgo } from '../lib/util';
import { ErrorState, Loading, Modal, MoodChip, SongRow, Spinner } from '../components/ui';
import { CONVERSATION_STYLES, type ConversationStyle } from '../../../shared/constants';

interface Conversation {
  id: number;
  style: ConversationStyle;
  messages: AiMessage[];
}
const KEY = 'aftrhrs:conversation';

function createLink(p: Pick, mood?: string, caption?: string) {
  const q = new URLSearchParams({ song: String(p.song.id), source: 'ai' });
  if (mood) q.set('mood', mood);
  if (caption) q.set('caption', caption);
  return `/create?${q}`;
}

function PlaylistCard({ m }: { m: AiMessage }) {
  const toast = useToast();
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const p = m.playlist!;
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ playlist: { id: number } }>('/playlists', { body: { title: p.title, description: p.description, mood: p.mood, source: 'ai', songs: p.songs.map((x) => ({ id: x.song.id, reason: x.reason })) } });
      setSaved(r.playlist.id);
      toast('Playlist saved to your profile');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel mt-3 overflow-hidden">
      <div className="grain p-5" style={bgStyle('haze')}>
        <div className="eyebrow !text-fg/70">Playlist · {p.songs.length} songs</div>
        <div className="display mt-2 text-4xl italic">{p.title}</div>
        <p className="mt-2 max-w-md text-[13px] text-fg/70">{p.description}</p>
        <div className="mt-4">
          {saved ? <Link to={`/playlist/${saved}`} className="btn-ghost btn-sm bg-ink/40"><Check size={14} /> Saved. Open playlist</Link> : <button className="btn-light btn-sm" onClick={save} disabled={busy}>{busy ? <Spinner className="!text-ink" /> : <><ListMusic size={14} /> Save playlist</>}</button>}
        </div>
      </div>
      <div className="p-2">{p.songs.map((x, i) => <SongRow key={x.song.id} song={x.song} index={i} />)}</div>
    </div>
  );
}

export function MoodAI() {
  const toast = useToast();
  const status = useLoad<{ engine: string; label: string; external: boolean }>('/ai/status');
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [style, setStyle] = useState<ConversationStyle>('casual');
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ id: number; style: string; preview: string; mood: string | null; updatedAt: string }[] | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const start = useCallback(async (s: ConversationStyle) => {
    setError('');
    setConvo(null);
    try {
      const r = await api<{ conversation: Conversation }>('/ai/conversations', { body: { style: s, hour: new Date().getHours() } });
      setConvo(r.conversation);
      setStyle(s);
      sessionStorage.setItem(KEY, String(r.conversation.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const open = useCallback(async (id: number) => {
    const r = await api<{ conversation: Conversation }>(`/ai/conversations/${id}`);
    setConvo(r.conversation);
    setStyle(r.conversation.style);
    sessionStorage.setItem(KEY, String(id));
  }, []);

  // Restore the conversation from this browser session, otherwise begin a new one.
  useEffect(() => {
    const id = Number(sessionStorage.getItem(KEY));
    if (id) open(id).catch(() => start('casual'));
    else start('casual');
  }, [open, start]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [convo?.messages.length, thinking]);

  const send = async (body: { text?: string; action?: 'regenerate' | 'playlist' }) => {
    if (!convo || thinking) return;
    if (body.text && /^start over$/i.test(body.text.trim())) return start(style);
    const shown = body.text || (body.action === 'playlist' ? 'Make it a playlist' : 'Another take');
    const temp: AiMessage = { id: -Date.now(), role: 'user', content: shown, createdAt: new Date().toISOString() };
    setConvo((c) => c && { ...c, messages: [...c.messages, temp] });
    setText('');
    setThinking(true);
    try {
      const [r] = await Promise.all([
        api<{ messages: AiMessage[] }>(`/ai/conversations/${convo.id}/messages`, { body: { ...body, hour: new Date().getHours() } }),
        new Promise((res) => setTimeout(res, 550 + Math.random() * 500)), // a beat, so replies do not feel instant and mechanical
      ]);
      setConvo((c) => c && { ...c, messages: [...c.messages.filter((m) => m.id !== temp.id), ...r.messages] });
    } catch (e) {
      setConvo((c) => c && { ...c, messages: c.messages.filter((m) => m.id !== temp.id) });
      setText(body.text || '');
      toast((e as Error).message, 'error');
    } finally {
      setThinking(false);
      input.current?.focus();
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) send({ text: text.trim() });
  };
  const quick = (label: string) => {
    if (label === 'Another take') return send({ action: 'regenerate' });
    if (label === 'Make it a playlist') return send({ action: 'playlist' });
    send({ text: label });
  };
  const loadHistory = async () => {
    setHistoryOpen(true);
    setHistory(null);
    try {
      setHistory((await api<{ conversations: any[] }>('/ai/conversations')).conversations);
    } catch {
      setHistory([]);
    }
  };
  const removeConversation = async (id: number) => {
    await api(`/ai/conversations/${id}`, { method: 'DELETE' }).catch(() => {});
    setHistory((h) => (h || []).filter((x) => x.id !== id));
    if (convo?.id === id) start(style);
  };

  const messages = convo?.messages || [];
  const last = messages[messages.length - 1];
  const lastMood = [...messages].reverse().find((m) => m.detected?.mood)?.detected;

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-3">Mood AI</div>
          <h1 className="display text-5xl sm:text-6xl">What are we scoring?</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={loadHistory}><History size={14} /> History</button>
          <button className="btn-quiet btn-sm" onClick={() => start(style)}><Plus size={14} /> New</button>
        </div>
      </div>

      <div className="hscroll mt-6 !gap-2" role="radiogroup" aria-label="Conversation style">
        {CONVERSATION_STYLES.map((s) => (
          <button key={s.key} role="radio" aria-checked={style === s.key} title={s.blurb} onClick={() => style !== s.key && start(s.key)} className={cx('chip', style === s.key && 'chip-on')}>{s.name}</button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-mute">
        {CONVERSATION_STYLES.find((s) => s.key === style)!.blurb}{' '}
        <span className="text-mute/70">· {status.data?.external ? `Replies voiced by ${status.data.label}.` : 'Runs on the built-in rule-based engine. No external AI model is connected.'}</span>
      </p>

      <div className="mt-6 min-h-[45vh] space-y-5" aria-live="polite">
        {error && <ErrorState message={error} retry={() => start(style)} />}
        {!convo && !error && <Loading label="Warming up the speakers" />}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex animate-rise justify-end">
              <p className="max-w-[82%] rounded-3xl rounded-br-lg bg-fg px-4 py-2.5 text-[15px] font-medium text-ink">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="animate-rise">
              <p className="max-w-[92%] font-serif text-[1.7rem] leading-[1.2] text-fg sm:text-[2rem]">{m.content}</p>
              {m.detected?.mood && (m.recommendations || m.playlist) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
                  <span>What I heard:</span>
                  <MoodChip name={m.detected.mood} small />
                  {m.detected.blend && <span>with a {m.detected.blend.toLowerCase()} edge</span>}
                  <span>· {m.detected.energy}</span>
                  {m.detected.intensity && <span>· {m.detected.intensity} feeling</span>}
                </div>
              )}
              {m.recommendations && (
                <div className="panel mt-3 p-2">
                  {m.recommendations.map((p) => (
                    <SongRow key={p.song.id} song={p.song} reason={p.reason} actions={
                      <Link to={createLink(p, m.detected?.mood, m.suggestedCaption)} className="icon-btn" title="Post as a Mood Drop" aria-label={`Post ${p.song.title} as a Mood Drop`}><PenLine size={16} /></Link>
                    } />
                  ))}
                </div>
              )}
              {m.playlist && <PlaylistCard m={m} />}
            </div>
          ),
        )}
        {thinking && (
          <div className="flex h-8 items-end gap-1.5" aria-label="Thinking">
            {[0, 1, 2].map((i) => <span key={i} className="eq-bar h-5 w-1 animate-eq rounded-full bg-lav/70" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
        <div ref={end} className="h-px scroll-mb-64" />
      </div>

      <div className="sticky bottom-[5.25rem] z-10 -mx-4 mt-6 bg-gradient-to-t from-ink via-ink to-transparent px-4 pb-3 pt-8 lg:bottom-0 lg:pb-6">
        {!thinking && last?.role === 'assistant' && !!last.quickReplies?.length && (
          <div className="hscroll mb-3 !gap-2 !pb-0">
            {last.quickReplies.map((q) => (
              <button key={q} className="chip bg-card" onClick={() => quick(q)}>
                {q === 'Another take' && <RefreshCw size={12} />}
                {q === 'Make it a playlist' && <ListMusic size={12} />}
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2">
          <input ref={input} className="field !rounded-full !bg-card !py-3.5" placeholder={lastMood?.mood ? `Still ${lastMood.mood.toLowerCase()}? Or has it moved?` : 'Say anything. Or “anything”.'} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} disabled={!convo} aria-label="Message Mood AI" />
          <button className="btn-primary !h-12 !w-12 shrink-0 !p-0" disabled={!text.trim() || thinking || !convo} aria-label="Send"><ArrowUp size={18} /></button>
        </form>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Past conversations">
        {history === null ? <Spinner className="mx-auto my-6" /> : !history.length ? <p className="text-sm text-mute">Nothing yet. Your conversations will be kept here so you can come back to a feeling.</p> : (
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <button className={cx('min-w-0 flex-1 rounded-2xl p-3 text-left hover:bg-white/5', convo?.id === h.id && 'bg-white/5')} onClick={() => open(h.id).then(() => setHistoryOpen(false)).catch((e) => toast(e.message, 'error'))}>
                  <span className="block truncate font-serif text-xl italic">“{h.preview}”</span>
                  <span className="mt-0.5 block text-xs text-mute">{h.mood ? `${h.mood} · ` : ''}{timeAgo(h.updatedAt)} · {CONVERSATION_STYLES.find((s) => s.key === h.style)?.name}</span>
                </button>
                <button className="icon-btn" aria-label="Delete conversation" onClick={() => removeConversation(h.id)}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
