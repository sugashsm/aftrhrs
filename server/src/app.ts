import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './db';
import { errorHandler, HttpError } from './http';
import { auth } from './routes/auth';
import { users } from './routes/users';
import { drops } from './routes/drops';
import { music } from './routes/music';
import { community } from './routes/community';
import { ai } from './routes/ai';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.mzstatic.com'],
          mediaSrc: ["'self'", 'https://*.itunes.apple.com', 'https://*.apple.com'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '600kb' }));
  app.use(cookieParser());

  // Cross-site requests cannot change state: mutating calls must be same-origin JSON.
  app.use('/api', (req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin) {
        const host = req.get('x-forwarded-host') || req.get('host');
        try {
          if (new URL(origin).host !== host && process.env.NODE_ENV === 'production') return next(new HttpError(403, 'Cross-site request blocked.'));
        } catch {
          return next(new HttpError(403, 'Cross-site request blocked.'));
        }
      }
    }
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'aftrhrs' }));
  for (const r of [auth, users, drops, music, community, ai]) app.use('/api', r);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'That endpoint does not exist.')));

  // Production: serve the built client and let the SPA router handle everything else.
  const dist = path.join(ROOT, 'dist', 'client');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { maxAge: '7d', index: false }));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
  }

  app.use(errorHandler);
  return app;
}
