import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as FileSystem from 'expo-file-system'

// Open SQLite database named 'musicapp'
const expoDb = openDatabaseSync(
  'andojomusic.db',
  {},
  FileSystem.documentDirectory || '',
)

// Initialize Drizzle database
export const db = drizzle(expoDb)
