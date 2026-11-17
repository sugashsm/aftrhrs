import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { all, get, now, run, tx } from '../db';
import { endSession, HttpError, optionalAuth, parse, requireAuth, startSession } from '../http';
import { miniUser, notify, selfUser, USER_MINI } from '../queries';

export const auth = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Give it a few minutes and try again.' },
});

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password needs at least one letter')
  .regex(/[0-9]/, 'Password needs at least one number');
const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24)
  .regex(/^[a-zA-Z0-9_.]+$/, 'Usernames can only use letters, numbers, dots and underscores');
const list = (max = 40) => z.array(z.string().trim().min(1).max(60)).max(max);

auth.post('/auth/register', limiter, (req, res) => {
  const b = parse(z.object({ email: z.string().trim().email('Enter a valid email address').max(160), username, displayName: z.string().trim().min(1, 'Tell us what to call you').max(40), password }), req.body);
  if (b.username.toLowerCase().startsWith('guest_')) throw new HttpError(400, 'That username is reserved.');
  if (get('SELECT 1 AS x FROM users WHERE email = ?', b.email)) throw new HttpError(409, 'An account with that email already exists.');
  if (get('SELECT 1 AS x FROM users WHERE username = ?', b.username)) throw new HttpError(409, 'That username is taken.');
  const hash = bcrypt.hashSync(b.password, 10);
  const { id } = run('INSERT INTO users (email, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', b.email, b.username, b.displayName, hash, now());
  run('INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)', id, now());
  notify(id, null, 'welcome', { body: 'Welcome to AFTRHRS. Start with Mood AI, or drop the song that sounds like today.' });
  startSession(res, id);
  res.status(201).json({ user: selfUser(get('SELECT * FROM users WHERE id = ?', id)!) });
});

auth.post('/auth/login', limiter, (req, res) => {
  const b = parse(z.object({ identifier: z.string().trim().min(1, 'Enter your email or username').max(160), password: z.string().min(1, 'Enter your password').max(128) }), req.body);
  const u = get('SELECT * FROM users WHERE (email = ? OR username = ?) AND is_demo = 0', b.identifier, b.identifier);
  // Compare against a dummy hash when the user is missing so timing does not reveal which accounts exist.
  const ok = bcrypt.compareSync(b.password, u?.password_hash || '$2a$10$CwTycUXWue0Thq9StjUM0uJ8rT1eJ6w3kFQ1cZ3hV0b8Ez0m1oG6K');
  if (!u || !ok) throw new HttpError(401, 'Those details do not match an account.');
  startSession(res, u.id);
  res.json({ user: selfUser(u) });
});

auth.post('/auth/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

/** Demo mode: a throwaway guest account, clearly flagged, pre-onboarded so the product can be explored. */
auth.post('/auth/demo', limiter, (_req, res) => {
  const tag = crypto.randomBytes(3).toString('hex');
  const id = tx(() => {
    const hash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 4);
    const mood = get('SELECT id FROM moods WHERE name = ?', 'Late Night');
    const { id } = run(
      `INSERT INTO users (email, username, display_name, password_hash, bio, is_demo, onboarded, current_mood_id, created_at) VALUES (?, ?, ?, ?, ?, 2, 1, ?, ?)`,
      `guest_${tag}@demo.aftrhrs.local`, `guest_${tag}`, 'Demo Listener', hash, 'Just looking around. This is a temporary demo account.', mood?.id ?? null, now(),
    );
    run('INSERT INTO user_preferences (user_id, languages, genres, artists, moods, discovery, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id,
      JSON.stringify(['English', 'Tamil', 'Hindi']), JSON.stringify(['indie', 'alternative', 'R&B', 'film']), JSON.stringify(['Frank Ocean', 'A.R. Rahman', 'Phoebe Bridgers']),
      JSON.stringify(['Nostalgic', 'Late Night', 'Dreamy']), JSON.stringify(['Hidden gems nobody talks about']), now());
    const demo = all<{ id: number }>('SELECT id FROM users WHERE is_demo = 1 ORDER BY id LIMIT 6');
    demo.slice(0, 3).forEach((d) => run('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', id, d.id, now()));
    demo.slice(3, 5).forEach((d) => {
      run('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', d.id, id, now());
      notify(id, d.id, 'follow');
    });
    notify(id, null, 'welcome', { body: 'You are in demo mode. Everyone you see here is a fictional sample listener. Look around, nothing breaks.' });
    return id;
  });
  startSession(res, id);
  res.status(201).json({ user: selfUser(get('SELECT * FROM users WHERE id = ?', id)!) });
});

auth.get('/auth/me', optionalAuth, (req, res) => {
  res.json({ user: req.user ? selfUser(req.user) : null });
});

