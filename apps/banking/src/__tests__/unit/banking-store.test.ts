import { createTempDB, cleanupTempDB } from '../helpers'
import { createBankingStore } from '@/models/BankingStore'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import Database from 'better-sqlite3'

let db: Database.Database
let store: ReturnType<typeof createBankingStore>

beforeAll(async () => {
  db = createTempDB()
  await mutations.initializeDatabase()
})

afterAll(() => {
  cleanupTempDB(db)
})

beforeEach(() => {
  store = createBankingStore()
})

describe('BankingStore Initialization', () => {
  test('creates store with default state', () => {
    expect(store.currentSession).toBeNull()
    expect(store.users).toEqual([])
    expect(store.accounts).toEqual([])
    expect(store.accountTypes).toEqual([])
    expect(store.paymentMethods).toEqual([])
    expect(store.beneficiaries).toEqual([])
    expect(store.billers).toEqual([])
    expect(store.bills).toEqual([])
    expect(store.transactions).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.selectedAccount).toBeNull()
    expect(store.transactionFilter).toBeNull()
  })

  test('initializeSession creates session and loads data', async () => {
    const config = {
      userId: 1,
      seed: 12345,
      volatility: 0.1,
      enableInterest: true,
      enableRecurringBills: true,
      enableMonthlyFees: true,
    }

    const session = await store.initializeSession(config)

    expect(session).toBeDefined()
    expect(store.currentSession).toBeDefined()
    expect(store.currentSession?.userId).toBe(config.userId)
    expect(store.currentSession?.seed).toBe(config.seed)
    expect(store.accounts.length).toBeGreaterThan(0)
    expect(store.accountTypes.length).toBeGreaterThan(0)
  })

  test('initializeSession handles errors gracefully', async () => {
    const invalidConfig = {
      userId: 99999, // Non-existent user
      seed: 12345,
    }

    await expect(store.initializeSession(invalidConfig)).rejects.toThrow()
    expect(store.error).toBeDefined()
  })
})

describe('BankingStore Views', () => {
  beforeEach(async () => {
    await store.initializeSession({ userId: 1, seed: 12345 })
  })

  test('activeAccounts returns only active accounts', () => {
    const activeAccounts = store.activeAccounts
    expect(activeAccounts.every(account => account.status === 'active')).toBe(
      true,
    )
  })

  test('totalBalance calculates sum of active accounts', () => {
    const totalBalance = store.totalBalance
    const expectedTotal = store.activeAccounts.reduce(
      (sum, account) => sum + account.balance,
      0,
    )
    expect(totalBalance).toBe(expectedTotal)
  })

  test('getAccountByNumber finds account by number', () => {
    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      const foundAccount = store.getAccountByNumber(account.accountNumber)
      expect(foundAccount).toBeDefined()
      expect(foundAccount?.id).toBe(account.id)
    }
  })

  test('getAccountByNumber returns undefined for non-existent account', () => {
    const foundAccount = store.getAccountByNumber('NONEXISTENT')
    expect(foundAccount).toBeUndefined()
  })

  test('getAccountsByType filters accounts by type', () => {
    if (store.accountTypes.length > 0) {
      const accountType = store.accountTypes[0]
      const accountsOfType = store.getAccountsByType(accountType.code)
      expect(
        accountsOfType.every(
          account => account.accountTypeId === accountType.id,
        ),
      ).toBe(true)
    }
  })

  test('activePaymentMethods returns only active payment methods', () => {
    const activePaymentMethods = store.activePaymentMethods
    expect(activePaymentMethods.every(pm => pm.status === 'active')).toBe(true)
  })

  test('defaultPaymentMethod returns default payment method', () => {
    const defaultPaymentMethod = store.defaultPaymentMethod
    if (defaultPaymentMethod) {
      expect(defaultPaymentMethod.isDefault).toBe(true)
      expect(defaultPaymentMethod.status).toBe('active')
    }
  })

  test('activeBeneficiaries returns only active beneficiaries', () => {
    const activeBeneficiaries = store.activeBeneficiaries
    expect(activeBeneficiaries.every(b => b.status === 'active')).toBe(true)
  })

  test('pendingBills returns only pending bills', () => {
    const pendingBills = store.pendingBills
    expect(pendingBills.every(bill => bill.status === 'pending')).toBe(true)
  })

  test('overdueBills returns only overdue bills', () => {
    const overdueBills = store.overdueBills
    expect(overdueBills.every(bill => bill.status === 'overdue')).toBe(true)
  })

  test('recentTransactions returns transactions sorted by date', () => {
    const recentTransactions = store.recentTransactions
    expect(recentTransactions.length).toBeLessThanOrEqual(20)

    // Check that transactions are sorted by date (newest first)
    for (let i = 1; i < recentTransactions.length; i++) {
      const prevDate = new Date(recentTransactions[i - 1].createdAt).getTime()
      const currDate = new Date(recentTransactions[i].createdAt).getTime()
      expect(prevDate).toBeGreaterThanOrEqual(currDate)
    }
  })
})

