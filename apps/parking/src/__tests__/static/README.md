# Static Database (ABC.db) for Parking App Tests

## Overview

The `ABC.db` file is a pre-generated SQLite database file that contains the complete parking app schema and mock data. This file is used by test helpers to quickly create isolated test databases by copying it, rather than rebuilding the schema and seeding data from scratch each time.

## Why Use ABC.db?

1. **Faster Test Execution**: Copying a pre-built database is much faster than running migrations and seeding data
2. **Consistent Test Data**: All tests start with the same baseline data
3. **Isolated Testing**: Each test gets its own copy, so tests don't interfere with each other
4. **Reproducible**: Same database state every time tests run

## Generating ABC.db

To create the static database file, run:

```bash
yarn test:generate-static-db
```

This will:
1. Create a temporary database
2. Run migrations to create the schema
3. Seed the database with all mock data from `src/data/mock-*.json` files
4. Save it as `src/__tests__/static/ABC.db`

## What's Included in ABC.db?

The static database includes:
- ✅ Complete schema (all 9 tables)
- ✅ Vehicle types (car, motorcycle, van, etc.)
- ✅ Vehicle type rates
- ✅ Users (from `mock-users.json`)
- ✅ User locations
- ✅ Vehicles
- ✅ Payment methods
- ✅ Parking zones
- ✅ Parking history
- ✅ Notifications

## Using ABC.db in Tests

The test helpers automatically use ABC.db when available:

```typescript
import { createTempDB, cleanupTempDB } from '../helpers'

describe('My Test', () => {
  let db: Database.Database

  beforeEach(() => {
    // Creates a copy of ABC.db
    db = createTempDB()
  })

  afterEach(() => {
    // Cleans up the copy
    cleanupTempDB(db)
  })

  test('my test', () => {
    // Test code - db already has schema and mock data
  })
})
```

## Fallback Behavior

If `ABC.db` doesn't exist, `createTempDB()` will:
1. Warn you that ABC.db is missing
2. Create an empty database instead
3. You'll need to run migrations and seed data manually

## When to Regenerate ABC.db

Regenerate ABC.db when:
- Schema changes (new tables, columns, indexes)
- Mock data files are updated
- You want fresh test data

## File Location

- **Generated File**: `src/__tests__/static/ABC.db`
- **Generator Script**: `src/__tests__/static/generate-static-db.ts`
- **Git**: ABC.db should be in `.gitignore` (it's a generated file)

## Troubleshooting

### Error: "Static database not found"
- Run `yarn test:generate-static-db` to create it

### Error: "Migration failed"
- Check that all migration files are correct
- Verify database schema matches expected structure

### Error: "Failed to seed mock data"
- Ensure all mock JSON files exist in `src/data/`
- Check JSON file format matches expected schema

### Tests are slow
- Make sure ABC.db exists and is being used
- Check that `createTempDB()` is copying ABC.db, not creating empty DBs

