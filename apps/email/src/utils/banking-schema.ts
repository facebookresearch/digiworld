// Copyright (c) Meta Platforms, Inc. and affiliates.
// -- Users (to map to accounts and sessions, who's using the app)
// -- Accounts (to store different account types)
// -- Transactions (to track all financial activities)
// -- Billers (for mock bill payments)
// -- Payment Methods (for credit/debit cards)
// -- Beneficiaries (for future transfers to other users)
// -- Interest Rates (for time advancement feature)
// -- Logs (for traceability)

// -- Feature Group 1: Session Initialization

// -- Need a table to store agent sessions with fields: agent_id, session_id, seed, volatility, enable_interest, enable_recurring_bills
// -- Need to store starting balances
// -- Feature Group 2: Account Summary View

// -- Need an accounts table with fields: account_type, balance, account_number
// -- Limit to 3 account types for MVP: Checking, Savings, IRA, Deposits
// -- Allow up to 2 accounts per type
// -- Feature Group 3: Funds Transfer

// -- Need a transactions table to track transfers
// -- Fields needed: amount, from_account, to_account, new balances, timestamp, status
// -- Feature Group 4: Bill Payment

// -- Need a billers table for predefined billers
// -- Need to extend transactions table for bill payments
// -- Need payment methods table for credit cards
// -- Feature Group 5: Transaction History

// -- Transactions table should support filtering by action type
// -- Need to store: timestamp, action type, amount, accounts, result
// -- Feature Group 6: Time Advancement

// -- Need to track current date in the session
// -- Need interest rates table for different account types
// -- Need to handle recurring bills
// -- Feature Group 7: Logging and Traceability

// -- Need a logs table with fields: timestamp, agent_id, session_id, day, action, status, details
// -- Additional requirements:

// -- Payment methods for credit/debit cards
// -- Beneficiaries for future transfers

