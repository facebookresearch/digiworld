import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as FileSystem from 'expo-file-system'

// Open SQLite database named 'metaemails'
const expoDb = openDatabaseSync(
  'metaeshop.db',
  {},
  FileSystem.documentDirectory || '',
)

// Initialize Drizzle database
const db = drizzle(expoDb)

// Export the database instance
export default db
