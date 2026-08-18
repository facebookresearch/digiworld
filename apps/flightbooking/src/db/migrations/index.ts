// Copyright (c) Meta Platforms, Inc. and affiliates.
import { executeStatements } from './execute-statements'

const CREATE_TABLES = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT
  )`,

  // Airlines table
  `CREATE TABLE IF NOT EXISTS airlines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    iata_code TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Airports table
  `CREATE TABLE IF NOT EXISTS airports (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    timezone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // City pairs table
  `CREATE TABLE IF NOT EXISTS city_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT NOT NULL REFERENCES airports(code),
    destination TEXT NOT NULL REFERENCES airports(code),
    distance_km INTEGER NOT NULL,
    avg_duration_minutes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Flights table
  `CREATE TABLE IF NOT EXISTS flights (
    flight_id TEXT PRIMARY KEY,
    airline_id TEXT NOT NULL REFERENCES airlines(id),
    airline_code TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL REFERENCES airports(code),
    destination TEXT NOT NULL REFERENCES airports(code),
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fare REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    seats_available INTEGER NOT NULL,
    aircraft_type TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Flights config table (templates for dynamic generation)
  `CREATE TABLE IF NOT EXISTS flightsconfig (
    flight_id TEXT PRIMARY KEY,
    airline_id TEXT NOT NULL REFERENCES airlines(id),
    airline_code TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL REFERENCES airports(code),
    destination TEXT NOT NULL REFERENCES airports(code),
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fare REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    seats_available INTEGER NOT NULL,
    aircraft_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Bookings table
  `CREATE TABLE IF NOT EXISTS bookings (
    booking_id TEXT PRIMARY KEY,
    booking_reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_type TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    total_price REAL NOT NULL,
    refund_amount REAL DEFAULT 0,
    amount_paid REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // Booking flights junction table
  `CREATE TABLE IF NOT EXISTS booking_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    flight_id TEXT NOT NULL REFERENCES flights(flight_id),
    airline_code TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fare REAL NOT NULL,
    segment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    cancellation_date TEXT,
    cancellation_reason TEXT,
    refund_amount REAL DEFAULT 0
  )`,

  // Passengers table
  `CREATE TABLE IF NOT EXISTS passengers (
    passenger_id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    passport_number TEXT NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Seat assignments table
  `CREATE TABLE IF NOT EXISTS seat_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id TEXT NOT NULL REFERENCES passengers(passenger_id) ON DELETE CASCADE,
    flight_id TEXT NOT NULL REFERENCES flights(flight_id),
    seat_number TEXT NOT NULL,
    check_in_status TEXT DEFAULT 'not_checked_in',
    check_in_time TEXT
  )`,
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    console.log('Flight booking migrations completed successfully')
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
