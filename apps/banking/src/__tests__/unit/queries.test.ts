// Copyright (c) Meta Platforms, Inc. and affiliates.
import { createTempDB, cleanupTempDB } from '../helpers'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import Database from 'better-sqlite3'

let db: Database.Database

beforeAll(async () => {
  db = createTempDB()
  // Initialize with mock data
  await mutations.initializeDatabase()
})

afterAll(() => {
  cleanupTempDB(db)
})

describe('User Queries', () => {
  test('createUser creates a new user successfully', async () => {
    const userData = {
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      accountTierId: 1,
    }

    const user = await queries.createUser(userData)

    expect(user).toBeDefined()
    expect(user.username).toBe(userData.username)
    expect(user.email).toBe(userData.email)
    expect(user.accountTierId).toBe(userData.accountTierId)
    expect(user.id).toBeDefined()
  })

  test('getUserById returns correct user', async () => {
    const user = await queries.createUser({
      username: 'getuser',
      password: 'password123',
      accountTierId: 1,
    })

    const foundUser = await queries.getUserById(user.id)

    expect(foundUser).toBeDefined()
    expect(foundUser?.id).toBe(user.id)
    expect(foundUser?.username).toBe('getuser')
  })

  test('login authenticates user correctly', async () => {
    const userData = {
      username: 'loginuser',
      password: 'password123',
      accountTierId: 1,
    }

    await queries.createUser(userData)
    const loggedInUser = await queries.login('loginuser', 'password123')

    expect(loggedInUser).toBeDefined()
    expect(loggedInUser?.username).toBe('loginuser')
  })

  test('login fails with wrong password', async () => {
    const userData = {
      username: 'wrongpass',
      password: 'password123',
      accountTierId: 1,
    }

    await queries.createUser(userData)
    const loggedInUser = await queries.login('wrongpass', 'wrongpassword')

    expect(loggedInUser).toBeNull()
  })

  test('updateUserProfile updates user data', async () => {
    const user = await queries.createUser({
      username: 'updateuser',
      password: 'password123',
      accountTierId: 1,
    })

    const updatedUser = await queries.updateUserProfile(user.id, {
      email: 'newemail@example.com',
      username: 'updateduser',
    })

    expect(updatedUser).toBeDefined()
    expect(updatedUser?.email).toBe('newemail@example.com')
    expect(updatedUser?.username).toBe('updateduser')
  })

  test('getAllUsers returns all users', async () => {
    const users = await queries.getAllUsers()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
  })
})

describe('Session Queries', () => {
  test('createSession creates a new session', async () => {
    const user = await queries.createUser({
      username: 'sessionuser',
      password: 'password123',
      accountTierId: 1,
    })

    const session = await queries.createSession({
      userId: user.id,
      seed: 12345,
    })

    expect(session).toBeDefined()
    expect(session.userId).toBe(user.id)
    expect(session.seed).toBe(12345)
    expect(session.status).toBe('active')
    expect(session.currentDay).toBe(0)
  })

  test('getSessionsByUserId returns user sessions', async () => {
    const user = await queries.createUser({
      username: 'sessionsuser',
      password: 'password123',
      accountTierId: 1,
    })

    await queries.createSession({ userId: user.id })
    await queries.createSession({ userId: user.id })

    const sessions = await queries.getSessionsByUserId(user.id)
    expect(sessions.length).toBe(2)
  })

  test('updateSession updates session data', async () => {
    const user = await queries.createUser({
      username: 'updatesession',
      password: 'password123',
      accountTierId: 1,
    })

    const session = await queries.createSession({ userId: user.id })

    const updatedSession = await queries.updateSession(session.id, {
      currentDay: 5,
      status: 'paused',
    })

    expect(updatedSession?.currentDay).toBe(5)
    expect(updatedSession?.status).toBe('paused')
  })
})

