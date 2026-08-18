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
// import { runMigrations } from '../../db/migrations/runner'

// Path to the static database file
const STATIC_DB_PATH = path.resolve(__dirname, 'ABC.db')

/**
 * Check if static database exists
 */
export function staticDbExists(): boolean {
  return fs.existsSync(STATIC_DB_PATH)
}

/**
 * Get static test configuration
 */
export function getStaticTestConfig(): ReturnType<typeof TestConfigs.static> {
  if (!staticDbExists()) {
    throw new Error(
      `Static database not found at ${STATIC_DB_PATH}. ` +
        'Run "yarn test:generate-static-db" first to create the base database.',
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
        'Run "yarn test:generate-static-db" first to create the base database.',
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
    throw new Error(
      `Static database not found at ${STATIC_DB_PATH}. ` +
        'Run "yarn test:generate-static-db" first to create the base database.',
    )
  }
}

/**
 * Jest teardown for static tests
 */
export async function teardownStaticTests(): Promise<void> {
  // Static tests don't need cleanup as they use copies
  // This is here for consistency with the test harness pattern
}
