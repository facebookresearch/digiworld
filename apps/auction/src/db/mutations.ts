import { sql } from 'drizzle-orm'
import {
  categories,
  users,
  items,
  bids,
  transactions,
  userPaymentMethods,
  addresses,
  systemConfig,
} from './schema'
import { db } from './index'
import { createReadJSONFile } from '@andojo/shared-mock-reader'
import categoriesStaticMock from '../data/mock-categories.json'
import usersStaticMock from '../data/mock-users.json'
import itemsStaticMock from '../data/mock-items.json'
import paymentMethodsStaticMock from '../data/mock-user_payment_methods.json'
import addressesStaticMock from '../data/mock-addresses.json'
import systemConfigStaticMock from '../data/mock-system_config.json'
import bidsStaticMock from '../data/mock-bids.json'
import transactionsStaticMock from '../data/mock-transactions.json'

const bundledMocks = {
  'mock-categories.json': categoriesStaticMock,
  'mock-users.json': usersStaticMock,
  'mock-items.json': itemsStaticMock,
  'mock-user_payment_methods.json': paymentMethodsStaticMock,
  'mock-addresses.json': addressesStaticMock,
  'mock-system_config.json': systemConfigStaticMock,
  'mock-bids.json': bidsStaticMock,
  'mock-transactions.json': transactionsStaticMock,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      // Check if database is already seeded
      const [categoryCount, userCount, itemCount] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(categories)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(items)
          .execute(),
      ])

      if (
        categoryCount[0]?.count > 0 &&
        userCount[0]?.count > 0 &&
        itemCount[0]?.count > 0
      ) {
        console.log('Database already initialized with data')
        return { success: true, skipped: true }
      }

      // Clear tables - disable foreign keys temporarily to allow clearing in any order
      await db.run(sql.raw('PRAGMA foreign_keys = OFF'))

      const clearTables = [
        'DELETE FROM inventory',
        'DELETE FROM listings',
        'DELETE FROM payments',
        'DELETE FROM transactions',
        'DELETE FROM bids',
        'DELETE FROM sessions',
        'DELETE FROM items',
        'DELETE FROM items_fts', // Clear FTS table to avoid trigger conflicts
        'DELETE FROM user_payment_methods',
        'DELETE FROM addresses',
        'DELETE FROM users',
        'DELETE FROM categories',
      ]
      for (const query of clearTables) {
        try {
          await db.run(sql.raw(query))
        } catch (error: any) {
          // Ignore errors if table doesn't exist
          if (!error.message?.includes('no such table')) {
            throw error
          }
        }
      }

      // Reset AUTOINCREMENT sequences by deleting entries
      // SQLite will recreate them automatically when we insert with explicit IDs
      // This prevents conflicts when inserting explicit IDs after DELETE
      try {
        await db.run(sql.raw('DELETE FROM sqlite_sequence'))
      } catch (error: any) {
        // sqlite_sequence might not exist if no AUTOINCREMENT tables exist yet
        if (!error.message?.includes('no such table')) {
          throw error
        }
      }

      // Re-enable foreign keys before inserting new data
      await db.run(sql.raw('PRAGMA foreign_keys = ON'))

      // Read all mock data in parallel
      const [
        categoriesData,
        usersData,
        itemsData,
        paymentMethodsData,
        addressesData,
        systemConfigData,
        bidsData,
        transactionsData,
      ] = await Promise.all([
        readJSONFile('mock-categories.json'),
        readJSONFile('mock-users.json'),
        readJSONFile('mock-items.json'),
        readJSONFile('mock-user_payment_methods.json'),
        readJSONFile('mock-addresses.json'),
        readJSONFile('mock-system_config.json'),
        readJSONFile('mock-bids.json').catch(() => null), // Optional, may not exist
        readJSONFile('mock-transactions.json').catch(() => null), // Optional, may not exist
      ])

      if (!categoriesData || !usersData || !itemsData) {
        const missing = []
        if (!categoriesData) missing.push('categories')
        if (!usersData) missing.push('users')
        if (!itemsData) missing.push('items')
        throw new Error(`Failed to load mock data files: ${missing.join(', ')}`)
      }

      console.log('Loading categories...')
      if (categoriesData.length > 0) {
        await db
          .insert(categories)
          .values(
            categoriesData.map((category: any) => ({
              id: category.id,
              code: category.code,
              name: category.name,
              description: category.description ?? null,
              createdAt: category.createdAt ?? category.created_at,
            })),
          )
          .run()
        console.log(`Loaded ${categoriesData.length} categories`)
      }

      console.log('Loading users...')
      if (usersData.length > 0) {
        await db
          .insert(users)
          .values(
            usersData.map((user: any) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name,
              password: user.password,
              sellerRating: user.sellerRating ?? user.seller_rating ?? 0,
              totalSales: user.totalSales ?? user.total_sales ?? 0,
              totalItemsListed:
                user.totalItemsListed ?? user.total_items_listed ?? 0,
              createdAt: user.createdAt ?? user.created_at,
              updatedAt: user.updatedAt ?? user.updated_at,
            })),
          )
          .run()
        console.log(`Loaded ${usersData.length} users`)
      }

      console.log('Loading items...')
      if (itemsData.length > 0) {
        await db
          .insert(items)
          .values(
            itemsData.map((item: any) => {
              const categoryId = item.categoryId ?? item.category_id
              const sellerId = item.sellerId ?? item.seller_id
              const auctionFlag = item.auctionFlag ?? item.auction_flag ?? 0
              const startingBid = item.startingBid ?? item.starting_bid ?? null

              // Enforce constraint: if auction_flag = 1, starting_bid must not be null
              // Use price as fallback if startingBid is missing for auction items
              const finalStartingBid =
                auctionFlag === 1 && startingBid === null
                  ? item.price
                  : startingBid

              // Ensure expired is 0 or 1 (not boolean) to satisfy CHECK constraint
              const expiredValue =
                item.expired === true || item.expired === 1 ? 1 : 0

              // Ensure status is valid
              const statusValue = item.status ?? 'active'
              const validStatuses = ['active', 'sold', 'cancelled', 'expired']
              const finalStatus = validStatuses.includes(statusValue)
                ? statusValue
                : 'active'

              // Ensure quantity is non-negative
              const quantityValue = Math.max(0, item.quantity ?? 1)

              // Ensure price is non-negative
              const priceValue = Math.max(0, item.price ?? 0)

              return {
                id: item.id,
                title: item.title,
                description: item.description ?? null,
                categoryId,
                sellerId,
                price: priceValue,
                auctionFlag,
                currentBid: item.currentBid ?? item.current_bid ?? null,
                startingBid: finalStartingBid,
                bidIncrement: item.bidIncrement ?? item.bid_increment ?? 1.0,
                endTime: item.endTime ?? item.end_time ?? null,
                status: finalStatus,
                expiresIn: item.expiresIn ?? item.expires_in ?? null,
                expired: expiredValue,
                quantity: quantityValue,
                bidCount: item.bidCount ?? item.bid_count ?? 0,
                imageUrl: item.imageUrl ?? item.image_url ?? null,
                createdAt: item.createdAt ?? item.created_at,
                updatedAt: item.updatedAt ?? item.updated_at,
                soldAt: item.soldAt ?? item.sold_at ?? null,
              }
            }),
          )
          .onConflictDoUpdate({
            target: items.id,
            set: {
              title: sql`excluded.title`,
              description: sql`excluded.description`,
              categoryId: sql`excluded.category_id`,
              sellerId: sql`excluded.seller_id`,
              price: sql`excluded.price`,
              auctionFlag: sql`excluded.auction_flag`,
              currentBid: sql`excluded.current_bid`,
              startingBid: sql`excluded.starting_bid`,
              bidIncrement: sql`excluded.bid_increment`,
              endTime: sql`excluded.end_time`,
              status: sql`excluded.status`,
              expiresIn: sql`excluded.expires_in`,
              expired: sql`excluded.expired`,
              quantity: sql`excluded.quantity`,
              bidCount: sql`excluded.bid_count`,
              imageUrl: sql`excluded.image_url`,
              updatedAt: sql`excluded.updated_at`,
              soldAt: sql`excluded.sold_at`,
            },
          })
          .run()
        console.log(`Loaded ${itemsData.length} items`)
      }

      if (paymentMethodsData && paymentMethodsData.length > 0) {
        console.log('Loading user payment methods...')
        await db
          .insert(userPaymentMethods)
          .values(
            paymentMethodsData.map((pm: any) => ({
              id: pm.id,
              userId: pm.userId ?? pm.user_id,
              cardType: pm.cardType ?? pm.card_type,
              cardNumber: pm.cardNumber ?? pm.card_number,
              expiry: pm.expiry,
              cardHolderName: pm.cardHolderName ?? pm.card_holder_name,
              isDefault: pm.isDefault ?? pm.is_default ?? false,
              createdAt: pm.createdAt ?? pm.created_at,
            })),
          )
          .run()
        console.log(`Loaded ${paymentMethodsData.length} payment methods`)
      }

      if (addressesData && addressesData.length > 0) {
        console.log('Loading addresses...')
        await db
          .insert(addresses)
          .values(
            addressesData.map((addr: any) => ({
              id: addr.id,
              userId: addr.userId ?? addr.user_id,
              street: addr.street,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode ?? addr.zip_code,
              country: addr.country,
              isDefault: addr.isDefault ?? addr.is_default ?? false,
              createdAt: addr.createdAt ?? addr.created_at,
            })),
          )
          .run()
        console.log(`Loaded ${addressesData.length} addresses`)
      }

      console.log('Loading system config...')
      // System config needs special logic with onConflictDoUpdate
      if (
        systemConfigData &&
        Array.isArray(systemConfigData) &&
        systemConfigData.length > 0
      ) {
        await db
          .insert(systemConfig)
          .values(
            systemConfigData.map((config: any) => ({
              key: config.key,
              value: config.value ?? 'true',
              dataType: config.dataType ?? null,
              category: config.category ?? null,
              description: config.description ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: systemConfig.key,
            set: {
              value: sql`excluded.value`,
              updatedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
            },
          })
          .run()
        console.log(`Loaded ${systemConfigData.length} system config entries`)
      } else {
        // Fallback: seed default transactions_succeed config
        await db
          .insert(systemConfig)
          .values({
            key: 'transactions_succeed',
            value: 'true',
            dataType: 'boolean',
            category: 'features',
            description:
              'Control if transactions succeed or fail for all users in the system',
          })
          .onConflictDoUpdate({
            target: systemConfig.key,
            set: {
              value: 'true',
              updatedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
            },
          })
          .run()
      }

      // Load bids if available
      if (bidsData && Array.isArray(bidsData) && bidsData.length > 0) {
        console.log('Loading bids...')
        // Group bids by itemId to ensure only one winning bid per item
        const bidsByItem = new Map<number, any[]>()
        for (const bid of bidsData) {
          const itemId = bid.itemId ?? bid.item_id
          if (!bidsByItem.has(itemId)) {
            bidsByItem.set(itemId, [])
          }
          bidsByItem.get(itemId)!.push(bid)
        }

        // Process bids for each item, ensuring only one winning bid
        const allBidsToInsert: any[] = []
        for (const [, itemBids] of bidsByItem.entries()) {
          // Sort by bid amount descending, then by bid time
          const sortedBids = itemBids.sort((a, b) => {
            const aAmount = a.bidAmount ?? a.bid_amount ?? 0
            const bAmount = b.bidAmount ?? b.bid_amount ?? 0
            if (bAmount !== aAmount) {
              return bAmount - aAmount
            }
            const aTime = a.bidTime ?? a.bid_time ?? 0
            const bTime = b.bidTime ?? b.bid_time ?? 0
            return bTime - aTime
          })

          // Only the highest bid should be winning
          for (let i = 0; i < sortedBids.length; i++) {
            const bid = sortedBids[i]
            allBidsToInsert.push({
              id: bid.id,
              sessionId: bid.sessionId ?? bid.session_id ?? null,
              itemId: bid.itemId ?? bid.item_id,
              userId: bid.userId ?? bid.user_id,
              bidAmount: bid.bidAmount ?? bid.bid_amount,
              isWinning: i === 0 ? 1 : 0, // Only first (highest) bid is winning
              outcome: bid.outcome || (i === 0 ? 'pending' : 'outbid'),
              bidTime: bid.bidTime ?? bid.bid_time ?? null,
              deterministicSeed:
                bid.deterministicSeed ?? bid.deterministic_seed ?? null,
              createdAt: bid.createdAt ?? bid.created_at,
            })
          }
        }

        if (allBidsToInsert.length > 0) {
          await db.insert(bids).values(allBidsToInsert).run()
          console.log(`Loaded ${allBidsToInsert.length} bids`)
        }
      }

      // Load transactions if available
      if (
        transactionsData &&
        Array.isArray(transactionsData) &&
        transactionsData.length > 0
      ) {
        console.log('Loading transactions...')
        await db
          .insert(transactions)
          .values(
            transactionsData.map((transaction: any) => {
              // Ensure quantity is at least 1 (CHECK constraint requires quantity > 0)
              const rawQuantity = transaction.quantity ?? 1
              const quantity = Math.max(1, rawQuantity)

              return {
                id: transaction.id,
                sessionId:
                  transaction.sessionId ?? transaction.session_id ?? null,
                transactionType:
                  transaction.transactionType ?? transaction.transaction_type,
                itemId: transaction.itemId ?? transaction.item_id ?? null,
                userId: transaction.userId ?? transaction.user_id,
                sellerId: transaction.sellerId ?? transaction.seller_id ?? null,
                bidId: transaction.bidId ?? transaction.bid_id ?? null,
                amount: transaction.amount,
                quantity,
                status: transaction.status ?? 'completed',
                paymentStatus:
                  transaction.paymentStatus ??
                  transaction.payment_status ??
                  'success',
                paymentMethod:
                  transaction.paymentMethod ??
                  transaction.payment_method ??
                  null,
                paymentCardNumber:
                  transaction.paymentCardNumber ??
                  transaction.payment_card_number ??
                  null,
                failureReason:
                  transaction.failureReason ??
                  transaction.failure_reason ??
                  null,
                refundAmount:
                  transaction.refundAmount ?? transaction.refund_amount ?? 0,
                refundedAt:
                  transaction.refundedAt ?? transaction.refunded_at ?? null,
                transactionDate:
                  transaction.transactionDate ??
                  transaction.transaction_date ??
                  transaction.createdAt ??
                  transaction.created_at,
                createdAt: transaction.createdAt ?? transaction.created_at,
                metadata: transaction.metadata ?? null,
              }
            }),
          )
          .run()
        console.log(`Loaded ${transactionsData.length} transactions`)
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },
}
