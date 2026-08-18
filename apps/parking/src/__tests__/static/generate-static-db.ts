// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Generate Static Database for Parking App Tests
 *
 * This script creates a static database file (ABC.db) for use in static tests.
 * The database is pre-populated with schema and mock data, so tests can copy
 * it quickly instead of rebuilding from scratch each time.
 *
 * Run this script once to create the base database:
 *   yarn test:generate-static-db
 *
 * The generated ABC.db file will be used by test helpers to create temporary
 * database copies for isolated testing.
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

// Now we can safely import createTables from migrations/index
// Note: This will trigger imports of executeStatements and db/index, but our mock handles expo-sqlite
import { createTables } from '../../db/migrations/index'

// Mock expo-sqlite module before any imports that use it
// This prevents the expo-sqlite import error when importing createTables
const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function (id: string) {
  if (id === 'expo-sqlite' || id.includes('expo-sqlite')) {
    return {
      openDatabaseSync: () => ({
        execAsync: async () => {},
      }),
      drizzle: () => ({}), // Mock drizzle function too
    }
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments)
}

// Keep the mock active for the entire script execution
// Don't restore originalRequire - let it stay mocked

/**
 * Create static database with schema and mock data
 */
export async function createStaticDatabase(): Promise<void> {
  const STATIC_DB_PATH = path.resolve(__dirname, 'ABC.db')

  if (fs.existsSync(STATIC_DB_PATH)) {
    console.log('Static database already exists at', STATIC_DB_PATH)
    console.log('Delete it first if you want to regenerate it.')
    return
  }

  console.log('Creating static database for parking app tests...')

  // Create the static database directory if it doesn't exist
  const staticDir = path.dirname(STATIC_DB_PATH)
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true })
  }

  // Create temporary database
  const tempPath = path.resolve(__dirname, `temp_static_${Date.now()}.db`)
  const db = new Database(tempPath)
  db.pragma('foreign_keys = ON')

  try {
    // Run migrations to create schema directly using better-sqlite3
    console.log('Running migrations to create schema...')
    await runMigrationsDirectly(db)

    // Initialize with mock data using direct SQL inserts
    // We use better-sqlite3 directly instead of mutations (which uses expo-sqlite)
    console.log('Seeding database with mock data...')
    await seedDatabaseWithMockData(db)

    // Close the temporary database
    db.close()

    // Copy to static location
    fs.copyFileSync(tempPath, STATIC_DB_PATH)

    console.log('✅ Static database created successfully at', STATIC_DB_PATH)
    console.log('   You can now use createTempDB() in tests to copy this file.')
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
 * Run migrations directly using better-sqlite3 (avoiding expo-sqlite)
 */
async function runMigrationsDirectly(db: Database.Database): Promise<void> {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run()

  // Separate table creation from index creation
  const tableStatements = createTables.filter(
    (stmt: string) =>
      stmt.trim().startsWith('CREATE TABLE') ||
      stmt.trim().startsWith('CREATE VIRTUAL TABLE'),
  )
  const indexStatements = createTables.filter((stmt: string) =>
    stmt.trim().startsWith('CREATE INDEX'),
  )

  // Run table creation statements first
  for (const statement of tableStatements) {
    try {
      db.prepare(statement).run()
    } catch (error: any) {
      // Some statements might fail if tables already exist, which is fine
      if (!error.message?.includes('already exists')) {
        console.warn(
          `Table creation failed: ${statement.substring(0, 100)}...`,
          error,
        )
      }
    }
  }

  // Run index creation statements after tables are created
  for (const statement of indexStatements) {
    try {
      db.prepare(statement).run()
    } catch (error: any) {
      // Some statements might fail if indexes already exist, which is fine
      if (!error.message?.includes('already exists')) {
        console.warn(
          `Index creation failed: ${statement.substring(0, 100)}...`,
          error,
        )
      }
    }
  }

  console.log('✅ Migrations completed successfully')
}

/**
 * Seed database with mock data directly using better-sqlite3
 */
async function seedDatabaseWithMockData(db: Database.Database): Promise<void> {
  // Import mock data
  const usersData = require('../../data/mock-users.json')
  const vehicleTypesData = require('../../data/mock-vehicle_types.json')
  const vehiclesData = require('../../data/mock-vehicles.json')
  const parkingZonesData = require('../../data/mock-parking_zones.json')
  const vehicleTypeRatesData = require('../../data/mock-vehicle_type_rates.json')
  const paymentMethodsData = require('../../data/mock-payment_methods.json')
  const userLocationsData = require('../../data/mock-user_locations.json')
  const parkingHistoryData = require('../../data/mock-parking_history.json')
  const notificationsData = require('../../data/mock-notifications.json')

  // Seed in dependency order
  console.log('  - Seeding vehicle types...')
  for (const vehicleType of vehicleTypesData) {
    db.prepare(
      `INSERT INTO vehicle_types (code, name, description, metadata, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      vehicleType.code,
      vehicleType.name,
      vehicleType.description || null,
      vehicleType.metadata || null,
      vehicleType.created_at || new Date().toISOString(),
    )
  }

  console.log('  - Seeding users...')
  for (const user of usersData) {
    db.prepare(
      `INSERT INTO users (email, password, full_name, phone_number, created_at, updated_at, status, settings, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      user.email,
      user.password,
      user.fullName || null,
      user.phoneNumber || null,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || new Date().toISOString(),
      user.status || 'active',
      user.settings || null,
      user.metadata || null,
    )
  }

  console.log('  - Seeding user locations...')
  for (const location of userLocationsData) {
    db.prepare(
      `INSERT INTO user_locations (user_id, label, address, latitude, longitude, is_default, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      location.userId || location.user_id,
      location.label || null,
      location.address,
      location.latitude || null,
      location.longitude || null,
      location.isDefault || location.is_default || 0,
      location.createdAt || location.created_at || new Date().toISOString(),
      location.updatedAt || location.updated_at || new Date().toISOString(),
      location.metadata || null,
    )
  }

  console.log('  - Seeding vehicles...')
  for (const vehicle of vehiclesData) {
    db.prepare(
      `INSERT INTO vehicles (user_id, vehicle_type_id, plate_number, nickname, make, model, color, year, is_default, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      vehicle.userId || vehicle.user_id,
      vehicle.vehicleTypeId || vehicle.vehicle_type_id,
      vehicle.plateNumber || vehicle.plate_number,
      vehicle.nickname || null,
      vehicle.make || null,
      vehicle.model || null,
      vehicle.color || null,
      vehicle.year || null,
      vehicle.isDefault || vehicle.is_default || 0,
      vehicle.createdAt || vehicle.created_at || new Date().toISOString(),
      vehicle.updatedAt || vehicle.updated_at || new Date().toISOString(),
      vehicle.metadata || null,
    )
  }

  console.log('  - Seeding payment methods...')
  for (const paymentMethod of paymentMethodsData) {
    db.prepare(
      `INSERT INTO payment_methods (user_id, type, provider, display_name, card_number, last_four, expiry_month, expiry_year, is_default, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      paymentMethod.userId || paymentMethod.user_id,
      paymentMethod.type,
      paymentMethod.provider || null,
      paymentMethod.displayName || paymentMethod.display_name || null,
      paymentMethod.cardNumber || paymentMethod.card_number,
      paymentMethod.lastFour || paymentMethod.last_four,
      paymentMethod.expiryMonth || paymentMethod.expiry_month || null,
      paymentMethod.expiryYear || paymentMethod.expiry_year || null,
      paymentMethod.isDefault || paymentMethod.is_default || 0,
      paymentMethod.createdAt ||
        paymentMethod.created_at ||
        new Date().toISOString(),
      paymentMethod.updatedAt ||
        paymentMethod.updated_at ||
        new Date().toISOString(),
      paymentMethod.metadata || null,
    )
  }

  console.log('  - Seeding parking zones...')
  for (const zone of parkingZonesData) {
    db.prepare(
      `INSERT INTO parking_zones (name, description, latitude, longitude, zone_code, operator, zone_type, capacity, rate_currency, rate_multiplier, is_active, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      zone.name,
      zone.description || null,
      zone.latitude,
      zone.longitude,
      zone.zoneCode || zone.zone_code || null,
      zone.operator || null,
      zone.zoneType || zone.zone_type || null,
      zone.capacity || null,
      zone.rateCurrency || zone.rate_currency || 'USD',
      zone.rateMultiplier || zone.rate_multiplier || 1.0,
      zone.isActive !== undefined
        ? zone.isActive
        : zone.is_active !== undefined
          ? zone.is_active
          : 1,
      zone.createdAt || zone.created_at || new Date().toISOString(),
      zone.updatedAt || zone.updated_at || new Date().toISOString(),
      zone.metadata || null,
    )
  }

  console.log('  - Seeding vehicle type rates...')
  for (const rate of vehicleTypeRatesData) {
    db.prepare(
      `INSERT INTO vehicle_type_rates (vehicle_type_id, rate_per_hour, currency, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(
      rate.vehicleTypeId || rate.vehicle_type_id,
      rate.ratePerHour || rate.rate_per_hour,
      rate.currency || 'USD',
      rate.createdAt || rate.created_at || new Date().toISOString(),
    )
  }

  console.log('  - Seeding parking history...')
  for (const history of parkingHistoryData) {
    db.prepare(
      `INSERT INTO parking_history (user_id, vehicle_id, parking_zone_id, start_time, planned_end_time, actual_end_time, planned_duration_minutes, actual_duration_minutes, charged_amount, currency, status, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      history.userId || history.user_id,
      history.vehicleId || history.vehicle_id,
      history.parkingZoneId || history.parking_zone_id,
      history.startTime || history.start_time || null,
      history.plannedEndTime || history.planned_end_time || null,
      history.actualEndTime || history.actual_end_time || null,
      history.plannedDurationMinutes ||
        history.planned_duration_minutes ||
        null,
      history.actualDurationMinutes || history.actual_duration_minutes || null,
      history.chargedAmount || history.charged_amount || 0.0,
      history.currency || 'USD',
      history.status || 'booked',
      history.metadata || null,
      history.createdAt || history.created_at || new Date().toISOString(),
      history.updatedAt || history.updated_at || new Date().toISOString(),
    )
  }

  console.log('  - Seeding notifications...')
  for (const notification of notificationsData) {
    db.prepare(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_parking_history_id, is_read, read_at, created_at, expires_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      notification.userId || notification.user_id,
      notification.notificationType || notification.notification_type,
      notification.title,
      notification.message,
      notification.relatedParkingHistoryId ||
        notification.related_parking_history_id ||
        null,
      notification.isRead !== undefined
        ? notification.isRead
        : notification.is_read !== undefined
          ? notification.is_read
          : 0,
      notification.readAt || notification.read_at || null,
      notification.createdAt ||
        notification.created_at ||
        new Date().toISOString(),
      notification.expiresAt || notification.expires_at || null,
      notification.metadata || null,
    )
  }

  console.log('✅ Mock data seeded successfully')
}

// Run if called directly
if (require.main === module) {
  createStaticDatabase()
    .then(() => {
      console.log('\n✅ Static database generation completed successfully!')
      console.log('   You can now run tests with: yarn test')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Static database generation failed:', error)
      process.exit(1)
    })
}
