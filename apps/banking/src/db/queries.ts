// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db/index'
import {
  users,
  sessions,
  accounts,
  transactions,
  accountTypes,
  accountTierLevels,
  beneficiaries,
  billers,
  bills,
  zelleContacts,
  scheduledTransactions,
  creditCards,
  transactionTypes,
  notifications,
  systemConfig,
} from './schema'
import mockBillers from '../data/mock-billers.json'
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

const fromAccounts = alias(accounts, 'fromAccounts')
const toAccounts = alias(accounts, 'toAccounts')

const ALLOWED_WITHDRAWAL_TYPES = ['checking', 'savings'] as const

export const requireAuth = (userId: number | null | undefined): void => {
  if (!userId) {
    throw new Error('Authentication required')
  }
}

const getValidSessionId = async (
  sessionId: number | null | undefined,
): Promise<number | null> => {
  if (!sessionId) return null

  const sessionRes = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .execute()

  return sessionRes[0]?.id ?? null
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if tables exist using a simpler query first
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'accounts', 'transactions', 'account_types', 'account_tier_levels', 'transaction_types', 'sessions', 'credit_cards', 'bills', 'beneficiaries', 'zelle_contacts', 'billers', 'scheduled_transactions', 'error_codes', 'system_config', 'notifications', 'interest_rate_tiers')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 18 required tables
    const count = result[0].count
    const hasAllTables = count === 18
    console.log(`Database has ${count} of 18 required tables`)

    if (!hasAllTables) {
      return false
    }

    // Check if we have at least one user (basic data check)
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .execute()

    const hasData = userCount[0]?.count > 0
    console.log(`Database has ${hasData ? 'some' : 'no'} user data`)
    return hasData
  } catch (error) {
    console.error('Error checking database initialization:', error)
    return false
  }
}

const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F =>
  (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    try {
      // @ts-ignore – preserve original type information
      return await fn(...args)
    } catch (error) {
      console.error(`Error in ${name}:`, error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error'
      throw new Error(`${name}: ${msg}`)
    }
  }) as F

