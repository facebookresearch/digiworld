// Copyright (c) Meta Platforms, Inc. and affiliates.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from '../schema'

// Create in-memory database for testing
export function createTestDatabase() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })

  // Run migrations if you have them
  // migrate(db, { migrationsFolder: './src/db/migrations' });

  return { db, sqlite }
}

// Mock data helpers
export const mockUsers = [
  {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  },
  {
    id: 2,
    email: 'user2@example.com',
    username: 'user2',
    password: 'hashedpassword2',
    name: 'User Two',
    avatar: null,
    bio: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    deleted_at: null,
  },
]

export const mockChannels = [
  {
    id: 1,
    user_id: 1,
    name: 'Test Channel',
    description: 'A test channel',
    banner: 'https://example.com/banner.jpg',
    avatar: 'https://example.com/channel-avatar.jpg',
    subscriber_count: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockCategories = [
  {
    id: 1,
    name: 'Entertainment',
    description: 'Entertainment videos',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockTags = [
  {
    id: 1,
    tag: 'funny',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockVideos = [
  {
    id: 1,
    channel_id: 1,
    title: 'Test Video',
    description: 'A test video',
    video_url: 'https://example.com/video.mp4',
    thumbnail_url: 'https://example.com/thumb.jpg',
    duration: 120,
    visibility: 'public' as const,
    status: 'active' as const,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  },
]

// Helper to seed test database
export async function seedTestDatabase(db: any) {
  // Insert users
  for (const user of mockUsers) {
    await db.insert(schema.users).values(user)
  }

  // Insert categories
  for (const category of mockCategories) {
    await db.insert(schema.videoCategories).values(category)
  }

  // Insert tags
  for (const tag of mockTags) {
    await db.insert(schema.videoTags).values(tag)
  }

  // Insert channels
  for (const channel of mockChannels) {
    await db.insert(schema.channels).values(channel)
  }

  // Insert videos
  for (const video of mockVideos) {
    await db.insert(schema.videos).values(video)
  }
}
