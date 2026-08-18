import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { db } from '@/db/index'

export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migrations completed successfully')
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
