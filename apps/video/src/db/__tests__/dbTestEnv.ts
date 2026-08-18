// Copyright (c) Meta Platforms, Inc. and affiliates.
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import {
  users,
  videoCategories,
  videoTags,
  channels,
  videos,
  playlists,
  playlistVideos,
  comments,
  commentReports,
  likes,
  subscriptions,
  history,
  videoTagMap,
  videoReports,
} from '../schema'

const schema = {
  users,
  videoCategories,
  videoTags,
  channels,
  videos,
  playlists,
  playlistVideos,
  comments,
  commentReports,
  likes,
  subscriptions,
  history,
  videoTagMap,
  videoReports,
}

// Path where developer places the extracted AB.db
export const ORIGINAL_DB_PATH = path.resolve(
  __dirname,
  '../../__tests__/ABC.db',
)

if (!fs.existsSync(ORIGINAL_DB_PATH)) {
  throw new Error(
    `Fixture database file not found at ${ORIGINAL_DB_PATH}.\n` +
      'Copy the extracted ABC.db alongside apps/video or update ORIGINAL_DB_PATH.',
  )
}

// Work on a throw-away copy so tests can mutate freely and roll back.
const TEMP_DB_PATH = path.resolve(
  __dirname,
  `../../../AB_test_${Date.now()}.db`,
)
fs.copyFileSync(ORIGINAL_DB_PATH, TEMP_DB_PATH)

const sqlite = new Database(TEMP_DB_PATH)
export const db = drizzle(sqlite, {
  schema: {
    users,
    videoCategories,
    videoTags,
    channels,
    videos,
    playlists,
    playlistVideos,
    comments,
    commentReports,
    likes,
    subscriptions,
    history,
    videoTagMap,
    videoReports,
  },
})

type TableName = keyof typeof schema

export async function getSingleId<T extends TableName>(
  tableName: T,
): Promise<number> {
  const table = schema[tableName]
  const row = await db
    .select({ id: (table as any).id })
    .from(table)
    .limit(1)
    .execute()

  return row[0]?.id ?? 1
}

export function cleanup() {
  sqlite.close()
  fs.unlinkSync(TEMP_DB_PATH)
}
