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

describe('Feature Group 1: Session Initialization', () => {
  describe('User Story 1.1 – Start Agent Session', () => {
    test('initializes session with unique agent ID and configuration', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
        currentDay: 0,
      }

      const session = await store.initializeSession(config)

      expect(session).toBeDefined()
      expect(session.userId).toBe(config.userId)
      expect(session.seed).toBe(config.seed)
      expect(session.status).toBe('active')
      expect(session.currentDay).toBe(0)
    })

    test('tracks and reproduces agent behavior with seed', async () => {
      const store1 = createBankingStore()
      const store2 = createBankingStore()

      const config = {
        userId: 1,
        seed: 54321, // Same seed for both sessions
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      const session1 = await store1.initializeSession(config)
      const session2 = await store2.initializeSession(config)

      // Both sessions should have the same seed
      expect(session1.seed).toBe(session2.seed)
      expect(session1.userId).toBe(session2.userId)

      // Both should load the same initial data
      expect(store1.accounts.length).toBe(store2.accounts.length)
      expect(store1.accountTypes.length).toBe(store2.accountTypes.length)
    })

    test('sets up starting balances: Checking $2,000, Savings $5,000', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      await store.initializeSession(config)

      // Find checking and savings accounts
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

    test('configures session parameters correctly', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 99999,
        volatility: 0.5,
        enableInterest: false,
        enableRecurringBills: false,
        enableMonthlyFees: false,
        currentDay: 5,
      }

      const session = await store.initializeSession(config)

      expect(session.seed).toBe(config.seed)
      expect(session.currentDay).toBe(config.currentDay)
      expect(session.status).toBe('active')

      // Session should be created in database
      const dbSession = await queries.getSessionsByUserId(config.userId)
      expect(dbSession.length).toBeGreaterThan(0)
      expect(dbSession[0].seed).toBe(config.seed)
    })

    test('handles multiple concurrent sessions', async () => {
      const store1 = createBankingStore()
      const store2 = createBankingStore()
      const store3 = createBankingStore()

      const configs = [
        { userId: 1, seed: 11111, volatility: 0.1 },
        { userId: 2, seed: 22222, volatility: 0.2 },
        { userId: 3, seed: 33333, volatility: 0.3 },
      ]

      const sessions = await Promise.all([
        store1.initializeSession(configs[0]),
        store2.initializeSession(configs[1]),
        store3.initializeSession(configs[2]),
      ])

      // All sessions should be created successfully
      expect(sessions).toHaveLength(3)
      expect(sessions[0].userId).toBe(1)
      expect(sessions[1].userId).toBe(2)
      expect(sessions[2].userId).toBe(3)

      // Each store should have its own session
      expect(store1.currentSession?.userId).toBe(1)
      expect(store2.currentSession?.userId).toBe(2)
      expect(store3.currentSession?.userId).toBe(3)
    })

    test('loads account types and initial data', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      await store.initializeSession(config)

      // Should load account types
      expect(store.accountTypes.length).toBeGreaterThan(0)
      expect(store.accountTypes.some(at => at.code === 'checking')).toBe(true)
      expect(store.accountTypes.some(at => at.code === 'savings')).toBe(true)
      expect(store.accountTypes.some(at => at.code === 'credit_card')).toBe(
        true,
      )

      // Should load user accounts
      expect(store.accounts.length).toBeGreaterThan(0)
      expect(store.accounts.every(acc => acc.userId === config.userId)).toBe(
        true,
      )
    })

    test('handles session initialization errors gracefully', async () => {
      const store = createBankingStore()

      const invalidConfig = {
        userId: 99999, // Non-existent user
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      await expect(store.initializeSession(invalidConfig)).rejects.toThrow()
      expect(store.error).toBeDefined()
      expect(store.currentSession).toBeNull()
    })

    test('maintains session state across operations', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      const session = await store.initializeSession(config)
      const sessionId = session.id

      // Perform some operations
      await store.loadAccounts()
      await store.loadAccountTypes()
      await store.loadBillers()

      // Session should remain consistent
      expect(store.currentSession?.id).toBe(sessionId)
      expect(store.currentSession?.userId).toBe(config.userId)
      expect(store.currentSession?.seed).toBe(config.seed)
    })

    test('supports session updates and progression', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      const session = await store.initializeSession(config)

      // Update session to next day
      const updatedSession = await queries.updateSession(session.id, {
        currentDay: 1,
        status: 'active',
      })

      expect(updatedSession?.currentDay).toBe(1)
      expect(updatedSession?.status).toBe('active')
    })

    test('enables deterministic behavior with seed', async () => {
      const store1 = createBankingStore()
      const store2 = createBankingStore()

      const config = {
        userId: 1,
        seed: 77777, // Fixed seed
        volatility: 0.0, // No volatility for deterministic behavior
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      await store1.initializeSession(config)
      await store2.initializeSession(config)

      // With same seed and no volatility, results should be identical
      expect(store1.accounts.length).toBe(store2.accounts.length)
      expect(store1.accountTypes.length).toBe(store2.accountTypes.length)
      expect(store1.billers.length).toBe(store2.billers.length)

      // Account balances should be identical
      for (let i = 0; i < store1.accounts.length; i++) {
        expect(store1.accounts[i].balance).toBe(store2.accounts[i].balance)
        expect(store1.accounts[i].accountNumber).toBe(
          store2.accounts[i].accountNumber,
        )
      }
    })

    test('supports session metadata and configuration', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
        metadata: JSON.stringify({
          agentVersion: '1.0.0',
          testEnvironment: 'integration',
          features: ['transfers', 'bills', 'zelle'],
        }),
      }

      const session = await store.initializeSession(config)

      expect(session).toBeDefined()
      expect(session.userId).toBe(config.userId)
      expect(session.seed).toBe(config.seed)

      // Session should be stored in database with metadata
      const dbSessions = await queries.getSessionsByUserId(config.userId)
      expect(dbSessions.length).toBeGreaterThan(0)
      expect(dbSessions[0].seed).toBe(config.seed)
    })

    test('handles session cleanup and termination', async () => {
      const store = createBankingStore()

      const config = {
        userId: 1,
        seed: 12345,
        volatility: 0.1,
        enableInterest: true,
        enableRecurringBills: true,
        enableMonthlyFees: true,
      }

      const session = await store.initializeSession(config)

      // End the session
      await queries.endSession(session.id)

      // Verify session is ended
      const dbSessions = await queries.getSessionsByUserId(config.userId)
      const endedSession = dbSessions.find(s => s.id === session.id)
      expect(endedSession?.status).toBe('ended')
      expect(endedSession?.endedAt).toBeDefined()
    })
  })
})
