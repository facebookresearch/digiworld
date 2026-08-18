import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { getDrizzle } from '@/db'

export async function runMigrations() {
  try {
    const db = getDrizzle()
    if (!db) {
      throw new Error('Database not available for migrations')
    }
    await migrate(db, { migrationsFolder: './drizzle' })
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
