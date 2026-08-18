import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { runMigrations } from './migrations'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static isClosing: boolean = false
  private static isReopening: boolean = false
  private static dbPath: string = 'andojomails.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        this.instance = SQLite.openDatabaseSync('andojomails.db')
        this.drizzleDb = drizzle(this.instance)
      } catch (error) {
        console.error('Failed to create database instance:', error)
        throw error
      }
    }
    return this.instance
  }

  static getDrizzle() {
    if (!this.drizzleDb || !this.instance) {
      return drizzle(this.getInstance())
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

      // Initialize Drizzle
      this.drizzleDb = drizzle(this.instance)

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
      // Use the existing db instance from client.ts
      const instance = this.getInstance()

      const dropStatements = [
        'PRAGMA foreign_keys = OFF',
        'DROP TABLE IF EXISTS users',
        'DROP TABLE IF EXISTS emails',
        'DROP TABLE IF EXISTS _migrations',
        'PRAGMA foreign_keys = ON',
      ]

      // Drop tables using existing instance
      for (const sql of dropStatements) {
        await instance.execAsync(sql)
      }

      // Run migrations using the same instance
      const migrationResult = await runMigrations()
      if (!migrationResult) {
        throw new Error('Migration failed')
      }

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
