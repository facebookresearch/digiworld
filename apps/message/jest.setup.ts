// Copyright (c) Meta Platforms, Inc. and affiliates.
/*
 * Global Jest setup for the @andojo/message package.
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

// Minimal schema – ONLY the columns referenced in src/db/queries.ts and src/db/mutations.ts
// Keep it simple: no FKs / constraints that aren't essential for logic under test.
const ddl = `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  last_logged_in INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  is_read INTEGER NOT NULL DEFAULT 0,
  is_delivered INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  file_type TEXT,
  file_path TEXT,
  preview TEXT
);

CREATE TABLE group_members (
  group_id TEXT,
  user_id TEXT,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  sender_id TEXT,
  message_type TEXT,
  content TEXT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  is_read_by TEXT,
  is_delivered_to TEXT
);

CREATE TABLE chat_settings (
  user_id TEXT PRIMARY KEY,
  font_size TEXT NOT NULL DEFAULT 'medium',
  wallpaper TEXT,
  notification_tone TEXT
);

CREATE TABLE call_history (
  id TEXT PRIMARY KEY,
  caller_id TEXT,
  receiver_id TEXT,
  call_type TEXT,
  duration INTEGER,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  was_missed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE app_state (
  user_id TEXT PRIMARY KEY,
  last_screen TEXT,
  last_opened_timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  scroll_positions TEXT
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
export { db, sqlite }
