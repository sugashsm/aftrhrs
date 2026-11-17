/**
 * AFTRHRS rule-based conversation engine.
 *
 * No external model is involved. The engine:
 *  1. extracts signals from free text (mood, energy, intensity, situation, language, genre, vagueness, commands)
 *  2. keeps a conversation state (what it knows, what it has asked, what it has already recommended)
 *  3. decides whether to ask a follow-up or recommend, depending on the conversation style
 *  4. scores the catalogue against the state + the listener's taste profile and explains each pick
 */
import { MOODS, type ConversationStyle } from '../../../shared/constants';
import type { Song } from '../queries';
import { scoreSong, topKeys, type Taste } from '../recommend';
import * as L from './lexicon';

export interface ConvState {
  style: ConversationStyle;
  stage: 'open' | 'probing' | 'recommended';
  mood?: string;
  blend?: string;
  energyShift: number;
  intensity?: 1 | 2 | 3;
  language?: string;
  genre?: string;
  instrumental?: boolean;
  situation?: string;
  different?: boolean;
  pending?: 'flavour' | 'energy' | 'intensity' | 'company' | 'mood' | 'weather';
  asked: string[];
  vague: number;
  unknown: number;
  recent: number[];
  used: string[];
  hour: number;
}

export interface Pick {
  song: Song;
  reason: string;
}

export interface EngineReply {
  text: string;
  quickReplies: string[];
  recommendations?: Pick[];
  playlist?: { title: string; description: string; mood: string; songs: Pick[] };
  suggestedCaption?: string;
  detected?: { mood?: string; blend?: string; energy?: string; intensity?: string; situation?: string };
  state: ConvState;
}

export interface EngineInput {
  state: ConvState;
  text: string;
  action?: 'regenerate' | 'playlist';
  songs: Song[];
  taste: Taste;
  rng?: () => number;
}

export const initialState = (style: ConversationStyle, hour: number): ConvState => ({ style, stage: 'open', energyShift: 0, asked: [], vague: 0, unknown: 0, recent: [], used: [], hour });

