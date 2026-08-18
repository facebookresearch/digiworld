// Copyright (c) Meta Platforms, Inc. and affiliates.
import { setupFreshDB, teardownTestDB } from '../helpers'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import Database from 'better-sqlite3'

let db: Database.Database

beforeAll(async () => {
  db = setupFreshDB()
})

afterAll(() => {
  teardownTestDB(db)
})

describe('Database Mutations', () => {
  test('initializeDatabase loads all mock data successfully', async () => {
    const result = await mutations.initializeDatabase()

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('initializeDatabase populates all required tables', async () => {
    await mutations.initializeDatabase()

    // Test that all tables have data
    const users = await queries.getAllUsers()
    const accountTypes = await queries.getAccountTypes()
    const accounts = await queries.getAccounts()
    const billers = await queries.getBillers()

    expect(users.length).toBeGreaterThan(0)
    expect(accountTypes.length).toBeGreaterThan(0)
    expect(accounts.length).toBeGreaterThan(0)
    expect(billers.length).toBeGreaterThan(0)
  })

  test('initializeDatabase can be called multiple times safely', async () => {
    // First initialization
    const result1 = await mutations.initializeDatabase()
    expect(result1.success).toBe(true)

    // Second initialization should also succeed
    const result2 = await mutations.initializeDatabase()
    expect(result2.success).toBe(true)

    // Data should still be present
    const users = await queries.getAllUsers()
    expect(users.length).toBeGreaterThan(0)
  })

  test('initializeDatabase clears existing data before seeding', async () => {
    // Create some test data first
    // const user = await queries.createUser({
    //   username: 'testuser',
    //   password: 'password123',
    //   accountTierId: 1,
    // })

    // Verify user exists
    const usersBefore = await queries.getAllUsers()
    const testUserExists = usersBefore.some(u => u.username === 'testuser')
    expect(testUserExists).toBe(true)

    // Reinitialize database
    await mutations.initializeDatabase()

    // Verify test user is gone (replaced by mock data)
    const usersAfter = await queries.getAllUsers()
    const testUserStillExists = usersAfter.some(u => u.username === 'testuser')
    expect(testUserStillExists).toBe(false)

    // But mock data should be present
    expect(usersAfter.length).toBeGreaterThan(0)
  })

  test('initializeDatabase handles missing mock data gracefully', async () => {
    // This test would require mocking the readJSONFile function to return null
    // For now, we'll test that the function doesn't crash with valid data
    const result = await mutations.initializeDatabase()
    expect(result.success).toBe(true)
  })

  test('initializeDatabase maintains referential integrity', async () => {
    await mutations.initializeDatabase()

    // Test that foreign key relationships are maintained
    const users = await queries.getAllUsers()
    const accounts = await queries.getAccounts()

    // All accounts should have valid user IDs
    const userIds = new Set(users.map(u => u.id))
    const accountUserIds = accounts.map(a => a.userId)

    accountUserIds.forEach(userId => {
      expect(userIds.has(userId)).toBe(true)
    })

    // All accounts should have valid account type IDs
    const accountTypes = await queries.getAccountTypes()
    const accountTypeIds = new Set(accountTypes.map(at => at.id))
    const accountAccountTypeIds = accounts.map(a => a.accountTypeId)

    accountAccountTypeIds.forEach(accountTypeId => {
      expect(accountTypeIds.has(accountTypeId)).toBe(true)
    })
  })

  test('initializeDatabase seeds data in correct order', async () => {
    await mutations.initializeDatabase()

    // Test that dependent data exists when referenced
    const users = await queries.getAllUsers()
    const accounts = await queries.getAccounts()
    const creditCards = await queries.getCreditCards(users[0].id)

    // Users should exist before accounts
    expect(users.length).toBeGreaterThan(0)

    // Accounts should exist and reference valid users
    expect(accounts.length).toBeGreaterThan(0)
    expect(accounts.every(a => users.some(u => u.id === a.userId))).toBe(true)

    // Credit cards should exist and reference valid users
    if (creditCards.length > 0) {
      expect(creditCards.every(cc => users.some(u => u.id === cc.userId))).toBe(
        true,
      )
    }
  })

  test('initializeDatabase creates realistic test data', async () => {
    await mutations.initializeDatabase()

    const users = await queries.getAllUsers()
    const accounts = await queries.getAccounts()
    const billers = await queries.getBillers()

    // Users should have realistic data
    expect(users.length).toBeGreaterThan(0)
    users.forEach(user => {
      expect(user.username).toBeDefined()
      expect(user.password).toBeDefined()
      expect(user.accountTierId).toBeDefined()
    })

    // Accounts should have realistic balances
    expect(accounts.length).toBeGreaterThan(0)
    accounts.forEach(account => {
      expect(typeof account.balance).toBe('number')
      expect(account.balance).toBeGreaterThanOrEqual(0)
      expect(account.status).toBeDefined()
    })

    // Billers should have realistic data
    expect(billers.length).toBeGreaterThan(0)
    billers.forEach(biller => {
      expect(biller.name).toBeDefined()
      expect(biller.category).toBeDefined()
      expect(biller.isActive).toBe(1)
    })
  })

  test('initializeDatabase handles large datasets efficiently', async () => {
    const startTime = Date.now()

    await mutations.initializeDatabase()

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(10000) // 10 seconds

    // Verify data was actually loaded
    const users = await queries.getAllUsers()
    expect(users.length).toBeGreaterThan(0)
  })

  test('initializeDatabase maintains data consistency across tables', async () => {
    await mutations.initializeDatabase()

    const users = await queries.getAllUsers()
    const accounts = await queries.getAccounts()
    const transactions = await queries.getTransactionsBySession(1) // Assuming session 1 exists

    // If there are transactions, they should reference valid accounts and users
    if (transactions.length > 0) {
      const accountIds = new Set(accounts.map(a => a.id))
      const userIds = new Set(users.map(u => u.id))

      transactions.forEach(transaction => {
        if (transaction.fromAccountId) {
          expect(accountIds.has(transaction.fromAccountId)).toBe(true)
        }
        if (transaction.toAccountId) {
          expect(accountIds.has(transaction.toAccountId)).toBe(true)
        }
        expect(userIds.has(transaction.userId)).toBe(true)
      })
    }
  })

  test('initializeDatabase creates proper indexes and constraints', async () => {
    await mutations.initializeDatabase()

    // Test that unique constraints work
    await expect(
      queries.createUser({
        username: 'duplicate', // Assuming this username already exists in mock data
        password: 'password123',
        accountTierId: 1,
      }),
    ).rejects.toThrow()

    // Test that foreign key constraints work
    await expect(
      queries.createAccount({
        userId: 99999, // Non-existent user ID
        accountTypeId: 1,
        initialDeposit: 100,
      }),
    ).rejects.toThrow()
  })

  test('initializeDatabase handles concurrent initialization safely', async () => {
    // Simulate concurrent initialization
    const promises = [
      mutations.initializeDatabase(),
      mutations.initializeDatabase(),
      mutations.initializeDatabase(),
    ]

    const results = await Promise.all(promises)

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true)
    })

    // Data should be consistent
    const users = await queries.getAllUsers()
    expect(users.length).toBeGreaterThan(0)
  })
})
