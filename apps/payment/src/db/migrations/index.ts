import { executeStatements } from './execute-statements'

const CREATE_TABLES = [
  // Create new tables
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    pin TEXT NOT NULL,
    pin_attempts INTEGER DEFAULT 0 NOT NULL,
    pin_locked_until TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    settings TEXT NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'active' NOT NULL,
    kyc_verified INTEGER DEFAULT 0 NOT NULL,
    daily_limit REAL DEFAULT 1000 NOT NULL,
    monthly_limit REAL DEFAULT 20000 NOT NULL
  )`,

  `CREATE TABLE wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    balance REAL DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    type TEXT DEFAULT 'personal' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    sender_wallet_id INTEGER NOT NULL,
    receiver_wallet_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    type TEXT NOT NULL,
    pin_verified INTEGER DEFAULT 0 NOT NULL,
    pin_verified_at TEXT,
    reference TEXT,
    description TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (sender_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    contact_user_id INTEGER NOT NULL,
    nickname TEXT,
    favorite INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, contact_user_id)
  )`,

  // Create indexes
  'CREATE INDEX idx_transactions_sender ON transactions (sender_wallet_id)',
  'CREATE INDEX idx_transactions_receiver ON transactions (receiver_wallet_id)',
  'CREATE INDEX idx_wallets_user ON wallets (user_id)',
  'CREATE INDEX idx_transactions_created ON transactions (created_at)',
  'CREATE INDEX idx_transactions_status ON transactions (status)',
  'CREATE INDEX idx_users_email ON users (email)',
  'CREATE INDEX idx_users_phone ON users (phone_number)',
  'CREATE INDEX idx_contacts_user ON contacts (user_id)',
  'CREATE INDEX idx_contacts_contact ON contacts (contact_user_id)',
  'CREATE INDEX idx_contacts_favorite ON contacts (user_id, favorite)',
  'CREATE INDEX idx_users_pin_locked ON users (pin_locked_until)',
]

export async function runMigrations() {
  try {
    await executeStatements(CREATE_TABLES)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
