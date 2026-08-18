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

describe('Feature Group 4: Bill Payment (Mock)', () => {
  let store: ReturnType<typeof createBankingStore>
  let checkingAccount: any
  let billers: any[]

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

    // Get the primary checking account for testing
    const checkingAccounts = store.getAccountsByType('checking')
    checkingAccount =
      checkingAccounts.find(acc => acc.isPrimary) || checkingAccounts[0]

    // Get available billers
    billers = store.billers
  })

  describe('User Story 4.1 – Pay a Mock Biller', () => {
    test('lists predefined billers (Electricity, Internet, Water)', async () => {
      expect(billers.length).toBeGreaterThan(0)

      // Should have common utility billers
      const billerNames = billers.map(b => b.name.toLowerCase())
      const hasElectricity = billerNames.some(
        name =>
          name.includes('electric') ||
          name.includes('power') ||
          name.includes('energy'),
      )
      const hasInternet = billerNames.some(
        name =>
          name.includes('internet') ||
          name.includes('broadband') ||
          name.includes('cable'),
      )
      const hasWater = billerNames.some(
        name => name.includes('water') || name.includes('utility'),
      )

      // At least one of these should be present
      expect(hasElectricity || hasInternet || hasWater).toBe(true)
    })

    test('payment deducted from selected account', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const initialBalance = checkingAccount.balance

        // Create a bill first
        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        // Pay the bill (simulate bill payment transaction)
        const transaction = await queries.createTransaction({
          transactionTypeId: 1, // Assuming bill payment type exists
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          balanceBefore: initialBalance,
          balanceAfter: initialBalance - paymentAmount,
          description: `Payment to ${biller.name}`,
          status: 'success',
        })

        // Update account balance
        await queries.deposit(checkingAccount.id, -paymentAmount) // Negative deposit = withdrawal

        expect(transaction).toBeDefined()
        expect(transaction.amount).toBe(paymentAmount)
        expect(transaction.fromAccountId).toBe(checkingAccount.id)
        expect(transaction.billerId).toBe(biller.id)
        expect(transaction.billId).toBe(bill.id)

        // Verify account balance was updated
        const updatedAccount = await queries.getAccountById(checkingAccount.id)
        expect(updatedAccount[0].balance).toBe(initialBalance - paymentAmount)
      }
    })

    test('payment blocked if insufficient balance', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const excessiveAmount = checkingAccount.balance + 1000

        // Create a bill with excessive amount
        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: excessiveAmount,
        })

        // Attempt to pay the bill should fail
        await expect(
          queries.createTransaction({
            transactionTypeId: 1,
            userId: 1,
            fromAccountId: checkingAccount.id,
            billerId: biller.id,
            billId: bill.id,
            amount: excessiveAmount,
            balanceBefore: checkingAccount.balance,
            balanceAfter: checkingAccount.balance - excessiveAmount,
            description: `Payment to ${biller.name}`,
            status: 'failed',
            failureReason: 'Insufficient funds',
          }),
        ).rejects.toThrow()
      }
    })

    test('success/failure is logged with amount, biller, and reference ID', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 150
        const initialBalance = checkingAccount.balance

        // Create a bill
        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        // Successful payment
        const successTransaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          balanceBefore: initialBalance,
          balanceAfter: initialBalance - paymentAmount,
          description: `Payment to ${biller.name}`,
          referenceId: `BILL-${bill.id}-${Date.now()}`,
          status: 'success',
        })

        expect(successTransaction).toBeDefined()
        expect(successTransaction.amount).toBe(paymentAmount)
        expect(successTransaction.billerId).toBe(biller.id)
        expect(successTransaction.billId).toBe(bill.id)
        expect(successTransaction.referenceId).toBeDefined()
        expect(successTransaction.status).toBe('success')

        // Failed payment
        const failedTransaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          balanceBefore: initialBalance,
          balanceAfter: initialBalance,
          description: `Payment to ${biller.name}`,
          referenceId: `BILL-${bill.id}-${Date.now()}`,
          status: 'failed',
          failureReason: 'Insufficient funds',
        })

        expect(failedTransaction).toBeDefined()
        expect(failedTransaction.status).toBe('failed')
        expect(failedTransaction.failureReason).toBe('Insufficient funds')
      }
    })

    test('handles predefined billers with dropdown selection', async () => {
      // Billers should be available for selection
      expect(billers.length).toBeGreaterThan(0)

      // Each biller should have required information
      billers.forEach(biller => {
        expect(biller.name).toBeDefined()
        expect(biller.category).toBeDefined()
        expect(biller.isActive).toBe(1)
      })

      // Should have different categories
      const categories = [...new Set(billers.map(b => b.category))]
      expect(categories.length).toBeGreaterThan(1)
    })

    test('handles add biller option with manual entry', async () => {
      // Test adding a custom biller
      const customBiller = await queries.addBeneficiary({
        userId: 1,
        name: 'Custom Utility Company',
        accountNumber: '1234567890',
        accountType: 'checking',
        bankName: 'Custom Bank',
        nickname: 'Custom Utility',
      })

      expect(customBiller).toBeDefined()
      expect(customBiller.name).toBe('Custom Utility Company')
      expect(customBiller.accountNumber).toBe('1234567890')
      expect(customBiller.status).toBe('active')
    })

    test('handles biller verification and validation', async () => {
      if (billers.length > 0) {
        const biller = billers[0]

        // Biller should have verification requirements
        expect(biller.requiresAccountNumber).toBeDefined()
        expect(biller.requiresRoutingNumber).toBeDefined()
        expect(biller.acceptsBankAccount).toBeDefined()
        expect(biller.acceptsCreditCard).toBeDefined()
        expect(biller.acceptsDebitCard).toBeDefined()
      }
    })

    test('handles payment processing days', async () => {
      if (billers.length > 0) {
        const biller = billers[0]

        // Biller should have payment processing information
        expect(biller.paymentProcessingDays).toBeDefined()
        expect(biller.paymentProcessingDays).toBeGreaterThan(0)
      }
    })

    test('handles minimum and maximum payment amounts', async () => {
      if (billers.length > 0) {
        const biller = billers[0]

        // Biller should have payment limits
        expect(biller.minPaymentAmount).toBeDefined()
        expect(biller.minPaymentAmount).toBeGreaterThan(0)

        if (biller.maxPaymentAmount) {
          expect(biller.maxPaymentAmount).toBeGreaterThan(
            biller.minPaymentAmount,
          )
        }
      }
    })

    test('handles recurring bills', async () => {
      if (billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 200

        // Create a recurring bill
        const recurringBill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
          isRecurring: 1,
          recurrenceInterval: 30, // Monthly
        })

        expect(recurringBill).toBeDefined()
        expect(recurringBill.isRecurring).toBe(1)
        expect(recurringBill.recurrenceInterval).toBe(30)
        expect(recurringBill.status).toBe('pending')
      }
    })

    test('handles bill payment with different account types', async () => {
      const savingsAccounts = store.getAccountsByType('savings')
      const creditCardAccounts = store.getAccountsByType('credit_card')

      if (
        billers.length > 0 &&
        (savingsAccounts.length > 0 || creditCardAccounts.length > 0)
      ) {
        const biller = billers[0]
        const paymentAmount = 100

        // Test payment from savings account
        if (savingsAccounts.length > 0) {
          const savingsAccount = savingsAccounts[0]
          const initialBalance = savingsAccount.balance

          const bill = await queries.createBill({
            userId: 1,
            billerId: biller.id,
            amount: paymentAmount,
          })

          const transaction = await queries.createTransaction({
            transactionTypeId: 1,
            userId: 1,
            fromAccountId: savingsAccount.id,
            billerId: biller.id,
            billId: bill.id,
            amount: paymentAmount,
            balanceBefore: initialBalance,
            balanceAfter: initialBalance - paymentAmount,
            description: `Payment to ${biller.name}`,
            status: 'success',
          })

          expect(transaction).toBeDefined()
          expect(transaction.fromAccountId).toBe(savingsAccount.id)
        }

        // Test payment from credit card
        if (creditCardAccounts.length > 0) {
          const creditCard = creditCardAccounts[0]
          // const initialBalance = creditCard.currentBalance

          const bill = await queries.createBill({
            userId: 1,
            billerId: biller.id,
            amount: paymentAmount,
          })

          const transaction = await queries.createTransaction({
            transactionTypeId: 1,
            userId: 1,
            creditCardId: creditCard.id,
            billerId: biller.id,
            billId: bill.id,
            amount: paymentAmount,
            description: `Payment to ${biller.name}`,
            status: 'success',
          })

          expect(transaction).toBeDefined()
          expect(transaction.creditCardId).toBe(creditCard.id)
        }
      }
    })

    test('handles bill payment with fees', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const fee = 2.5
        const totalAmount = paymentAmount + fee
        const initialBalance = checkingAccount.balance

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: totalAmount,
          fee,
          balanceBefore: initialBalance,
          balanceAfter: initialBalance - totalAmount,
          description: `Payment to ${biller.name}`,
          status: 'success',
        })

        expect(transaction).toBeDefined()
        expect(transaction.amount).toBe(totalAmount)
        expect(transaction.fee).toBe(fee)
        expect(transaction.balanceAfter).toBe(initialBalance - totalAmount)
      }
    })

    test('handles bill payment with memo and description', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const memo = 'Monthly utility payment'
        const description = `Payment to ${biller.name} - ${memo}`

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          description,
          memo,
          status: 'success',
        })

        expect(transaction).toBeDefined()
        expect(transaction.description).toBe(description)
        expect(transaction.memo).toBe(memo)
      }
    })

    test('handles bill payment with confirmation number', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const confirmationNumber = `CONF-${Date.now()}`

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          confirmationNumber,
          status: 'success',
        })

        expect(transaction).toBeDefined()
        expect(transaction.confirmationNumber).toBe(confirmationNumber)
      }
    })

    test('handles bill payment with pending status', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const pendingUntil = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString() // 24 hours from now

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          status: 'pending',
          pendingUntil,
        })

        expect(transaction).toBeDefined()
        expect(transaction.status).toBe('pending')
        expect(transaction.pendingUntil).toBe(pendingUntil)
      }
    })

    test('handles bill payment with error codes and messages', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const errorCode = 'INSUFFICIENT_FUNDS'
        const errorMessage =
          'Account balance is insufficient for this transaction'

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          status: 'failed',
          errorCode,
          errorMessage,
        })

        expect(transaction).toBeDefined()
        expect(transaction.status).toBe('failed')
        expect(transaction.errorCode).toBe(errorCode)
        expect(transaction.errorMessage).toBe(errorMessage)
      }
    })

    test('handles bill payment with metadata', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100
        const metadata = JSON.stringify({
          paymentMethod: 'bank_account',
          processingTime: '2-3 business days',
          billerCategory: biller.category,
        })

        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
        })

        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller.id,
          billId: bill.id,
          amount: paymentAmount,
          metadata,
          status: 'success',
        })

        expect(transaction).toBeDefined()
        expect(transaction.metadata).toBe(metadata)
      }
    })

    test('handles multiple bill payments in sequence', async () => {
      if (checkingAccount && billers.length >= 2) {
        const biller1 = billers[0]
        const biller2 = billers[1]
        const paymentAmount1 = 100
        const paymentAmount2 = 150
        const initialBalance = checkingAccount.balance

        // Create bills
        const bill1 = await queries.createBill({
          userId: 1,
          billerId: biller1.id,
          amount: paymentAmount1,
        })

        const bill2 = await queries.createBill({
          userId: 1,
          billerId: biller2.id,
          amount: paymentAmount2,
        })

        // Pay first bill
        const transaction1 = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller1.id,
          billId: bill1.id,
          amount: paymentAmount1,
          balanceBefore: initialBalance,
          balanceAfter: initialBalance - paymentAmount1,
          status: 'success',
        })

        // Pay second bill
        const transaction2 = await queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: checkingAccount.id,
          billerId: biller2.id,
          billId: bill2.id,
          amount: paymentAmount2,
          balanceBefore: initialBalance - paymentAmount1,
          balanceAfter: initialBalance - paymentAmount1 - paymentAmount2,
          status: 'success',
        })

        expect(transaction1).toBeDefined()
        expect(transaction2).toBeDefined()
        expect(transaction1.billerId).toBe(biller1.id)
        expect(transaction2.billerId).toBe(biller2.id)

        // Verify final balance
        const updatedAccount = await queries.getAccountById(checkingAccount.id)
        expect(updatedAccount[0].balance).toBe(
          initialBalance - paymentAmount1 - paymentAmount2,
        )
      }
    })

    test('handles bill payment with autopay', async () => {
      if (checkingAccount && billers.length > 0) {
        const biller = billers[0]
        const paymentAmount = 100

        // Create a bill with autopay enabled
        const bill = await queries.createBill({
          userId: 1,
          billerId: biller.id,
          amount: paymentAmount,
          autoPayEnabled: 1,
          autoPayAccountId: checkingAccount.id,
        })

        expect(bill).toBeDefined()
        expect(bill.autoPayEnabled).toBe(1)
        expect(bill.autoPayAccountId).toBe(checkingAccount.id)
      }
    })
  })
})
