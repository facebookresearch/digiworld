/**
 * Static Database Generator
 *
 * This module creates a static database for testing without dependencies
 * on expo-sqlite or the main app database system.
 */

import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { runMigrations } from '../../db/migrations/runner'

// Import mock data directly
import usersStaticMock from '../../data/mock-users.json'
import accountTierLevelsMock from '../../data/mock-account_tier_levels.json'
import accountTypesMock from '../../data/mock-account_types.json'
import accountsMock from '../../data/mock-accounts.json'
// import creditCardsMock from '../../data/mock-credit_cards.json'
// import beneficiariesMock from '../../data/mock-beneficiaries.json'
// import zelleContactsMock from '../../data/mock-zelle_contacts.json'
// import billersMock from '../../data/mock-billers.json'
// import userBillersMock from '../../data/mock-user_billers.json'
// import billsMock from '../../data/mock-bills.json'
// import transactionTypesMock from '../../data/mock-transaction_types.json'
// import transactionsMock from '../../data/mock-transactions.json'
// import scheduledTransactionsMock from '../../data/mock-scheduled_transactions.json'
// import notificationsMock from '../../data/mock-notifications.json'

/**
 * Initialize database with mock data using better-sqlite3
 */
async function initializeDatabase(
  db: Database.Database,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Use mock data directly
    const usersData = usersStaticMock
    const tierLevelsData = accountTierLevelsMock
    const accountTypesData = accountTypesMock
    const accountsData = accountsMock
    // const creditCardsData = creditCardsMock
    // const beneficiariesData = beneficiariesMock
    // const zelleContactsData = zelleContactsMock
    // const billersData = billersMock
    // const userBillersData = userBillersMock
    // const billsData = billsMock
    // const transactionTypesData = transactionTypesMock
    // const transactionsData = transactionsMock
    // const scheduledTransactionsData = scheduledTransactionsMock
    // const notificationsData = notificationsMock

    console.log('Clearing tables...')
    const clearTables = [
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
      'account_types',
      'account_tier_levels',
      'users',
    ]
    for (const table of clearTables) {
      db.prepare(`DELETE FROM ${table}`).run()
    }

    console.log('Seeding account tier levels...')
    for (const tier of tierLevelsData) {
      const stmt = db.prepare(`
        INSERT INTO account_tier_levels (
          code, name, description, min_combined_balance, max_accounts_per_type,
          monthly_fee, fee_waiver_balance, has_overdraft_protection, has_interest_checking,
          interest_rate_bonus, free_wire_transfers, free_cashiers_checks, priority_support,
          dedicated_banker, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        tier.code,
        tier.name,
        tier.description,
        tier.min_combined_balance,
        tier.max_accounts_per_type,
        tier.monthly_fee,
        tier.fee_waiver_balance,
        tier.has_overdraft_protection,
        tier.has_interest_checking,
        tier.interest_rate_bonus,
        tier.free_wire_transfers,
        tier.free_cashiers_checks,
        tier.priority_support,
        tier.dedicated_banker,
        tier.sort_order,
        tier.created_at,
      )
    }

    console.log('Seeding account types...')
    for (const acctType of accountTypesData) {
      const stmt = db.prepare(`
        INSERT INTO account_types (
          tier_level_id, code, name, category, description, min_opening_balance,
          max_balance, monthly_fee, fee_waiver_min_balance, fee_waiver_min_direct_deposit,
          has_interest, base_interest_rate, has_debit_card, has_checks, allows_overdraft,
          overdraft_fee, overdraft_protection_transfer_fee, min_balance_to_avoid_fee,
          monthly_transaction_limit, withdrawal_penalty_days, early_withdrawal_penalty_rate,
          is_active, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        acctType.tier_level_id,
        acctType.code,
        acctType.name,
        acctType.category,
        acctType.description,
        acctType.min_opening_balance,
        acctType.max_balance,
        acctType.monthly_fee,
        acctType.fee_waiver_min_balance,
        acctType.fee_waiver_min_direct_deposit,
        acctType.has_interest,
        acctType.base_interest_rate,
        acctType.has_debit_card,
        acctType.has_checks,
        acctType.allows_overdraft,
        acctType.overdraft_fee,
        acctType.overdraft_protection_transfer_fee,
        acctType.min_balance_to_avoid_fee,
        acctType.monthly_transaction_limit,
        acctType.withdrawal_penalty_days,
        acctType.early_withdrawal_penalty_rate,
        acctType.is_active,
        acctType.sort_order,
        acctType.created_at,
      )
    }

    console.log('Seeding users...')
    for (const user of usersData) {
      const stmt = db.prepare(`
        INSERT INTO users (
          username, password, full_name, phone_number, email, account_tier_id,
          pin, security_question, security_answer, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        user.username,
        user.password,
        user.full_name,
        user.phone_number,
        user.email,
        user.account_tier_id,
        user.pin,
        user.security_question,
        user.security_answer,
        user.created_at,
        user.updated_at,
        user.deleted_at,
      )
    }

    console.log('Seeding accounts...')
    for (const acct of accountsData) {
      const stmt = db.prepare(`
        INSERT INTO accounts (
          user_id, account_type_id, account_number, account_name, balance,
          available_balance, is_primary, status, opened_date, closed_date,
          last_statement_date, next_statement_date, overdraft_protection_enabled,
          overdraft_protection_source_account_id, linked_savings_account_id,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        acct.user_id,
        acct.account_type_id,
        acct.account_number,
        acct.account_name,
        acct.balance,
        acct.available_balance,
        acct.is_primary,
        acct.status,
        acct.opened_date,
        acct.closed_date,
        acct.last_statement_date,
        acct.next_statement_date,
        acct.overdraft_protection_enabled,
        acct.overdraft_protection_source_account_id,
        acct.linked_savings_account_id,
        acct.created_at,
        acct.updated_at,
        acct.deleted_at,
      )
    }

    console.log('Seeding transaction types...')
    for (const tType of transactionTypesData) {
      const stmt = db.prepare(`
        INSERT INTO transaction_types (code, name, category, description)
        VALUES (?, ?, ?, ?)
      `)
      stmt.run(tType.code, tType.name, tType.category, tType.description)
    }

    console.log('Seeding transactions...')
    for (const tx of transactionsData) {
      const stmt = db.prepare(`
        INSERT INTO transactions (
          session_id, transaction_type_id, user_id, from_account_id, to_account_id,
          biller_id, bill_id, beneficiary_id, zelle_contact_id,
          credit_card_id, debit_card_id, amount, fee, balance_before, balance_after,
          reference_id, confirmation_number, description, memo, day, transaction_date,
          posted_date, pending_until, status, failure_reason, error_code, error_message,
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        tx.session_id,
        tx.transaction_type_id,
        tx.user_id,
        tx.from_account_id,
        tx.to_account_id,
        tx.biller_id,
        tx.bill_id,
        tx.beneficiary_id,
        tx.zelle_contact_id,
        tx.credit_card_id,
        tx.debit_card_id,
        tx.amount,
        tx.fee,
        tx.balance_before,
        tx.balance_after,
        tx.reference_id,
        tx.confirmation_number,
        tx.description,
        tx.memo,
        tx.day,
        tx.transaction_date,
        tx.posted_date,
        tx.pending_until,
        tx.status,
        tx.failure_reason,
        tx.error_code,
        tx.error_message,
        tx.metadata,
        tx.created_at,
      )
    }

    console.log('Database initialized successfully')
    return { success: true }
  } catch (error) {
    console.error('Error initializing database:', error)
    return { success: false, error }
  }
}

/**
 * Create static database
 */
export async function createStaticDatabase(): Promise<void> {
  const STATIC_DB_PATH = path.resolve(__dirname, 'ABC.db')

  if (fs.existsSync(STATIC_DB_PATH)) {
    console.log('Static database already exists at', STATIC_DB_PATH)
    return
  }

  console.log('Creating static database for tests...')

  // Create the static database directory if it doesn't exist
  const staticDir = path.dirname(STATIC_DB_PATH)
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true })
  }

  // Create temporary database
  const tempPath = path.resolve(__dirname, `temp_static_${Date.now()}.db`)
  const db = new Database(tempPath)

  try {
    // Run migrations to create schema
    await runMigrations(db)

    // Initialize with mock data
    const result = await initializeDatabase(db)
    if (!result.success) {
      throw new Error(`Failed to initialize database: ${result.error}`)
    }

    // Close the temporary database
    db.close()

    // Copy to static location
    fs.copyFileSync(tempPath, STATIC_DB_PATH)

    console.log('Static database created successfully at', STATIC_DB_PATH)
  } catch (error) {
    console.error('Failed to create static database:', error)
    throw error
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}

// Run if called directly
if (require.main === module) {
  createStaticDatabase()
    .then(() => {
      console.log('Static database generation completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Static database generation failed:', error)
      process.exit(1)
    })
}
