<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Parking App Test Suite

## Overview

This directory contains comprehensive tests for the parking application, covering database queries, mutations, store management, and integration workflows.

## Test Structure

```
src/__tests__/
├── unit/                          # Unit tests for individual components
│   ├── queries.test.ts           # Database query tests
│   ├── mutations.test.ts         # Database initialization tests
│   └── parking-store.test.ts     # ParkingStore MobX tests
├── integration/                   # Integration tests for workflows
│   ├── parking-booking-flow.test.ts      # Complete booking workflow
│   └── parking-cost-calculation.test.ts  # Cost calculation tests
├── helpers.ts                     # Test utility functions
└── README.md                      # This file
```

## Test Setup

The test harness uses:
- **In-memory SQLite database** (`better-sqlite3`) for fast, isolated tests
- **Drizzle ORM** integration - production query code runs unmodified
- **Jest** as the test framework
- **MobX-State-Tree** for store testing

### Test Database Setup

The `jest.setup.parking.ts` file:
1. Creates an in-memory SQLite database
2. Executes minimal DDL matching the parking schema
3. Mocks `@/db/index` to inject the test database
4. Clears all tables before each test file runs

## Running Tests

### Run All Tests
```bash
yarn test
```

### Run by Category
```bash
# Unit tests only
yarn test:unit

# Integration tests only
yarn test:integration
```

### Run Specific Test Files
```bash
# Test queries
yarn test:queries

# Test mutations
yarn test:mutations

# Test ParkingStore
yarn test:store

# Test booking flow
yarn test:booking

# Test cost calculation
yarn test:cost
```

### Run with Coverage
```bash
# All tests with coverage
yarn test:coverage

# Unit tests with coverage
yarn test:coverage:unit

# Integration tests with coverage
yarn test:coverage:integration
```

### Watch Mode
```bash
# Watch all tests
yarn test:watch

# Watch unit tests
yarn test:unit --watch

# Watch integration tests
yarn test:integration --watch
```

## Test Coverage

### Unit Tests (`unit/`)

#### `queries.test.ts`
Tests all database query functions:
- ✅ User queries (create, read, update, login)
- ✅ User location queries (CRUD operations)
- ✅ Vehicle type queries
- ✅ Vehicle type rate queries
- ✅ Vehicle queries (CRUD operations)
- ✅ Parking zone queries
- ✅ Parking history queries (booking, updates)
- ✅ Payment method queries (CRUD operations)
- ✅ Notification queries

#### `mutations.test.ts`
Tests database initialization:
- ✅ Database seeding with mock data
- ✅ Skip logic for already-seeded databases
- ✅ Referential integrity validation
- ✅ Error handling

#### `parking-store.test.ts`
Tests ParkingStore MobX-State-Tree store:
- ✅ Vehicle management (add, update, delete)
- ✅ Parking zone loading
- ✅ Parking history management
- ✅ Payment method management
- ✅ User location management
- ✅ Form state management
- ✅ Computed views (defaults, active sessions)
- ✅ Cost calculation

### Integration Tests (`integration/`)

#### `parking-booking-flow.test.ts`
Tests complete parking workflows:
- ✅ Complete booking flow (book → view → end)
- ✅ Multiple vehicle parking sessions
- ✅ Zone multiplier cost calculation
- ✅ Vehicle CRUD workflow
- ✅ Payment method CRUD workflow
- ✅ User location CRUD workflow

#### `parking-cost-calculation.test.ts`
Tests cost calculation logic:
- ✅ Different duration calculations
- ✅ Zone multiplier application
- ✅ Different vehicle type rates
- ✅ Actual vs planned cost comparison

## Test Helpers

The `helpers.ts` file provides utility functions:

- `createTempDB()` - Create temporary database file
- `cleanupTempDB(db)` - Cleanup temporary database
- `setupFreshDB()` - Create fresh database with mock data
- `teardownTestDB(db)` - Cleanup fresh database
- `createTestUser()` - Create test user
- `createTestVehicleType()` - Create test vehicle type
- `createTestVehicle()` - Create test vehicle
- `createTestParkingZone()` - Create test parking zone
- `createTestPaymentMethod()` - Create test payment method
- `createTestParkingHistory()` - Create test parking history

## Writing New Tests

### Unit Test Example
```typescript
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'

describe('My Feature', () => {
  beforeEach(async () => {
    await mutations.initializeDatabase()
  })

  test('my test case', async () => {
    // Arrange
    const user = await queries.createUser({
      email: 'test@example.com',
      password: 'password123',
    })

    // Act
    const result = await queries.getUserById(user.id)

    // Assert
    expect(result).toBeDefined()
    expect(result?.email).toBe('test@example.com')
  })
})
```

### Integration Test Example
```typescript
import { ParkingStore } from '@/models/ParkingStore'
import { RootStore } from '@/models/RootStore'

describe('My Integration Flow', () => {
  let parkingStore: any

  beforeEach(async () => {
    // Setup store and test data
    const rootStore = RootStore.create({})
    parkingStore = rootStore.parkingStore
    await parkingStore.initialize()
  })

  test('complete workflow', async () => {
    // Test complete user workflow
  })
})
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use `beforeEach` to reset database state
3. **Realistic Data**: Use realistic test data that matches production patterns
4. **Error Cases**: Test both success and error scenarios
5. **Edge Cases**: Test boundary conditions and limits
6. **Descriptive Names**: Use clear, descriptive test names

## Troubleshooting

### Tests failing with "Database not initialized"
- Ensure `mutations.initializeDatabase()` is called in `beforeEach`
- Check that `jest.setup.parking.ts` is properly configured

### Tests failing with "User not authenticated"
- Ensure test user is created and set in UserStore
- Check that `rootStore.userStore.user` is properly set

### Tests timing out
- Check for async operations that aren't awaited
- Verify `flow()` functions are properly handled

### Import errors
- Ensure module name mapping (`@/`) is configured in `jest.config.js`
- Check that all dependencies are installed

## Coverage Goals

- **Queries**: 100% coverage of all query functions
- **Mutations**: 100% coverage of initialization logic
- **ParkingStore**: 100% coverage of store actions and views
- **Integration**: All major user workflows covered

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (in-memory database)
- No external dependencies
- Deterministic results
- Comprehensive coverage reporting

