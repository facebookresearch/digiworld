// Copyright (c) Meta Platforms, Inc. and affiliates.
// Global Jest setup for the @andojo/auction package.
// 1. Creates an in-memory SQLite database using `better-sqlite3`.
// 2. Boots Drizzle ORM against that DB so production query code can run unmodified.
// 3. Runs auction schema DDL needed for the auction unit-tests.
// 4. Re-exports the DB instance & injects it via `jest.mock('@/db/index')`,
//    so all imports of `db`/`sqlite` inside production code point to the test DB.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

// Mock react-native-fs to avoid NativeEventEmitter issues
jest.mock('react-native-fs', () => ({
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  ExternalDirectoryPath: '/mock/external',
  DocumentDirectoryPath: '/mock/document',
  CachesDirectoryPath: '/mock/caches',
  TemporaryDirectoryPath: '/mock/temp',
  LibraryDirectoryPath: '/mock/library',
  MainBundlePath: '/mock/bundle',
}))

// Create memory database
const sqlite = new Database(':memory:')
// enforce FKs like in prod
sqlite.pragma('foreign_keys = ON')

// Auction schema DDL - matches migrations/index.ts
const ddl = `
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE users (
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
);

CREATE TABLE items (
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
);

CREATE TABLE sessions (
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
);

CREATE TABLE bids (
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
);

CREATE TABLE transactions (
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
);

CREATE TABLE payments (
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
);

CREATE TABLE mock_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_number TEXT NOT NULL UNIQUE,
  card_type TEXT NOT NULL,
  always_succeeds INTEGER DEFAULT 1 CHECK(always_succeeds IN (0, 1)),
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE user_payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  card_type TEXT NOT NULL,
  card_number TEXT NOT NULL,
  expiry TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  transaction_id INTEGER,
  quantity INTEGER DEFAULT 1,
  acquired_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE listings (
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
);

CREATE TABLE system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  data_type TEXT,
  category TEXT,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE addresses (
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
);

CREATE VIRTUAL TABLE items_fts USING fts5(
  title,
  description,
  category
);

CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_seller ON items(seller_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_auction_flag ON items(auction_flag);
CREATE INDEX idx_items_end_time ON items(end_time);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_seed ON sessions(seed);
CREATE INDEX idx_bids_item ON bids(item_id);
CREATE INDEX idx_bids_user ON bids(user_id);
CREATE INDEX idx_bids_session ON bids(session_id);
CREATE INDEX idx_bids_outcome ON bids(outcome);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_transactions_session ON transactions(session_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_card ON payments(card_number);
CREATE INDEX idx_inventory_user ON inventory(user_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);
CREATE INDEX idx_listings_user ON listings(user_id);
CREATE INDEX idx_items_category_status ON items(category_id, status);
CREATE INDEX idx_items_auction_active ON items(auction_flag, status, end_time) WHERE auction_flag = 1;
CREATE INDEX idx_bids_user_winning ON bids(user_id, is_winning) WHERE is_winning = 1;
CREATE INDEX idx_transactions_user_type ON transactions(user_id, transaction_type);
CREATE UNIQUE INDEX idx_bids_unique_active ON bids(item_id, user_id, bid_amount) WHERE outcome IS NULL OR outcome = 'pending';
CREATE UNIQUE INDEX idx_listings_unique_active ON listings(item_id) WHERE status = 'active';

CREATE TRIGGER items_fts_insert AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, description, category)
  VALUES (
    new.id,
    new.title,
    new.description,
    (SELECT name FROM categories WHERE id = new.category_id)
  );
END;

CREATE TRIGGER items_fts_update AFTER UPDATE OF title, description, category_id ON items BEGIN
  UPDATE items_fts SET
    title = new.title,
    description = new.description,
    category = (SELECT name FROM categories WHERE id = new.category_id)
  WHERE rowid = new.id;
END;

CREATE TRIGGER items_fts_delete AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.id;
END;

CREATE TRIGGER users_update_timestamp AFTER UPDATE ON users BEGIN
  UPDATE users SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER items_update_timestamp AFTER UPDATE ON items BEGIN
  UPDATE items SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
  WHERE id = NEW.id;
END;
`

// Execute all statements - handle triggers specially since they contain semicolons
// Split by END; followed by newline to handle triggers, then by regular semicolons
const statements: string[] = []
let currentStmt = ''
let inTrigger = false

for (const line of ddl.split('\n')) {
  const trimmed = line.trim()

  // Always add line to current statement (preserve formatting)
  if (currentStmt) {
    currentStmt += '\n' + line
  } else {
    currentStmt = line
  }

  // Check if we're starting a trigger
  if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
    inTrigger = true
  }

  // If we hit END; and we're in a trigger, that's the end of the statement
  if (inTrigger && trimmed === 'END;') {
    statements.push(currentStmt.trim())
    currentStmt = ''
    inTrigger = false
  } else if (!inTrigger && trimmed.endsWith(';')) {
    // Regular statement ending with semicolon (not in a trigger)
    statements.push(currentStmt.trim())
    currentStmt = ''
  }
}

// Add any remaining statement (shouldn't happen, but be safe)
if (currentStmt.trim()) {
  statements.push(currentStmt.trim())
}

// Execute all statements
for (const sql of statements) {
  if (sql) {
    try {
      sqlite.prepare(sql).run()
    } catch (error: any) {
      console.error('Failed to execute SQL:', sql.substring(0, 100), '...')
      throw error
    }
  }
}

// Boot Drizzle
const db = drizzle(sqlite)

// Provide the mock BEFORE tests import production code
jest.doMock('@/db/index', () => ({ db, sqlite }))

// Re-export for test files that may need to run raw SQL
export { db }

// Global helper to reset all tables before every test file runs
beforeEach(() => {
  const tables = [
    'inventory',
    'listings',
    'payments',
    'transactions',
    'bids',
    'sessions',
    'items',
    'mock_cards',
    'user_payment_methods',
    'addresses',
    'users',
    'categories',
    'system_config',
  ]
  for (const t of tables) {
    sqlite.prepare(`DELETE FROM ${t}`).run()
  }
  // Also clear FTS table
  sqlite.prepare(`DELETE FROM items_fts`).run()
})
