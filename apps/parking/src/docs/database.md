# Parking App Database Documentation

## Overview

The Parking App uses SQLite with Drizzle ORM for type-safe schema definitions. This document provides comprehensive details about the database schema, table structures, relationships, indexes, and data integrity constraints.

## Database Architecture

### Configuration

```typescript
// Database instance setup using DatabaseManager singleton
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase | null = null
  private static drizzleDb: any = null
  private static dbPath: string = 'andojopark.db'

  static getInstance(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      this.instance = SQLite.openDatabaseSync('andojopark.db')
      this.drizzleDb = drizzle(this.instance)
    }
    return this.instance
  }

  static getDrizzle() {
    if (!this.drizzleDb || !this.instance) {
      this.instance = this.getInstance()
      this.drizzleDb = drizzle(this.instance)
    }
    return this.drizzleDb
  }
}

// Exported instances
export const db = DatabaseManager.getDrizzle()
export const sqlite = DatabaseManager.getInstance()
```

### Database File

- **Name:** `andojopark.db`
- **Location:** App's local storage directory

### Key Features

- **Local-first Architecture:** All data stored locally in SQLite
- **Offline Functionality:** App operates entirely without network
- **Type Safety:** Full TypeScript support with Drizzle ORM
- **Foreign Key Constraints:** Enforced referential integrity
- **Indexing:** Optimized indexes on frequently queried columns
- **Migration System:** Schema versioning and migration support
- **Connection Management:** Singleton pattern with close/reopen support

### DatabaseManager Methods

| Method               | Description                            |
| -------------------- | -------------------------------------- |
| `getInstance()`      | Get SQLite database instance           |
| `getDrizzle()`       | Get Drizzle ORM instance               |
| `closeConnection()`  | Close database connection              |
| `reopenConnection()` | Reopen database connection after close |
| `resetDatabase()`    | Drop all tables and run migrations     |

## Database Schema

### Table Overview

The database consists of 9 tables organized into the following categories:

**Core Tables:**

- `users` - User accounts and profiles
- `user_locations` - User saved locations (home, work, etc.)
- `vehicle_types` - Vehicle type definitions (car, motorcycle, van, truck, ev)
- `vehicles` - User vehicle registrations
- `payment_methods` - User payment methods (credit cards, debit cards, wallets)

**Parking Tables:**

- `parking_zones` - Parking zone definitions with location and pricing
- `vehicle_type_rates` - Base rates per vehicle type per hour
- `parking_history` - Parking booking and session history

**Supporting Tables:**

- `notifications` - User notifications

### Table Drop Order (for reset)

Tables must be dropped in reverse dependency order:

```sql
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS parking_history;
DROP TABLE IF EXISTS vehicle_type_rates;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS user_locations;
DROP TABLE IF EXISTS parking_zones;
DROP TABLE IF EXISTS vehicle_types;
DROP TABLE IF EXISTS users;
VACUUM;
PRAGMA foreign_keys = ON;
```

## Detailed Table Schemas

### users

Application users and profiles.

| Column       | Type    | Constraints                                           | Description                    |
| ------------ | ------- | ----------------------------------------------------- | ------------------------------ |
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique user identifier         |
| email        | TEXT    | UNIQUE NOT NULL                                       | Email address (unique)         |
| password     | TEXT    | NOT NULL                                              | Password (should be hashed)    |
| full_name    | TEXT    |                                                       | User's full name               |
| phone_number | TEXT    |                                                       | Phone number                   |
| created_at   | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Account creation timestamp     |
| updated_at   | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Last update timestamp          |
| status       | TEXT    | DEFAULT 'active'                                      | User status (active, disabled) |
| settings     | TEXT    |                                                       | User settings (JSON)           |
| metadata     | TEXT    |                                                       | Free-form metadata (JSON)      |

**Indexes:**

- Primary key index on `id`
- Unique constraint on `email`

### user_locations

User saved locations (home, work, etc.).

| Column     | Type    | Constraints                                           | Description                        |
| ---------- | ------- | ----------------------------------------------------- | ---------------------------------- |
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique location identifier         |
| user_id    | INTEGER | REFERENCES users(id) ON DELETE CASCADE NOT NULL       | Owner user                         |
| label      | TEXT    |                                                       | Location label (Home, Work, Other) |
| address    | TEXT    | NOT NULL                                              | Full address string                |
| latitude   | REAL    |                                                       | Latitude coordinate                |
| longitude  | REAL    |                                                       | Longitude coordinate               |
| is_default | INTEGER | NOT NULL DEFAULT 0                                    | Default location flag (0 or 1)     |
| created_at | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                 |
| updated_at | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Last update timestamp              |
| metadata   | TEXT    |                                                       | Free-form metadata (JSON)          |

