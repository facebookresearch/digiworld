// Copyright (c) Meta Platforms, Inc. and affiliates.
import { executeStatements } from './execute-statements'

const CREATE_TABLES = [
  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    status TEXT DEFAULT 'active',
    settings TEXT,
    metadata TEXT
  );`,

  // User locations
  `CREATE TABLE IF NOT EXISTS user_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    label TEXT,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    metadata TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // Vehicle types lookup
  `CREATE TABLE IF NOT EXISTS vehicle_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 'car','motorcycle','van','truck','ev'
    name TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
  );`,

  // Vehicles
  `CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    nickname TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    year INTEGER,
    plate_number TEXT NOT NULL UNIQUE, -- globally unique (8 digits alphanumeric)
    vehicle_type_id INTEGER NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    metadata TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE RESTRICT
  );`,

  // Payment methods
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit_card','debit_card','wallet')),
    provider TEXT,
    display_name TEXT,
    card_number TEXT NOT NULL UNIQUE,
    last_four TEXT NOT NULL,
    expiry_month INTEGER CHECK(expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    metadata TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // Parking zones (zone-level multipliers)
  `CREATE TABLE IF NOT EXISTS parking_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    zone_code TEXT NOT NULL UNIQUE, -- e.g. 'AB23C4'
    operator TEXT, -- City / operator name
    zone_type TEXT, -- curbside, lot, garage
    capacity INTEGER,
    rate_currency TEXT DEFAULT 'USD',
    rate_multiplier REAL DEFAULT 1.0, -- multiplies global vehicle type rate
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    metadata TEXT
  );`,

  // Global rates per vehicle type (used with zone multiplier)
  `CREATE TABLE IF NOT EXISTS vehicle_type_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    vehicle_type_id INTEGER NOT NULL,
    rate_per_hour REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    FOREIGN KEY(vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE CASCADE,
    UNIQUE(vehicle_type_id)
  );`,

  // Parking history (bookings)
  `CREATE TABLE IF NOT EXISTS parking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    parking_zone_id INTEGER NOT NULL,
    start_time TEXT,
    planned_end_time TEXT,
    actual_end_time TEXT,
    planned_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    charged_amount REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'active', --  active, extended, completed, expired
    metadata TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY(parking_zone_id) REFERENCES parking_zones(id)
  );`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_parking_history_id INTEGER,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
    expires_at TEXT,
    metadata TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(related_parking_history_id) REFERENCES parking_history(id)
  );`,

  // ----------------
  // Indexes
  // ----------------
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);`,
  `CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);`,
  `CREATE INDEX IF NOT EXISTS idx_vehicle_types_code ON vehicle_types(code);`,
  `CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_parking_zones_loc ON parking_zones(latitude, longitude);`,
  `CREATE INDEX IF NOT EXISTS idx_vehicle_type_rates_type ON vehicle_type_rates(vehicle_type_id);`,
  `CREATE INDEX IF NOT EXISTS idx_parking_history_user ON parking_history(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_parking_history_zone ON parking_history(parking_zone_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`,
]

// Export CREATE_TABLES for use in test runners (better-sqlite3)
export const createTables = CREATE_TABLES

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
