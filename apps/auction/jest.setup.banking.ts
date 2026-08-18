/*
 * Global Jest setup for the @andojo/bank package.
 *
 * 1. Creates an in-memory SQLite database using `better-sqlite3`.
 * 2. Boots Drizzle ORM against that DB so production query code can run unmodified.
 * 3. Runs minimal DDL needed for the banking unit-tests.
 * 4. Re-exports the DB instance & injects it via `jest.mock('@/db/index')`,
 *    so all imports of `db`/`sqlite` inside production code point to the test DB.
 */
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

// // Mock @andojo/shared-mock-reader
// jest.mock('@andojo/shared-mock-reader', () => ({
//   createReadJSONFile: jest.fn(() => {
//     return jest.fn(filename => {
//       // Return mock data based on filename
//       const mockData = {
//         'mock-users.json': [
//           {
//             id: 1,
//             username: 'testuser',
//             password: 'password123',
//             accountTierId: 1,
//             createdAt: '2024-01-01T00:00:00.000Z',
//             updatedAt: '2024-01-01T00:00:00.000Z',
//           },
//         ],
//         'mock-account_tier_levels.json': [
//           {
//             id: 1,
//             code: 'everyday',
//             name: 'Everyday',
//             minCombinedBalance: 0,
//             maxAccountsPerType: 2,
//             monthlyFee: 0,
//             createdAt: '2024-01-01T00:00:00.000Z',
//           },
//         ],
//         'mock-account_types.json': [
//           {
//             id: 1,
//             code: 'checking',
//             name: 'Checking',
//             category: 'deposit',
//             minOpeningBalance: 0,
//             maxBalance: 50000,
//             monthlyFee: 0,
//             hasInterest: 0,
//             baseInterestRate: 0,
//             hasDebitCard: 1,
//             hasChecks: 1,
//             allowsOverdraft: 0,
//             isActive: 1,
//             sortOrder: 1,
//             createdAt: '2024-01-01T00:00:00.000Z',
//           },
//           {
//             id: 2,
//             code: 'savings',
//             name: 'Savings',
//             category: 'deposit',
//             minOpeningBalance: 0,
//             maxBalance: 100000,
//             monthlyFee: 0,
//             hasInterest: 1,
//             baseInterestRate: 0.01,
//             hasDebitCard: 0,
//             hasChecks: 0,
//             allowsOverdraft: 0,
//             isActive: 1,
//             sortOrder: 2,
//             createdAt: '2024-01-01T00:00:00.000Z',
//           },
//         ],
//         'mock-accounts.json': [
//           {
//             id: 1,
//             userId: 1,
//             accountTypeId: 1,
//             accountNumber: '1234567890',
//             accountName: 'Primary Checking',
//             balance: 2000,
//             availableBalance: 2000,
//             isPrimary: 1,
//             status: 'active',
//             openedDate: '2024-01-01T00:00:00.000Z',
//             createdAt: '2024-01-01T00:00:00.000Z',
//             updatedAt: '2024-01-01T00:00:00.000Z',
//           },
//           {
//             id: 2,
//             userId: 1,
//             accountTypeId: 2,
//             accountNumber: '0987654321',
//             accountName: 'Primary Savings',
//             balance: 5000,
//             availableBalance: 5000,
//             isPrimary: 1,
//             status: 'active',
//             openedDate: '2024-01-01T00:00:00.000Z',
//             createdAt: '2024-01-01T00:00:00.000Z',
//             updatedAt: '2024-01-01T00:00:00.000Z',
//           },
//         ],
//         'mock-credit_cards.json': [],
//         'mock-beneficiaries.json': [],
//         'mock-zelle_contacts.json': [],
//         'mock-billers.json': [
//           {
//             id: 1,
//             code: 'ELECTRIC',
//             name: 'Electric Company',
//             nameNormalized: 'electric company',
//             category: 'utilities',
//             subcategory: 'electricity',
//             description: 'Electric utility company',
//             isSearchable: 1,
//             searchSuccessRate: 1.0,
//             requiresAccountNumber: 1,
//             requiresRoutingNumber: 0,
//             acceptsCreditCard: 1,
//             acceptsDebitCard: 1,
//             acceptsBankAccount: 1,
//             minPaymentAmount: 1.0,
//             maxPaymentAmount: 10000,
//             averageBillAmount: 150,
//             paymentProcessingDays: 1,
//             isActive: 1,
//             createdAt: '2024-01-01T00:00:00.000Z',
//           },
//         ],
//         'mock-user_billers.json': [],
//         'mock-bills.json': [],
//         'mock-transaction_types.json': [
//           {
//             id: 1,
//             code: 'deposit',
//             name: 'Deposit',
//             category: 'credit',
//             description: 'Money deposited into account',
//           },
//           {
//             id: 2,
//             code: 'withdrawal',
//             name: 'Withdrawal',
//             category: 'debit',
//             description: 'Money withdrawn from account',
//           },
//           {
//             id: 3,
//             code: 'transfer',
//             name: 'Transfer',
//             category: 'transfer',
//             description: 'Transfer between accounts',
//           },
//           {
//             id: 4,
//             code: 'bill_payment',
//             name: 'Bill Payment',
//             category: 'debit',
//             description: 'Payment to biller',
//           },
//         ],
//         'mock-transactions.json': [],
//         'mock-scheduled_transactions.json': [],
//         'mock-notifications.json': [],
//       }

