// Copyright (c) Meta Platforms, Inc. and affiliates.
import * as FileSystem from 'expo-file-system'
import { openDatabaseSync } from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'

// Open SQLite database named 'transit'
const expoDb = openDatabaseSync(
  'andojotransit.db',
  {},
  FileSystem.documentDirectory || '',
)

// Initialize Drizzle database
export const db = drizzle(expoDb)