// ── text helpers ────────────────────────────────────────────────────────────
const clean = (s: string) => ` ${s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9&' -]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (t: string, w: string) => new RegExp(`[^a-z0-9]${esc(w)}[^a-z0-9]`).test(t);
const hasStem = (t: string, w: string) => new RegExp(`[^a-z0-9]${esc(w)}`).test(t);
const anyWord = (t: string, ws: string[]) => ws.some((w) => hasWord(t, w));
const anyStem = (t: string, ws: string[]) => ws.some((w) => hasStem(t, w));

const MOOD_ENERGY = new Map(MOODS.map((m) => [m.name, m.energy]));
const MOOD_LINE = new Map(MOODS.map((m) => [m.name, m.line]));

export function detectMood(raw: string): { mood: string; score: number } | null {
  // "I'd love something calm" is not a love song request.
  const t = clean(raw).replace(/ (would|i'd|id) love /g, ' ').replace(/ love (it|this|that|these|those|to|some|something|the|a) /g, ' ');
  let best: { mood: string; score: number } | null = null;
  for (const [mood, words] of Object.entries(L.MOOD_LEXICON)) {
    let score = 0;
    if (t.includes(` ${mood.toLowerCase()} `)) score += 4 + mood.length * 0.2;
    for (const w of words) {
      const m = new RegExp(`[^a-z0-9]${esc(w)}`).exec(t);
      if (!m) continue;
      const before = t.slice(Math.max(0, m.index - 14), m.index + 1);
      if (/ (not|no longer|never|isn't|isnt|don't feel|dont feel|not feeling|without) (really |that |so |too |very )?$/.test(before)) {
        score -= 1.5;
        continue;
      }
      score += 1 + Math.min(w.length, 10) / 10;
    }
    if (score > 0 && (!best || score > best.score)) best = { mood, score };
  }
  return best;
}

function detectSituation(t: string) {
  return L.SITUATIONS.find((s) => anyWord(t, s.words));
}
const pickKey = (t: string, map: Record<string, string[]>) => Object.keys(map).find((k) => anyWord(t, map[k]));

function timeBucket(hour: number) {
  if (hour >= 22 || hour < 4) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
}

// ── engine ──────────────────────────────────────────────────────────────────
export function respond(input: EngineInput): EngineReply {
  const rng = input.rng || Math.random;
  const s: ConvState = { ...input.state, asked: [...input.state.asked], recent: [...input.state.recent], used: [...input.state.used] };
  const t = clean(input.text);
  const words = t.trim().split(' ').filter(Boolean);
  const taste = input.taste;

  /** Picks a line that has not been used in this conversation yet. */
  const say = (lines: string[]) => {
    const fresh = lines.filter((l) => !s.used.includes(l));
    const pool = fresh.length ? fresh : lines;
    const line = pool[Math.floor(rng() * pool.length)];
    s.used = [...s.used.slice(-40), line];
    return line;
  };
  const steps = (): string[] => {
    if (s.style === 'quick') return [];
    if (s.style === 'deep') return ['flavour', 'energy', 'intensity'];
    if (s.style === 'situational') return s.situation ? ['company'] : ['flavour'];
    return ['flavour'];
  };
  const autoMood = () => {
    const fav = topKeys(taste.moods, 3).filter((m) => L.FLAVOURS[m]);
    const byTime: Record<string, string> = { night: 'Late Night', morning: 'Hopeful', day: 'Unbothered', evening: 'Dreamy' };
    return fav.length && rng() < 0.6 ? fav[Math.floor(rng() * fav.length)] : byTime[timeBucket(s.hour)];
  };
  const setMood = (mood: string) => {
    if (s.mood !== mood) {
      s.blend = undefined;
      s.energyShift = 0;
      s.intensity = undefined;
      s.asked = s.asked.filter((a) => a === 'company' && !!s.situation);
    }
    s.mood = mood;
  };
  const prefix: string[] = [];

  // 1 ── persistent signals (apply whenever they appear) ───────────────────────
  const lang = pickKey(t, L.LANGUAGE_WORDS);
  if (lang === 'Instrumental') s.instrumental = true;
  else if (lang) s.language = lang;
  const genre = pickKey(t, L.GENRE_WORDS);
  if (genre) s.genre = genre;
  if (anyWord(t, ['any language', 'any genre'])) {
    s.language = undefined;
    s.genre = undefined;
  }
  let energyWord = 0;
  if (anyStem(t, ['slower', 'calmer', 'softer', 'quieter', 'mellow', 'less intense', 'gentler', 'low energy', 'toned down'])) energyWord = -1;
  if (anyStem(t, ['faster', 'upbeat', 'more energy', 'louder', 'hype', 'more intense', 'high energy', 'pick me up', 'livelier', 'energetic'])) energyWord = 1;
  if (anyStem(t, ['very ', 'really ', 'so ', 'extremely', 'completely', 'totally', "can't stop", 'overwhelm', 'too much', 'intense'])) s.intensity = 3;
  else if (anyStem(t, ['a bit', 'a little', 'kinda', 'kind of', 'slightly', 'sort of', 'somewhat', 'mildly'])) s.intensity = 1;

  const isSurprise = anyWord(t, L.SURPRISE);
  const isDifferent = anyWord(t, L.DIFFERENT);
  const isExisting = hasStem(t, 'just existing') || t.trim() === 'existing';
  const isThanks = anyWord(t, L.THANKS) && words.length <= 6;
  const wantsPlaylist = input.action === 'playlist' || hasStem(t, 'playlist') || hasStem(t, 'mixtape');
  const wantsAgain = input.action === 'regenerate' || anyWord(t, ['another', 'again', 'regenerate', 'more', 'next', 'others', 'try again', 'another take', 'new ones', 'reroll']);
  const moodHit = detectMood(input.text);
  const situation = detectSituation(t);
  const isVague = !moodHit && !situation && !lang && !genre && !isSurprise && !isExisting && words.length <= 5 && (words.length === 0 || anyWord(t, L.VAGUE) || /^(hi|hey|hello|yo|sup|play)$/.test(t.trim()));

  // 2 ── after a recommendation: commands and tweaks ───────────────────────────
  if (s.stage === 'recommended' && s.mood && !s.pending) {
    if (isThanks && !wantsPlaylist && !moodHit) return done(say(L.THANKS_REPLIES), ['Another take', 'Make it a playlist', 'Start over']);
    const newMood = moodHit && moodHit.mood !== s.mood && moodHit.score >= 1.4;
    if (!newMood && !situation && !isSurprise && !isExisting) {
      if (wantsPlaylist) return playlist();
      if (energyWord) {
        s.energyShift += energyWord;
        return recommend([energyWord < 0 ? say(['Softer, then.', 'Turning it down.', 'Okay, gentler.']) : say(['More pulse. Got it.', 'Turning it up.', 'Okay, with more spine.'])]);
      }
      if (isDifferent) {
        s.different = true;
        return recommend([say(['A left turn, then. Same feeling, different shelf.', 'Okay. Off your usual map.'])]);
      }
      if (lang || genre) return recommend([say([`Same feeling${s.language ? `, in ${s.language}` : ''}${genre ? `, more ${genre}` : ''}.`, 'Adjusting the dial.'])]);
      if (wantsAgain) return recommend([say(['Another take on it.', 'Different angle, same feeling.', 'Let me try the next shelf over.'])]);
      if (isVague || !moodHit) return done(say([`Want another take on ${s.mood.toLowerCase()}, or has the feeling moved?`, 'Has the feeling shifted, or should I keep digging in the same place?']), ['Another take', 'Make it a playlist', 'Something different']);
    }
    // A new feeling: start a fresh round, keep language/genre preferences.
    s.stage = 'probing';
    s.different = false;
    s.situation = undefined;
  }

  // 3 ── answers to the question we just asked ─────────────────────────────────
  const pending = s.pending;
  s.pending = undefined;
  if (pending === 'flavour' && s.mood && L.FLAVOURS[s.mood]) {
    const opts = L.FLAVOURS[s.mood].options;
    let opt = opts.find((o) => t.includes(` ${o.label.toLowerCase()} `)) || opts.find((o) => anyStem(t, o.keys));
    if (!opt && anyWord(t, ['first', 'former'])) opt = opts[0];
    if (!opt && anyWord(t, ['second', 'latter', 'last'])) opt = opts[1];
    if (opt) {
      s.blend = opt.blend;
      s.energyShift += opt.energy;
      prefix.push(opt.echo);
    } else if (moodHit && moodHit.mood !== s.mood) {
      setMood(moodHit.mood);
    } else if (anyWord(t, ['both', 'neither']) || isVague) {
      prefix.push(say(['Both, probably. It usually is.', 'Somewhere in between. Noted.', 'No need to choose. I will cover the whole stretch.']));
    } else if (words.length > 2) {
      prefix.push(say(['I hear you.', 'That makes sense.', 'Okay. I think I have the shape of it.']));
    }
  } else if (pending === 'energy') {
    if (anyStem(t, ['quiet', 'sit', 'still', 'barely', 'soft', 'calm', 'slow', 'low', 'none'])) s.energyShift -= 1;
    else if (anyStem(t, ['move', 'a lot', 'lot', 'dance', 'loud', 'high', 'fast', 'up'])) s.energyShift += 1;
    prefix.push(say(['Got it.', 'Okay.', 'Understood.']));
  } else if (pending === 'intensity') {
    if (anyStem(t, ['hum', 'whisper', 'background', 'little', 'small', 'mild', 'quiet', 'low'])) s.intensity = 1;
    else if (anyStem(t, ['whole', 'room', 'wall', 'loud', 'a lot', 'everything', 'huge', 'big', 'all of'])) s.intensity = 3;
    else s.intensity = s.intensity || 2;
    prefix.push(s.intensity === 3 ? say(['That much. Okay. Then the music should be able to hold it.', 'Taking up the whole room. I will pick songs with enough space.']) : s.intensity === 1 ? say(['A hum. Then nothing too dramatic.', 'Quietly there. I will keep it light-handed.']) : 'Somewhere in the middle.');
  } else if (pending === 'company') {
    if (anyStem(t, ['alone', 'headphone', 'just me', 'myself', 'solo', 'nobody'])) s.energyShift -= 0.5;
    else if (anyStem(t, ['people', 'friend', 'room', 'family', 'together', 'everyone', 'others', 'with'])) s.energyShift += 0.5;
    prefix.push(say(['Good to know.', 'That changes the pick slightly.', 'Noted.']));
  } else if (pending === 'weather' && !moodHit && !situation) {
    const map: [string[], string][] = [[['clear', 'bright', 'glow', 'sunny', 'warm'], 'Hopeful'], [['overcast', 'ache', 'heavy', 'grey', 'gray', 'cloud'], 'Melancholic'], [['storm', 'restless', 'buzz', 'thunder', 'wind'], 'Restless'], [['fog', 'mist', 'haze', 'blur'], 'Lost'], [['soft', 'calm', 'still'], 'Peaceful']];
    const hit = map.find(([ks]) => anyStem(t, ks));
    if (hit) setMood(hit[1]);
  }

  // 4 ── new information in this message ───────────────────────────────────────
  if (energyWord && s.stage !== 'recommended') s.energyShift += energyWord;
  if (isDifferent) s.different = true;
  // While answering a follow-up, stray keywords ("slow morning", "sit quietly") must not hijack the mood.
  const open = !pending || pending === 'weather' || !s.mood;
  if (situation && open && (s.style === 'situational' || !moodHit)) {
    s.situation = situation.key;
    setMood(situation.mood);
    s.blend = situation.blend;
    if (situation.instrumental) s.instrumental = true;
    prefix.push(situation.line);
  } else if (isExisting) {
    setMood('Lost');
    s.energyShift = Math.min(s.energyShift, -0.5);
    prefix.push(say(L.EXISTING_REPLIES));
    return s.style === 'deep' ? next() : recommend(prefix.splice(0));
  } else if (moodHit && open) {
    setMood(moodHit.mood);
  }

  if (isSurprise && !moodHit) {
    setMood(autoMood());
    return recommend([say(['No questions, then. I read the room and went with my gut.', 'Dealer\'s choice. Trust me for three songs.', 'Fine. Eyes closed, hand in the crate.'])]);
  }

  // 5 ── still no mood: probe, at most a couple of times ───────────────────────
  if (!s.mood) {
    if (isDifferent || lang || genre) {
      if (s.style === 'quick' || isDifferent) {
        setMood(autoMood());
        return recommend([isDifferent ? say(['Something off your usual map, then.', 'A left turn. I like it.']) : say([`${s.language || s.genre}. Easy. I picked the feeling myself.`])]);
      }
    }
    if (isVague) s.vague += 1;
    else s.unknown += 1;
    const tries = s.vague + s.unknown;
    const limit = s.style === 'quick' ? 1 : 2;
    if (tries > limit) {
      setMood(autoMood());
      return recommend([say(['Okay. I will stop asking and read the room instead.', 'No more questions. I am going on instinct.', 'Then I will choose, and you can tell me if I am wrong.'])]);
    }
    s.stage = 'probing';
    s.pending = 'weather';
    if (isVague) {
      if (s.vague === 1 && (words.length === 0 || hasWord(t, 'play') || /^(hi|hey|hello|yo|sup)$/.test(t.trim()) || s.style === 'quick')) {
        return ask(say(L.TIME_PROBE[timeBucket(s.hour)]), ['Nostalgic', 'Restless', 'Peaceful', 'Anything']);
      }
      return ask(say(L.VAGUE_REPLIES), ['Nostalgic', 'Peaceful', 'Restless', 'Just existing']);
    }
    return ask(say(L.UNKNOWN_REPLIES), ['Heavy', 'Restless', 'Soft', 'Bright']);
  }

  return next();

  // ── helpers that close over state ───────────────────────────────────────────
  function detected() {
    const target = targetEnergy();
    return {
      mood: s.mood,
      blend: s.blend,
      energy: target <= 2 ? 'low energy' : target >= 4 ? 'high energy' : 'mid energy',
      intensity: s.intensity === 3 ? 'strong' : s.intensity === 1 ? 'light' : undefined,
      situation: s.situation,
    };
  }
  function done(text: string, quickReplies: string[]): EngineReply {
    return { text, quickReplies, state: s, detected: s.mood ? detected() : undefined };
  }
  function ask(text: string, quickReplies: string[]): EngineReply {
    s.stage = 'probing';
    return done([...prefix, text].join(' '), quickReplies);
  }

  /** Decides between another follow-up and a recommendation. */
  function next(): EngineReply {
    for (const step of steps()) {
      if (s.asked.includes(step)) continue;
      s.asked.push(step);
      if (step === 'flavour') {
        const f = L.FLAVOURS[s.mood!];
        if (!f || s.blend) continue;
        s.pending = 'flavour';
        return ask(say(f.q), f.options.map((o) => o.label));
      }
      if (step === 'energy') {
        if (energyWord) continue;
        s.pending = 'energy';
        return ask(say(L.ENERGY_Q), ['Sit quietly', 'Somewhere in between', 'Move me']);
      }
      if (step === 'intensity') {
        if (s.intensity) continue;
        s.pending = 'intensity';
        return ask(say(L.INTENSITY_Q), ['Background hum', 'Somewhere in the middle', 'The whole room']);
      }
      if (step === 'company') {
        s.pending = 'company';
        return ask(say(L.COMPANY_Q), ['Just me', 'People around']);
      }
    }
    return recommend(prefix.splice(0));
  }

  function targetEnergy() {
    const base = MOOD_ENERGY.get(s.mood || '') ?? 3;
    const amp = s.intensity === 3 ? (base >= 3.5 ? 0.5 : -0.4) : s.intensity === 1 ? (3 - base) * 0.3 : 0;
    return Math.max(1, Math.min(5, base + s.energyShift + amp));
  }

  function rank(count: number, excludeRecent: boolean): Song[] {
    const mood = s.mood!;
    const target = targetEnergy();
    const usualGenres = new Set(topKeys(taste.genres, 3));
    const usualLangs = new Set(topKeys(taste.languages, 2));
    const score = (x: Song) => {
      let n = (x.moods.includes(mood) ? 5 : 0) + (s.blend && x.moods.includes(s.blend) ? 2.5 : 0);
      n -= Math.abs(x.energy - target) * 1.3;
      const tasteScore = Math.min(scoreSong(x, taste), 14) * 0.35;
      n += s.different ? -tasteScore * 0.6 + (usualGenres.has(x.genre) ? 0 : 1.5) + (usualLangs.has(x.language) ? 0 : 1.5) : tasteScore;
      if (s.language) n += x.language === s.language ? 8 : -3;
      if (s.genre) n += x.genre === s.genre ? 5 : 0;
      if (s.instrumental && !s.language) n += x.language === 'Instrumental' ? 3 : 0;
      return n + rng() * 2.4;
    };
    let pool = input.songs.filter((x) => x.moods.includes(mood) || (s.blend && x.moods.includes(s.blend)) || (s.language && x.language === s.language));
    if (pool.length < count) pool = input.songs; // custom or sparse moods fall back to the whole catalogue
    let fresh = excludeRecent ? pool.filter((x) => !s.recent.includes(x.id)) : pool;
    if (fresh.length < count) {
      s.recent = [];
      fresh = pool;
    }
    const ranked = fresh.map((x) => ({ x, n: score(x) })).sort((a, b) => b.n - a.n).map((r) => r.x);
    const seen = new Set<string>();
    const out: Song[] = [];
    for (const x of ranked) {
      if (seen.has(x.artist)) continue;
      seen.add(x.artist);
      out.push(x);
      if (out.length >= count) break;
    }
    return out.length >= count ? out : ranked.slice(0, count);
  }

  function explain(x: Song, usedClauses: Set<string>): string {
    const mood = x.moods.includes(s.mood!) ? s.mood! : s.blend && x.moods.includes(s.blend) ? s.blend : s.mood!;
    const base = (L.WHY[mood] || ['{title} fits the shape of what you described.', '{artist} gets close to this exact feeling in {title}.']);
    const line = base[Math.floor(rng() * base.length)].replace(/\{title\}/g, x.title).replace(/\{artist\}/g, x.artist.split(/,|&/)[0].trim());
    const target = targetEnergy();
    const loved = Object.keys(taste.artists).find((a) => x.artist.toLowerCase().includes(a.toLowerCase()));
    const clauses: [string, boolean, string][] = [
      ['lang-ask', !!s.language && x.language === s.language, `And it is in ${x.language}, like you asked.`],
      ['artist', !!loved, `You already love ${loved}, so this should feel like home.`],
      ['different', !!s.different && !taste.genres[x.genre], `It sits outside your usual lane on purpose.`],
      ['lang', x.language !== 'English' && x.language !== 'Instrumental' && !!taste.languages[x.language], `It is in ${x.language}, which you told me you listen to.`],
      ['instr', x.language === 'Instrumental', 'No lyrics, so it will not talk over your own thoughts.'],
      ['low', target <= 2 && x.energy <= 2, 'Low and slow, to match where you are.'],
      ['high', target >= 4 && x.energy >= 4, 'It has the pulse you are looking for.'],
      ['emerging', x.emergingArtist, `${x.artist} is still under most radars.`],
      ['gem', x.popularity < 82, 'Not many people have found this one yet.'],
    ];
    const extra = clauses.find(([k, ok]) => ok && !usedClauses.has(k));
    if (extra) usedClauses.add(extra[0]);
    return extra ? `${line} ${extra[2]}` : line;
  }

  function recommend(lead: string[]): EngineReply {
    const count = s.style === 'deep' ? 5 : s.style === 'situational' ? 4 : 3;
    const picks = rank(count, true);
    const usedClauses = new Set<string>();
    const recommendations = picks.map((song) => ({ song, reason: explain(song, usedClauses) }));
    s.recent = [...s.recent, ...picks.map((p) => p.id)].slice(-60);
    s.stage = 'recommended';
    s.pending = undefined;
    const intro = say(L.INTROS[s.mood!] || [`Here is what ${s.mood!.toLowerCase()} sounds like to me.`, `My best read on ${s.mood!.toLowerCase()}.`]);
    const caption = L.CAPTIONS[s.mood!];
    return {
      text: [...lead, intro].join(' '),
      quickReplies: ['Another take', 'Make it a playlist', 'Softer', 'More energy'],
      recommendations,
      suggestedCaption: caption ? caption[Math.floor(rng() * caption.length)] : undefined,
      detected: detected(),
      state: s,
    };
  }

  function playlist(): EngineReply {
    const picks = rank(10, false);
    // Shape an arc: ease in, rise to a peak, come back down.
    const asc = [...picks].sort((a, b) => a.energy - b.energy);
    const arc = [...asc.filter((_, i) => i % 2 === 0), ...asc.filter((_, i) => i % 2 === 1).reverse()];
    const usedClauses = new Set<string>();
    const mood = s.mood!;
    const title = say(L.PLAYLIST_TITLES[mood] || [`${mood.toLowerCase()}, mostly`, `a ${mood.toLowerCase()} kind of day`]);
    const bits = [`A ${mood.toLowerCase()} set`, s.blend ? `with a ${s.blend.toLowerCase()} edge` : '', s.language ? `leaning ${s.language}` : '', s.situation ? `for the ${s.situation}` : ''].filter(Boolean).join(' ');
    s.recent = [...s.recent, ...arc.map((p) => p.id)].slice(-60);
    s.stage = 'recommended';
    return {
      text: say([`I shaped this one like an evening: it eases in, lifts, then lets you down gently. I called it "${title}".`, `Ten songs, sequenced so it rises and settles. Working title: "${title}".`, `Here is the long version of that feeling. I am calling it "${title}".`]),
      quickReplies: ['Another take', 'Softer', 'More energy', 'Start over'],
      playlist: { title, description: `${bits}. Sequenced by the AFTRHRS rule-based engine from your conversation.`, mood, songs: arc.map((song) => ({ song, reason: explain(song, usedClauses) })) },
      detected: detected(),
      state: s,
    };
  }
}

export const moodLine = (mood: string) => MOOD_LINE.get(mood);
