// Copyright (c) Meta Platforms, Inc. and affiliates.
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { runMigrations } from './migrations'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static isClosing: boolean = false
  private static isReopening: boolean = false
  private static dbPath: string = 'andojomusic.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      try {
        console.log('Creating new database instance...')
        this.instance = SQLite.openDatabaseSync('andojomusic.db')
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
        // First disable foreign key checks
        'PRAGMA foreign_keys = OFF;',

        // Drop tables in reverse order of dependencies
        'DROP TABLE IF EXISTS recently_played;',
        'DROP TABLE IF EXISTS favorites;',
        'DROP TABLE IF EXISTS categories;',
        'DROP TABLE IF EXISTS playlist_songs;',
        'DROP TABLE IF EXISTS playback_settings;',
        'DROP TABLE IF EXISTS play_history;',
        'DROP TABLE IF EXISTS playlists;',
        'DROP TABLE IF EXISTS songs;',
        'DROP TABLE IF EXISTS albums;',
        'DROP TABLE IF EXISTS artists;',
        'DROP TABLE IF EXISTS users;',
        'DROP TABLE IF EXISTS _migrations;',

        // Re-enable foreign key checks
        'PRAGMA foreign_keys = ON;',

        // Vacuum the database to reclaim space and rebuild
        'VACUUM;',
      ]

      // Drop tables using existing instance
      for (const sql of dropStatements) {
        try {
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