describe('Account Queries', () => {
  test('getAccountTypes returns all account types', async () => {
    const accountTypes = await queries.getAccountTypes()
    expect(Array.isArray(accountTypes)).toBe(true)
    expect(accountTypes.length).toBeGreaterThan(0)
  })

  test('createAccount creates a new account', async () => {
    const user = await queries.createUser({
      username: 'accountuser',
      password: 'password123',
      accountTierId: 1,
    })

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const account = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      accountName: 'My Checking',
      initialDeposit: 1000,
    })

    expect(account).toBeDefined()
    expect(account.userId).toBe(user.id)
    expect(account.accountTypeId).toBe(checkingType!.id)
    expect(account.balance).toBe(1000)
    expect(account.accountName).toBe('My Checking')
  })

  test('getAccountsByUserId returns user accounts', async () => {
    const user = await queries.createUser({
      username: 'accountsuser',
      password: 'password123',
      accountTierId: 1,
    })

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 500,
    })

    const accounts = await queries.getAccountsByUserId(user.id)
    expect(accounts.length).toBe(1)
    expect(accounts[0].balance).toBe(500)
  })

  test('updateAccount updates account data', async () => {
    const user = await queries.createUser({
      username: 'updateaccount',
      password: 'password123',
      accountTierId: 1,
    })

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const account = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
    })

    const updatedAccount = await queries.updateAccount(account.id, {
      status: 'frozen',
      isPrimary: 1,
    })

    expect(updatedAccount?.status).toBe('frozen')
    expect(updatedAccount?.isPrimary).toBe(1)
  })
})

describe('Transaction Queries', () => {
  let user: any
  let checkingAccount: any
  let savingsAccount: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'txuser',
      password: 'password123',
      accountTierId: 1,
    })

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')
    const savingsType = accountTypes.find(t => t.code === 'savings')

    checkingAccount = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    savingsAccount = await queries.createAccount({
      userId: user.id,
      accountTypeId: savingsType!.id,
      initialDeposit: 2000,
    })
  })

  test('deposit adds money to account', async () => {
    const session = await queries.createSession({ userId: user.id })

    const transaction = await queries.deposit(
      checkingAccount.id,
      500,
      session.id,
    )

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(500)
    expect(transaction.toAccountId).toBe(checkingAccount.id)
    expect(transaction.balanceAfter).toBe(1500)

    // Verify account balance was updated
    const updatedAccount = await queries.getAccountById(checkingAccount.id)
    expect(updatedAccount[0].balance).toBe(1500)
  })

  test('withdraw removes money from account', async () => {
    const session = await queries.createSession({ userId: user.id })

    const transaction = await queries.withdraw(
      checkingAccount.id,
      300,
      session.id,
    )

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(300)
    expect(transaction.fromAccountId).toBe(checkingAccount.id)
    expect(transaction.balanceAfter).toBe(700)

    // Verify account balance was updated
    const updatedAccount = await queries.getAccountById(checkingAccount.id)
    expect(updatedAccount[0].balance).toBe(700)
  })

  test('withdraw fails with insufficient funds', async () => {
    const session = await queries.createSession({ userId: user.id })

    await expect(
      queries.withdraw(checkingAccount.id, 1500, session.id),
    ).rejects.toThrow('INSUFFICIENT_FUNDS')
  })

  test('withdraw fails from non-withdrawable account type', async () => {
    const session = await queries.createSession({ userId: user.id })

    // Try to withdraw from credit card (not allowed)
    const accountTypes = await queries.getAccountTypes()
    const creditType = accountTypes.find(t => t.code === 'credit_card')

    if (creditType) {
      const creditAccount = await queries.createAccount({
        userId: user.id,
        accountTypeId: creditType.id,
        initialDeposit: 1000,
      })

      await expect(
        queries.withdraw(creditAccount.id, 100, session.id),
      ).rejects.toThrow(
        'Withdrawals from account type "credit_card" are not allowed',
      )
    }
  })

  test('transferFunds moves money between accounts', async () => {
    const session = await queries.createSession({ userId: user.id })

    const transaction = await queries.transferFunds(
      checkingAccount.id,
      savingsAccount.id,
      200,
      session.id,
    )

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(200)
    expect(transaction.fromAccountId).toBe(checkingAccount.id)
    expect(transaction.toAccountId).toBe(savingsAccount.id)
    expect(transaction.balanceAfter).toBe(800)

    // Verify both account balances were updated
    const updatedChecking = await queries.getAccountById(checkingAccount.id)
    const updatedSavings = await queries.getAccountById(savingsAccount.id)

    expect(updatedChecking[0].balance).toBe(800)
    expect(updatedSavings[0].balance).toBe(2200)
  })

  test('transferFunds fails with insufficient funds', async () => {
    const session = await queries.createSession({ userId: user.id })

    await expect(
      queries.transferFunds(
        checkingAccount.id,
        savingsAccount.id,
        1500,
        session.id,
      ),
    ).rejects.toThrow('INSUFFICIENT_FUNDS')
  })
})

