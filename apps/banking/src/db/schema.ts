// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Account tier levels (relationship tiers)
export const accountTierLevels = sqliteTable('account_tier_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  minCombinedBalance: real('min_combined_balance').default(0).notNull(),
  maxAccountsPerType: integer('max_accounts_per_type').default(1).notNull(),
  monthlyFee: real('monthly_fee').default(0),
  feeWaiverBalance: real('fee_waiver_balance'),
  hasOverdraftProtection: integer('has_overdraft_protection').default(0),
  hasInterestChecking: integer('has_interest_checking').default(0),
  interestRateBonus: real('interest_rate_bonus').default(0),
  freeWireTransfers: integer('free_wire_transfers').default(0),
  freeCashiersChecks: integer('free_cashiers_checks').default(0),
  prioritySupport: integer('priority_support').default(0),
  dedicatedBanker: integer('dedicated_banker').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Account types
export const accountTypes = sqliteTable('account_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tierLevelId: integer('tier_level_id').references(() => accountTierLevels.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  minOpeningBalance: real('min_opening_balance').default(0),
  maxBalance: real('max_balance').default(50000),
  monthlyFee: real('monthly_fee').default(0),
  feeWaiverMinBalance: real('fee_waiver_min_balance'),
  feeWaiverMinDirectDeposit: real('fee_waiver_min_direct_deposit'),
  hasInterest: integer('has_interest').default(0),
  baseInterestRate: real('base_interest_rate').default(0),
  hasDebitCard: integer('has_debit_card').default(0),
  hasChecks: integer('has_checks').default(0),
  allowsOverdraft: integer('allows_overdraft').default(0),
  overdraftFee: real('overdraft_fee').default(0),
  overdraftProtectionTransferFee: real(
    'overdraft_protection_transfer_fee',
  ).default(0),
  minBalanceToAvoidFee: real('min_balance_to_avoid_fee').default(0),
  monthlyTransactionLimit: integer('monthly_transaction_limit'),
  withdrawalPenaltyDays: integer('withdrawal_penalty_days'),
  earlyWithdrawalPenaltyRate: real('early_withdrawal_penalty_rate'),
  isActive: integer('is_active').default(1),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Interest rate tiers (for savings accounts with tiered rates)
export const interestRateTiers = sqliteTable('interest_rate_tiers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountTypeId: integer('account_type_id')
    .references(() => accountTypes.id)
    .notNull(),
  minBalance: real('min_balance').notNull(),
  maxBalance: real('max_balance'),
  annualPercentageYield: real('annual_percentage_yield').notNull(),
  effectiveDate: text('effective_date')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  endDate: text('end_date'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Users
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name'),
  phoneNumber: text('phone_number').notNull(),
  email: text('email'),
  accountTierId: integer('account_tier_id')
    .references(() => accountTierLevels.id)
    .notNull(),
  pin: text('pin'),
  securityQuestion: text('security_question'),
  securityAnswer: text('security_answer'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  deletedAt: text('deleted_at'),
})

// Sessions
export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').notNull().unique(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    seed: integer('seed'),
    volatility: real('volatility').default(0),
    enableInterest: integer('enable_interest').default(0),
    enableRecurringBills: integer('enable_recurring_bills').default(0),
    enableMonthlyFees: integer('enable_monthly_fees').default(0),
    currentDay: integer('current_day').default(0),
    createdDate: text('created_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    currentDate: text('current_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    status: text('status').default('active'),
    endedAt: text('ended_at'),
    metadata: text('metadata'),
  },
  table => [
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_status').on(table.status),
  ],
)

// Accounts
export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    accountTypeId: integer('account_type_id')
      .references(() => accountTypes.id)
      .notNull(),
    accountNumber: text('account_number').notNull().unique(),
    accountName: text('account_name'),
    balance: real('balance').default(0).notNull(),
    availableBalance: real('available_balance').default(0).notNull(),
    isPrimary: integer('is_primary').default(0),
    status: text('status').default('active'),
    openedDate: text('opened_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    closedDate: text('closed_date'),
    lastStatementDate: text('last_statement_date'),
    nextStatementDate: text('next_statement_date'),
    overdraftProtectionEnabled: integer('overdraft_protection_enabled').default(
      0,
    ),
    overdraftProtectionSourceAccountId: integer(
      'overdraft_protection_source_account_id',
    ).references((): any => accounts.id),
    linkedSavingsAccountId: integer('linked_savings_account_id').references(
      (): any => accounts.id,
    ),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    deletedAt: text('deleted_at'),
  },
  table => [
    index('idx_accounts_user').on(table.userId),
    index('idx_accounts_type').on(table.accountTypeId),
    index('idx_accounts_status').on(table.status),
  ],
)

export const creditCards = sqliteTable(
  'credit_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    linkedCheckingAccountId: integer('linked_checking_account_id').references(
      () => accounts.id,
    ),
    cardNumber: text('card_number').notNull().unique(),
    lastFourDigits: text('last_four_digits').notNull(),
    cardholderName: text('cardholder_name').notNull(),
    expiryMonth: integer('expiry_month').notNull(),
    expiryYear: integer('expiry_year').notNull(),
    cvv: text('cvv').notNull(),
    creditLimit: real('credit_limit').notNull(),
    currentBalance: real('current_balance').default(0).notNull(),
    availableCredit: real('available_credit').notNull(),
    apr: real('apr').notNull(),
    annualFee: real('annual_fee').default(0),
    cashAdvanceFeePercent: real('cash_advance_fee_percent').default(5.0),
    latePaymentFee: real('late_payment_fee').default(35.0),
    paymentDueDay: integer('payment_due_day').notNull(),
    minimumPaymentPercent: real('minimum_payment_percent').default(2.0),
    statementClosingDay: integer('statement_closing_day').notNull(),
    autopayEnabled: integer('autopay_enabled').default(0),
    autopayAmount: text('autopay_amount').default('minimum'),
    status: text('status').default('active'),
    openedDate: text('opened_date')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    lastPaymentDate: text('last_payment_date'),
    lastStatementDate: text('last_statement_date'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_credit_cards_user').on(table.userId)],
)

// Beneficiaries (for External Transfers)
export const beneficiaries = sqliteTable(
  'beneficiaries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    name: text('name').notNull(),
    accountNumber: text('account_number').notNull(),
    accountType: text('account_type').notNull(),
    bankName: text('bank_name').notNull(),
    bankAddress: text('bank_address'),
    nickname: text('nickname'),
    email: text('email'),
    phone: text('phone'),
    verificationStatus: text('verification_status').default('unverified'),
    verificationMethod: text('verification_method'),
    isFavorite: integer('is_favorite').default(0),
    status: text('status').default('active'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
    deletedAt: text('deleted_at'),
  },
  table => [index('idx_beneficiaries_user').on(table.userId)],
)

// Zelle Contacts
export const zelleContacts = sqliteTable(
  'zelle_contacts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    isEnrolled: integer('is_enrolled').default(0),
    isFavorite: integer('is_favorite').default(0),
    lastSentAmount: real('last_sent_amount'),
    lastSentDate: text('last_sent_date'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  },
  table => [index('idx_zelle_contacts_user').on(table.userId)],
)

// Billers (Predefined Payees)
export const billers = sqliteTable('billers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  phone: text('phone'),
  address: text('address'),
  isSearchable: integer('is_searchable').default(1),
  searchSuccessRate: real('search_success_rate').default(1.0),
  requiresAccountNumber: integer('requires_account_number').default(1),
  acceptsCreditCard: integer('accepts_credit_card').default(1),
  acceptsBankAccount: integer('accepts_bank_account').default(1),
  minPaymentAmount: real('min_payment_amount').default(1.0),
  averageBillAmount: real('average_bill_amount'),
  paymentProcessingDays: integer('payment_processing_days').default(1),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Bills
export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  billerId: integer('biller_id').references(() => billers.id),
  accountId: integer('account_id').references(() => accounts.id),
  billNumber: text('bill_number'),
  amount: real('amount').notNull(),
  dueDate: text('due_date').notNull(),
  dueDay: integer('due_day'),
  isRecurring: integer('is_recurring').default(0),
  recurrenceInterval: integer('recurrence_interval').default(30),
  nextDueDate: text('next_due_date'),
  autoPayEnabled: integer('auto_pay_enabled').default(0),
  autoPayAccountId: integer('auto_pay_account_id').references(
    () => accounts.id,
  ),
  minimumPaymentAmount: real('minimum_payment_amount'),
  status: text('status').default('pending'),
  paidDate: text('paid_date'),
  paidAmount: real('paid_amount'),
  lateFee: real('late_fee').default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Transaction Types
export const transactionTypes = sqliteTable('transaction_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
})

// Transactions
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').references(() => sessions.id),
  transactionTypeId: integer('transaction_type_id')
    .references(() => transactionTypes.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  fromAccountId: integer('from_account_id').references(() => accounts.id),
  toAccountId: integer('to_account_id').references(() => accounts.id),
  billerId: integer('biller_id').references(() => billers.id),
  billId: integer('bill_id').references(() => bills.id),
  beneficiaryId: integer('beneficiary_id').references(() => beneficiaries.id),
  zelleContactId: integer('zelle_contact_id').references(
    () => zelleContacts.id,
  ),
  creditCardId: integer('credit_card_id').references(() => creditCards.id),
  amount: real('amount').notNull(),
  fee: real('fee').default(0),
  balanceBefore: real('balance_before'),
  balanceAfter: real('balance_after'),
  referenceId: text('reference_id'),
  confirmationNumber: text('confirmation_number'),
  description: text('description'),
  memo: text('memo'),
  day: integer('day'),
  transactionDate: text('transaction_date')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  postedDate: text('posted_date'),
  pendingUntil: text('pending_until'),
  status: text('status').default('success'),
  failureReason: text('failure_reason'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  metadata: text('metadata'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Scheduled Transactions
export const scheduledTransactions = sqliteTable('scheduled_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  transactionTypeId: integer('transaction_type_id')
    .references(() => transactionTypes.id)
    .notNull(),
  fromAccountId: integer('from_account_id').references(() => accounts.id),
  toAccountId: integer('to_account_id').references(() => accounts.id),
  billerId: integer('biller_id').references(() => billers.id),
  beneficiaryId: integer('beneficiary_id').references(() => beneficiaries.id),
  amount: real('amount').notNull(),
  scheduledDate: text('scheduled_date').notNull(),
  isRecurring: integer('is_recurring').default(0),
  recurrenceFrequency: text('recurrence_frequency'),
  recurrenceEndDate: text('recurrence_end_date'),
  description: text('description'),
  memo: text('memo'),
  status: text('status').default('scheduled'),
  processedTransactionId: integer('processed_transaction_id').references(
    () => transactions.id,
  ),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Error Codes
export const errorCodes = sqliteTable('error_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  category: text('category').notNull(),
  message: text('message').notNull(),
  userMessage: text('user_message'),
  description: text('description'),
  suggestedAction: text('suggested_action'),
})

// System Config
export const systemConfig = sqliteTable('system_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  dataType: text('data_type'),
  category: text('category'),
  description: text('description'),
  isConfigurable: integer('is_configurable').default(1),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
})

// Notifications
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  sessionId: integer('session_id').references(() => sessions.id),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedTransactionId: integer('related_transaction_id').references(
    () => transactions.id,
  ),
  relatedBillId: integer('related_bill_id').references(() => bills.id),
  relatedAccountId: integer('related_account_id').references(() => accounts.id),
  priority: text('priority').default('normal'),
  isRead: integer('is_read').default(0),
  readAt: text('read_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`),
  expiresAt: text('expires_at'),
})
