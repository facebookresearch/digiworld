// Copyright (c) Meta Platforms, Inc. and affiliates.
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import {
  usersTable,
  messagesTable,
  attachmentsTable,
  groupMembersTable,
  groupMessagesTable,
  groupsTable,
  chatSettingsTable,
  callHistoryTable,
  appStateTable,
} from '../db/schema'

const schema = {
  usersTable,
  messagesTable,
  attachmentsTable,
  groupMembersTable,
  groupMessagesTable,
  groupsTable,
  chatSettingsTable,
  callHistoryTable,
  appStateTable,
}

// Path where developer places the extracted message.db
export const ORIGINAL_DB_PATH = path.resolve(__dirname, './message.db')

if (!fs.existsSync(ORIGINAL_DB_PATH)) {
  throw new Error(
    `Fixture database file not found at ${ORIGINAL_DB_PATH}.\n` +
      'Copy the extracted message.db alongside apps/message or update ORIGINAL_DB_PATH.',
  )
}

// Work on a throw-away copy inside src/__tests__/temp so they stay out of git.
const TEMP_DIR = path.resolve(__dirname, 'temp')
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

const TEMP_DB_PATH = path.join(TEMP_DIR, `message_test_${Date.now()}.db`)
fs.copyFileSync(ORIGINAL_DB_PATH, TEMP_DB_PATH)

const sqlite = new Database(TEMP_DB_PATH)

// Helper function to add column if it doesn't exist
function addColumnIfNotExists(
  tableName: string,
  columnName: string,
  columnDef: string,
) {
  try {
    // Check if column exists by querying table info
    const tableInfo = sqlite
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as { name: string }[]
    const columnExists = tableInfo.some(col => col.name === columnName)

    if (!columnExists) {
      try {
        sqlite.exec(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`,
        )
        console.log(`Added ${columnName} column to ${tableName} table`)
      } catch (alterError: any) {
        // Column might have been added by another process, ignore duplicate column errors
        if (!alterError?.message?.includes('duplicate column')) {
          console.log(
            `Error adding ${columnName} column to ${tableName}:`,
            alterError,
          )
        }
      }
    }
  } catch (error: any) {
    // Table might not exist, which is fine - we'll handle that separately
    if (!error?.message?.includes('no such table')) {
      console.log(`Error checking ${columnName} column in ${tableName}:`, error)
    }
  }
}

// Create missing tables if they don't exist and ensure schema is up to date
function ensureTablesExist() {
  try {
    // Check if groups table exists
    const groupsTableExists = sqlite
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='groups'
    `,
      )
      .get()

    if (!groupsTableExists) {
      console.log('Creating missing groups table...')
      try {
        sqlite.exec(`
          CREATE TABLE groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            avatar_url TEXT,
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            is_active INTEGER NOT NULL DEFAULT 1,
            deleted_by TEXT
          )
        `)

        // Insert some test groups
        const insertGroup = sqlite.prepare(`
          INSERT INTO groups (id, name, description, created_by, created_at, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        insertGroup.run(
          'group1',
          'Test Group 1',
          'A test group',
          'user1',
          Math.floor(Date.now() / 1000),
          1,
        )
        insertGroup.run(
          'group2',
          'Test Group 2',
          'Another test group',
          'user2',
          Math.floor(Date.now() / 1000),
          1,
        )

        console.log('Groups table created and populated with test data')
      } catch (error) {
        console.log('Error creating groups table:', error)
      }
    } else {
      // Table exists, ensure deleted_by column exists
      addColumnIfNotExists('groups', 'deleted_by', 'TEXT')
    }

    // Ensure messages table has deleted_by column
    const messagesTableExists = sqlite
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='messages'
    `,
      )
      .get()
    if (messagesTableExists) {
      addColumnIfNotExists('messages', 'deleted_by', 'TEXT')
    }

    // Ensure group_messages table has deleted_by column
    const groupMessagesTableExists = sqlite
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='group_messages'
    `,
      )
      .get()
    if (groupMessagesTableExists) {
      addColumnIfNotExists('group_messages', 'deleted_by', 'TEXT')
    }

    // Ensure group_members table has exited_at column
    const groupMembersTableExists = sqlite
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='group_members'
    `,
      )
      .get()
    if (groupMembersTableExists) {
      addColumnIfNotExists('group_members', 'exited_at', 'INTEGER')
    }

    // Always check if groups table has data, regardless of whether we just created it
    try {
      const groupCount = sqlite
        .prepare('SELECT COUNT(*) as count FROM groups')
        .get() as { count: number }

      if (groupCount.count === 0) {
        console.log(
          'Groups table exists but is empty, populating with test data...',
        )

        // Insert some test groups
        const insertGroup = sqlite.prepare(`
          INSERT INTO groups (id, name, description, created_by, created_at, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        insertGroup.run(
          'group1',
          'Test Group 1',
          'A test group',
          'user1',
          Math.floor(Date.now() / 1000),
          1,
        )
        insertGroup.run(
          'group2',
          'Test Group 2',
          'Another test group',
          'user2',
          Math.floor(Date.now() / 1000),
          1,
        )

        console.log('Groups table populated with test data')
      }
    } catch (error) {
      console.log('Error checking/inserting groups data:', error)
    }
  } catch (error) {
    console.log('Error in ensureTablesExist:', error)
  }
}

// Only ensure tables exist once
let tablesEnsured = false
if (!tablesEnsured) {
  ensureTablesExist()
  tablesEnsured = true
}

export const db = drizzle(sqlite, {
  schema: {
    usersTable,
    messagesTable,
    attachmentsTable,
    groupMembersTable,
    groupMessagesTable,
    groupsTable,
    chatSettingsTable,
    callHistoryTable,
    appStateTable,
  },
})

type TableName = keyof typeof schema

export async function getSingleId<T extends TableName>(
  tableName: T,
): Promise<string> {
  const table = schema[tableName]
  const row = await db
    .select({ id: (table as any).id })
    .from(table)
    .limit(1)
    .execute()

  return row[0]?.id ?? 'default-id'
}

export function cleanup() {
  sqlite.close()
  fs.unlinkSync(TEMP_DB_PATH)
}

// Simple test to prevent "no tests" error
describe('dbTestEnv', () => {
  test('should provide database environment', () => {
    expect(db).toBeDefined()
    expect(typeof getSingleId).toBe('function')
    expect(typeof cleanup).toBe('function')
  })
})
