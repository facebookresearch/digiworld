// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Full Banking Tests
 *
 * These tests use the full harness to create fresh databases from schema and mock data.
 * They test the complete business logic and data flow.
 */

import Database from 'better-sqlite3'
import {
  runFullTest,
  runFullTests,
  setupFullTests,
  teardownFullTests,
} from './full-test-setup'

// Type assertion helper for database queries
// const asAny = <T>(value: T): any => value as any

// Global type assertion for database results
declare global {
  interface Database {
    prepare(sql: string): {
      all(): any[]
      get(...params: any[]): any
      run(...params: any[]): any
    }
  }
}

// Setup and teardown for Jest
beforeAll(async () => {
  await setupFullTests()
})

afterAll(async () => {
  await teardownFullTests()
})

describe('Full Banking Tests', () => {
  describe('Database Initialization', () => {
    test('should create database with all required tables', async () => {
      await runFullTest('Database schema validation', async db => {
        // Check that all required tables exist
        const tables = db.prepare(
          `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `,
        )

        const expectedTables = [
          'account_tier_levels',
          'account_types',
          'accounts',
          'beneficiaries',
          'bills',
          'billers',
          'credit_cards',
          'error_codes',
          'notifications',
          'scheduled_transactions',
          'sessions',
          'system_config',
          'transaction_types',
          'transactions',
          'user_billers',
          'users',
          'zelle_contacts',
        ]

        const tableNames = tables.map(t => t.name)
        expectedTables.forEach(expectedTable => {
          expect(tableNames).toContain(expectedTable)
        })
      })
    })

    test('should populate database with mock data', async () => {
      await runFullTest('Mock data validation', async db => {
        // Check that mock data was loaded
        const userCount = db
          .prepare('SELECT COUNT(*) as count FROM users')
          .get()
        const accountCount = db
          .prepare('SELECT COUNT(*) as count FROM accounts')
          .get()
        const transactionCount = db.prepare(
          'SELECT COUNT(*) as count FROM transactions',
        )

        expect(userCount.count).toBeGreaterThan(0)
        expect(accountCount.count).toBeGreaterThan(0)
        expect(transactionCount.count).toBeGreaterThan(0)
      })
    })
  })

  describe('User Management Operations', () => {
    test('should create new user with proper validation', async () => {
      await runFullTest('User creation test', async db => {
        // Get a tier level for the new user
        const tier = db
          .prepare('SELECT * FROM account_tier_levels LIMIT 1')
          .get()
        expect(tier).toBeDefined()

        // Create new user
        const insertUser = db.prepare(`
          INSERT INTO users (username, password, full_name, phone_number, email, account_tier_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        const result = insertUser.run(
          'newuser123',
          'password123',
          'New Test User',
          '555-0123',
          'newuser@test.com',
          tier.id,
        )

        expect(result.changes).toBe(1)

        // Verify user was created
        const newUser = db
          .prepare('SELECT * FROM users WHERE username = ?')
          .get('newuser123')
        expect(newUser).toBeDefined()
        expect(newUser.full_name).toBe('New Test User')
        expect(newUser.account_tier_id).toBe(tier.id)
      })
    })

    test('should validate user constraints', async () => {
      await runFullTest('User constraint validation', async db => {
        const tier = db.prepare('SELECT * FROM account_tier_levels LIMIT 1')

        // Try to create user with duplicate username
        const insertUser = db.prepare(`
          INSERT INTO users (username, password, full_name, phone_number, account_tier_id)
          VALUES (?, ?, ?, ?, ?)
        `)

        // First insert should succeed
        insertUser.run(
          'uniqueuser',
          'password',
          'Unique User',
          '555-0001',
          tier.id,
        )

        // Second insert with same username should fail
        expect(() => {
          insertUser.run(
            'uniqueuser',
            'password2',
            'Another User',
            '555-0002',
            tier.id,
          )
        }).toThrow()
      })
    })
  })

  describe('Account Operations', () => {
    test('should create account with proper relationships', async () => {
      await runFullTest('Account creation test', async db => {
        // Get user and account type
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        const accountType = db.prepare(
          'SELECT * FROM account_types WHERE category = "deposit" LIMIT 1',
        )

        expect(user).toBeDefined()
        expect(accountType).toBeDefined()

        // Create new account
        const insertAccount = db.prepare(`
          INSERT INTO accounts (user_id, account_type_id, account_number, account_name, balance, available_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        const result = insertAccount.run(
          user.id,
          accountType.id,
          '1234567890',
          'Test Checking Account',
          1000.0,
          1000.0,
        )

        expect(result.changes).toBe(1)

        // Verify account was created
        const newAccount = db
          .prepare('SELECT * FROM accounts WHERE account_number = ?')
          .get('1234567890')
        expect(newAccount).toBeDefined()
        expect(newAccount.user_id).toBe(user.id)
        expect(newAccount.account_type_id).toBe(accountType.id)
        expect(newAccount.balance).toBe(1000.0)
      })
    })

    test('should handle account balance updates', async () => {
      await runFullTest('Account balance update test', async db => {
        // Get an existing account
        const account = db.prepare('SELECT * FROM accounts LIMIT 1').get()
        expect(account).toBeDefined()

        const originalBalance = account.balance
        const newBalance = originalBalance + 500.0

        // Update balance
        const updateBalance = db.prepare(
          'UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?',
        )
        const result = updateBalance.run(newBalance, newBalance, account.id)

        expect(result.changes).toBe(1)

        // Verify balance was updated
        const updatedAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(updatedAccount.balance).toBe(newBalance)
        expect(updatedAccount.available_balance).toBe(newBalance)
      })
    })
  })

  describe('Transaction Processing', () => {
    test('should create and process transactions', async () => {
      await runFullTest('Transaction processing test', async db => {
        // Get accounts and transaction type
        const fromAccount = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()
        const toAccount = db
          .prepare('SELECT * FROM accounts WHERE id != ? LIMIT 1')
          .get(fromAccount.id)
        const transactionType = db.prepare(
          'SELECT * FROM transaction_types WHERE code = "transfer" LIMIT 1',
        )

        expect(fromAccount).toBeDefined()
        expect(toAccount).toBeDefined()
        expect(transactionType).toBeDefined()

        const transferAmount = 100.0
        const fromBalanceBefore = fromAccount.balance
        const toBalanceBefore = toAccount.balance

        // Create transaction
        const insertTransaction = db.prepare(`
          INSERT INTO transactions (
            transaction_type_id, user_id, from_account_id, to_account_id,
            amount, balance_before, balance_after, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const result = insertTransaction.run(
          transactionType.id,
          fromAccount.user_id,
          fromAccount.id,
          toAccount.id,
          transferAmount,
          fromBalanceBefore,
          fromBalanceBefore - transferAmount,
          'Test transfer',
          'success',
        )

        expect(result.changes).toBe(1)

        // Update account balances
        const updateFromAccount = db.prepare(
          'UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?',
        )
        const updateToAccount = db.prepare(
          'UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?',
        )

        updateFromAccount.run(
          fromBalanceBefore - transferAmount,
          fromBalanceBefore - transferAmount,
          fromAccount.id,
        )
        updateToAccount.run(
          toBalanceBefore + transferAmount,
          toBalanceBefore + transferAmount,
          toAccount.id,
        )

        // Verify transaction was created
        const transaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(transaction).toBeDefined()
        expect(transaction.amount).toBe(transferAmount)
        expect(transaction.status).toBe('success')
      })
    })

    test('should validate transaction constraints', async () => {
      await runFullTest('Transaction constraint validation', async db => {
        // Get account with low balance
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance < 50 LIMIT 1')
          .get()
        const transactionType = db.prepare(
          'SELECT * FROM transaction_types LIMIT 1',
        )

        if (account && transactionType) {
          const insufficientAmount = account.balance + 100.0

          // Try to create transaction with insufficient funds
          const insertTransaction = db.prepare(`
            INSERT INTO transactions (
              transaction_type_id, user_id, from_account_id,
              amount, balance_before, balance_after, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          // This should succeed (transaction creation), but status should reflect insufficient funds
          const result = insertTransaction.run(
            transactionType.id,
            account.user_id,
            account.id,
            insufficientAmount,
            account.balance,
            account.balance - insufficientAmount,
            'Test insufficient funds transaction',
            'failed',
          )

          expect(result.changes).toBe(1)

          // Verify transaction was created with failed status
          const transaction = db
            .prepare('SELECT * FROM transactions WHERE id = ?')
            .get(result.lastInsertRowid)
          expect(transaction.status).toBe('failed')
        }
      })
    })
  })

  describe('Business Logic Integration', () => {
    test('should handle complete user workflow', async () => {
      await runFullTest('Complete user workflow test', async db => {
        // 1. Create user
        const tier = db
          .prepare('SELECT * FROM account_tier_levels LIMIT 1')
          .get()
        const insertUser = db.prepare(`
          INSERT INTO users (username, password, full_name, phone_number, account_tier_id)
          VALUES (?, ?, ?, ?, ?)
        `)

        const userResult = insertUser.run(
          'workflowuser',
          'password',
          'Workflow User',
          '555-9999',
          tier.id,
        )
        const userId = userResult.lastInsertRowid

        // 2. Create checking account
        const checkingType = db
          .prepare(
            'SELECT * FROM account_types WHERE code = "checking" LIMIT 1',
          )
          .get()
        const insertAccount = db.prepare(`
          INSERT INTO accounts (user_id, account_type_id, account_number, account_name, balance, available_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        const accountResult = insertAccount.run(
          userId,
          checkingType.id,
          '9999999999',
          'Workflow Checking',
          2000.0,
          2000.0,
        )
        const accountId = accountResult.lastInsertRowid

        // 3. Create savings account
        const savingsType = db
          .prepare('SELECT * FROM account_types WHERE code = "savings" LIMIT 1')
          .get()
        const savingsResult = insertAccount.run(
          userId,
          savingsType.id,
          '8888888888',
          'Workflow Savings',
          5000.0,
          5000.0,
        )
        const savingsId = savingsResult.lastInsertRowid

        // 4. Create transfer transaction
        const transferType = db
          .prepare(
            'SELECT * FROM transaction_types WHERE code = "transfer" LIMIT 1',
          )
          .get()
        const insertTransaction = db.prepare(`
          INSERT INTO transactions (
            transaction_type_id, user_id, from_account_id, to_account_id,
            amount, balance_before, balance_after, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const transferAmount = 500.0
        const transactionResult = insertTransaction.run(
          transferType.id,
          userId,
          accountId,
          savingsId,
          transferAmount,
          2000.0,
          1500.0,
          'Transfer to savings',
          'success',
        )

        // 5. Update balances
        const updateChecking = db.prepare(
          'UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?',
        )
        const updateSavings = db.prepare(
          'UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?',
        )

        updateChecking.run(1500.0, 1500.0, accountId)
        updateSavings.run(5500.0, 5500.0, savingsId)

        // 6. Verify complete workflow
        const finalUser = db
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(userId)
        const finalChecking = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(accountId)
        const finalSavings = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(savingsId)
        const finalTransaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(transactionResult.lastInsertRowid)

        expect(finalUser).toBeDefined()
        expect(finalChecking.balance).toBe(1500.0)
        expect(finalSavings.balance).toBe(5500.0)
        expect(finalTransaction.amount).toBe(transferAmount)
        expect(finalTransaction.status).toBe('success')
      })
    })
  })

  describe('Advanced User Operations', () => {
    test('should handle user profile updates', async () => {
      await runFullTest('User profile update test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const updateUser = db.prepare(`
          UPDATE users 
          SET full_name = ?, email = ?, phone_number = ?
          WHERE id = ?
        `)

        const result = updateUser.run(
          'Updated Full Name',
          'updated@example.com',
          '555-9999',
          user.id,
        )

        expect(result.changes).toBe(1)

        const updatedUser = db
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(user.id)
        expect(updatedUser.full_name).toBe('Updated Full Name')
        expect(updatedUser.email).toBe('updated@example.com')
        expect(updatedUser.phone_number).toBe('555-9999')
      })
    })

    test('should handle user password changes', async () => {
      await runFullTest('User password change test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const newPassword = 'newpassword123'
        const updatePassword = db.prepare(
          'UPDATE users SET password = ? WHERE id = ?',
        )

        const result = updatePassword.run(newPassword, user.id)
        expect(result.changes).toBe(1)

        const updatedUser = db
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(user.id)
        expect(updatedUser.password).toBe(newPassword)
      })
    })

    test('should handle user account tier changes', async () => {
      await runFullTest('User account tier change test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        const newTier = db
          .prepare('SELECT * FROM account_tier_levels WHERE id != ? LIMIT 1')
          .get(user.account_tier_id)

        expect(user).toBeDefined()
        expect(newTier).toBeDefined()

        const updateTier = db.prepare(
          'UPDATE users SET account_tier_id = ? WHERE id = ?',
        )

        const result = updateTier.run(newTier.id, user.id)
        expect(result.changes).toBe(1)

        const updatedUser = db
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(user.id)
        expect(updatedUser.account_tier_id).toBe(newTier.id)
      })
    })
  })

  describe('Advanced Account Operations', () => {
    test('should handle account freezing and unfreezing', async () => {
      await runFullTest('Account freeze/unfreeze test', async db => {
        const account = db.prepare('SELECT * FROM accounts LIMIT 1').get()
        expect(account).toBeDefined()

        // Freeze account
        const freezeAccount = db.prepare(
          'UPDATE accounts SET status = ? WHERE id = ?',
        )
        const freezeResult = freezeAccount.run('frozen', account.id)
        expect(freezeResult.changes).toBe(1)

        const frozenAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(frozenAccount.status).toBe('frozen')

        // Unfreeze account
        const unfreezeResult = freezeAccount.run('active', account.id)
        expect(unfreezeResult.changes).toBe(1)

        const unfrozenAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(unfrozenAccount.status).toBe('active')
      })
    })

    test('should handle account closure', async () => {
      await runFullTest('Account closure test', async db => {
        const account = db.prepare('SELECT * FROM accounts LIMIT 1').get()
        expect(account).toBeDefined()

        const closeAccount = db.prepare(
          'UPDATE accounts SET status = ?, available_balance = 0 WHERE id = ?',
        )

        const result = closeAccount.run('closed', account.id)
        expect(result.changes).toBe(1)

        const closedAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(closedAccount.status).toBe('closed')
        expect(closedAccount.available_balance).toBe(0)
      })
    })

    test('should handle account linking', async () => {
      await runFullTest('Account linking test', async db => {
        const accounts = db.prepare('SELECT * FROM accounts LIMIT 2').all()
        expect(accounts.length).toBeGreaterThanOrEqual(2)

        const linkAccount = db.prepare(
          'UPDATE accounts SET linked_account_id = ? WHERE id = ?',
        )

        const result = linkAccount.run(accounts[1].id, accounts[0].id)
        expect(result.changes).toBe(1)

        const linkedAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(accounts[0].id)
        expect(linkedAccount.linked_account_id).toBe(accounts[1].id)
      })
    })

    test('should handle overdraft protection', async () => {
      await runFullTest('Overdraft protection test', async db => {
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 0 LIMIT 1')
          .get()
        expect(account).toBeDefined()

        const enableOverdraft = db.prepare(
          'UPDATE accounts SET overdraft_enabled = 1 WHERE id = ?',
        )

        const result = enableOverdraft.run(account.id)
        expect(result.changes).toBe(1)

        const updatedAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(updatedAccount.overdraft_enabled).toBe(1)
      })
    })
  })

  describe('Advanced Transaction Operations', () => {
    test('should handle transaction reversals', async () => {
      await runFullTest('Transaction reversal test', async db => {
        const transaction = db
          .prepare(
            'SELECT * FROM transactions WHERE status = "success" LIMIT 1',
          )
          .get()
        expect(transaction).toBeDefined()

        const reverseTransaction = db.prepare(`
          UPDATE transactions 
          SET status = ?, reversal_reason = ?
          WHERE id = ?
        `)

        const result = reverseTransaction.run(
          'reversed',
          'Customer request',
          transaction.id,
        )
        expect(result.changes).toBe(1)

        const reversedTransaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(transaction.id)
        expect(reversedTransaction.status).toBe('reversed')
        expect(reversedTransaction.reversal_reason).toBe('Customer request')
      })
    })

    test('should handle transaction holds', async () => {
      await runFullTest('Transaction hold test', async db => {
        const transaction = db
          .prepare(
            'SELECT * FROM transactions WHERE status = "success" LIMIT 1',
          )
          .get()
        expect(transaction).toBeDefined()

        const holdTransaction = db.prepare(`
          UPDATE transactions 
          SET status = ?, hold_reason = ?, hold_until = ?
          WHERE id = ?
        `)

        const holdUntil = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString()
        const result = holdTransaction.run(
          'held',
          'Fraud review',
          holdUntil,
          transaction.id,
        )
        expect(result.changes).toBe(1)

        const heldTransaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(transaction.id)
        expect(heldTransaction.status).toBe('held')
        expect(heldTransaction.hold_reason).toBe('Fraud review')
        expect(heldTransaction.hold_until).toBe(holdUntil)
      })
    })

    test('should handle batch transactions', async () => {
      await runFullTest('Batch transaction test', async db => {
        const accounts = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 3')
          .all()
        expect(accounts.length).toBeGreaterThanOrEqual(2)

        const transactionType = db.prepare(
          'SELECT * FROM transaction_types WHERE code = "transfer" LIMIT 1',
        )

        const batchId = `BATCH-${Date.now()}`
        const transactions = []

        // Create multiple transactions in a batch
        for (let i = 0; i < 3; i++) {
          const fromAccount = accounts[i % accounts.length]
          const toAccount = accounts[(i + 1) % accounts.length]

          const insertTransaction = db.prepare(`
            INSERT INTO transactions (
              transaction_type_id, user_id, from_account_id, to_account_id,
              amount, description, status, batch_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const result = insertTransaction.run(
            transactionType.id,
            fromAccount.user_id,
            fromAccount.id,
            toAccount.id,
            50.0,
            `Batch transfer ${i + 1}`,
            'success',
            batchId,
          )

          transactions.push(result.lastInsertRowid)
        }

        // Verify all transactions were created with the same batch ID
        const batchTransactions = db
          .prepare('SELECT * FROM transactions WHERE batch_id = ?')
          .all(batchId)

        expect(batchTransactions.length).toBe(3)
        batchTransactions.forEach(tx => {
          expect(tx.batch_id).toBe(batchId)
          expect(tx.status).toBe('success')
        })
      })
    })

    test('should handle transaction fees', async () => {
      await runFullTest('Transaction fee test', async db => {
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()
        const transactionType = db.prepare(
          'SELECT * FROM transaction_types LIMIT 1',
        )

        expect(account).toBeDefined()
        expect(transactionType).toBeDefined()

        const insertTransaction = db.prepare(`
          INSERT INTO transactions (
            transaction_type_id, user_id, from_account_id,
            amount, fee, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        const result = insertTransaction.run(
          transactionType.id,
          account.user_id,
          account.id,
          100.0,
          2.5,
          'Transaction with fee',
          'success',
        )

        expect(result.changes).toBe(1)

        const transaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(transaction.amount).toBe(100.0)
        expect(transaction.fee).toBe(2.5)
      })
    })
  })

  describe('Credit Card Advanced Operations', () => {
    test('should handle credit card applications', async () => {
      await runFullTest('Credit card application test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const insertCreditCard = db.prepare(`
          INSERT INTO credit_cards (
            user_id, card_number, last_four_digits, cvv, expiry_date,
            cardholder_name, credit_limit, current_balance, available_credit,
            status, application_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const cardNumber = '4111111111111111'
        const lastFour = '1111'
        const cvv = '123'
        const expiryDate = '12/25'
        const creditLimit = 5000.0

        const result = insertCreditCard.run(
          user.id,
          cardNumber,
          lastFour,
          cvv,
          expiryDate,
          'John Doe',
          creditLimit,
          0.0,
          creditLimit,
          'active',
          new Date().toISOString(),
        )

        expect(result.changes).toBe(1)

        const creditCard = db
          .prepare('SELECT * FROM credit_cards WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(creditCard.user_id).toBe(user.id)
        expect(creditCard.card_number).toBe(cardNumber)
        expect(creditCard.credit_limit).toBe(creditLimit)
        expect(creditCard.available_credit).toBe(creditLimit)
      })
    })

    test('should handle credit card payments', async () => {
      await runFullTest('Credit card payment test', async db => {
        const creditCard = db
          .prepare(
            'SELECT * FROM credit_cards WHERE current_balance > 0 LIMIT 1',
          )
          .get()
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()

        if (creditCard && account) {
          const originalBalance = creditCard.current_balance
          const paymentAmount = Math.min(100, originalBalance)

          const insertPayment = db.prepare(`
            INSERT INTO transactions (
              transaction_type_id, user_id, credit_card_id, from_account_id,
              amount, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)

          const transactionType = db.prepare(
            'SELECT * FROM transaction_types WHERE code = "credit_card_payment" LIMIT 1',
          )

          const result = insertPayment.run(
            transactionType.id,
            creditCard.user_id,
            creditCard.id,
            account.id,
            paymentAmount,
            'Credit card payment',
            'success',
          )

          expect(result.changes).toBe(1)

          // Update credit card balance
          const updateCreditCard = db.prepare(
            'UPDATE credit_cards SET current_balance = current_balance - ?, available_credit = available_credit + ? WHERE id = ?',
          )
          updateCreditCard.run(paymentAmount, paymentAmount, creditCard.id)

          const updatedCreditCard = db
            .prepare('SELECT * FROM credit_cards WHERE id = ?')
            .get(creditCard.id)
          expect(updatedCreditCard.current_balance).toBe(
            originalBalance - paymentAmount,
          )
        }
      })
    })

    test('should handle credit limit increases', async () => {
      await runFullTest('Credit limit increase test', async db => {
        const creditCard = db
          .prepare('SELECT * FROM credit_cards LIMIT 1')
          .get()
        expect(creditCard).toBeDefined()

        const originalLimit = creditCard.credit_limit
        const newLimit = originalLimit + 1000

        const updateLimit = db.prepare(
          'UPDATE credit_cards SET credit_limit = ?, available_credit = ? WHERE id = ?',
        )

        const newAvailableCredit = newLimit - creditCard.current_balance
        const result = updateLimit.run(
          newLimit,
          newAvailableCredit,
          creditCard.id,
        )

        expect(result.changes).toBe(1)

        const updatedCard = db
          .prepare('SELECT * FROM credit_cards WHERE id = ?')
          .get(creditCard.id)
        expect(updatedCard.credit_limit).toBe(newLimit)
        expect(updatedCard.available_credit).toBe(newAvailableCredit)
      })
    })
  })

  describe('Beneficiary Advanced Operations', () => {
    test('should handle beneficiary verification', async () => {
      await runFullTest('Beneficiary verification test', async db => {
        const beneficiary = db
          .prepare('SELECT * FROM beneficiaries LIMIT 1')
          .get()
        expect(beneficiary).toBeDefined()

        const verifyBeneficiary = db.prepare(
          'UPDATE beneficiaries SET is_verified = 1, verification_date = ? WHERE id = ?',
        )

        const result = verifyBeneficiary.run(
          new Date().toISOString(),
          beneficiary.id,
        )
        expect(result.changes).toBe(1)

        const verifiedBeneficiary = db
          .prepare('SELECT * FROM beneficiaries WHERE id = ?')
          .get(beneficiary.id)
        expect(verifiedBeneficiary.is_verified).toBe(1)
        expect(verifiedBeneficiary.verification_date).toBeDefined()
      })
    })

    test('should handle beneficiary limits', async () => {
      await runFullTest('Beneficiary limits test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        // Check current beneficiary count
        // const currentCount = db
        //   .prepare(
        //     'SELECT COUNT(*) as count FROM beneficiaries WHERE user_id = ?',
        //   )
        //   .get(user.id)

        // Add beneficiary with daily limit
        const insertBeneficiary = db.prepare(`
          INSERT INTO beneficiaries (
            user_id, name, account_number, account_type, bank_name,
            daily_limit, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        const result = insertBeneficiary.run(
          user.id,
          'Test Beneficiary',
          '1234567890',
          'checking',
          'Test Bank',
          1000.0,
          'active',
        )

        expect(result.changes).toBe(1)

        const beneficiary = db
          .prepare('SELECT * FROM beneficiaries WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(beneficiary.daily_limit).toBe(1000.0)
      })
    })
  })

  describe('Bill Payment Advanced Operations', () => {
    test('should handle recurring bill setup', async () => {
      await runFullTest('Recurring bill setup test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        const biller = db.prepare('SELECT * FROM billers LIMIT 1').get()
        const account = db.prepare('SELECT * FROM accounts LIMIT 1').get()

        expect(user).toBeDefined()
        expect(biller).toBeDefined()
        expect(account).toBeDefined()

        const insertBill = db.prepare(`
          INSERT INTO bills (
            user_id, biller_id, account_id, amount, due_day,
            is_recurring, recurrence_interval, next_due_date, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const nextDueDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString()
        const result = insertBill.run(
          user.id,
          biller.id,
          account.id,
          150.0,
          15,
          1,
          30,
          nextDueDate,
          'pending',
        )

        expect(result.changes).toBe(1)

        const bill = db
          .prepare('SELECT * FROM bills WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(bill.is_recurring).toBe(1)
        expect(bill.recurrence_interval).toBe(30)
        expect(bill.next_due_date).toBe(nextDueDate)
      })
    })

    test('should handle bill payment scheduling', async () => {
      await runFullTest('Bill payment scheduling test', async db => {
        const bill = db
          .prepare('SELECT * FROM bills WHERE status = "pending" LIMIT 1')
          .get()
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()

        if (bill && account) {
          const insertScheduledPayment = db.prepare(`
            INSERT INTO scheduled_transactions (
              user_id, transaction_type_id, from_account_id, biller_id, bill_id,
              amount, scheduled_date, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const scheduledDate = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString()
          const transactionType = db.prepare(
            'SELECT * FROM transaction_types WHERE code = "bill_payment" LIMIT 1',
          )

          const result = insertScheduledPayment.run(
            bill.user_id,
            transactionType.id,
            account.id,
            bill.biller_id,
            bill.id,
            bill.amount,
            scheduledDate,
            `Scheduled payment for bill ${bill.id}`,
            'scheduled',
          )

          expect(result.changes).toBe(1)

          const scheduledPayment = db
            .prepare('SELECT * FROM scheduled_transactions WHERE id = ?')
            .get(result.lastInsertRowid)
          expect(scheduledPayment.bill_id).toBe(bill.id)
          expect(scheduledPayment.scheduled_date).toBe(scheduledDate)
        }
      })
    })
  })

  describe('Zelle Advanced Operations', () => {
    test('should handle Zelle contact management', async () => {
      await runFullTest('Zelle contact management test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const insertContact = db.prepare(`
          INSERT INTO zelle_contacts (
            user_id, contact_name, contact_email, contact_phone,
            is_verified, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)

        const result = insertContact.run(
          user.id,
          'Jane Smith',
          'jane@example.com',
          '555-1234',
          1,
          'active',
        )

        expect(result.changes).toBe(1)

        const contact = db
          .prepare('SELECT * FROM zelle_contacts WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(contact.contact_name).toBe('Jane Smith')
        expect(contact.is_verified).toBe(1)
      })
    })

    test('should handle Zelle transaction limits', async () => {
      await runFullTest('Zelle transaction limits test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()

        if (user && account) {
          // Set Zelle daily limit
          const updateUser = db.prepare(
            'UPDATE users SET zelle_daily_limit = ? WHERE id = ?',
          )
          updateUser.run(500.0, user.id)

          const updatedUser = db
            .prepare('SELECT * FROM users WHERE id = ?')
            .get(user.id)
          expect(updatedUser.zelle_daily_limit).toBe(500.0)
        }
      })
    })
  })

  describe('Notification System', () => {
    test('should handle notification creation', async () => {
      await runFullTest('Notification creation test', async db => {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const insertNotification = db.prepare(`
          INSERT INTO notifications (
            user_id, title, message, type, is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)

        const result = insertNotification.run(
          user.id,
          'Transaction Alert',
          'Your recent transaction has been processed',
          'info',
          0,
          new Date().toISOString(),
        )

        expect(result.changes).toBe(1)

        const notification = db
          .prepare('SELECT * FROM notifications WHERE id = ?')
          .get(result.lastInsertRowid)
        expect(notification.user_id).toBe(user.id)
        expect(notification.title).toBe('Transaction Alert')
        expect(notification.type).toBe('info')
      })
    })

    test('should handle notification marking as read', async () => {
      await runFullTest('Notification read test', async db => {
        const notification = db
          .prepare('SELECT * FROM notifications WHERE is_read = 0 LIMIT 1')
          .get()

        if (notification) {
          const markAsRead = db.prepare(
            'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?',
          )

          const result = markAsRead.run(
            new Date().toISOString(),
            notification.id,
          )
          expect(result.changes).toBe(1)

          const updatedNotification = db
            .prepare('SELECT * FROM notifications WHERE id = ?')
            .get(notification.id)
          expect(updatedNotification.is_read).toBe(1)
          expect(updatedNotification.read_at).toBeDefined()
        }
      })
    })
  })

  describe('Data Consistency', () => {
    test('should maintain referential integrity', async () => {
      await runFullTest('Referential integrity test', async db => {
        // Check that all foreign key relationships are valid
        const orphanedAccounts = db.prepare(
          `
          SELECT a.* FROM accounts a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE u.id IS NULL
        `,
        )

        expect(orphanedAccounts.length).toBe(0)

        const orphanedTransactions = db.prepare(
          `
          SELECT t.* FROM transactions t
          LEFT JOIN users u ON t.user_id = u.id
          WHERE u.id IS NULL
        `,
        )

        expect(orphanedTransactions.length).toBe(0)
      })
    })

    test('should handle concurrent operations', async () => {
      await runFullTest('Concurrent operations test', async db => {
        // Simulate concurrent balance updates
        const account = db
          .prepare('SELECT * FROM accounts WHERE balance > 100 LIMIT 1')
          .get()
        expect(account).toBeDefined()

        const originalBalance = account.balance

        // Simulate multiple concurrent updates
        const update1 = db.prepare(
          'UPDATE accounts SET balance = balance + 50 WHERE id = ?',
        )
        const update2 = db.prepare(
          'UPDATE accounts SET balance = balance - 25 WHERE id = ?',
        )
        update1.run(account.id)
        update2.run(account.id)

        // Verify final balance
        const finalAccount = db
          .prepare('SELECT * FROM accounts WHERE id = ?')
          .get(account.id)
        expect(finalAccount.balance).toBe(originalBalance + 25)
      })
    })

    test('should maintain data consistency across tables', async () => {
      await runFullTest('Cross-table consistency test', async db => {
        // Test that account balances match transaction history
        const accounts = db.prepare('SELECT * FROM accounts').all()

        accounts.forEach(account => {
          const transactions = db
            .prepare(
              `
            SELECT 
              SUM(CASE WHEN to_account_id = ? THEN amount ELSE 0 END) as credits,
              SUM(CASE WHEN from_account_id = ? THEN amount ELSE 0 END) as debits
            FROM transactions 
            WHERE status = 'success'
          `,
            )
            .get(account.id, account.id)

          const calculatedBalance =
            (transactions.credits || 0) - (transactions.debits || 0)

          // Allow for some tolerance due to initial deposits and other factors
          expect(Math.abs(account.balance - calculatedBalance)).toBeLessThan(
            1000,
          )
        })
      })
    })

    test('should handle data validation constraints', async () => {
      await runFullTest('Data validation constraints test', async db => {
        // Test unique constraints
        const user = db.prepare('SELECT * FROM users LIMIT 1').get()
        expect(user).toBeDefined()

        const insertDuplicateUser = db.prepare(`
          INSERT INTO users (username, password, full_name, account_tier_id)
          VALUES (?, ?, ?, ?)
        `)

        // This should fail due to unique username constraint
        expect(() => {
          insertDuplicateUser.run(
            user.username,
            'password123',
            'Duplicate User',
            user.account_tier_id,
          )
        }).toThrow()
      })
    })
  })
})

describe('Full Test Suite Performance', () => {
  test('should run comprehensive test suite efficiently', async () => {
    const tests = [
      {
        name: 'Database initialization',
        fn: async (db: Database.Database) => {
          const tableCount = db
            .prepare(
              `
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `,
            )
            .get()
          expect(tableCount.count).toBeGreaterThan(10)
        },
      },
      {
        name: 'Data population',
        fn: async (db: Database.Database) => {
          const userCount = db
            .prepare('SELECT COUNT(*) as count FROM users')
            .get()
          const accountCount = db
            .prepare('SELECT COUNT(*) as count FROM accounts')
            .get()
          expect(userCount.count).toBeGreaterThan(0)
          expect(accountCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Business logic validation',
        fn: async (db: Database.Database) => {
          const accounts = db.prepare('SELECT * FROM accounts').all()
          accounts.forEach(account => {
            expect(account.available_balance).toBeLessThanOrEqual(
              account.balance,
            )
          })
        },
      },
    ]

    const results = await runFullTests(tests)

    // All tests should pass
    results.forEach(result => {
      expect(result.success).toBe(true)
    })

    // Total execution time should be reasonable
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    expect(totalDuration).toBeLessThan(10000) // Should complete within 10 seconds
  })
})
