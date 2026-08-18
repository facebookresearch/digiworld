<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Andojo Music Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation in our offline-first music application.

## Database Architecture

### Configuration

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojomusic.db');
export const db = drizzle(sqlite);
```

### Schema Design

#### Users Table

Stores user information and preferences.

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  profilePicture: text('profile_picture'),
  favoriteCategories: text('favorite_categories'), // JSON array
  favoriteSongIds: text('favorite_song_ids'), // JSON array
  recentlyPlayed: text('recently_played'), // JSON array of {song_id, played_at}
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field             | Type      | Description                               |
| ----------------- | --------- | ----------------------------------------- |
| id                | integer   | Primary key, auto-incrementing identifier |
| username          | text      | User's display name                       |
| email             | text      | User's email (unique)                     |
| password          | text      | Hashed password                           |
| profilePicture    | text      | URL to profile picture                    |
| favoriteCategories| text      | Preferred music categories as JSON array  |
| favoriteSongIds   | text      | Favorite songs as JSON array             |
| recentlyPlayed    | text      | Recent play history as JSON array        |
| createdAt         | timestamp | Account creation date                     |
| updatedAt         | timestamp | Last update timestamp                     |

#### Categories Table

Manages music categories and subcategories.

```typescript
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: text('category_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  subcategories: text('subcategories'),
  description: text('description'),
  type: text('type').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field         | Type      | Description                               |
| ------------- | --------- | ----------------------------------------- |
| id            | integer   | Primary key, auto-incrementing identifier |
| categoryId    | text      | Unique category identifier               |
| name          | text      | Category name                            |
| color         | text      | UI color code                            |
| subcategories | text      | Subcategories as JSON array              |
| description   | text      | Category description                      |
| type          | text      | Category type                            |
| createdAt     | timestamp | Creation date                            |
| updatedAt     | timestamp | Last update timestamp                     |

#### Artists Table

Stores information about music artists.

```typescript
export const artists = sqliteTable('artists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  bio: text('bio'),
  categories: text('categories'), // JSON array
  monthlyListeners: integer('monthly_listeners').notNull().default(0),
  rating: real('rating'),
  profilePicture: text('profile_picture'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field           | Type      | Description                               |
| --------------- | --------- | ----------------------------------------- |
| id              | integer   | Primary key, auto-incrementing identifier |
| name            | text      | Artist name                               |
| bio             | text      | Artist biography                          |
| categories      | text      | Music categories as JSON array            |
| monthlyListeners| integer   | Number of monthly listeners               |
| rating          | real      | Artist rating                             |
| profilePicture  | text      | URL to artist's profile picture           |
| createdAt       | timestamp | Record creation date                      |
| updatedAt       | timestamp | Last update timestamp                     |

#### Albums Table

Stores album information.

```typescript
export const albums = sqliteTable('albums', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  artistId: integer('artist_id')
    .notNull()
    .references(() => artists.id),
  releaseDate: text('release_date'),
  categories: text('categories'), // JSON array
  coverArt: text('cover_art'),
  totalTracks: integer('total_tracks').notNull().default(0),
  rating: real('rating'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field       | Type      | Description                               |
| ----------- | --------- | ----------------------------------------- |
| id          | integer   | Primary key, auto-incrementing identifier |
| title       | text      | Album title                               |
| artistId    | integer   | Reference to artists table                |
| releaseDate | text      | Album release date                        |
| categories  | text      | Music categories as JSON array            |
| coverArt    | text      | URL to album cover art                    |
| totalTracks | integer   | Total number of tracks                    |
| rating      | real      | Album rating                              |
| createdAt   | timestamp | Record creation date                      |
| updatedAt   | timestamp | Last update timestamp                     |

#### Songs Table

Stores individual song information.

```typescript
export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  artistId: integer('artist_id')
    .notNull()
    .references(() => artists.id),
  albumId: integer('album_id')
    .notNull()
    .references(() => albums.id),
  duration: integer('duration').notNull(),
  categories: text('categories'), // JSON array
  audioUrl: text('audio_url').notNull(),
  coverArt: text('cover_art'),
  playCount: integer('play_count').notNull().default(0),
  rating: real('rating'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field     | Type      | Description                               |
| --------- | --------- | ----------------------------------------- |
| id        | integer   | Primary key, auto-incrementing identifier |
| title     | text      | Song title                                |
| artistId  | integer   | Reference to artists table                |
| albumId   | integer   | Reference to albums table                 |
| duration  | integer   | Song duration in seconds                  |
| categories| text      | Music categories as JSON array            |
| audioUrl  | text      | Path to the audio file                    |
| coverArt  | text      | URL to song cover art                     |
| playCount | integer   | Number of times played                    |
| rating    | real      | Song rating                               |
| createdAt | timestamp | Record creation date                      |
| updatedAt | timestamp | Last update timestamp                     |

#### Playlists Table

Manages user-created playlists.

```typescript
export const playlists = sqliteTable('playlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  categories: text('categories'), // JSON array
  coverArt: text('cover_art'),
  songIds: text('song_ids'), // JSON array
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field       | Type      | Description                               |
| ----------- | --------- | ----------------------------------------- |
| id          | integer   | Primary key, auto-incrementing identifier |
| name        | text      | Playlist name                             |
| description | text      | Playlist description                      |
| userId      | integer   | Reference to users table                  |
| categories  | text      | Music categories as JSON array            |
| coverArt    | text      | URL to playlist cover art                 |
| songIds     | text      | Array of song IDs as JSON                 |
| createdAt   | timestamp | Creation date                             |
| updatedAt   | timestamp | Last update timestamp                     |

#### Playlist Songs Table

Manages the relationship between playlists and songs.

```typescript
export const playlistSongs = sqliteTable('playlist_songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playlistId: integer('playlist_id')
    .notNull()
    .references(() => playlists.id),
  songId: integer('song_id')
    .notNull()
    .references(() => songs.id),
  position: integer('position').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field      | Type      | Description                               |
| ---------- | --------- | ----------------------------------------- |
| id         | integer   | Primary key, auto-incrementing identifier |
| playlistId | integer   | Reference to playlists table              |
| songId     | integer   | Reference to songs table                  |
| position   | integer   | Song position in playlist                 |
| createdAt  | timestamp | When song was added to playlist          |

#### Favorites Table

Tracks user's favorite songs.

```typescript
export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  songId: integer('song_id')
    .notNull()
    .references(() => songs.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

#### Recently Played Table

Tracks user's listening history.

```typescript
export const recentlyPlayed = sqliteTable('recently_played', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  songId: integer('song_id')
    .notNull()
    .references(() => songs.id),
  playedAt: text('played_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

#### Playlist Settings Table

Stores playlist-specific settings.

```typescript
export const playlistSettings = sqliteTable('playlist_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playlistId: integer('playlist_id')
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  isShuffleEnabled: integer('is_shuffle_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  repeatMode: text('repeat_mode').notNull().default('none'), // none, all, one
  lastPlayedSongId: integer('last_played_song_id').references(() => songs.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

#### Play History Table

Tracks detailed song play history.

```typescript
export const playHistory = sqliteTable('play_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  playlistId: integer('playlist_id').references(() => playlists.id),
  songId: integer('song_id')
    .notNull()
    .references(() => songs.id),
  playedAt: text('played_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  completionPercentage: integer('completion_percentage').notNull().default(0),
});
```

Field descriptions:

| Field               | Type      | Description                               |
| ------------------ | --------- | ----------------------------------------- |
| id                 | integer   | Primary key, auto-incrementing identifier |
| userId             | integer   | Reference to users table                  |
| playlistId         | integer   | Optional reference to playlists table     |
| songId             | integer   | Reference to songs table                  |
| playedAt           | timestamp | When the song was played                  |
| completionPercentage| integer   | Percentage of song played                 |

#### Playback Settings Table

Manages playback preferences for different entities.

```typescript
export const playbackSettings = sqliteTable('playback_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  shuffle: integer('shuffle').notNull().default(0),
  repeatMode: text('repeat_mode').notNull().default('none'),
  lastPlayedSongId: integer('last_played_song_id').references(() => songs.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

Field descriptions:

| Field           | Type      | Description                                |
| -------------- | --------- | ------------------------------------------ |
| id             | integer   | Primary key, auto-incrementing identifier  |
| entityType     | text      | Type of entity (artist/album/playlist)     |
| entityId       | integer   | ID of the entity                          |
| shuffle        | integer   | Shuffle mode enabled (0/1)                 |
| repeatMode     | text      | Repeat mode (none/repeat-one/repeat-all)   |
| lastPlayedSongId| integer   | Reference to last played song             |
| createdAt      | timestamp | Settings creation date                     |
| updatedAt      | timestamp | Last update timestamp                      |

## Database Operations

### Query Examples

```typescript
// Get user's play history with song details
const getPlayHistory = async (userId: number, limit = 50) => {
  return await db
    .select({
      history: playHistory,
      song: songs,
      playlist: playlists,
    })
    .from(playHistory)
    .innerJoin(songs, sql`songs.id = playHistory.songId`)
    .leftJoin(playlists, sql`playlists.id = playHistory.playlistId`)
    .where(sql`playHistory.userId = ${userId}`)
    .orderBy(sql`playHistory.playedAt DESC`)
    .limit(limit)
    .execute();
};

// Load songs with artist and album details
const loadSongs = async () => {
  return await db
    .select({
      song: {
        id: songs.id,
        title: songs.title,
        artistId: songs.artistId,
        albumId: songs.albumId,
        duration: songs.duration,
        categories: songs.categories,
        audioUrl: songs.audioUrl,
        coverArt: songs.coverArt,
        playCount: songs.playCount,
        rating: songs.rating,
      },
      artist: {
        id: artists.id,
        name: artists.name,
      },
      album: {
        id: albums.id,
        title: albums.title,
        releaseDate: albums.releaseDate,
        coverArt: albums.coverArt,
      },
    })
    .from(songs)
    .innerJoin(albums, eq(songs.albumId, albums.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .execute();
};

// Update recently played songs
const updateRecentlyPlayed = async (userId: number) => {
  return await db
    .select({
      song: songs,
      album: albums,
      artist: artists,
      playedAt: recentlyPlayed.playedAt,
    })
    .from(recentlyPlayed)
    .innerJoin(songs, eq(recentlyPlayed.songId, songs.id))
    .innerJoin(albums, eq(songs.albumId, albums.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(eq(recentlyPlayed.userId, userId))
    .orderBy(desc(recentlyPlayed.playedAt))
    .limit(6)
    .execute();
};
```

## Best Practices

1. **Data Integrity**
   - Use transactions for related operations
   - Maintain referential integrity
   - Validate data before insertion

2. **Performance**
   - Index frequently queried columns
   - Use appropriate data types
   - Optimize complex queries

3. **Maintenance**
   - Regular database cleanup
   - Schema versioning
   - Data migration support

## Migration System

The app uses a simple migration system to manage schema changes:

```typescript
// Example migration
export async function up(db: Database) {
  await db.schema
    .alterTable('songs')
    .addColumn('playCount', 'integer', (col) => col.notNull().default(0))
    .execute();
}

export async function down(db: Database) {
  await db.schema
    .alterTable('songs')
    .dropColumn('playCount')
    .execute();
}
```

For running migrations:
```typescript
import { migrate } from './migrate';

// Run migrations on app startup
await migrate(db);
``` 