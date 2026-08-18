// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Categories table - Fixed categories: Electronics, Books, Fashion, Home, Toys
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(), // 'electronics', 'books', 'fashion', 'home', 'toys'
    name: text('name').notNull().unique(), // 'Electronics', 'Books', 'Fashion', 'Home', 'Toys'
    description: text('description'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_categories_code').on(table.code)],
)

// Users table - Users can be both buyers and sellers
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    email: text('email'),
    name: text('name'),
    password: text('password'), // Password for authentication (plain text for demo)
    sellerRating: real('seller_rating').default(0), // Seller rating (0-5)
    totalSales: integer('total_sales').default(0),
    totalItemsListed: integer('total_items_listed').default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_users_username').on(table.username)],
)

// Items table - Core table for auction items
export const items = sqliteTable(
  'items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    categoryId: integer('category_id')
      .references(() => categories.id)
      .notNull(),
    sellerId: integer('seller_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    price: real('price').notNull(), // Buy-now price or starting bid
    auctionFlag: integer('auction_flag').notNull().default(0), // 1 = auction, 0 = buy-now
    // Auction-specific fields
    currentBid: real('current_bid'), // Current highest bid
    startingBid: real('starting_bid'), // Starting bid amount
    bidIncrement: real('bid_increment').default(1.0), // Minimum bid increment
    endTime: integer('end_time'), // Unix timestamp for auction end
    // Item status - enum: 'active', 'sold', 'cancelled', 'expired'
    status: text('status').default('active'),
    expiresIn: text('expires_in'), // Relative expiration time (e.g. "2 days")
    expired: integer('expired', { mode: 'boolean' }).default(false),
    quantity: integer('quantity').default(1), // Inventory quantity
    bidCount: integer('bid_count').default(0), // Number of bids on this item
    imageUrl: text('image_url'), // Base64 image data or file path
    // Timestamps
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    soldAt: text('sold_at'), // When item was sold
  },
  table => [
    index('idx_items_category').on(table.categoryId),
    index('idx_items_seller').on(table.sellerId),
    index('idx_items_status').on(table.status),
    index('idx_items_auction_flag').on(table.auctionFlag),
    index('idx_items_end_time').on(table.endTime),
  ],
)

// Sessions table - For deterministic test sessions (F2)
export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').notNull().unique(),
    userId: integer('user_id').references(() => users.id),
    seed: integer('seed').notNull(), // Seed for deterministic randomness
    transactionsSucceed: integer('transactions_succeed').default(1), // 1 = succeed, 0 = fail
    // Status - enum: 'active', 'ended'
    status: text('status').default('active'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    endedAt: text('ended_at'),
    metadata: text('metadata'), // JSON for additional session data
  },
  table => [
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_status').on(table.status),
    index('idx_sessions_seed').on(table.seed),
  ],
)

// Bids table - Tracks all bids on auction items (F5)
export const bids = sqliteTable(
  'bids',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').references(() => sessions.id),
    itemId: integer('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    bidAmount: real('bid_amount').notNull(),
    // Outcome - enum: 'won', 'lost', 'pending', 'outbid' or NULL
    outcome: text('outcome'),
    // isWinning - boolean: 1 if this is the current winning bid
    isWinning: integer('is_winning', { mode: 'boolean' }).default(false),
    bidTime: integer('bid_time'), // Unix timestamp for when bid was placed
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    // Deterministic outcome metadata
    deterministicSeed: integer('deterministic_seed'), // Seed used for outcome
  },
  table => [
    index('idx_bids_item').on(table.itemId),
    index('idx_bids_user').on(table.userId),
    index('idx_bids_session').on(table.sessionId),
    index('idx_bids_outcome').on(table.outcome),
  ],
)

