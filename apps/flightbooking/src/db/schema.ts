import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Trip type enum
export enum TripType {
  ONE_WAY = 'one_way',
  ROUND_TRIP = 'round_trip',
}

// Booking status enum
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  PARTIALLY_CANCELLED = 'partially_cancelled',
  COMPLETED = 'completed',
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
}

// Flight status enum
export enum FlightStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// Flight segment enum
export enum FlightSegment {
  OUTBOUND = 'outbound',
  RETURN = 'return',
}

// --- Independent Tables ---

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar').default(''),
  bio: text('bio').default(''),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deleted_at: text('deleted_at'),
})

export const airlines = sqliteTable('airlines', {
  id: text('id').primaryKey(), // airline_15, airline_9, etc.
  name: text('name').notNull(),
  iata_code: text('iata_code').notNull().unique(), // AM, HA, WN, UA, F9
  country: text('country').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const airports = sqliteTable('airports', {
  code: text('code').primaryKey(), // DCA, TPA, LAS, EWR, YVR
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  timezone: text('timezone').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const cityPairs = sqliteTable('city_pairs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  origin: text('origin')
    .notNull()
    .references(() => airports.code),
  destination: text('destination')
    .notNull()
    .references(() => airports.code),
  distance_km: integer('distance_km').notNull(),
  avg_duration_minutes: integer('avg_duration_minutes').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const flights = sqliteTable('flights', {
  flight_id: text('flight_id').primaryKey(), // HA6326_2025-10-09
  airline_id: text('airline_id')
    .notNull()
    .references(() => airlines.id),
  airline_code: text('airline_code').notNull(),
  flight_number: text('flight_number').notNull(),
  origin: text('origin')
    .notNull()
    .references(() => airports.code),
  destination: text('destination')
    .notNull()
    .references(() => airports.code),
  departure_time: text('departure_time').notNull(), // ISO 8601 format
  arrival_time: text('arrival_time').notNull(), // ISO 8601 format
  duration_minutes: integer('duration_minutes').notNull(),
  fare: real('fare').notNull(),
  currency: text('currency').notNull().default('USD'),
  seats_available: integer('seats_available').notNull(),
  aircraft_type: text('aircraft_type').notNull(),
  date: text('date').notNull(), // Flight date in YYYY-MM-DD format
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const flightsconfig = sqliteTable('flightsconfig', {
  flight_id: text('flight_id').primaryKey(), // Auto-generated unique ID
  airline_id: text('airline_id')
    .notNull()
    .references(() => airlines.id),
  airline_code: text('airline_code').notNull(),
  flight_number: text('flight_number').notNull(),
  origin: text('origin')
    .notNull()
    .references(() => airports.code),
  destination: text('destination')
    .notNull()
    .references(() => airports.code),
  departure_time: text('departure_time').notNull(), // HH:MM format
  arrival_time: text('arrival_time').notNull(), // HH:MM format
  duration_minutes: integer('duration_minutes').notNull(),
  fare: real('fare').notNull(),
  currency: text('currency').notNull().default('USD'),
  seats_available: integer('seats_available').notNull(),
  aircraft_type: text('aircraft_type').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const bookings = sqliteTable('bookings', {
  booking_id: text('booking_id').primaryKey(), // BK001, BK002, etc.
  booking_reference: text('booking_reference').notNull().unique(), // ABC123
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  trip_type: text('trip_type').notNull(), // one_way, round_trip
  booking_date: text('booking_date').notNull(), // ISO 8601 format
  status: text('status').notNull(), // pending, confirmed, cancelled, partially_cancelled, completed
  payment_status: text('payment_status').notNull(), // pending, paid, refunded, partially_refunded, failed
  total_price: real('total_price').notNull(),
  refund_amount: real('refund_amount').default(0),
  amount_paid: real('amount_paid'), // Calculated as total_price - refund_amount
  currency: text('currency').notNull().default('USD'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

// Junction table for bookings and flights (many-to-many relationship for round trips)
export const bookingFlights = sqliteTable('booking_flights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  booking_id: text('booking_id')
    .notNull()
    .references(() => bookings.booking_id, { onDelete: 'cascade' }),
  flight_id: text('flight_id')
    .notNull()
    .references(() => flights.flight_id),
  airline_code: text('airline_code').notNull(),
  flight_number: text('flight_number').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departure_time: text('departure_time').notNull(),
  arrival_time: text('arrival_time').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  fare: real('fare').notNull(),
  segment: text('segment').notNull(), // outbound, return
  status: text('status').notNull().default('confirmed'), // pending, confirmed, cancelled, completed
  cancellation_date: text('cancellation_date'),
  cancellation_reason: text('cancellation_reason'),
  refund_amount: real('refund_amount').default(0),
})

export const passengers = sqliteTable('passengers', {
  passenger_id: text('passenger_id').primaryKey(), // P001, P002, etc.
  booking_id: text('booking_id')
    .notNull()
    .references(() => bookings.booking_id, { onDelete: 'cascade' }),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  date_of_birth: text('date_of_birth').notNull(), // YYYY-MM-DD format
  passport_number: text('passport_number').notNull(),
  ticket_number: text('ticket_number').notNull().unique(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const seatAssignments = sqliteTable('seat_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  passenger_id: text('passenger_id')
    .notNull()
    .references(() => passengers.passenger_id, { onDelete: 'cascade' }),
  flight_id: text('flight_id')
    .notNull()
    .references(() => flights.flight_id),
  seat_number: text('seat_number').notNull(),
  check_in_status: text('check_in_status').default('not_checked_in'), // not_checked_in, checked_in
  check_in_time: text('check_in_time'), // ISO 8601 format
})
