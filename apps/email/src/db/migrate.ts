// Copyright (c) Meta Platforms, Inc. and affiliates.
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { db } from '@/db'
export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