**Indexes:**

- Primary key index on `id`
- `idx_user_locations_user` on `user_id`
- Foreign key constraint on `user_id` with CASCADE delete

### vehicle_types

Vehicle type definitions (car, motorcycle, van, truck, ev).

| Column      | Type    | Constraints                                           | Description                                         |
| ----------- | ------- | ----------------------------------------------------- | --------------------------------------------------- |
| id          | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique vehicle type identifier                      |
| code        | TEXT    | UNIQUE NOT NULL                                       | Vehicle type code (car, motorcycle, van, truck, ev) |
| name        | TEXT    | NOT NULL                                              | Vehicle type name                                   |
| description | TEXT    |                                                       | Vehicle type description                            |
| metadata    | TEXT    |                                                       | Free-form metadata (JSON)                           |
| created_at  | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                                  |

**Indexes:**

- Primary key index on `id`
- Unique constraint on `code`

**Common Vehicle Types:**

- `car` - Standard car
- `motorcycle` - Motorcycle
- `van` - Van
- `truck` - Truck
- `ev` - Electric Vehicle

### vehicles

User vehicle registrations.

| Column          | Type    | Constraints                                              | Description                        |
| --------------- | ------- | -------------------------------------------------------- | ---------------------------------- |
| id              | INTEGER | PRIMARY KEY AUTOINCREMENT                                | Unique vehicle identifier          |
| user_id         | INTEGER | REFERENCES users(id) ON DELETE CASCADE NOT NULL          | Owner user                         |
| nickname        | TEXT    |                                                          | Vehicle nickname                   |
| make            | TEXT    |                                                          | Vehicle make (Toyota, Honda, etc.) |
| model           | TEXT    |                                                          | Vehicle model                      |
| color           | TEXT    |                                                          | Vehicle color                      |
| year            | INTEGER |                                                          | Vehicle year                       |
| plate_number    | TEXT    | UNIQUE NOT NULL                                          | License plate number               |
| vehicle_type_id | INTEGER | REFERENCES vehicle_types(id) ON DELETE RESTRICT NOT NULL | Vehicle type                       |
| is_default      | INTEGER | DEFAULT 0                                                | Default vehicle flag (0 or 1)      |
| created_at      | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now')    | Creation timestamp                 |
| updated_at      | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now')    | Last update timestamp              |
| metadata        | TEXT    |                                                          | Free-form metadata (JSON)          |

**Indexes:**

- Primary key index on `id`
- `idx_vehicles_user` on `user_id`
- `idx_vehicles_plate` on `plate_number`
- Unique constraint on `plate_number`
- Foreign key constraint on `user_id` with CASCADE delete
- Foreign key constraint on `vehicle_type_id` with RESTRICT delete

**Plate Number Format:** 8-character alphanumeric (e.g., `A1B2C3D4`, `XY9Z8W7V`)

### payment_methods

User payment methods (credit cards, debit cards, wallets).

| Column       | Type    | Constraints                                           | Description                                          |
| ------------ | ------- | ----------------------------------------------------- | ---------------------------------------------------- |
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique payment method identifier                     |
| user_id      | INTEGER | REFERENCES users(id) ON DELETE CASCADE NOT NULL       | Owner user                                           |
| type         | TEXT    | NOT NULL                                              | Payment type (credit_card, debit_card, wallet)       |
| provider     | TEXT    |                                                       | Payment provider (Visa, Mastercard, RuPay, UnionPay) |
| display_name | TEXT    |                                                       | Display name for the payment method                  |
| card_number  | TEXT    | NOT NULL                                              | Full card number (16 digits, should be encrypted)    |
| last_four    | TEXT    | NOT NULL                                              | Last 4 digits for display                            |
| expiry_month | INTEGER | NOT NULL                                              | Expiry month (1-12)                                  |
| expiry_year  | INTEGER | NOT NULL                                              | Expiry year (e.g., 2027)                             |
| is_default   | INTEGER | DEFAULT 0                                             | Default payment method flag (0 or 1)                 |
| created_at   | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                                   |
| updated_at   | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Last update timestamp                                |
| metadata     | TEXT    |                                                       | Free-form metadata (JSON)                            |

**Indexes:**

- Primary key index on `id`
- `idx_payment_methods_user` on `user_id`
- Foreign key constraint on `user_id` with CASCADE delete

**Card Providers:**

- `Visa`
- `Mastercard`
- `RuPay`
- `UnionPay`

### parking_zones

