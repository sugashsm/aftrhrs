import { DatabaseSync, type StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');
export const dbPath = () => {
  const p = process.env.DATABASE_PATH || './data/aftrhrs.db';
  return p === ':memory:' ? p : path.resolve(ROOT, p);
};

type Param = string | number | null | bigint;
type Params = Param[] | [Record<string, Param>];
export type Row = Record<string, any>;

let db: DatabaseSync;
const cache = new Map<string, StatementSync>();

export function openDb(file = dbPath()) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  cache.clear();
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;');
  migrate();
  return db;
}

function stmt(sql: string) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

export const all = <T = Row>(sql: string, ...params: Params): T[] => stmt(sql).all(...(params as any[])) as T[];
export const get = <T = Row>(sql: string, ...params: Params): T | undefined => stmt(sql).get(...(params as any[])) as T | undefined;
export const run = (sql: string, ...params: Params) => {
  const r = stmt(sql).run(...(params as any[]));
  return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
};
export const exec = (sql: string) => db.exec(sql);

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Applies every .sql file in server/migrations exactly once, in filename order. */
function migrate() {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.resolve(here, '../migrations');
  const applied = new Set(all<{ name: string }>('SELECT name FROM _migrations').map((r) => r.name));
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    tx(() => {
      db.exec(sql);
      run('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', file, now());
    });
    if (process.env.NODE_ENV !== 'test') console.log(`[db] applied migration ${file}`);
  }
}

export const now = () => new Date().toISOString();
export const json = <T>(s: string | null | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};
