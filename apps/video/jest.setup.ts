/*
 * Global Jest setup for the @andojo/video package.
 *
 * 1. Creates an in-memory SQLite database using `better-sqlite3`.
 * 2. Boots Drizzle ORM against that DB so production query code can run unmodified.
 * 3. Runs minimal DDL needed for the unit-tests.
 * 4. Re-exports the DB instance & injects it via `jest.mock('@/db/index')`,
 *    so all imports of `db`/`sqlite` inside production code point to the test DB.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
// @ts-ignore – dev-dep only available when running tests

// Create memory database
const sqlite = new Database(':memory:')
// enforce FKs like in prod
sqlite.pragma('foreign_keys = ON')

// Minimal schema – ONLY the columns referenced in src/db/queries.ts
// Keep it simple: no FKs / constraints that aren’t essential for logic under test.
const ddl = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT,
  name TEXT
);

CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  description TEXT,
  subscriber_count INTEGER DEFAULT 0
);

CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  visibility TEXT DEFAULT 'public',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  description TEXT,
  is_public INTEGER DEFAULT 0
);

CREATE TABLE playlist_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER,
  video_id INTEGER
);

CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  video_id INTEGER
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER,
  user_id INTEGER,
  content TEXT,
  parent_id INTEGER,
  reply_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  video_id INTEGER,
  watched_at TEXT,
  UNIQUE(user_id, video_id)
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  channel_id INTEGER
);
`

// Execute all statements (split on ';\n') – ignore empty strings after split
for (const stmt of ddl.split(/;\s*\n/)) {
  const sql = stmt.trim()
  if (sql) {
    sqlite.prepare(sql).run()
  }
}

// 3️⃣  Boot Drizzle
const db = drizzle(sqlite)

// 4️⃣  Provide the mock BEFORE tests import production code
jest.doMock('@/db/index', () => ({ db, sqlite }))

// Re-export for test files that may need to run raw SQL
export { db }

// 5️⃣  Global helper to reset all tables before every test file runs
beforeEach(() => {
  const tables = [
    'users',
    'channels',
    'videos',
    'playlists',
    'playlist_videos',
    'likes',
    'comments',
    'history',
    'subscriptions',
  ]
  for (const t of tables) {
    sqlite.prepare(`DELETE FROM ${t}`).run()
  }
})
