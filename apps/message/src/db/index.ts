// Copyright (c) Meta Platforms, Inc. and affiliates.
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { runMigrations } from './migrations'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static isClosing: boolean = false
  private static isReopening: boolean = false
  private static isResetting: boolean = false
  private static dbPath: string = 'andojomessage.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        this.instance = SQLite.openDatabaseSync('andojomessage.db')
        this.drizzleDb = drizzle(this.instance)
      } catch (error) {
        console.error('Failed to create database instance:', error)
        throw error
      }
    }
    return this.instance
  }

  static getDrizzle() {
    // If database is being reset, return null to prevent access
    if (this.isResetting) {
      console.log('Database is being reset, access blocked')
      return null
    }

    if (!this.drizzleDb || !this.instance) {
      // If either is null, create a fresh instance
      this.instance = this.getInstance()
      this.drizzleDb = drizzle(this.instance)
    }
    return this.drizzleDb
  }

  static async closeConnection() {
    if (this.instance && !this.isClosing) {
      this.isClosing = true
      try {
        await this.instance.closeAsync()
      } catch (e) {
        console.warn('Error closing database:', e)
      } finally {
        this.instance = null
        this.drizzleDb = null
        this.isClosing = false
      }
    }
  }

  static async reopenConnection(): Promise<SQLite.SQLiteDatabase> {
    // If already reopening, wait for it to complete
    if (this.isReopening) {
      let attempts = 0
      while (this.isReopening && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
      if (this.instance) {
        return this.instance
      }
    }

    // If closing, wait for it to complete
    if (this.isClosing) {
      let attempts = 0
      while (this.isClosing && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
    }

    this.isReopening = true
    try {
      // Ensure the database is fully closed before reopening
      if (this.instance) {
        await this.closeConnection()
      }

      // Wait a moment to ensure resources are released
      await new Promise(resolve => setTimeout(resolve, 500))

      this.instance = SQLite.openDatabaseSync(this.dbPath)

      // Test the connection with a simple query
      try {
        await this.instance.execAsync('PRAGMA foreign_keys = ON')
        await this.instance.execAsync('SELECT 1')
      } catch (testError) {
        console.error('Database connection test failed:', testError)
        throw new Error('Failed to establish a working database connection')
      }

      // Initialize Drizzle with the new instance
      this.drizzleDb = drizzle(this.instance)

      return this.instance
    } catch (error) {
      console.error('Failed to reopen database:', error)
      // Clean up in case of failure
      this.instance = null
      this.drizzleDb = null
      throw error
    } finally {
      this.isReopening = false
    }
  }

  static async resetDatabase() {
    try {
      console.log('Starting database reset...')

      // Use the existing db instance (like banking/parking apps)
      const instance = this.getInstance()

      console.log('Dropping existing tables...')
      // Drop tables in correct order (child tables first, then parent tables)
      const dropStatements = [
        'PRAGMA foreign_keys = OFF',
        // Drop child tables first (order matters due to foreign key constraints)
        'DROP TABLE IF EXISTS attachments', // depends on messages
        'DROP TABLE IF EXISTS group_messages', // depends on groups and users
        'DROP TABLE IF EXISTS group_members', // depends on groups and users
        'DROP TABLE IF EXISTS messages', // depends on users
        'DROP TABLE IF EXISTS call_history', // depends on users
        'DROP TABLE IF EXISTS chat_settings', // depends on users
        'DROP TABLE IF EXISTS app_state', // depends on users
        // Drop parent tables
        'DROP TABLE IF EXISTS groups', // independent
        'DROP TABLE IF EXISTS users', // independent
        'DROP TABLE IF EXISTS _migrations', // system table
        'VACUUM;',
        'PRAGMA foreign_keys = ON',
      ]

      // Drop tables using existing instance (like banking/parking apps)
      for (const sql of dropStatements) {
        try {
          console.log('Running', sql)
          await instance.execAsync(sql)
        } catch (dropError) {
          console.error(`Error executing: ${sql}`, dropError)
          // Continue with other statements even if one fails
        }
      }

      // Ensure foreign keys are enabled before migrations (like banking/parking apps)
      await instance.execAsync('PRAGMA foreign_keys = ON;')

      // Run migrations using the same instance (like banking/parking apps)
      console.log('Running migrations...')
      const migrationResult = await runMigrations()
      if (!migrationResult) {
        throw new Error('Migration failed')
      }

      console.log('Database reset completed successfully')
      return true
    } catch (error) {
      console.error('Reset failed:', error)
      return false
    }
  }

  static forceRefresh() {
    // Force refresh the database instance
    this.instance = null
    this.drizzleDb = null
    return this.getDrizzle()
  }

  static isDatabaseReady(): boolean {
    return (
      !this.isResetting &&
      !this.isClosing &&
      !this.isReopening &&
      this.instance !== null
    )
  }

  static async waitForDatabase(maxWaitTime = 30000): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWaitTime) {
      if (this.isDatabaseReady()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return false
  }
}

// Export instance and methods bound to the class
export const db = DatabaseManager.getDrizzle()
export const sqlite = DatabaseManager.getInstance()
export const getInstance = DatabaseManager.getInstance.bind(DatabaseManager)
// Getter function to ensure we always get a valid instance (not a stale closed connection)
export const getSqlite = () => DatabaseManager.getInstance()
export const getDrizzle = DatabaseManager.getDrizzle.bind(DatabaseManager)
export const closeConnection =
  DatabaseManager.closeConnection.bind(DatabaseManager)
export const reopenConnection =
  DatabaseManager.reopenConnection.bind(DatabaseManager)
export const resetDatabase = DatabaseManager.resetDatabase.bind(DatabaseManager)
export const forceRefresh = DatabaseManager.forceRefresh.bind(DatabaseManager)
export const isDatabaseReady =
  DatabaseManager.isDatabaseReady.bind(DatabaseManager)
export const waitForDatabase =
  DatabaseManager.waitForDatabase.bind(DatabaseManager)
