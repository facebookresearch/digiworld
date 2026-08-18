import { setupFreshDB, teardownTestDB } from '../helpers'
import { createBankingStore } from '@/models/BankingStore'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import Database from 'better-sqlite3'

let db: Database.Database

beforeAll(async () => {
  db = setupFreshDB()
  await mutations.initializeDatabase()
})

afterAll(() => {
  teardownTestDB(db)
})

describe('Performance and Stress Tests', () => {
  let store: ReturnType<typeof createBankingStore>

  beforeEach(async () => {
    store = createBankingStore()
    await store.initializeSession({
      userId: 1,
      seed: 12345,
      volatility: 0.1,
      enableInterest: true,
      enableRecurringBills: true,
      enableMonthlyFees: true,
    })
  })

  describe('Database Performance Tests', () => {
    test('should handle large number of users efficiently', async () => {
      const startTime = Date.now()
      const userCount = 100

      // Create many users
      const users = []
      for (let i = 0; i < userCount; i++) {
        const user = await queries.createUser({
          username: `perfuser${i}`,
          password: 'password123',
          email: `perfuser${i}@example.com`,
          accountTierId: 1,
        })
        users.push(user)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(users.length).toBe(userCount)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds

      // Test query performance
      const queryStartTime = Date.now()
      const allUsers = await queries.getAllUsers()
      const queryEndTime = Date.now()
      const queryDuration = queryEndTime - queryStartTime

      expect(allUsers.length).toBeGreaterThanOrEqual(userCount)
      expect(queryDuration).toBeLessThan(1000) // Query should complete within 1 second
    })

    test('should handle large number of accounts efficiently', async () => {
      const user = store.users[0]
      const accountTypes = await queries.getAccountTypes()
      const checkingType = accountTypes.find(t => t.code === 'checking')

      if (checkingType) {
        const startTime = Date.now()
        const accountCount = 50

        // Create many accounts
        const accounts = []
        for (let i = 0; i < accountCount; i++) {
          const account = await queries.createAccount({
            userId: user.id,
            accountTypeId: checkingType.id,
            accountName: `Performance Account ${i}`,
            initialDeposit: 1000,
          })
          accounts.push(account)
        }

        const endTime = Date.now()
        const duration = endTime - startTime

        expect(accounts.length).toBe(accountCount)
        expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

        // Test query performance
        const queryStartTime = Date.now()
        const userAccounts = await queries.getAccountsByUserId(user.id)
        const queryEndTime = Date.now()
        const queryDuration = queryEndTime - queryStartTime

        expect(userAccounts.length).toBeGreaterThanOrEqual(accountCount)
        expect(queryDuration).toBeLessThan(500) // Query should complete within 500ms
      }
    })

    test('should handle large number of transactions efficiently', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const startTime = Date.now()
        const transactionCount = 200

        // Create many transactions
        const transactions = []
        for (let i = 0; i < transactionCount; i++) {
          const transaction = await store.deposit(account.id, 10)
          transactions.push(transaction)
        }

        const endTime = Date.now()
        const duration = endTime - startTime

        expect(transactions.length).toBe(transactionCount)
        expect(duration).toBeLessThan(15000) // Should complete within 15 seconds

        // Test query performance
        const queryStartTime = Date.now()
        await store.loadTransactions()
        const queryEndTime = Date.now()
        const queryDuration = queryEndTime - queryStartTime

        expect(store.transactions.length).toBeGreaterThanOrEqual(
          transactionCount,
        )
        expect(queryDuration).toBeLessThan(1000) // Query should complete within 1 second
      }
    })

    test('should handle complex queries efficiently', async () => {
      const startTime = Date.now()

      // Run complex aggregation query
      const result = db
        .prepare(
          `
        SELECT 
          u.username,
          u.full_name,
          COUNT(a.id) as account_count,
          SUM(a.balance) as total_balance,
          COUNT(t.id) as transaction_count,
          SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END) as total_transaction_amount
        FROM users u
        LEFT JOIN accounts a ON u.id = a.user_id
        LEFT JOIN transactions t ON a.id = t.from_account_id OR a.id = t.to_account_id
        GROUP BY u.id, u.username, u.full_name
        HAVING account_count > 0
        ORDER BY total_balance DESC
      `,
        )
        .all()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds

      // Verify result structure
      result.forEach(row => {
        expect(row.username).toBeDefined()
        expect(row.account_count).toBeGreaterThan(0)
        expect(row.total_balance).toBeGreaterThanOrEqual(0)
        expect(row.transaction_count).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Concurrent Operations Stress Tests', () => {
    test('should handle concurrent deposits on same account', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const initialBalance = account.balance
        const concurrentOperations = 50
        const depositAmount = 10

        const startTime = Date.now()

        // Perform concurrent deposits
        const operations = []
        for (let i = 0; i < concurrentOperations; i++) {
          operations.push(store.deposit(account.id, depositAmount))
        }

        await Promise.all(operations)

        const endTime = Date.now()
        const duration = endTime - startTime

        // Verify final balance
        const finalAccount = store.accounts.find(a => a.id === account.id)
        const expectedBalance =
          initialBalance + concurrentOperations * depositAmount
        expect(finalAccount?.balance).toBe(expectedBalance)

        expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
      }
    })

    test('should handle concurrent transfers between accounts', async () => {
      const fromAccount = store.getAccountsByType('checking')[0]
      const toAccount = store.getAccountsByType('savings')[0]

      if (fromAccount && toAccount) {
        const initialFromBalance = fromAccount.balance
        const initialToBalance = toAccount.balance
        const concurrentOperations = 20
        const transferAmount = 5

        const startTime = Date.now()

        // Perform concurrent transfers
        const operations = []
        for (let i = 0; i < concurrentOperations; i++) {
          operations.push(
            store.transferFunds(fromAccount.id, toAccount.id, transferAmount),
          )
        }

        await Promise.all(operations)

        const endTime = Date.now()
        const duration = endTime - startTime

        // Verify final balances
        const finalFromAccount = store.accounts.find(
          a => a.id === fromAccount.id,
        )
        const finalToAccount = store.accounts.find(a => a.id === toAccount.id)
        const expectedFromBalance =
          initialFromBalance - concurrentOperations * transferAmount
        const expectedToBalance =
          initialToBalance + concurrentOperations * transferAmount

        expect(finalFromAccount?.balance).toBe(expectedFromBalance)
        expect(finalToAccount?.balance).toBe(expectedToBalance)

        expect(duration).toBeLessThan(15000) // Should complete within 15 seconds
      }
    })

    test('should handle concurrent user operations', async () => {
      const startTime = Date.now()
      const concurrentOperations = 30

      // Perform concurrent user operations
      const operations = []
      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          queries.createUser({
            username: `concurrentuser${i}`,
            password: 'password123',
            email: `concurrentuser${i}@example.com`,
            accountTierId: 1,
          }),
        )
      }

      const users = await Promise.all(operations)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(users.length).toBe(concurrentOperations)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds

      // Verify all users were created successfully
      users.forEach(user => {
        expect(user.id).toBeDefined()
        expect(user.username).toMatch(/^concurrentuser\d+$/)
      })
    })
  })

  describe('Memory Usage Tests', () => {
    test('should handle large transaction history without memory issues', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const transactionCount = 1000

        // Create many transactions
        for (let i = 0; i < transactionCount; i++) {
          await store.deposit(account.id, 1)
        }

        // Load all transactions
        await store.loadTransactions()

        // Verify we can still perform operations
        const finalAccount = store.accounts.find(a => a.id === account.id)
        expect(finalAccount?.balance).toBe(account.balance + transactionCount)

        // Verify transaction count
        expect(store.transactions.length).toBeGreaterThanOrEqual(
          transactionCount,
        )
      }
    })

    test('should handle large number of beneficiaries efficiently', async () => {
      const user = store.users[0] || { id: 1 }
      const beneficiaryCount = 100

      // Create many beneficiaries
      const beneficiaries = []
      for (let i = 0; i < beneficiaryCount; i++) {
        const beneficiary = await queries.addBeneficiary({
          userId: user.id,
          name: `Beneficiary ${i}`,
          accountNumber: `123456789${i}`,
          accountType: 'checking',
          bankName: 'Test Bank',
        })
        beneficiaries.push(beneficiary)
      }

      // Load beneficiaries
      await store.loadBeneficiaries()

      expect(beneficiaries.length).toBe(beneficiaryCount)
      expect(store.beneficiaries.length).toBeGreaterThanOrEqual(
        beneficiaryCount,
      )
    })
  })

  describe('Database Connection Stress Tests', () => {
    test('should handle multiple database connections efficiently', async () => {
      const startTime = Date.now()
      const connectionCount = 10

      // Create multiple stores (each with its own DB connection)
      const stores = []
      for (let i = 0; i < connectionCount; i++) {
        const newStore = createBankingStore()
        await newStore.initializeSession({
          userId: 1,
          seed: 12345 + i,
        })
        stores.push(newStore)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(stores.length).toBe(connectionCount)
      expect(duration).toBeLessThan(15000) // Should complete within 15 seconds

      // Verify all stores are functional
      stores.forEach(store => {
        expect(store.accounts.length).toBeGreaterThan(0)
        expect(store.users.length).toBeGreaterThan(0)
      })
    })

    test('should handle rapid database operations', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const startTime = Date.now()
        const operationCount = 100

        // Perform rapid operations
        for (let i = 0; i < operationCount; i++) {
          await store.deposit(account.id, 1)
          await store.withdraw(account.id, 1)
        }

        const endTime = Date.now()
        const duration = endTime - startTime

        // Balance should be unchanged
        const finalAccount = store.accounts.find(a => a.id === account.id)
        expect(finalAccount?.balance).toBe(account.balance)

        expect(duration).toBeLessThan(20000) // Should complete within 20 seconds
      }
    })
  })

  describe('Query Performance Tests', () => {
    test('should handle complex joins efficiently', async () => {
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
          SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END) as total_success_amount,
          AVG(CASE WHEN t.status = 'success' THEN t.amount ELSE NULL END) as avg_transaction_amount
        FROM users u
        JOIN accounts a ON u.id = a.user_id
        JOIN account_types at ON a.account_type_id = at.id
        LEFT JOIN transactions t ON a.id = t.from_account_id OR a.id = t.to_account_id
        GROUP BY u.id, a.id, at.id
        HAVING transaction_count > 0
        ORDER BY total_success_amount DESC
        LIMIT 50
      `,
        )
        .all()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds

      // Verify result structure
      result.forEach(row => {
        expect(row.username).toBeDefined()
        expect(row.account_type).toBeDefined()
        expect(row.transaction_count).toBeGreaterThan(0)
        expect(row.total_success_amount).toBeGreaterThanOrEqual(0)
      })
    })

    test('should handle date range queries efficiently', async () => {
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
          AND transaction_date >= date('now', '-30 days')
        GROUP BY DATE(transaction_date)
        ORDER BY date DESC
      `,
        )
        .all()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(Array.isArray(result)).toBe(true)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds

      // Verify result structure
      result.forEach(row => {
        expect(row.date).toBeDefined()
        expect(row.transaction_count).toBeGreaterThan(0)
        expect(row.total_amount).toBeGreaterThan(0)
        expect(row.avg_amount).toBeGreaterThan(0)
      })
    })

    test('should handle aggregation queries efficiently', async () => {
      const startTime = Date.now()

      const result = db
        .prepare(
          `
        SELECT 
          tt.name as transaction_type,
          tt.category,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
        FROM transactions t
        JOIN transaction_types tt ON t.transaction_type_id = tt.id
        GROUP BY tt.id, tt.name, tt.category
        ORDER BY total_amount DESC
      `,
        )
        .all()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1500) // Should complete within 1.5 seconds

      // Verify result structure
      result.forEach(row => {
        expect(row.transaction_type).toBeDefined()
        expect(row.category).toBeDefined()
        expect(row.transaction_count).toBeGreaterThan(0)
        expect(row.total_amount).toBeGreaterThan(0)
        expect(row.success_count + row.failed_count).toBe(row.transaction_count)
      })
    })
  })

  describe('Stress Test Scenarios', () => {
    test('should handle mixed workload efficiently', async () => {
      const startTime = Date.now()
      const operationCount = 50

      // Mix of different operations
      const operations = []
      for (let i = 0; i < operationCount; i++) {
        const account = store.getAccountsByType('checking')[0]
        if (account) {
          switch (i % 4) {
            case 0:
              operations.push(store.deposit(account.id, 10))
              break
            case 1:
              operations.push(store.withdraw(account.id, 5))
              break
            case 2: {
              // ← Added braces here
              const toAccount = store.getAccountsByType('savings')[0]
              if (toAccount) {
                operations.push(
                  store.transferFunds(account.id, toAccount.id, 5),
                )
              }
              break
            } // ← Close braces here
            case 3:
              operations.push(store.loadTransactions())
              break
          }
        }
      }

      await Promise.all(operations)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
    })
  })

  test('should handle peak load simulation', async () => {
    const startTime = Date.now()
    const peakOperations = 200

    // Simulate peak load with many small operations
    const operations = []
    for (let i = 0; i < peakOperations; i++) {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        operations.push(store.deposit(account.id, 1))
      }
    }

    await Promise.all(operations)

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(60000) // Should complete within 60 seconds

    // Verify system is still responsive
    const finalAccount = store.accounts.find(
      a => a.id === store.getAccountsByType('checking')[0]?.id,
    )
    expect(finalAccount?.balance).toBeGreaterThan(0)
  })
})