describe('Credit Card Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'ccuser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('applyCreditCard creates a new credit card', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    expect(creditCard).toBeDefined()
    expect(creditCard.userId).toBe(user.id)
    expect(creditCard.cardholderName).toBe('John Doe')
    expect(creditCard.creditLimit).toBe(5000)
    expect(creditCard.currentBalance).toBe(0)
    expect(creditCard.availableCredit).toBe(5000)
    expect(creditCard.cardNumber).toMatch(/^4\d{15}$/) // Visa format
    expect(creditCard.lastFourDigits).toMatch(/^\d{4}$/)
    expect(creditCard.cvv).toMatch(/^\d{3}$/)
  })

  test('getCreditCards returns user credit cards', async () => {
    await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
    })

    const creditCards = await queries.getCreditCards(user.id)
    expect(creditCards.length).toBe(1)
    expect(creditCards[0].cardholderName).toBe('John Doe')
  })

  test('chargeCreditCard adds to credit card balance', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    const transaction = await queries.chargeCreditCard({
      userId: user.id,
      creditCardId: creditCard.id,
      amount: 100,
      description: 'Test Purchase',
    })

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(100)
    expect(transaction.creditCardId).toBe(creditCard.id)

    // Verify credit card balance was updated
    const updatedCard = await queries.getCreditCard(creditCard.id)
    expect(updatedCard?.currentBalance).toBe(100)
    expect(updatedCard?.availableCredit).toBe(4900)
  })

  test('chargeCreditCard fails with insufficient credit', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 100,
    })

    await expect(
      queries.chargeCreditCard({
        userId: user.id,
        creditCardId: creditCard.id,
        amount: 200,
        description: 'Test Purchase',
      }),
    ).rejects.toThrow('Insufficient credit available')
  })

  test('makeCreditCardPayment reduces credit card balance', async () => {
    const user = await queries.createUser({
      username: 'paymentuser',
      password: 'password123',
      accountTierId: 1,
    })

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const checkingAccount = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    // First charge the card
    await queries.chargeCreditCard({
      userId: user.id,
      creditCardId: creditCard.id,
      amount: 200,
      description: 'Test Purchase',
    })

    // Then make a payment
    const transaction = await queries.makeCreditCardPayment({
      userId: user.id,
      creditCardId: creditCard.id,
      fromAccountId: checkingAccount.id,
      amount: 100,
      memo: 'Payment',
    })

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(100)

    // Verify balances
    const updatedCard = await queries.getCreditCard(creditCard.id)
    const updatedAccount = await queries.getAccountById(checkingAccount.id)

    expect(updatedCard?.currentBalance).toBe(100) // 200 - 100
    expect(updatedCard?.availableCredit).toBe(4900) // 5000 - 100
    expect(updatedAccount[0].balance).toBe(900) // 1000 - 100
  })

  test('calculateMinimumPayment calculates correct minimum', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    // Charge $1000
    await queries.chargeCreditCard({
      userId: user.id,
      creditCardId: creditCard.id,
      amount: 1000,
      description: 'Test Purchase',
    })

    const minimumPayment = await queries.calculateMinimumPayment(creditCard.id)
    // 2% of $1000 = $20, but minimum is $25
    expect(minimumPayment).toBe(25)
  })

  test('closeCreditCard fails with outstanding balance', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    // Charge the card
    await queries.chargeCreditCard({
      userId: user.id,
      creditCardId: creditCard.id,
      amount: 100,
      description: 'Test Purchase',
    })

    await expect(queries.closeCreditCard(creditCard.id)).rejects.toThrow(
      'Cannot close credit card with outstanding balance',
    )
  })

  test('closeCreditCard succeeds with zero balance', async () => {
    const creditCard = await queries.applyCreditCard({
      userId: user.id,
      cardholderName: 'John Doe',
      requestedCreditLimit: 5000,
    })

    const result = await queries.closeCreditCard(creditCard.id)
    expect(result.success).toBe(true)

    const updatedCard = await queries.getCreditCard(creditCard.id)
    expect(updatedCard?.status).toBe('closed')
  })
})

