# Auction App Technical Implementation

## Overview

This document describes the technical implementation of features in the auction marketplace application. Each feature is documented with its implementation details, code locations, and how it integrates with the overall system architecture.

## Architecture Overview

The auction app follows a layered architecture:

- **UI Layer**: React Native screens using Expo Router (`src/app/`)
- **State Management**: MobX-State-Tree stores (`src/models/`)
- **Data Layer**: Drizzle ORM with SQLite (`src/db/`)
- **Components**: Reusable UI components (`src/components/`)
- **Utils**: Helper functions and utilities (`src/utils/`)

## Core Features Implementation

### 1. Browse & Search Items

**Location:** `src/app/(app)/browse.tsx`, `src/models/AuctionStore.ts`

**Implementation:**

The browse screen displays items organized by category in a Netflix-style horizontal scrolling layout:

- **Category Rows**: Each category shows up to 8 items horizontally
- **Search Functionality**: Real-time keyword search with debouncing
- **Category Filtering**: Filter items by category
- **Pagination**: "See All" button navigates to category detail screen

**Key Code:**

```typescript
// Search implementation in AuctionStore
searchItems: flow(function* (params: {
  keyword?: string
  categoryId?: number
  sellerId?: number
  auctionFlag?: number
  limit?: number
}) {
  const results = yield queries.searchItems(params)
  // Updates search results in store
})

// Query implementation
export const searchItems = async (params) => {
  const conditions = [eq(items.status, 'active')]
  if (params.keyword) {
    conditions.push(
      or(
        like(items.title, keywordPattern),
        like(items.description, keywordPattern)
      )
    )
  }
  // Additional filters for category, seller, auction flag
  return await db.select().from(items).where(and(...conditions))
}
```

**Database Queries:**
- `searchItems()` - Searches items by keyword, category, seller, or auction flag
- `getItemsByCategory()` - Gets all items in a category
- `getActiveItems()` - Gets all active items

### 2. Item Detail View

**Location:** `src/app/item/[id].tsx`, `src/models/AuctionStore.ts`

**Implementation:**

The item detail screen shows complete product information:

- **Item Information**: Title, description, images, price
- **Seller Information**: Seller name, rating, total sales
- **Auction Details**: Current bid, time remaining, bid history (for auctions)
- **Actions**: Place Bid (auctions) or Buy Now (buy-now items)

**Key Code:**

```typescript
// Load item detail
loadItemDetail: flow(function* (itemId: number) {
  const itemDetail = yield queries.getItemDetail(itemId)
  // Includes seller and category info
  // Updates store with item data
})

// Query implementation
export const getItemDetail = async (itemId: number) => {
  const item = await db.select().from(items).where(eq(items.id, itemId))
  const seller = await db.select().from(users).where(eq(users.id, item.sellerId))
  const category = await db.select().from(categories).where(eq(categories.id, item.categoryId))
  return { ...item, seller, category }
}
```

**Database Queries:**
- `getItemDetail()` - Gets item with seller and category info
- `getBidsByItem()` - Gets all bids for an item (auctions)
- `getWinningBid()` - Gets current winning bid

### 3. Auction Bidding

**Location:** `src/models/AuctionStore.ts` (placeBid), `src/db/queries.ts` (createBid)

**Implementation:**

Bidding allows users to place bids on auction items:

- **Bid Validation**: Bid must be strictly greater than current price
- **Bid Creation**: Creates bid record and updates item's current bid
- **Winning Bid**: Highest bid becomes the winning bid (`is_winning = 1`)
- **Bid History**: All bids are tracked with timestamps and outcomes

**Key Code:**

```typescript
// Place bid implementation
placeBid: flow(function* (data: {
  itemId: number
  userId: number
  bidAmount: number
  deterministicSeed?: number
}) {
  // Validate item is auction and active
  if (!item.isAuction) throw new Error('Item is not an auction item')
  if (item.status !== 'active') throw new Error('Item is not active')
  
  // Check bidding window
  const now = Math.floor(Date.now() / 1000)
  if (item.endTime && item.endTime < now) {
    throw new Error('Bidding has closed for this auction')
  }
  
  // Validate bid amount
  const minBid = item.minNextBid
  if (minBid && data.bidAmount <= minBid) {
    throw new Error(`Bid must be higher than current price`)
  }
  
  // Check payment method exists
  const userPaymentMethods = yield queries.getUserPaymentMethods(data.userId)
  if (!userPaymentMethods || userPaymentMethods.length === 0) {
    throw new Error('You must add a payment method before placing a bid')
  }
  
  // Create bid
  const bid = yield queries.createBid({
    sessionId: validSessionId,
    itemId: data.itemId,
    userId: data.userId,
    bidAmount: data.bidAmount,
    deterministicSeed: data.deterministicSeed,
  })
  
  // Update item's current bid and bid count
  yield queries.updateItemCurrentBid(data.itemId, data.bidAmount)
  
  return bid
})
```