Parking zone definitions with location and pricing multipliers.

| Column          | Type    | Constraints                                           | Description                                       |
| --------------- | ------- | ----------------------------------------------------- | ------------------------------------------------- |
| id              | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique parking zone identifier                    |
| name            | TEXT    | NOT NULL                                              | Zone name                                         |
| description     | TEXT    |                                                       | Zone description                                  |
| latitude        | REAL    | NOT NULL                                              | Zone latitude coordinate                          |
| longitude       | REAL    | NOT NULL                                              | Zone longitude coordinate                         |
| zone_code       | TEXT    | UNIQUE NOT NULL                                       | Zone code (e.g., PZ001, PZ002)                    |
| operator        | TEXT    |                                                       | Zone operator (City Parking, Downtown Ops, etc.)  |
| zone_type       | TEXT    |                                                       | Zone type (curbside, lot, garage)                 |
| capacity        | INTEGER |                                                       | Maximum capacity                                  |
| rate_currency   | TEXT    | DEFAULT 'USD'                                         | Currency code                                     |
| rate_multiplier | REAL    | DEFAULT 1.0                                           | Rate multiplier applied to base vehicle type rate |
| is_active       | INTEGER | DEFAULT 1                                             | Active zone flag (0 or 1)                         |
| created_at      | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                                |
| updated_at      | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Last update timestamp                             |
| metadata        | TEXT    |                                                       | Free-form metadata (JSON)                         |

**Indexes:**

- Primary key index on `id`
- `idx_parking_zones_loc` on `latitude, longitude`
- Unique constraint on `zone_code`

**Zone Types:**

- `curbside` - Street parking
- `lot` - Parking lot
- `garage` - Parking garage

**Pricing Calculation:**

- Final cost = `vehicle_type_rate.rate_per_hour` × `parking_zones.rate_multiplier` × `hours`

### vehicle_type_rates

Base rates per vehicle type per hour.

| Column          | Type    | Constraints                                             | Description            |
| --------------- | ------- | ------------------------------------------------------- | ---------------------- |
| id              | INTEGER | PRIMARY KEY AUTOINCREMENT                               | Unique rate identifier |
| vehicle_type_id | INTEGER | REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL | Vehicle type           |
| rate_per_hour   | REAL    | NOT NULL                                                | Base rate per hour     |
| currency        | TEXT    | DEFAULT 'USD'                                           | Currency code          |
| created_at      | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now')   | Creation timestamp     |

**Indexes:**

- Primary key index on `id`
- Foreign key constraint on `vehicle_type_id` with CASCADE delete

**Usage:** Base rates are multiplied by zone multipliers to calculate final parking costs.

### parking_history

Parking booking and session history.

| Column                   | Type    | Constraints                                           | Description                          |
| ------------------------ | ------- | ----------------------------------------------------- | ------------------------------------ |
| id                       | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique parking history identifier    |
| user_id                  | INTEGER | REFERENCES users(id) NOT NULL                         | Owner user                           |
| vehicle_id               | INTEGER | REFERENCES vehicles(id) NOT NULL                      | Vehicle used                         |
| parking_zone_id          | INTEGER | REFERENCES parking_zones(id) NOT NULL                 | Parking zone                         |
| start_time               | TEXT    |                                                       | Session start time (ISO 8601 format) |
| planned_end_time         | TEXT    |                                                       | Planned end time (ISO 8601 format)   |
| actual_end_time          | TEXT    |                                                       | Actual end time (ISO 8601 format)    |
| planned_duration_minutes | INTEGER |                                                       | Planned duration in minutes          |
| actual_duration_minutes  | INTEGER |                                                       | Actual duration in minutes           |
| charged_amount           | REAL    | DEFAULT 0.0                                           | Amount charged                       |
| currency                 | TEXT    | DEFAULT 'USD'                                         | Currency code                        |
| status                   | TEXT    | NOT NULL DEFAULT 'active'                             | Status (active, completed, expired)  |
| metadata                 | TEXT    |                                                       | Free-form metadata (JSON)            |
| created_at               | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                   |
| updated_at               | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Last update timestamp                |

**Indexes:**

- Primary key index on `id`
- `idx_parking_history_user` on `user_id`
- `idx_parking_history_zone` on `parking_zone_id`
- Foreign key constraints on `user_id`, `vehicle_id`, and `parking_zone_id`

**Status Values:**

- `active` - Active parking session
- `completed` - Completed parking session
- `expired` - Expired parking session

### notifications

User notifications related to parking activities.

