// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

// Users table
export const usersTable = sqliteTable('users', {
  id: text().primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  name: text(),
  avatarUrl: text('avatar_url'),
  lastLoggedIn: integer('last_logged_in').notNull().default(0),
})

// Groups table
export const groupsTable = sqliteTable('groups', {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  avatarUrl: text('avatar_url'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`strftime('%s','now')`),
  isActive: integer('is_active').notNull().default(1),
  deletedBy: text('deleted_by'), // comma-separated user_ids who deleted this group
})

// Messages table
export const messagesTable = sqliteTable('messages', {
  id: text().primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  messageType: text('message_type').notNull(),
  content: text(),
  timestamp: integer('timestamp')
    .notNull()
    .default(sql`strftime('%s','now')`),
  isRead: integer('is_read').notNull().default(0),
  isDelivered: integer('is_delivered').notNull().default(0),
  deletedBy: text('deleted_by'), // comma-separated user_ids who deleted this message
})

// Attachments table
export const attachmentsTable = sqliteTable('attachments', {
  id: text().primaryKey(),
  messageId: text('message_id'),
  fileType: text('file_type'),
  filePath: text('file_path'),
  preview: text(),
})

// Group members table
export const groupMembersTable = sqliteTable(
  'group_members',
  {
    groupId: text('group_id'),
    userId: text('user_id'),
    exitedAt: integer('exited_at'), // Unix timestamp when user exited, null if still active
  },
  table => [primaryKey({ columns: [table.groupId, table.userId] })],
)

// Group messages table
export const groupMessagesTable = sqliteTable('group_messages', {
  id: text().primaryKey(),
  groupId: text('group_id'),
  senderId: text('sender_id'),
  messageType: text('message_type'),
  content: text(),
  timestamp: integer('timestamp')
    .notNull()
    .default(sql`strftime('%s','now')`),
  isReadBy: text('is_read_by'), // comma-separated user_ids
  isDeliveredTo: text('is_delivered_to'), // comma-separated user_ids
  deletedBy: text('deleted_by'), // comma-separated user_ids who deleted this message
})

// Chat settings table
export const chatSettingsTable = sqliteTable('chat_settings', {
  userId: text('user_id').primaryKey(),
  fontSize: text('font_size').notNull().default('medium'),
  wallpaper: text(),
  notificationTone: text('notification_tone'),
})

// Call history table
export const callHistoryTable = sqliteTable('call_history', {
  id: text().primaryKey(),
  callerId: text('caller_id'),
  receiverId: text('receiver_id'),
  callType: text('call_type'),
  duration: integer(),
  timestamp: integer('timestamp')
    .notNull()
    .default(sql`strftime('%s','now')`),
  wasMissed: integer('was_missed').notNull().default(0),
})

// App state table
export const appStateTable = sqliteTable('app_state', {
  userId: text('user_id').primaryKey(),
  lastScreen: text('last_screen'),
  lastOpenedTimestamp: integer('last_opened_timestamp')
    .notNull()
    .default(sql`strftime('%s','now')`),
  scrollPositions: text('scroll_positions'),
})

// Foreign key relationships
export const groupsRelations = relations(groupsTable, ({ many }) => ({
  members: many(groupMembersTable),
  messages: many(groupMessagesTable),
}))

export const groupMembersRelations = relations(
  groupMembersTable,
  ({ one }) => ({
    group: one(groupsTable, {
      fields: [groupMembersTable.groupId],
      references: [groupsTable.id],
    }),
    user: one(usersTable, {
      fields: [groupMembersTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export const groupMessagesRelations = relations(
  groupMessagesTable,
  ({ one }) => ({
    group: one(groupsTable, {
      fields: [groupMessagesTable.groupId],
      references: [groupsTable.id],
    }),
    sender: one(usersTable, {
      fields: [groupMessagesTable.senderId],
      references: [usersTable.id],
    }),
  }),
)

export const usersRelations = relations(usersTable, ({ many }) => ({
  groupMembers: many(groupMembersTable),
  sentGroupMessages: many(groupMessagesTable),
}))
