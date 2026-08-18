<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Video App Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation for the Video App, describing the schema, field details, and relationships.

## Database Architecture

### Configuration Example

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojovideo.db');
export const db = drizzle(sqlite);
```

## Schema Design

### Users Table
Stores user account information and profiles.

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | integer  | Primary key                                 |
| email        | text     | Unique email address                        |
| username     | text     | Unique username                             |
| password     | text     | Hashed password                             |
| avatar       | text     | Profile avatar URL                          |
| bio          | text     | User biography                              |
| createdAt    | text     | Account creation timestamp                  |
| updatedAt    | text     | Last update timestamp                       |
| deletedAt    | text     | Soft delete timestamp                       |

### Channels Table
Represents user channels for content creation.

| Field           | Type     | Description                                 |
| --------------- | -------- | ------------------------------------------- |
| id              | integer  | Primary key                                 |
| userId          | integer  | References users.id                         |
| name            | text     | Channel name                                |
| description     | text     | Channel description                         |
| banner          | text     | Channel banner image URL                    |
| avatar          | text     | Channel avatar URL                          |
| subscriberCount | integer  | Number of subscribers                       |
| createdAt       | text     | Creation timestamp                          |
| updatedAt       | text     | Last update timestamp                       |
| deletedAt       | text     | Soft delete timestamp                       |

### Videos Table
Stores video content and metadata.

| Field             | Type     | Description                                 |
| ----------------- | -------- | ------------------------------------------- |
| id                | integer  | Primary key                                 |
| channelId         | integer  | References channels.id                      |
| title             | text     | Video title                                 |
| description       | text     | Video description                           |
| videoUrl          | text     | Video file URL                              |
| categoryId        | integer  | References video_categories.id              |
| thumbnailUrl      | text     | Thumbnail image URL                         |
| duration          | integer  | Video duration in seconds                   |
| visibility        | text     | 'public', 'private', 'unlisted'             |
| status            | text     | 'active', 'deleted', 'blocked'              |
| viewCount         | integer  | Number of views                             |
| likeCount         | integer  | Number of likes                             |
| commentCount      | integer  | Number of comments                          |
| isCommentsEnabled | boolean  | Comments enabled flag                       |
| createdAt         | text     | Upload timestamp                            |
| updatedAt         | text     | Last update timestamp                       |
| deletedAt         | text     | Soft delete timestamp                       |

### Playlists Table
User-created video playlists.

| Field       | Type     | Description                                 |
| ----------- | -------- | ------------------------------------------- |
| id          | integer  | Primary key                                 |
| userId      | integer  | References users.id                         |
| name        | text     | Playlist name                               |
| description | text     | Playlist description                        |
| isPublic    | boolean  | Public visibility flag                      |
| shuffle     | boolean  | Shuffle mode enabled                        |
| shareUrl    | text     | Shareable URL                               |
| createdAt   | text     | Creation timestamp                          |
| updatedAt   | text     | Last update timestamp                       |
| deletedAt   | text     | Soft delete timestamp                       |

### Comments Table
Video comments and replies.

| Field      | Type     | Description                                 |
| ---------- | -------- | ------------------------------------------- |
| id         | integer  | Primary key                                 |
| videoId    | integer  | References videos.id                        |
| userId     | integer  | References users.id                         |
| parentId   | integer  | References comments.id (for replies)       |
| content    | text     | Comment text                                |
| status     | text     | 'visible', 'hidden'                         |
| isEdited   | boolean  | Edit flag                                   |
| replyCount | integer  | Number of replies                           |
| createdAt  | text     | Creation timestamp                          |
| updatedAt  | text     | Last update timestamp                       |
| deletedAt  | text     | Soft delete timestamp                       |

### Likes Table
Video likes/reactions.

| Field     | Type     | Description                                 |
| --------- | -------- | ------------------------------------------- |
| id        | integer  | Primary key                                 |
| userId    | integer  | References users.id                         |
| videoId   | integer  | References videos.id                        |
| createdAt | text     | Like timestamp                              |

### Subscriptions Table
Channel subscriptions.

| Field     | Type     | Description                                 |
| --------- | -------- | ------------------------------------------- |
| id        | integer  | Primary key                                 |
| userId    | integer  | References users.id                         |
| channelId | integer  | References channels.id                      |
| createdAt | text     | Subscription timestamp                      |

### History Table
User watch history.

| Field     | Type     | Description                                 |
| --------- | -------- | ------------------------------------------- |
| id        | integer  | Primary key                                 |
| userId    | integer  | References users.id                         |
| videoId   | integer  | References videos.id                        |
| watchedAt | text     | Watch timestamp                             |

### Video Categories Table
Video categorization.

| Field       | Type     | Description                                 |
| ----------- | -------- | ------------------------------------------- |
| id          | integer  | Primary key                                 |
| name        | text     | Category name                               |
| description | text     | Category description                        |

### Video Tags Table
Tagging system for videos.

| Field | Type     | Description                                 |
| ----- | -------- | ------------------------------------------- |
| id    | integer  | Primary key                                 |
| tag   | text     | Tag name                                    |

## Junction Tables

### Playlist Videos
Links videos to playlists.

| Field      | Type     | Description                                 |
| ---------- | -------- | ------------------------------------------- |
| id         | integer  | Primary key                                 |
| playlistId | integer  | References playlists.id                     |
| videoId    | integer  | References videos.id                        |
| position   | integer  | Order in playlist                           |
| addedAt    | text     | Addition timestamp                          |

### Video Tag Map
Links videos to tags.

| Field   | Type     | Description                                 |
| ------- | -------- | ------------------------------------------- |
| id      | integer  | Primary key                                 |
| videoId | integer  | References videos.id                        |
| tagId   | integer  | References video_tags.id                    |

## Relationships Overview

- **Users** can have multiple **channels**, **playlists**, **comments**, **likes**, and **subscriptions**
- **Channels** belong to **users** and contain multiple **videos**
- **Videos** belong to **channels** and can have multiple **comments**, **likes**, and **tags**
- **Playlists** belong to **users** and contain multiple **videos** via junction table
- **Comments** can have **replies** (self-referencing relationship)
- **Subscriptions** link **users** to **channels**
- **History** tracks **user** video watching

## Best Practices

1. **Data Integrity**
   - Foreign key constraints ensure referential integrity
   - Unique constraints prevent duplicate entries
   - Soft deletes preserve data relationships

2. **Performance**
   - Indexed columns for frequent queries (userId, videoId, channelId)
   - Optimized queries for video feeds and search
   - Efficient pagination for large datasets

3. **Security**
   - Input sanitization and validation
   - Proper access controls for user data
   - Secure password hashing

4. **Maintenance**
   - Database migrations for schema changes
   - Regular cleanup of soft-deleted records
   - Performance monitoring and optimization

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)