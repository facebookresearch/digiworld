<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Message App Database Documentation

## Overview
The Message App uses SQLite as its local database with Drizzle ORM for type-safe database operations. The database schema is designed to support a comprehensive messaging application with features including direct messages, group chats, file attachments, call history, user preferences, and the in-app contact directory used by chat and group flows.

## Database Schema

### Core Tables

#### 1. Users Table (`users`)
Stores user account information and profile data. This table also powers the app's database-driven contact list, direct chat entry, and group member selection flows.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique user identifier |
| `phone_number` | TEXT | UNIQUE, NOT NULL | User's phone number |
| `name` | TEXT | | User's display name |
| `avatar_url` | TEXT | | URL to user's profile picture |
| `last_logged_in` | INTEGER | NOT NULL, DEFAULT 0 | Unix timestamp of last login |

**Sample Data:**
```json
{
  "id": "1",
  "phoneNumber": "+15551234567",
  "name": "Alice Smith",
  "avatarUrl": "https://randomuser.me/api/portraits/women/1.jpg",
  "lastLoggedIn": 1718000000
}
```

#### 2. Messages Table (`messages`)
Stores individual direct messages between users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique message identifier |
| `sender_id` | TEXT | NOT NULL | ID of message sender |
| `receiver_id` | TEXT | NOT NULL | ID of message recipient |
| `message_type` | TEXT | NOT NULL | Type: "text", "image", "video", "audio", "document" |
| `content` | TEXT | | Message content or description |
| `timestamp` | INTEGER | NOT NULL, DEFAULT now | Unix timestamp of message |
| `is_read` | INTEGER | NOT NULL, DEFAULT 0 | Read status (0/1) |
| `is_delivered` | INTEGER | NOT NULL, DEFAULT 0 | Delivery status (0/1) |

**Sample Data:**
```json
{
  "id": "msg1",
  "senderId": "1",
  "receiverId": "2",
  "messageType": "text",
  "content": "Hey Bob! How are you doing?",
  "timestamp": 1718000000,
  "isRead": 1,
  "isDelivered": 1
}
```

#### 3. Group Messages Table (`group_messages`)
Stores messages sent to group chats.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique group message identifier |
| `group_id` | TEXT | | Group identifier |
| `sender_id` | TEXT | | ID of message sender |
| `message_type` | TEXT | | Type: "text", "image", "video", "audio", "document" |
| `content` | TEXT | | Message content or description |
| `timestamp` | INTEGER | NOT NULL, DEFAULT now | Unix timestamp of message |
| `is_read_by` | TEXT | | Comma-separated list of user IDs who read the message |
| `is_delivered_to` | TEXT | | Comma-separated list of user IDs who received the message |

**Sample Data:**
```json
{
  "id": "gmsg1",
  "groupId": "group1",
  "senderId": "1",
  "messageType": "text",
  "content": "Hey everyone! How's the weekend going?",
  "timestamp": 1718000000,
  "isReadBy": "1,2,3",
  "isDeliveredTo": "1,2,3"
}
```

#### 4. Group Members Table (`group_members`)
Manages membership of users in group chats.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `group_id` | TEXT | NOT NULL | Group identifier |
| `user_id` | TEXT | NOT NULL | User identifier |
| PRIMARY KEY | | (group_id, user_id) | Composite primary key |

**Sample Data:**
```json
{
  "groupId": "group1",
  "userId": "1"
}
```

#### 5. Attachments Table (`attachments`)
Stores file attachments associated with messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique attachment identifier |
| `message_id` | TEXT | | Associated message ID |
| `file_type` | TEXT | | Type: "image", "video", "audio", "document" |
| `file_path` | TEXT | | Local file path |
| `preview` | TEXT | | Base64 encoded preview or thumbnail |