**Database Queries:**
- `createBid()` - Creates a new bid record
- `updateItemCurrentBid()` - Updates item's current bid and bid count
- `getWinningBid()` - Gets the highest bid for an item
- `updateBidOutcome()` - Updates bid outcome (won/lost/pending/outbid)

**Business Rules:**
- Bids must be strictly greater than current price (no increments enforced)
- Bidding closes when `end_time` is reached
- Only one bid per item can have `is_winning = 1`
- Bids cannot be cancelled once placed

### 4. Buy Now Purchases

**Location:** `src/models/AuctionStore.ts` (buyNow), `src/db/queries.ts` (createTransaction)

**Implementation:**

Buy Now allows instant purchase of non-auction items:

- **Instant Purchase**: Items are sold immediately at listed price
- **Payment Processing**: Processes payment using mock cards
- **Transaction Creation**: Creates transaction and payment records
- **Inventory Update**: Marks item as sold and updates quantity

**Key Code:**

```typescript
// Buy Now implementation
buyNow: flow(function* (data: {
  itemId: number
  userId: number
  quantity?: number
  paymentMethod?: string
  paymentCardNumber?: string
}) {
  // Validate item is buy-now and active
  if (!item.isBuyNow) throw new Error('Item is not available for buy now')
  if (item.status !== 'active') throw new Error('Item is not active')
  
  // Check payment method exists
  const userPaymentMethods = yield queries.getUserPaymentMethods(data.userId)
  if (!userPaymentMethods || userPaymentMethods.length === 0) {
    throw new Error('You must add a payment method before purchasing')
  }
  
  // Use default payment method if not provided
  if (!data.paymentMethod || !data.paymentCardNumber) {
    const defaultMethod = userPaymentMethods.find(pm => pm.isDefault) || userPaymentMethods[0]
    data.paymentMethod = defaultMethod.type || 'card'
    data.paymentCardNumber = defaultMethod.cardNumber || ''
  }
  
  // Create transaction
  const transaction = yield queries.createTransaction({
    sessionId: self.currentSession?.id || null,
    transactionType: 'purchase',
    itemId: data.itemId,
    userId: data.userId,
    sellerId: item.sellerId,
    amount: item.price * (data.quantity || 1),
    quantity: data.quantity || 1,
    paymentMethod: data.paymentMethod,
    paymentCardNumber: data.paymentCardNumber,
  })
  
  // Process payment
  if (data.paymentCardNumber) {
    const payment = yield self.processPayment({
      transactionId: transaction.id,
      cardNumber: data.paymentCardNumber,
      amount: transaction.amount,
      transactionType: 'purchase',
    })
    
    // Check payment status - throw error if failed
    if (payment.status === 'declined') {
      yield queries.updateTransactionPaymentStatus(
        transaction.id,
        'failed',
        payment.failureReason || 'PAYMENT_DECLINED'
      )
      throw new Error('Purchase failed, please try again')
    }
  }
  
  // Mark item as sold
  yield queries.updateItemStatusAndQuantity(data.itemId, 'sold', 0)
  
  return transaction
})
```

**Database Queries:**
- `createTransaction()` - Creates a purchase transaction
- `processPayment()` - Processes payment using mock cards
- `updateItemStatusAndQuantity()` - Updates item status to 'sold'
- `updateTransactionPaymentStatus()` - Updates transaction payment status

**Business Rules:**
- Items are sold immediately (no quantity checks)
- Payment must succeed before item is marked as sold
- Failed payments result in failed transaction status
- Payment processing respects `transactions_succeed` system config flag
- If `transactions_succeed = false`, payment fails and purchase is rejected

### 5. Item Listing (Selling)

**Location:** `src/models/AuctionStore.ts` (listItem), `src/db/queries.ts` (createItem, createListing)

**Implementation:**

Users can list items for sale:

- **Item Creation**: Creates item record with seller info
- **Listing Record**: Creates listing record to track item listing
- **Seller Stats**: Updates seller's total items listed count
- **Auction/Buy-Now**: Supports both auction and buy-now modes