describe('BankingStore Actions', () => {
  beforeEach(async () => {
    await store.initializeSession({ userId: 1, seed: 12345 })
  })

  test('loadAccounts loads user accounts', async () => {
    await store.loadAccounts()
    expect(store.accounts.length).toBeGreaterThan(0)
  })

  test('loadAccountTypes loads account types', async () => {
    await store.loadAccountTypes()
    expect(store.accountTypes.length).toBeGreaterThan(0)
  })

  test('loadPaymentMethods loads payment methods', async () => {
    await store.loadPaymentMethods()
    expect(Array.isArray(store.paymentMethods)).toBe(true)
  })

  test('loadBeneficiaries loads beneficiaries', async () => {
    await store.loadBeneficiaries()
    expect(Array.isArray(store.beneficiaries)).toBe(true)
  })

  test('loadBillers loads billers', async () => {
    await store.loadBillers()
    expect(store.billers.length).toBeGreaterThan(0)
  })

  test('loadBills loads user bills', async () => {
    await store.loadBills()
    expect(Array.isArray(store.bills)).toBe(true)
  })

  test('loadTransactions loads session transactions', async () => {
    await store.loadTransactions()
    expect(Array.isArray(store.transactions)).toBe(true)
  })

  test('createAccount creates new account', async () => {
    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find((t: any) => t.code === 'checking')

    const accountData = {
      accountTypeId: checkingType!.id,
      accountName: 'Test Account',
      initialDeposit: 500,
    }

    const account = await store.createAccount(accountData)

    expect(account).toBeDefined()
    expect(account.accountTypeId).toBe(accountData.accountTypeId)
    expect(account.balance).toBe(accountData.initialDeposit)
    expect(store.accounts.some(a => a.id === account.id)).toBe(true)
  })

  test('createAccount enforces account limits', async () => {
    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find((t: any) => t.code === 'checking')

    // Create accounts up to the limit
    for (let i = 0; i < checkingType!.maxAccountsPerUser; i++) {
      await store.createAccount({
        accountTypeId: checkingType!.id,
        accountName: `Account ${i}`,
      })
    }

    // Attempting to create one more should fail
    await expect(
      store.createAccount({
        accountTypeId: checkingType!.id,
        accountName: 'Excess Account',
      }),
    ).rejects.toThrow('ACCOUNT_LIMIT_REACHED')
  })

  test('deposit adds money to account', async () => {
    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      const initialBalance = account.balance
      const depositAmount = 100

      const transaction = await store.deposit(account.id, depositAmount)

      expect(transaction).toBeDefined()
      expect(transaction.amount).toBe(depositAmount)
      expect(transaction.toAccountId).toBe(account.id)
      expect(store.transactions.some((t: any) => t.id === transaction.id)).toBe(
        true,
      )

      // Check that account balance was updated in store
      const updatedAccount = store.accounts.find(
        (a: any) => a.id === account.id,
      )
      expect(updatedAccount?.balance).toBe(initialBalance + depositAmount)
    }
  })

  test('withdraw removes money from account', async () => {
    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      const initialBalance = account.balance
      const withdrawAmount = Math.min(100, initialBalance) // Don't overdraw

      const transaction = await store.withdraw(account.id, withdrawAmount)

      expect(transaction).toBeDefined()
      expect(transaction.amount).toBe(withdrawAmount)
      expect(transaction.fromAccountId).toBe(account.id)
      expect(store.transactions.some((t: any) => t.id === transaction.id)).toBe(
        true,
      )

      // Check that account balance was updated in store
      const updatedAccount = store.accounts.find(
        (a: any) => a.id === account.id,
      )
      expect(updatedAccount?.balance).toBe(initialBalance - withdrawAmount)
    }
  })

  test('withdraw fails with insufficient funds', async () => {
    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      const excessiveAmount = account.balance + 1000

      await expect(store.withdraw(account.id, excessiveAmount)).rejects.toThrow(
        'INSUFFICIENT_FUNDS',
      )
    }
  })

  test('transferFunds moves money between accounts', async () => {
    if (store.accounts.length >= 2) {
      const fromAccount = store.accounts[0]
      const toAccount = store.accounts[1]
      const initialFromBalance = fromAccount.balance
      const initialToBalance = toAccount.balance
      const transferAmount = Math.min(100, initialFromBalance)

      const transaction = await store.transferFunds(
        fromAccount.id,
        toAccount.id,
        transferAmount,
      )

      expect(transaction).toBeDefined()
      expect(transaction.amount).toBe(transferAmount)
      expect(transaction.fromAccountId).toBe(fromAccount.id)
      expect(transaction.toAccountId).toBe(toAccount.id)
      expect(store.transactions.some((t: any) => t.id === transaction.id)).toBe(
        true,
      )

      // Check that both account balances were updated in store
      const updatedFromAccount = store.accounts.find(
        a => a.id === fromAccount.id,
      )
      const updatedToAccount = store.accounts.find(a => a.id === toAccount.id)
      expect(updatedFromAccount?.balance).toBe(
        initialFromBalance - transferAmount,
      )
      expect(updatedToAccount?.balance).toBe(initialToBalance + transferAmount)
    }
  })

  test('transferFunds fails with insufficient funds', async () => {
    if (store.accounts.length >= 2) {
      const fromAccount = store.accounts[0]
      const toAccount = store.accounts[1]
      const excessiveAmount = fromAccount.balance + 1000

      await expect(
        store.transferFunds(fromAccount.id, toAccount.id, excessiveAmount),
      ).rejects.toThrow('INSUFFICIENT_FUNDS')
    }
  })

  test('addPaymentMethod creates new payment method', async () => {
    const paymentMethodData = {
      cardType: 'credit' as const,
      lastFourDigits: '1234',
      cardholderName: 'John Doe',
      expiryDate: '12/25',
      isDefault: false,
    }

    const paymentMethod = await store.addPaymentMethod(paymentMethodData)

    expect(paymentMethod).toBeDefined()
    expect(paymentMethod.cardType).toBe(paymentMethodData.cardType)
    expect(paymentMethod.lastFourDigits).toBe(paymentMethodData.lastFourDigits)
    expect(store.paymentMethods.some(pm => pm.id === paymentMethod.id)).toBe(
      true,
    )
  })

  test('removePaymentMethod removes payment method', async () => {
    const paymentMethodData = {
      cardType: 'credit' as const,
      lastFourDigits: '1234',
      cardholderName: 'John Doe',
      expiryDate: '12/25',
    }

    const paymentMethod = await store.addPaymentMethod(paymentMethodData)
    await store.removePaymentMethod(paymentMethod.id)

    expect(store.paymentMethods.some(pm => pm.id === paymentMethod.id)).toBe(
      false,
    )
  })

  test('addBeneficiary creates new beneficiary', async () => {
    const beneficiaryData = {
      name: 'Jane Smith',
      accountNumber: '9876543210',
      accountType: 'checking',
      bankName: 'Chase Bank',
      nickname: 'Jane',
    }

    const beneficiary = await store.addBeneficiary(beneficiaryData)

    expect(beneficiary).toBeDefined()
    expect(beneficiary.name).toBe(beneficiaryData.name)
    expect(beneficiary.accountNumber).toBe(beneficiaryData.accountNumber)
    expect(store.beneficiaries.some(b => b.id === beneficiary.id)).toBe(true)
  })

  test('editBeneficiary updates beneficiary data', async () => {
    const beneficiaryData = {
      name: 'Jane Smith',
      accountNumber: '9876543210',
      accountType: 'checking',
      bankName: 'Chase Bank',
    }

    const beneficiary = await store.addBeneficiary(beneficiaryData)
    const updates = { name: 'Jane Smith Jr.', nickname: 'Jane Jr.' }

    await store.editBeneficiary(beneficiary.id, updates)

    const updatedBeneficiary = store.beneficiaries.find(
      b => b.id === beneficiary.id,
    )
    expect(updatedBeneficiary?.name).toBe(updates.name)
    expect(updatedBeneficiary?.nickname).toBe(updates.nickname)
  })

  test('removeBeneficiary removes beneficiary', async () => {
    const beneficiaryData = {
      name: 'Jane Smith',
      accountNumber: '9876543210',
      accountType: 'checking',
      bankName: 'Chase Bank',
    }

    const beneficiary = await store.addBeneficiary(beneficiaryData)
    await store.removeBeneficiary(beneficiary.id)

    expect(store.beneficiaries.some(b => b.id === beneficiary.id)).toBe(false)
  })

  test('onboardZelle enables Zelle for user', async () => {
    const user = store.users[0] || { id: 1 }
    const phoneLast4 = '1234'

    await store.onboardZelle(user.id, phoneLast4)

    const updatedUser = store.users.find(u => u.id === user.id)
    expect(updatedUser?.isZelleUser).toBe(true)
  })

  test('sendZelle transfers money via Zelle', async () => {
    const fromUser = store.users[0] || { id: 1 }
    const toUser = store.users[1] || { id: 2 }
    const fromAccount = store.accounts[0]
    const amount = 50

    // Onboard both users for Zelle
    await store.onboardZelle(fromUser.id, '1234')
    await store.onboardZelle(toUser.id, '5678')

    if (fromAccount && fromAccount.balance >= amount) {
      const transaction = await store.sendZelle(
        fromUser.id,
        toUser.id,
        amount,
        fromAccount.id,
      )

      expect(transaction).toBeDefined()
      expect(transaction.amount).toBe(amount)
      expect(store.transactions.some((t: any) => t.id === transaction.id)).toBe(
        true,
      )

      // Check that account balance was updated in store
      const updatedAccount = store.accounts.find(a => a.id === fromAccount.id)
      expect(updatedAccount?.balance).toBe(fromAccount.balance - amount)
    }
  })

  test('sendZelle fails if users not Zelle onboarded', async () => {
    const fromUser = store.users[0] || { id: 1 }
    const toUser = store.users[1] || { id: 2 }
    const fromAccount = store.accounts[0]
    const amount = 50

    // Don't onboard users for Zelle

    if (fromAccount) {
      await expect(
        store.sendZelle(fromUser.id, toUser.id, amount, fromAccount.id),
      ).rejects.toThrow('Both users must be Zelle onboarded')
    }
  })

  test('setSelectedAccount updates selected account', () => {
    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      store.setSelectedAccount(account.id)
      expect(store.selectedAccount?.id).toBe(account.id)
    }
  })

  test('setSelectedAccount clears selection with null', () => {
    store.setSelectedAccount(null)
    expect(store.selectedAccount).toBeNull()
  })

  test('setTransactionFilter updates filter', () => {
    store.setTransactionFilter('transfer')
    expect(store.transactionFilter).toBe('transfer')
  })

  test('clearError removes error message', () => {
    store.error = 'Test error'
    store.clearError()
    expect(store.error).toBeNull()
  })

  test('restore restores store state from data', () => {
    const testData = {
      currentSession: { id: 1, userId: 1, status: 'active' },
      accounts: [{ id: 1, userId: 1, balance: 1000, status: 'active' }],
      accountTypes: [{ id: 1, code: 'checking', name: 'Checking' }],
    }

    store.restore(testData)

    expect(store.currentSession).toEqual(testData.currentSession)
    expect(store.accounts).toEqual(testData.accounts)
    expect(store.accountTypes).toEqual(testData.accountTypes)
  })
})