// ── Onboarding / music preferences ──────────────────────────────────────────
auth.put('/me/preferences', requireAuth, (req, res) => {
  const b = parse(z.object({ languages: list(), genres: list(), artists: list(60), moods: list(), discovery: list() }), req.body);
  if (!b.languages.length || !b.genres.length) throw new HttpError(400, 'Pick at least one language and one genre.');
  const id = req.user!.id;
  run(
    `INSERT INTO user_preferences (user_id, languages, genres, artists, moods, discovery, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET languages = excluded.languages, genres = excluded.genres, artists = excluded.artists, moods = excluded.moods, discovery = excluded.discovery, updated_at = excluded.updated_at`,
    id, JSON.stringify(b.languages), JSON.stringify(b.genres), JSON.stringify(b.artists), JSON.stringify(b.moods), JSON.stringify(b.discovery), now(),
  );
  if (!req.user!.current_mood_id && b.moods[0]) {
    const m = get('SELECT id FROM moods WHERE name = ?', b.moods[0]);
    if (m) run('UPDATE users SET current_mood_id = ? WHERE id = ?', m.id, id);
  }
  run('UPDATE users SET onboarded = 1 WHERE id = ?', id);
  res.json({ user: selfUser(get('SELECT * FROM users WHERE id = ?', id)!) });
});

// ── Profile ─────────────────────────────────────────────────────────────────
auth.put('/me', requireAuth, (req, res) => {
  const b = parse(
    z.object({
      displayName: z.string().trim().min(1).max(40).optional(),
      username: username.optional(),
      bio: z.string().trim().max(240, 'Bio can be up to 240 characters').optional(),
      // Small client-resized image as a data URL, or null to remove.
      avatar: z.string().max(400_000, 'That image is too large').regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Unsupported image').nullable().optional(),
      currentMood: z.string().trim().max(40).nullable().optional(),
    }),
    req.body,
  );
  const u = req.user!;
  if (b.username && b.username.toLowerCase() !== String(u.username).toLowerCase()) {
    if (u.is_demo === 2 || b.username.toLowerCase().startsWith('guest_')) throw new HttpError(400, 'That username is not available.');
    if (get('SELECT 1 AS x FROM users WHERE username = ? AND id <> ?', b.username, u.id)) throw new HttpError(409, 'That username is taken.');
    run('UPDATE users SET username = ? WHERE id = ?', b.username, u.id);
  }
  if (b.displayName !== undefined) run('UPDATE users SET display_name = ? WHERE id = ?', b.displayName, u.id);
  if (b.bio !== undefined) run('UPDATE users SET bio = ? WHERE id = ?', b.bio, u.id);
  if (b.avatar !== undefined) run('UPDATE users SET avatar = ? WHERE id = ?', b.avatar, u.id);
  if (b.currentMood !== undefined) {
    const m = b.currentMood ? get('SELECT id FROM moods WHERE name = ?', b.currentMood) : null;
    if (b.currentMood && !m) throw new HttpError(400, 'Unknown mood.');
    run('UPDATE users SET current_mood_id = ? WHERE id = ?', m?.id ?? null, u.id);
  }
  res.json({ user: selfUser(get('SELECT * FROM users WHERE id = ?', u.id)!) });
});

auth.put('/me/settings', requireAuth, (req, res) => {
  const b = parse(
    z.object({
      isPrivate: z.boolean().optional(),
      showSaved: z.boolean().optional(),
      notifPrefs: z.object({ likes: z.boolean(), comments: z.boolean(), follows: z.boolean() }).optional(),
      linkService: z.enum(['spotify', 'youtube', 'apple']).optional(),
    }),
    req.body,
  );
  const id = req.user!.id;
  if (b.isPrivate !== undefined) run('UPDATE users SET is_private = ? WHERE id = ?', b.isPrivate ? 1 : 0, id);
  if (b.showSaved !== undefined) run('UPDATE users SET show_saved = ? WHERE id = ?', b.showSaved ? 1 : 0, id);
  if (b.notifPrefs) run('UPDATE users SET notif_prefs = ? WHERE id = ?', JSON.stringify(b.notifPrefs), id);
  if (b.linkService) run('UPDATE users SET link_service = ? WHERE id = ?', b.linkService, id);
  res.json({ user: selfUser(get('SELECT * FROM users WHERE id = ?', id)!) });
});

auth.put('/me/password', requireAuth, limiter, (req, res) => {
  const b = parse(z.object({ current: z.string().min(1).max(128), next: password }), req.body);
  const u = req.user!;
  if (u.is_demo !== 0) throw new HttpError(400, 'Demo accounts do not have a password to change.');
  if (!bcrypt.compareSync(b.current, u.password_hash)) throw new HttpError(401, 'Your current password is not correct.');
  run('UPDATE users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(b.next, 10), u.id);
  res.json({ ok: true });
});

auth.delete('/me', requireAuth, limiter, (req, res) => {
  const b = parse(z.object({ password: z.string().max(128).optional(), confirm: z.string().max(40) }), req.body ?? {});
  const u = req.user!;
  if (b.confirm.toLowerCase() !== String(u.username).toLowerCase()) throw new HttpError(400, 'Type your username exactly to confirm.');
  if (u.is_demo === 0 && !bcrypt.compareSync(b.password || '', u.password_hash)) throw new HttpError(401, 'Your password is not correct.');
  run('DELETE FROM users WHERE id = ?', u.id); // cascades to everything the account owns
  endSession(res);
  res.json({ ok: true });
});

auth.get('/me/blocked', requireAuth, (req, res) => {
  const rows = all(`SELECT ${USER_MINI} FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ? ORDER BY b.created_at DESC`, req.user!.id);
  res.json({ users: rows.map((r) => miniUser(r)) });
});
