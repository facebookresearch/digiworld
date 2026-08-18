// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Test Mutations
 *
 * This module provides database initialization for testing using better-sqlite3
 * instead of the expo-sqlite based mutations.
 */

import Database from 'better-sqlite3'

/**
 * Initialize database with minimal test data using better-sqlite3
 */
export async function initializeTestDatabase(
  db: Database.Database,
): Promise<{ success: boolean; error?: any }> {
  try {
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
    db.prepare(
      `
      INSERT INTO account_tier_levels (
        code, name, description, min_combined_balance, max_accounts_per_type,
        monthly_fee, fee_waiver_balance, has_overdraft_protection, has_interest_checking,
        interest_rate_bonus, free_wire_transfers, free_cashiers_checks, priority_support,
        dedicated_banker, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      'everyday',
      'Everyday Banking',
      'Basic banking tier',
      0,
      5,
      0,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      new Date().toISOString(),
    )

    console.log('Seeding account types...')
    db.prepare(
      `
      INSERT INTO account_types (
        tier_level_id, code, name, category, description, min_opening_balance,
        max_balance, monthly_fee, fee_waiver_min_balance, fee_waiver_min_direct_deposit,
        has_interest, base_interest_rate, has_debit_card, has_checks, allows_overdraft,
        overdraft_fee, overdraft_protection_transfer_fee, min_balance_to_avoid_fee,
        monthly_transaction_limit, withdrawal_penalty_days, early_withdrawal_penalty_rate,
        is_active, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      1,
      'checking',
      'Everyday Checking',
      'deposit',
      'Basic checking account',
      0,
      50000,
      0,
      null,
      null,
      0,
      0,
      1,
      1,
      1,
      35,
      10,
      0,
      null,
      null,
      null,
      1,
      0,
      new Date().toISOString(),
    )

    console.log('Seeding transaction types...')
    db.prepare(
      `
      INSERT INTO transaction_types (code, name, category, description)
      VALUES (?, ?, ?, ?)
    `,
    ).run('transfer', 'Transfer', 'transfer', 'Account to account transfer')

    console.log('Seeding users...')
    db.prepare(
      `
      INSERT INTO users (
        username, password, full_name, phone_number, email, account_tier_id,
        pin, security_question, security_answer, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      'testuser1',
      'password123',
      'Test User 1',
      '555-0001',
      'test1@example.com',
      1,
      '1234',
      'What is your favorite color?',
      'blue',
      new Date().toISOString(),
      new Date().toISOString(),
      null,
    )

    console.log('Seeding accounts...')
    db.prepare(
      `
      INSERT INTO accounts (
        user_id, account_type_id, account_number, account_name, balance,
        available_balance, is_primary, status, opened_date, closed_date,
        last_statement_date, next_statement_date, overdraft_protection_enabled,
        overdraft_protection_source_account_id, linked_savings_account_id,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      1,
      1,
      '1234567890',
      'Test Checking Account',
      2000.0,
      2000.0,
      1,
      'active',
      new Date().toISOString(),
      null,
      null,
      null,
      0,
      null,
      null,
      new Date().toISOString(),
      new Date().toISOString(),
      null,
    )

    console.log('Seeding transactions...')
    db.prepare(
      `
      INSERT INTO transactions (
        session_id, transaction_type_id, user_id, from_account_id, to_account_id,
        biller_id, bill_id, beneficiary_id, zelle_contact_id,
        credit_card_id, debit_card_id, amount, fee, balance_before, balance_after,
        reference_id, confirmation_number, description, memo, day, transaction_date,
        posted_date, pending_until, status, failure_reason, error_code, error_message,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      null,
      1,
      1,
      1,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      100.0,
      0,
      2100.0,
      2000.0,
      'TXN001',
      'CONF001',
      'Test transaction',
      null,
      1,
      new Date().toISOString(),
      new Date().toISOString(),
      null,
      'success',
      null,
      null,
      null,
      null,
      new Date().toISOString(),
    )

    console.log('Database initialized successfully')
    return { success: true }
  } catch (error) {
    console.error('Error initializing database:', error)
    return { success: false, error }
  }
}
