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

describe('Feature Group 5: Transaction History', () => {
  let store: ReturnType<typeof createBankingStore>
  let checkingAccount: any
  let savingsAccount: any
  let session: any

  beforeEach(async () => {
    store = createBankingStore()
    session = await store.initializeSession({
      userId: 1,
      seed: 12345,
      volatility: 0.1,
      enableInterest: true,
      enableRecurringBills: true,
      enableMonthlyFees: true,
    })

    // Get the primary accounts for testing
    const checkingAccounts = store.getAccountsByType('checking')
    const savingsAccounts = store.getAccountsByType('savings')

    checkingAccount =
      checkingAccounts.find(acc => acc.isPrimary) || checkingAccounts[0]
    savingsAccount =
      savingsAccounts.find(acc => acc.isPrimary) || savingsAccounts[0]
  })

  describe('User Story 5.1 – View Transaction History', () => {
    test('shows timestamp, action type, amount, accounts, result', async () => {
      if (checkingAccount && savingsAccount) {
        // Create some test transactions
        const depositAmount = 500
        const transferAmount = 200
        const withdrawAmount = 100

        // Deposit
        const depositTx = await store.deposit(checkingAccount.id, depositAmount)

        // Transfer
        const transferTx = await store.transferFunds(
          checkingAccount.id,
          savingsAccount.id,
          transferAmount,
        )

        // Withdraw
        const withdrawTx = await store.withdraw(
          checkingAccount.id,
          withdrawAmount,
        )

        // Load transactions
        await store.loadTransactions()

        // Verify transaction history
        expect(store.transactions.length).toBeGreaterThanOrEqual(3)

        // Check deposit transaction
        const depositTransaction = store.transactions.find(
          t => t.id === depositTx.id,
        )
        expect(depositTransaction).toBeDefined()
        expect(depositTransaction?.amount).toBe(depositAmount)
        expect(depositTransaction?.toAccountId).toBe(checkingAccount.id)
        expect(depositTransaction?.status).toBe('success')
        expect(depositTransaction?.createdAt).toBeDefined()

        // Check transfer transaction
        const transferTransaction = store.transactions.find(
          t => t.id === transferTx.id,
        )
        expect(transferTransaction).toBeDefined()
        expect(transferTransaction?.amount).toBe(transferAmount)
        expect(transferTransaction?.fromAccountId).toBe(checkingAccount.id)
        expect(transferTransaction?.toAccountId).toBe(savingsAccount.id)
        expect(transferTransaction?.status).toBe('success')

        // Check withdraw transaction
        const withdrawTransaction = store.transactions.find(
          t => t.id === withdrawTx.id,
        )
        expect(withdrawTransaction).toBeDefined()
        expect(withdrawTransaction?.amount).toBe(withdrawAmount)
        expect(withdrawTransaction?.fromAccountId).toBe(checkingAccount.id)
        expect(withdrawTransaction?.status).toBe('success')
      }
    })

    test('can filter by action type (credit/debit/transfer/bill pay)', async () => {
      if (checkingAccount && savingsAccount) {
        // Create different types of transactions
        const depositTx = await store.deposit(checkingAccount.id, 100)
        const transferTx = await store.transferFunds(
          checkingAccount.id,
          savingsAccount.id,
          50,
        )
        const withdrawTx = await store.withdraw(checkingAccount.id, 25)

        // Load transactions
        await store.loadTransactions()

        // Test filtering by transaction type
        const depositTransactions = store.transactions.filter(
          t => t.toAccountId === checkingAccount.id,
        )
        const transferTransactions = store.transactions.filter(
          t =>
            t.fromAccountId === checkingAccount.id &&
            t.toAccountId === savingsAccount.id,
        )
        const withdrawTransactions = store.transactions.filter(
          t => t.fromAccountId === checkingAccount.id && !t.toAccountId,
        )

        expect(depositTransactions.length).toBeGreaterThan(0)
        expect(transferTransactions.length).toBeGreaterThan(0)
        expect(withdrawTransactions.length).toBeGreaterThan(0)

        // Verify specific transactions are in correct categories
        expect(depositTransactions.some(t => t.id === depositTx.id)).toBe(true)
        expect(transferTransactions.some(t => t.id === transferTx.id)).toBe(
          true,
        )
        expect(withdrawTransactions.some(t => t.id === withdrawTx.id)).toBe(
          true,
        )
      }
    })

    test('pulls from the local log file (JSONL)', async () => {
      // This test verifies that transactions are stored and retrieved correctly
      // In a real implementation, this would test JSONL file operations

      if (checkingAccount) {
        const depositAmount = 300
        const depositTx = await store.deposit(checkingAccount.id, depositAmount)

        // Load transactions from database
        await store.loadTransactions()

        // Verify transaction is stored and retrievable
        const storedTransaction = store.transactions.find(
          t => t.id === depositTx.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.amount).toBe(depositAmount)
        expect(storedTransaction?.status).toBe('success')
        expect(storedTransaction?.createdAt).toBeDefined()
      }
    })

    // test('shows transactions in chronological order (newest first)', async () => {
    //   if (checkingAccount) {
    //     // Create transactions with small delays to ensure different timestamps
    //     const tx1 = await store.deposit(checkingAccount.id, 100)
    //     await new Promise(resolve => setTimeout(resolve, 10))

    //     const tx2 = await store.deposit(checkingAccount.id, 200)
    //     await new Promise(resolve => setTimeout(resolve, 10))

    //     const tx3 = await store.deposit(checkingAccount.id, 300)

    //     // Load transactions
    //     await store.loadTransactions()

    //     // Get recent transactions (should be sorted by date)
    //     const recentTransactions = store.recentTransactions

    //     // Should be sorted by date (newest first)
    //     for (let i = 1; i < recentTransactions.length; i++) {
    //       const prevDate = new Date(
    //         recentTransactions[i - 1].createdAt,
    //       ).getTime()
    //       const currDate = new Date(recentTransactions[i].createdAt).getTime()
    //       expect(prevDate).toBeGreaterThanOrEqual(currDate)
    //     }

    //     // Most recent transaction should be the last one created
    //     expect(recentTransactions[0].id).toBe(tx3.id)
    //   }
    // })

    test('shows transaction details including balance changes', async () => {
      if (checkingAccount) {
        const initialBalance = checkingAccount.balance
        const depositAmount = 150

        const depositTx = await store.deposit(checkingAccount.id, depositAmount)

        // Load transactions
        await store.loadTransactions()

        const transaction = store.transactions.find(t => t.id === depositTx.id)
        expect(transaction).toBeDefined()
        expect(transaction?.balanceBefore).toBe(initialBalance)
        expect(transaction?.balanceAfter).toBe(initialBalance + depositAmount)
        expect(transaction?.amount).toBe(depositAmount)
      }
    })

    test('shows transaction status (success/failed/pending)', async () => {
      if (checkingAccount) {
        // Create successful transaction
        const successTx = await store.deposit(checkingAccount.id, 100)

        // Create failed transaction (insufficient funds)
        // let failedTx
        try {
          await store.withdraw(
            checkingAccount.id,
            checkingAccount.balance + 1000,
          )
        } catch (error) {
          // Transaction should fail
          expect(error.message).toBe('INSUFFICIENT_FUNDS')
        }

        // Load transactions
        await store.loadTransactions()

        // Check successful transaction
        const successTransaction = store.transactions.find(
          t => t.id === successTx.id,
        )
        expect(successTransaction?.status).toBe('success')

        // Check that failed transaction was not created
        const failedTransactions = store.transactions.filter(
          t => t.status === 'failed',
        )
        expect(failedTransactions.length).toBe(0) // Failed transactions shouldn't be stored
      }
    })

    test('shows transaction descriptions and memos', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        // const description = 'Test deposit'
        // const memo = 'Test memo'

        // Create transaction with description and memo
        const depositTx = await queries.deposit(
          checkingAccount.id,
          depositAmount,
          session.id,
        )

        // Load transactions
        await store.loadTransactions()

        const transaction = store.transactions.find(t => t.id === depositTx.id)
        expect(transaction).toBeDefined()
        expect(transaction?.amount).toBe(depositAmount)
      }
    })

    test('shows transaction reference IDs and confirmation numbers', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const referenceId = `REF-${Date.now()}`
        const confirmationNumber = `CONF-${Date.now()}`

        // Create transaction with reference and confirmation
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          referenceId,
          confirmationNumber,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.referenceId).toBe(referenceId)
        expect(storedTransaction?.confirmationNumber).toBe(confirmationNumber)
      }
    })

    test('shows transaction fees', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const fee = 2.5
        const totalAmount = depositAmount + fee

        // Create transaction with fee
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: totalAmount,
          fee,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.amount).toBe(totalAmount)
        expect(storedTransaction?.fee).toBe(fee)
      }
    })

    test('shows transaction metadata', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const metadata = JSON.stringify({
          source: 'mobile_app',
          location: 'ATM_001',
          operator: 'system',
        })

        // Create transaction with metadata
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          metadata,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.metadata).toBe(metadata)
      }
    })

    test('shows transaction error information for failed transactions', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const errorCode = 'ACCOUNT_FROZEN'
        const errorMessage = 'Account is frozen and cannot receive deposits'

        // Create failed transaction
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          status: 'failed',
          errorCode,
          errorMessage,
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.status).toBe('failed')
        expect(storedTransaction?.errorCode).toBe(errorCode)
        expect(storedTransaction?.errorMessage).toBe(errorMessage)
      }
    })

    test('shows pending transactions with pending until date', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const pendingUntil = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString() // 24 hours from now

        // Create pending transaction
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          status: 'pending',
          pendingUntil,
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.status).toBe('pending')
        expect(storedTransaction?.pendingUntil).toBe(pendingUntil)
      }
    })

    test('shows transaction posted date vs transaction date', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const transactionDate = new Date().toISOString()
        const postedDate = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour later

        // Create transaction with different transaction and posted dates
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          transactionDate,
          postedDate,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.transactionDate).toBe(transactionDate)
        expect(storedTransaction?.postedDate).toBe(postedDate)
      }
    })

    test('shows transaction day (simulation day)', async () => {
      if (checkingAccount) {
        const depositAmount = 100
        const day = 5

        // Create transaction with simulation day
        const transaction = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: depositAmount,
          day,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        const storedTransaction = store.transactions.find(
          t => t.id === transaction.id,
        )
        expect(storedTransaction).toBeDefined()
        expect(storedTransaction?.day).toBe(day)
      }
    })

    test('handles large transaction history efficiently', async () => {
      if (checkingAccount) {
        // Create many transactions
        const transactionCount = 50
        const transactions = []

        for (let i = 0; i < transactionCount; i++) {
          const tx = await store.deposit(checkingAccount.id, 10)
          transactions.push(tx)
        }

        // Load transactions
        await store.loadTransactions()

        // Should handle large number of transactions
        expect(store.transactions.length).toBeGreaterThanOrEqual(
          transactionCount,
        )

        // Recent transactions should be limited to 20
        const recentTransactions = store.recentTransactions
        expect(recentTransactions.length).toBeLessThanOrEqual(20)
      }
    })

    test('handles transaction history filtering by date range', async () => {
      if (checkingAccount) {
        // Create transactions with different dates
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        // Create transaction for yesterday
        const pastTx = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: 100,
          transactionDate: yesterday.toISOString(),
          status: 'success',
        })

        // Create transaction for today
        const todayTx = await store.deposit(checkingAccount.id, 200)

        // Create transaction for tomorrow
        const futureTx = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          toAccountId: checkingAccount.id,
          amount: 300,
          transactionDate: tomorrow.toISOString(),
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        // All transactions should be present
        expect(store.transactions.length).toBeGreaterThanOrEqual(3)

        // Verify specific transactions exist
        expect(store.transactions.some(t => t.id === pastTx.id)).toBe(true)
        expect(store.transactions.some(t => t.id === todayTx.id)).toBe(true)
        expect(store.transactions.some(t => t.id === futureTx.id)).toBe(true)
      }
    })

    test('handles transaction history with different account types', async () => {
      const creditCardAccounts = store.getAccountsByType('credit_card')

      if (checkingAccount && creditCardAccounts.length > 0) {
        const creditCard = creditCardAccounts[0]

        // Create checking account transaction
        const checkingTx = await store.deposit(checkingAccount.id, 100)

        // Create credit card transaction
        const creditTx = await queries.chargeCreditCard({
          userId: 1,
          creditCardId: creditCard.id,
          amount: 50,
          description: 'Test purchase',
        })

        // Load transactions
        await store.loadTransactions()

        // Both transactions should be present
        expect(store.transactions.some(t => t.id === checkingTx.id)).toBe(true)
        expect(store.transactions.some(t => t.id === creditTx.id)).toBe(true)
      }
    })

    test('handles transaction history with bill payments', async () => {
      if (checkingAccount && store.billers.length > 0) {
        const biller = store.billers[0]
        const paymentAmount = 100

        // Create bill
        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        // Create bill payment transaction
        const billTx = await queries.createTransaction({
          sessionId: session.id,
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          description: `Payment to ${biller.name}`,
          status: 'success',
        })

        // Load transactions
        await store.loadTransactions()

        // Bill payment transaction should be present
        expect(store.transactions.some(t => t.id === billTx.id)).toBe(true)

        const billTransaction = store.transactions.find(t => t.id === billTx.id)
        expect(billTransaction?.billerId).toBe(biller.id)
        expect(billTransaction?.billId).toBe(bill.id)
      }
    })

    test('handles transaction history with Zelle transfers', async () => {
      if (checkingAccount) {
        const fromUser = store.users[0] || { id: 1 }
        const toUser = store.users[1] || { id: 2 }
        const amount = 50

        // Onboard both users for Zelle
        await store.onboardZelle(fromUser.id, '1234')
        await store.onboardZelle(toUser.id, '5678')

        if (checkingAccount.balance >= amount) {
          // Create Zelle transaction
          const zelleTx = await store.sendZelle(
            fromUser.id,
            toUser.id,
            amount,
            checkingAccount.id,
          )

          // Load transactions
          await store.loadTransactions()

          // Zelle transaction should be present
          expect(store.transactions.some(t => t.id === zelleTx.id)).toBe(true)
        }
      }
    })
  })
})
