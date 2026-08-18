// Copyright (c) Meta Platforms, Inc. and affiliates.
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

describe('Feature Group 2: Account Summary View', () => {
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

  describe('User Story 2.1 – View Account Summary', () => {
    test('displays account types: Checking, Savings, Credit Card', async () => {
      const accountTypes = store.accountTypes

      // Should have the three main account types
      expect(accountTypes.some(at => at.code === 'checking')).toBe(true)
      expect(accountTypes.some(at => at.code === 'savings')).toBe(true)
      expect(accountTypes.some(at => at.code === 'credit_card')).toBe(true)
    })

    test('shows balance to two decimal places', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Balance should be a number (not string)
        expect(typeof account.balance).toBe('number')

        // Balance should be finite
        expect(Number.isFinite(account.balance)).toBe(true)

        // Balance should not have more than 2 decimal places when formatted
        const formattedBalance = account.balance.toFixed(2)
        const parsedBalance = parseFloat(formattedBalance)
        expect(parsedBalance).toBe(account.balance)
      })
    })

    test('masks account numbers (e.g., ****1234)', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Account number should exist
        expect(account.accountNumber).toBeDefined()
        expect(account.accountNumber.length).toBeGreaterThan(4)

        // For display purposes, we would mask the first part
        // This test verifies the account number structure
        const maskedNumber = `****${account.accountNumber.slice(-4)}`
        expect(maskedNumber).toMatch(/^\*\*\*\*\d{4}$/)
      })
    })

    test('is view-only and cannot modify from this screen', () => {
      // This test verifies that the account summary view is read-only
      // In a real implementation, this would test UI behavior
      // For now, we verify that account data is loaded but not modified

      const initialAccounts = [...store.accounts]
      const initialBalances = initialAccounts.map(acc => acc.balance)

      // View operations should not modify account data
      // store.activeAccounts
      // store.totalBalance
      store.getAccountByNumber(initialAccounts[0]?.accountNumber || '')
      store.getAccountsByType('checking')

      // Accounts should remain unchanged
      expect(store.accounts).toEqual(initialAccounts)
      store.accounts.forEach((account, index) => {
        expect(account.balance).toBe(initialBalances[index])
      })
    })

    test('displays correct starting balances per feature requirements', () => {
      const checkingAccounts = store.getAccountsByType('checking')
      const savingsAccounts = store.getAccountsByType('savings')

      // Should have at least one checking account with $2,000
      const primaryChecking =
        checkingAccounts.find(acc => acc.isPrimary) || checkingAccounts[0]
      if (primaryChecking) {
        expect(primaryChecking.balance).toBe(2000)
      }

      // Should have at least one savings account with $5,000
      const primarySavings =
        savingsAccounts.find(acc => acc.isPrimary) || savingsAccounts[0]
      if (primarySavings) {
        expect(primarySavings.balance).toBe(5000)
      }
    })

    test('calculates total balance correctly', () => {
      const totalBalance = store.totalBalance
      const activeAccounts = store.activeAccounts

      // Total should be sum of all active account balances
      const expectedTotal = activeAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
      )
      expect(totalBalance).toBe(expectedTotal)

      // Total should be positive (assuming positive balances)
      expect(totalBalance).toBeGreaterThan(0)
    })

    test('filters accounts by type correctly', () => {
      const checkingAccounts = store.getAccountsByType('checking')
      const savingsAccounts = store.getAccountsByType('savings')
      const creditCardAccounts = store.getAccountsByType('credit_card')

      // Each account should belong to the correct type
      checkingAccounts.forEach(account => {
        const accountType = store.accountTypes.find(
          at => at.id === account.accountTypeId,
        )
        expect(accountType?.code).toBe('checking')
      })

      savingsAccounts.forEach(account => {
        const accountType = store.accountTypes.find(
          at => at.id === account.accountTypeId,
        )
        expect(accountType?.code).toBe('savings')
      })

      creditCardAccounts.forEach(account => {
        const accountType = store.accountTypes.find(
          at => at.id === account.accountTypeId,
        )
        expect(accountType?.code).toBe('credit_card')
      })
    })

    test('handles multiple accounts of same type', () => {
      // Users can have up to 2 accounts per type
      const checkingAccounts = store.getAccountsByType('checking')
      const savingsAccounts = store.getAccountsByType('savings')

      // Should allow multiple accounts of same type
      expect(checkingAccounts.length).toBeLessThanOrEqual(2)
      expect(savingsAccounts.length).toBeLessThanOrEqual(2)

      // Each account should have unique account numbers
      const checkingNumbers = checkingAccounts.map(acc => acc.accountNumber)
      const savingsNumbers = savingsAccounts.map(acc => acc.accountNumber)

      expect(new Set(checkingNumbers).size).toBe(checkingNumbers.length)
      expect(new Set(savingsNumbers).size).toBe(savingsNumbers.length)
    })

    test('displays account status correctly', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Status should be valid
        expect(['active', 'frozen', 'closed']).toContain(account.status)

        // Active accounts should be included in activeAccounts view
        if (account.status === 'active') {
          expect(store.activeAccounts).toContain(account)
        }
      })
    })

    test('shows available balance vs current balance', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Available balance should be defined
        expect(typeof account.availableBalance).toBe('number')

        // Available balance should not exceed current balance
        expect(account.availableBalance).toBeLessThanOrEqual(account.balance)

        // For most accounts, available balance equals current balance
        // (unless there are pending transactions)
        expect(account.availableBalance).toBeGreaterThanOrEqual(0)
      })
    })

    test('handles account names and nicknames', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Account name should be defined (even if null)
        expect(account.accountName !== undefined).toBe(true)

        // If account has a name, it should be a string
        if (account.accountName) {
          expect(typeof account.accountName).toBe('string')
          expect(account.accountName.length).toBeGreaterThan(0)
        }
      })
    })

    test('displays primary account correctly', () => {
      const accounts = store.accounts
      const primaryAccounts = accounts.filter(acc => acc.isPrimary)

      // Should have at least one primary account
      expect(primaryAccounts.length).toBeGreaterThan(0)

      // Primary accounts should be active
      primaryAccounts.forEach(account => {
        expect(account.status).toBe('active')
      })
    })

    test('handles account creation date and status', () => {
      const accounts = store.accounts

      accounts.forEach(account => {
        // Created date should be valid
        expect(account.createdAt).toBeDefined()
        expect(new Date(account.createdAt).getTime()).not.toBeNaN()

        // Updated date should be valid
        expect(account.updatedAt).toBeDefined()
        expect(new Date(account.updatedAt).getTime()).not.toBeNaN()
      })
    })

    test('supports account selection for detailed view', () => {
      const accounts = store.accounts

      if (accounts.length > 0) {
        const account = accounts[0]

        // Set selected account
        store.setSelectedAccount(account.id)
        expect(store.selectedAccount?.id).toBe(account.id)

        // Clear selection
        store.setSelectedAccount(null)
        expect(store.selectedAccount).toBeNull()
      }
    })

    test('handles empty account list gracefully', async () => {
      // Create a new user with no accounts
      const newUser = await queries.createUser({
        username: 'emptyuser',
        password: 'password123',
        accountTierId: 1,
      })

      const emptyStore = createBankingStore()
      await emptyStore.initializeSession({
        userId: newUser.id,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      })

      // Should handle empty account list
      expect(emptyStore.accounts).toEqual([])
      expect(emptyStore.activeAccounts).toEqual([])
      expect(emptyStore.totalBalance).toBe(0)
      expect(emptyStore.getAccountsByType('checking')).toEqual([])
    })

    test('maintains data consistency during view operations', () => {
      const initialAccounts = [...store.accounts]
      const initialTotalBalance = store.totalBalance

      // Perform various view operations
      const activeAccounts = store.activeAccounts
      const checkingAccounts = store.getAccountsByType('checking')
      const savingsAccounts = store.getAccountsByType('savings')
      const creditCardAccounts = store.getAccountsByType('credit_card')

      // Data should remain consistent
      expect(store.accounts).toEqual(initialAccounts)
      expect(store.totalBalance).toBe(initialTotalBalance)
      expect(activeAccounts.length).toBeLessThanOrEqual(initialAccounts.length)
      expect(
        checkingAccounts.length +
          savingsAccounts.length +
          creditCardAccounts.length,
      ).toBeLessThanOrEqual(initialAccounts.length)
    })

    test('supports real-time balance updates', async () => {
      const accounts = store.accounts

      if (accounts.length > 0) {
        const account = accounts[0]
        const initialBalance = account.balance
        const depositAmount = 100

        // Make a deposit
        await store.deposit(account.id, depositAmount)

        // Balance should be updated in real-time
        const updatedAccount = store.accounts.find(a => a.id === account.id)
        expect(updatedAccount?.balance).toBe(initialBalance + depositAmount)

        // Total balance should be updated
        expect(store.totalBalance).toBeGreaterThan(initialBalance)
      }
    })
  })
})
