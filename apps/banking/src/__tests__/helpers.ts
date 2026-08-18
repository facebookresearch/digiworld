import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { runMigrations } from '../db/migrations/runner'
import { mutations } from '../db/mutations'

export const ORIGINAL_DB_PATH = path.resolve(__dirname, 'ABC.db')

if (!fs.existsSync(ORIGINAL_DB_PATH)) {
  throw new Error(`Fixture database file not found at ${ORIGINAL_DB_PATH}`)
}

// Copy ABC.db to temp DB for safe tests
export function createTempDB(): Database.Database {
  const tempPath = path.resolve(__dirname, `AB_test_${Date.now()}.db`)
  fs.copyFileSync(ORIGINAL_DB_PATH, tempPath)
  return new Database(tempPath)
}

// Cleanup temp DB
export function cleanupTempDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
}

// Create fresh DB from schema + optional mock data
export async function setupFreshDB(): Promise<Database.Database> {
  const dbPath = path.resolve(__dirname, `full_test_${Date.now()}.db`)
  const db = new Database(dbPath)
  await runMigrations(db)
  await mutations.initializeDatabase() // load JSON from mockdata/
  return db
}

// Cleanup fresh DB
export function teardownTestDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
}
