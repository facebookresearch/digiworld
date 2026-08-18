import { executeStatements } from './execute-statements'

export const CREATE_TABLES = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT
  )`,

  // Areas table
  `CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL
  )`,

  // Stops table
  `CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    area_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    modes_served TEXT NOT NULL,
    facilities TEXT NOT NULL,
    amenities TEXT NOT NULL,
    accessibility TEXT NOT NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
  )`,

  // Stop Platforms table
  `CREATE TABLE IF NOT EXISTS stop_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    stop_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    walking_distance_meters INTEGER NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // Lines table
  `CREATE TABLE IF NOT EXISTS lines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    color TEXT NOT NULL,
    operating_hours_start TEXT NOT NULL,
    operating_hours_end TEXT NOT NULL,
    frequency_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'on-time'
  )`,

  // Line Stops table (junction)
  `CREATE TABLE IF NOT EXISTS line_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    line_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
    FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // Line Segments table - timing, pricing, distance between stops
  `CREATE TABLE IF NOT EXISTS line_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    line_id TEXT NOT NULL,
    from_stop_id TEXT NOT NULL,
    to_stop_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    fare REAL NOT NULL,
    FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
    FOREIGN KEY (from_stop_id) REFERENCES stops(id) ON DELETE CASCADE,
    FOREIGN KEY (to_stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // Vehicles table - active vehicles with schedules
  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY NOT NULL,
    line_id TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    direction TEXT NOT NULL,
    current_stop_id TEXT,
    current_stop_sequence INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    schedule_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
    FOREIGN KEY (current_stop_id) REFERENCES stops(id) ON DELETE SET NULL
  )`,

  // Service Alerts table
  `CREATE TABLE IF NOT EXISTS service_alerts (
    id TEXT PRIMARY KEY NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    recommended_alternatives TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  // Alert Lines table (junction)
  `CREATE TABLE IF NOT EXISTS alert_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    alert_id TEXT NOT NULL,
    line_id TEXT NOT NULL,
    FOREIGN KEY (alert_id) REFERENCES service_alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE
  )`,

  // Alert Stops table (junction)
  `CREATE TABLE IF NOT EXISTS alert_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    alert_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    FOREIGN KEY (alert_id) REFERENCES service_alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // User Preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL UNIQUE,
    home_stop_id TEXT,
    work_stop_id TEXT,
    preferred_modes TEXT NOT NULL DEFAULT '[]',
    language TEXT NOT NULL DEFAULT 'en',
    notification_service_alerts INTEGER NOT NULL DEFAULT 1,
    notification_departure_reminders INTEGER NOT NULL DEFAULT 1,
    notification_arrivals INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (home_stop_id) REFERENCES stops(id) ON DELETE SET NULL,
    FOREIGN KEY (work_stop_id) REFERENCES stops(id) ON DELETE SET NULL
  )`,

  // Recent Searches table
  `CREATE TABLE IF NOT EXISTS recent_searches (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    mode_filters TEXT NOT NULL,
    searched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Saved Routes table
  `CREATE TABLE IF NOT EXISTS saved_routes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    origin_stop_id TEXT NOT NULL,
    destination_stop_id TEXT NOT NULL,
    preferred_mode TEXT NOT NULL,
    reminders_enabled INTEGER NOT NULL DEFAULT 0,
    departure_reminder_minutes INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (origin_stop_id) REFERENCES stops(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // Trip Options table
  `CREATE TABLE IF NOT EXISTS trip_options (
    id TEXT PRIMARY KEY NOT NULL,
    origin_stop_id TEXT NOT NULL,
    destination_stop_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    total_duration_minutes INTEGER NOT NULL,
    total_fare REAL NOT NULL,
    transfers INTEGER NOT NULL,
    walking_distance_meters INTEGER NOT NULL,
    tags TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (origin_stop_id) REFERENCES stops(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // Trip Steps table
  `CREATE TABLE IF NOT EXISTS trip_steps (
    id TEXT PRIMARY KEY NOT NULL,
    trip_option_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_meters INTEGER,
    line_id TEXT,
    from_stop_id TEXT,
    to_stop_id TEXT,
    FOREIGN KEY (trip_option_id) REFERENCES trip_options(id) ON DELETE CASCADE,
    FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE SET NULL,
    FOREIGN KEY (from_stop_id) REFERENCES stops(id) ON DELETE CASCADE,
    FOREIGN KEY (to_stop_id) REFERENCES stops(id) ON DELETE CASCADE
  )`,

  // App Constants table
  `CREATE TABLE IF NOT EXISTS app_constants (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // ============================================
  // INDEXES
  // ============================================

  // Users indexes
  `CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)`,
  `CREATE INDEX IF NOT EXISTS users_username_idx ON users(username)`,

  // Areas indexes
  `CREATE INDEX IF NOT EXISTS areas_name_idx ON areas(name)`,

  // Stops indexes
  `CREATE INDEX IF NOT EXISTS stops_area_idx ON stops(area_id)`,
  `CREATE INDEX IF NOT EXISTS stops_name_idx ON stops(name)`,
  `CREATE INDEX IF NOT EXISTS stops_location_idx ON stops(latitude, longitude)`,

  // Stop Platforms indexes
  `CREATE INDEX IF NOT EXISTS platforms_stop_mode_idx ON stop_platforms(stop_id, mode)`,

  // Lines indexes
  `CREATE INDEX IF NOT EXISTS lines_mode_idx ON lines(mode)`,
  `CREATE INDEX IF NOT EXISTS lines_status_idx ON lines(status)`,

  // Line Stops indexes
  `CREATE INDEX IF NOT EXISTS line_stops_line_stop_idx ON line_stops(line_id, stop_id)`,
  `CREATE INDEX IF NOT EXISTS line_stops_line_sequence_idx ON line_stops(line_id, sequence)`,

  // Line Segments indexes
  `CREATE INDEX IF NOT EXISTS line_segments_line_idx ON line_segments(line_id)`,
  `CREATE INDEX IF NOT EXISTS line_segments_from_to_idx ON line_segments(from_stop_id, to_stop_id)`,

  // Vehicles indexes
  `CREATE INDEX IF NOT EXISTS vehicles_line_idx ON vehicles(line_id)`,
  `CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles(status)`,
  `CREATE INDEX IF NOT EXISTS vehicles_current_stop_idx ON vehicles(current_stop_id)`,
  `CREATE INDEX IF NOT EXISTS vehicles_direction_idx ON vehicles(direction)`,

  // Service Alerts indexes
  `CREATE INDEX IF NOT EXISTS alerts_severity_idx ON service_alerts(severity)`,
  `CREATE INDEX IF NOT EXISTS alerts_active_idx ON service_alerts(is_active)`,

  // Alert Lines indexes
  `CREATE INDEX IF NOT EXISTS alert_lines_alert_line_idx ON alert_lines(alert_id, line_id)`,
  `CREATE INDEX IF NOT EXISTS alert_lines_line_idx ON alert_lines(line_id)`,

  // Alert Stops indexes
  `CREATE INDEX IF NOT EXISTS alert_stops_alert_stop_idx ON alert_stops(alert_id, stop_id)`,
  `CREATE INDEX IF NOT EXISTS alert_stops_stop_idx ON alert_stops(stop_id)`,

  // User Preferences indexes
  `CREATE INDEX IF NOT EXISTS user_preferences_user_idx ON user_preferences(user_id)`,

  // Recent Searches indexes
  `CREATE INDEX IF NOT EXISTS recent_searches_user_date_idx ON recent_searches(user_id, searched_at)`,

  // Saved Routes indexes
  `CREATE INDEX IF NOT EXISTS saved_routes_user_idx ON saved_routes(user_id)`,
  `CREATE INDEX IF NOT EXISTS saved_routes_origin_dest_idx ON saved_routes(origin_stop_id, destination_stop_id)`,

  // Trip Options indexes
  `CREATE INDEX IF NOT EXISTS trip_options_origin_dest_idx ON trip_options(origin_stop_id, destination_stop_id)`,
  `CREATE INDEX IF NOT EXISTS trip_options_tags_idx ON trip_options(tags)`,

  // Trip Steps indexes
  `CREATE INDEX IF NOT EXISTS trip_steps_trip_sequence_idx ON trip_steps(trip_option_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS trip_steps_type_idx ON trip_steps(type)`,
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    return true
  } catch (error) {
    return false
  }
}
