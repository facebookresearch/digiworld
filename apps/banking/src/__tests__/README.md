<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Banking App Test Suite

This directory contains comprehensive unit and integration tests for the banking application backend, covering all queries, mutations, store methods, and business rules described in the feature scope.

## Test Structure

### Unit Tests (`/unit/`)
- **`queries.test.ts`** - Tests for all database query functions
- **`mutations.test.ts`** - Tests for database mutation functions  
- **`banking-store.test.ts`** - Tests for BankingStore methods and state management

### Integration Tests (`/integration/`)
- **`session-initialization.test.ts`** - Feature Group 1: Session initialization and agent behavior
- **`account-summary.test.ts`** - Feature Group 2: Account summary view and balance display
- **`funds-transfer.test.ts`** - Feature Group 3: Funds transfer between accounts
- **`bill-payment.test.ts`** - Feature Group 4: Bill payment to mock billers
- **`transaction-history.test.ts`** - Feature Group 5: Transaction history and logging

### Test Helpers (`helpers.ts`)
- **`createTempDB()`** - Creates temporary database copy for safe testing
- **`cleanupTempDB()`** - Cleans up temporary database files
- **`setupFreshDB()`** - Creates fresh database with schema and mock data
- **`teardownTestDB()`** - Cleans up fresh database files

## Running Tests

### All Tests
```bash
yarn test                    # Run all tests
yarn test:watch             # Run tests in watch mode
yarn test:coverage          # Run with coverage report
```

### Unit Tests Only
```bash
yarn test:unit              # Run all unit tests
yarn test:queries           # Run query tests only
yarn test:mutations         # Run mutation tests only
yarn test:store             # Run store tests only
```

### Integration Tests Only
```bash
yarn test:integration       # Run all integration tests
yarn test:session           # Run session initialization tests
yarn test:accounts          # Run account summary tests
yarn test:transfers         # Run funds transfer tests
yarn test:bills             # Run bill payment tests
yarn test:history           # Run transaction history tests
```

### Coverage Reports
```bash
yarn test:coverage:unit     # Unit test coverage
yarn test:coverage:integration # Integration test coverage
```

## Test Coverage

The test suite covers:

### Database Layer
- ✅ User management (create, read, update, delete)
- ✅ Session management (create, update, end)
- ✅ Account operations (create, read, update, balance changes)
- ✅ Transaction processing (deposits, withdrawals, transfers)
- ✅ Credit card operations (apply, charge, pay, close)
- ✅ Beneficiary management (add, update, remove)
- ✅ Biller and bill management
- ✅ Zelle operations (onboard, send, receive)
- ✅ Scheduled transactions
- ✅ Notifications

### Business Logic
- ✅ Account balance validation
- ✅ Insufficient funds handling
- ✅ Account type restrictions
- ✅ Transaction limits and validation
- ✅ Error handling and logging
- ✅ State consistency
- ✅ Concurrent operations

### Feature Requirements
- ✅ Session initialization with seed and configuration
- ✅ Account summary with correct balances ($2,000 checking, $5,000 savings)
- ✅ Funds transfer with validation and logging
- ✅ Bill payment to predefined billers
- ✅ Transaction history with filtering and sorting
- ✅ Offline compliance (no network dependencies)

## Test Data

Tests use:
- **Mock data** from JSON files in `src/data/`
- **Temporary databases** for isolation
- **Fresh databases** for integration testing
- **Deterministic seeds** for reproducible behavior

## Database Setup

Tests automatically:
1. Create temporary database copies
2. Initialize with schema and mock data
3. Run tests in isolation
4. Clean up temporary files

## Assertions

Tests verify:
- **Data integrity** - Correct data storage and retrieval
- **Business rules** - Validation and error handling
- **State consistency** - Store and database synchronization
- **Transaction logging** - Complete audit trail
- **Error handling** - Graceful failure modes
- **Performance** - Efficient operations

## Mock Data

The test suite uses realistic mock data including:
- Multiple users with different account tiers
- Various account types (checking, savings, credit cards)
- Predefined billers (utilities, telecom, etc.)
- Sample transactions and bills
- Beneficiaries and Zelle contacts

## Continuous Integration

Tests are designed to run in CI/CD pipelines with:
- No external dependencies
- Deterministic behavior
- Fast execution
- Comprehensive coverage
- Clear failure reporting

## Troubleshooting

### Common Issues
1. **Database file not found** - Ensure `ABC.db` exists in test directory
2. **Mock data missing** - Check that JSON files are present in `src/data/`
3. **Test timeouts** - Increase timeout in jest config if needed
4. **Memory leaks** - Ensure proper cleanup in test teardown

### Debug Mode
```bash
yarn test --verbose        # Detailed test output
yarn test --detectOpenHandles # Detect async operations
yarn test --forceExit      # Force exit after tests
```

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Test error conditions and edge cases
5. Ensure proper cleanup
6. Update this README if needed
