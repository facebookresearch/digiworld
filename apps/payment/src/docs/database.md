<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Payment Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation in our Expo-based payment application. The database is structured around four main entities: Users, Wallets, Transactions, and Contacts.

## Database Architecture

### Configuration

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojopay.db');
export const db = drizzle(sqlite);
```

### Schema Design

#### Users Table

Stores user account information and payment settings.

```typescript
export const usersTable = sqliteTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  pin: text('pin').notNull(),
  pinAttempts: int('pin_attempts').notNull().default(0),
  pinLockedUntil: text('pin_locked_until'),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  phoneNumber: text('phoneNumber').notNull().unique(),
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
});
```

Field descriptions:

| Field          | Type      | Description                                       |
| -------------- | --------- | ------------------------------------------------- |
| id             | integer   | Primary key, auto-incrementing identifier         |
| email          | text      | Unique email address for login and communications |
| password       | text      | Hashed password for authentication                |
| pin            | text      | Encrypted PIN for payment authorization           |
| pinAttempts    | integer   | Number of failed PIN attempts                     |
| pinLockedUntil | text      | Timestamp until PIN unlock (if locked)            |
| firstName      | text      | User's first name                                 |
| lastName       | text      | User's last name                                  |
| phoneNumber    | text      | Unique phone number for account                   |
| createdAt      | timestamp | Account creation timestamp                        |
| updatedAt      | timestamp | Last update timestamp                             |
| settings       | text      | User preferences as JSON                          |
| status         | text      | Account status (active/inactive/suspended)        |
| kycVerified    | integer   | Whether KYC verification is complete              |
| dailyLimit     | real      | Daily transaction limit                           |
| monthlyLimit   | real      | Monthly transaction limit                         |

#### Wallets Table

Digital wallets for holding funds.

```typescript
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
});
```

Field descriptions:

| Field     | Type      | Description                               |
| --------- | --------- | ----------------------------------------- |
| id        | integer   | Primary key, auto-incrementing identifier |
| userId    | integer   | Foreign key to users table                |
| balance   | real      | Current wallet balance                    |
| currency  | text      | Currency code (e.g., USD)                 |
| type      | text      | Wallet type (personal/business)           |
| status    | text      | Wallet status (active/frozen/closed)      |
| createdAt | timestamp | Wallet creation timestamp                 |
| updatedAt | timestamp | Last update timestamp                     |

#### Transactions Table

Records of all financial transactions.

```typescript
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
});
```

Field descriptions:

| Field            | Type      | Description                                    |
| ---------------- | --------- | ---------------------------------------------- |
| id               | integer   | Primary key, auto-incrementing identifier      |
| senderWalletId   | integer   | Foreign key to sender's wallet                 |
| receiverWalletId | integer   | Foreign key to receiver's wallet               |
| amount           | real      | Transaction amount                             |
| currency         | text      | Transaction currency                           |
| status           | text      | Transaction status (pending/completed/failed)  |
| type             | text      | Transaction type (transfer/deposit/withdrawal) |
| pinVerified      | integer   | Whether PIN verification is complete           |
| pinVerifiedAt    | text      | When PIN was verified                          |
| reference        | text      | Transaction reference number                   |
| description      | text      | Transaction description/note                   |
| createdAt        | timestamp | Transaction creation timestamp                 |
| updatedAt        | timestamp | Last update timestamp                          |

#### Contacts Table

Saved payment contacts for quick transfers.

```typescript
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
});
```

Field descriptions:

| Field         | Type      | Description                               |
| ------------- | --------- | ----------------------------------------- |
| id            | integer   | Primary key, auto-incrementing identifier |
| userId        | integer   | Foreign key to users table                |
| contactUserId | integer   | Foreign key to contact's user record      |
| nickname      | text      | Custom name for contact                   |
| favorite      | integer   | Whether contact is favorited              |
| createdAt     | timestamp | Contact creation timestamp                |
| updatedAt     | timestamp | Last update timestamp                     |

## Database Operations

### Query Examples

```typescript
// Get user by email
const user = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .get();

// Get user's active wallets
const wallets = await db
  .select()
  .from(walletsTable)
  .where(
    and(eq(walletsTable.userId, userId), eq(walletsTable.status, 'active')),
  )
  .all();

// Get transaction history
const transactions = await db
  .select()
  .from(transactionsTable)
  .where(
    or(
      eq(transactionsTable.senderWalletId, walletId),
      eq(transactionsTable.receiverWalletId, walletId),
    ),
  )
  .orderBy(desc(transactionsTable.createdAt))
  .all();
```

## Best Practices

1. **Data Integrity**

   - Use foreign key constraints
   - Implement cascading deletes where appropriate
   - Validate data before insertion

2. **Performance**

   - Index frequently queried columns
   - Use appropriate data types
   - Optimize complex queries

3. **Security**

   - Implement rate limiting for PIN attempts
   - Enforce transaction limits
   - Validate all financial calculations
   - Implement proper access controls

4. **Maintenance**
   - Regular backups
   - Schema versioning
   - Transaction log archival
   - Regular balance reconciliation

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
