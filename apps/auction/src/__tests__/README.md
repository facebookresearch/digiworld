# Auction App Test Suite

This directory contains comprehensive unit and integration tests for the auction application, covering all features (F1-F11) from the feature scope document.

## Test Structure

### Unit Tests (`/unit/`)
- **`queries.test.ts`** - Tests for all database query functions
  - Categories, Users, Items, Sessions, Bids, Transactions, Payments, Inventory, Listings
  - Edge cases: non-existent records, null returns, empty arrays
  - Search functionality (F3) with various filters
  - Item detail view (F4) with seller and category info

- **`mutations.test.ts`** - Tests for database mutation functions
  - Database initialization (F1)
  - Item creation and updates (F7)
  - Bid creation and updates (F5)
  - Transaction creation and updates (F6, F8, F10)
  - Payment processing (F9)
  - Inventory management (F8)
  - Listing management (F7)
  - Error handling and edge cases

- **`auction-store.test.ts`** - Tests for AuctionStore methods and state management
  - Store initialization and data loading
  - Session management (F2)
  - Search and browse functionality (F3)
  - Item detail loading (F4)
  - Bidding simulation (F5) with validation
  - Buy now functionality (F6) with payment processing
  - Listing items (F7)
  - Payment simulation (F9) with deterministic outcomes
  - Cancellation and refunds (F10)
  - Transaction and inventory management (F8)
  - Store views and computed properties

### Integration Tests (`/integration/`)
- **`f1-mock-data.test.ts`** - Feature F1: Mock Data Generation
- **`f2-session.test.ts`** - Feature F2: Session Initialization
- **`f3-search.test.ts`** - Feature F3: Browse/Search Items
- **`f4-item-detail.test.ts`** - Feature F4: Item Detail View
- **`f5-bidding.test.ts`** - Feature F5: Bidding Simulation
- **`f6-buy-now.test.ts`** - Feature F6: Buy Now Simulation
- **`f7-listing.test.ts`** - Feature F7: Selling/Listing Items
- **`f8-transactions.test.ts`** - Feature F8: Transaction Management
- **`f9-payments.test.ts`** - Feature F9: Payment Simulation
- **`f10-refunds.test.ts`** - Feature F10: Cancellation & Refunds

## Running Tests

### All Tests
```bash
yarn test                    # Run all unit tests
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
yarn test:f1                # Run F1 (Mock Data) tests
yarn test:f2                # Run F2 (Session) tests
yarn test:f3                # Run F3 (Search) tests
yarn test:f4                # Run F4 (Item Detail) tests
yarn test:f5                # Run F5 (Bidding) tests
yarn test:f6                # Run F6 (Buy Now) tests
yarn test:f7                # Run F7 (Listing) tests
yarn test:f8                # Run F8 (Transactions) tests
yarn test:f9                # Run F9 (Payments) tests
yarn test:f10               # Run F10 (Refunds) tests
```

### Coverage Reports
```bash
yarn test:coverage          # Full coverage report
yarn test:coverage:unit    # Unit tests coverage
yarn test:coverage:integration  # Integration tests coverage
```

## Test Helpers (`helpers.ts`)

- **`createTestData()`** - Creates test data (categories, users, mock cards)
- **`TEST_USER_IDS`** - Constants for test user IDs
- **`TEST_CATEGORY_IDS`** - Constants for test category IDs
- **`TEST_CARD_NUMBERS`** - Constants for test mock card numbers

## Test Coverage

The test suite aims for comprehensive coverage of:
- ✅ All database queries with edge cases
- ✅ All database mutations with error handling
- ✅ All AuctionStore actions and views
- ✅ All features from feature-scope.md (F1-F11)
- ✅ Corner cases and error scenarios
- ✅ Deterministic behavior validation
- ✅ Payment success/failure scenarios
- ✅ Auction expiration handling
- ✅ Inventory management
- ✅ Transaction state transitions

## Edge Cases Covered

### Bidding (F5)
- Bid below minimum amount
- Bid on non-auction item
- Bid on expired auction
- Bid on inactive item
- Multiple bids on same item
- Winning bid updates

### Buy Now (F6)
- Buy now on auction item
- Insufficient quantity
- Payment processing
- Item quantity updates

### Payments (F9)
- Successful payment
- Declined payment
- Insufficient funds
- Unknown card handling
- Deterministic seed usage

### Refunds (F10)
- Full refund (100%)
- Item quantity restoration
- Non-purchase transaction cancellation
- Already refunded transaction

### Search (F3)
- Keyword search in title
- Keyword search in description
- Category filtering
- Seller filtering
- Auction flag filtering
- Combined filters
- Result limiting
- Empty results

## Deterministic Testing

All tests use deterministic seeds to ensure reproducible results:
- Session seeds (F2)
- Bid outcome seeds (F5)
- Payment outcome seeds (F9)

## Database Setup

Tests use an in-memory SQLite database created in `jest.setup.auction.ts`:
- All tables created with proper schema
- Foreign keys enforced
- Indexes created
- Triggers set up
- Tables cleared before each test file

## Writing New Tests

When adding new tests:

1. **Unit Tests**: Add to appropriate test file in `/unit/`
2. **Integration Tests**: Create new file in `/integration/` following naming pattern `f{number}-{feature}.test.ts`
3. **Use Helpers**: Import test helpers from `helpers.ts` for consistent test data
4. **Cover Edge Cases**: Test both success and failure scenarios
5. **Test Determinism**: Verify deterministic behavior where applicable
6. **Clear State**: Ensure tests don't interfere with each other

## Example Test Structure

```typescript
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { AuctionStore } from '@/models/AuctionStore'
import { createTestData, TEST_USER_IDS } from '../helpers'

describe('Feature Name', () => {
  beforeEach(async () => {
    await createTestData()
  })

  it('should handle success case', async () => {
    // Test implementation
  })

  it('should handle error case', async () => {
    // Test error handling
  })

  it('should handle edge case', async () => {
    // Test edge case
  })
})
```

## Notes

- All tests use `beforeEach` to set up fresh test data
- Tests are isolated and don't depend on each other
- Mock data is created using `createTestData()` helper
- Database is cleared between test files automatically
- Tests validate both happy paths and error scenarios
