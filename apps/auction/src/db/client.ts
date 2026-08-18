// Copyright (c) Meta Platforms, Inc. and affiliates.
import * as FileSystem from 'expo-file-system'
import { openDatabaseSync } from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'

// Open SQLite database named 'andojoauction'
const expoDb = openDatabaseSync(
  'andojoauction.db',
  {},
  FileSystem.documentDirectory || '',
)

// Initialize Drizzle database
export const db = drizzle(expoDb)
