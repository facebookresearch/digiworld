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

describe('Comprehensive Banking Flow Integration Tests', () => {
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

  describe('Complete User Onboarding Flow', () => {
    test('should handle complete user registration and setup', async () => {
      // 1. Create new user
      const newUser = await queries.createUser({
        username: 'newuser123',
        password: 'password123',
        email: 'newuser@example.com',
        accountTierId: 1,
      })

      expect(newUser).toBeDefined()
      expect(newUser.username).toBe('newuser123')

      // 2. Create initial accounts
      const accountTypes = await queries.getAccountTypes()
      const checkingType = accountTypes.find(t => t.code === 'checking')
      const savingsType = accountTypes.find(t => t.code === 'savings')

      const checkingAccount = await queries.createAccount({
        userId: newUser.id,
        accountTypeId: checkingType!.id,
        accountName: 'Primary Checking',
        initialDeposit: 2000,
      })

      const savingsAccount = await queries.createAccount({
        userId: newUser.id,
        accountTypeId: savingsType!.id,
        accountName: 'Primary Savings',
        initialDeposit: 5000,
      })

      expect(checkingAccount.balance).toBe(2000)
      expect(savingsAccount.balance).toBe(5000)

      // 3. Set up payment methods
      const paymentMethod = await store.addPaymentMethod({
        cardType: 'debit',
        lastFourDigits: '1234',
        cardholderName: 'New User',
        expiryDate: '12/25',
        isDefault: true,
      })

      expect(paymentMethod.isDefault).toBe(true)

      // 4. Add beneficiaries
      const beneficiary = await store.addBeneficiary({
        name: 'Family Member',
        accountNumber: '9876543210',
        accountType: 'checking',
        bankName: 'Other Bank',
        nickname: 'Family',
      })

      expect(beneficiary.name).toBe('Family Member')

      // 5. Set up Zelle
      await store.onboardZelle(newUser.id, '1234')
      const updatedUser = store.users.find(u => u.id === newUser.id)
      expect(updatedUser?.isZelleUser).toBe(true)

      // 6. Verify complete setup
      expect(store.accounts.length).toBeGreaterThanOrEqual(2)
      expect(store.paymentMethods.length).toBeGreaterThan(0)
      expect(store.beneficiaries.length).toBeGreaterThan(0)
    })
  })

  describe('Complete Transaction Flow', () => {
    test('should handle end-to-end transaction processing', async () => {
      const checkingAccount = store.getAccountsByType('checking')[0]
      const savingsAccount = store.getAccountsByType('savings')[0]

      if (checkingAccount && savingsAccount) {
        const initialCheckingBalance = checkingAccount.balance
        const initialSavingsBalance = savingsAccount.balance

        // 1. Deposit money
        const depositTx = await store.deposit(checkingAccount.id, 500)
        expect(depositTx.amount).toBe(500)
        expect(depositTx.toAccountId).toBe(checkingAccount.id)

        // 2. Transfer between accounts
        const transferTx = await store.transferFunds(
          checkingAccount.id,
          savingsAccount.id,
          200,
        )
        expect(transferTx.amount).toBe(200)
        expect(transferTx.fromAccountId).toBe(checkingAccount.id)
        expect(transferTx.toAccountId).toBe(savingsAccount.id)

        // 3. Withdraw money
        const withdrawTx = await store.withdraw(checkingAccount.id, 100)
        expect(withdrawTx.amount).toBe(100)
        expect(withdrawTx.fromAccountId).toBe(checkingAccount.id)

        // 4. Verify final balances
        const finalCheckingBalance = store.accounts.find(
          a => a.id === checkingAccount.id,
        )?.balance
        const finalSavingsBalance = store.accounts.find(
          a => a.id === savingsAccount.id,
        )?.balance

        expect(finalCheckingBalance).toBe(
          initialCheckingBalance + 500 - 200 - 100,
        )
        expect(finalSavingsBalance).toBe(initialSavingsBalance + 200)

        // 5. Verify transaction history
        await store.loadTransactions()
        expect(store.transactions.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('Credit Card Management Flow', () => {
    test('should handle complete credit card lifecycle', async () => {
      const user = store.users[0] || { id: 1 }

      // 1. Apply for credit card
      const creditCard = await queries.applyCreditCard({
        userId: user.id,
        cardholderName: 'Test User',
        requestedCreditLimit: 5000,
      })

      expect(creditCard.creditLimit).toBe(5000)
      expect(creditCard.availableCredit).toBe(5000)
      expect(creditCard.currentBalance).toBe(0)

      // 2. Make purchases
      const purchase1 = await queries.chargeCreditCard({
        userId: user.id,
        creditCardId: creditCard.id,
        amount: 100,
        description: 'Test Purchase 1',
      })

      const purchase2 = await queries.chargeCreditCard({
        userId: user.id,
        creditCardId: creditCard.id,
        amount: 200,
        description: 'Test Purchase 2',
      })

      expect(purchase1.amount).toBe(100)
      expect(purchase2.amount).toBe(200)

      // 3. Check updated balance
      const updatedCard = await queries.getCreditCard(creditCard.id)
      expect(updatedCard?.currentBalance).toBe(300)
      expect(updatedCard?.availableCredit).toBe(4700)

      // 4. Make payment
      const checkingAccount = store.getAccountsByType('checking')[0]
      if (checkingAccount) {
        const payment = await queries.makeCreditCardPayment({
          userId: user.id,
          creditCardId: creditCard.id,
          fromAccountId: checkingAccount.id,
          amount: 150,
          memo: 'Credit card payment',
        })

        expect(payment.amount).toBe(150)

        // 5. Verify final balance
        const finalCard = await queries.getCreditCard(creditCard.id)
        expect(finalCard?.currentBalance).toBe(150)
        expect(finalCard?.availableCredit).toBe(4850)
      }
    })
  })

  describe('Bill Payment Flow', () => {
    test('should handle complete bill payment process', async () => {
      const user = store.users[0] || { id: 1 }
      const billers = await queries.getBillers()
      const checkingAccount = store.getAccountsByType('checking')[0]

      if (billers.length > 0 && checkingAccount) {
        // 1. Create bill
        const bill = await queries.createBill({
          userId: user.id,
          billerId: billers[0].id,
          amount: 150,
          dueDay: 15,
          isRecurring: 1,
          recurrenceInterval: 30,
        })

        expect(bill.amount).toBe(150)
        expect(bill.status).toBe('pending')

        // 2. Pay bill
        const billPayment = await queries.createTransaction({
          transactionTypeId: 1, // Assuming bill payment type
          userId: user.id,
          fromAccountId: checkingAccount.id,
          billerId: billers[0].id,
          billId: bill.id,
          amount: 150,
          description: `Payment to ${billers[0].name}`,
          status: 'success',
        })

        expect(billPayment.amount).toBe(150)
        expect(billPayment.billerId).toBe(billers[0].id)

        // 3. Update bill status
        const updatedBill = await queries.updateBillStatus(bill.id, 'paid')
        expect(updatedBill?.status).toBe('paid')

        // 4. Verify account balance updated
        const updatedAccount = await queries.getAccountById(checkingAccount.id)
        expect(updatedAccount[0].balance).toBe(checkingAccount.balance - 150)
      }
    })
  })

  describe('Zelle Transfer Flow', () => {
    test('should handle complete Zelle transfer process', async () => {
      const fromUser = store.users[0] || { id: 1 }
      const toUser = store.users[1] || { id: 2 }
      const fromAccount = store.getAccountsByType('checking')[0]

      if (fromAccount && fromAccount.balance >= 100) {
        // 1. Onboard both users for Zelle
        await store.onboardZelle(fromUser.id, '1234')
        await store.onboardZelle(toUser.id, '5678')

        // 2. Create Zelle contact
        const contact = await queries.createZelleContact({
          userId: fromUser.id,
          contactName: 'Test Contact',
          contactEmail: 'test@example.com',
          contactPhone: '555-1234',
        })

        expect(contact.contactName).toBe('Test Contact')

        // 3. Send Zelle transfer
        const zelleTx = await store.sendZelle(
          fromUser.id,
          toUser.id,
          100,
          fromAccount.id,
        )

        expect(zelleTx.amount).toBe(100)
        expect(zelleTx.fromAccountId).toBe(fromAccount.id)

        // 4. Verify account balance updated
        const updatedAccount = store.accounts.find(a => a.id === fromAccount.id)
        expect(updatedAccount?.balance).toBe(fromAccount.balance - 100)
      }
    })
  })

  describe('Scheduled Transaction Flow', () => {
    test('should handle scheduled transaction setup and processing', async () => {
      const user = store.users[0] || { id: 1 }
      const checkingAccount = store.getAccountsByType('checking')[0]
      const savingsAccount = store.getAccountsByType('savings')[0]

      if (checkingAccount && savingsAccount) {
        // 1. Create scheduled transaction
        const scheduledTx = await queries.createScheduledTransaction({
          userId: user.id,
          transactionTypeId: 1,
          fromAccountId: checkingAccount.id,
          toAccountId: savingsAccount.id,
          amount: 200,
          scheduledDate: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          isRecurring: 1,
          recurrenceFrequency: 'monthly',
          description: 'Monthly savings transfer',
        })

        expect(scheduledTx.amount).toBe(200)
        expect(scheduledTx.status).toBe('scheduled')
        expect(scheduledTx.isRecurring).toBe(1)

        // 2. Get scheduled transactions
        const scheduledTxs = await queries.getScheduledTransactionsByUserId(
          user.id,
        )
        expect(scheduledTxs.length).toBeGreaterThan(0)

        // 3. Process scheduled transaction (simulate)
        const transaction = await queries.createTransaction({
          transactionTypeId: 1,
          userId: user.id,
          fromAccountId: checkingAccount.id,
          toAccountId: savingsAccount.id,
          amount: 200,
          description: 'Monthly savings transfer',
          status: 'success',
        })

        await queries.processScheduledTransaction(
          scheduledTx.id,
          transaction.id,
        )

        // 4. Verify scheduled transaction marked as processed
        const updatedScheduledTx =
          await queries.getScheduledTransactionsByUserId(user.id)
        const processedTx = updatedScheduledTx.find(
          tx => tx.id === scheduledTx.id,
        )
        expect(processedTx?.status).toBe('processed')
        expect(processedTx?.processedTransactionId).toBe(transaction.id)
      }
    })
  })

  describe('Notification Flow', () => {
    test('should handle notification creation and management', async () => {
      const user = store.users[0] || { id: 1 }

      // 1. Create notification
      const notification = await queries.createNotification({
        userId: user.id,
        title: 'Transaction Alert',
        message: 'Your transaction has been processed',
        type: 'info',
      })

      expect(notification.userId).toBe(user.id)
      expect(notification.title).toBe('Transaction Alert')

      // 2. Get user notifications
      const notifications = await queries.getAllNotifications(user.id)
      expect(notifications.length).toBeGreaterThan(0)

      // 3. Mark notification as read
      await queries.markNotificationAsRead(notification.id)
      const updatedNotification = await queries.getNotificationById(
        notification.id,
      )
      expect(updatedNotification[0].isRead).toBe(1)

      // 4. Delete notification
      await queries.deleteNotification(notification.id)
      const remainingNotifications = await queries.getAllNotifications(user.id)
      expect(remainingNotifications.length).toBe(notifications.length - 1)
    })
  })

  describe('Error Handling Flow', () => {
    test('should handle insufficient funds gracefully', async () => {
      const account = store.getAccountsByType('checking')[0]
      if (account) {
        const excessiveAmount = account.balance + 1000

        await expect(
          store.withdraw(account.id, excessiveAmount),
        ).rejects.toThrow('INSUFFICIENT_FUNDS')

        // Verify account balance unchanged
        const unchangedAccount = store.accounts.find(a => a.id === account.id)
        expect(unchangedAccount?.balance).toBe(account.balance)
      }
    })

    test('should handle invalid account operations', async () => {
      const creditCardAccounts = store.getAccountsByType('credit_card')
      if (creditCardAccounts.length > 0) {
        const creditCard = creditCardAccounts[0]

        await expect(store.withdraw(creditCard.id, 100)).rejects.toThrow()
      }
    })

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
  })

  describe('Data Consistency Flow', () => {
    test('should maintain data consistency across operations', async () => {
      const initialAccountCount = store.accounts.length
      const initialTransactionCount = store.transactions.length

      const checkingAccount = store.getAccountsByType('checking')[0]
      if (checkingAccount) {
        // Perform multiple operations
        await store.deposit(checkingAccount.id, 100)
        await store.withdraw(checkingAccount.id, 50)
        await store.deposit(checkingAccount.id, 75)

        // Verify account count unchanged
        expect(store.accounts.length).toBe(initialAccountCount)

        // Verify transaction count increased
        await store.loadTransactions()
        expect(store.transactions.length).toBeGreaterThan(
          initialTransactionCount,
        )

        // Verify balance consistency
        const finalAccount = store.accounts.find(
          a => a.id === checkingAccount.id,
        )
        const expectedBalance = checkingAccount.balance + 100 - 50 + 75
        expect(finalAccount?.balance).toBe(expectedBalance)
      }
    })
  })

  describe('Performance Flow', () => {
    test('should handle multiple concurrent operations', async () => {
      const checkingAccount = store.getAccountsByType('checking')[0]
      if (checkingAccount) {
        const startTime = Date.now()

        // Perform multiple concurrent operations
        const operations = []
        for (let i = 0; i < 10; i++) {
          operations.push(store.deposit(checkingAccount.id, 10))
        }

        await Promise.all(operations)

        const endTime = Date.now()
        const duration = endTime - startTime

        // Should complete within reasonable time
        expect(duration).toBeLessThan(5000)

        // Verify all operations completed
        await store.loadTransactions()
        expect(store.transactions.length).toBeGreaterThanOrEqual(10)

        // Verify final balance
        const finalAccount = store.accounts.find(
          a => a.id === checkingAccount.id,
        )
        expect(finalAccount?.balance).toBe(checkingAccount.balance + 100)
      }
    })
  })
})