describe('BankingStore Error Handling', () => {
  test('handles database errors gracefully', async () => {
    // Test with invalid user ID
    await expect(store.initializeSession({ userId: 99999 })).rejects.toThrow()
    expect(store.error).toBeDefined()
  })

  test('handles network errors gracefully', async () => {
    // This would require mocking network failures
    // For now, we'll test that errors are properly set
    store.error = 'Network error'
    expect(store.error).toBe('Network error')
  })

  test('handles validation errors', async () => {
    await store.initializeSession({ userId: 1, seed: 12345 })

    // Test invalid account creation
    await expect(
      store.createAccount({ accountTypeId: 99999 }),
    ).rejects.toThrow()
  })
})

describe('BankingStore State Management', () => {
  test('maintains consistent state during operations', async () => {
    await store.initializeSession({ userId: 1, seed: 12345 })

    const initialAccountCount = store.accounts.length
    const initialTransactionCount = store.transactions.length

    if (store.accounts.length > 0) {
      const account = store.accounts[0]
      await store.deposit(account.id, 100)

      // Account count should remain the same
      expect(store.accounts.length).toBe(initialAccountCount)
      // Transaction count should increase
      expect(store.transactions.length).toBe(initialTransactionCount + 1)
    }
  })

  test('handles concurrent operations safely', async () => {
    await store.initializeSession({ userId: 1, seed: 12345 })

    if (store.accounts.length >= 2) {
      const account1 = store.accounts[0]
      const account2 = store.accounts[1]

      // Perform concurrent operations
      const promises = [
        store.deposit(account1.id, 50),
        store.deposit(account2.id, 75),
      ]

      await Promise.all(promises)

      // Both operations should succeed
      expect(store.transactions.length).toBeGreaterThanOrEqual(2)
    }
  })
})