export const createUser = wrapQuery(
  async (data: {
    username: string
    password: string
    email?: string
    agentId?: string
    accountTierId: number
    pin?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(users)
      .values({
        username: data.username,
        password: data.password,
        email: data.email ?? null,
        agentId: data.agentId ?? null,
        accountTierId: data.accountTierId,
        pin: data.pin ?? '0000', // Default PIN is 0000
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()

    return inserted[0]
  },
  'createUser',
)

export const updateUserProfile = wrapQuery(
  async (
    userId: number,
    updates: Partial<{
      username: string
      email: string
      password: string
      pin: string
      currentPassword?: string
    }>,
  ) => {
    try {
      if (!updates || Object.keys(updates).length === 0) return null

      // For password updates, verify current password
      if (updates.password && updates.currentPassword) {
        const currentUser = await getUserById(userId)
        if (!currentUser || currentUser.password !== updates.currentPassword) {
          throw new Error('Current password is incorrect')
        }
      }

      // For PIN updates, verify current PIN (stored in currentPassword field for PIN changes)
      if (updates.pin && updates.currentPassword) {
        const currentUser = await getUserById(userId)
        if (!currentUser || currentUser.pin !== updates.currentPassword) {
          throw new Error('Current PIN is incorrect')
        }
      }

      const now = new Date().toISOString()
      const updateData = { ...updates }
      delete updateData.currentPassword // Don't store currentPassword

      const res = await db
        .update(users)
        .set({ ...updateData, updated_at: now })
        .where(eq(users.id, userId))
        .returning()
        .execute()
      return res[0] || null
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  },
  'updateUserProfile',
)

export const getUserById = wrapQuery(async (userId: number) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}, 'getUserById')

export const login = wrapQuery(async (username: string, password: string) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .where(eq(users.password, password))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}, 'login')

export const getAllUsers = wrapQuery(async () => {
  return await db.select().from(users).execute()
}, 'getAllUsers')

export const createSession = wrapQuery(
  async (data: { userId: number; seed?: number }) => {
    const now = new Date().toISOString()
    const sessionId = `session_${data.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const inserted = await db
      .insert(sessions)
      .values({
        sessionId,
        userId: data.userId,
        seed: data.seed ?? null,
        currentDay: 0,
        status: 'active',
        createdDate: now,
        currentDate: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createSession',
)

export const getSessionsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdDate))
    .execute()
}, 'getSessionsByUserId')

export const updateSession = wrapQuery(
  async (
    sessionId: number,
    updates: Partial<{
      currentDay: number
      status: 'active' | 'paused' | 'completed'
      endedAt: string
    }>,
  ) => {
    try {
      await db
        .update(sessions)
        .set(updates)
        .where(eq(sessions.id, sessionId))
        .execute()
      const updated = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .execute()
      return updated[0] || null
    } catch (error) {
      console.error('Error updating session:', error)
      throw error
    }
  },
  'updateSession',
)

export const getAccountTypes = wrapQuery(async () => {
  return await db
    .select()
    .from(accountTypes)
    .orderBy(desc(accountTypes.sortOrder))
    .execute()
}, 'getAccountTypes')

export const getAccountTiers = wrapQuery(async () => {
  return await db
    .select()
    .from(accountTierLevels)
    .orderBy(accountTierLevels.sortOrder)
    .execute()
}, 'getAccountTiers')

export const getTransactionTypes = wrapQuery(async () => {
  return await db
    .select()
    .from(transactionTypes)
    .orderBy(transactionTypes.name)
    .execute()
}, 'getTransactionTypes')

// System config retrieval
export const getSystemConfig = wrapQuery(async () => {
  return await db.select().from(systemConfig).execute()
}, 'getSystemConfig')

// Accounts
export const createAccount = wrapQuery(
  async (data: {
    userId: number
    accountTypeId: number
    accountNumber: string
    accountName?: string
    initialDeposit?: number
    isPrimary?: boolean
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(accounts)
      .values({
        userId: data.userId,
        accountTypeId: data.accountTypeId,
        accountName: data.accountName ?? null,
        accountNumber: data.accountNumber,
        balance: data.initialDeposit ?? 0,
        availableBalance: data.initialDeposit ?? 0,
        isPrimary: data.isPrimary ? 1 : 0,
        status: 'active',
        openedDate: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createAccount',
)

export const getAccountsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(desc(accounts.createdAt))
    .execute()
}, 'getAccountsByUserId')

export const updateAccount = wrapQuery(
  async (
    accountId: number,
    updates: Partial<{
      status: 'active' | 'frozen' | 'closed'
      isPrimary: number
      overdraftProtectionEnabled: number
    }>,
  ) => {
    try {
      // @ts-ignore
      updates.updatedAt = new Date().toISOString()
      await db
        .update(accounts)
        .set(updates)
        .where(eq(accounts.id, accountId))
        .execute()
      const updated = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .execute()
      return updated[0]
    } catch (error) {
      console.error('Error updating account:', error)
      throw error
    }
  },
  'updateAccount',
)

// Transactions
export const deposit = wrapQuery(
  async (accountId: number, amount: number, sessionId?: number) => {
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .execute()
    if (!account[0]) throw new Error('Account not found')
    const newBalance = (account[0].balance ?? 0) + amount
    await db
      .update(accounts)
      .set({ balance: newBalance, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, accountId))
      .execute()

    const transaction = await db
      .insert(transactions)
      .values({
        sessionId: sessionId ?? null,
        userId: account[0].userId,
        fromAccountId: null,
        toAccountId: accountId,
        transactionTypeId: null, // could link to "deposit"
        amount,
        balanceBefore: account[0].balance,
        balanceAfter: newBalance,
        status: 'success',
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute()

    return transaction[0]
  },
  'deposit',
)

export const withdraw = wrapQuery(
  async (accountId: number, amount: number, sessionId?: number) => {
    // Fetch account and its type
    const accountRes = await db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        balance: accounts.balance,
        accountTypeId: accounts.accountTypeId,
        accountTypeCode: accountTypes.code,
      })
      .from(accounts)
      .innerJoin(accountTypes, eq(accountTypes.id, accounts.accountTypeId))
      .where(eq(accounts.id, accountId))
      .execute()

    const account = accountRes[0]
    if (!account) throw new Error('Account not found')

    // Strict withdrawal type check
    if (
      !ALLOWED_WITHDRAWAL_TYPES.includes(account.accountTypeCode.toLowerCase())
    ) {
      throw new Error(
        `Withdrawals from account type "${account.accountTypeCode}" are not allowed`,
      )
    }

    if ((account.balance ?? 0) < amount) throw new Error('INSUFFICIENT_FUNDS')

    const newBalance = account.balance - amount
    await db
      .update(accounts)
      .set({ balance: newBalance, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, accountId))
      .execute()

    const transaction = await db
      .insert(transactions)
      .values({
        sessionId: sessionId ?? null,
        userId: account.userId,
        fromAccountId: accountId,
        toAccountId: null,
        transactionTypeId: null, // could link to "withdraw"
        amount,
        balanceBefore: account.balance,
        balanceAfter: newBalance,
        status: 'success',
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute()

    return transaction[0]
  },
  'withdraw',
)

export const transferFunds = wrapQuery(
  async (
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    sessionId?: number,
  ) => {
    const fromAcc = await db
      .select({
        id: accounts.id,
        balance: accounts.balance,
        userId: accounts.userId,
        accountName: accounts.accountName,
      })
      .from(accounts)
      .where(eq(accounts.id, fromAccountId))
      .execute()
    const toAcc = await db
      .select({
        id: accounts.id,
        balance: accounts.balance,
        userId: accounts.userId,
        accountName: accounts.accountName,
      })
      .from(accounts)
      .where(eq(accounts.id, toAccountId))
      .execute()

    if (!fromAcc[0] || !toAcc[0]) throw new Error('Invalid account(s)')
    if ((fromAcc[0].balance ?? 0) < amount) {
      throw new Error('INSUFFICIENT_FUNDS')
    }

    // const fromUser = await db
    //   .select({ fullName: users.fullName })
    //   .from(users)
    //   .where(eq(users.id, fromAcc[0].userId))
    //   .execute()

    // const toUser = await db
    //   .select({ fullName: users.fullName })
    //   .from(users)
    //   .where(eq(users.id, toAcc[0].userId))
    //   .execute()

    const newFromBalance = fromAcc[0].balance - amount
    const newToBalance = (toAcc[0].balance ?? 0) + amount

    await db
      .update(accounts)
      .set({ balance: newFromBalance, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, fromAccountId))
      .execute()
    await db
      .update(accounts)
      .set({ balance: newToBalance, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, toAccountId))
      .execute()

    const transaction = await db
      .insert(transactions)
      .values({
        sessionId: sessionId ?? null,
        userId: fromAcc[0].userId,
        fromAccountId,
        toAccountId,
        transactionTypeId: 1, // Transfer transaction type
        amount,
        balanceBefore: fromAcc[0].balance,
        balanceAfter: newFromBalance,
        status: 'success',
        // description: `${fromUser[0].fullName}'s ${fromAcc[0].accountName} to ${toUser[0].fullName}'s ${toAcc[0].accountName}`,
        description: `${fromAcc[0].accountName} to ${toAcc[0].accountName}`,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute()

    return transaction[0]
  },
  'transferFunds',
)

export const getAccounts = wrapQuery(async () => {
  return await db.select().from(accounts).execute()
}, 'getAccounts')

export const getAccountById = wrapQuery(async (accountId: number) => {
  return await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .execute()
}, 'getAccountById')

export const getCreditCards = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, userId))
    .orderBy(desc(creditCards.createdAt))
    .execute()
}, 'getCreditCards')

// Get a specific credit card with details
export const getCreditCard = wrapQuery(async (cardId: number) => {
  const card = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.id, cardId))
    .execute()
  return card[0]
}, 'getCreditCard')

// Apply for a new credit card (opens credit line)
export const applyCreditCard = wrapQuery(
  async (data: {
    userId: number
    cardholderName: string
    creditLimit?: number
    apr?: number
    annualFee?: number
  }) => {
    const now = new Date().toISOString()

    // In real banking, this would involve credit check, approval process, etc.
    // For simulation, we'll auto-approve and generate card details

    // Generate card number (simplified - real banks use proper card number algorithms)
    const cardNumber = generateCardNumber()
    const lastFourDigits = cardNumber.slice(-4)
    const cvv = generateCVV()

    // Use provided credit limit or fall back to requested limit or default
    const approvedCreditLimit = data.creditLimit || 5000

    // Payment due date (e.g., 25th of each month)
    const paymentDueDay = 25
    // Statement closing date (e.g., 28th of each month)
    const statementClosingDay = 28

    const inserted = await db
      .insert(creditCards)
      .values({
        userId: data.userId,
        cardNumber,
        lastFourDigits,
        cardholderName: data.cardholderName,
        expiryMonth: new Date().getMonth() + 1,
        expiryYear: new Date().getFullYear() + 10, // 3 years validity
        cvv,
        creditLimit: approvedCreditLimit,
        currentBalance: 0,
        availableCredit: approvedCreditLimit,
        apr: data.apr || 18.99, // Use provided APR or default
        annualFee: data.annualFee || 0,
        cashAdvanceFeePercent: 5.0,
        latePaymentFee: 35.0,
        paymentDueDay,
        minimumPaymentPercent: 2.0,
        statementClosingDay,
        autopayEnabled: 0,
        autopayAmount: 'minimum',
        status: 'active',
        openedDate: now,
        createdAt: now,
      })
      .returning()
      .execute()

    return inserted[0]
  },
  'applyCreditCard',
)

export const getRecentTransactionsForUser = wrapQuery(
  async (userId: number) => {
    try {
      return await db
        .select({
          id: transactions.id,
          sessionId: transactions.sessionId,
          transactionTypeId: transactions.transactionTypeId,
          userId: transactions.userId,
          fromAccountId: transactions.fromAccountId,
          toAccountId: transactions.toAccountId,
          billerId: transactions.billerId,
          billId: transactions.billId,
          beneficiaryId: transactions.beneficiaryId,
          zelleContactId: transactions.zelleContactId,
          creditCardId: transactions.creditCardId,
          amount: transactions.amount,
          fee: transactions.fee,
          balanceBefore: transactions.balanceBefore,
          balanceAfter: transactions.balanceAfter,
          referenceId: transactions.referenceId,
          confirmationNumber: transactions.confirmationNumber,
          description: transactions.description,
          memo: transactions.memo,
          transactionDate: transactions.transactionDate,
          postedDate: transactions.postedDate,
          day: transactions.day,
          status: transactions.status,
          failureReason: transactions.failureReason,
          errorCode: transactions.errorCode,
          errorMessage: transactions.errorMessage,
          metadata: transactions.metadata,
          createdAt: transactions.createdAt,

          fromAccount: {
            id: fromAccounts.id,
            accountNumber: fromAccounts.accountNumber,
            accountName: fromAccounts.accountName,
            accountTypeId: fromAccounts.accountTypeId,
            isPrimary: fromAccounts.isPrimary,
            status: fromAccounts.status,
            balance: fromAccounts.balance,
            availableBalance: fromAccounts.availableBalance,
          },

          toAccount: {
            id: toAccounts.id,
            accountNumber: toAccounts.accountNumber,
            accountName: toAccounts.accountName,
            accountTypeId: toAccounts.accountTypeId,
            isPrimary: toAccounts.isPrimary,
            status: toAccounts.status,
            balance: toAccounts.balance,
            availableBalance: toAccounts.availableBalance,
          },

          zelleContact: {
            id: zelleContacts.id,
            contactName: zelleContacts.contactName,
            contactEmail: zelleContacts.contactEmail,
            contactPhone: zelleContacts.contactPhone,
            isEnrolled: zelleContacts.isEnrolled,
            isFavorite: zelleContacts.isFavorite,
          },
        })
        .from(transactions)
        .leftJoin(
          transactionTypes,
          eq(transactionTypes.id, transactions.transactionTypeId),
        )
        .leftJoin(fromAccounts, eq(fromAccounts.id, transactions.fromAccountId))
        .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
        .leftJoin(
          zelleContacts,
          eq(zelleContacts.id, transactions.zelleContactId),
        )
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
    } catch (error) {
      console.error('Error getting recent transactions for user:', error)
      throw error
    }
  },
  'getRecentTransactionsForUser',
)

// Helper functions to generate card details (for simulation)
function generateCardNumber(): string {
  // Wells Fargo cards typically start with 4 (Visa)
  // Format: 4XXX-XXXX-XXXX-XXXX
  const prefix = '4'
  let cardNumber = prefix
  for (let i = 0; i < 15; i++) {
    cardNumber += Math.floor(Math.random() * 10)
  }
  return cardNumber
}

function generateCVV(): string {
  return Math.floor(100 + Math.random() * 900).toString()
}

// Make a credit card payment
export const makeCreditCardPayment = wrapQuery(
  async (data: {
    userId: number
    creditCardId: number
    fromAccountId: number
    amount: number
    memo?: string
  }) => {
    const now = new Date().toISOString()

    // Get the credit card
    const card = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, data.creditCardId))
      .execute()

    if (!card[0]) {
      throw new Error('Credit card not found')
    }

    // Get the payment source account
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, data.fromAccountId))
      .execute()

    if (!account[0]) {
      throw new Error('Account not found')
    }

    // Check if sufficient funds
    if (account[0].availableBalance < data.amount) {
      throw new Error('Insufficient funds')
    }

    // Get transaction type for credit card payment
    const txType = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.code, 'credit_card_payment'))
      .execute()

    // Create transaction
    const transaction = await db
      .insert(transactions)
      .values({
        transactionTypeId: txType[0].id,
        userId: data.userId,
        fromAccountId: data.fromAccountId,
        creditCardId: data.creditCardId,
        amount: data.amount,
        fee: 0,
        balanceBefore: account[0].balance,
        balanceAfter: account[0].balance - data.amount,
        description: `Credit Card Payment - ${card[0].lastFourDigits}`,
        memo: data.memo,
        transactionDate: now,
        postedDate: now,
        status: 'success',
        createdAt: now,
      })
      .returning()
      .execute()

    // Update account balance
    await db
      .update(accounts)
      .set({
        balance: account[0].balance - data.amount,
        availableBalance: account[0].availableBalance - data.amount,
        updatedAt: now,
      })
      .where(eq(accounts.id, data.fromAccountId))
      .execute()

    // Update credit card balance
    const newBalance = Math.max(0, card[0].currentBalance - data.amount)
    await db
      .update(creditCards)
      .set({
        currentBalance: newBalance,
        availableCredit: card[0].creditLimit - newBalance,
        lastPaymentDate: now,
      })
      .where(eq(creditCards.id, data.creditCardId))
      .execute()

    return transaction[0]
  },
  'makeCreditCardPayment',
)

// Make a credit card charge/purchase
export const chargeCreditCard = wrapQuery(
  async (data: {
    userId: number
    creditCardId: number
    amount: number
    description: string
    memo?: string
  }) => {
    const now = new Date().toISOString()

    // Get the credit card
    const card = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, data.creditCardId))
      .execute()

    if (!card[0]) {
      throw new Error('Credit card not found')
    }

    // Check if available credit
    if (card[0].availableCredit < data.amount) {
      throw new Error('Insufficient credit available')
    }

    // Get transaction type for purchase
    const txType = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.code, 'purchase'))
      .execute()

    // Create transaction
    const transaction = await db
      .insert(transactions)
      .values({
        transactionTypeId: txType[0].id,
        userId: data.userId,
        creditCardId: data.creditCardId,
        amount: data.amount,
        fee: 0,
        description: data.description,
        memo: data.memo,
        transactionDate: now,
        postedDate: now,
        status: 'success',
        createdAt: now,
      })
      .returning()
      .execute()

    // Update credit card balance
    const newBalance = card[0].currentBalance + data.amount
    await db
      .update(creditCards)
      .set({
        currentBalance: newBalance,
        availableCredit: card[0].creditLimit - newBalance,
      })
      .where(eq(creditCards.id, data.creditCardId))
      .execute()

    return transaction[0]
  },
  'chargeCreditCard',
)

// Setup autopay for credit card
export const setupCreditCardAutopay = wrapQuery(
  async (data: {
    creditCardId: number
    linkedCheckingAccountId: number
    autopayAmount: 'minimum' | 'statement_balance' | 'current_balance'
  }) => {
    const now = new Date().toISOString()

    await db
      .update(creditCards)
      .set({
        linkedCheckingAccountId: data.linkedCheckingAccountId,
        autopayEnabled: 1,
        autopayAmount: data.autopayAmount,
        updatedAt: now,
      })
      .where(eq(creditCards.id, data.creditCardId))
      .execute()

    return { success: true }
  },
  'setupCreditCardAutopay',
)

// Disable autopay for credit card
export const disableCreditCardAutopay = wrapQuery(
  async (creditCardId: number) => {
    await db
      .update(creditCards)
      .set({
        autopayEnabled: 0,
      })
      .where(eq(creditCards.id, creditCardId))
      .execute()

    return { success: true }
  },
  'disableCreditCardAutopay',
)

// Get credit card transactions
export const getCreditCardTransactions = wrapQuery(
  async (data: {
    creditCardId: number
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.creditCardId, data.creditCardId))
      .orderBy(desc(transactions.createdAt))

    if (data.startDate && data.endDate) {
      query = query.where(
        and(
          gte(transactions.createdAt, data.startDate),
          lte(transactions.createdAt, data.endDate),
        ),
      )
    }

    if (data.limit) {
      query = query.limit(data.limit)
    }

    return await query.execute()
  },
  'getCreditCardTransactions',
)

// Calculate minimum payment due
export const calculateMinimumPayment = wrapQuery(
  async (creditCardId: number) => {
    const card = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, creditCardId))
      .execute()

    if (!card[0]) {
      throw new Error('Credit card not found')
    }

    // Minimum payment is typically the greater of:
    // 1. A percentage of the balance (e.g., 2%)
    // 2. A fixed minimum amount (e.g., $25)
    const percentagePayment =
      card[0].currentBalance * (card[0].minimumPaymentPercent / 100)
    const minimumPayment = Math.max(percentagePayment, 25)

    // If balance is less than minimum, pay full balance
    return Math.min(minimumPayment, card[0].currentBalance)
  },
  'calculateMinimumPayment',
)

// Close/Cancel credit card
export const closeCreditCard = wrapQuery(async (creditCardId: number) => {
  // Check if there's a balance
  const card = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.id, creditCardId))
    .execute()

  if (card[0].currentBalance > 0) {
    throw new Error('Cannot close credit card with outstanding balance')
  }

  await db
    .update(creditCards)
    .set({
      status: 'closed',
    })
    .where(eq(creditCards.id, creditCardId))
    .execute()

  return { success: true }
}, 'closeCreditCard')

// Process monthly interest and fees
export const processCreditCardMonthlyCharges = wrapQuery(
  async (creditCardId: number) => {
    const now = new Date().toISOString()

    const card = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, creditCardId))
      .execute()

    if (!card[0]) {
      throw new Error('Credit card not found')
    }

    // Calculate monthly interest
    const monthlyInterestRate = card[0].apr / 12 / 100
    const interestCharge = card[0].currentBalance * monthlyInterestRate

    // Get transaction type for interest charge
    const txType = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.code, 'interest_charge'))
      .execute()

    // Create interest charge transaction
    if (interestCharge > 0) {
      await db
        .insert(transactions)
        .values({
          transactionTypeId: txType[0].id,
          userId: card[0].userId,
          creditCardId,
          amount: interestCharge,
          fee: 0,
          description: 'Monthly Interest Charge',
          transactionDate: now,
          postedDate: now,
          status: 'success',
          createdAt: now,
        })
        .execute()

      // Update balance
      const newBalance = card[0].currentBalance + interestCharge
      await db
        .update(creditCards)
        .set({
          currentBalance: newBalance,
          availableCredit: card[0].creditLimit - newBalance,
        })
        .where(eq(creditCards.id, creditCardId))
        .execute()
    }

    return { interestCharge }
  },
  'processCreditCardMonthlyCharges',
)

/** BENEFICIARIES */
export const getBeneficiaries = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.userId, userId))
    .orderBy(desc(beneficiaries.createdAt))
    .execute()
}, 'getBeneficiaries')

export const addBeneficiary = wrapQuery(
  async (data: {
    userId: number
    name: string
    accountNumber: string
    accountType: string
    bankName?: string
    nickname?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(beneficiaries)
      .values({ ...data, status: 'active', createdAt: now })
      .returning()
      .execute()
    return inserted[0]
  },
  'addBeneficiary',
)

export const updateBeneficiary = wrapQuery(
  async (
    id: number,
    updates: Partial<{
      name: string
      accountNumber: string
      accountType: string
      bankName: string
      nickname: string
      status: 'active' | 'inactive'
    }>,
  ) => {
    try {
      // @ts-ignore
      updates.updatedAt = new Date().toISOString()
      await db
        .update(beneficiaries)
        .set(updates)
        .where(eq(beneficiaries.id, id))
        .execute()
      const updated = await db
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.id, id))
        .execute()
      return updated[0]
    } catch (error) {
      console.error('Error updating beneficiary:', error)
      throw error
    }
  },
  'updateBeneficiary',
)

export const removeBeneficiary = wrapQuery(async (id: number) => {
  await db
    .update(beneficiaries)
    .set({ status: 'inactive', updatedAt: new Date().toISOString() })
    .where(eq(beneficiaries.id, id))
    .execute()
}, 'removeBeneficiary')

export const getBillers = wrapQuery(async (userId?: number) => {
  let query = db.select().from(billers).where(eq(billers.isActive, 1))

  if (typeof userId === 'number') {
    // Use a raw SQL condition for the user_id column because the
    // drizzle schema for `billers` doesn't expose a userId field.
    query = query.where(sql`(user_id IS NULL OR user_id = ${userId})`)
  } else {
    // No user specified: only return global (predefined) billers
    query = query.where(sql`user_id IS NULL`)
  }

  return await query.orderBy(desc(billers.id)).execute()
}, 'getBillers')

// Return both predefined (DB) billers and mock/local billers from JSON
export const getAllBillers = wrapQuery(async (userId?: number) => {
  // DB billers: active and either global (user_id IS NULL) or owned by userId
  let dbQuery = db.select().from(billers).where(eq(billers.isActive, 1))
  if (typeof userId === 'number') {
    dbQuery = dbQuery.where(sql`(user_id IS NULL OR user_id = ${userId})`)
  } else {
    dbQuery = dbQuery.where(sql`user_id IS NULL`)
  }

  const dbBillers = await dbQuery.orderBy(desc(billers.id)).execute()

  // mockBillers is an array imported from JSON; merge but avoid duplicates by code
  const seen = new Set<string>()
  const merged: any[] = []

  for (const b of mockBillers as any[]) {
    if (!b.code) continue
    seen.add(b.code)
    merged.push({ ...b, source: 'mock' })
  }

  for (const b of dbBillers) {
    if (!b.code || seen.has(b.code)) continue
    merged.push({ ...b, source: 'db' })
  }

  return merged
}, 'getAllBillers')

// Allow a user to add a custom biller (stored in user_billers table)
export const addUserBiller = wrapQuery(
  async (data: {
    userId?: number // Optional for predefined billers
    code?: string // Optional for user-defined billers
    name: string
    category: string
    subcategory?: string
    description?: string
    logoUrl?: string
    website?: string
    phone?: string
    address?: string
    requiresAccountNumber?: boolean
    requiresRoutingNumber?: boolean
    acceptsCreditCard?: boolean
    acceptsDebitCard?: boolean
    acceptsBankAccount?: boolean
    minPaymentAmount?: number
    maxPaymentAmount?: number
    averageBillAmount?: number
    paymentProcessingDays?: number
    isActive?: boolean
  }) => {
    try {
      const now = new Date().toISOString()

      const inserted = await db
        .insert(billers)
        .values({
          user_id: data.userId ?? null, // NULL for predefined billers
          code: data.code ?? null, // NULL for user-defined billers
          name: data.name,
          name_normalized: data.name.toLowerCase().replace(/\s+/g, ''),
          category: data.category,
          subcategory: data.subcategory ?? null,
          description: data.description ?? null,
          logo_url: data.logoUrl ?? null,
          website: data.website ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          requires_account_number: data.requiresAccountNumber ? 1 : 0,
          requires_routing_number: data.requiresRoutingNumber ? 1 : 0,
          accepts_credit_card: data.acceptsCreditCard ? 1 : 0,
          accepts_debit_card: data.acceptsDebitCard ? 1 : 0,
          accepts_bank_account: data.acceptsBankAccount ? 1 : 0,
          min_payment_amount: data.minPaymentAmount ?? 1.0,
          max_payment_amount: data.maxPaymentAmount ?? null,
          average_bill_amount: data.averageBillAmount ?? null,
          payment_processing_days: data.paymentProcessingDays ?? 1,
          is_active: data.isActive ? 1 : 0,
          created_at: now,
        })
        .returning()
        .execute()

      return inserted[0]
    } catch (error) {
      console.error('Error adding biller:', error)
      throw error
    }
  },
  'addUserBiller',
)

// Pay a bill: supports paying from checking/savings account or charging a credit card
export const payBill = wrapQuery(
  async (data: {
    billId: number
    paymentMethod: 'account' | 'credit_card'
    accountId?: number
    creditCardId?: number
    sessionId?: number
  }) => {
    try {
      const now = new Date().toISOString()
      const validSessionId = await getValidSessionId(data.sessionId)

      // Fetch bill
      const billRes = await db
        .select()
        .from(bills)
        .where(eq(bills.id, data.billId))
        .execute()
      const bill = billRes[0]
      if (!bill) throw new Error('Bill not found')
      if (bill.status !== 'pending') throw new Error('Bill is not pending')

      // Fetch biller name
      const billerRes = await db
        .select()
        .from(billers)
        .where(eq(billers.id, bill.billerId))
        .execute()
      const biller = billerRes[0]
      if (!biller) throw new Error('Biller not found')

      // Get transaction type id for bill_payment
      const txTypeRes = await db
        .select()
        .from(transactionTypes)
        .where(eq(transactionTypes.code, 'bill_payment'))
        .execute()
      if (!txTypeRes[0]) {
        throw new Error('Transaction type bill_payment not found')
      }
      const txTypeId = txTypeRes[0].id

      let transaction: any = null

      if (data.paymentMethod === 'account') {
        if (!data.accountId) {
          throw new Error('accountId is required for account payments')
        }

        // Fetch account and validate ownership
        const accRes = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, data.accountId))
          .execute()
        const account = accRes[0]
        if (!account) throw new Error('Account not found')
        if (account.userId !== bill.userId) {
          throw new Error('Account does not belong to bill owner')
        }

        if ((account.availableBalance ?? 0) < bill.amount) {
          throw new Error('Insufficient funds')
        }

        const balanceBefore = account.balance ?? 0
        const availableBefore = account.availableBalance ?? 0
        const newBalance = balanceBefore - bill.amount
        const newAvailable = availableBefore - bill.amount

        // Update account balances
        await db
          .update(accounts)
          .set({
            balance: newBalance,
            availableBalance: newAvailable,
            updatedAt: now,
          })
          .where(eq(accounts.id, data.accountId))
          .execute()

        // Create transaction
        const tx = await db
          .insert(transactions)
          .values({
            sessionId: validSessionId,
            transactionTypeId: txTypeId,
            userId: bill.userId,
            fromAccountId: data.accountId,
            toAccountId: null,
            billerId: bill.billerId ?? null,
            userBillerId: bill.userBillerId ?? null,
            billId: bill.id,
            amount: bill.amount,
            fee: 0,
            balanceBefore,
            balanceAfter: newBalance,
            description: `Payment to ${biller.name}`,
            transactionDate: now,
            postedDate: now,
            status: 'success',
            createdAt: now,
          })
          .returning()
          .execute()

        transaction = tx[0]
      } else if (data.paymentMethod === 'credit_card') {
        if (!data.creditCardId) {
          throw new Error('creditCardId is required for credit card payments')
        }

        const cardRes = await db
          .select()
          .from(creditCards)
          .where(eq(creditCards.id, data.creditCardId))
          .execute()
        const card = cardRes[0]
        if (!card) throw new Error('Credit card not found')
        if (card.userId !== bill.userId) {
          throw new Error('Credit card does not belong to bill owner')
        }

        if ((card.availableCredit ?? 0) < bill.amount) {
          throw new Error('Insufficient credit available')
        }

        const balanceBefore = card.currentBalance ?? 0
        const newCardBalance = balanceBefore + bill.amount

        // Update credit card balances
        await db
          .update(creditCards)
          .set({
            currentBalance: newCardBalance,
            availableCredit: card.creditLimit - newCardBalance,
          })
          .where(eq(creditCards.id, data.creditCardId))
          .execute()

        const tx = await db
          .insert(transactions)
          .values({
            sessionId: validSessionId,
            transactionTypeId: txTypeId,
            userId: bill.userId,
            fromAccountId: null,
            toAccountId: null,
            billerId: bill.billerId ?? null,
            userBillerId: bill.userBillerId ?? null,
            billId: bill.id,
            creditCardId: data.creditCardId,
            amount: bill.amount,
            fee: 0,
            balanceBefore: card.currentBalance,
            balanceAfter: newCardBalance,
            description: `Payment of $${bill.amount.toFixed(2)} to ${biller.name} using credit card ending in ${card.cardNumber.slice(-4)}`,
            transactionDate: now,
            postedDate: now,
            status: 'success',
            createdAt: now,
          })
          .returning()
          .execute()

        transaction = tx[0]
      } else {
        throw new Error('Unsupported payment method')
      }

      // Mark bill as paid
      await db
        .update(bills)
        .set({
          status: 'paid',
          paidDate: now,
          paidAmount: bill.amount,
          updatedAt: now,
        })
        .where(eq(bills.id, bill.id))
        .execute()

      return {
        bill: {
          ...bill,
          status: 'paid',
          paidDate: now,
          paidAmount: bill.amount,
        },
        transaction,
      }
    } catch (error) {
      console.error('Error paying bill:', error)
      throw error
    }
  },
  'payBill',
)

/** BILLS */
export const getBillsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(bills)
    .where(eq(bills.userId, userId))
    .orderBy(desc(bills.createdAt))
    .execute()
}, 'getBillsByUserId')

export const createBill = wrapQuery(
  async (data: {
    userId: number
    billerId: number
    accountId?: number
    amount: number
    dueDay?: number
    isRecurring?: number
    recurrenceInterval?: number
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(bills)
      .values({
        ...data,
        nextDueDate: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createBill',
)

export const updateBillStatus = wrapQuery(
  async (
    billId: number,
    status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  ) => {
    await db
      .update(bills)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(bills.id, billId))
      .execute()
    const updated = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .execute()
    return updated[0]
  },
  'updateBillStatus',
)

/** ZELLE CONTACTS */
export const onboardZelle = wrapQuery(async (userId: number) => {
  await db
    .update(users)
    .set({ isZelleUser: 1 })
    .where(eq(users.id, userId))
    .execute()
}, 'onboardZelle')

export const createZelleContact = wrapQuery(
  async (data: {
    userId: number
    contactName: string
    contactEmail?: string
    contactPhone?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(zelleContacts)
      .values({
        ...data,
        isEnrolled: 1,
        isFavorite: 0,
        lastSentAmount: 0,
        createdAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createZelleContact',
)

export const getZelleContactsByUserId = wrapQuery(async (userId: number) => {
  const contacts = await db
    .select()
    .from(zelleContacts)
    .where(eq(zelleContacts.userId, userId))
    .orderBy(zelleContacts.isFavorite, zelleContacts.contactName)
    .execute()
  return contacts
}, 'getZelleContactsByUserId')

export const updateZelleContact = wrapQuery(
  async (
    contactId: number,
    updates: Partial<{
      contactName: string
      contactEmail: string
      contactPhone: string
      isFavorite: number
    }>,
  ) => {
    const updated = await db
      .update(zelleContacts)
      .set(updates)
      .where(eq(zelleContacts.id, contactId))
      .returning()
      .execute()
    return updated[0]
  },
  'updateZelleContact',
)

export const sendZelle = wrapQuery(
  async (
    fromUserId: number,
    toUserId: number,
    fromAccountId: number,
    amount: number,
    transactionTypeId: number,
    memo?: string,
  ) => {
    const fromAcc = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, fromAccountId))
      .execute()
    if (!fromAcc[0]) throw new Error('Source account not found')
    if (fromAcc[0].balance < amount) throw new Error('INSUFFICIENT_FUNDS')

    const txType = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.id, transactionTypeId))
      .execute()
    if (!txType[0] || txType[0].code !== 'zelle') {
      throw new Error('INVALID_TRANSACTION_TYPE_FOR_NEXUS')
    }

    const contact = await db
      .select()
      .from(zelleContacts)
      .where(
        and(
          eq(zelleContacts.id, toUserId),
          eq(zelleContacts.userId, fromUserId),
        ),
      )
      .execute()
    if (!contact[0]) {
      throw new Error('NEXUS_CONTACT_NOT_FOUND')
    }

    const newFromBalance = fromAcc[0].balance - amount
    await db
      .update(accounts)
      .set({ balance: newFromBalance, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, fromAccountId))
      .execute()

    const transaction = await db
      .insert(transactions)
      .values({
        sessionId: null,
        userId: fromUserId,
        transactionTypeId,
        fromAccountId,
        toAccountId: null,
        beneficiaryId: null,
        zelleContactId: toUserId,
        amount,
        balanceBefore: fromAcc[0].balance,
        balanceAfter: newFromBalance,
        status: 'success',
        description: `Nexus payment to ${contact[0].contactName}`,
        createdAt: new Date().toISOString(),
        memo,
      })
      .returning()
      .execute()

    return transaction[0]
  },
  'sendZelle',
)

export const endSession = wrapQuery(async (sessionId: number) => {
  await db
    .update(sessions)
    .set({ status: 'ended', endedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId))
    .execute()
}, 'endSession')

/** TRANSACTIONS */
export const getTransactionsBySession = wrapQuery(async (sessionId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.sessionId, sessionId))
    .orderBy(desc(transactions.createdAt))
    .execute()
}, 'getTransactionsBySession')

export const createTransaction = wrapQuery(
  async (data: {
    sessionId?: number
    transactionTypeId: number
    userId: number
    fromAccountId?: number
    toAccountId?: number
    billerId?: number
    billId?: number
    beneficiaryId?: number
    zelleContactId?: number
    creditCardId?: number
    debitCardId?: number
    amount: number
    fee?: number
    balanceBefore?: number
    balanceAfter?: number
    referenceId?: string
    status?: 'success' | 'failed' | 'pending'
    description?: string
    memo?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(transactions)
      .values({
        ...data,
        fee: data.fee ?? 0,
        status: data.status ?? 'success',
        createdAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createTransaction',
)

/** SCHEDULED TRANSACTIONS */
export const createScheduledTransaction = wrapQuery(
  async (data: {
    userId: number
    transactionTypeId: number
    fromAccountId?: number
    toAccountId?: number
    billerId?: number
    userBillerId?: number
    beneficiaryId?: number
    amount: number
    scheduledDate: string
    isRecurring?: number
    recurrenceFrequency?: string
    recurrenceEndDate?: string
    description?: string
    memo?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(scheduledTransactions)
      .values({
        ...data,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    console.log(
      'Inserted scheduled transaction:',
      JSON.stringify(inserted[0], null, 2),
    )
    return inserted[0]
  },
  'createScheduledTransaction',
)

export const getScheduledTransactionsByUserId = wrapQuery(
  async (userId: number) => {
    return await db
      .select()
      .from(scheduledTransactions)
      .where(eq(scheduledTransactions.userId, userId))
      .orderBy(desc(scheduledTransactions.scheduledDate))
      .execute()
  },
  'getScheduledTransactionsByUserId',
)

export const processScheduledTransaction = wrapQuery(
  async (scheduledTransactionId: number, transactionId: number) => {
    await db
      .update(scheduledTransactions)
      .set({
        status: 'processed',
        processedTransactionId: transactionId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scheduledTransactions.id, scheduledTransactionId))
      .execute()
  },
  'processScheduledTransaction',
)

export const getAllNotifications = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0),
        sql`(read_at IS NULL OR read_at = '')`,
      ),
    )
    .execute()
}, 'getAllNotifications')

export const getNotificationById = wrapQuery(async (notificationId: number) => {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .execute()
}, 'getNotificationById')

export const markNotificationAsRead = wrapQuery(
  async (notificationId: number) => {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, notificationId))
      .execute()
  },
  'markNotificationAsRead',
)

export const deleteNotification = wrapQuery(async (notificationId: number) => {
  await db
    .delete(notifications)
    .where(eq(notifications.id, notificationId))
    .execute()
}, 'deleteNotification')

export const createScheduledPayment = wrapQuery(
  async (data: {
    userId: number
    billerId: number
    amount: number
    scheduledDate: string
    notes: string
    fromAccountId?: string
    creditCardId?: string
    createdAt?: string
    updatedAt?: string
  }) => {
    // Get the bill payment transaction type
    const billPaymentType = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.code, 'bill_payment'))
      .execute()

    if (!billPaymentType.length) {
      throw new Error('Bill payment transaction type not found')
    }

    return await createScheduledTransaction({
      userId: data.userId,
      transactionTypeId: billPaymentType[0].id,
      billerId: data.billerId,
      amount: data.amount,
      scheduledDate: data.scheduledDate,
      description: data.notes || 'Scheduled bill payment',
      memo: data.notes,
      // @ts-ignore
      fromAccountId: data.fromAccountId as string,
      creditCardId: data.creditCardId as string,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    })
  },
  'createScheduledPayment',
)

export const queries = {
  transferFunds,
  getTransactionsBySession,
  createTransaction,
  createScheduledTransaction,
  getScheduledTransactionsByUserId,
  processScheduledTransaction,
  isDatabaseInitialized,
  createUser,
  updateUserProfile,
  getUserById,
  login,
  getAllUsers,
  getAccounts,
  getAccountById,
  createSession,
  getSessionsByUserId,
  updateSession,
  getAccountTypes,
  getAccountTiers,
  getTransactionTypes,
  getSystemConfig,
  createAccount,
  getAccountsByUserId,
  updateAccount,
  deposit,
  withdraw,
  getCreditCards,
  getCreditCard,
  applyCreditCard,
  closeCreditCard,
  getCreditCardTransactions,
  makeCreditCardPayment,
  processCreditCardMonthlyCharges,
  getBillers,
  getAllBillers,
  getBillsByUserId,
  createBill,
  updateBillStatus,
  onboardZelle,
  createZelleContact,
  getZelleContactsByUserId,
  updateZelleContact,
  sendZelle,
  chargeCreditCard,
  setupCreditCardAutopay,
  disableCreditCardAutopay,
  addUserBiller,
  payBill,
  calculateMinimumPayment,
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  removeBeneficiary,
  endSession,
  getAllNotifications,
  getNotificationById,
  markNotificationAsRead,
  deleteNotification,
  getRecentTransactionsForUser,
  createScheduledPayment,
}
