// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db, reopenConnection } from '@/db'
import type { UserSettings } from '@/models/types'
import { and, between, desc, eq, like, or, sql } from 'drizzle-orm'
import {
  contactsTable,
  deserializeSettings,
  transactionsTable,
  usersTable,
  walletsTable,
} from './schema'

export type TransactionType = 'transfer' | 'deposit' | 'withdrawal'
export type TransactionStatus = 'pending' | 'completed' | 'failed'
export type WalletStatus = 'active' | 'inactive' | 'frozen'

interface ContactResult {
  contactUserId: number
  nickname: string | null
  favorite: number
}

interface UserSearchResult {
  id: number
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
}

export const queries = {
  async getUserByEmail(email: string) {
    try {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .get()

      if (!user) return null

      return {
        ...user,
        id: Number(user.id),
        settings: deserializeSettings<UserSettings>(user.settings),
      }
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  },

  async getUserWallets(userId: number) {
    try {
      const wallets = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, userId))
        .all()
      return wallets
    } catch (error) {
      console.error('Failed to get wallets:', error)
      return []
    }
  },

  async getTransactionHistory(walletId: number) {
    try {
      const transactions = await db
        .select()
        .from(transactionsTable)
        .where(
          or(
            eq(transactionsTable.senderWalletId, walletId),
            eq(transactionsTable.receiverWalletId, walletId),
          ),
        )
        .orderBy(sql`${transactionsTable.createdAt} DESC`)
        .all()
      return transactions
    } catch (error) {
      console.error('Failed to get transactions:', error)
      return []
    }
  },

  async getUserContacts(userId: number) {
    try {
      const contacts = await db
        .select({
          contact: contactsTable,
          user: {
            email: usersTable.email,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
            phoneNumber: usersTable.phoneNumber,
          },
        })
        .from(contactsTable)
        .innerJoin(usersTable, eq(contactsTable.contactUserId, usersTable.id))
        .where(eq(contactsTable.userId, userId))
        .orderBy(contactsTable.favorite)
        .all()
      return contacts
    } catch (error) {
      console.error('Failed to get contacts:', error)
      return []
    }
  },

  async isDatabaseInitialized() {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000

    while (retryCount < maxRetries) {
      try {
        // Check if db is accessible
        if (!db) {
          console.error('Database instance is not available')

          // Try to reconnect
          await reopenConnection()
          await new Promise(resolve => setTimeout(resolve, 500))

          if (!db) {
            throw new Error(
              'Failed to get database instance after reconnection',
            )
          }
        }

        // Test the connection with a simple query
        const result = await db
          .select({ count: sql`count(*)` })
          .from(usersTable)
          .get()

        const isInitialized = ((result as { count: number }).count ?? 0) > 0
        return isInitialized
      } catch (error: any) {
        console.warn(
          `Failed to check database (attempt ${retryCount + 1}/${maxRetries}):`,
          error,
        )

        if (error.message?.includes('Access to closed resource')) {
          try {
            await reopenConnection()
            // Add a small delay to ensure connection is ready
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (reconnectError) {
            console.error('Failed to reconnect to database:', reconnectError)
          }
        }

        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    return false
  },

  async getWalletById(walletId: number) {
    try {
      return await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.id, walletId))
        .get()
    } catch (error) {
      console.error('Failed to get wallet:', error)
      return null
    }
  },

  async getActiveWallets(userId: number) {
    try {
      return await db
        .select()
        .from(walletsTable)
        .where(
          and(
            eq(walletsTable.userId, userId),
            eq(walletsTable.status, 'active'),
          ),
        )
        .all()
    } catch (error) {
      console.error('Failed to get active wallets:', error)
      return []
    }
  },

  async getTransactionsByDateRange(
    walletId: number,
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const offset = (page - 1) * limit
      return await db
        .select()
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            between(transactionsTable.createdAt, startDate, endDate),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset)
        .all()
    } catch (error) {
      console.error('Failed to get transactions by date range:', error)
      return []
    }
  },

  // Get ALL transactions for a date range without pagination (for limit checking)
  async getAllTransactionsByDateRange(
    walletId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      return await db
        .select()
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            between(transactionsTable.createdAt, startDate, endDate),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .all()
    } catch (error) {
      console.error('Failed to get all transactions by date range:', error)
      return []
    }
  },

  async getTransactionsByType(
    walletId: number,
    type: TransactionType,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const offset = (page - 1) * limit
      return await db
        .select()
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            eq(transactionsTable.type, type),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset)
        .all()
    } catch (error) {
      console.error('Failed to get transactions by type:', error)
      return []
    }
  },

  async getTransactionById(transactionId: number) {
    try {
      const transaction = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, transactionId))
        .get()

      return transaction
    } catch (error) {
      console.error('Error fetching transaction:', error)
      return null
    }
  },

  async getPendingTransactions(walletId: number) {
    try {
      return await db
        .select()
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            eq(transactionsTable.status, 'pending'),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .all()
    } catch (error) {
      console.error('Failed to get pending transactions:', error)
      return []
    }
  },

  async getFavoriteContacts(userId: number) {
    try {
      return await db
        .select({
          contact: contactsTable,
          user: {
            email: usersTable.email,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
            phoneNumber: usersTable.phoneNumber,
          },
        })
        .from(contactsTable)
        .innerJoin(usersTable, eq(contactsTable.contactUserId, usersTable.id))
        .where(
          and(eq(contactsTable.userId, userId), eq(contactsTable.favorite, 1)),
        )
        .orderBy(desc(contactsTable.updatedAt))
        .all()
    } catch (error) {
      console.error('Failed to get favorite contacts:', error)
      return []
    }
  },

  async getTransactionsWithContact(
    userWalletId: number,
    contactWalletId: number,
  ) {
    try {
      return await db
        .select()
        .from(transactionsTable)
        .where(
          or(
            and(
              eq(transactionsTable.senderWalletId, userWalletId),
              eq(transactionsTable.receiverWalletId, contactWalletId),
            ),
            and(
              eq(transactionsTable.senderWalletId, contactWalletId),
              eq(transactionsTable.receiverWalletId, userWalletId),
            ),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .all()
    } catch (error) {
      console.error('Failed to get transactions with contact:', error)
      return []
    }
  },

  async getWalletStats(walletId: number) {
    try {
      const result = await db
        .select({
          totalSent: sql<number>`SUM(CASE WHEN sender_wallet_id = ${walletId} THEN amount ELSE 0 END)`,
          totalReceived: sql<number>`SUM(CASE WHEN receiver_wallet_id = ${walletId} THEN amount ELSE 0 END)`,
          totalPending: sql<number>`SUM(CASE WHEN status = 'pending' AND sender_wallet_id = ${walletId} THEN amount ELSE 0 END)`,
          transactionCount: sql<number>`COUNT(*)`,
          successfulTransactions: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
          failedTransactions: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(transactionsTable)
        .where(
          or(
            eq(transactionsTable.senderWalletId, walletId),
            eq(transactionsTable.receiverWalletId, walletId),
          ),
        )
        .get()

      return {
        ...result,
        totalSent: result?.totalSent || 0,
        totalReceived: result?.totalReceived || 0,
        totalPending: result?.totalPending || 0,
        transactionCount: result?.transactionCount || 0,
        successfulTransactions: result?.successfulTransactions || 0,
        failedTransactions: result?.failedTransactions || 0,
      }
    } catch (error) {
      console.error('Failed to get wallet statistics:', error)
      return null
    }
  },

  async searchContacts(
    userId: number,
    searchText: string,
    page = 1,
    limit = 10,
  ) {
    try {
      const offset = (page - 1) * limit

      // First get all users matching the search
      const users = (await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          phoneNumber: usersTable.phoneNumber,
        })
        .from(usersTable)
        .where(
          and(
            sql`${usersTable.id} != ${userId}`, // Exclude current user
            or(
              like(usersTable.email, `%${searchText}%`),
              like(usersTable.phoneNumber, `%${searchText}%`),
              like(usersTable.firstName, `%${searchText}%`),
              like(usersTable.lastName, `%${searchText}%`),
            ),
          ),
        )
        .limit(limit)
        .offset(offset)
        .all()) as UserSearchResult[]

      // Get existing contacts for this user
      const existingContacts = (await db
        .select({
          contactUserId: contactsTable.contactUserId,
          nickname: contactsTable.nickname,
          favorite: contactsTable.favorite,
        })
        .from(contactsTable)
        .where(eq(contactsTable.userId, userId))
        .all()) as ContactResult[]

      // Create a map of existing contacts for quick lookup
      const contactMap = new Map<number, ContactResult>()
      existingContacts.forEach(contact => {
        contactMap.set(contact.contactUserId, contact)
      })

      // Combine results and mark existing contacts
      return users.map(user => ({
        contact: {
          id: contactMap.get(user.id)?.contactUserId || 0,
          userId,
          contactUserId: user.id,
          nickname: contactMap.get(user.id)?.nickname || '',
          favorite: contactMap.get(user.id)?.favorite || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        },
      }))
    } catch (error) {
      console.error('Failed to search contacts:', error)
      return []
    }
  },

  async getUserByPhone(phoneNumber: string) {
    try {
      // Normalize the phone number by removing any non-digit characters
      const normalizedPhone = phoneNumber.replace(/\D/g, '')

      const result = await db
        .select()
        .from(usersTable)
        .where(
          eq(sql`REPLACE(${usersTable.phoneNumber}, '+', '')`, normalizedPhone),
        )
        .limit(1)
        .get()

      return result || null
    } catch (error) {
      console.error('Failed to get user by phone:', error)
      return null
    }
  },

  async getAllUsers() {
    const users = await db.select().from(usersTable)
    return users
  },

  async calculateWalletBalance(walletId: number) {
    try {
      const result = await db
        .select({
          balance: sql<number>`
            SUM(CASE 
              WHEN type = 'deposit' THEN amount
              WHEN type = 'withdrawal' THEN -amount
              WHEN sender_wallet_id = ${walletId} THEN -amount
              WHEN receiver_wallet_id = ${walletId} THEN amount
              ELSE 0
            END)
          `,
        })
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            eq(transactionsTable.status, 'completed'),
          ),
        )
        .get()

      return result?.balance || 0
    } catch (error) {
      console.error('Failed to calculate wallet balance:', error)
      return 0
    }
  },

  async getUserById(userId: number) {
    try {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .get()

      if (!user) return null

      return {
        ...user,
        id: Number(user.id),
        settings: deserializeSettings<UserSettings>(user.settings),
      }
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  },
  async checkContact(userId: number, contactUserId: number) {
    const contact = await db
      .select()
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.userId, userId),
          eq(contactsTable.contactUserId, contactUserId),
        ),
      )
      .get()

    if (contact) {
      return true
    } else {
      return false
    }
  },
  async addContact(contactData: Omit<typeof contactsTable.$inferInsert, 'id'>) {
    try {
      // Input validation
      if (!contactData.userId || !contactData.contactUserId) {
        return {
          success: false,
          error: new Error('Invalid user IDs'),
          errorCode: 'INVALID_INPUT',
        }
      }

      // Prevent self-adding
      if (contactData.userId === contactData.contactUserId) {
        return {
          success: false,
          error: new Error('Cannot add yourself as contact'),
          errorCode: 'SELF_CONTACT',
        }
      }

      // Check if exact contact relationship exists
      const existingContact = await db
        .select()
        .from(contactsTable)
        .where(
          and(
            eq(contactsTable.userId, contactData.userId),
            eq(contactsTable.contactUserId, contactData.contactUserId),
          ),
        )
        .get()

      if (existingContact) {
        return {
          success: false,
          error: new Error('Contact already exists'),
          errorCode: 'CONTACT_EXISTS',
        }
      }

      // Insert new contact with timestamps
      const now = new Date().toISOString()
      const result = await db.insert(contactsTable).values({
        ...contactData,
        createdAt: now,
        updatedAt: now,
      })

      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to add contact:', {
        error: String(error),
        contactData,
        stack: error instanceof Error ? error.stack : undefined,
      })
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Failed to add contact'),
        errorCode: 'INSERT_FAILED',
      }
    }
  },

  async removeContact(userId: number, contactUserId: number) {
    try {
      // Input validation
      if (!userId || !contactUserId) {
        return {
          success: false,
          error: new Error('Invalid user IDs'),
          errorCode: 'INVALID_INPUT',
        }
      }

      // Check if contact exists
      const existingContact = await db
        .select()
        .from(contactsTable)
        .where(
          and(
            eq(contactsTable.userId, userId),
            eq(contactsTable.contactUserId, contactUserId),
          ),
        )
        .get()

      if (!existingContact) {
        return {
          success: false,
          error: new Error('Contact does not exist'),
          errorCode: 'CONTACT_NOT_FOUND',
        }
      }

      // Delete the contact
      await db
        .delete(contactsTable)
        .where(
          and(
            eq(contactsTable.userId, userId),
            eq(contactsTable.contactUserId, contactUserId),
          ),
        )

      return { success: true }
    } catch (error) {
      console.error('Failed to remove contact:', {
        error: String(error),
        userId,
        contactUserId,
        stack: error instanceof Error ? error.stack : undefined,
      })
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to remove contact'),
        errorCode: 'DELETE_FAILED',
      }
    }
  },

  async getTransactionSummary(
    walletId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      const result = await db
        .select({
          // P2P Transfers sent
          transfersSent: sql<number>`SUM(CASE 
            WHEN sender_wallet_id = ${walletId} AND type = 'transfer' THEN amount 
            ELSE 0 END)`,
          // P2P Transfers received
          transfersReceived: sql<number>`SUM(CASE 
            WHEN receiver_wallet_id = ${walletId} AND type = 'transfer' THEN amount 
            ELSE 0 END)`,
          // Deposits
          totalDeposits: sql<number>`SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END)`,
          // Withdrawals
          totalWithdrawals: sql<number>`SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END)`,
          // Transaction counts
          transfersSentCount: sql<number>`SUM(CASE 
            WHEN sender_wallet_id = ${walletId} AND type = 'transfer' THEN 1 
            ELSE 0 END)`,
          transfersReceivedCount: sql<number>`SUM(CASE 
            WHEN receiver_wallet_id = ${walletId} AND type = 'transfer' THEN 1 
            ELSE 0 END)`,
          depositCount: sql<number>`SUM(CASE WHEN type = 'deposit' THEN 1 ELSE 0 END)`,
          withdrawalCount: sql<number>`SUM(CASE WHEN type = 'withdrawal' THEN 1 ELSE 0 END)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            eq(transactionsTable.status, 'completed'),
            between(transactionsTable.createdAt, startDate, endDate),
          ),
        )
        .get()

      // Calculate trends by comparing with previous period
      const previousStartDate = new Date(startDate)
      const previousEndDate = new Date(endDate)
      const periodDiff = previousEndDate.getTime() - previousStartDate.getTime()
      previousStartDate.setTime(previousStartDate.getTime() - periodDiff)
      previousEndDate.setTime(previousEndDate.getTime() - periodDiff)

      const previousResult = await db
        .select({
          transfersSent: sql<number>`SUM(CASE 
            WHEN sender_wallet_id = ${walletId} AND type = 'transfer' THEN amount 
            ELSE 0 END)`,
          transfersReceived: sql<number>`SUM(CASE 
            WHEN receiver_wallet_id = ${walletId} AND type = 'transfer' THEN amount 
            ELSE 0 END)`,
          totalDeposits: sql<number>`SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END)`,
          totalWithdrawals: sql<number>`SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END)`,
        })
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, walletId),
              eq(transactionsTable.receiverWalletId, walletId),
            ),
            eq(transactionsTable.status, 'completed'),
            between(
              transactionsTable.createdAt,
              previousStartDate.toISOString(),
              previousEndDate.toISOString(),
            ),
          ),
        )
        .get()

      // Calculate percentage changes
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%'
        const change = ((current - previous) / previous) * 100
        return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
      }

      return {
        stats: [
          {
            label: 'P2P Sent',
            amount: result?.transfersSent || 0,
            trend: calculateTrend(
              result?.transfersSent || 0,
              previousResult?.transfersSent || 0,
            ),
            count: result?.transfersSentCount || 0,
            color: '#F44336',
            icon: 'arrow-up',
          },
          {
            label: 'P2P Received',
            amount: result?.transfersReceived || 0,
            trend: calculateTrend(
              result?.transfersReceived || 0,
              previousResult?.transfersReceived || 0,
            ),
            count: result?.transfersReceivedCount || 0,
            color: '#4CAF50',
            icon: 'arrow-down',
          },
          {
            label: 'Deposits',
            amount: result?.totalDeposits || 0,
            trend: calculateTrend(
              result?.totalDeposits || 0,
              previousResult?.totalDeposits || 0,
            ),
            count: result?.depositCount || 0,
            color: '#2196F3',
            icon: 'wallet',
          },
          {
            label: 'Withdrawals',
            amount: result?.totalWithdrawals || 0,
            trend: calculateTrend(
              result?.totalWithdrawals || 0,
              previousResult?.totalWithdrawals || 0,
            ),
            count: result?.withdrawalCount || 0,
            color: '#FF9800',
            icon: 'cash',
          },
        ],
        summary: {
          totalTransactions: result?.totalTransactions || 0,
          transfersSentCount: result?.transfersSentCount || 0,
          transfersReceivedCount: result?.transfersReceivedCount || 0,
          depositCount: result?.depositCount || 0,
          withdrawalCount: result?.withdrawalCount || 0,
        },
      }
    } catch (error) {
      console.error('Failed to get transaction summary:', error)
      return null
    }
  },

  async getRecentContactsFromTransactions(userId: number, limit: number = 5) {
    try {
      // First get user's active wallet
      const wallet = await db
        .select()
        .from(walletsTable)
        .where(
          and(
            eq(walletsTable.userId, userId),
            eq(walletsTable.status, 'active'),
          ),
        )
        .get()

      if (!wallet) return []

      // Get unique contact wallet IDs from recent transactions
      const recentTransactions = await db
        .select({
          otherWalletId: sql<number>`
            CASE 
              WHEN sender_wallet_id = ${wallet.id} THEN receiver_wallet_id
              ELSE sender_wallet_id
            END
          `,
          createdAt: transactionsTable.createdAt,
        })
        .from(transactionsTable)
        .where(
          and(
            or(
              eq(transactionsTable.senderWalletId, wallet.id),
              eq(transactionsTable.receiverWalletId, wallet.id),
            ),
            eq(transactionsTable.type, 'transfer'),
            eq(transactionsTable.status, 'completed'),
          ),
        )
        .orderBy(desc(transactionsTable.createdAt))
        .all()

      // Get unique wallet IDs (to avoid duplicates)
      const uniqueWalletIds = Array.from(
        new Set(
          recentTransactions.map(
            (t: { otherWalletId: number }) => t.otherWalletId,
          ),
        ),
      )
      const limitedWalletIds = uniqueWalletIds.slice(0, limit) as number[]

      // Get contact information for each wallet
      const contactsInfo = await Promise.all(
        limitedWalletIds.map(async (walletId: number) => {
          const contactWallet = await db
            .select()
            .from(walletsTable)
            .where(eq(walletsTable.id, walletId))
            .get()

          if (!contactWallet) return null

          const user = await db
            .select({
              id: usersTable.id,
              firstName: usersTable.firstName,
              lastName: usersTable.lastName,
              email: usersTable.email,
              phoneNumber: usersTable.phoneNumber,
            })
            .from(usersTable)
            .where(eq(usersTable.id, contactWallet.userId))
            .get()

          if (!user) return null

          // Get the latest transaction with this contact
          const latestTransaction = recentTransactions.find(
            (t: { otherWalletId: number }) => t.otherWalletId === walletId,
          )

          return {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            lastTransactionAt: latestTransaction?.createdAt,
          }
        }),
      )

      return contactsInfo.filter(Boolean)
    } catch (error) {
      console.error('Failed to get recent contacts:', error)
      return []
    }
  },
}