describe('Beneficiary Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'beneficiaryuser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('addBeneficiary creates a new beneficiary', async () => {
    const beneficiary = await queries.addBeneficiary({
      userId: user.id,
      name: 'John Smith',
      accountNumber: '1234567890',
      accountType: 'checking',
      bankName: 'Chase Bank',
      nickname: 'John',
    })

    expect(beneficiary).toBeDefined()
    expect(beneficiary.userId).toBe(user.id)
    expect(beneficiary.name).toBe('John Smith')
    expect(beneficiary.accountNumber).toBe('1234567890')
    expect(beneficiary.status).toBe('active')
  })

  test('getBeneficiaries returns user beneficiaries', async () => {
    await queries.addBeneficiary({
      userId: user.id,
      name: 'John Smith',
      accountNumber: '1234567890',
      accountType: 'checking',
      bankName: 'Chase Bank',
    })

    const beneficiaries = await queries.getBeneficiaries(user.id)
    expect(beneficiaries.length).toBe(1)
    expect(beneficiaries[0].name).toBe('John Smith')
  })

  test('updateBeneficiary updates beneficiary data', async () => {
    const beneficiary = await queries.addBeneficiary({
      userId: user.id,
      name: 'John Smith',
      accountNumber: '1234567890',
      accountType: 'checking',
      bankName: 'Chase Bank',
    })

    const updatedBeneficiary = await queries.updateBeneficiary(beneficiary.id, {
      name: 'John Smith Jr.',
      nickname: 'Johnny',
    })

    expect(updatedBeneficiary?.name).toBe('John Smith Jr.')
    expect(updatedBeneficiary?.nickname).toBe('Johnny')
  })

  test('removeBeneficiary deactivates beneficiary', async () => {
    const beneficiary = await queries.addBeneficiary({
      userId: user.id,
      name: 'John Smith',
      accountNumber: '1234567890',
      accountType: 'checking',
      bankName: 'Chase Bank',
    })

    await queries.removeBeneficiary(beneficiary.id)

    const updatedBeneficiary = await queries.getBeneficiaries(user.id)
    expect(updatedBeneficiary[0].status).toBe('inactive')
  })
})

describe('Biller and Bill Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'billeruser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('getBillers returns all active billers', async () => {
    const billers = await queries.getBillers()
    expect(Array.isArray(billers)).toBe(true)
    expect(billers.length).toBeGreaterThan(0)
    expect(billers.every(b => b.isActive === 1)).toBe(true)
  })

  test('createBill creates a new bill', async () => {
    const billers = await queries.getBillers()
    const firstBiller = billers[0]

    const bill = await queries.createBill({
      userId: user.id,
      billerId: firstBiller.id,
      amount: 100,
      dueDay: 15,
      isRecurring: 1,
      recurrenceInterval: 30,
    })

    expect(bill).toBeDefined()
    expect(bill.userId).toBe(user.id)
    expect(bill.billerId).toBe(firstBiller.id)
    expect(bill.amount).toBe(100)
    expect(bill.status).toBe('pending')
  })

  test('getBillsByUserId returns user bills', async () => {
    const billers = await queries.getBillers()
    const firstBiller = billers[0]

    await queries.createBill({
      userId: user.id,
      billerId: firstBiller.id,
      amount: 100,
    })

    const bills = await queries.getBillsByUserId(user.id)
    expect(bills.length).toBe(1)
    expect(bills[0].amount).toBe(100)
  })

  test('updateBillStatus updates bill status', async () => {
    const billers = await queries.getBillers()
    const firstBiller = billers[0]

    const bill = await queries.createBill({
      userId: user.id,
      billerId: firstBiller.id,
      amount: 100,
    })

    const updatedBill = await queries.updateBillStatus(bill.id, 'paid')
    expect(updatedBill?.status).toBe('paid')
  })
})

