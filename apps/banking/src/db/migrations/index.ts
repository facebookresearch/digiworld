import { executeStatements } from './execute-statements'

export const createTables = [
  // Account tier levels (relationship tiers)
  `CREATE TABLE IF NOT EXISTS account_tier_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL, -- everyday, clear_access, prime, premier, sapphire, private_client
  name TEXT NOT NULL,
  description TEXT,
  min_combined_balance REAL NOT NULL DEFAULT 0.0,
  max_accounts_per_type INTEGER NOT NULL DEFAULT 1,
  monthly_fee REAL DEFAULT 0.0,
  fee_waiver_balance REAL, -- Balance to waive monthly fee
  has_overdraft_protection INTEGER DEFAULT 0,
  has_interest_checking INTEGER DEFAULT 0,
  interest_rate_bonus REAL DEFAULT 0.0,
  free_wire_transfers INTEGER DEFAULT 0,
  free_cashiers_checks INTEGER DEFAULT 0,
  priority_support INTEGER DEFAULT 0,
  dedicated_banker INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
  )`,
  // Account types (checking, savings, etc.)
  `CREATE TABLE IF NOT EXISTS account_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_level_id INTEGER, -- Some account types require specific tiers
  code TEXT NOT NULL, -- checking, savings, money_market, cd, ira_traditional, ira_roth, credit_card
  name TEXT NOT NULL, -- "Everyday Checking", "Way2Save Savings", etc.
  category TEXT NOT NULL, -- deposit, credit, investment
  description TEXT,
  min_opening_balance REAL DEFAULT 0.0,
  max_balance REAL DEFAULT 50000.0,
  monthly_fee REAL DEFAULT 0.0,
  fee_waiver_min_balance REAL,
  fee_waiver_min_direct_deposit REAL,
  has_interest INTEGER DEFAULT 0,
  base_interest_rate REAL DEFAULT 0.0,
  has_debit_card INTEGER DEFAULT 0,
  has_checks INTEGER DEFAULT 0,
  allows_overdraft INTEGER DEFAULT 0,
  overdraft_fee REAL DEFAULT 0.0,
  overdraft_protection_transfer_fee REAL DEFAULT 0.0,
  min_balance_to_avoid_fee REAL DEFAULT 0.0,
  monthly_transaction_limit INTEGER, -- NULL = unlimited
  withdrawal_penalty_days INTEGER, -- For CDs
  early_withdrawal_penalty_rate REAL,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY(tier_level_id) REFERENCES account_tier_levels(id)
  )`,

  // Interest rate tiers (for savings accounts with tiered rates)
  `CREATE TABLE IF NOT EXISTS interest_rate_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_type_id INTEGER NOT NULL,
  min_balance REAL NOT NULL,
  max_balance REAL, -- NULL for top tier
  annual_percentage_yield REAL NOT NULL,
  effective_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  end_date TEXT, -- NULL if current
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY(account_type_id) REFERENCES account_types(id)
  )`,

  // Users (AI agents being tested)
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  email TEXT,
  account_tier_id INTEGER NOT NULL, -- Current relationship tier
  pin TEXT, -- For authentication simulation
  security_question TEXT,
  security_answer TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(account_tier_id) REFERENCES account_tier_levels(id)
  )`,

  // Sessions (test runs)
  `CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  seed INTEGER,
  volatility REAL DEFAULT 0.0,
  enable_interest INTEGER DEFAULT 0,
  enable_recurring_bills INTEGER DEFAULT 0,
  enable_monthly_fees INTEGER DEFAULT 0,
  current_day INTEGER DEFAULT 0,
  created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  current_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  status TEXT DEFAULT 'active', -- active, paused, completed
  ended_at TEXT,
  metadata TEXT, -- JSON for additional session config
  FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // User accounts
  `CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_type_id INTEGER NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT, -- User-defined nickname
  balance REAL NOT NULL DEFAULT 0.0,
  available_balance REAL NOT NULL DEFAULT 0.0, -- Balance minus pending transactions
  is_primary INTEGER DEFAULT 0, -- Primary account for user
  status TEXT DEFAULT 'active', -- active, frozen, closed, pending_approval
  opened_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  closed_date TEXT,
  last_statement_date TEXT,
  next_statement_date TEXT,
  overdraft_protection_enabled INTEGER DEFAULT 0,
  overdraft_protection_source_account_id INTEGER, -- Link to backup account
  linked_savings_account_id INTEGER, -- For auto-transfer features
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(account_type_id) REFERENCES account_types(id),
  FOREIGN KEY(overdraft_protection_source_account_id) REFERENCES accounts(id),
  FOREIGN KEY(linked_savings_account_id) REFERENCES accounts(id)
  )`,

  // Credit Cards
  `CREATE TABLE IF NOT EXISTS credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  linked_checking_account_id INTEGER, -- For autopay
  card_number TEXT NOT NULL UNIQUE,
  last_four_digits TEXT NOT NULL,
  cardholder_name TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  cvv TEXT NOT NULL,
  credit_limit REAL NOT NULL,
  current_balance REAL NOT NULL DEFAULT 0.0,
  available_credit REAL NOT NULL,
  apr REAL NOT NULL,
  annual_fee REAL DEFAULT 0.0,
  cash_advance_fee_percent REAL DEFAULT 5.0,
  late_payment_fee REAL DEFAULT 35.0,
  payment_due_day INTEGER NOT NULL, -- Day of month
  minimum_payment_percent REAL DEFAULT 2.0,
  statement_closing_day INTEGER NOT NULL,
  autopay_enabled INTEGER DEFAULT 0,
  autopay_amount TEXT DEFAULT 'minimum', -- minimum, statement_balance, current_balance
  status TEXT DEFAULT 'active',
  opened_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  last_payment_date TEXT,
  last_statement_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(linked_checking_account_id) REFERENCES accounts(id)
  )`,

  // Beneficiaries (for External Transfers)
  `CREATE TABLE IF NOT EXISTS beneficiaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL, -- checking, savings
  bank_name TEXT NOT NULL,
  bank_address TEXT,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  verification_status TEXT DEFAULT 'unverified', -- unverified, pending, verified, failed
  verification_method TEXT, -- micro_deposit, instant
  is_favorite INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Zelle Contacts (Quick Pay)
  `CREATE TABLE IF NOT EXISTS zelle_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  is_enrolled INTEGER DEFAULT 0, -- Whether contact is enrolled in Zelle
  is_favorite INTEGER DEFAULT 0,
  last_sent_amount REAL,
  last_sent_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  CHECK ((contact_email IS NOT NULL) OR (contact_phone IS NOT NULL))
  )`,

  // Billers (Predefined Payees)
  `CREATE TABLE IF NOT EXISTS billers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- NULL for predefined billers
  code TEXT NOT NULL UNIQUE, -- Unique code for predefined billers
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- utilities, telecom, insurance, loan, subscription, etc.
  subcategory TEXT, -- electricity, water, gas, internet, mobile, etc.
  description TEXT,
  logo_url TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  is_searchable INTEGER DEFAULT 1, -- Appears in search results
  search_success_rate REAL DEFAULT 1.0, -- For testing: probability of appearing
  requires_account_number INTEGER DEFAULT 1,
  accepts_credit_card INTEGER DEFAULT 1,
  accepts_bank_account INTEGER DEFAULT 1,
  min_payment_amount REAL DEFAULT 1.0,
  average_bill_amount REAL, -- For generating realistic bills
  payment_processing_days INTEGER DEFAULT 1, -- Days to process payment
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Bills
  `CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  biller_id INTEGER, -- NULL if user_biller
  account_id INTEGER, -- Default payment account
  bill_number TEXT,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  due_day INTEGER, -- Day of simulation when due
  is_recurring INTEGER DEFAULT 0,
  recurrence_interval INTEGER DEFAULT 30, -- Days between bills
  next_due_date TEXT,
  auto_pay_enabled INTEGER DEFAULT 0,
  auto_pay_account_id INTEGER,
  minimum_payment_amount REAL,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled, failed
  paid_date TEXT,
  paid_amount REAL,
  late_fee REAL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(biller_id) REFERENCES billers(id),
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(auto_pay_account_id) REFERENCES accounts(id)
  )`,

  // Transaction types
  `CREATE TABLE IF NOT EXISTS transaction_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE, -- transfer, bill_payment, zelle, atm_withdrawal, purchase, etc.
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- debit, credit, transfer
  description TEXT
  )`,

  // Transactions (all financial activity)
  `CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  transaction_type_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  from_account_id INTEGER,
  to_account_id INTEGER,
  biller_id INTEGER,
  bill_id INTEGER,
  beneficiary_id INTEGER,
  zelle_contact_id INTEGER,
  credit_card_id INTEGER,
  debit_card_id INTEGER,
  amount REAL NOT NULL,
  fee REAL DEFAULT 0.0, -- Transaction fees
  balance_before REAL,
  balance_after REAL,
  reference_id TEXT,
  confirmation_number TEXT,
  description TEXT,
  memo TEXT, -- User-entered memo
  day INTEGER, -- Simulation day
  transaction_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  posted_date TEXT, -- When transaction posts
  pending_until TEXT, -- For pending transactions
  status TEXT DEFAULT 'success', -- success, failed, pending, cancelled, reversed
  failure_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata TEXT, -- JSON for additional data
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  FOREIGN KEY(transaction_type_id) REFERENCES transaction_types(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(from_account_id) REFERENCES accounts(id),
  FOREIGN KEY(to_account_id) REFERENCES accounts(id),
  FOREIGN KEY(biller_id) REFERENCES billers(id),
  FOREIGN KEY(bill_id) REFERENCES bills(id),
  FOREIGN KEY(beneficiary_id) REFERENCES beneficiaries(id),
  FOREIGN KEY(zelle_contact_id) REFERENCES zelle_contacts(id),
  FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id)
  )`,

  // Scheduled transactions (future-dated payments)
  `CREATE TABLE IF NOT EXISTS scheduled_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  transaction_type_id INTEGER NOT NULL,
  from_account_id INTEGER,
  to_account_id INTEGER,
  biller_id INTEGER,
  beneficiary_id INTEGER,
  amount REAL NOT NULL,
  scheduled_date TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  recurrence_frequency TEXT, -- daily, weekly, biweekly, monthly, yearly
  recurrence_end_date TEXT,
  description TEXT,
  memo TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, processed, cancelled, failed
  processed_transaction_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(transaction_type_id) REFERENCES transaction_types(id),
  FOREIGN KEY(from_account_id) REFERENCES accounts(id),
  FOREIGN KEY(to_account_id) REFERENCES accounts(id),
  FOREIGN KEY(biller_id) REFERENCES billers(id),
  FOREIGN KEY(beneficiary_id) REFERENCES beneficiaries(id),
  FOREIGN KEY(processed_transaction_id) REFERENCES transactions(id)
  )`,

  // Error codes (standardized errors)
  `CREATE TABLE IF NOT EXISTS error_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- validation, insufficient_funds, limit_exceeded, system
  message TEXT NOT NULL,
  user_message TEXT, -- Friendly message for UI
  description TEXT,
  suggested_action TEXT
  )`,

  // System config (global settings)
  `CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  data_type TEXT, -- string, integer, real, boolean, json
  category TEXT, -- balance_limits, fees, features, time_simulation
  description TEXT,
  is_configurable INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER,
  notification_type TEXT NOT NULL, -- transaction, bill_due, low_balance, tier_upgrade, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_transaction_id INTEGER,
  related_bill_id INTEGER,
  related_account_id INTEGER,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  expires_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  FOREIGN KEY(related_transaction_id) REFERENCES transactions(id),
  FOREIGN KEY(related_bill_id) REFERENCES bills(id),
  FOREIGN KEY(related_account_id) REFERENCES accounts(id)
  )`,

  // Biller search
  `CREATE VIRTUAL TABLE IF NOT EXISTS billers_fts USING fts5(
  name,
  description,
  category,
  subcategory,
  content='billers',
  content_rowid='id'
  )`,

  // Users
  // Sessions
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(created_date)`,

  // Accounts
  `CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number)`,

  // Transactions
  `CREATE INDEX IF NOT EXISTS idx_transactions_session ON transactions(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)`,

  // Bills
  `CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_biller ON bills(biller_id)`,

  // Credit Cards
  `CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_cards_status ON credit_cards(status)`,

  // Beneficiaries
  `CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(status)`,

  // Zelle
  `CREATE INDEX IF NOT EXISTS idx_zelle_contacts_user ON zelle_contacts(user_id)`,

  // Scheduled Transactions
  `CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_user ON scheduled_transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_date ON scheduled_transactions(scheduled_date)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_status ON scheduled_transactions(status)`,

  // Notifications
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`,
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