**Key Code:**

```typescript
// List item implementation
listItem: flow(function* (data: {
  title: string
  description?: string
  categoryId: number
  sellerId: number
  price: number
  auctionFlag: number
  startingBid?: number
  bidIncrement?: number
  endTime?: number
  quantity?: number
}) {
  // Create item
  const item = yield queries.createItem(data)
  
  // Create listing record
  const listing = yield queries.createListing({
    sessionId: validSessionId,
    userId: data.sellerId,
    itemId: item.id,
    listPrice: data.price,
  })
  
  // Update seller stats
  const seller = yield queries.getUserById(data.sellerId)
  if (seller) {
    const newTotalItemsListed = (seller.totalItemsListed || 0) + 1
    yield queries.updateUserSellerStats(data.sellerId, {
      totalItemsListed: newTotalItemsListed,
    })
  }
  
  return item
})
```

**Database Queries:**
- `createItem()` - Creates a new item record
- `createListing()` - Creates a listing record
- `updateUserSellerStats()` - Updates seller's total items listed

**Business Rules:**
- Users must have seller stats (`seller_rating > 0` or `total_items_listed > 0`)
- Auction items require `starting_bid` and `end_time`
- Buy-now items don't require auction fields

### 6. Auction End & Winner Determination

**Location:** `src/models/AuctionStore.ts` (endListing), `src/db/queries.ts` (getWinningBid)

**Implementation:**

When an auction ends, the system determines the winner:

- **Winner Selection**: Highest bid becomes the winner
- **Tie-Breaking**: Uses bid time, deterministic seed, and bid ID for ties
- **Transaction Creation**: Creates bid_win transaction for winner
- **Payment Processing**: Processes payment for winning bid
- **Item Status**: Marks item as sold

**Key Code:**

```typescript
// End listing implementation
endListing: flow(function* (itemId: number) {
  // Get winning bid (highest bid)
  const winningBid = yield queries.getWinningBid(itemId)
  
  if (winningBid && winningBid.userId) {
    // Check payment method exists
    const winnerPaymentMethods = yield queries.getUserPaymentMethods(winningBid.userId)
    if (!winnerPaymentMethods || winnerPaymentMethods.length === 0) {
      throw new Error('Winner has no payment method on file')
    }
    
    // Get default payment method
    let defaultMethod = winnerPaymentMethods.find(pm => pm.isDefault)
    if (!defaultMethod) {
      if (winnerPaymentMethods.length === 1) {
        yield queries.setDefaultPaymentMethod(winningBid.userId, winnerPaymentMethods[0].id)
        defaultMethod = winnerPaymentMethods[0]
      }
    }
    
        // Create bid_win transaction
        // NOTE: Auctions create transactions regardless of transactions_succeed flag
        // Payment processing still respects the flag, but transaction is created first
        const transaction = yield queries.createTransaction({
          sessionId: validSessionId,
          transactionType: 'bid_win',
          itemId: itemId,
          userId: winningBid.userId,
          sellerId: item.sellerId,
          bidId: winningBid.id,
          amount: winningBid.bidAmount,
          paymentMethod: defaultMethod.type || 'card',
          paymentCardNumber: defaultMethod.cardNumber || '',
        })
        
        // Process payment - respects transactions_succeed flag
        // Note: Payment may fail if transactions_succeed is false, but transaction is already created
        const payment = yield self.processPayment({
          transactionId: transaction.id,
          cardNumber: defaultMethod.cardNumber || '',
          amount: winningBid.bidAmount,
          transactionType: 'bid_win',
        })
    
    // Update bid outcome
    yield queries.updateBidOutcome(winningBid.id, 'won')
    
    // Mark other bids as lost
    const allBids = yield queries.getBidsByItem(itemId)
    for (const bid of allBids) {
      if (bid.id !== winningBid.id) {
        yield queries.updateBidOutcome(bid.id, 'lost')
      }
    }
    
    // Mark item as sold
    yield queries.updateItemStatusAndQuantity(itemId, 'sold', 0)
  } else {
    // No winner - mark item as expired
    yield queries.updateItemStatusAndQuantity(itemId, 'expired', 0)
  }
  
  // Mark auction as expired
  yield queries.updateItemExpired(itemId, true)
})
```

**Database Queries:**
- `getWinningBid()` - Gets highest bid using tie-breaking logic
- `createTransaction()` - Creates bid_win transaction
- `updateBidOutcome()` - Updates bid outcome (won/lost)
- `updateItemStatusAndQuantity()` - Updates item status