export const createTables = [
  // Users table - Stores basic user information
  // Needed for: Identifying who owns accounts and sessions
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT UNIQUE,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT
  )`,

  // Sessions table - Tracks simulation sessions with configuration
  // Needed for: Feature Group 1 - Session Initialization and Feature Group 6 - Time Advancement
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    seed INTEGER,
    volatility REAL DEFAULT 0.0,
    enable_interest INTEGER DEFAULT 0,
    enable_recurring_bills INTEGER DEFAULT 0,
    current_day INTEGER DEFAULT 0,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    current_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    status TEXT DEFAULT 'active', -- active, paused, completed
    ended_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Account types table - Defines types of accounts available
  // Needed for: Feature Group 2 - Account Summary View
  `CREATE TABLE IF NOT EXISTS account_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, -- checking, savings, ira, deposits
    name TEXT NOT NULL,
    description TEXT,
    max_accounts_per_user INTEGER DEFAULT 2,
    can_withdraw INTEGER DEFAULT 1 -- 1 if funds can be withdrawn, 0 if deposit-only
  )`,

  // Accounts table - Stores user accounts with balances
  // Needed for: Feature Group 2 - Account Summary View and Feature Group 3 - Funds Transfer
  `CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_type_id INTEGER NOT NULL,
    account_number TEXT NOT NULL UNIQUE,
    account_name TEXT,
    balance REAL NOT NULL DEFAULT 0.0,
    is_primary INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, frozen, closed
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(account_type_id) REFERENCES account_types(id)
  )`,

  // Interest rates table - Stores interest rates per account type
  // Needed for: Feature Group 6 - Time Advancement (interest calculation)
  `CREATE TABLE IF NOT EXISTS interest_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_type_id INTEGER NOT NULL,
    rate REAL NOT NULL, -- daily rate (e.g., 0.0005 for 0.05% per day)
    effective_date TEXT NOT NULL,
    end_date TEXT, -- null if current
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(account_type_id) REFERENCES account_types(id)
  )`,

  // Payment methods table - Stores credit/debit cards
  // Needed for: Feature Group 4 - Bill Payment (mock payment methods)
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_type TEXT NOT NULL, -- 'credit' or 'debit'
    last_four_digits TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    linked_account_id INTEGER NOT NULL,
    expiry_date TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, expired, cancelled
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(linked_account_id) REFERENCES accounts(id)
  )`,

  // Beneficiaries table - Stores recipients for fund transfers
  // Needed for: Future expansion of Feature Group 3 - Funds Transfer (to other users)
  `CREATE TABLE IF NOT EXISTS beneficiaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL,
    bank_name TEXT,
    nickname TEXT,
    status TEXT DEFAULT 'active', -- active, inactive
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    deleted_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Billers table - Defines predefined billers
  // Needed for: Feature Group 4 - Bill Payment
  `CREATE TABLE IF NOT EXISTS billers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, -- electricity, internet, water
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- utility, subscription, loan, etc.
    is_active INTEGER DEFAULT 1
  )`,

  // Bills table - Stores user bills
  // Needed for: Feature Group 4 - Bill Payment and Feature Group 6 - Time Advancement (recurring bills)
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    biller_id INTEGER NOT NULL,
    account_id INTEGER, -- default payment account
    amount REAL NOT NULL,
    due_day INTEGER, -- day of simulation when due
    is_recurring INTEGER DEFAULT 0,
    recurrence_interval INTEGER DEFAULT 30, -- days
    next_due_date TEXT,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(biller_id) REFERENCES billers(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  )`,

  // Transaction types table - Defines transaction categories
  // Needed for: Feature Group 5 - Transaction History (filtering)
  `CREATE TABLE IF NOT EXISTS transaction_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, -- transfer, bill_payment, interest, deposit
    name TEXT NOT NULL,
    description TEXT
  )`,

  // Transactions table - Records all financial transactions
  // Needed for: Feature Group 3 - Funds Transfer, Feature Group 4 - Bill Payment, and Feature Group 5 - Transaction History
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    transaction_type_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    from_account_id INTEGER, -- source account (null for deposits/interest)
    to_account_id INTEGER, -- destination account (null for bill payments)
    biller_id INTEGER, -- if bill payment
    bill_id INTEGER, -- linked bill if applicable
    amount REAL NOT NULL,
    balance_before REAL, -- balance of primary account involved
    balance_after REAL,
    reference_id TEXT, -- external reference (for bill payments)
    day INTEGER, -- simulation day
    status TEXT DEFAULT 'success', -- success, failed, pending
    error_code TEXT,
    error_message TEXT,
    metadata TEXT, -- JSON string for additional context
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(transaction_type_id) REFERENCES transaction_types(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
    FOREIGN KEY(to_account_id) REFERENCES accounts(id),
    FOREIGN KEY(biller_id) REFERENCES billers(id),
    FOREIGN KEY(bill_id) REFERENCES bills(id)
  )`,

  // Action logs table - Logs all agent actions
  // Needed for: Feature Group 7 - Logging and Traceability
  `CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    agent_id TEXT,
    user_id INTEGER NOT NULL,
    day INTEGER,
    action TEXT NOT NULL, -- view_balance, transfer, pay_bill, advance_time, etc.
    action_category TEXT, -- navigation, transaction, system
    status TEXT NOT NULL, -- success, error, warning
    details TEXT, -- JSON string with action-specific data
    error_code TEXT,
    error_message TEXT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,

  // Error codes table - Standardized error definitions
  // Needed for: Consistent error handling across the application
  `CREATE TABLE IF NOT EXISTS error_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- validation, insufficient_funds, system
    message TEXT NOT NULL,
    description TEXT
  )`,

  // System config table - System-wide settings
  // Needed for: Configurable system behavior
  `CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    data_type TEXT, -- string, integer, real, boolean, json
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`,

  // Notifications table - User notifications
  // Needed for: User feedback on transactions and system events
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_transaction_id INTEGER,
    related_bill_id INTEGER,
    related_account_id INTEGER,
    priority TEXT DEFAULT 'normal',
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    expires_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(related_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY(related_bill_id) REFERENCES bills(id),
    FOREIGN KEY(related_account_id) REFERENCES accounts(id)
  )`,

  // Indexes for performance optimization
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_session ON transactions(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_action_logs_session ON action_logs(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON action_logs(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interest_rates_account_type ON interest_rates(account_type_id)`,
]

// export async function runMigrations() {
//   try {
//     await executeStatements(createTables)
//     return true
//   } catch (error) {
//     console.error('Migration failed:', error)
//     return false
//   }
// }