| Column                     | Type    | Constraints                                           | Description                                                  |
| -------------------------- | ------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| id                         | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique notification identifier                               |
| user_id                    | INTEGER | REFERENCES users(id) NOT NULL                         | Owner user                                                   |
| notification_type          | TEXT    | NOT NULL                                              | Notification type (reminder, payment, extension, zone_alert) |
| title                      | TEXT    | NOT NULL                                              | Notification title                                           |
| message                    | TEXT    | NOT NULL                                              | Notification message                                         |
| related_parking_history_id | INTEGER | REFERENCES parking_history(id)                        | Related parking history record                               |
| is_read                    | INTEGER | DEFAULT 0                                             | Read flag (0 or 1)                                           |
| read_at                    | TEXT    |                                                       | Read timestamp (ISO 8601 format)                             |
| created_at                 | TEXT    | NOT NULL DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ','now') | Creation timestamp                                           |
| expires_at                 | TEXT    |                                                       | Expiration timestamp (ISO 8601 format)                       |
| metadata                   | TEXT    |                                                       | Free-form metadata (JSON)                                    |

**Indexes:**

- Primary key index on `id`
- `idx_notifications_user` on `user_id`
- Foreign key constraint on `user_id`
- Foreign key constraint on `related_parking_history_id`

**Notification Types:**

- `reminder` - Parking reminder
- `payment` - Payment receipt
- `extension` - Parking extended
- `zone_alert` - Zone alert

## Relationships Overview

### Entity Relationships

```
users
├── user_locations (one-to-many, CASCADE delete)
├── vehicles (one-to-many, CASCADE delete)
├── payment_methods (one-to-many, CASCADE delete)
├── parking_history (one-to-many)
└── notifications (one-to-many)

vehicle_types
├── vehicles (one-to-many, RESTRICT delete)
└── vehicle_type_rates (one-to-many, CASCADE delete)

vehicles
└── parking_history (one-to-many)

parking_zones
└── parking_history (one-to-many)

parking_history
└── notifications (one-to-many via related_parking_history_id)
```

### Foreign Key Delete Behaviors

| Parent Table    | Child Table        | On Delete |
| --------------- | ------------------ | --------- |
| users           | user_locations     | CASCADE   |
| users           | vehicles           | CASCADE   |
| users           | payment_methods    | CASCADE   |
| users           | parking_history    | NO ACTION |
| users           | notifications      | NO ACTION |
| vehicle_types   | vehicles           | RESTRICT  |
| vehicle_types   | vehicle_type_rates | CASCADE   |
| vehicles        | parking_history    | NO ACTION |
| parking_zones   | parking_history    | NO ACTION |
| parking_history | notifications      | NO ACTION |

## Indexes

### Primary Indexes

All tables have primary key indexes on `id` column.

### Foreign Key Indexes

- `idx_user_locations_user` on `user_locations.user_id`
- `idx_vehicles_user` on `vehicles.user_id`
- `idx_vehicles_plate` on `vehicles.plate_number`
- `idx_payment_methods_user` on `payment_methods.user_id`
- `idx_parking_zones_loc` on `parking_zones.latitude, parking_zones.longitude`
- `idx_parking_history_user` on `parking_history.user_id`
- `idx_parking_history_zone` on `parking_history.parking_zone_id`
- `idx_notifications_user` on `notifications.user_id`

### Unique Constraints

- `users.email` - Unique email address
- `vehicles.plate_number` - Unique license plate number
- `vehicle_types.code` - Unique vehicle type code
- `parking_zones.zone_code` - Unique zone code

## Data Integrity

### Foreign Key Constraints

All foreign key relationships are enforced:

- Cascade deletes: `user_locations`, `vehicles`, `payment_methods`, `vehicle_type_rates` cascade when parent is deleted
- Restrict deletes: `vehicles` cannot be deleted if referenced by `parking_history`

### Data Validation

**Payment Method Constraints:**

- `card_number` must be 16 digits
- `last_four` must match last 4 digits of card_number
- `expiry_month` must be 1-12
- `expiry_year` must be valid year

**Parking History Constraints:**

- Status must be one of: `active`, `completed`, `expired`
- `charged_amount` must be >= 0
- `planned_duration_minutes` and `actual_duration_minutes` must be >= 0

**Vehicle Constraints:**

- `plate_number` must be unique
- `vehicle_type_id` must reference existing vehicle type
- `user_id` must reference existing user

**Parking Zone Constraints:**

- `zone_code` must be unique
- `latitude` and `longitude` are required
- `rate_multiplier` defaults to 1.0

## Query Patterns

### Common Queries

**Get User Vehicles:**

```sql
SELECT * FROM vehicles
WHERE user_id = ?
ORDER BY is_default DESC, created_at DESC
```

