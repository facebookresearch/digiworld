import type { UserSettings } from '@/models/types'
import { sql } from 'drizzle-orm'
import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  pin: text('pin').notNull(),
  pinAttempts: int('pin_attempts').notNull().default(0),
  pinLockedUntil: text('pin_locked_until'),
  firstName: text('first_name').notNull(), // ✅ fixed alias
  lastName: text('last_name').notNull(), // ✅ fixed alias
  phoneNumber: text('phone_number').notNull().unique(), // ✅ fixed alias
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  settings: text('settings').notNull().default('{}'),
  status: text('status').notNull().default('active'),
  kycVerified: int('kyc_verified').notNull().default(0),
  dailyLimit: real('daily_limit').notNull().default(1000),
  monthlyLimit: real('monthly_limit').notNull().default(20000),
})

// Define the wallet schema
export const walletsTable = sqliteTable('wallets', {
  id: int('id').primaryKey({ autoIncrement: true }),
  userId: int('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  type: text('type').notNull().default('personal'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Define the transaction schema
export const transactionsTable = sqliteTable('transactions', {
  id: int('id').primaryKey({ autoIncrement: true }),
  senderWalletId: int('sender_wallet_id')
    .notNull()
    .references(() => walletsTable.id, { onDelete: 'cascade' }),
  receiverWalletId: int('receiver_wallet_id')
    .notNull()
    .references(() => walletsTable.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  type: text('type').notNull(),
  pinVerified: int('pin_verified').notNull().default(0),
  pinVerifiedAt: text('pin_verified_at'),
  reference: text('reference'),
  description: text('description'),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Define the contacts schema
export const contactsTable = sqliteTable('contacts', {
  id: int('id').primaryKey({ autoIncrement: true }),
  userId: int('user_id').notNull(),
  contactUserId: int('contact_user_id').notNull(),
  nickname: text('nickname'),
  favorite: int('favorite').notNull().default(0),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
})

// Helper functions for settings serialization
export function serializeSettings(settings: UserSettings): string {
  return JSON.stringify(settings)
}

export function deserializeSettings<T>(settings: string): T {
  return JSON.parse(settings) as T
}
