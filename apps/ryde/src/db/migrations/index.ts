import { executeStatements } from './execute-statements'

const CREATE_TABLES = [
  // Users table
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    settings TEXT NOT NULL,
    status TEXT NOT NULL
  )`,

  // User addresses table (simplified)
  `CREATE TABLE user_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    address TEXT NOT NULL,
    is_default INTEGER NOT NULL, -- 0 or 1
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Ride options (categories like Sedan, Bike, Auto)
  `CREATE TABLE ride_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    base_fare REAL NOT NULL,
    rate_per_km REAL NOT NULL,
    icon TEXT
  )`,

  // Drivers table (linked to ride_options)
  `CREATE TABLE drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    vehicle_name TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    ride_option_id INTEGER NOT NULL,
    rating REAL,
    profile_picture TEXT,
    FOREIGN KEY (ride_option_id) REFERENCES ride_options(id) ON DELETE CASCADE
  )`,

  // Rides table
  `CREATE TABLE rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    driver_id INTEGER,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('booked', 'driver-assigned', 'ongoing', 'completed', 'cancelled')),
    start_time TEXT,
    end_time TEXT,
    distance_km REAL,
    fare_amount REAL,
    feedback_submitted INTEGER DEFAULT 0,
    payment_mode TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
  )`,

  // Feedback table
  `CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    ride_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    submitted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
  )`,

  `
  CREATE TABLE IF NOT EXISTS user_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('digital_wallet', 'credit_card')),
    provider TEXT,
    account_number TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `,
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
