import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { get, ROOT, type Row } from './db';

declare global {
  namespace Express {
    interface Request {
      user?: Row;
    }
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    const field = i?.path?.length ? `${i.path.join('.')}: ` : '';
    throw new HttpError(400, i ? `${field}${i.message}` : 'Invalid input');
  }
  return r.data;
}

export const idParam = (req: Request, name = 'id') => {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id');
  return n;
};

// ── Sessions ────────────────────────────────────────────────────────────────
const COOKIE = 'aftrhrs_session';
const MAX_AGE = 1000 * 60 * 60 * 24 * 30;

let secret: string | undefined;
function getSecret() {
  if (secret) return secret;
  if (process.env.JWT_SECRET) return (secret = process.env.JWT_SECRET);
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  // Development convenience: persist a random secret so sessions survive restarts.
  const file = path.join(ROOT, 'data', '.session_secret');
  try {
    secret = fs.readFileSync(file, 'utf8').trim();
  } catch {
    secret = crypto.randomBytes(48).toString('hex');
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, secret);
    } catch {
      /* in-memory only */
    }
  }
  return secret!;
}

export function startSession(res: Response, userId: number) {
  const token = jwt.sign({ sub: userId }, getSecret(), { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== 'true',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

function loadUser(req: Request) {
  const token = req.cookies?.[COOKIE];
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, getSecret()) as unknown as { sub: number };
    return get('SELECT * FROM users WHERE id = ?', Number(payload.sub));
  } catch {
    return undefined;
  }
}

export const optionalAuth: RequestHandler = (req, _res, next) => {
  req.user = loadUser(req);
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  req.user = loadUser(req);
  if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
  next();
};

export const viewerId = (req: Request) => (req.user ? Number(req.user.id) : 0);

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed request body.' });
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
