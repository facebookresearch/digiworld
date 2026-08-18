// Copyright (c) Meta Platforms, Inc. and affiliates.
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { runMigrations } from './migrations'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static isClosing: boolean = false
  private static isReopening: boolean = false
  private static dbPath: string = 'andojoeats.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        this.instance = SQLite.openDatabaseSync(this.dbPath)
        this.drizzleDb = drizzle(this.instance)
        console.log('Database instance created successfully')
      } catch (error) {
        console.error('Failed to create database instance:', error)
        throw error
      }
    }
    return this.instance
  }

  static getDrizzle() {
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
        console.log('Database closed successfully')
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
      console.log('Already reopening database, waiting...')
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
      console.log('Database is closing, waiting...')
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

      console.log('Creating new database instance...')
      this.instance = SQLite.openDatabaseSync(this.dbPath)

      // Test the connection with a simple query
      try {
        await this.instance.execAsync('PRAGMA foreign_keys = ON')
        await this.instance.execAsync('SELECT 1')
        console.log('Database connection test successful')
      } catch (testError) {
        console.error('Database connection test failed:', testError)
        throw new Error('Failed to establish a working database connection')
      }

      // Initialize Drizzle
      this.drizzleDb = drizzle(this.instance)
      console.log('Database reopened successfully')

      // Update the exported db reference
      // This is crucial to ensure all code using the exported db gets the new instance
      exports.db = this.drizzleDb
      exports.sqlite = this.instance

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

      const instance = this.getInstance()

      if (!instance) {
        throw new Error('Failed to get database instance for reset')
      }

      // First, get all table names using getAllAsync for SELECT statements
      let tables: string[] = []
      try {
        const tablesResult = await instance.getAllAsync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' 
          AND name NOT LIKE 'sqlite_%'
        `)

        // Extract table names from the result
        if (Array.isArray(tablesResult)) {
          tables = tablesResult
            .filter(
              (item: any) => item && typeof item === 'object' && item.name,
            )
            .map((item: any) => item.name)
        }
      } catch (error) {
        console.warn(
          'Could not get table names, proceeding with default drop statements:',
          error,
        )
      }

      console.warn('Found tables:', tables)

      // Drop tables in correct order (child tables first, then parent tables)
      const dropStatements = [
        'PRAGMA foreign_keys = OFF',
        // Drop child tables first (order matters due to foreign key constraints)
        'DROP TABLE IF EXISTS feedback', // depends on orders
        'DROP TABLE IF EXISTS drivers', // depends on orders
        'DROP TABLE IF EXISTS order_items', // depends on orders and menu_items
        'DROP TABLE IF EXISTS orders', // depends on users, restaurants, user_addresses
        'DROP TABLE IF EXISTS menu_items', // depends on restaurants and categories
        'DROP TABLE IF EXISTS categories', // depends on restaurants
        'DROP TABLE IF EXISTS user_addresses', // depends on users
        // Drop parent tables
        'DROP TABLE IF EXISTS restaurants', // independent
        'DROP TABLE IF EXISTS users', // independent
        'DROP TABLE IF EXISTS _migrations', // system table
        'PRAGMA foreign_keys = ON',
      ]

      // Execute each drop statement with proper error handling
      for (const sql of dropStatements) {
        try {
          await instance.execAsync(sql)
        } catch (error) {
          console.warn(`Warning: Failed to execute ${sql}:`, error)
          // Continue with other statements even if one fails
        }
      }

      // Verify tables are dropped
      let remainingTables: string[] = []
      try {
        const remainingResult = await instance.getAllAsync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' 
          AND name NOT LIKE 'sqlite_%'
        `)

        if (Array.isArray(remainingResult)) {
          remainingTables = remainingResult
            .filter(
              (item: any) => item && typeof item === 'object' && item.name,
            )
            .map((item: any) => item.name)
        }
      } catch (error) {
        console.warn('Could not verify remaining tables:', error)
      }

      if (remainingTables.length > 0) {
        console.warn('Some tables could not be dropped:', remainingTables)
      }

      // Run migrations using the same instance
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
}

// Export instance and methods bound to the class
export const db = DatabaseManager.getDrizzle()
export const sqlite = DatabaseManager.getInstance()
export const closeConnection =
  DatabaseManager.closeConnection.bind(DatabaseManager)
export const reopenConnection =
  DatabaseManager.reopenConnection.bind(DatabaseManager)
export const resetDatabase = DatabaseManager.resetDatabase.bind(DatabaseManager)