**Tie-Breaking Logic:**
1. Highest bid amount
2. Earliest bid time (first come, first served)
3. Deterministic seed (for testing)
4. Lower bid ID (earlier bid)

### 7. Payment Processing

**Location:** `src/models/AuctionStore.ts` (processPayment), `src/db/queries.ts` (getMockCardByNumber, createPayment, getSystemConfig)

**Implementation:**

Payment processing uses mock cards and system configuration for deterministic testing:

- **System Config Check**: Checks `transactions_succeed` config flag (takes precedence)
- **Session Fallback**: Falls back to session's `transactionsSucceed` flag if config not found
- **Mock Card Lookup**: Looks up card in mock_cards table
- **Payment Decision Logic**: Priority order determines payment outcome
- **Payment Record**: Creates payment record with status and failure reason
- **Transaction Update**: Updates transaction payment status

**Key Code:**

```typescript
// Process payment implementation
processPayment: flow(function* (data: {
  transactionId: number
  cardNumber: string
  amount: number
  transactionType: string
}) {
  // Determine if this is an outgoing transaction (purchase/bid_win)
  const isOutgoing = data.transactionType === 'purchase' || data.transactionType === 'bid_win'
  const isRefund = data.transactionType === 'refund'
  
  // Check system config for transaction success setting (takes precedence)
  let transactionsSucceed = true
  let configSource = 'default'
  
  try {
    const config = yield queries.getSystemConfig('transactions_succeed')
    const configValue = config?.value
    
    if (config && configValue !== undefined && configValue !== null && configValue !== '') {
      // Normalize value - handle string 'true'/'false', boolean, and numeric values
      const normalizedValue = String(configValue).toLowerCase().trim()
      
      // Explicitly check for false values
      if (normalizedValue === 'false' || normalizedValue === '0' || 
          configValue === false || configValue === 0) {
        transactionsSucceed = false
        configSource = 'system_config'
      } else {
        transactionsSucceed = true
        configSource = 'system_config'
      }
    } else {
      // If no config found, check session flag as fallback
      const sessionTransactionsSucceed = self.currentSession?.transactionsSucceed
      if (sessionTransactionsSucceed !== undefined) {
        transactionsSucceed = sessionTransactionsSucceed === 1
        configSource = 'session'
      }
    }
  } catch (error) {
    // Default to true if error reading config
    transactionsSucceed = true
    configSource = 'error_fallback'
  }
  
  // Get mock card to check if it should always succeed/fail
  let mockCard = null
  try {
    mockCard = yield queries.getMockCardByNumber(data.cardNumber)
  } catch (error) {
    // If card lookup fails, continue without mock card
  }
  
  let paymentStatus: 'success' | 'declined' | 'pending' = 'pending'
  let transactionPaymentStatus: 'pending' | 'success' | 'failed' = 'pending'
  let failureReason: string | undefined
  
  // Payment decision logic (in priority order):
  // 1. Refunds always succeed (incoming transactions)
  // 2. Mock card failures override everything (explicit test failures)
  // 3. System config controls outgoing transactions (purchases/bid wins)
  // 4. Default to success for incoming transactions or when config allows
  
  if (isRefund) {
    // Refunds always succeed (incoming transactions)
    paymentStatus = 'success'
    transactionPaymentStatus = 'success'
  } else if (mockCard && mockCard.alwaysSucceeds === 0) {
    // Mock card explicitly set to fail - this overrides config for testing
    paymentStatus = 'declined'
    transactionPaymentStatus = 'failed'
    failureReason = mockCard.failureReason || 'PAYMENT_DECLINED'
  } else if (isOutgoing && !transactionsSucceed) {
    // Outgoing transactions (purchases/bid wins) fail when config toggle is off
    paymentStatus = 'declined'
    transactionPaymentStatus = 'failed'
    failureReason = 'PAYMENT_DECLINED'
  } else {
    // Success: either incoming transaction, or outgoing with config allowing success
    paymentStatus = 'success'
    transactionPaymentStatus = 'success'
  }
  
  // Create payment record
  const payment = yield queries.createPayment({
    transactionId: data.transactionId,
    cardNumber: data.cardNumber,
    cardType: mockCard?.cardType,
    amount: data.amount,
    status: paymentStatus,
    failureReason,
    deterministicSeed: data.deterministicSeed,
  })
  
  // Update transaction payment status
  yield queries.updateTransactionPaymentStatus(
    data.transactionId,
    transactionPaymentStatus,
    failureReason
  )
  
  return payment
})
```

