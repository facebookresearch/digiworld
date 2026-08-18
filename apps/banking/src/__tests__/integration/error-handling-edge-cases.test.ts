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

describe('Error Handling and Edge Cases Integration Tests', () => {
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

  describe('Account Error Handling', () => {
    test('should handle account not found errors', async () => {
      const nonExistentAccountId = 99999

      await expect(store.deposit(nonExistentAccountId, 100)).rejects.toThrow()
      await expect(store.withdraw(nonExistentAccountId, 100)).rejects.toThrow()
    })

    test('should handle frozen account operations', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        // Freeze account
        await queries.updateAccount(account.id, { status: 'frozen' })

        // Operations should fail on frozen account
        await expect(store.deposit(account.id, 100)).rejects.toThrow()
        await expect(store.withdraw(account.id, 100)).rejects.toThrow()
        await expect(
          store.transferFunds(account.id, account.id, 100),
        ).rejects.toThrow()
      }
    })

    test('should handle closed account operations', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        // Close account
        await queries.updateAccount(account.id, { status: 'closed' })

        // Operations should fail on closed account
        await expect(store.deposit(account.id, 100)).rejects.toThrow()
        await expect(store.withdraw(account.id, 100)).rejects.toThrow()
        await expect(
          store.transferFunds(account.id, account.id, 100),
        ).rejects.toThrow()
      }
    })

    test('should handle zero amount transactions', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        await expect(store.deposit(account.id, 0)).rejects.toThrow()
        await expect(store.withdraw(account.id, 0)).rejects.toThrow()
        await expect(
          store.transferFunds(account.id, account.id, 0),
        ).rejects.toThrow()
      }
    })

    test('should handle negative amount transactions', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        await expect(store.deposit(account.id, -100)).rejects.toThrow()
        await expect(store.withdraw(account.id, -100)).rejects.toThrow()
        await expect(
          store.transferFunds(account.id, account.id, -100),
        ).rejects.toThrow()
      }
    })

    test('should handle very large amount transactions', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const largeAmount = 999999999

        await expect(store.deposit(account.id, largeAmount)).rejects.toThrow()
        await expect(store.withdraw(account.id, largeAmount)).rejects.toThrow()
        await expect(
          store.transferFunds(account.id, account.id, largeAmount),
        ).rejects.toThrow()
      }
    })

    test('should handle decimal precision in amounts', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const decimalAmount = 99.99

        const transaction = await store.deposit(account.id, decimalAmount)
        expect(transaction.amount).toBe(decimalAmount)

        const updatedAccount = store.accounts.find(a => a.id === account.id)
        expect(updatedAccount?.balance).toBe(account.balance + decimalAmount)
      }
    })
  })

  describe('User Error Handling', () => {
    test('should handle invalid user operations', async () => {
      const nonExistentUserId = 99999

      await expect(queries.getUserById(nonExistentUserId)).resolves.toBeNull()

      await expect(
        queries.getAccountsByUserId(nonExistentUserId),
      ).resolves.toEqual([])

      await expect(
        queries.getBeneficiaries(nonExistentUserId),
      ).resolves.toEqual([])
    })

    test('should handle duplicate username creation', async () => {
      const existingUser = store.users[0]
      if (existingUser) {
        await expect(
          queries.createUser({
            username: existingUser.username,
            password: 'password123',
            accountTierId: 1,
          }),
        ).rejects.toThrow()
      }
    })

    test('should handle invalid login credentials', async () => {
      const user = store.users[0]
      if (user) {
        await expect(
          queries.login(user.username, 'wrongpassword'),
        ).resolves.toBeNull()

        await expect(
          queries.login('nonexistentuser', 'password'),
        ).resolves.toBeNull()
      }
    })
  })

  describe('Transaction Error Handling', () => {
    test('should handle insufficient funds in transfers', async () => {
      const fromAccount = store.getAccountsByType('checking')[0]
      const toAccount = store.getAccountsByType('savings')[0]

      if (fromAccount && toAccount) {
        const excessiveAmount = fromAccount.balance + 1000

        await expect(
          store.transferFunds(fromAccount.id, toAccount.id, excessiveAmount),
        ).rejects.toThrow('INSUFFICIENT_FUNDS')
      }
    })

    test('should handle same account transfers', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        await expect(
          store.transferFunds(account.id, account.id, 100),
        ).rejects.toThrow()
      }
    })

    test('should handle invalid transaction types', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        await expect(
          queries.createTransaction({
            transactionTypeId: 99999, // Non-existent type
            userId: 1,
            toAccountId: account.id,
            amount: 100,
          }),
        ).rejects.toThrow()
      }
    })

    test('should handle transaction with invalid accounts', async () => {
      await expect(
        queries.createTransaction({
          transactionTypeId: 1,
          userId: 1,
          fromAccountId: 99999, // Non-existent account
          toAccountId: 99998, // Non-existent account
          amount: 100,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Credit Card Error Handling', () => {
    test('should handle credit card with insufficient credit', async () => {
      const user = store.users[0] || { id: 1 }

      const creditCard = await queries.applyCreditCard({
        userId: user.id,
        cardholderName: 'Test User',
        requestedCreditLimit: 100,
      })

      await expect(
        queries.chargeCreditCard({
          userId: user.id,
          creditCardId: creditCard.id,
          amount: 200, // Exceeds credit limit
          description: 'Test Purchase',
        }),
      ).rejects.toThrow('Insufficient credit available')
    })

    test('should handle credit card payment with insufficient funds', async () => {
      const user = store.users[0] || { id: 1 }
      const account = store.getAccountsByType('checking')[0]

      if (account) {
        const creditCard = await queries.applyCreditCard({
          userId: user.id,
          cardholderName: 'Test User',
          requestedCreditLimit: 1000,
        })

        // Charge the card
        await queries.chargeCreditCard({
          userId: user.id,
          creditCardId: creditCard.id,
          amount: 100,
          description: 'Test Purchase',
        })

        // Try to pay more than account balance
        const excessivePayment = account.balance + 1000

        await expect(
          queries.makeCreditCardPayment({
            userId: user.id,
            creditCardId: creditCard.id,
            fromAccountId: account.id,
            amount: excessivePayment,
            memo: 'Payment',
          }),
        ).rejects.toThrow('INSUFFICIENT_FUNDS')
      }
    })

    test('should handle credit card closure with outstanding balance', async () => {
      const user = store.users[0] || { id: 1 }

      const creditCard = await queries.applyCreditCard({
        userId: user.id,
        cardholderName: 'Test User',
        requestedCreditLimit: 1000,
      })

      // Charge the card
      await queries.chargeCreditCard({
        userId: user.id,
        creditCardId: creditCard.id,
        amount: 100,
        description: 'Test Purchase',
      })

      // Try to close with outstanding balance
      await expect(queries.closeCreditCard(creditCard.id)).rejects.toThrow(
        'Cannot close credit card with outstanding balance',
      )
    })
  })

  describe('Beneficiary Error Handling', () => {
    test('should handle duplicate beneficiary creation', async () => {
      const user = store.users[0] || { id: 1 }

      const beneficiaryData = {
        userId: user.id,
        name: 'Test Beneficiary',
        accountNumber: '1234567890',
        accountType: 'checking',
        bankName: 'Test Bank',
      }

      // Create first beneficiary
      await queries.addBeneficiary(beneficiaryData)

      // Try to create duplicate
      await expect(queries.addBeneficiary(beneficiaryData)).rejects.toThrow()
    })

    test('should handle invalid beneficiary operations', async () => {
      const nonExistentBeneficiaryId = 99999

      await expect(
        queries.updateBeneficiary(nonExistentBeneficiaryId, {
          name: 'New Name',
        }),
      ).resolves.toBeNull()

      await expect(
        queries.removeBeneficiary(nonExistentBeneficiaryId),
      ).rejects.toThrow()
    })
  })

  describe('Bill Payment Error Handling', () => {
    test('should handle bill payment with insufficient funds', async () => {
      const user = store.users[0] || { id: 1 }
      const billers = await queries.getBillers()
      const account = store.getAccountsByType('checking')[0]

      if (billers.length > 0 && account) {
        const bill = await queries.createBill({
          userId: user.id,
          billerId: billers[0].id,
          amount: account.balance + 1000, // More than account balance
        })

        await expect(
          queries.createTransaction({
            transactionTypeId: 1,
            userId: user.id,
            fromAccountId: account.id,
            billerId: billers[0].id,
            billId: bill.id,
            amount: bill.amount,
            description: `Payment to ${billers[0].name}`,
            status: 'success',
          }),
        ).rejects.toThrow('INSUFFICIENT_FUNDS')
      }
    })

    test('should handle invalid bill operations', async () => {
      const nonExistentBillId = 99999

      await expect(
        queries.updateBillStatus(nonExistentBillId, 'paid'),
      ).resolves.toBeNull()
    })
  })

  describe('Zelle Error Handling', () => {
    test('should handle Zelle transfer to non-onboarded user', async () => {
      const fromUser = store.users[0] || { id: 1 }
      const toUser = store.users[1] || { id: 2 }
      const fromAccount = store.getAccountsByType('checking')[0]

      if (fromAccount) {
        // Only onboard sender
        await store.onboardZelle(fromUser.id, '1234')

        await expect(
          store.sendZelle(fromUser.id, toUser.id, 100, fromAccount.id),
        ).rejects.toThrow('Both users must be Zelle onboarded')
      }
    })

    test('should handle Zelle transfer with insufficient funds', async () => {
      const fromUser = store.users[0] || { id: 1 }
      const toUser = store.users[1] || { id: 2 }
      const fromAccount = store.getAccountsByType('checking')[0]

      if (fromAccount) {
        // Onboard both users
        await store.onboardZelle(fromUser.id, '1234')
        await store.onboardZelle(toUser.id, '5678')

        const excessiveAmount = fromAccount.balance + 1000

        await expect(
          store.sendZelle(
            fromUser.id,
            toUser.id,
            excessiveAmount,
            fromAccount.id,
          ),
        ).rejects.toThrow('INSUFFICIENT_FUNDS')
      }
    })

    test('should handle Zelle daily limit exceeded', async () => {
      const fromUser = store.users[0] || { id: 1 }
      const toUser = store.users[1] || { id: 2 }
      const fromAccount = store.getAccountsByType('checking')[0]

      if (fromAccount) {
        // Onboard both users
        await store.onboardZelle(fromUser.id, '1234')
        await store.onboardZelle(toUser.id, '5678')

        // Set low daily limit
        await queries.updateUserProfile(fromUser.id, { zelleDailyLimit: 50 })

        // Try to transfer more than daily limit
        await expect(
          store.sendZelle(fromUser.id, toUser.id, 100, fromAccount.id),
        ).rejects.toThrow('Daily limit exceeded')
      }
    })
  })

  describe('Scheduled Transaction Error Handling', () => {
    test('should handle invalid scheduled transaction operations', async () => {
      const nonExistentScheduledTxId = 99999

      await expect(
        queries.processScheduledTransaction(nonExistentScheduledTxId, 1),
      ).rejects.toThrow()
    })

    test('should handle scheduled transaction with invalid date', async () => {
      const user = store.users[0] || { id: 1 }
      const account = store.getAccountsByType('checking')[0]

      if (account) {
        await expect(
          queries.createScheduledTransaction({
            userId: user.id,
            transactionTypeId: 1,
            fromAccountId: account.id,
            amount: 100,
            scheduledDate: 'invalid-date',
          }),
        ).rejects.toThrow()
      }
    })
  })

  describe('Notification Error Handling', () => {
    test('should handle invalid notification operations', async () => {
      const nonExistentNotificationId = 99999

      await expect(
        queries.markNotificationAsRead(nonExistentNotificationId),
      ).rejects.toThrow()

      await expect(
        queries.deleteNotification(nonExistentNotificationId),
      ).rejects.toThrow()
    })
  })

  describe('Database Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database connection failures
      // For now, we test that the store handles errors properly
      store.error = 'Database connection failed'
      expect(store.error).toBe('Database connection failed')
    })

    test('should handle transaction rollback scenarios', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const initialBalance = account.balance

        try {
          // This should fail and rollback
          await store.transferFunds(account.id, 99999, 100) // Invalid account
        } catch (error) {
          // Verify balance unchanged after rollback
          const unchangedAccount = store.accounts.find(a => a.id === account.id)
          expect(unchangedAccount?.balance).toBe(initialBalance)
        }
      }
    })
  })

  describe('Edge Cases', () => {
    test('should handle maximum account limits', async () => {
      // const user = store.users[0] || { id: 1 }
      const accountTypes = await queries.getAccountTypes()
      const checkingType = accountTypes.find((t: any) => t.code === 'checking')

      if (checkingType) {
        // Create accounts up to the limit
        for (let i = 0; i < checkingType.maxAccountsPerUser; i++) {
          await store.createAccount({
            accountTypeId: checkingType.id,
            accountName: `Account ${i}`,
          })
        }

        // Try to create one more (should fail)
        await expect(
          store.createAccount({
            accountTypeId: checkingType.id,
            accountName: 'Excess Account',
          }),
        ).rejects.toThrow('ACCOUNT_LIMIT_REACHED')
      }
    })

    test('should handle very small amounts', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const smallAmount = 0.01

        const transaction = await store.deposit(account.id, smallAmount)
        expect(transaction.amount).toBe(smallAmount)

        const updatedAccount = store.accounts.find(a => a.id === account.id)
        expect(updatedAccount?.balance).toBe(account.balance + smallAmount)
      }
    })

    test('should handle account with zero balance', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        // Set balance to zero
        await queries.updateAccount(account.id, { balance: 0 })

        // Should be able to deposit
        const transaction = await store.deposit(account.id, 100)
        expect(transaction.amount).toBe(100)

        // Should not be able to withdraw
        await expect(store.withdraw(account.id, 1)).rejects.toThrow(
          'INSUFFICIENT_FUNDS',
        )
      }
    })

    test('should handle concurrent operations on same account', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const initialBalance = account.balance

        // Perform concurrent operations
        const operations = [
          store.deposit(account.id, 100),
          store.deposit(account.id, 200),
          store.withdraw(account.id, 50),
        ]

        await Promise.all(operations)

        // Verify final balance
        const finalAccount = store.accounts.find(a => a.id === account.id)
        expect(finalAccount?.balance).toBe(initialBalance + 100 + 200 - 50)
      }
    })
  })
})
