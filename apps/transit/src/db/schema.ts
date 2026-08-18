import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'

// ============================================
// CORE TABLES
// ============================================

/**
 * Users table - stores user account information
 */
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    avatar: text('avatar'),
    bio: text('bio'),
    created_at: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deleted_at: text('deleted_at'),
  },
  table => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
  ],
)

/**
 * Areas table - geographic districts/neighborhoods
 */
export const areas = sqliteTable(
  'areas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description').notNull(),
  },
  table => [index('areas_name_idx').on(table.name)],
)

/**
 * Stops table - transit stop/station locations
 */
export const stops = sqliteTable(
  'stops',
  {
    id: text('id').primaryKey(), // e.g., "stop-1"
    name: text('name').notNull(),
    areaId: integer('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    modesServed: text('modes_served', { mode: 'json' })
      .notNull()
      .$type<string[]>(), // ["bus", "train", "subway"]
    facilities: text('facilities', { mode: 'json' })
      .notNull()
      .$type<string[]>(),
    amenities: text('amenities', { mode: 'json' }).notNull().$type<string[]>(),
    accessibility: text('accessibility', { mode: 'json' })
      .notNull()
      .$type<string[]>(),
  },
  table => [
    index('stops_area_idx').on(table.areaId),
    index('stops_name_idx').on(table.name),
    index('stops_location_idx').on(table.latitude, table.longitude),
  ],
)

/**
 * Stop Platforms table - physical platforms at stops for different transit modes
 */
export const stopPlatforms = sqliteTable(
  'stop_platforms',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    stopId: text('stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    mode: text('mode').notNull(), // "bus", "train", "subway"
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    walkingDistanceMeters: integer('walking_distance_meters').notNull(),
    description: text('description').notNull(),
  },
  table => [index('platforms_stop_mode_idx').on(table.stopId, table.mode)],
)

/**
 * Lines table - transit lines (bus routes, subway lines, train lines)
 */
export const lines = sqliteTable(
  'lines',
  {
    id: text('id').primaryKey(), // e.g., "line-b1"
    name: text('name').notNull(),
    shortName: text('short_name').notNull(),
    mode: text('mode').notNull(), // "bus", "subway", "train"
    color: text('color').notNull(), // hex color code
    operatingHoursStart: text('operating_hours_start').notNull(),
    operatingHoursEnd: text('operating_hours_end').notNull(),
    frequencyMinutes: integer('frequency_minutes').notNull(),
    status: text('status').notNull().default('on-time'), // "on-time", "delayed", "cancelled"
  },
  table => [
    index('lines_mode_idx').on(table.mode),
    index('lines_status_idx').on(table.status),
  ],
)

/**
 * Line Stops table - junction table for many-to-many relationship between lines and stops
 * Maintains the order of stops on each line
 */
export const lineStops = sqliteTable(
  'line_stops',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lineId: text('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
    stopId: text('stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(), // Order of stop on the line
  },
  table => [
    index('line_stops_line_stop_idx').on(table.lineId, table.stopId),
    index('line_stops_line_sequence_idx').on(table.lineId, table.sequence),
  ],
)

/**
 * Line Segments table - stores timing, pricing, and distance between consecutive stops on a line
 */
export const lineSegments = sqliteTable(
  'line_segments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lineId: text('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
    fromStopId: text('from_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    toStopId: text('to_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    durationMinutes: integer('duration_minutes').notNull(),
    distanceKm: real('distance_km').notNull(),
    fare: real('fare').notNull(),
  },
  table => [
    index('line_segments_line_idx').on(table.lineId),
    index('line_segments_from_to_idx').on(table.fromStopId, table.toStopId),
  ],
)

/**
 * Vehicles table - active vehicles running on lines with schedule information
 */
export const vehicles = sqliteTable(
  'vehicles',
  {
    id: text('id').primaryKey(), // e.g., "B3-0600-out" or "B3-0600-in"
    lineId: text('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
    vehicleNumber: text('vehicle_number').notNull(), // e.g., "0600-out" or "0600-in"
    departureTime: text('departure_time').notNull(), // HH:MM format (e.g., "06:00")
    direction: text('direction').notNull(), // "out" for outbound, "in" for inbound
    currentStopId: text('current_stop_id').references(() => stops.id, {
      onDelete: 'set null',
    }),
    currentStopSequence: integer('current_stop_sequence').notNull().default(1),
    status: text('status').notNull().default('active'), // "active", "completed", "delayed"
    scheduleData: text('schedule_data', { mode: 'json' }).notNull().$type<
      {
        stopId: string
        arrivalTime: string
        sequence: number
      }[]
    >(), // JSON array of stop schedule
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    index('vehicles_line_idx').on(table.lineId),
    index('vehicles_status_idx').on(table.status),
    index('vehicles_current_stop_idx').on(table.currentStopId),
    index('vehicles_direction_idx').on(table.direction),
  ],
)

/**
 * Service Alerts table - system-wide or line-specific alerts
 */
export const serviceAlerts = sqliteTable(
  'service_alerts',
  {
    id: text('id').primaryKey(), // e.g., "alert-morning-fog"
    severity: text('severity').notNull(), // "low", "medium", "high"
    title: text('title').notNull(),
    description: text('description').notNull(),
    icon: text('icon').notNull(), // "info", "warning", "critical"
    recommendedAlternatives: text('recommended_alternatives', {
      mode: 'json',
    }).$type<string[]>(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text('expires_at'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  table => [
    index('alerts_severity_idx').on(table.severity),
    index('alerts_active_idx').on(table.isActive),
  ],
)

/**
 * Alert Lines table - junction table for alerts affecting specific lines
 */
export const alertLines = sqliteTable(
  'alert_lines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    alertId: text('alert_id')
      .notNull()
      .references(() => serviceAlerts.id, { onDelete: 'cascade' }),
    lineId: text('line_id')
      .notNull()
      .references(() => lines.id, { onDelete: 'cascade' }),
  },
  table => [
    index('alert_lines_alert_line_idx').on(table.alertId, table.lineId),
    index('alert_lines_line_idx').on(table.lineId),
  ],
)

/**
 * Alert Stops table - junction table for alerts affecting specific stops
 */
export const alertStops = sqliteTable(
  'alert_stops',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    alertId: text('alert_id')
      .notNull()
      .references(() => serviceAlerts.id, { onDelete: 'cascade' }),
    stopId: text('stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
  },
  table => [
    index('alert_stops_alert_stop_idx').on(table.alertId, table.stopId),
    index('alert_stops_stop_idx').on(table.stopId),
  ],
)

// ============================================
// USER-RELATED TABLES
// ============================================

/**
 * User Preferences table - user settings and preferences
 */
export const userPreferences = sqliteTable(
  'user_preferences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    homeStopId: text('home_stop_id').references(() => stops.id, {
      onDelete: 'set null',
    }),
    workStopId: text('work_stop_id').references(() => stops.id, {
      onDelete: 'set null',
    }),
    preferredModes: text('preferred_modes', { mode: 'json' })
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'`),
    language: text('language').notNull().default('en'),
    notificationServiceAlerts: integer('notification_service_alerts', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),
    notificationDepartureReminders: integer(
      'notification_departure_reminders',
      {
        mode: 'boolean',
      },
    )
      .notNull()
      .default(true),
    notificationArrivals: integer('notification_arrivals', { mode: 'boolean' })
      .notNull()
      .default(false),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [index('user_preferences_user_idx').on(table.userId)],
)

/**
 * Recent Searches table - user's search history
 */
export const recentSearches = sqliteTable(
  'recent_searches',
  {
    id: text('id').primaryKey(), // e.g., "search-1"
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    origin: text('origin').notNull(),
    destination: text('destination').notNull(),
    modeFilters: text('mode_filters', { mode: 'json' })
      .notNull()
      .$type<string[]>(),
    searchedAt: text('searched_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    index('recent_searches_user_date_idx').on(table.userId, table.searchedAt),
  ],
)

/**
 * Saved Routes table - user's favorite/saved routes
 */
export const savedRoutes = sqliteTable(
  'saved_routes',
  {
    id: text('id').primaryKey(), // e.g., "saved-home-work"
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    originStopId: text('origin_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    destinationStopId: text('destination_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    preferredMode: text('preferred_mode').notNull(), // "bus", "subway", "train", "mixed"
    remindersEnabled: integer('reminders_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    departureReminderMinutes: integer('departure_reminder_minutes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    index('saved_routes_user_idx').on(table.userId),
    index('saved_routes_origin_dest_idx').on(
      table.originStopId,
      table.destinationStopId,
    ),
  ],
)

// ============================================
// TRIP PLANNING TABLES
// ============================================

/**
 * Trip Options table - calculated route options between two stops
 */
export const tripOptions = sqliteTable(
  'trip_options',
  {
    id: text('id').primaryKey(), // e.g., "route-fastest"
    originStopId: text('origin_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    destinationStopId: text('destination_stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    departureTime: text('departure_time').notNull(), // HH:MM format
    arrivalTime: text('arrival_time').notNull(), // HH:MM format
    totalDurationMinutes: integer('total_duration_minutes').notNull(),
    totalFare: real('total_fare').notNull(),
    transfers: integer('transfers').notNull(),
    walkingDistanceMeters: integer('walking_distance_meters').notNull(),
    tags: text('tags', { mode: 'json' }).notNull().$type<string[]>(), // ["fastest", "fewest-transfers", "lowest-cost"]
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    index('trip_options_origin_dest_idx').on(
      table.originStopId,
      table.destinationStopId,
    ),
    index('trip_options_tags_idx').on(table.tags),
  ],
)

/**
 * Trip Steps table - individual steps in a trip option
 */
export const tripSteps = sqliteTable(
  'trip_steps',
  {
    id: text('id').primaryKey(), // e.g., "step-1"
    tripOptionId: text('trip_option_id')
      .notNull()
      .references(() => tripOptions.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(), // Order of step in the trip
    type: text('type').notNull(), // "walk", "ride", "wait"
    description: text('description').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    distanceMeters: integer('distance_meters'), // For walk steps
    lineId: text('line_id').references(() => lines.id, {
      onDelete: 'set null',
    }), // For ride steps
    fromStopId: text('from_stop_id').references(() => stops.id, {
      onDelete: 'cascade',
    }), // For ride/wait steps
    toStopId: text('to_stop_id').references(() => stops.id, {
      onDelete: 'cascade',
    }), // For ride steps
  },
  table => [
    index('trip_steps_trip_sequence_idx').on(
      table.tripOptionId,
      table.sequence,
    ),
    index('trip_steps_type_idx').on(table.type),
  ],
)

/**
 * App Constants table - application-level configuration
 */
export const appConstants = sqliteTable('app_constants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  recentSearches: many(recentSearches),
  savedRoutes: many(savedRoutes),
}))

export const areasRelations = relations(areas, ({ many }) => ({
  stops: many(stops),
}))

export const stopsRelations = relations(stops, ({ one, many }) => ({
  area: one(areas, {
    fields: [stops.areaId],
    references: [areas.id],
  }),
  platforms: many(stopPlatforms),
  lineStops: many(lineStops),
  alertStops: many(alertStops),
}))

export const stopPlatformsRelations = relations(stopPlatforms, ({ one }) => ({
  stop: one(stops, {
    fields: [stopPlatforms.stopId],
    references: [stops.id],
  }),
}))

export const linesRelations = relations(lines, ({ many }) => ({
  lineStops: many(lineStops),
  lineSegments: many(lineSegments),
  vehicles: many(vehicles),
  alertLines: many(alertLines),
  tripSteps: many(tripSteps),
}))

export const lineStopsRelations = relations(lineStops, ({ one }) => ({
  line: one(lines, {
    fields: [lineStops.lineId],
    references: [lines.id],
  }),
  stop: one(stops, {
    fields: [lineStops.stopId],
    references: [stops.id],
  }),
}))

export const lineSegmentsRelations = relations(lineSegments, ({ one }) => ({
  line: one(lines, {
    fields: [lineSegments.lineId],
    references: [lines.id],
  }),
  fromStop: one(stops, {
    fields: [lineSegments.fromStopId],
    references: [stops.id],
  }),
  toStop: one(stops, {
    fields: [lineSegments.toStopId],
    references: [stops.id],
  }),
}))

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  line: one(lines, {
    fields: [vehicles.lineId],
    references: [lines.id],
  }),
  currentStop: one(stops, {
    fields: [vehicles.currentStopId],
    references: [stops.id],
  }),
}))

export const serviceAlertsRelations = relations(serviceAlerts, ({ many }) => ({
  affectedLines: many(alertLines),
  affectedStops: many(alertStops),
}))

export const alertLinesRelations = relations(alertLines, ({ one }) => ({
  alert: one(serviceAlerts, {
    fields: [alertLines.alertId],
    references: [serviceAlerts.id],
  }),
  line: one(lines, {
    fields: [alertLines.lineId],
    references: [lines.id],
  }),
}))

export const alertStopsRelations = relations(alertStops, ({ one }) => ({
  alert: one(serviceAlerts, {
    fields: [alertStops.alertId],
    references: [serviceAlerts.id],
  }),
  stop: one(stops, {
    fields: [alertStops.stopId],
    references: [stops.id],
  }),
}))

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
    homeStop: one(stops, {
      fields: [userPreferences.homeStopId],
      references: [stops.id],
    }),
    workStop: one(stops, {
      fields: [userPreferences.workStopId],
      references: [stops.id],
    }),
  }),
)

