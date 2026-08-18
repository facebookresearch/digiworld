// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Static Banking Tests
 *
 * These tests use a pre-built database copy for fast, repeatable testing.
 * They validate business logic against known data states.
 */

import Database from 'better-sqlite3'
import {
  runStaticTest,
  runStaticTests,
  setupStaticTests,
  teardownStaticTests,
} from './static-test-setup'

// Type assertion helper for database queries
const asAny = <T>(value: T): any => value as any

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
  await setupStaticTests()
})

afterAll(async () => {
  await teardownStaticTests()
})

describe('Static Banking Tests', () => {
  describe('User Management', () => {
    test('should have test users in database', async () => {
      await runStaticTest('User existence check', async db => {
        const users = db.prepare('SELECT * FROM users').all() as any[]
        expect(users.length).toBeGreaterThan(0)

        // Check for specific test user
        const testUser = db
          .prepare('SELECT * FROM users WHERE username = ?')
          .get('testuser1') as any
        expect(testUser).toBeDefined()
        expect(testUser.full_name).toBe('Test User 1')
      })
    })

    test('should have valid account tier relationships', async () => {
      await runStaticTest('Account tier validation', async db => {
        const users = db
          .prepare(
            `
          SELECT u.*, atl.name as tier_name 
          FROM users u 
          JOIN account_tier_levels atl ON u.account_tier_id = atl.id
        `,
          )
          .all() as any[]

        expect(users.length).toBeGreaterThan(0)

        // All users should have valid tier relationships
        users.forEach((user: any) => {
          expect(user.tier_name).toBeDefined()
          expect(user.tier_name).toMatch(
            /everyday|clear_access|prime|premier|sapphire|private_client/,
          )
        })
      })
    })
  })

  describe('Account Management', () => {
    test('should have accounts with correct balances', async () => {
      await runStaticTest('Account balance validation', async db => {
        const accounts = asAny(
          db
            .prepare(
              `
          SELECT a.*, at.name as account_type_name, u.username
          FROM accounts a
          JOIN account_types at ON a.account_type_id = at.id
          JOIN users u ON a.user_id = u.id
        `,
            )
            .all(),
        )

        expect(accounts.length).toBeGreaterThan(0)

        // Check for specific test account balances
        const checkingAccount = accounts.find((acc: any) =>
          acc.account_type_name.toLowerCase().includes('checking'),
        )
        expect(checkingAccount).toBeDefined()
        expect(checkingAccount.balance).toBeGreaterThanOrEqual(0)
      })
    })

    test('should have valid account type relationships', async () => {
      await runStaticTest('Account type validation', async db => {
        const accounts = db.prepare(
          `
          SELECT a.*, at.name as account_type_name, at.category
          FROM accounts a
          JOIN account_types at ON a.account_type_id = at.id
        `,
        )

        expect(accounts.length).toBeGreaterThan(0)

        // All accounts should have valid types
        accounts.forEach(account => {
          expect(account.account_type_name).toBeDefined()
          expect(account.category).toMatch(/deposit|credit|investment/)
        })
      })
    })
  })

  describe('Transaction History', () => {
    test('should have transaction records', async () => {
      await runStaticTest('Transaction existence check', async db => {
        const transactions = db
          .prepare('SELECT * FROM transactions LIMIT 10')
          .all()
        expect(transactions.length).toBeGreaterThan(0)

        // Check transaction structure
        transactions.forEach(transaction => {
          expect(transaction.amount).toBeDefined()
          expect(transaction.transaction_date).toBeDefined()
          expect(transaction.status).toBeDefined()
        })
      })
    })

    test('should have valid transaction types', async () => {
      await runStaticTest('Transaction type validation', async db => {
        const transactions = db.prepare(
          `
          SELECT t.*, tt.name as transaction_type_name, tt.category
          FROM transactions t
          JOIN transaction_types tt ON t.transaction_type_id = tt.id
          LIMIT 10
        `,
        )

        expect(transactions.length).toBeGreaterThan(0)

        // All transactions should have valid types
        transactions.forEach(transaction => {
          expect(transaction.transaction_type_name).toBeDefined()
          expect(transaction.category).toMatch(/debit|credit|transfer/)
        })
      })
    })
  })

  describe('Business Logic Validation', () => {
    test('should maintain account balance consistency', async () => {
      await runStaticTest('Balance consistency check', async db => {
        const accounts = db.prepare('SELECT * FROM accounts').all()

        accounts.forEach(account => {
          // Available balance should not exceed actual balance
          expect(account.available_balance).toBeLessThanOrEqual(account.balance)

          // Balances should be valid numbers
          expect(typeof account.balance).toBe('number')
          expect(typeof account.available_balance).toBe('number')
          expect(account.balance).not.toBeNaN()
          expect(account.available_balance).not.toBeNaN()
        })
      })
    })

    test('should have valid foreign key relationships', async () => {
      await runStaticTest('Foreign key validation', async db => {
        // Test user-account relationships
        const orphanedAccounts = db.prepare(
          `
          SELECT a.* FROM accounts a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE u.id IS NULL
        `,
        )

        expect(orphanedAccounts.length).toBe(0)

        // Test account-transaction relationships
        const orphanedTransactions = db.prepare(
          `
          SELECT t.* FROM transactions t
          LEFT JOIN accounts a ON t.from_account_id = a.id OR t.to_account_id = a.id
          WHERE (t.from_account_id IS NOT NULL AND t.from_account_id NOT IN (SELECT id FROM accounts))
             OR (t.to_account_id IS NOT NULL AND t.to_account_id NOT IN (SELECT id FROM accounts))
        `,
        )

        expect(orphanedTransactions.length).toBe(0)
      })
    })
  })

  describe('Data Integrity', () => {
    test('should have consistent session data', async () => {
      await runStaticTest('Session data validation', async db => {
        const sessions = db.prepare('SELECT * FROM sessions').all()

        if (sessions.length > 0) {
          sessions.forEach(session => {
            expect(session.session_id).toBeDefined()
            expect(session.user_id).toBeDefined()
            expect(session.status).toMatch(/active|paused|completed/)

            // Check user relationship
            const user = db
              .prepare('SELECT * FROM users WHERE id = ?')
              .get(session.user_id)
            expect(user).toBeDefined()
          })
        }
      })
    })

    test('should have valid bill data', async () => {
      await runStaticTest('Bill data validation', async db => {
        const bills = db.prepare('SELECT * FROM bills').all()

        if (bills.length > 0) {
          bills.forEach(bill => {
            expect(bill.amount).toBeGreaterThan(0)
            expect(bill.due_date).toBeDefined()
            expect(bill.status).toMatch(/pending|paid|overdue|cancelled|failed/)

            // Check user relationship
            const user = db
              .prepare('SELECT * FROM users WHERE id = ?')
              .get(bill.user_id)
            expect(user).toBeDefined()
          })
        }
      })
    })
  })

  describe('Advanced Account Operations', () => {
    test('should handle account status transitions correctly', async () => {
      await runStaticTest('Account status validation', async db => {
        const accounts = db.prepare('SELECT * FROM accounts').all()

        accounts.forEach(account => {
          expect(['active', 'frozen', 'closed']).toContain(account.status)

          // Closed accounts should have zero available balance
          if (account.status === 'closed') {
            expect(account.available_balance).toBe(0)
          }

          // Frozen accounts should maintain their balance
          if (account.status === 'frozen') {
            expect(account.balance).toBeGreaterThanOrEqual(0)
          }
        })
      })
    })

    test('should validate account number formats', async () => {
      await runStaticTest('Account number format validation', async db => {
        const accounts = db.prepare('SELECT account_number FROM accounts').all()

        accounts.forEach(account => {
          // Account numbers should be numeric strings
          expect(account.account_number).toMatch(/^\d+$/)
          expect(account.account_number.length).toBeGreaterThanOrEqual(8)
          expect(account.account_number.length).toBeLessThanOrEqual(20)
        })
      })
    })

    test('should handle overdraft protection correctly', async () => {
      await runStaticTest('Overdraft protection validation', async db => {
        const accounts = db.prepare(
          `
          SELECT a.*, at.name as account_type_name 
          FROM accounts a 
          JOIN account_types at ON a.account_type_id = at.id
        `,
        )

        accounts.forEach(account => {
          // Credit cards should allow negative balances
          if (account.account_type_name.toLowerCase().includes('credit')) {
            expect(account.balance).toBeLessThanOrEqual(0)
          } else {
            // Regular accounts should have non-negative balances
            expect(account.balance).toBeGreaterThanOrEqual(0)
          }
        })
      })
    })

    test('should validate account ownership relationships', async () => {
      await runStaticTest('Account ownership validation', async db => {
        const accountOwnership = db.prepare(
          `
          SELECT a.id, a.user_id, u.username, u.full_name
          FROM accounts a
          JOIN users u ON a.user_id = u.id
        `,
        )

        expect(accountOwnership.length).toBeGreaterThan(0)

        accountOwnership.forEach(ownership => {
          expect(ownership.user_id).toBeGreaterThan(0)
          expect(ownership.username).toBeDefined()
          expect(ownership.full_name).toBeDefined()
        })
      })
    })

    test('should handle account type restrictions', async () => {
      await runStaticTest('Account type restrictions validation', async db => {
        const accountTypes = db.prepare('SELECT * FROM account_types').all()

        accountTypes.forEach(accountType => {
          expect(accountType.code).toBeDefined()
          expect(accountType.name).toBeDefined()
          expect(accountType.max_accounts_per_user).toBeGreaterThan(0)
          expect(accountType.max_accounts_per_user).toBeLessThanOrEqual(5)
        })
      })
    })
  })

  describe('Transaction Validation', () => {
    test('should validate transaction amounts', async () => {
      await runStaticTest('Transaction amount validation', async db => {
        const transactions = db.prepare('SELECT * FROM transactions').all()

        transactions.forEach(transaction => {
          expect(transaction.amount).toBeGreaterThan(0)
          expect(typeof transaction.amount).toBe('number')
          expect(Number.isFinite(transaction.amount)).toBe(true)
        })
      })
    })

    test('should validate transaction statuses', async () => {
      await runStaticTest('Transaction status validation', async db => {
        const transactions = db.prepare('SELECT status FROM transactions').all()

        transactions.forEach(transaction => {
          expect(['success', 'failed', 'pending', 'cancelled']).toContain(
            transaction.status,
          )
        })
      })
    })

    test('should validate transaction timestamps', async () => {
      await runStaticTest('Transaction timestamp validation', async db => {
        const transactions = db.prepare(
          `
          SELECT transaction_date, created_at, updated_at 
          FROM transactions 
          LIMIT 10
        `,
        )

        transactions.forEach(transaction => {
          if (transaction.transaction_date) {
            expect(
              new Date(transaction.transaction_date).getTime(),
            ).not.toBeNaN()
          }
          expect(new Date(transaction.created_at).getTime()).not.toBeNaN()
          expect(new Date(transaction.updated_at).getTime()).not.toBeNaN()
        })
      })
    })

    test('should validate transaction account relationships', async () => {
      await runStaticTest(
        'Transaction account relationship validation',
        async db => {
          const transactions = db.prepare(
            `
          SELECT t.*, 
                 fa.account_number as from_account_number,
                 ta.account_number as to_account_number
          FROM transactions t
          LEFT JOIN accounts fa ON t.from_account_id = fa.id
          LEFT JOIN accounts ta ON t.to_account_id = ta.id
        `,
          )

          transactions.forEach(transaction => {
            // At least one account should be involved
            expect(
              transaction.from_account_id || transaction.to_account_id,
            ).toBeTruthy()

            // If accounts exist, they should be valid
            if (transaction.from_account_id) {
              expect(transaction.from_account_number).toBeDefined()
            }
            if (transaction.to_account_id) {
              expect(transaction.to_account_number).toBeDefined()
            }
          })
        },
      )
    })

    test('should validate transaction type relationships', async () => {
      await runStaticTest(
        'Transaction type relationship validation',
        async db => {
          const transactions = db
            .prepare(
              `
          SELECT t.*, tt.name as transaction_type_name, tt.category
          FROM transactions t
          JOIN transaction_types tt ON t.transaction_type_id = tt.id
        `,
            )
            .all()

          transactions.forEach(transaction => {
            expect(transaction.transaction_type_name).toBeDefined()
            expect(['debit', 'credit', 'transfer']).toContain(
              transaction.category,
            )
          })
        },
      )
    })
  })

  describe('Credit Card Operations', () => {
    test('should validate credit card data', async () => {
      await runStaticTest('Credit card data validation', async db => {
        const creditCards = db.prepare('SELECT * FROM credit_cards').all()

        if (creditCards.length > 0) {
          creditCards.forEach(card => {
            expect(card.card_number).toMatch(/^\d{16}$/)
            expect(card.last_four_digits).toMatch(/^\d{4}$/)
            expect(card.cvv).toMatch(/^\d{3}$/)
            expect(card.expiry_date).toMatch(/^\d{2}\/\d{2}$/)
            expect(card.credit_limit).toBeGreaterThan(0)
            expect(card.current_balance).toBeLessThanOrEqual(card.credit_limit)
            expect(card.available_credit).toBeGreaterThanOrEqual(0)
          })
        }
      })
    })

    test('should validate credit card statuses', async () => {
      await runStaticTest('Credit card status validation', async db => {
        const creditCards = db.prepare('SELECT status FROM credit_cards').all()

        if (creditCards.length > 0) {
          creditCards.forEach(card => {
            expect(['active', 'suspended', 'closed', 'expired']).toContain(
              card.status,
            )
          })
        }
      })
    })

    test('should validate credit card user relationships', async () => {
      await runStaticTest(
        'Credit card user relationship validation',
        async db => {
          const creditCardUsers = db
            .prepare(
              `
          SELECT cc.*, u.username, u.full_name
          FROM credit_cards cc
          JOIN users u ON cc.user_id = u.id
        `,
            )
            .all()

          if (creditCardUsers.length > 0) {
            creditCardUsers.forEach(card => {
              expect(card.user_id).toBeGreaterThan(0)
              expect(card.username).toBeDefined()
              expect(card.full_name).toBeDefined()
            })
          }
        },
      )
    })
  })

  describe('Beneficiary Management', () => {
    test('should validate beneficiary data integrity', async () => {
      await runStaticTest('Beneficiary data validation', async db => {
        const beneficiaries = db.prepare('SELECT * FROM beneficiaries').all()

        if (beneficiaries.length > 0) {
          beneficiaries.forEach(beneficiary => {
            expect(beneficiary.name).toBeDefined()
            expect(beneficiary.account_number).toMatch(/^\d+$/)
            expect(['checking', 'savings', 'business']).toContain(
              beneficiary.account_type,
            )
            expect(['active', 'inactive']).toContain(beneficiary.status)
          })
        }
      })
    })

    test('should validate beneficiary user relationships', async () => {
      await runStaticTest(
        'Beneficiary user relationship validation',
        async db => {
          const beneficiaryUsers = db.prepare(
            `
          SELECT b.*, u.username
          FROM beneficiaries b
          JOIN users u ON b.user_id = u.id
        `,
          )

          if (beneficiaryUsers.length > 0) {
            beneficiaryUsers.forEach(beneficiary => {
              expect(beneficiary.user_id).toBeGreaterThan(0)
              expect(beneficiary.username).toBeDefined()
            })
          }
        },
      )
    })
  })

  describe('Bill and Biller Management', () => {
    test('should validate biller data', async () => {
      await runStaticTest('Biller data validation', async db => {
        const billers = db.prepare('SELECT * FROM billers').all()

        billers.forEach(biller => {
          expect(biller.name).toBeDefined()
          expect(biller.code).toBeDefined()
          expect([
            'utility',
            'insurance',
            'subscription',
            'loan',
            'other',
          ]).toContain(biller.category)
          expect([0, 1]).toContain(biller.is_active)
        })
      })
    })

    test('should validate bill data', async () => {
      await runStaticTest('Bill data validation', async db => {
        const bills = db.prepare('SELECT * FROM bills').all()

        if (bills.length > 0) {
          bills.forEach(bill => {
            expect(bill.amount).toBeGreaterThan(0)
            expect([
              'pending',
              'paid',
              'overdue',
              'cancelled',
              'failed',
            ]).toContain(bill.status)
            expect(bill.due_date).toBeDefined()
            expect(new Date(bill.due_date).getTime()).not.toBeNaN()
          })
        }
      })
    })

    test('should validate bill user relationships', async () => {
      await runStaticTest('Bill user relationship validation', async db => {
        const billUsers = db.prepare(
          `
          SELECT b.*, u.username, bl.name as biller_name
          FROM bills b
          JOIN users u ON b.user_id = u.id
          JOIN billers bl ON b.biller_id = bl.id
        `,
        )

        if (billUsers.length > 0) {
          billUsers.forEach(bill => {
            expect(bill.user_id).toBeGreaterThan(0)
            expect(bill.biller_id).toBeGreaterThan(0)
            expect(bill.username).toBeDefined()
            expect(bill.biller_name).toBeDefined()
          })
        }
      })
    })
  })

  describe('Zelle Operations', () => {
    test('should validate Zelle user data', async () => {
      await runStaticTest('Zelle user validation', async db => {
        const zelleUsers = db.prepare(
          `
          SELECT u.*, u.is_zelle_user
          FROM users u
          WHERE u.is_zelle_user = 1
        `,
        )

        if (zelleUsers.length > 0) {
          zelleUsers.forEach(user => {
            expect(user.is_zelle_user).toBe(1)
            expect(user.phone_number).toBeDefined()
            expect(user.email).toBeDefined()
          })
        }
      })
    })

    test('should validate Zelle contacts', async () => {
      await runStaticTest('Zelle contacts validation', async db => {
        const zelleContacts = db.prepare('SELECT * FROM zelle_contacts').all()

        if (zelleContacts.length > 0) {
          zelleContacts.forEach(contact => {
            expect(contact.contact_name).toBeDefined()
            expect(contact.contact_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
            expect(contact.contact_phone).toMatch(/^\d{3}-\d{3}-\d{4}$/)
          })
        }
      })
    })
  })

  describe('Scheduled Transactions', () => {
    test('should validate scheduled transaction data', async () => {
      await runStaticTest('Scheduled transaction validation', async db => {
        const scheduledTxs = db.prepare('SELECT * FROM scheduled_transactions')

        if (scheduledTxs.length > 0) {
          scheduledTxs.forEach(tx => {
            expect(tx.amount).toBeGreaterThan(0)
            expect(['scheduled', 'processed', 'cancelled', 'failed']).toContain(
              tx.status,
            )
            expect(tx.scheduled_date).toBeDefined()
            expect(new Date(tx.scheduled_date).getTime()).not.toBeNaN()

            if (tx.is_recurring) {
              expect(['daily', 'weekly', 'monthly', 'yearly']).toContain(
                tx.recurrence_frequency,
              )
            }
          })
        }
      })
    })
  })

  describe('Notifications', () => {
    test('should validate notification data', async () => {
      await runStaticTest('Notification validation', async db => {
        const notifications = db.prepare('SELECT * FROM notifications').all()

        if (notifications.length > 0) {
          notifications.forEach(notification => {
            expect(notification.title).toBeDefined()
            expect(notification.message).toBeDefined()
            expect(['info', 'warning', 'error', 'success']).toContain(
              notification.type,
            )
            expect([0, 1]).toContain(notification.is_read)
            expect(new Date(notification.created_at).getTime()).not.toBeNaN()
          })
        }
      })
    })
  })

  describe('System Configuration', () => {
    test('should validate system configuration', async () => {
      await runStaticTest('System configuration validation', async db => {
        const configs = db.prepare('SELECT * FROM system_config').all()

        if (configs.length > 0) {
          configs.forEach(config => {
            expect(config.key).toBeDefined()
            expect(config.value).toBeDefined()
            expect(['string', 'number', 'boolean', 'json']).toContain(
              config.type,
            )
          })
        }
      })
    })
  })

  describe('Error Codes', () => {
    test('should validate error codes', async () => {
      await runStaticTest('Error codes validation', async db => {
        const errorCodes = db.prepare('SELECT * FROM error_codes').all()

        if (errorCodes.length > 0) {
          errorCodes.forEach(error => {
            expect(error.code).toBeDefined()
            expect(error.message).toBeDefined()
            expect([
              'user_error',
              'system_error',
              'validation_error',
            ]).toContain(error.category)
          })
        }
      })
    })
  })

  describe('Performance Tests', () => {
    test('should handle large queries efficiently', async () => {
      await runStaticTest('Query performance test', async db => {
        const startTime = Date.now()

        // Run a complex query
        const result = db.prepare(
          `
          SELECT 
            u.username,
            u.full_name,
            COUNT(a.id) as account_count,
            SUM(a.balance) as total_balance,
            COUNT(t.id) as transaction_count
          FROM users u
          LEFT JOIN accounts a ON u.id = a.user_id
          LEFT JOIN transactions t ON a.id = t.from_account_id OR a.id = t.to_account_id
          GROUP BY u.id, u.username, u.full_name
          ORDER BY total_balance DESC
        `,
        )

        const duration = Date.now() - startTime

        expect(result.length).toBeGreaterThan(0)
        expect(duration).toBeLessThan(1000) // Should complete within 1 second
      })
    })

    test('should handle complex joins efficiently', async () => {
      await runStaticTest('Complex join performance test', async db => {
        const startTime = Date.now()

        const result = db
          .prepare(
            `
          SELECT 
            u.username,
            u.full_name,
            at.name as account_type,
            a.account_number,
            a.balance,
            COUNT(t.id) as transaction_count,
            SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END) as total_success_amount
          FROM users u
          JOIN accounts a ON u.id = a.user_id
          JOIN account_types at ON a.account_type_id = at.id
          LEFT JOIN transactions t ON a.id = t.from_account_id OR a.id = t.to_account_id
          GROUP BY u.id, a.id, at.id
          HAVING transaction_count > 0
          ORDER BY total_success_amount DESC
        `,
          )
          .all()

        const duration = Date.now() - startTime

        expect(result.length).toBeGreaterThan(0)
        expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
      })
    })

    test('should handle aggregation queries efficiently', async () => {
      await runStaticTest('Aggregation performance test', async db => {
        const startTime = Date.now()

        const result = db
          .prepare(
            `
          SELECT 
            DATE(transaction_date) as date,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount,
            MIN(amount) as min_amount,
            MAX(amount) as max_amount
          FROM transactions
          WHERE transaction_date IS NOT NULL
          GROUP BY DATE(transaction_date)
          ORDER BY date DESC
          LIMIT 30
        `,
          )
          .all()

        const duration = Date.now() - startTime

        expect(Array.isArray(result)).toBe(true)
        expect(duration).toBeLessThan(1500) // Should complete within 1.5 seconds
      })
    })
  })
})

describe('Static Test Suite Performance', () => {
  test('should run all static tests efficiently', async () => {
    const tests = [
      {
        name: 'Quick user check',
        fn: async (db: Database.Database) => {
          const userCount = db
            .prepare('SELECT COUNT(*) as count FROM users')
            .get()
          expect(userCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Quick account check',
        fn: async (db: Database.Database) => {
          const accountCount = db
            .prepare('SELECT COUNT(*) as count FROM accounts')
            .get()
          expect(accountCount.count).toBeGreaterThan(0)
        },
      },
      {
        name: 'Quick transaction check',
        fn: async (db: Database.Database) => {
          const transactionCount = db
            .prepare('SELECT COUNT(*) as count FROM transactions')
            .get()
          expect(transactionCount.count).toBeGreaterThan(0)
        },
      },
    ]

    const results = await runStaticTests(tests)

    // All tests should pass
    results.forEach(result => {
      expect(result.success).toBe(true)
    })

    // Total execution time should be reasonable
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    expect(totalDuration).toBeLessThan(5000) // Should complete within 5 seconds
  })
})
