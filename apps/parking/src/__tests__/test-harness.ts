// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Parking App Test Harness
 *
 * This harness provides a unified testing framework for the parking application.
 * It supports two testing modes:
 *
 * 1. Static DB Tests: Uses a pre-built database copy for fast, repeatable tests
 * 2. Full Harness Tests: Creates fresh database from schema and mock data
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { runMigrations } from '../db/migrations/runner'
// import { mutations } from '../db/mutations'

export interface TestConfig {
  mode: 'static' | 'full'
  dbPath?: string
  cleanup?: boolean
  verbose?: boolean
}

export interface TestResult {
  success: boolean
  error?: any
  duration: number
  testName: string
}

export class ParkingTestHarness {
  private config: TestConfig
  private db: Database.Database | null = null
  private tempDbPath: string | null = null
  private startTime: number = 0

  constructor(config: TestConfig) {
    this.config = {
      cleanup: true,
      verbose: false,
      ...config,
    }
  }

  /**
   * Initialize the test harness based on mode
   */
  async initialize(): Promise<void> {
    this.startTime = Date.now()

    if (this.config.verbose) {
      console.log(`[TestHarness] Initializing ${this.config.mode} mode...`)
    }

    if (this.config.mode === 'static') {
      await this.initializeStaticMode()
    } else {
      await this.initializeFullMode()
    }
  }

  /**
   * Initialize static mode - copy existing database
   */
  private async initializeStaticMode(): Promise<void> {
    if (!this.config.dbPath) {
      throw new Error('Static mode requires dbPath configuration')
    }

    if (!fs.existsSync(this.config.dbPath)) {
      throw new Error(`Static database file not found at ${this.config.dbPath}`)
    }

    // Create temporary copy of the static database
    this.tempDbPath = path.resolve(__dirname, `static_test_${Date.now()}.db`)
    fs.copyFileSync(this.config.dbPath, this.tempDbPath)

    this.db = new Database(this.tempDbPath)
    this.db.pragma('foreign_keys = ON')

    if (this.config.verbose) {
      console.log(`[TestHarness] Static database copied to ${this.tempDbPath}`)
    }
  }

  /**
   * Initialize full mode - create fresh database from schema and mock data
   */
  private async initializeFullMode(): Promise<void> {
    // Create temporary database file
    this.tempDbPath = path.resolve(__dirname, `full_test_${Date.now()}.db`)
    this.db = new Database(this.tempDbPath)
    this.db.pragma('foreign_keys = ON')

    if (this.config.verbose) {
      console.log(`[TestHarness] Creating fresh database at ${this.tempDbPath}`)
    }

    // Run migrations to create schema
    await runMigrations(this.db)

    // Initialize with mock data using mutations
    // Note: mutations.initializeDatabase() uses expo-sqlite, so we need to seed manually
    // For now, we'll use the static database approach or create a better-sqlite3 compatible seeding function
    if (this.config.verbose) {
      console.log('[TestHarness] Database initialized with schema')
    }
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Test harness not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * Run a test with proper setup and teardown
   */
  async runTest(
    testName: string,
    testFn: (db: Database.Database) => Promise<void>,
  ): Promise<TestResult> {
    const testStartTime = Date.now()

    try {
      if (this.config.verbose) {
        console.log(`[TestHarness] Running test: ${testName}`)
      }

      await testFn(this.getDatabase())

      const duration = Date.now() - testStartTime
      return {
        success: true,
        duration,
        testName,
      }
    } catch (error) {
      const duration = Date.now() - testStartTime
      return {
        success: false,
        error,
        duration,
        testName,
      }
    }
  }

  /**
   * Run multiple tests
   */
  async runTests(
    tests: { name: string; fn: (db: Database.Database) => Promise<void> }[],
  ): Promise<TestResult[]> {
    const results: TestResult[] = []

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn)
      results.push(result)
    }

    return results
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }

    if (
      this.tempDbPath &&
      this.config.cleanup &&
      fs.existsSync(this.tempDbPath)
    ) {
      fs.unlinkSync(this.tempDbPath)
      if (this.config.verbose) {
        console.log(`[TestHarness] Cleaned up ${this.tempDbPath}`)
      }
    }

    const totalDuration = Date.now() - this.startTime
    if (this.config.verbose) {
      console.log(`[TestHarness] Total duration: ${totalDuration}ms`)
    }
  }

  /**
   * Get test statistics
   */
  getStats(results: TestResult[]): {
    passed: number
    failed: number
    totalDuration: number
  } {
    const passed = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

    return { passed, failed, totalDuration }
  }
}

/**
 * Factory function to create test harness instances
 */
export function createTestHarness(config: TestConfig): ParkingTestHarness {
  return new ParkingTestHarness(config)
}

/**
 * Default configurations for common test scenarios
 */
export const TestConfigs = {
  static: (dbPath: string): TestConfig => ({
    mode: 'static',
    dbPath,
    verbose: false,
    cleanup: true,
  }),

  staticVerbose: (dbPath: string): TestConfig => ({
    mode: 'static',
    dbPath,
    verbose: true,
    cleanup: true,
  }),

  full: (): TestConfig => ({
    mode: 'full',
    verbose: false,
    cleanup: true,
  }),

  fullVerbose: (): TestConfig => ({
    mode: 'full',
    verbose: true,
    cleanup: true,
  }),
}
