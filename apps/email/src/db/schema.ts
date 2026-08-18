import { sqliteTable, int, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Define the user schema
export const usersTable = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  password: text().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  displayName: text('display_name'),
  avatar: text(),
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'),
  role: text(),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  settings: text('settings').notNull(),
  emailSettings: text('email_settings').notNull(),
})

export const emailsTable = sqliteTable('emails', {
  id: int().primaryKey({ autoIncrement: true }),
  sender: text().notNull(),
  receiver: text().notNull(),
  subject: text(),
  preview: text(),
  body: text(),
  timestamp: text('timestamp')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  unread: integer('unread').notNull().default(1),
  read: integer('read').notNull().default(0),
  status: text(),
  attachments: text(),
  labels: text(),
  isDraft: integer('is_draft').notNull().default(0),
  threadId: text('thread_id'),
  folder: text(),
  priority: text(),
  cc: text(),
  bcc: text(),
})

// Add type interfaces for settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  twoFactorEnabled: boolean
}

export interface EmailSettings {
  signature?: string
  emailsPerPage: number
  autoReadReceipts: boolean
  defaultReplyTo?: string
  vacationAutoReplyEnabled: boolean
  vacationAutoReplyMessage?: string
}

// Helper functions for settings serialization
export function serializeSettings(
  settings: UserSettings | EmailSettings,
): string {
  return JSON.stringify(settings)
}

export function deserializeSettings<T>(settings: string): T {
  return JSON.parse(settings) as T
}
