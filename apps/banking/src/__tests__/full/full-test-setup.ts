// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Full Test Setup
 *
 * This module provides setup for full harness tests that create fresh databases
 * from schema and mock data for comprehensive testing.
 */

import Database from 'better-sqlite3'
import { createTestHarness, TestConfigs } from '../test-harness'

/**
 * Get full test configuration
 */
export function getFullTestConfig(): ReturnType<typeof TestConfigs.full> {
  return TestConfigs.full()
}

/**
 * Get full test configuration with verbose output
 */
export function getFullTestConfigVerbose(): ReturnType<
  typeof TestConfigs.fullVerbose
> {
  return TestConfigs.fullVerbose()
}

/**
 * Utility function to run a full test
 */
export async function runFullTest(
  testName: string,
  testFn: (db: Database.Database) => Promise<void>,
) {
  const config = getFullTestConfig()
  const harness = createTestHarness(config)

  try {
    await harness.initialize()
    return await harness.runTest(testName, testFn)
  } finally {
    await harness.cleanup()
  }
}

/**
 * Utility function to run multiple full tests
 */
export async function runFullTests(
  tests: { name: string; fn: (db: Database.Database) => Promise<void> }[],
) {
  const config = getFullTestConfig()
  const harness = createTestHarness(config)

  try {
    await harness.initialize()
    return await harness.runTests(tests)
  } finally {
    await harness.cleanup()
  }
}

/**
 * Jest setup for full tests
 */
export async function setupFullTests(): Promise<void> {
  // Full tests create fresh databases each time
  // No pre-setup required
}

/**
 * Jest teardown for full tests
 */
export async function teardownFullTests(): Promise<void> {
  // Full tests clean up automatically via the test harness
  // This is here for consistency with the test harness pattern
}

/**
 * Create a test database with custom mock data
 */
export async function createTestDatabaseWithCustomData(
  customMockDataPath?: string,
): Promise<Database.Database> {
  const config = customMockDataPath
    ? TestConfigs.full(customMockDataPath)
    : TestConfigs.full()

  const harness = createTestHarness(config)
  await harness.initialize()

  // Return the database instance - caller is responsible for cleanup
  return harness.getDatabase()
}

/**
 * Run a test with custom mock data
 */
export async function runTestWithCustomData(
  testName: string,
  testFn: (db: Database.Database) => Promise<void>,
  customMockDataPath?: string,
) {
  const config = customMockDataPath
    ? TestConfigs.full(customMockDataPath)
    : TestConfigs.full()

  const harness = createTestHarness(config)

  try {
    await harness.initialize()
    return await harness.runTest(testName, testFn)
  } finally {
    await harness.cleanup()
  }
}