export const recentSearchesRelations = relations(recentSearches, ({ one }) => ({
  user: one(users, {
    fields: [recentSearches.userId],
    references: [users.id],
  }),
}))

export const savedRoutesRelations = relations(savedRoutes, ({ one }) => ({
  user: one(users, {
    fields: [savedRoutes.userId],
    references: [users.id],
  }),
  originStop: one(stops, {
    fields: [savedRoutes.originStopId],
    references: [stops.id],
  }),
  destinationStop: one(stops, {
    fields: [savedRoutes.destinationStopId],
    references: [stops.id],
  }),
}))

export const tripOptionsRelations = relations(tripOptions, ({ one, many }) => ({
  originStop: one(stops, {
    fields: [tripOptions.originStopId],
    references: [stops.id],
  }),
  destinationStop: one(stops, {
    fields: [tripOptions.destinationStopId],
    references: [stops.id],
  }),
  steps: many(tripSteps),
}))

export const tripStepsRelations = relations(tripSteps, ({ one }) => ({
  tripOption: one(tripOptions, {
    fields: [tripSteps.tripOptionId],
    references: [tripOptions.id],
  }),
  line: one(lines, {
    fields: [tripSteps.lineId],
    references: [lines.id],
  }),
  fromStop: one(stops, {
    fields: [tripSteps.fromStopId],
    references: [stops.id],
  }),
  toStop: one(stops, {
    fields: [tripSteps.toStopId],
    references: [stops.id],
  }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Area = typeof areas.$inferSelect
export type NewArea = typeof areas.$inferInsert

export type Stop = typeof stops.$inferSelect
export type NewStop = typeof stops.$inferInsert

export type StopPlatform = typeof stopPlatforms.$inferSelect
export type NewStopPlatform = typeof stopPlatforms.$inferInsert

export type Line = typeof lines.$inferSelect
export type NewLine = typeof lines.$inferInsert

export type LineStop = typeof lineStops.$inferSelect
export type NewLineStop = typeof lineStops.$inferInsert

export type LineSegment = typeof lineSegments.$inferSelect
export type NewLineSegment = typeof lineSegments.$inferInsert

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert

export type ServiceAlert = typeof serviceAlerts.$inferSelect
export type NewServiceAlert = typeof serviceAlerts.$inferInsert

export type AlertLine = typeof alertLines.$inferSelect
export type NewAlertLine = typeof alertLines.$inferInsert

export type AlertStop = typeof alertStops.$inferSelect
export type NewAlertStop = typeof alertStops.$inferInsert

export type UserPreference = typeof userPreferences.$inferSelect
export type NewUserPreference = typeof userPreferences.$inferInsert

export type RecentSearch = typeof recentSearches.$inferSelect
export type NewRecentSearch = typeof recentSearches.$inferInsert

export type SavedRoute = typeof savedRoutes.$inferSelect
export type NewSavedRoute = typeof savedRoutes.$inferInsert

export type TripOption = typeof tripOptions.$inferSelect
export type NewTripOption = typeof tripOptions.$inferInsert

export type TripStep = typeof tripSteps.$inferSelect
export type NewTripStep = typeof tripSteps.$inferInsert

export type AppConstant = typeof appConstants.$inferSelect
export type NewAppConstant = typeof appConstants.$inferInsert
