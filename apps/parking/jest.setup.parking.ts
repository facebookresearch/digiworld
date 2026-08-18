// Copyright (c) Meta Platforms, Inc. and affiliates.
/*
 * Global Jest setup for the @andojo/park package.
 *
 * 1. Creates an in-memory SQLite database using `better-sqlite3`.
 * 2. Boots Drizzle ORM against that DB so production query code can run unmodified.
 * 3. Runs minimal DDL needed for the parking unit-tests.
 * 4. Re-exports the DB instance & injects it via `jest.mock('@/db/index')`,
 *    so all imports of `db`/`sqlite` inside production code point to the test DB.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

// Mock react-native-fs to avoid NativeEventEmitter issues
jest.mock('react-native-fs', () => ({
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  ExternalDirectoryPath: '/mock/external',
  DocumentDirectoryPath: '/mock/document',
  CachesDirectoryPath: '/mock/caches',
  TemporaryDirectoryPath: '/mock/temp',
  LibraryDirectoryPath: '/mock/library',
  MainBundlePath: '/mock/bundle',
}))

// Create memory database
const sqlite = new Database(':memory:')
// enforce FKs like in prod
sqlite.pragma('foreign_keys = ON')

// Minimal parking schema – ONLY the columns referenced in src/db/queries.ts
const ddl = `
CREATE TABLE users (
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
);

CREATE TABLE user_locations (
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
);

CREATE TABLE vehicle_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);

CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL,
  nickname TEXT,
  make TEXT,
  model TEXT,
  color TEXT,
  year INTEGER,
  plate_number TEXT NOT NULL UNIQUE,
  vehicle_type_id INTEGER NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  metadata TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE RESTRICT
);

CREATE TABLE payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('credit_card','debit_card','wallet')),
  provider TEXT,
  display_name TEXT,
  card_number TEXT NOT NULL,
  last_four TEXT NOT NULL,
  expiry_month INTEGER CHECK(expiry_month BETWEEN 1 AND 12),
  expiry_year INTEGER,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  metadata TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE parking_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  zone_code TEXT,
  operator TEXT,
  zone_type TEXT,
  capacity INTEGER,
  rate_currency TEXT DEFAULT 'USD',
  rate_multiplier REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  metadata TEXT
);

CREATE TABLE vehicle_type_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  vehicle_type_id INTEGER NOT NULL,
  rate_per_hour REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY(vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE CASCADE,
  UNIQUE(vehicle_type_id)
);

CREATE TABLE parking_history (
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
  status TEXT NOT NULL DEFAULT 'booked',
  metadata TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY(parking_zone_id) REFERENCES parking_zones(id)
);

CREATE TABLE notifications (
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
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_types_code ON vehicle_types(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_parking_zones_loc ON parking_zones(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_vehicle_type_rates_type ON vehicle_type_rates(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_parking_history_user ON parking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_parking_history_zone ON parking_history(parking_zone_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`

// Execute all statements (split on ';\n') – ignore empty strings after split
for (const stmt of ddl.split(/;\s*\n/)) {
  const sql = stmt.trim()
  if (sql) {
    sqlite.prepare(sql).run()
  }
}

// 3️⃣  Boot Drizzle
const db = drizzle(sqlite)

// 4️⃣  Provide the mock BEFORE tests import production code
jest.doMock('@/db/index', () => ({ db, sqlite }))

// Re-export for test files that may need to run raw SQL
export { db }

// 5️⃣  Global helper to reset all tables before every test file runs
beforeEach(() => {
  const tables = [
    'notifications',
    'parking_history',
    'vehicle_type_rates',
    'parking_zones',
    'payment_methods',
    'vehicles',
    'vehicle_types',
    'user_locations',
    'users',
  ]
  for (const t of tables) {
    sqlite.prepare(`DELETE FROM ${t}`).run()
  }
})
