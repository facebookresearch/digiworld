import { db } from '@/db'
import { Wallet } from '@/models/types'
import { eq, sql } from 'drizzle-orm'
import { queries } from './queries'
import {
  contactsTable,
  transactionsTable,
  usersTable,
  walletsTable,
} from './schema'

// Import mock data directly
import mockContacts from '@/data/mock-contacts.json'
import mockTransactions from '@/data/mock-transactions.json'
import mockUsers from '@/data/mock-users.json'
import mockWallets from '@/data/mock-wallets.json'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

const bundledMocks = {
  'mock-contacts.json': mockContacts,
  'mock-transactions.json': mockTransactions,
  'mock-users.json': mockUsers,
  'mock-wallets.json': mockWallets,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

// Helper function to get mock data
// async function readJSONFile(filename: string) {
//   try {
//     // First ry to read from storage
//     const baseDir = Platform.select({
//       android: `${RNFS.ExternalDirectoryPath}/mockdata`,
//       ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
//       default: '',
//     })

//     const filePath = `${baseDir}/${filename}`
//     const exists = await RNFS.exists(filePath)

//     if (exists) {
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       // If file doesn't exist in storage, use imported mock data
//       switch (filename) {
//         case 'mock-users.json':
//           return mockUsers
//         case 'mock-wallet.json':
//           return mockWallets
//         case 'mock-transactions.json':
//           return mockTransactions
//         case 'mock-contacts.json':
//           return mockContacts
//         default:
//           console.error(`Unknown mock file: ${filename}`)
//           return null
//       }
//     }
//   } catch (error) {
//     console.error(`Error accessing ${filename}:`, error)
//     return null
//   }
// }

export const mutations = {
  async initializeDatabase(shouldCheckExistingData: boolean = true) {
    try {
      // Check if database is already initialized
      const existingUsers = await db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .get()

      if (
        shouldCheckExistingData &&
        existingUsers &&
        (existingUsers as { count: number }).count > 0
      ) {
        return { success: true, skipped: true }
      }

      // Read mock data in parallel
      const [users, wallets, transactions, contacts] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-wallets.json'),
        readJSONFile('mock-transactions.json'),
        readJSONFile('mock-contacts.json'),
      ])

      if (!users) {
        throw new Error('Failed to load mock users data')
      }

      // Batch insert users
      console.log('Loading users...')
      if (users.length > 0) {
        await db
          .insert(usersTable)
          .values(
            users.map((user: any) => ({
              id: user.id,
              email: user.email,
              password: user.password,
              pin: user.pin,
              pinAttempts: user.pinAttempts,
              pinLockedUntil: user.pinLockedUntil,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneNumber: user.phoneNumber,
              settings: user.settings,
              status: user.status,
              kycVerified: user.kycVerified,
              dailyLimit: user.dailyLimit,
              monthlyLimit: user.monthlyLimit,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${users.length} users`)
      }

      // Batch insert wallets
      console.log('Loading wallets...')
      if (wallets && wallets.length > 0) {
        await db
          .insert(walletsTable)
          .values(
            wallets.map((wallet: any) => ({
              id: wallet.id,
              userId: wallet.userId,
              balance: wallet.balance,
              currency: wallet.currency,
              type: wallet.type,
              status: wallet.status,
              createdAt: wallet.createdAt,
              updatedAt: wallet.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${wallets.length} wallets`)
      }

      // Batch insert transactions
      console.log('Loading transactions...')
      if (transactions && transactions.length > 0) {
        await db
          .insert(transactionsTable)
          .values(
            transactions.map((transaction: any) => ({
              id: transaction.id,
              senderWalletId: transaction.senderWalletId,
              receiverWalletId: transaction.receiverWalletId,
              amount: transaction.amount,
              currency: transaction.currency,
              status: transaction.status,
              type: transaction.type,
              pinVerified: transaction.pinVerified,
              pinVerifiedAt: transaction.pinVerifiedAt,
              reference: transaction.reference,
              description: transaction.description,
              createdAt: transaction.createdAt,
              updatedAt: transaction.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${transactions.length} transactions`)
      }

      // Batch insert contacts
      console.log('Loading contacts...')
      if (contacts && contacts.length > 0) {
        await db
          .insert(contactsTable)
          .values(
            contacts.map((contact: any) => ({
              id: contact.id,
              userId: contact.userId,
              contactUserId: contact.contactUserId,
              nickname: contact.nickname,
              favorite: contact.favorite,
              createdAt: contact.createdAt,
              updatedAt: contact.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${contacts.length} contacts`)
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  async createUser(userData: Omit<typeof usersTable.$inferInsert, 'id'>) {
    try {
      const result = await db.insert(usersTable).values(userData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user:', error)
      return { success: false, error }
    }
  },

  async createWallet(walletData: Omit<Wallet, 'id'>) {
    try {
      const result = await db.insert(walletsTable).values(walletData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create wallet:', error)
      return { success: false, error }
    }
  },

  async updateWalletBalance(walletId: number) {
    try {
      // Calculate new balance from transactions
      const calculatedBalance = await queries.calculateWalletBalance(walletId)

      // Update wallet with new balance
      await db
        .update(walletsTable)
        .set({
          balance: calculatedBalance,
          updatedAt: sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        })
        .where(eq(walletsTable.id, walletId))

      return { success: true, balance: calculatedBalance }
    } catch (error) {
      console.error('Failed to update wallet balance:', error)
      return { success: false, error }
    }
  },

  async createTransaction(
    transactionData: Omit<typeof transactionsTable.$inferInsert, 'id'>,
  ) {
    try {
      // Start a transaction to ensure data consistency
      const result = await db.transaction(async (tx: any) => {
        // Insert the transaction
        const transactionInsert = await tx
          .insert(transactionsTable)
          .values(transactionData)

        const transactionId = Number(transactionInsert.lastInsertRowId)

        if (!transactionId) {
          console.error('No transaction ID returned from insert')
          throw new Error('Failed to create transaction: No ID returned')
        }

        // If transaction is completed, update affected wallet balances
        if (transactionData.status === 'completed') {
          const { senderWalletId, receiverWalletId, type } = transactionData

          // For transfers, update both sender and receiver wallets
          if (type === 'transfer') {
            await this.updateWalletBalance(senderWalletId)
            await this.updateWalletBalance(receiverWalletId)
          }
          // For deposits and withdrawals, update only the affected wallet
          else {
            const walletId =
              type === 'deposit' ? receiverWalletId : senderWalletId
            await this.updateWalletBalance(walletId)
          }
        }

        return { success: true, id: transactionId }
      })

      if (!result.id) {
        console.error('Transaction created but no ID in result:', result)
        throw new Error('Transaction created but no ID returned')
      }
      return result
    } catch (error) {
      console.error('Failed to create transaction:', error)
      return { success: false, error }
    }
  },

  async updateTransactionStatus(
    transactionId: number,
    status: 'completed' | 'failed' | 'pending',
  ) {
    try {
      await db.transaction(async (tx: any) => {
        // Get transaction details
        const transaction = await tx
          .select()
          .from(transactionsTable)
          .where(eq(transactionsTable.id, transactionId))
          .get()

        if (!transaction) {
          throw new Error('Transaction not found')
        }

        // Update transaction status
        await tx
          .update(transactionsTable)
          .set({
            status,
            updatedAt: sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
          })
          .where(eq(transactionsTable.id, transactionId))

        // If status changed to completed, update wallet balances
        if (status === 'completed') {
          const { senderWalletId, receiverWalletId, type } = transaction

          if (type === 'transfer') {
            await this.updateWalletBalance(senderWalletId)
            await this.updateWalletBalance(receiverWalletId)
          } else {
            const walletId =
              type === 'deposit' ? receiverWalletId : senderWalletId
            await this.updateWalletBalance(walletId)
          }
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to update transaction status:', error)
      return { success: false, error }
    }
  },

  async addContact(contactData: Omit<typeof contactsTable.$inferInsert, 'id'>) {
    try {
      const result = await db.insert(contactsTable).values(contactData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to add contact:', error)
      return { success: false, error }
    }
  },

  async updateUser(
    userId: number,
    userData: Partial<typeof usersTable.$inferInsert>,
  ) {
    try {
      await db.update(usersTable).set(userData).where(eq(usersTable.id, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user:', error)
      return { success: false, error }
    }
  },
}