**Database Queries:**
- `getSystemConfig()` - Gets system configuration (e.g., `transactions_succeed`)
- `getMockCardByNumber()` - Gets mock card by card number
- `createPayment()` - Creates payment record
- `updateTransactionPaymentStatus()` - Updates transaction payment status

**Payment Decision Priority:**
1. **Refunds** - Always succeed (incoming transactions)
2. **Mock Card Failures** - Override config for explicit test failures
3. **System Config** - Controls outgoing transactions (purchases/bid_wins)
   - `transactions_succeed = false` → All outgoing transactions fail
   - `transactions_succeed = true` → Outgoing transactions succeed (unless mock card fails)
4. **Default** - Success for incoming transactions or when config allows

**Important Notes:**
- **Buy Now Purchases**: Payment processing happens immediately and respects `transactions_succeed` flag
- **Auction Wins**: Payment processing happens when auction ends (via `endListing`), but auctions create transactions regardless of `transactions_succeed` flag (payment processing still respects the flag)
- **Mock Cards**: Explicit failures override system config for testing scenarios

**Mock Cards:**
- `4242 4242 4242 4242` - Always succeeds
- `4000 0000 0000 0002` - Always fails (DECLINED)
- `4000 0000 0000 9995` - Always fails (INSUFFICIENT_FUNDS)
- See [data.md](./data.md) for full list

### 8. Transaction Management

**Location:** `src/models/AuctionStore.ts`, `src/db/queries.ts`

**Implementation:**

Transaction management tracks all purchases, sales, and refunds:

- **Transaction Types**: purchase, bid_win, listing, sale, refund
- **Status Tracking**: completed, pending, cancelled, refunded
- **Payment Status**: success, failed, pending
- **History**: Users can view their transaction history

**Key Code:**

```typescript
// Get user transactions
getTransactionsByUser: flow(function* (userId: number) {
  const transactions = yield queries.getTransactionsByUser(userId)
  // Updates store with transactions
})

// Get purchases (purchase + bid_win)
getPurchasesByUser: flow(function* (userId: number) {
  const purchases = yield queries.getPurchasesByUser(userId)
  // Returns completed purchases
})

// Get sales
getSalesByUser: flow(function* (userId: number) {
  const sales = yield queries.getSalesByUser(userId)
  // Returns completed sales
})
```

**Database Queries:**
- `getTransactionsByUser()` - Gets all transactions for a user
- `getPurchasesByUser()` - Gets purchases (purchase + bid_win)
- `getSalesByUser()` - Gets sales
- `getTransactionById()` - Gets transaction by ID

### 9. Refunds & Cancellations

**Location:** `src/models/AuctionStore.ts` (cancelTransaction), `src/db/queries.ts` (createTransaction)

**Implementation:**

Refunds allow users to cancel purchases:

- **Full Refunds**: 100% refund for cancelled purchases
- **Refund Transaction**: Creates refund transaction record
- **Transaction Update**: Updates original transaction status to 'refunded'
- **Item Status**: Restores item to 'active' status if applicable

**Key Code:**

```typescript
// Cancel transaction (refund) implementation
cancelTransaction: flow(function* (transactionId: number) {
  const transaction = yield queries.getTransactionById(transactionId)
  
  if (!transaction) {
    throw new Error('Transaction not found')
  }
  
  // Only purchase transactions can be cancelled
  if (transaction.transactionType !== 'purchase') {
    throw new Error('Only purchase transactions can be cancelled')
  }
  
  if (transaction.status === 'refunded') {
    throw new Error('Transaction already refunded')
  }
  
  // Create refund transaction
  const refundTransaction = yield queries.createTransaction({
    sessionId: self.currentSession?.id || null,
    transactionType: 'refund',
    itemId: transaction.itemId,
    userId: transaction.userId,
    sellerId: transaction.sellerId,
    amount: transaction.amount,
    quantity: transaction.quantity,
  })
  
  // Update original transaction
  yield queries.updateTransactionStatus(transactionId, 'refunded')
  yield queries.updateTransactionRefundAmount(transactionId, transaction.amount)
  
  // Restore item to active if applicable
  if (transaction.itemId) {
    yield queries.updateItemStatusAndQuantity(transaction.itemId, 'active', 1)
  }
  
  return refundTransaction
})
```