// Transactions table - Tracks purchases, sales, refunds (F8, F10)
export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').references(() => sessions.id),
    // Transaction type - enum: 'purchase', 'bid_win', 'listing', 'sale', 'refund'
    transactionType: text('transaction_type').notNull(),
    itemId: integer('item_id').references(() => items.id),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(), // Buyer user_id
    sellerId: integer('seller_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    bidId: integer('bid_id').references(() => bids.id), // If transaction from a bid
    amount: real('amount').notNull(),
    quantity: integer('quantity').default(1),
    // Status - enum: 'completed', 'pending', 'cancelled', 'refunded'
    status: text('status').default('completed'),
    // Payment status - enum: 'pending', 'success', 'failed'
    paymentStatus: text('payment_status').default('pending'),
    paymentMethod: text('payment_method'), // 'credit_card', 'mock_card'
    paymentCardNumber: text('payment_card_number'), // Last 4 digits or mock card
    failureReason: text('failure_reason'), // For failed payments
    refundAmount: real('refund_amount').default(0),
    refundedAt: text('refunded_at'),
    transactionDate: text('transaction_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    metadata: text('metadata'), // JSON for additional transaction data
  },
  table => [
    index('idx_transactions_user').on(table.userId),
    index('idx_transactions_item').on(table.itemId),
    index('idx_transactions_session').on(table.sessionId),
    index('idx_transactions_type').on(table.transactionType),
    index('idx_transactions_status').on(table.status),
  ],
)

// Payments table - Mock payment processing (F9)
export const payments = sqliteTable(
  'payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transactionId: integer('transaction_id')
      .references(() => transactions.id)
      .notNull(),
    cardNumber: text('card_number').notNull(), // Full or masked card number
    cardType: text('card_type'), // 'visa', 'mastercard', 'mock'
    amount: real('amount').notNull(),
    // Status - enum: 'success', 'declined', 'pending'
    status: text('status').notNull(),
    failureReason: text('failure_reason'), // 'DECLINED', 'INSUFFICIENT_FUNDS', etc.
    processedAt: text('processed_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    // Deterministic payment outcome
    deterministicSeed: integer('deterministic_seed'), // Seed for deterministic success/failure
  },
  table => [
    index('idx_payments_transaction').on(table.transactionId),
    index('idx_payments_status').on(table.status),
    index('idx_payments_card').on(table.cardNumber),
  ],
)

// Mock Cards table - For deterministic payment success/failure (F9)
export const mockCards = sqliteTable('mock_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardNumber: text('card_number').notNull().unique(), // e.g., '4242 4242 4242 4242'
  cardType: text('card_type').notNull(), // 'visa', 'mastercard', 'mock'
  alwaysSucceeds: integer('always_succeeds').default(1), // 1 = always succeeds, 0 = always fails
  failureReason: text('failure_reason'), // If always fails, reason like 'DECLINED'
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// User Payment Methods table - Stores user's saved cards
export const userPaymentMethods = sqliteTable(
  'user_payment_methods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    cardType: text('card_type').notNull(),
    cardNumber: text('card_number').notNull(),
    expiry: text('expiry').notNull(),
    cardHolderName: text('card_holder_name').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_user_payment_methods_user').on(table.userId)],
)

// Inventory table - Tracks user inventory (items they've purchased)
export const inventory = sqliteTable(
  'inventory',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    itemId: integer('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    transactionId: integer('transaction_id').references(() => transactions.id),
    quantity: integer('quantity').default(1),
    acquiredAt: text('acquired_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [
    index('idx_inventory_user').on(table.userId),
    index('idx_inventory_item').on(table.itemId),
  ],
)

// Listings table - Tracks item listings by users
export const listings = sqliteTable(
  'listings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id').references(() => sessions.id),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    itemId: integer('item_id')
      .references(() => items.id)
      .notNull(),
    listPrice: real('list_price').notNull(),
    listDate: text('list_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    // Status - enum: 'active', 'sold', 'cancelled', 'expired'
    status: text('status').default('active'),
  },
  table => [index('idx_listings_user').on(table.userId)],
)

// System Config table - For app configuration
export const systemConfig = sqliteTable('system_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  dataType: text('data_type'),
  category: text('category'),
  description: text('description'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Addresses table - Stores user addresses
export const addresses = sqliteTable(
  'addresses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    street: text('street').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    zipCode: text('zip_code').notNull(),
    country: text('country').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_addresses_user').on(table.userId)],
)
