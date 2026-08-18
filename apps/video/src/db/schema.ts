import { sql } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  AnySQLiteColumn,
  unique,
} from 'drizzle-orm/sqlite-core'
// --- Independent Tables ---
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar').default(''),
  bio: text('bio').default(''),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

export const videoCategories = sqliteTable('video_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
})

export const videoTags = sqliteTable('video_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tag: text('tag').notNull().unique(),
})

// --- Dependent Tables ---
export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  banner: text('banner'),
  avatar: text('avatar'),
  subscriberCount: integer('subscriber_count').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

export const videos = sqliteTable('videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: integer('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => videoCategories.id, { onDelete: 'set null' }),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'),
  visibility: text('visibility', { enum: ['public', 'private', 'unlisted'] })
    .notNull()
    .default('public'),
  status: text('status', { enum: ['active', 'deleted', 'blocked'] })
    .notNull()
    .default('active'),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  isCommentsEnabled: integer('is_comments_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

export const playlists = sqliteTable('playlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  shuffle: integer('shuffle', { mode: 'boolean' }).notNull().default(false),
  shareUrl: text('share_url'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

// --- Junction Tables and Composite Constraints ---
export const playlistVideos = sqliteTable(
  'playlist_videos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playlistId: integer('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    position: integer('position'),
    addedAt: text('added_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => ({
    unique: [unique().on(table.playlistId, table.videoId)],
  }),
)

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: integer('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id').references(
    (): AnySQLiteColumn => comments.id,
    { onDelete: 'cascade' },
  ),
  content: text('content').notNull(),
  status: text('status', { enum: ['visible', 'hidden'] })
    .notNull()
    .default('visible'),
  isEdited: integer('is_edited', { mode: 'boolean' }).default(false),
  replyCount: integer('reply_count').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

export const commentReports = sqliteTable('comment_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  comment_id: integer('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const likes = sqliteTable(
  'likes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => ({
    unique: [unique().on(table.userId, table.videoId)],
  }),
)

export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => ({
    unique: [unique().on(table.userId, table.channelId)],
  }),
)

export const history = sqliteTable(
  'history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    watchedAt: text('watched_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => ({
    userVideoUnique: unique('user_video_unique').on(
      table.userId,
      table.videoId,
    ),
  }),
)

export const videoTagMap = sqliteTable(
  'video_tag_map',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => videoTags.id, { onDelete: 'cascade' }),
  },
  table => ({
    unique: [unique().on(table.videoId, table.tagId)],
  }),
)

export const videoReports = sqliteTable(
  'video_reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    reporterId: integer('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => ({
    unique: [unique().on(table.videoId, table.reporterId)],
  }),
)
