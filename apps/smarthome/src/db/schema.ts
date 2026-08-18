// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Room types enum for better type safety and suggestions
export enum RoomType {
  LIVING_ROOM = 'living_room',
  BEDROOM = 'bedroom',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  OFFICE = 'office',
  GARAGE = 'garage',
  DINING_ROOM = 'dining_room',
  GUEST_ROOM = 'guest_room',
  LAUNDRY_ROOM = 'laundry_room',
  BASEMENT = 'basement',
  ATTIC = 'attic',
  BALCONY = 'balcony',
  PATIO = 'patio',
  GARDEN = 'garden',
  OTHER = 'other',
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

export const rooms = sqliteTable('rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default(RoomType.OTHER), // Uses RoomType enum for suggestions
  floor: integer('floor').default(1),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deleted_at: text('deleted_at'),
})

export const deviceTypes = sqliteTable('device_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  category: text('category').notNull(), // lighting, temperature, security, audio
  subcategory: text('subcategory'), // smart_bulbs, smart_switches, smart_plugs, led_strips, smart_ac, smart_fans, smart_heaters, security_cameras, door_sensors, smart_audio
  capabilities: text('capabilities'), // JSON string of device capabilities
  icon: text('icon'),
  brand: text('brand').notNull().default('Andojo'),
  model: text('model'), // Specific model name
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// --- Dependent Tables ---
export const devices = sqliteTable('devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  device_type_id: integer('device_type_id')
    .notNull()
    .references(() => deviceTypes.id, { onDelete: 'cascade' }),
  room_id: integer('room_id').references(() => rooms.id, {
    onDelete: 'set null',
  }),
  status: text('status').notNull().default('online'), // online, offline, error
  is_on: integer('is_on', { mode: 'boolean' }).default(false),

  // Device-specific properties stored as JSON
  properties: text('properties'), // JSON string of device-specific properties

  // General properties
  battery: integer('battery').default(100), // 0-100
  signal_strength: integer('signal_strength').default(100), // 0-100
  firmware_version: text('firmware_version'),
  last_seen: text('last_seen')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deleted_at: text('deleted_at'),
})

export const scenes = sqliteTable('scenes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deleted_at: text('deleted_at'),
})

export const sceneDevices = sqliteTable('scene_devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scene_id: integer('scene_id')
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  device_id: integer('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  target_state: text('target_state').notNull(), // JSON string of target device state
  order: integer('order').default(0),
})

export const automations = sqliteTable('automations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  trigger_type: text('trigger_type').notNull(), // WHEN: time, motion, temperature, manual, geofence
  trigger_value: text('trigger_value'), // JSON: WHEN conditions (e.g., {"time": "07:00", "days": ["mon","tue"]})
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deleted_at: text('deleted_at'),
})

export const automationActions = sqliteTable('automation_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  automation_id: integer('automation_id')
    .notNull()
    .references(() => automations.id, { onDelete: 'cascade' }),
  action_type: text('action_type').notNull(), // WHAT: device_control, scene_execution, notification
  device_id: integer('device_id').references(() => devices.id, {
    onDelete: 'cascade',
  }),
  scene_id: integer('scene_id').references(() => scenes.id, {
    onDelete: 'cascade',
  }),
  action_value: text('action_value'), // JSON: WHAT to do (e.g., {"brightness": 75, "color_temperature": 3000})
  order: integer('order').default(0),
})

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // system, security, device, custom
  device_id: integer('device_id').references(() => devices.id, {
    onDelete: 'cascade',
  }),

  is_read: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  priority: text('priority').notNull().default('medium'), // low, medium, high, critical
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  read_at: text('read_at'),
  deleted_at: text('deleted_at'),
})

export const deviceHistory = sqliteTable('device_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  device_id: integer('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(), // state_change, status_change, error, usage, security
  old_value: text('old_value'), // JSON string of previous state
  new_value: text('new_value'), // JSON string of new state
  timestamp: text('timestamp')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('auto'), // light, dark, auto
  language: text('language').notNull().default('en'), // en, es, hi
  notifications_enabled: integer('notifications_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  geofencing_enabled: integer('geofencing_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  home_location: text('home_location'), // JSON string of lat/lng
  geofence_radius: integer('geofence_radius').default(100), // meters
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})
