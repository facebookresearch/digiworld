<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Video Streaming App Data Model Documentation

## Overview
This document describes the database schema and data relationships for the video streaming application. It explains how each table maps to app features and how entities reference each other, ensuring clarity for development and future maintenance.

---

## Entity Relationships & Table Mapping

### 1. Users
- **Table:** `users`
- **Purpose:** Stores user accounts and profile details.
- **Key Fields:**
  - `id`: Primary key
  - `email`, `username`: Unique identifiers
  - `avatar`, `bio`, `name`: Profile info
  - `created_at`, `updated_at`, `deleted_at`: Timestamps for auditing and soft deletion
- **References:**
  - One-to-one with `channels` (via `channels.user_id`)
  - One-to-many with `playlists`, `comments`, `subscriptions`, `history`, `likes`

### 2. Channels
- **Table:** `channels`
- **Purpose:** Represents a user's public channel (profile as channel)
- **Key Fields:**
  - `id`: Primary key
  - `user_id`: References `users.id` (unique, 1:1)
  - `name`, `description`, `banner`, `avatar`
  - `subscriber_count`: Denormalized for performance
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - One-to-many with `videos`
  - Many-to-many with `subscriptions` (users subscribe to channels)

### 3. Videos
- **Table:** `videos`
- **Purpose:** Stores uploaded videos and their metadata
- **Key Fields:**
  - `id`: Primary key
  - `channel_id`: References `channels.id`
  - `title`, `description`, `video_url`, `thumbnail_url`, `duration`
  - `visibility`, `status`: For public/private/unlisted and moderation
  - `view_count`, `like_count`, `comment_count`: Denormalized for performance
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - Many-to-one with `channels`
  - One-to-many with `comments`, `likes`, `history`, `video_tag_map`, `video_reports`
  - Many-to-many with `playlists` (via `playlist_videos`)
  - Many-to-many with `video_tags` (via `video_tag_map`)
  - Many-to-one with `video_categories` (category mapping handled via tags or future join table)

### 4. Playlists
- **Table:** `playlists`
- **Purpose:** User-created collections of videos
- **Key Fields:**
  - `id`: Primary key
  - `user_id`: References `users.id` (owner)
  - `name`, `description`, `is_public`, `share_url`
  - `created_at`, `updated_at`, `deleted_at`
- **References:**
  - Many-to-many with `videos` (via `playlist_videos`)

### 5. Playlist-Videos
- **Table:** `playlist_videos`
- **Purpose:** Maps videos to playlists (many-to-many)
- **Key Fields:**
  - `playlist_id`: References `playlists.id`
  - `video_id`: References `videos.id`
  - `position`: Order within playlist
  - `added_at`: Timestamp
  - `UNIQUE(playlist_id, video_id)` ensures no duplicate video in playlist

### 6. Comments
- **Table:** `comments`
- **Purpose:** User comments on videos (supports threaded replies)
- **Key Fields:**
  - `id`: Primary key
  - `video_id`: References `videos.id`
  - `user_id`: References `users.id`
  - `parent_id`: References `comments.id` (for replies/nesting)
  - `content`, `is_edited`, `created_at`, `updated_at`, `deleted_at`
- **References:**
  - Many-to-one with `videos`, `users`
  - Self-referencing for replies
  - One-to-many with `comment_reports`

### 7. Comment Reports
- **Table:** `comment_reports`
- **Purpose:** Reports of inappropriate comments
- **Key Fields:**
  - `comment_id`: References `comments.id`
  - `reporter_id`: References `users.id`
  - `reason`, `created_at`
  - One report per user per comment

### 8. Likes
- **Table:** `likes`
- **Purpose:** Tracks which users like which videos
- **Key Fields:**
  - `user_id`: References `users.id`
  - `video_id`: References `videos.id`
  - `created_at`
  - `UNIQUE(user_id, video_id)` ensures one like per video per user

### 9. Subscriptions
- **Table:** `subscriptions`
- **Purpose:** Users subscribing to channels
- **Key Fields:**
  - `user_id`: References `users.id`
  - `channel_id`: References `channels.id`
  - `created_at`
  - `UNIQUE(user_id, channel_id)`

### 10. History
- **Table:** `history`
- **Purpose:** Tracks which videos a user has watched
- **Key Fields:**
  - `user_id`: References `users.id`
  - `video_id`: References `videos.id`
  - `watched_at`

### 11. Video Categories
- **Table:** `video_categories`
- **Purpose:** Master list of video categories (for search/discovery)
- **Key Fields:**
  - `id`: Primary key
  - `name`: Unique
  - `description`
- **References:**
  - (Currently not directly mapped to videos; can be extended with a join table)

### 12. Video Tags
- **Table:** `video_tags`
- **Purpose:** Master list of tags for videos
- **Key Fields:**
  - `id`: Primary key
  - `tag`: Unique

### 13. Video-Tag Map
- **Table:** `video_tag_map`
- **Purpose:** Many-to-many mapping between videos and tags
- **Key Fields:**
  - `video_id`: References `videos.id`
  - `tag_id`: References `video_tags.id`
  - `UNIQUE(video_id, tag_id)`

### 14. Video Reports
- **Table:** `video_reports`
- **Purpose:** Reports of inappropriate videos
- **Key Fields:**
  - `video_id`: References `videos.id`
  - `reporter_id`: References `users.id`
  - `reason`, `created_at`

---

## Data Integrity & Reference Notes
- All major relationships use foreign keys for referential integrity.
- Many-to-many relationships (playlists-videos, videos-tags) use mapping tables with unique constraints.
- Soft deletion (`deleted_at`) is used for users, channels, videos, playlists, and comments to allow for recovery and audit.
- Denormalized counters (e.g., `subscriber_count`, `view_count`) should be updated transactionally with related actions.
- Self-referencing in `comments` (`parent_id`) enables threaded/nested replies.
- All timestamps use UTC via `strftime` for consistency.

---

## Example Data Mapping Scenarios

- **A user uploads a video:**
  - Insert into `videos` with `channel_id` referencing their channel.
  - Optionally, add tags via `video_tags` and `video_tag_map`.

- **A user creates a playlist:**
  - Insert into `playlists` with their `user_id`.
  - Add videos via `playlist_videos` with positions.

- **A user comments on a video:**
  - Insert into `comments` with `video_id`, `user_id`, and optionally `parent_id` for replies.

- **A user likes a video:**
  - Insert into `likes` with `user_id` and `video_id`.

- **A user subscribes to a channel:**
  - Insert into `subscriptions` with `user_id` and `channel_id`.

- **A user watches a video:**
  - Insert into `history` with `user_id`, `video_id`, and `watched_at`.

- **A user reports a comment or video:**
  - Insert into `comment_reports` or `video_reports` with relevant IDs and reason.

---

## Extensibility & Future Considerations
- To enable direct category-to-video mapping, add a join table (e.g., `video_category_map`).
- Additional moderation, analytics, or notification tables can be added as needed.
- All foreign keys can be set to `ON DELETE CASCADE` if desired for automatic cleanup.

---

## Asset Management
- Video files and thumbnails are referenced via URLs in the `videos` table.
- User avatars, channel banners, and playlist covers are referenced via URLs in their respective tables.

---

## Summary
This schema is designed for extensibility, robust referential integrity, and clarity. All major YouTube-like features are mapped, and the relationships are documented for both backend and frontend development.
