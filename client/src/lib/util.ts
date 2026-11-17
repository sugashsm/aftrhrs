import type { CSSProperties } from 'react';
import { BACKGROUNDS, MOODS, type BackgroundDef } from '../../../shared/constants';
import type { Drop } from './types';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late again';
}

const MOOD_MAP = new Map(MOODS.map((m) => [m.name, m]));
export const moodColors = (name: string): [string, string] => {
  const m = MOOD_MAP.get(name);
  return m ? [m.c1, m.c2] : ['#A78BFA', '#3B2F6B'];
};

export const background = (key: string): BackgroundDef => BACKGROUNDS.find((b) => b.key === key) || BACKGROUNDS[0];

/** CSS for a Mood Drop backdrop. Mirrors drawBackground() below so exports match the screen. */
export function bgStyle(key: string): CSSProperties {
  const b = background(key);
  return {
    backgroundColor: b.base,
    backgroundImage: b.glows.map(([x, y, c, r]) => `radial-gradient(circle at ${x}% ${y}%, ${c}d0 0%, ${c}00 ${r}%)`).join(', '),
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, key: string, w: number, h: number) {
  const b = background(key);
  ctx.fillStyle = b.base;
  ctx.fillRect(0, 0, w, h);
  const far = Math.hypot(w, h);
  for (const [x, y, c, r] of b.glows) {
    const g = ctx.createRadialGradient((x / 100) * w, (y / 100) * h, 0, (x / 100) * w, (y / 100) * h, (r / 100) * far);
    g.addColorStop(0, `${c}d0`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // grain
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.045})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders a Mood Drop as a 1080×1350 PNG, entirely in the browser. */
export async function renderDropCard(d: Pick<Drop, 'caption' | 'background' | 'mood' | 'song'> & { author?: { username: string } }): Promise<Blob> {
  const W = 1080, H = 1350, P = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try {
    await Promise.all([document.fonts.load('400 72px "Instrument Serif"'), document.fonts.load('700 28px Manrope'), document.fonts.load('500 30px Manrope')]);
  } catch {
    /* fall back to system fonts */
  }
  drawBackground(ctx, d.background, W, H);
  const shade = ctx.createLinearGradient(0, H * 0.45, 0, H);
  shade.addColorStop(0, 'rgba(9,9,13,0)');
  shade.addColorStop(1, 'rgba(9,9,13,0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'alphabetic';
  // mood label
  ctx.fillStyle = d.mood.c1;
  ctx.beginPath();
  ctx.arc(P + 9, P + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(245,243,250,0.92)';
  ctx.font = '700 26px Manrope, sans-serif';
  (ctx as any).letterSpacing = '6px';
  ctx.fillText(d.mood.name.toUpperCase(), P + 34, P + 11);
  (ctx as any).letterSpacing = '0px';

  // caption
  const len = d.caption.length;
  const size = len < 60 ? 92 : len < 120 ? 76 : len < 200 ? 60 : 50;
  ctx.font = `400 ${size}px "Instrument Serif", Georgia, serif`;
  ctx.fillStyle = '#F5F3FA';
  const lines = wrap(ctx, `“${d.caption}”`, W - P * 2);
  const lh = size * 1.12;
  let y = Math.max(P + 150, H * 0.5 - (lines.length * lh) / 2 + size * 0.5);
  for (const l of lines) {
    ctx.fillText(l, P, y);
    y += lh;
  }

  // song
  ctx.font = '700 38px Manrope, sans-serif';
  ctx.fillStyle = '#F5F3FA';
  ctx.fillText(wrap(ctx, d.song.title, W - P * 2)[0], P, H - P - 118);
  ctx.font = '500 30px Manrope, sans-serif';
  ctx.fillStyle = 'rgba(245,243,250,0.7)';
  ctx.fillText(wrap(ctx, d.song.artist, W - P * 2)[0], P, H - P - 72);

  ctx.fillStyle = 'rgba(245,243,250,0.18)';
  ctx.fillRect(P, H - P - 38, W - P * 2, 1.5);
  ctx.font = '800 24px Manrope, sans-serif';
  ctx.fillStyle = '#F5F3FA';
  (ctx as any).letterSpacing = '8px';
  ctx.fillText('AFTRHRS', P, H - P + 8);
  (ctx as any).letterSpacing = '0px';
  ctx.font = '500 22px Manrope, sans-serif';
  ctx.fillStyle = 'rgba(245,243,250,0.6)';
  const tag = d.author ? `@${d.author.username}` : 'every feeling has a soundtrack';
  ctx.fillText(tag, W - P - ctx.measureText(tag).width, H - P + 8);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render the card'))), 'image/png'));
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Resizes an image file to a small square JPEG data URL for avatars. */
export function fileToAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read.'));
    };
    img.src = url;
  });
}