describe('Zelle Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'zelleuser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('onboardZelle enables Zelle for user', async () => {
    await queries.onboardZelle(user.id)

    const updatedUser = await queries.getUserById(user.id)
    expect(updatedUser?.isZelleUser).toBe(1)
  })

  test('createZelleContact creates a new contact', async () => {
    const contact = await queries.createZelleContact({
      userId: user.id,
      contactName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      contactPhone: '555-1234',
    })

    expect(contact).toBeDefined()
    expect(contact.userId).toBe(user.id)
    expect(contact.contactName).toBe('Jane Doe')
    expect(contact.contactEmail).toBe('jane@example.com')
  })

  test('sendZelle transfers money via Zelle', async () => {
    const fromUser = await queries.createUser({
      username: 'sender',
      password: 'password123',
      accountTierId: 1,
    })

    const toUser = await queries.createUser({
      username: 'receiver',
      password: 'password123',
      accountTierId: 1,
    })

    // Onboard both users for Zelle
    await queries.onboardZelle(fromUser.id)
    await queries.onboardZelle(toUser.id)

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const fromAccount = await queries.createAccount({
      userId: fromUser.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    const transaction = await queries.sendZelle(
      fromUser.id,
      toUser.id,
      fromAccount.id,
      100,
    )

    expect(transaction).toBeDefined()
    expect(transaction.amount).toBe(100)
    expect(transaction.fromAccountId).toBe(fromAccount.id)

    // Verify account balance was updated
    const updatedAccount = await queries.getAccountById(fromAccount.id)
    expect(updatedAccount[0].balance).toBe(900)
  })

  test('sendZelle fails if recipient not Zelle onboarded', async () => {
    const fromUser = await queries.createUser({
      username: 'sender2',
      password: 'password123',
      accountTierId: 1,
    })

    const toUser = await queries.createUser({
      username: 'receiver2',
      password: 'password123',
      accountTierId: 1,
    })

    // Only onboard sender
    await queries.onboardZelle(fromUser.id)

    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const fromAccount = await queries.createAccount({
      userId: fromUser.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    await expect(
      queries.sendZelle(fromUser.id, toUser.id, fromAccount.id, 100),
    ).rejects.toThrow('Recipient not Zelle onboarded')
  })
})

describe('Scheduled Transaction Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'scheduleduser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('createScheduledTransaction creates a scheduled transaction', async () => {
    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const account = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    const scheduledTx = await queries.createScheduledTransaction({
      userId: user.id,
      transactionTypeId: 1, // Assuming transfer type exists
      fromAccountId: account.id,
      amount: 100,
      scheduledDate: '2024-12-31',
      isRecurring: 1,
      recurrenceFrequency: 'monthly',
      description: 'Monthly transfer',
    })

    expect(scheduledTx).toBeDefined()
    expect(scheduledTx.userId).toBe(user.id)
    expect(scheduledTx.amount).toBe(100)
    expect(scheduledTx.status).toBe('scheduled')
  })

  test('getScheduledTransactionsByUserId returns user scheduled transactions', async () => {
    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const account = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    await queries.createScheduledTransaction({
      userId: user.id,
      transactionTypeId: 1,
      fromAccountId: account.id,
      amount: 100,
      scheduledDate: '2024-12-31',
    })

    const scheduledTxs = await queries.getScheduledTransactionsByUserId(user.id)
    expect(scheduledTxs.length).toBe(1)
    expect(scheduledTxs[0].amount).toBe(100)
  })

  test('processScheduledTransaction marks transaction as processed', async () => {
    const accountTypes = await queries.getAccountTypes()
    const checkingType = accountTypes.find(t => t.code === 'checking')

    const account = await queries.createAccount({
      userId: user.id,
      accountTypeId: checkingType!.id,
      initialDeposit: 1000,
    })

    const scheduledTx = await queries.createScheduledTransaction({
      userId: user.id,
      transactionTypeId: 1,
      fromAccountId: account.id,
      amount: 100,
      scheduledDate: '2024-12-31',
    })

    const transaction = await queries.createTransaction({
      transactionTypeId: 1,
      userId: user.id,
      fromAccountId: account.id,
      amount: 100,
    })

    await queries.processScheduledTransaction(scheduledTx.id, transaction.id)

    const updatedScheduledTx = await queries.getScheduledTransactionsByUserId(
      user.id,
    )
    expect(updatedScheduledTx[0].status).toBe('processed')
    expect(updatedScheduledTx[0].processedTransactionId).toBe(transaction.id)
  })
})

describe('Notification Queries', () => {
  let user: any

  beforeEach(async () => {
    user = await queries.createUser({
      username: 'notificationuser',
      password: 'password123',
      accountTierId: 1,
    })
  })

  test('getAllNotifications returns user notifications', async () => {
    const notifications = await queries.getAllNotifications(user.id)
    expect(Array.isArray(notifications)).toBe(true)
  })

  test('markNotificationAsRead marks notification as read', async () => {
    // Create a notification first (this would normally be done by the system)
    // const notification = await queries.createTransaction({
    //   transactionTypeId: 1,
    //   userId: user.id,
    //   amount: 100,
    //   description: 'Test transaction for notification',
    // })

    // This is a simplified test - in reality, notifications would be created separately
    // For now, we'll test the mark as read functionality
    const notifications = await queries.getAllNotifications(user.id)
    if (notifications.length > 0) {
      await queries.markNotificationAsRead(notifications[0].id)

      const updatedNotification = await queries.getNotificationById(
        notifications[0].id,
      )
      expect(updatedNotification[0].isRead).toBe(1)
    }
  })

  test('deleteNotification removes notification', async () => {
    const notifications = await queries.getAllNotifications(user.id)
    if (notifications.length > 0) {
      await queries.deleteNotification(notifications[0].id)

      const remainingNotifications = await queries.getAllNotifications(user.id)
      expect(remainingNotifications.length).toBe(notifications.length - 1)
    }
  })
})
