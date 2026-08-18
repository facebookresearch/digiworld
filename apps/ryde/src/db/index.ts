import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { runMigrations } from './migrations'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static isClosing: boolean = false
  private static isReopening: boolean = false
  private static isResetting: boolean = false
  private static dbPath: string = 'andojoryde.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        this.instance = SQLite.openDatabaseSync('andojoryde.db')
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
      this.isResetting = true

      const instance = this.getInstance()
      // Drop tables in correct order (child tables first, then parent tables)
      const dropStatements = [
        'PRAGMA foreign_keys = OFF',
        // Drop child tables first (order matters due to foreign key constraints)
        'DROP TABLE IF EXISTS feedback', // depends on rides
        'DROP TABLE IF EXISTS rides', // depends on users and drivers
        'DROP TABLE IF EXISTS drivers', // depends on ride_options
        'DROP TABLE IF EXISTS user_addresses', // depends on users
        'DROP TABLE IF EXISTS user_payment_methods', // depends on users
        // Drop parent tables
        'DROP TABLE IF EXISTS ride_options', // independent
        'DROP TABLE IF EXISTS users', // independent
        'DROP TABLE IF EXISTS _migrations', // system table
        'PRAGMA foreign_keys = ON',
      ]

      // Execute each drop statement with proper error handling
      for (const sql of dropStatements) {
        try {
          await instance.execAsync(sql)
          console.log(`Executed: ${sql}`)
        } catch (error) {
          console.warn(`Warning: Failed to execute ${sql}:`, error)
          // Continue with other statements even if one fails
        }
      }

      console.log('Tables dropped')

      // Ensure database connection is still valid before running migrations
      if (!this.instance || this.isClosing) {
        console.log('Database connection lost, reopening...')
        await this.reopenConnection()
      }

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
    } finally {
      this.isResetting = false
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