**Get Active Parking Sessions:**

```sql
SELECT ph.*, v.plate_number, pz.name as zone_name
FROM parking_history ph
JOIN vehicles v ON ph.vehicle_id = v.id
JOIN parking_zones pz ON ph.parking_zone_id = pz.id
WHERE ph.user_id = ?
  AND ph.status = 'active'
ORDER BY ph.start_time DESC
```

**Get Parking History:**

```sql
SELECT ph.*, v.plate_number, pz.name as zone_name, vt.name as vehicle_type_name
FROM parking_history ph
JOIN vehicles v ON ph.vehicle_id = v.id
JOIN parking_zones pz ON ph.parking_zone_id = pz.id
JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
WHERE ph.user_id = ?
ORDER BY ph.created_at DESC
LIMIT ? OFFSET ?
```

**Calculate Parking Cost:**

```sql
SELECT
  vtr.rate_per_hour * pz.rate_multiplier * (? / 60.0) as cost
FROM vehicle_type_rates vtr
JOIN parking_zones pz ON pz.id = ?
WHERE vtr.vehicle_type_id = ?
```

**Get Active Parking Zones:**

```sql
SELECT * FROM parking_zones
WHERE is_active = 1
ORDER BY name
```

**Get User Payment Methods:**

```sql
SELECT * FROM payment_methods
WHERE user_id = ?
ORDER BY is_default DESC, created_at DESC
```

## Database Reset

The `resetDatabase()` method performs a complete database reset:

```typescript
static async resetDatabase() {
  const instance = this.getInstance()

  // Drop tables in reverse dependency order
  const dropStatements = [
    'PRAGMA foreign_keys = OFF;',
    'DROP TABLE IF EXISTS notifications;',
    'DROP TABLE IF EXISTS parking_history;',
    'DROP TABLE IF EXISTS vehicle_type_rates;',
    'DROP TABLE IF EXISTS payment_methods;',
    'DROP TABLE IF EXISTS vehicles;',
    'DROP TABLE IF EXISTS user_locations;',
    'DROP TABLE IF EXISTS parking_zones;',
    'DROP TABLE IF EXISTS vehicle_types;',
    'DROP TABLE IF EXISTS users;',
    'VACUUM;',
    'PRAGMA foreign_keys = ON;',
  ]

  for (const sql of dropStatements) {
    await instance.execAsync(sql)
  }

  // Run migrations to recreate tables
  await runMigrations()
}
```

## Best Practices

### Data Integrity

1. **Foreign Key Constraints:** Ensure referential integrity
2. **Unique Constraints:** Prevent duplicate entries (email, plate_number, zone_code)
3. **Transaction Atomicity:** Use database transactions for multi-step operations
4. **Data Validation:** Validate all inputs before insertion

### Performance

1. **Indexing:** Index frequently queried columns (user_id, parking_zone_id, plate_number)
2. **Query Optimization:** Use appropriate WHERE clauses and LIMITs
3. **Pagination:** Implement pagination for large result sets (parking history)
4. **Batch Operations:** Use batch inserts/updates when possible

### Security

1. **Input Validation:** Validate all user inputs
2. **SQL Injection Prevention:** Use parameterized queries (Drizzle ORM handles this)
3. **Data Encryption:** Encrypt sensitive data (passwords, card numbers)
4. **Access Control:** Verify user ownership before data access

### Connection Management

1. **Singleton Pattern:** Use DatabaseManager for single instance
2. **Connection Pooling:** Reuse connections when possible
3. **Graceful Shutdown:** Close connections properly on app termination
4. **Error Recovery:** Handle connection failures with retry logic

### Maintenance

1. **Migrations:** Use migration system for schema changes
2. **Backup:** Regular database backups
3. **Cleanup:** Periodic cleanup of expired notifications
4. **Monitoring:** Monitor query performance and optimize as needed

## Migration System

Database migrations are managed through the `src/db/migrations/` directory. Migrations are executed in order to apply schema changes.

**Migration Files:**

- `index.ts` - Migration entry point
- `runner.ts` - Migration execution logic
- `execute-statements.ts` - SQL statement execution

**Migration Process:**

1. Create migration file with schema changes
2. Add migration to migration list
3. Execute migrations on app initialization via `runMigrations()`
4. Verify migration success

## Timestamp Format

All timestamps use ISO 8601 format with UTC timezone indicator:

- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-12-04T09:27:47.576Z`
- Generated using: `strftime('%Y-%m-%dT%H:%M:%fZ','now')`

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite Performance Best Practices](https://www.sqlite.org/optoverview.html)
