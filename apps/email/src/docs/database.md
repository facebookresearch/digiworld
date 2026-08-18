# Email Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation in our Expo-based email application.

## Database Architecture

### Configuration

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojoemail.db');
export const db = drizzle(sqlite);
```

### Schema Design

#### Users Table

Stores user account information and email preferences.

```typescript
export const usersTable = sqliteTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  displayName: text('display_name'),
  avatar: text('avatar'),
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  settings: text('settings').notNull().default('{}'),
  emailSettings: text('email_settings').notNull().default('{}'),
});
```

Field descriptions:

| Field         | Type      | Description                                       |
| ------------- | --------- | ------------------------------------------------- |
| id            | integer   | Primary key, auto-incrementing identifier         |
| email         | text      | Unique email address for login and communications |
| password      | text      | Hashed password for authentication                |
| firstName     | text      | User's first name                                 |
| lastName      | text      | User's last name                                  |
| displayName   | text      | Optional display name for emails                  |
| avatar        | text      | URL to user's profile image                       |
| phoneNumber   | text      | Optional contact number                           |
| dateOfBirth   | text      | User's date of birth                              |
| role          | text      | User role (user/admin)                            |
| createdAt     | timestamp | Account creation timestamp                        |
| settings      | text      | User preferences as JSON                          |
| emailSettings | text      | Email-specific settings as JSON                   |

#### Emails Table

Stores email messages and their metadata.

```typescript
export const emailsTable = sqliteTable('emails', {
  id: int('id').primaryKey({ autoIncrement: true }),
  sender: text('sender').notNull(),
  receiver: text('receiver').notNull(),
  subject: text('subject').notNull(),
  preview: text('preview'),
  body: text('body').notNull(),
  timestamp: text('timestamp')
    .default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .notNull(),
  unread: int('unread').notNull().default(1),
  read: int('read').notNull().default(0),
  status: text('status').notNull().default('received'),
  attachments: text('attachments').notNull().default('[]'),
  labels: text('labels').notNull().default('[]'),
  isDraft: int('is_draft').notNull().default(0),
  threadId: text('thread_id'),
  folder: text('folder').notNull().default('inbox'),
  priority: text('priority').notNull().default('normal'),
  cc: text('cc').notNull().default('[]'),
  bcc: text('bcc').notNull().default('[]'),
});
```

Field descriptions:

| Field       | Type      | Description                               |
| ----------- | --------- | ----------------------------------------- |
| id          | integer   | Primary key, auto-incrementing identifier |
| sender      | text      | Sender's email address                    |
| receiver    | text      | Recipient's email address                 |
| subject     | text      | Email subject line                        |
| preview     | text      | Short preview of email content            |
| body        | text      | Full email content                        |
| timestamp   | timestamp | When email was sent/received              |
| unread      | boolean   | Whether email is unread                   |
| read        | boolean   | Whether email has been read               |
| status      | text      | Email status (draft/sent/etc.)            |
| attachments | text      | List of attachments as JSON               |
| labels      | text      | Applied labels as JSON array              |
| isDraft     | boolean   | Whether email is a draft                  |
| threadId    | text      | ID of the email thread                    |
| folder      | text      | Email folder (inbox/sent/etc.)            |
| priority    | text      | Email priority level                      |
| cc          | text      | Carbon copy recipients                    |
| bcc         | text      | Blind carbon copy recipients              |

### Settings Types

#### User Settings

General user preferences.

```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  twoFactorEnabled: boolean;
}
```

Field descriptions:

| Field            | Type    | Description                             |
| ---------------- | ------- | --------------------------------------- |
| theme            | string  | UI theme preference (light/dark/system) |
| language         | string  | Preferred language code                 |
| notifications    | boolean | Whether notifications are enabled       |
| twoFactorEnabled | boolean | Whether 2FA is enabled                  |

#### Email Settings

Email-specific preferences.

```typescript
interface EmailSettings {
  signature: string;
  emailsPerPage: number;
  autoReadReceipts: boolean;
  defaultReplyTo: string;
  vacationAutoReplyEnabled: boolean;
  vacationAutoReplyMessage: string;
}
```

Field descriptions:

| Field                    | Type    | Description                       |
| ------------------------ | ------- | --------------------------------- |
| signature                | string  | Optional email signature          |
| emailsPerPage            | number  | Number of emails to show per page |
| autoReadReceipts         | boolean | Whether to send read receipts     |
| defaultReplyTo           | string  | Default reply-to address          |
| vacationAutoReplyEnabled | boolean | Whether vacation auto-reply is on |
| vacationAutoReplyMessage | string  | Auto-reply message content        |

## Database Operations

### Thread-Based Operations

**Important:** This application implements Gmail/Outlook-style thread management where most operations affect entire conversations.

For detailed information about thread behavior, see [EMAIL_THREAD_BEHAVIOR.md](./EMAIL_THREAD_BEHAVIOR.md).

#### Thread Operations (from `mutations.ts`)

```typescript
// Delete entire email thread (all emails with same thread_id)
await mutations.deleteEmailThread(threadId)

// Move entire thread to a different folder (archive/trash/etc.)
await mutations.moveEmailThreadToFolder(threadId, 'trash')

// Delete individual email (used ONLY for drafts)
await mutations.deleteEmail(emailId)
```

### Query Examples

```typescript
// Get all emails in a thread (conversation view)
const threadEmails = await db
  .select()
  .from(emailsTable)
  .where(eq(emailsTable.threadId, threadId))
  .orderBy(sql`${emailsTable.timestamp} DESC`)
  .all();

// Get user's emails in a specific folder
const emails = await db
  .select()
  .from(emailsTable)
  .where(
    and(eq(emailsTable.receiver, userEmail), eq(emailsTable.folder, 'inbox')),
  )
  .orderBy(desc(emailsTable.timestamp))
  .all();

// Mark email as read
await db
  .update(emailsTable)
  .set({ read: 1, unread: 0 })
  .where(eq(emailsTable.id, emailId))
  .run();

// Get user settings
const user = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .get();
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

   - Sanitize user inputs
   - Implement proper access controls

4. **Maintenance**
   - Regular backups
   - Schema versioning
   - Data cleanup routines

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
