import { executeStatements } from './execute-statements'

export const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT,
    avatar TEXT,
    phone_number TEXT,
    date_of_birth TEXT,
    role TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    settings TEXT NOT NULL,
    email_settings TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    subject TEXT,
    preview TEXT,
    body TEXT,
    timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    unread INTEGER DEFAULT 1 NOT NULL,
    read INTEGER DEFAULT 0 NOT NULL,
    status TEXT,
    attachments TEXT,
    labels TEXT,
    is_draft INTEGER DEFAULT 0 NOT NULL,
    thread_id TEXT,
    folder TEXT,
    priority TEXT,
    cc TEXT,
    bcc TEXT
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)',
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
