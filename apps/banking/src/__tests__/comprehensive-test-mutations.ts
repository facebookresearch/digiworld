/**
 * Comprehensive Test Mutations
 *
 * This module provides complete database initialization for testing using better-sqlite3
 * and the actual mock data from src/data, ensuring full coverage of all tables.
 */

import Database from 'better-sqlite3'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

// Import all mock data using require for JSON files
import usersStaticMock from '../data/mock-users.json'
import accountTierLevelsMock from '../data/mock-account_tier_levels.json'
import accountTypesMock from '../data/mock-account_types.json'
import accountsMock from '../data/mock-accounts.json'
import creditCardsMock from '../data/mock-credit_cards.json'
import beneficiariesMock from '../data/mock-beneficiaries.json'
import zelleContactsMock from '../data/mock-zelle_contacts.json'
import billersMock from '../data/mock-billers.json'
import userBillersMock from '../data/mock-user_billers.json'
import billsMock from '../data/mock-bills.json'
import transactionTypesMock from '../data/mock-transaction_types.json'
import transactionsMock from '../data/mock-transactions.json'
import scheduledTransactionsMock from '../data/mock-scheduled_transactions.json'
import notificationsMock from '../data/mock-notifications.json'

const bundledMocks = {
  'mock-users.json': usersStaticMock,
  'mock-account_tier_levels.json': accountTierLevelsMock,
  'mock-account_types.json': accountTypesMock,
  'mock-accounts.json': accountsMock,
  'mock-credit_cards.json': creditCardsMock,
  'mock-beneficiaries.json': beneficiariesMock,
  'mock-zelle_contacts.json': zelleContactsMock,
  'mock-billers.json': billersMock,
  'mock-user_billers.json': userBillersMock,
  'mock-bills.json': billsMock,
  'mock-transaction_types.json': transactionTypesMock,
  'mock-transactions.json': transactionsMock,
  'mock-scheduled_transactions.json': scheduledTransactionsMock,
  'mock-notifications.json': notificationsMock,
}

const readJSONFile = createReadJSONFile(bundledMocks)

/**
 * Convert camelCase object keys to snake_case for database insertion
 */
function convertToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertToSnakeCase)
  if (typeof obj !== 'object') return obj

  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    converted[snakeKey] = convertToSnakeCase(value)
  }
  return converted
}

/**
 * Initialize database with complete mock data using better-sqlite3
 */
