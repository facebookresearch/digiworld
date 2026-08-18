// Copyright (c) Meta Platforms, Inc. and affiliates.
import { executeStatements } from './execute-statements'
import { getSqlite } from '../index'

const CREATE_TABLES = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    last_logged_in INTEGER NOT NULL DEFAULT 0
  )`,

  // Groups table
  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    is_active INTEGER NOT NULL DEFAULT 1,
    deleted_by TEXT
  )`,

  // Messages table
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    is_read INTEGER NOT NULL DEFAULT 0,
    is_delivered INTEGER NOT NULL DEFAULT 0,
    deleted_by TEXT
  )`,

  // Attachments table
  `CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT,
    file_type TEXT,
    file_path TEXT,
    preview TEXT
  )`,

  // Group members table
  `CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    exited_at INTEGER,
    PRIMARY KEY (group_id, user_id)
  )`,

  // Group messages table
  `CREATE TABLE IF NOT EXISTS group_messages (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    sender_id TEXT,
    message_type TEXT,
    content TEXT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    is_read_by TEXT,
    is_delivered_to TEXT,
    deleted_by TEXT
  )`,

  // Chat settings table
  `CREATE TABLE IF NOT EXISTS chat_settings (
    user_id TEXT PRIMARY KEY,
    font_size TEXT NOT NULL DEFAULT 'medium',
    wallpaper TEXT,
    notification_tone TEXT
  )`,

  // Call history table
  `CREATE TABLE IF NOT EXISTS call_history (
    id TEXT PRIMARY KEY,
    caller_id TEXT,
    receiver_id TEXT,
    call_type TEXT,
    duration INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    was_missed INTEGER NOT NULL DEFAULT 0
  )`,

  // App state table
  `CREATE TABLE IF NOT EXISTS app_state (
    user_id TEXT PRIMARY KEY,
    last_screen TEXT,
    last_opened_timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    scroll_positions TEXT
  )`,
]

// Create indexes for better query performance
const CREATE_INDEXES = [
  // Indexes for messages table
  `CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_deleted_by ON messages(deleted_by) WHERE deleted_by IS NOT NULL`,

  // Indexes for group_messages table
  `CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_messages_timestamp ON group_messages(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_group_messages_deleted_by ON group_messages(deleted_by) WHERE deleted_by IS NOT NULL`,

  // Indexes for group_members table
  `CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_members_exited_at ON group_members(exited_at) WHERE exited_at IS NOT NULL`,

  // Indexes for groups table
  `CREATE INDEX IF NOT EXISTS idx_groups_deleted_by ON groups(deleted_by) WHERE deleted_by IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by)`,
]

// Migration to add new columns to existing tables (only for databases created before these columns were added)
const ADD_COLUMNS = [
  `ALTER TABLE messages ADD COLUMN deleted_by TEXT`,
  `ALTER TABLE group_messages ADD COLUMN deleted_by TEXT`,
  `ALTER TABLE group_members ADD COLUMN exited_at INTEGER`,
  `ALTER TABLE groups ADD COLUMN deleted_by TEXT`,
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)

    // Get fresh instance to avoid using stale closed connection
    const sqlite = getSqlite()
    for (const statement of ADD_COLUMNS) {
      try {
        await sqlite.execAsync(statement)
        console.log('Successfully executed migration:', statement)
      } catch (error: any) {
        // Column might already exist (if table was created with CREATE_TABLES that includes the column)
        // or if it was added in a previous migration
        const errorMessage = error?.message || String(error) || ''
        const isDuplicateColumn =
          errorMessage.includes('duplicate column') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate column name')

        if (isDuplicateColumn) {
          console.log('Column already exists:', statement)
        } else {
          // Log actual errors that need attention
          console.error('Failed to execute migration:', statement, error)
          // Don't throw - continue with other migrations
        }
      }
    }

    // Create indexes for better query performance
    await executeStatements(CREATE_INDEXES)

    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
