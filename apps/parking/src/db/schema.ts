// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name'),
  phoneNumber: text('phone_number'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  status: text('status').default('active'),
  settings: text('settings'),
  metadata: text('metadata'),
})

// User locations
export const userLocations = sqliteTable(
  'user_locations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    address: text('address').notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),
    isDefault: integer('is_default').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    metadata: text('metadata'),
  },
  table => [index('idx_user_locations_user').on(table.userId)],
)

// Vehicle types lookup
export const vehicleTypes = sqliteTable('vehicle_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // e.g. 'car','motorcycle','van','truck','ev'
  name: text('name').notNull(),
  description: text('description'),
  metadata: text('metadata'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
})

// Vehicles
export const vehicles = sqliteTable(
  'vehicles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nickname: text('nickname'),
    make: text('make'),
    model: text('model'),
    color: text('color'),
    year: integer('year'),
    plateNumber: text('plate_number').notNull().unique(),
    vehicleTypeId: integer('vehicle_type_id')
      .notNull()
      .references(() => vehicleTypes.id, { onDelete: 'restrict' }),
    isDefault: integer('is_default').default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    metadata: text('metadata'),
  },
  table => [
    index('idx_vehicles_user').on(table.userId),
    index('idx_vehicles_plate').on(table.plateNumber),
  ],
)

// Payment methods
export const paymentMethods = sqliteTable(
  'payment_methods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // CHECK handled at DB level in DDL; in Drizzle you may enforce in application code
    provider: text('provider'),
    displayName: text('display_name'),
    cardNumber: text('card_number').notNull(),
    lastFour: text('last_four').notNull(),
    expiryMonth: integer('expiry_month').notNull(),
    expiryYear: integer('expiry_year').notNull(),
    isDefault: integer('is_default').default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    metadata: text('metadata'),
  },
  table => [index('idx_payment_methods_user').on(table.userId)],
)

// Parking zones (zone-level multipliers)
export const parkingZones = sqliteTable(
  'parking_zones',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    zoneCode: text('zone_code').notNull().unique(),
    operator: text('operator'),
    zoneType: text('zone_type'),
    capacity: integer('capacity'),
    rateCurrency: text('rate_currency').default('USD'),
    rateMultiplier: real('rate_multiplier').default(1.0),
    isActive: integer('is_active').default(1),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    metadata: text('metadata'),
  },
  table => [index('idx_parking_zones_loc').on(table.latitude, table.longitude)],
)

// Global rates per vehicle type (used with zone multiplier)
export const vehicleTypeRates = sqliteTable('vehicle_type_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicleTypeId: integer('vehicle_type_id')
    .notNull()
    .references(() => vehicleTypes.id, { onDelete: 'cascade' }),
  ratePerHour: real('rate_per_hour').notNull(),
  currency: text('currency').default('USD'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
})

// Parking history (bookings)
export const parkingHistory = sqliteTable(
  'parking_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    parkingZoneId: integer('parking_zone_id')
      .notNull()
      .references(() => parkingZones.id),
    startTime: text('start_time'),
    plannedEndTime: text('planned_end_time'),
    actualEndTime: text('actual_end_time'),
    plannedDurationMinutes: integer('planned_duration_minutes'),
    actualDurationMinutes: integer('actual_duration_minutes'),
    chargedAmount: real('charged_amount').default(0.0),
    currency: text('currency').default('USD'),
    status: text('status').notNull().default('active'),
    metadata: text('metadata'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  table => [
    index('idx_parking_history_user').on(table.userId),
    index('idx_parking_history_zone').on(table.parkingZoneId),
  ],
)

// Notifications
export const notifications = sqliteTable(
  'notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    notificationType: text('notification_type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    relatedParkingHistoryId: integer('related_parking_history_id').references(
      () => parkingHistory.id,
    ),
    isRead: integer('is_read').default(0),
    readAt: text('read_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    expiresAt: text('expires_at'),
    metadata: text('metadata'),
  },
  table => [index('idx_notifications_user').on(table.userId)],
)