//       return Promise.resolve(mockData[filename] || [])
//     })
//   }),
// }))

// Create memory database
const sqlite = new Database(':memory:')
// enforce FKs like in prod
sqlite.pragma('foreign_keys = ON')

// Minimal banking schema – ONLY the columns referenced in src/db/queries.ts
const ddl = `
CREATE TABLE account_tier_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  min_combined_balance REAL NOT NULL DEFAULT 0.0,
  max_accounts_per_type INTEGER NOT NULL DEFAULT 1,
  monthly_fee REAL DEFAULT 0.0,
  fee_waiver_balance REAL,
  has_overdraft_protection INTEGER DEFAULT 0,
  has_interest_checking INTEGER DEFAULT 0,
  interest_rate_bonus REAL DEFAULT 0.0,
  free_wire_transfers INTEGER DEFAULT 0,
  free_cashiers_checks INTEGER DEFAULT 0,
  priority_support INTEGER DEFAULT 0,
  dedicated_banker INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE account_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_level_id INTEGER,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
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
  monthly_transaction_limit INTEGER,
  withdrawal_penalty_days INTEGER,
  early_withdrawal_penalty_rate REAL,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(tier_level_id) REFERENCES account_tier_levels(id)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  account_tier_id INTEGER NOT NULL,
  pin TEXT,
  security_question TEXT,
  security_answer TEXT,
  is_zelle_user INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(account_tier_id) REFERENCES account_tier_levels(id)
);

CREATE TABLE sessions (
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
  status TEXT DEFAULT 'active',
  ended_at TEXT,
  metadata TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_type_id INTEGER NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT,
  balance REAL NOT NULL DEFAULT 0.0,
  available_balance REAL NOT NULL DEFAULT 0.0,
  is_primary INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  opened_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  closed_date TEXT,
  last_statement_date TEXT,
  next_statement_date TEXT,
  overdraft_protection_enabled INTEGER DEFAULT 0,
  overdraft_protection_source_account_id INTEGER,
  linked_savings_account_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(account_type_id) REFERENCES account_types(id),
  FOREIGN KEY(overdraft_protection_source_account_id) REFERENCES accounts(id),
  FOREIGN KEY(linked_savings_account_id) REFERENCES accounts(id)
);

CREATE TABLE credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  linked_checking_account_id INTEGER,
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
  payment_due_day INTEGER NOT NULL,
  minimum_payment_percent REAL DEFAULT 2.0,
  statement_closing_day INTEGER NOT NULL,
  autopay_enabled INTEGER DEFAULT 0,
  autopay_amount TEXT DEFAULT 'minimum',
  status TEXT DEFAULT 'active',
  opened_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  last_payment_date TEXT,
  last_statement_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(linked_checking_account_id) REFERENCES accounts(id)
);

CREATE TABLE beneficiaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_number TEXT NOT NULL,
  account_type TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_address TEXT,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  verification_status TEXT DEFAULT 'unverified',
  verification_method TEXT,
  is_favorite INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE zelle_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  is_enrolled INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  last_sent_amount REAL,
  last_sent_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE billers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  is_searchable INTEGER DEFAULT 1,
  search_success_rate REAL DEFAULT 1.0,
  requires_account_number INTEGER DEFAULT 1,
  requires_routing_number INTEGER DEFAULT 0,
  accepts_credit_card INTEGER DEFAULT 1,
  accepts_debit_card INTEGER DEFAULT 1,
  accepts_bank_account INTEGER DEFAULT 1,
  min_payment_amount REAL DEFAULT 1.0,
  max_payment_amount REAL,
  average_bill_amount REAL,
  payment_processing_days INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE user_billers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  biller_name TEXT NOT NULL,
  biller_account_number TEXT NOT NULL,
  biller_routing_number TEXT,
  biller_address TEXT NOT NULL,
  biller_phone TEXT NOT NULL,
  nickname TEXT,
  category TEXT,
  notes TEXT,
  default_payment_account_id INTEGER,
  verification_status TEXT DEFAULT 'unverified',
  verification_warnings TEXT,
  last_payment_date TEXT,
  is_favorite INTEGER DEFAULT 0,
  autopay_enabled INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(default_payment_account_id) REFERENCES accounts(id)
);

CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  biller_id INTEGER,
  account_id INTEGER,
  bill_number TEXT,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  due_day INTEGER,
  is_recurring INTEGER DEFAULT 0,
  recurrence_interval INTEGER DEFAULT 30,
  next_due_date TEXT,
  auto_pay_enabled INTEGER DEFAULT 0,
  auto_pay_account_id INTEGER,
  minimum_payment_amount REAL,
  status TEXT DEFAULT 'pending',
  paid_date TEXT,
  paid_amount REAL,
  late_fee REAL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(biller_id) REFERENCES billers(id),
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(auto_pay_account_id) REFERENCES accounts(id)
);

CREATE TABLE transaction_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT
);

CREATE TABLE transactions (
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
  amount REAL NOT NULL,
  fee REAL DEFAULT 0.0,
  balance_before REAL,
  balance_after REAL,
  reference_id TEXT,
  confirmation_number TEXT,
  description TEXT,
  memo TEXT,
  day INTEGER,
  transaction_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  posted_date TEXT,
  pending_until TEXT,
  status TEXT DEFAULT 'success',
  failure_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
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
);

CREATE TABLE scheduled_transactions (
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
  recurrence_frequency TEXT,
  recurrence_end_date TEXT,
  description TEXT,
  memo TEXT,
  status TEXT DEFAULT 'scheduled',
  processed_transaction_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(transaction_type_id) REFERENCES transaction_types(id),
  FOREIGN KEY(from_account_id) REFERENCES accounts(id),
  FOREIGN KEY(to_account_id) REFERENCES accounts(id),
  FOREIGN KEY(biller_id) REFERENCES billers(id),
  FOREIGN KEY(beneficiary_id) REFERENCES beneficiaries(id),
  FOREIGN KEY(processed_transaction_id) REFERENCES transactions(id)
);

CREATE TABLE notifications (
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
);
`

// Execute all statements (split on ';\n') – ignore empty strings after split
for (const stmt of ddl.split(/;\s*\n/)) {
  const sql = stmt.trim()
  if (sql) {
    sqlite.prepare(sql).run()
  }
}

// 3️⃣  Boot Drizzle
const db = drizzle(sqlite)

// 4️⃣  Provide the mock BEFORE tests import production code
jest.doMock('@/db/index', () => ({ db, sqlite }))

// Re-export for test files that may need to run raw SQL
export { db }

// 5️⃣  Global helper to reset all tables before every test file runs
beforeEach(() => {
  const tables = [
    'notifications',
    'scheduled_transactions',
    'transactions',
    'bills',
    'user_billers',
    'billers',
    'zelle_contacts',
    'beneficiaries',
    'credit_cards',
    'accounts',
    'sessions',
    'users',
    'account_types',
    'account_tier_levels',
    'transaction_types',
  ]
  for (const t of tables) {
    sqlite.prepare(`DELETE FROM ${t}`).run()
  }
})