export async function initializeComprehensiveTestDatabase(
  db: Database.Database,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Read all mock data in parallel
    const [
      usersData,
      tierLevelsData,
      accountTypesData,
      accountsData,
      creditCardsData,
      beneficiariesData,
      zelleContactsData,
      billersData,
      userBillersData,
      billsData,
      transactionTypesData,
      transactionsData,
      scheduledTransactionsData,
      notificationsData,
    ] = await Promise.all([
      readJSONFile('mock-users.json'),
      readJSONFile('mock-account_tier_levels.json'),
      readJSONFile('mock-account_types.json'),
      readJSONFile('mock-accounts.json'),
      readJSONFile('mock-credit_cards.json'),
      readJSONFile('mock-beneficiaries.json'),
      readJSONFile('mock-zelle_contacts.json'),
      readJSONFile('mock-billers.json'),
      readJSONFile('mock-user_billers.json'),
      readJSONFile('mock-bills.json'),
      readJSONFile('mock-transaction_types.json'),
      readJSONFile('mock-transactions.json'),
      readJSONFile('mock-scheduled_transactions.json'),
      readJSONFile('mock-notifications.json'),
    ])

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
      try {
        db.prepare(`DELETE FROM ${table}`).run()
      } catch (error) {
        // Table might not exist yet, which is fine
      }
    }

    console.log('Seeding account tier levels...')
    for (const tier of tierLevelsData) {
      const tierData = convertToSnakeCase(tier)
      const stmt = db.prepare(`
        INSERT INTO account_tier_levels (
          code, name, description, min_combined_balance, max_accounts_per_type,
          monthly_fee, fee_waiver_balance, has_overdraft_protection, has_interest_checking,
          interest_rate_bonus, free_wire_transfers, free_cashiers_checks, priority_support,
          dedicated_banker, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        tierData.code,
        tierData.name,
        tierData.description,
        tierData.min_combined_balance,
        tierData.max_accounts_per_type,
        tierData.monthly_fee,
        tierData.fee_waiver_balance,
        tierData.has_overdraft_protection,
        tierData.has_interest_checking,
        tierData.interest_rate_bonus,
        tierData.free_wire_transfers,
        tierData.free_cashiers_checks,
        tierData.priority_support,
        tierData.dedicated_banker,
        tierData.sort_order,
        tierData.created_at,
      )
    }

    console.log('Seeding account types...')
    for (const acctType of accountTypesData) {
      const acctTypeData = convertToSnakeCase(acctType)
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
        acctTypeData.tier_level_id,
        acctTypeData.code,
        acctTypeData.name,
        acctTypeData.category,
        acctTypeData.description,
        acctTypeData.min_opening_balance,
        acctTypeData.max_balance,
        acctTypeData.monthly_fee,
        acctTypeData.fee_waiver_min_balance,
        acctTypeData.fee_waiver_min_direct_deposit,
        acctTypeData.has_interest,
        acctTypeData.base_interest_rate,
        acctTypeData.has_debit_card,
        acctTypeData.has_checks,
        acctTypeData.allows_overdraft,
        acctTypeData.overdraft_fee,
        acctTypeData.overdraft_protection_transfer_fee,
        acctTypeData.min_balance_to_avoid_fee,
        acctTypeData.monthly_transaction_limit,
        acctTypeData.withdrawal_penalty_days,
        acctTypeData.early_withdrawal_penalty_rate,
        acctTypeData.is_active,
        acctTypeData.sort_order,
        acctTypeData.created_at,
      )
    }

    console.log('Seeding users...')
    for (const user of usersData) {
      const userData = convertToSnakeCase(user)
      const stmt = db.prepare(`
        INSERT INTO users (
          id, username, password, full_name, phone_number, email, account_tier_id,
          pin, security_question, security_answer, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        userData.id,
        userData.username,
        userData.password,
        userData.full_name,
        userData.phone_number,
        userData.email,
        userData.account_tier_id,
        userData.pin,
        userData.security_question,
        userData.security_answer,
        userData.created_at,
        userData.updated_at,
        userData.deleted_at,
      )
    }

    console.log('Seeding accounts...')
    for (const acct of accountsData) {
      const acctData = convertToSnakeCase(acct)
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
        acctData.user_id,
        acctData.account_type_id,
        acctData.account_number,
        acctData.account_name,
        acctData.balance,
        acctData.available_balance,
        acctData.is_primary,
        acctData.status,
        acctData.opened_date,
        acctData.closed_date,
        acctData.last_statement_date,
        acctData.next_statement_date,
        acctData.overdraft_protection_enabled,
        acctData.overdraft_protection_source_account_id,
        acctData.linked_savings_account_id,
        acctData.created_at,
        acctData.updated_at,
        acctData.deleted_at,
      )
    }

    console.log('Seeding credit cards...')
    for (const card of creditCardsData) {
      const cardData = convertToSnakeCase(card)
      const stmt = db.prepare(`
        INSERT INTO credit_cards (
          user_id, linked_checking_account_id, card_number, last_four_digits, cardholder_name,
          expiry_month, expiry_year, cvv, credit_limit, current_balance, available_credit,
          apr, annual_fee, cash_advance_fee_percent, late_payment_fee, payment_due_day,
          minimum_payment_percent, statement_closing_day, autopay_enabled, autopay_amount,
          status, opened_date, last_payment_date, last_statement_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        cardData.user_id,
        cardData.linked_checking_account_id,
        cardData.card_number,
        cardData.last_four_digits,
        cardData.cardholder_name,
        cardData.expiry_month,
        cardData.expiry_year,
        cardData.cvv,
        cardData.credit_limit,
        cardData.current_balance,
        cardData.available_credit,
        cardData.apr,
        cardData.annual_fee,
        cardData.cash_advance_fee_percent,
        cardData.late_payment_fee,
        cardData.payment_due_day,
        cardData.minimum_payment_percent,
        cardData.statement_closing_day,
        cardData.autopay_enabled,
        cardData.autopay_amount,
        cardData.status,
        cardData.opened_date,
        cardData.last_payment_date,
        cardData.last_statement_date,
        cardData.created_at,
      )
    }

    console.log('Seeding beneficiaries...')
    for (const ben of beneficiariesData) {
      const benData = convertToSnakeCase(ben)
      const stmt = db.prepare(`
        INSERT INTO beneficiaries (
          user_id, name, account_number, routing_number, account_type, bank_name,
          bank_address, nickname, email, phone, verification_status, verification_method,
          is_favorite, status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        benData.user_id,
        benData.name,
        benData.account_number,
        benData.routing_number,
        benData.account_type,
        benData.bank_name,
        benData.bank_address,
        benData.nickname,
        benData.email,
        benData.phone,
        benData.verification_status,
        benData.verification_method,
        benData.is_favorite,
        benData.status,
        benData.created_at,
        benData.updated_at,
        benData.deleted_at,
      )
    }

    console.log('Seeding Zelle contacts...')
    for (const contact of zelleContactsData) {
      const contactData = convertToSnakeCase(contact)
      const stmt = db.prepare(`
        INSERT INTO zelle_contacts (
          id, user_id, contact_name, contact_email, contact_phone, is_enrolled,
          is_favorite, last_sent_amount, last_sent_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        contactData.id,
        contactData.user_id,
        contactData.contact_name,
        contactData.contact_email,
        contactData.contact_phone,
        contactData.is_enrolled,
        contactData.is_favorite,
        contactData.last_sent_amount,
        contactData.last_sent_date,
        contactData.created_at,
      )
    }

    console.log('Seeding billers...')
    for (const biller of billersData) {
      const billerData = convertToSnakeCase(biller)
      const stmt = db.prepare(`
        INSERT INTO billers (
          id, code, name, name_normalized, category, subcategory, description, logo_url,
          website, phone, address, is_searchable, search_success_rate, requires_account_number,
          requires_routing_number, accepts_credit_card, accepts_debit_card, accepts_bank_account,
          min_payment_amount, max_payment_amount, average_bill_amount, payment_processing_days,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?)
      `)
      stmt.run(
        billerData.id || '',
        billerData.code || '',
        billerData.name || '',
        billerData.name_normalized || '',
        billerData.category || '',
        billerData.subcategory || '',
        billerData.description || '',
        billerData.logo_url || '',
        billerData.website || '',
        billerData.phone || '',
        billerData.address || '',
        billerData.is_searchable || '',
        billerData.search_success_rate || '',
        billerData.requires_account_number || '',
        billerData.requires_routing_number || '',
        billerData.accepts_credit_card || '',
        billerData.accepts_debit_card || '',
        billerData.accepts_bank_account || '',
        billerData.min_payment_amount || '',
        billerData.max_payment_amount || '',
        billerData.average_bill_amount || '',
        billerData.payment_processing_days || '',
        billerData.is_active || '',
        billerData.created_at || '',
      )
    }

    console.log('Seeding user billers...')
    for (const ub of userBillersData) {
      const ubData = convertToSnakeCase(ub)
      const stmt = db.prepare(`
        INSERT INTO user_billers (
          id, user_id, biller_name, biller_account_number, biller_routing_number, biller_address,
          biller_phone, nickname, category, notes, default_payment_account_id, verification_status,
          verification_warnings, last_payment_date, is_favorite, autopay_enabled, status,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
      stmt.run(
        ubData.id || '',
        ubData.user_id,
        ubData.biller_name || '',
        ubData.biller_account_number,
        ubData.biller_routing_number,
        ubData.biller_address,
        ubData.biller_phone,
        ubData.nickname,
        ubData.category,
        ubData.notes,
        ubData.default_payment_account_id,
        ubData.verification_status,
        ubData.verification_warnings,
        ubData.last_payment_date,
        ubData.is_favorite,
        ubData.autopay_enabled,
        ubData.status,
        ubData.created_at,
        ubData.updated_at,
        ubData.deleted_at,
      )
    }

    console.log('Seeding bills...')
    for (const bill of billsData) {
      const billData = convertToSnakeCase(bill)
      const stmt = db.prepare(`
        INSERT INTO bills (
          user_id, biller_id, account_id, bill_number, amount, due_date,
          due_day, is_recurring, recurrence_interval, next_due_date, auto_pay_enabled,
          auto_pay_account_id, minimum_payment_amount, status, paid_date, paid_amount,
          late_fee, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        billData.user_id,
        billData.biller_id,
        billData.account_id,
        billData.bill_number,
        billData.amount,
        billData.due_date,
        billData.due_day,
        billData.is_recurring,
        billData.recurrence_interval,
        billData.next_due_date,
        billData.auto_pay_enabled,
        billData.auto_pay_account_id,
        billData.minimum_payment_amount,
        billData.status,
        billData.paid_date,
        billData.paid_amount,
        billData.late_fee,
        billData.created_at,
        billData.updated_at,
      )
    }

    console.log('Seeding transaction types...')
    for (const tType of transactionTypesData) {
      const tTypeData = convertToSnakeCase(tType)
      const stmt = db.prepare(`
        INSERT INTO transaction_types (code, name, category, description)
        VALUES (?, ?, ?, ?)
      `)
      stmt.run(
        tTypeData.code,
        tTypeData.name,
        tTypeData.category,
        tTypeData.description,
      )
    }

    console.log('Seeding transactions...')
    for (const tx of transactionsData) {
      const txData = convertToSnakeCase(tx)
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
        txData.session_id,
        txData.transaction_type_id,
        txData.user_id,
        txData.from_account_id,
        txData.to_account_id,
        txData.biller_id,
        txData.bill_id,
        txData.beneficiary_id,
        txData.zelle_contact_id,
        txData.credit_card_id,
        txData.debit_card_id,
        txData.amount,
        txData.fee,
        txData.balance_before,
        txData.balance_after,
        txData.reference_id,
        txData.confirmation_number,
        txData.description,
        txData.memo,
        txData.day,
        txData.transaction_date,
        txData.posted_date,
        txData.pending_until,
        txData.status,
        txData.failure_reason,
        txData.error_code,
        txData.error_message,
        txData.metadata,
        txData.created_at,
      )
    }

    console.log('Seeding scheduled transactions...')
    for (const stx of scheduledTransactionsData) {
      const stxData = convertToSnakeCase(stx)
      const stmt = db.prepare(`
        INSERT INTO scheduled_transactions (
          user_id, transaction_type_id, from_account_id, to_account_id, biller_id,
          beneficiary_id, amount, scheduled_date, is_recurring,
          recurrence_frequency, recurrence_end_date, description, memo, status,
          processed_transaction_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        stxData.user_id,
        stxData.transaction_type_id,
        stxData.from_account_id,
        stxData.to_account_id,
        stxData.biller_id,
        stxData.beneficiary_id,
        stxData.amount,
        stxData.scheduled_date,
        stxData.is_recurring,
        stxData.recurrence_frequency,
        stxData.recurrence_end_date,
        stxData.description,
        stxData.memo,
        stxData.status,
        stxData.processed_transaction_id,
        stxData.created_at,
        stxData.updated_at,
      )
    }

    console.log('Seeding notifications...')
    for (const notif of notificationsData) {
      const notifData = convertToSnakeCase(notif)
      const stmt = db.prepare(`
        INSERT INTO notifications (
          user_id, session_id, notification_type, title, message, related_transaction_id,
          related_bill_id, related_account_id, priority, is_read, read_at, created_at,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        notifData.user_id,
        notifData.session_id,
        notifData.notification_type,
        notifData.title,
        notifData.message,
        notifData.related_transaction_id,
        notifData.related_bill_id,
        notifData.related_account_id,
        notifData.priority,
        notifData.is_read,
        notifData.read_at,
        notifData.created_at,
        notifData.expires_at,
      )
    }

    console.log('Database initialized successfully with comprehensive data')
    return { success: true }
  } catch (error) {
    console.error(
      'Error initializing database:',
      error.message,
      error.sql,
      error.stack,
    )
    return { success: false, error }
  }
}
