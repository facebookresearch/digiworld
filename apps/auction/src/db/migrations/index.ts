import { executeStatements } from './execute-statements'

export const createTables = [
  // Categories table - Fixed categories: Electronics, Books, Fashion, Home, Toys
  `CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Users table - Users can be both buyers and sellers
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
    name TEXT,
    password TEXT,
    seller_rating REAL DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_items_listed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Items table - Core table for auction items
  `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    auction_flag INTEGER NOT NULL DEFAULT 0,
    current_bid REAL,
    starting_bid REAL,
    bid_increment REAL DEFAULT 1.0,
    end_time INTEGER,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_in TEXT,
    expired INTEGER DEFAULT 0 CHECK(expired IN (0, 1)),
    quantity INTEGER DEFAULT 1 CHECK(quantity >= 0),
    bid_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    sold_at TEXT,
    CHECK (auction_flag = 0 OR (starting_bid IS NOT NULL)),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE RESTRICT
  )`,

  // Sessions table - For deterministic test sessions (F2)
  `CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    seed INTEGER NOT NULL,
    transactions_succeed INTEGER DEFAULT 1 CHECK(transactions_succeed IN (0, 1)),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  ended_at TEXT,
    metadata TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Bids table - Tracks all bids on auction items (F5)
  `CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    item_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
    bid_amount REAL NOT NULL CHECK(bid_amount > 0),
    outcome TEXT CHECK(outcome IN ('won', 'lost', 'pending', 'outbid') OR outcome IS NULL),
    is_winning INTEGER DEFAULT 0 CHECK(is_winning IN (0, 1)),
    bid_time INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deterministic_seed INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Transactions table - Tracks purchases, sales, refunds (F8, F10)
  `CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase', 'bid_win', 'listing', 'sale', 'refund')),
    item_id INTEGER,
  user_id INTEGER NOT NULL,
    seller_id INTEGER,
    bid_id INTEGER,
    amount REAL NOT NULL CHECK(amount >= 0),
    quantity INTEGER DEFAULT 1 CHECK(quantity > 0),
    status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'cancelled', 'refunded')),
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'success', 'failed')),
    payment_method TEXT,
    payment_card_number TEXT,
    failure_reason TEXT,
    refund_amount REAL DEFAULT 0 CHECK(refund_amount = 0 OR refund_amount = amount),
    refunded_at TEXT,
    transaction_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    metadata TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY(bid_id) REFERENCES bids(id)
  )`,

  // Payments table - Mock payment processing (F9)
  `CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    card_number TEXT NOT NULL,
    card_type TEXT,
  amount REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'declined', 'pending')),
    failure_reason TEXT,
    processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deterministic_seed INTEGER,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
  )`,

  // Mock Cards table - For deterministic payment success/failure (F9)
  `CREATE TABLE IF NOT EXISTS mock_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_number TEXT NOT NULL UNIQUE,
    card_type TEXT NOT NULL,
    always_succeeds INTEGER DEFAULT 1 CHECK(always_succeeds IN (0, 1)),
  failure_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // User Payment Methods table - Stores user's saved cards
  `CREATE TABLE IF NOT EXISTS user_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_type TEXT NOT NULL,
    card_number TEXT NOT NULL,
    expiry TEXT NOT NULL,
    card_holder_name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Inventory table - Tracks user inventory (items they've purchased)
  `CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    transaction_id INTEGER,
    quantity INTEGER DEFAULT 1,
    acquired_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
  )`,

  // Listings table - Tracks item listings by users
  `CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    list_price REAL NOT NULL,
    list_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled', 'expired')),
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  )`,

  // System Config table - For app configuration
  `CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
    data_type TEXT,
    category TEXT,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // FTS5 Virtual Table for full-text search on items
  // Note: We manage this manually with triggers (not using content='items')
  // because we need to include category name which is computed from a join
  `CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    description,
    category
  )`,

  // Indexes for Categories
  `CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code)`,

  // Indexes for Users
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,

  // Indexes for Items
  `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id)`,
  `CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`,
  `CREATE INDEX IF NOT EXISTS idx_items_auction_flag ON items(auction_flag)`,
  `CREATE INDEX IF NOT EXISTS idx_items_end_time ON items(end_time)`,

  // Indexes for Sessions
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_seed ON sessions(seed)`,

  // Indexes for Bids
  `CREATE INDEX IF NOT EXISTS idx_bids_item ON bids(item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_session ON bids(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_outcome ON bids(outcome)`,

  // Indexes for Transactions
  `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_session ON transactions(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,

  // Indexes for Payments
  `CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_card ON payments(card_number)`,

  // Indexes for Inventory
  `CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id)`,

  // Indexes for Listings
  `CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id)`,

  // Composite indexes for common query patterns
  `CREATE INDEX IF NOT EXISTS idx_items_category_status ON items(category_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_items_auction_active ON items(auction_flag, status, end_time) WHERE auction_flag = 1`,
  `CREATE INDEX IF NOT EXISTS idx_bids_user_winning ON bids(user_id, is_winning) WHERE is_winning = 1`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, transaction_type)`,

  // Unique constraints to prevent duplicates
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_unique_active ON bids(item_id, user_id, bid_amount) WHERE outcome IS NULL OR outcome = 'pending'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_unique_active ON listings(item_id) WHERE status = 'active'`,

  // Triggers to keep items_fts in sync with items table
  // Only sync when searchable fields change (title, description, category_id)
  `CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, description, category)
    VALUES (
      new.id,
      new.title,
      new.description,
      (SELECT name FROM categories WHERE id = new.category_id)
    );
  END`,

  `CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE OF title, description, category_id ON items BEGIN
    UPDATE items_fts SET
      title = new.title,
      description = new.description,
      category = (SELECT name FROM categories WHERE id = new.category_id)
    WHERE rowid = new.id;
  END`,

  `CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
    DELETE FROM items_fts WHERE rowid = old.id;
  END`,

  // Triggers for updated_at timestamps
  `CREATE TRIGGER IF NOT EXISTS users_update_timestamp AFTER UPDATE ON users BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
    WHERE id = NEW.id;
  END`,

  `CREATE TRIGGER IF NOT EXISTS items_update_timestamp AFTER UPDATE ON items BEGIN
    UPDATE items SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
    WHERE id = NEW.id;
  END`,

  // Addresses table - Stores user addresses
  `CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL,
    is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
]

export async function runMigrations() {
  try {
    await executeStatements(createTables)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
