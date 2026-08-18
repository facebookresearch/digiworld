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
  private static dbPath: string = 'andojotransit.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        this.instance = SQLite.openDatabaseSync(this.dbPath)
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
      console.log('Current DB instance:', this.instance)
      try {
        await this.instance.closeAsync()
        console.log('Database closed successfully')
      } catch (e) {
        console.warn('Error closing database:', e)
      } finally {
        this.instance = null
        this.drizzleDb = null
        this.isClosing = false
        console.log('Database instance and Drizzle set to null')
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

      // Use the existing db instance
      const instance = this.getInstance()

      console.log('Dropping existing tables...')
      const dropStatements = [
        'PRAGMA foreign_keys = OFF;',

        // Drop in reverse dependency order to prevent FK errors
        'DROP TABLE IF EXISTS trip_steps;',
        'DROP TABLE IF EXISTS trip_options;',
        'DROP TABLE IF EXISTS saved_routes;',
        'DROP TABLE IF EXISTS recent_searches;',
        'DROP TABLE IF EXISTS user_preferences;',
        'DROP TABLE IF EXISTS alert_stops;',
        'DROP TABLE IF EXISTS alert_lines;',
        'DROP TABLE IF EXISTS service_alerts;',
        'DROP TABLE IF EXISTS line_stops;',
        'DROP TABLE IF EXISTS lines;',
        'DROP TABLE IF EXISTS stop_platforms;',
        'DROP TABLE IF EXISTS stops;',
        'DROP TABLE IF EXISTS areas;',
        'DROP TABLE IF EXISTS users;',
        'DROP TABLE IF EXISTS app_constants;',
        'VACUUM;',
        'PRAGMA foreign_keys = ON;',
      ]

      // Drop tables using existing instance
      for (const sql of dropStatements) {
        try {
          console.log('Running', sql)
          await instance.execAsync(sql)
        } catch (dropError) {
          console.error(`Error executing: ${sql}`, dropError)
          // Continue with other statements even if one fails
        }
      }

      // Ensure foreign keys are enabled before migrations
      await instance.execAsync('PRAGMA foreign_keys = ON;')

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
