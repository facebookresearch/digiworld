/**
 * Migration Runner for Better-SQLite3
 *
 * This module provides migration functionality for the test harness
 * using better-sqlite3 instead of drizzle's expo-sqlite migrator.
 */

import Database from 'better-sqlite3'
import { createTables } from './index'

/**
 * Run migrations on a better-sqlite3 database instance
 */
export async function runMigrations(db?: Database.Database): Promise<boolean> {
  try {
    if (!db) {
      throw new Error('Database instance is required')
    }

    console.log('Running migrations...')

    // Enable foreign keys
    db.prepare('PRAGMA foreign_keys = ON').run()

    // Separate table creation from index creation
    const tableStatements = createTables.filter(
      stmt =>
        stmt.trim().startsWith('CREATE TABLE') ||
        stmt.trim().startsWith('CREATE VIRTUAL TABLE'),
    )
    const indexStatements = createTables.filter(stmt =>
      stmt.trim().startsWith('CREATE INDEX'),
    )

    // Run table creation statements first
    for (const statement of tableStatements) {
      try {
        db.prepare(statement).run()
      } catch (error: any) {
        // Some statements might fail if tables already exist, which is fine
        if (!error.message?.includes('already exists')) {
          console.warn(
            `Table creation failed: ${statement.substring(0, 100)}...`,
            error,
          )
        }
      }
    }

    // Run index creation statements after tables are created
    for (const statement of indexStatements) {
      try {
        db.prepare(statement).run()
      } catch (error: any) {
        // Some statements might fail if indexes already exist, which is fine
        if (!error.message?.includes('already exists')) {
          console.warn(
            `Index creation failed: ${statement.substring(0, 100)}...`,
            error,
          )
        }
      }
    }

    console.log('Migrations completed successfully')
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

/**
 * Check if database has required tables
 */
export function hasRequiredTables(db: Database.Database): boolean {
  try {
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()

    const tableNames = tables.map((t: any) => t.name)
    const requiredTables = [
      'users',
      'accounts',
      'transactions',
      'account_types',
      'account_tier_levels',
      'transaction_types',
    ]

    return requiredTables.every(table => tableNames.includes(table))
  } catch (error) {
    console.error('Error checking tables:', error)
    return false
  }
}

/**
 * Reset database by dropping all tables
 */
export function resetDatabase(db: Database.Database): boolean {
  try {
    console.log('Resetting database...')

    // Disable foreign keys temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run()

    // Get all table names
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()

    // Drop all tables
    for (const table of tables) {
      try {
        db.prepare(`DROP TABLE IF EXISTS ${(table as any).name}`).run()
      } catch (error) {
        console.warn(`Failed to drop table ${(table as any).name}:`, error)
      }
    }

    // Re-enable foreign keys
    db.prepare('PRAGMA foreign_keys = ON').run()

    console.log('Database reset completed')
    return true
  } catch (error) {
    console.error('Database reset failed:', error)
    return false
  }
}
