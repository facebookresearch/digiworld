/**
 * Static Test Setup
 *
 * This module provides setup for static database tests that use a pre-built
 * database copy for fast, repeatable testing.
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { createTestHarness, TestConfigs } from '../test-harness'
import { runMigrations } from '../../db/migrations/runner'
import { mutations } from '../../db/mutations'

// Path to the static database file
const STATIC_DB_PATH = path.resolve(__dirname, 'ABC.db')

/**
 * Check if static database exists
 */
export function staticDbExists(): boolean {
  return fs.existsSync(STATIC_DB_PATH)
}

/**
 * Create static database if it doesn't exist
 * This should be run once to create the base database for static tests
 */
export async function createStaticDatabase(): Promise<void> {
  if (staticDbExists()) {
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

    // Initialize with mock data
    const result = await mutations.initializeDatabase()
    if (!result.success) {
      throw new Error(`Failed to initialize database: ${result.error}`)
    }

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

/**
 * Get static test configuration
 */
export function getStaticTestConfig(): ReturnType<typeof TestConfigs.static> {
  if (!staticDbExists()) {
    throw new Error(
      `Static database not found at ${STATIC_DB_PATH}. ` +
        'Run createStaticDatabase() first to create the base database.',
    )
  }

  return TestConfigs.static(STATIC_DB_PATH)
}

/**
 * Get static test configuration with verbose output
 */
export function getStaticTestConfigVerbose(): ReturnType<
  typeof TestConfigs.staticVerbose
> {
  if (!staticDbExists()) {
    throw new Error(
      `Static database not found at ${STATIC_DB_PATH}. ` +
        'Run createStaticDatabase() first to create the base database.',
    )
  }

  return TestConfigs.staticVerbose(STATIC_DB_PATH)
}

/**
 * Utility function to run a static test
 */
export async function runStaticTest(
  testName: string,
  testFn: (db: Database.Database) => Promise<void>,
) {
  const config = getStaticTestConfig()
  const harness = createTestHarness(config)

  try {
    await harness.initialize()
    return await harness.runTest(testName, testFn)
  } finally {
    await harness.cleanup()
  }
}

/**
 * Utility function to run multiple static tests
 */
export async function runStaticTests(
  tests: { name: string; fn: (db: Database.Database) => Promise<void> }[],
) {
  const config = getStaticTestConfig()
  const harness = createTestHarness(config)

  try {
    await harness.initialize()
    return await harness.runTests(tests)
  } finally {
    await harness.cleanup()
  }
}

/**
 * Jest setup for static tests
 */
export async function setupStaticTests(): Promise<void> {
  // Ensure static database exists
  if (!staticDbExists()) {
    console.log('Static database not found, creating...')
    await createStaticDatabase()
  }
}

/**
 * Jest teardown for static tests
 */
export async function teardownStaticTests(): Promise<void> {
  // Static tests don't need cleanup as they use copies
  // This is here for consistency with the test harness pattern
}