**Sample Data:**
```json
{
  "id": "att1",
  "messageId": "msg5",
  "fileType": "image",
  "filePath": "/uploads/images/vacation_photo.jpg",
  "preview": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

### User Preferences & Settings

#### 6. Chat Settings Table (`chat_settings`)
Stores user-specific chat preferences and customization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | TEXT | PRIMARY KEY | User identifier |
| `font_size` | TEXT | NOT NULL, DEFAULT 'medium' | Font size preference |
| `wallpaper` | TEXT | | Custom chat wallpaper path |
| `notification_tone` | TEXT | | Custom notification sound file |

**Sample Data:**
```json
{
  "userId": "1",
  "fontSize": "medium",
  "wallpaper": "/wallpapers/default.jpg",
  "notificationTone": "default.mp3"
}
```

### Call Management

#### 7. Call History Table (`call_history`)
Tracks voice and video call history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique call identifier |
| `caller_id` | TEXT | | ID of person who initiated the call |
| `receiver_id` | TEXT | | ID of person who received the call |
| `call_type` | TEXT | | Type: "voice", "video" |
| `duration` | INTEGER | | Call duration in seconds |
| `timestamp` | INTEGER | NOT NULL, DEFAULT now | Unix timestamp of call |
| `was_missed` | INTEGER | NOT NULL, DEFAULT 0 | Whether call was missed (0/1) |

**Sample Data:**
```json
{
  "id": "call1",
  "callerId": "1",
  "receiverId": "2",
  "callType": "voice",
  "duration": 180,
  "timestamp": 1718000000,
  "wasMissed": 0
}
```

### Application State

#### 8. App State Table (`app_state`)
Tracks user's application state and navigation history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | TEXT | PRIMARY KEY | User identifier |
| `last_screen` | TEXT | | Last screen user was on |
| `last_opened_timestamp` | INTEGER | NOT NULL, DEFAULT now | Last app open timestamp |
| `scroll_positions` | TEXT | | JSON string of scroll positions for different screens |

**Sample Data:**
```json
{
  "userId": "1",
  "lastScreen": "chat_list",
  "lastOpenedTimestamp": 1718000000,
  "scrollPositions": "{\"chat_list\": 0, \"messages\": 150}"
}
```


## Database Relationships

### One-to-Many Relationships
- **Users → Messages**: A user can send/receive multiple messages
- **Users → Group Messages**: A user can send multiple group messages
- **Messages → Attachments**: A message can have multiple attachments
- **Users → Call History**: A user can have multiple call records

### Many-to-Many Relationships
- **Users ↔ Groups**: Users can be members of multiple groups, groups can have multiple users (via `group_members` table)

## Data Types

### Message Types
- `text`: Plain text messages
- `image`: Image files (JPEG, PNG, etc.)
- `video`: Video files (MP4, MOV, etc.)
- `audio`: Audio files (MP3, M4A, etc.)
- `document`: Document files (PDF, DOC, etc.)

### Call Types
- `voice`: Voice-only calls
- `video`: Video calls

### Font Sizes
- `small`: Small font size
- `medium`: Medium font size (default)
- `large`: Large font size

## Indexes and Performance

### Primary Keys
- All tables use TEXT primary keys for flexibility
- Composite primary key on `group_members` table

### Foreign Key Relationships
- `messages.sender_id` → `users.id`
- `messages.receiver_id` → `users.id`
- `group_messages.sender_id` → `users.id`
- `attachments.message_id` → `messages.id`
- `call_history.caller_id` → `users.id`
- `call_history.receiver_id` → `users.id`

## Migration Strategy

The database uses a simple migration system that:
1. Creates tables if they don't exist
2. Uses `CREATE TABLE IF NOT EXISTS` for safe migrations
3. Maintains backward compatibility

## Data Integrity

### Constraints
- Phone numbers must be unique across users
- Message timestamps default to current time
- Read/delivered status defaults to 0 (false)
- Font size defaults to 'medium'
- Call duration defaults to 0 for missed calls

### Validation Rules
- User IDs must exist in users table before being referenced
- Message types must be valid predefined values
- Call types must be either 'voice' or 'video'
- Timestamps should be valid Unix timestamps

## Backup and Recovery

### Data Export
All data can be exported as JSON files for backup purposes:
- `users.json`: User profiles
- `messages.json`: Direct messages
- `group_messages.json`: Group chat messages
- `attachments.json`: File attachments
- `call_history.json`: Call records
- `chat_settings.json`: User preferences
- `app_state.json`: Application state

### Import Strategy
The mock data files can be used to populate the database during development and testing phases.