**Database Queries:**
- `createTransaction()` - Creates refund transaction
- `updateTransactionStatus()` - Updates transaction status
- `updateTransactionRefundAmount()` - Updates refund amount
- `updateItemStatusAndQuantity()` - Restores item status

**Business Rules:**
- Only purchase transactions can be cancelled
- Refunds are always 100% of purchase amount
- Item is restored to 'active' status after refund

### 10. Inventory Management

**Location:** `src/models/AuctionStore.ts`, `src/db/queries.ts`

**Implementation:**

Inventory tracks items purchased by users:

- **Inventory Creation**: Created when item is purchased
- **User Inventory**: Users can view their purchased items
- **Transaction Link**: Linked to transaction that created it

**Key Code:**

```typescript
// Get user inventory
getInventoryByUser: flow(function* (userId: number) {
  const inventory = yield queries.getInventoryByUser(userId)
  // Returns items owned by user
})

// Create inventory entry (called after purchase)
createInventoryEntry: flow(function* (data: {
  userId: number
  itemId: number
  transactionId: number
  quantity: number
}) {
  const inventory = yield queries.createInventoryEntry(data)
  return inventory
})
```

**Database Queries:**
- `getInventoryByUser()` - Gets user's inventory
- `createInventoryEntry()` - Creates inventory entry
- `getInventoryByItem()` - Gets inventory entries for an item

### 11. Session Management

**Location:** `src/models/AuctionStore.ts`, `src/db/queries.ts`

**Implementation:**

Sessions track deterministic test sessions for AI agent experiments:

- **Session Creation**: Creates session with seed for determinism
- **Session Tracking**: Links bids and transactions to sessions
- **Deterministic Outcomes**: Uses seed for reproducible results

**Key Code:**

```typescript
// Create session
createSession: flow(function* (data: {
  sessionId: string
  userId?: number
  seed: number
  transactionsSucceed?: boolean
}) {
  const session = yield queries.createSession({
    sessionId: data.sessionId,
    userId: data.userId,
    seed: data.seed,
    transactionsSucceed: data.transactionsSucceed !== undefined ? data.transactionsSucceed : true,
  })
  
  self.currentSession = session
  return session
})
```

**Database Queries:**
- `createSession()` - Creates a new session
- `getSessionById()` - Gets session by session ID
- `getSessionsByUserId()` - Gets sessions for a user
- `endSession()` - Ends a session

## State Management

### MobX-State-Tree Stores

**Location:** `src/models/`

**Stores:**
- **AuctionStore**: Manages items, bids, transactions, inventory
- **UserStore**: Manages user authentication and profiles
- **UIStore**: Manages UI state (theme, navigation)

**Key Models:**
- `Item` - Item model with computed views (isAuction, isBuyNow, timeRemaining)
- `Bid` - Bid model with outcome tracking
- `Transaction` - Transaction model with status tracking
- `Payment` - Payment model with status tracking

## Database Layer

### Drizzle ORM

**Location:** `src/db/`

**Key Files:**
- `schema.ts` - Database schema definitions
- `queries.ts` - Read operations
- `mutations.ts` - Write operations (data loading)
- `client.ts` - Database client setup
- `migrations/` - Database migrations

**Query Pattern:**
All queries are wrapped with error handling:
```typescript
const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F => (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
  try {
    return await fn(...args)
  } catch (error) {
    console.error(`Error in ${name}:`, error)
    throw new Error(`${name}: ${error.message}`)
  }
}) as F
```

## UI Components

**Location:** `src/components/`

**Key Components:**
- `ItemCard` - Displays item in browse/search results
- `BidForm` - Form for placing bids
- `PaymentForm` - Form for payment processing
- `AuctionTimer` - Displays auction countdown
- `Glassmorphic` - Glassmorphic container component
- `AnimatedBackground` - Animated background component

## Utilities

**Location:** `src/utils/`

**Key Utilities:**
- `deeplinkHandler.ts` - Deep link handling
- `formatCurrency.ts` - Currency formatting
- `formatDate.ts` - Date formatting
- `validation.ts` - Input validation

## Testing

**Location:** `src/__tests__/`

**Test Coverage:**
- Unit tests for stores (`store-views.test.ts`, `auction-store.test.ts`)
- Unit tests for queries (`queries.test.ts`)
- Unit tests for mutations (`mutations.test.ts`)
- Integration tests for workflows

## Related Documentation

- [Database Schema](./database.md)
- [Data Generation](./data.md)
- [Feature Scope](./feature-scope.md)

