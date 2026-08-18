/**
 * Simple Static Database Generator
 *
 * This creates a minimal static database with just the schema for testing.
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { runMigrations } from '../../db/migrations/runner'
import { initializeComprehensiveTestDatabase } from '../comprehensive-test-mutations'

/**
 * Create static database with minimal test data
 */
export async function createStaticDatabase(): Promise<void> {
  const STATIC_DB_PATH = path.resolve(__dirname, 'ABC.db')

  if (fs.existsSync(STATIC_DB_PATH)) {
    console.log('Static database already exists at', STATIC_DB_PATH)
    return
  }

  console.log('Creating static database for tests...')

  // Create the static database directory if it doesn't exist
  const staticDir = path.dirname(STATIC_DB_PATH)
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true })
  }

  // Create temporary database
  const tempPath = path.resolve(__dirname, `temp_static_${Date.now()}.db`)
  const db = new Database(tempPath)

  try {
    // Run migrations to create schema
    await runMigrations(db)

    // Initialize with comprehensive mock data
    console.log('Inserting comprehensive test data...')
    const result = await initializeComprehensiveTestDatabase(db)
    if (!result.success) {
      throw new Error(`Failed to initialize database: ${result.error}`)
    }

    console.log('Comprehensive test data inserted successfully')

    // Close the temporary database
    db.close()

    // Copy to static location
    fs.copyFileSync(tempPath, STATIC_DB_PATH)

    console.log('Static database created successfully at', STATIC_DB_PATH)
  } catch (error) {
    console.error('Failed to create static database:', error)
    throw error
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}

// Run if called directly
if (require.main === module) {
  createStaticDatabase()
    .then(() => {
      console.log('Static database generation completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Static database generation failed:', error)
      process.exit(1)
    })
}
