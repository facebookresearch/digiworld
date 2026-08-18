// Copyright (c) Meta Platforms, Inc. and affiliates.
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { mutations } from '@/db/mutations'

/**
 * Test helper functions for parking app tests
 * Similar to banking app test helpers
 */

// Path to the static database file (ABC.db)
export const ORIGINAL_DB_PATH = path.resolve(__dirname, 'static/ABC.db')

// Create a temporary database file by copying ABC.db
// This provides a pre-populated database for faster test setup
export function createTempDB(): Database.Database {
  // Check if ABC.db exists
  if (!fs.existsSync(ORIGINAL_DB_PATH)) {
    // If ABC.db doesn't exist, create a fresh empty database
    console.warn(
      `Static database not found at ${ORIGINAL_DB_PATH}. Creating empty database.`,
    )
    console.warn(
      'Run "yarn test:generate-static-db" to create ABC.db for faster tests.',
    )
    const tempPath = path.resolve(__dirname, `parking_test_${Date.now()}.db`)
    const db = new Database(tempPath)
    db.pragma('foreign_keys = ON')
    return db
  }

  // Copy ABC.db to a temporary file
  const tempPath = path.resolve(__dirname, `parking_test_${Date.now()}.db`)
  fs.copyFileSync(ORIGINAL_DB_PATH, tempPath)
  const db = new Database(tempPath)
  db.pragma('foreign_keys = ON')
  return db
}

// Cleanup temporary database file
export function cleanupTempDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

// Create fresh database with schema and mock data
export async function setupFreshDB(): Promise<Database.Database> {
  const dbPath = path.resolve(__dirname, `parking_fresh_${Date.now()}.db`)
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  // Initialize with mock data
  await mutations.initializeDatabase()

  return db
}

// Cleanup fresh database
export function teardownTestDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

// Helper to create test user
export async function createTestUser(
  db: Database.Database,
  userData?: {
    email?: string
    password?: string
    fullName?: string
    phoneNumber?: string
  },
) {
  const email = userData?.email || `test${Date.now()}@example.com`
  const password = userData?.password || 'password123'

  const result = db
    .prepare(
      `INSERT INTO users (email, password, full_name, phone_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(
      email,
      password,
      userData?.fullName || 'Test User',
      userData?.phoneNumber || '123-456-7890',
    )

  return {
    id: result.lastInsertRowid as number,
    email,
    password,
    fullName: userData?.fullName || 'Test User',
    phoneNumber: userData?.phoneNumber || '123-456-7890',
  }
}

// Helper to create test vehicle type
export async function createTestVehicleType(
  db: Database.Database,
  data?: {
    code?: string
    name?: string
    description?: string
  },
) {
  const code = data?.code || 'car'
  const name = data?.name || 'Car'

  const result = db
    .prepare(
      `INSERT INTO vehicle_types (code, name, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
    )
    .run(code, name, data?.description || null)

  return {
    id: result.lastInsertRowid as number,
    code,
    name,
    description: data?.description || null,
  }
}

// Helper to create test vehicle type rate
export async function createTestVehicleTypeRate(
  db: Database.Database,
  vehicleTypeId: number,
  ratePerHour: number = 5.0,
) {
  const result = db
    .prepare(
      `INSERT INTO vehicle_type_rates (vehicle_type_id, rate_per_hour, currency, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
    )
    .run(vehicleTypeId, ratePerHour, 'USD')

  return {
    id: result.lastInsertRowid as number,
    vehicleTypeId,
    ratePerHour,
    currency: 'USD',
  }
}

// Helper to create test parking zone
export async function createTestParkingZone(
  db: Database.Database,
  data?: {
    name?: string
    latitude?: number
    longitude?: number
    rateMultiplier?: number
  },
) {
  const name = data?.name || 'Test Zone'
  const latitude = data?.latitude || 40.7128
  const longitude = data?.longitude || -74.006

  const result = db
    .prepare(
      `INSERT INTO parking_zones (name, latitude, longitude, rate_multiplier, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    )
    .run(name, latitude, longitude, data?.rateMultiplier || 1.0)

  return {
    id: result.lastInsertRowid as number,
    name,
    latitude,
    longitude,
    rateMultiplier: data?.rateMultiplier || 1.0,
    isActive: 1,
  }
}

// Helper to create test vehicle
export async function createTestVehicle(
  db: Database.Database,
  userId: number,
  vehicleTypeId: number,
  data?: {
    plateNumber?: string
    nickname?: string
  },
) {
  const plateNumber = data?.plateNumber || `TEST${Date.now()}`

  const result = db
    .prepare(
      `INSERT INTO vehicles (user_id, vehicle_type_id, plate_number, nickname, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(userId, vehicleTypeId, plateNumber, data?.nickname || null)

  return {
    id: result.lastInsertRowid as number,
    userId,
    vehicleTypeId,
    plateNumber,
    nickname: data?.nickname || null,
  }
}

// Helper to create test payment method
export async function createTestPaymentMethod(
  db: Database.Database,
  userId: number,
  data?: {
    type?: string
    cardNumber?: string
    lastFour?: string
  },
) {
  const type = data?.type || 'credit_card'
  const cardNumber = data?.cardNumber || '4111111111111111'
  const lastFour = data?.lastFour || '1111'

  const result = db
    .prepare(
      `INSERT INTO payment_methods (user_id, type, card_number, last_four, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(userId, type, cardNumber, lastFour)

  return {
    id: result.lastInsertRowid as number,
    userId,
    type,
    cardNumber,
    lastFour,
  }
}

// Helper to create test parking history
export async function createTestParkingHistory(
  db: Database.Database,
  userId: number,
  vehicleId: number,
  parkingZoneId: number,
  data?: {
    startTime?: string
    plannedEndTime?: string
    status?: string
    chargedAmount?: number
  },
) {
  const startTime = data?.startTime || new Date().toISOString()
  const plannedEndTime =
    data?.plannedEndTime || new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour later

  const result = db
    .prepare(
      `INSERT INTO parking_history 
       (user_id, vehicle_id, parking_zone_id, start_time, planned_end_time, 
        planned_duration_minutes, charged_amount, status, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USD', datetime('now'), datetime('now'))`,
    )
    .run(
      userId,
      vehicleId,
      parkingZoneId,
      startTime,
      plannedEndTime,
      60, // 60 minutes
      data?.chargedAmount || 5.0,
      data?.status || 'booked',
    )

  return {
    id: result.lastInsertRowid as number,
    userId,
    vehicleId,
    parkingZoneId,
    startTime,
    plannedEndTime,
    status: data?.status || 'booked',
    chargedAmount: data?.chargedAmount || 5.0,
  }
}
