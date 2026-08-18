// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db/index'
import {
  categories,
  users,
  items,
  sessions,
  bids,
  transactions,
  payments,
  mockCards,
  userPaymentMethods,
  addresses,
  inventory,
  listings,
  systemConfig,
} from './schema'
import { eq, sql, desc, asc, and, or, like, inArray } from 'drizzle-orm'

const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F =>
  (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    try {
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

export const isDatabaseInitialized = wrapQuery(async () => {
  try {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('categories', 'users', 'items', 'sessions', 'bids', 'transactions', 'payments', 'mock_cards', 'inventory', 'listings', 'system_config')`,
      )
      .execute()

    if (!result || !result[0]) {
      return false
    }

    const count = result[0].count
    const hasAllTables = count === 11

    if (!hasAllTables) {
      return false
    }

    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .execute()

    return (userCount[0]?.count ?? 0) > 0
  } catch (error) {
    console.error('Error checking database initialization:', error)
    return false
  }
}, 'isDatabaseInitialized')

export const getAllCategories = wrapQuery(async () => {
  return await db.select().from(categories).orderBy(categories.name).execute()
}, 'getAllCategories')

export const getCategoryById = wrapQuery(async (categoryId: number) => {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .execute()
  return result[0] || null
}, 'getCategoryById')

export const getCategoryByCode = wrapQuery(async (code: string) => {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.code, code))
    .execute()
  return result[0] || null
}, 'getCategoryByCode')

export const getUserById = wrapQuery(async (userId: number) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .execute()
  return result[0] || null
}, 'getUserById')

export const getUserByUsername = wrapQuery(async (username: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .execute()
  return result[0] || null
}, 'getUserByUsername')

export const getAllUsers = wrapQuery(async () => {
  return await db.select().from(users).orderBy(users.username).execute()
}, 'getAllUsers')

export const createUser = wrapQuery(
  async (data: {
    username: string
    email: string
    password: string
    name?: string
  }) => {
    const now = new Date().toISOString()
    const result = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name || data.username,
        sellerRating: 0,
        totalSales: 0,
        totalItemsListed: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return result[0] || null
  },
  'createUser',
)

export const updateUserProfile = wrapQuery(
  async (
    userId: number,
    data: {
      username?: string
      email?: string
      password?: string
      name?: string
    },
  ) => {
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    }
    if (data.username !== undefined) updateData.username = data.username
    if (data.email !== undefined) updateData.email = data.email
    if (data.password !== undefined) updateData.password = data.password
    if (data.name !== undefined) updateData.name = data.name

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()
      .execute()
    return result[0] || null
  },
  'updateUserProfile',
)

export const getSellers = wrapQuery(async () => {
  return await db
    .select()
    .from(users)
    .where(
      or(sql`${users.sellerRating} > 0`, sql`${users.totalItemsListed} > 0`),
    )
    .orderBy(desc(users.sellerRating))
    .execute()
}, 'getSellers')

export const getAllItems = wrapQuery(async () => {
  return await db.select().from(items).orderBy(desc(items.createdAt)).execute()
}, 'getAllItems')

export const getItemById = wrapQuery(async (itemId: number) => {
  const result = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .execute()
  return result[0] || null
}, 'getItemById')

export const getItemsByCategory = wrapQuery(async (categoryId: number) => {
  return await db
    .select()
    .from(items)
    .where(and(eq(items.categoryId, categoryId), eq(items.status, 'active')))
    .orderBy(desc(items.createdAt))
    .execute()
}, 'getItemsByCategory')

export const getItemsBySeller = wrapQuery(async (sellerId: number) => {
  return await db
    .select()
    .from(items)
    .where(eq(items.sellerId, sellerId))
    .orderBy(desc(items.createdAt))
    .execute()
}, 'getItemsBySeller')

export const getActiveItems = wrapQuery(async () => {
  return await db
    .select()
    .from(items)
    .where(eq(items.status, 'active'))
    .orderBy(desc(items.createdAt))
    .execute()
}, 'getActiveItems')

export const getAuctionItems = wrapQuery(async () => {
  return await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.auctionFlag, 1),
        eq(items.status, 'active'),
        sql`${items.endTime} > ${Math.floor(Date.now() / 1000)}`,
      ),
    )
    .orderBy(items.endTime)
    .execute()
}, 'getAuctionItems')

export const getBuyNowItems = wrapQuery(async () => {
  return await db
    .select()
    .from(items)
    .where(and(eq(items.auctionFlag, 0), eq(items.status, 'active')))
    .orderBy(desc(items.createdAt))
    .execute()
}, 'getBuyNowItems')

export const searchItems = wrapQuery(
  async (params: {
    keyword?: string
    categoryId?: number
    sellerId?: number
    auctionFlag?: number
    limit?: number
  }) => {
    const limit = params.limit || 10
    const conditions = [eq(items.status, 'active')]

    if (params.keyword) {
      const keywordPattern = `%${params.keyword}%`
      conditions.push(
        or(
          like(items.title, keywordPattern),
          like(items.description, keywordPattern),
        ),
      )
    }

    if (params.categoryId) {
      conditions.push(eq(items.categoryId, params.categoryId))
    }

    if (params.sellerId) {
      conditions.push(eq(items.sellerId, params.sellerId))
    }

    if (params.auctionFlag !== undefined) {
      conditions.push(eq(items.auctionFlag, params.auctionFlag))
    }

    return await db
      .select()
      .from(items)
      .where(and(...conditions))
      .limit(limit)
      .orderBy(desc(items.createdAt))
      .execute()
  },
  'searchItems',
)

export const getItemDetail = wrapQuery(async (itemId: number) => {
  const itemResult = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .execute()

  if (!itemResult[0]) {
    return null
  }

  const item = itemResult[0]

  // Get seller info
  const sellerResult = await db
    .select()
    .from(users)
    .where(eq(users.id, item.sellerId))
    .execute()

  // Get category info
  const categoryResult = await db
    .select()
    .from(categories)
    .where(eq(categories.id, item.categoryId))
    .execute()

  return {
    ...item,
    seller: sellerResult[0] || null,
    category: categoryResult[0] || null,
  }
}, 'getItemDetail')

export const createSession = wrapQuery(
  async (data: {
    sessionId: string
    userId?: number
    seed: number
    transactionsSucceed?: boolean
    metadata?: string
  }) => {
    const result = await db
      .insert(sessions)
      .values({
        sessionId: data.sessionId,
        userId: data.userId || null,
        seed: data.seed,
        transactionsSucceed:
          data.transactionsSucceed !== undefined
            ? data.transactionsSucceed
              ? 1
              : 0
            : 1,
        status: 'active',
        metadata: data.metadata || null,
      })
      .returning()
      .execute()

    return result[0]
  },
  'createSession',
)

export const getSessionById = wrapQuery(async (sessionId: string) => {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .execute()
  return result[0] || null
}, 'getSessionById')

export const getSessionByDbId = wrapQuery(async (id: number) => {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .execute()
  return result[0] || null
}, 'getSessionByDbId')

export const getSessionsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .execute()
}, 'getSessionsByUserId')

export const endSession = wrapQuery(async (sessionId: string) => {
  const result = await db
    .update(sessions)
    .set({
      status: 'ended',
      endedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
    })
    .where(eq(sessions.sessionId, sessionId))
    .returning()
    .execute()

  return result[0] || null
}, 'endSession')

export const getAllBids = wrapQuery(async () => {
  return await db.select().from(bids).orderBy(desc(bids.createdAt)).execute()
}, 'getAllBids')

export const getBidsByItem = wrapQuery(async (itemId: number) => {
  return await db
    .select()
    .from(bids)
    .where(eq(bids.itemId, itemId))
    .orderBy(desc(bids.bidAmount))
    .execute()
}, 'getBidsByItem')

export const getBidsByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(bids)
    .where(eq(bids.userId, userId))
    .orderBy(desc(bids.createdAt))
    .execute()
}, 'getBidsByUser')

export const getBidsBySession = wrapQuery(async (sessionId: number) => {
  return await db
    .select()
    .from(bids)
    .where(eq(bids.sessionId, sessionId))
    .orderBy(desc(bids.createdAt))
    .execute()
}, 'getBidsBySession')

export const getWinningBid = wrapQuery(async (itemId: number) => {
  // Get all bids for this item and determine winner using tie-breaker logic
  // This ensures correctness even if isWinning flags are wrong (e.g., DB manipulation)
  const allBids = await db
    .select()
    .from(bids)
    .where(eq(bids.itemId, itemId))
    .orderBy(
      desc(bids.bidAmount), // Highest bid amount first
      asc(bids.bidTime), // Earliest bid time wins tie-breaker (first come, first served)
      asc(bids.deterministicSeed), // Deterministic seed for testing scenarios
      asc(bids.id), // Final tie-breaker: lower ID (earlier bid)
    )
    .execute()

  // Return the highest bid (first in sorted order) or null if no bids
  return allBids.length > 0 ? allBids[0] : null
}, 'getWinningBid')

export const getBidById = wrapQuery(async (bidId: number) => {
  const result = await db
    .select()
    .from(bids)
    .where(eq(bids.id, bidId))
    .execute()
  return result[0] || null
}, 'getBidById')

export const getAllTransactions = wrapQuery(async () => {
  return await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getAllTransactions')

export const getTransactionsByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getTransactionsByUser')

export const getTransactionsBySession = wrapQuery(async (sessionId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.sessionId, sessionId))
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getTransactionsBySession')

export const getTransactionById = wrapQuery(async (transactionId: number) => {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .execute()
  return result[0] || null
}, 'getTransactionById')

export const getTransactionsByItem = wrapQuery(async (itemId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.itemId, itemId))
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getTransactionsByItem')

export const getRefundTransactionForPurchase = wrapQuery(
  async (purchaseTransactionId: number) => {
    // Get the purchase transaction to find its details
    const purchaseTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, purchaseTransactionId))
      .execute()

    if (!purchaseTransaction || purchaseTransaction.length === 0) {
      return null
    }

    const purchase = purchaseTransaction[0]

    // Check if a refund transaction already exists for this purchase
    // Refund transactions have same itemId, userId, sellerId, and amount
    // Build where conditions array, filtering out undefined values
    const conditions = [
      eq(transactions.transactionType, 'refund'),
      eq(transactions.userId, purchase.userId),
      eq(transactions.amount, purchase.amount),
    ]

    if (purchase.itemId) {
      conditions.push(eq(transactions.itemId, purchase.itemId))
    }
    if (purchase.sellerId) {
      conditions.push(eq(transactions.sellerId, purchase.sellerId))
    }

    const refundTransactions = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .execute()

    // Return the most recent refund transaction if any exist
    return refundTransactions.length > 0 ? refundTransactions[0] : null
  },
  'getRefundTransactionForPurchase',
)

export const getPurchasesByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.transactionType, ['purchase', 'bid_win']),
        eq(transactions.status, 'completed'),
      ),
    )
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getPurchasesByUser')

export const getSalesByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.sellerId, userId),
        eq(transactions.transactionType, 'sale'),
        eq(transactions.status, 'completed'),
      ),
    )
    .orderBy(desc(transactions.transactionDate))
    .execute()
}, 'getSalesByUser')

export const getPaymentById = wrapQuery(async (paymentId: number) => {
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .execute()
  return result[0] || null
}, 'getPaymentById')

export const getPaymentsByTransaction = wrapQuery(
  async (transactionId: number) => {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId))
      .orderBy(desc(payments.createdAt))
      .execute()
  },
  'getPaymentsByTransaction',
)

export const getMockCardByNumber = wrapQuery(async (cardNumber: string) => {
  const result = await db
    .select()
    .from(mockCards)
    .where(eq(mockCards.cardNumber, cardNumber))
    .execute()
  return result[0] || null
}, 'getMockCardByNumber')

export const getAllMockCards = wrapQuery(async () => {
  return await db.select().from(mockCards).execute()
}, 'getAllMockCards')

export const getUserPaymentMethods = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(userPaymentMethods)
    .where(eq(userPaymentMethods.userId, userId))
    .orderBy(
      desc(userPaymentMethods.isDefault),
      desc(userPaymentMethods.createdAt),
    )
    .execute()
}, 'getUserPaymentMethods')

export const getUserAddresses = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt))
    .execute()
}, 'getUserAddresses')

export const getInventoryByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(inventory)
    .where(eq(inventory.userId, userId))
    .orderBy(desc(inventory.acquiredAt))
    .execute()
}, 'getInventoryByUser')

export const getInventoryByItem = wrapQuery(async (itemId: number) => {
  return await db
    .select()
    .from(inventory)
    .where(eq(inventory.itemId, itemId))
    .execute()
}, 'getInventoryByItem')

export const getInventoryItem = wrapQuery(
  async (userId: number, itemId: number) => {
    const result = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)))
      .limit(1)
      .execute()
    return result[0] || null
  },
  'getInventoryItem',
)

export const getListingsByUser = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(listings)
    .where(eq(listings.userId, userId))
    .orderBy(desc(listings.listDate))
    .execute()
}, 'getListingsByUser')

export const getListingById = wrapQuery(async (listingId: number) => {
  const result = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .execute()
  return result[0] || null
}, 'getListingById')

export const getActiveListings = wrapQuery(async () => {
  return await db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'))
    .orderBy(desc(listings.listDate))
    .execute()
}, 'getActiveListings')

export const getSystemConfig = wrapQuery(async (key: string) => {
  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .execute()
  return result[0] || null
}, 'getSystemConfig')

export const getAllSystemConfig = wrapQuery(async () => {
  return await db.select().from(systemConfig).execute()
}, 'getAllSystemConfig')

// Item Mutations
export const createItem = wrapQuery(
  async (data: {
    title: string
    description?: string
    categoryId: number
    sellerId: number
    price: number
    auctionFlag: number
    startingBid?: number
    currentBid?: number
    bidIncrement?: number
    endTime?: number
    quantity?: number
    expiresIn?: string
    expired?: boolean
    imageUrl?: string
  }) => {
    const result = await db
      .insert(items)
      .values({
        title: data.title,
        description: data.description || null,
        categoryId: data.categoryId,
        sellerId: data.sellerId,
        price: data.price,
        auctionFlag: data.auctionFlag,
        startingBid: data.startingBid || null,
        currentBid: data.currentBid || null,
        bidIncrement: data.bidIncrement || 1.0,
        endTime: data.endTime || null,
        quantity: data.quantity || 1,
        status: 'active',
        bidCount: 0,
        expiresIn: data.expiresIn || null,
        expired: data.expired || false,
        imageUrl: data.imageUrl || null,
      })
      .returning()
      .execute()

    return result[0]
  },
  'createItem',
)

export const updateItemStatus = wrapQuery(
  async (itemId: number, status: string) => {
    const result = await db
      .update(items)
      .set({ status })
      .where(sql`${items.id} = ${itemId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateItemStatus',
)

export const updateItemQuantity = wrapQuery(
  async (itemId: number, quantity: number) => {
    const result = await db
      .update(items)
      .set({ quantity })
      .where(sql`${items.id} = ${itemId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateItemQuantity',
)

export const updateItemStatusAndQuantity = wrapQuery(
  async (itemId: number, status: string, quantity?: number) => {
    const updates: any = { status }
    if (quantity !== undefined) {
      updates.quantity = quantity
    }
    const result = await db
      .update(items)
      .set(updates)
      .where(sql`${items.id} = ${itemId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateItemStatusAndQuantity',
)

export const updateItemBid = wrapQuery(
  async (itemId: number, currentBid: number, bidCount: number) => {
    const result = await db
      .update(items)
      .set({ currentBid, bidCount })
      .where(sql`${items.id} = ${itemId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateItemBid',
)

export const updateItem = wrapQuery(
  async (
    itemId: number,
    data: {
      title?: string
      description?: string
      categoryId?: number
      price?: number
      auctionFlag?: number
      startingBid?: number
      bidIncrement?: number
      endTime?: number
      quantity?: number
      status?: string
      expired?: boolean
      imageUrl?: string
    },
  ) => {
    const updates: any = {
      updatedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
    }

    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId
    if (data.price !== undefined) updates.price = data.price
    if (data.auctionFlag !== undefined) updates.auctionFlag = data.auctionFlag
    if (data.startingBid !== undefined) updates.startingBid = data.startingBid
    if (data.bidIncrement !== undefined) {
      updates.bidIncrement = data.bidIncrement
    }
    if (data.endTime !== undefined) updates.endTime = data.endTime
    if (data.quantity !== undefined) updates.quantity = data.quantity
    if (data.status !== undefined) updates.status = data.status
    if (data.expired !== undefined) updates.expired = data.expired ? 1 : 0
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl

    const result = await db
      .update(items)
      .set(updates)
      .where(sql`${items.id} = ${itemId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateItem',
)

// Bid Mutations
export const createBid = wrapQuery(
  async (data: {
    sessionId?: number
    itemId: number
    userId: number
    bidAmount: number
    bidTime?: number
    deterministicSeed?: number
  }) => {
    // First, unset all winning bids for this item
    await db
      .update(bids)
      .set({ isWinning: 0 })
      .where(sql`${bids.itemId} = ${data.itemId}`)
      .execute()

    // Create new bid as winning
    const result = await db
      .insert(bids)
      .values({
        sessionId: data.sessionId || null,
        itemId: data.itemId,
        userId: data.userId,
        bidAmount: data.bidAmount,
        bidTime: data.bidTime || Math.floor(Date.now() / 1000),
        isWinning: 1,
        outcome: 'pending',
        deterministicSeed: data.deterministicSeed || null,
      })
      .returning()
      .execute()

    // Update item's current bid and bid count
    const item = await db
      .select()
      .from(items)
      .where(sql`${items.id} = ${data.itemId}`)
      .execute()

    if (item[0]) {
      await db
        .update(items)
        .set({
          currentBid: data.bidAmount,
          bidCount: (item[0].bidCount || 0) + 1,
        })
        .where(sql`${items.id} = ${data.itemId}`)
        .execute()
    }

    return result[0]
  },
  'createBid',
)

export const updateBidOutcome = wrapQuery(
  async (bidId: number, outcome: 'won' | 'lost' | 'pending' | 'outbid') => {
    const result = await db
      .update(bids)
      .set({ outcome })
      .where(sql`${bids.id} = ${bidId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateBidOutcome',
)

// Transaction Mutations
export const createTransaction = wrapQuery(
  async (data: {
    sessionId?: number
    transactionType: 'purchase' | 'bid_win' | 'listing' | 'sale' | 'refund'
    itemId?: number
    userId: number
    sellerId?: number
    bidId?: number
    amount: number
    quantity?: number
    paymentMethod?: string
    paymentCardNumber?: string
    status?: 'completed' | 'pending' | 'cancelled' | 'refunded'
    paymentStatus?: 'pending' | 'success' | 'failed'
    failureReason?: string
  }) => {
    const result = await db
      .insert(transactions)
      .values({
        sessionId: data.sessionId || null,
        transactionType: data.transactionType,
        itemId: data.itemId || null,
        userId: data.userId,
        sellerId: data.sellerId || null,
        bidId: data.bidId || null,
        amount: data.amount,
        quantity: data.quantity || 1,
        status: data.status || 'pending',
        paymentStatus: data.paymentStatus || 'pending',
        paymentMethod: data.paymentMethod || null,
        paymentCardNumber: data.paymentCardNumber || null,
        failureReason: data.failureReason || null,
        refundAmount: 0,
      })
      .returning()
      .execute()

    return result[0]
  },
  'createTransaction',
)

export const updateTransactionStatus = wrapQuery(
  async (
    transactionId: number,
    status: 'completed' | 'pending' | 'cancelled' | 'refunded',
  ) => {
    const result = await db
      .update(transactions)
      .set({ status })
      .where(sql`${transactions.id} = ${transactionId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateTransactionStatus',
)

export const updateTransactionPaymentStatus = wrapQuery(
  async (
    transactionId: number,
    paymentStatus: 'pending' | 'success' | 'failed',
    failureReason?: string,
  ) => {
    // Get current transaction to check if status is already 'cancelled'
    const currentTransaction = await db
      .select()
      .from(transactions)
      .where(sql`${transactions.id} = ${transactionId}`)
      .limit(1)
      .execute()

    const currentStatus = currentTransaction[0]?.status

    // Only update status if payment succeeded (set to completed)
    // Preserve 'cancelled' status if already set (don't override it)
    const statusUpdate: any = {
      paymentStatus,
      failureReason: failureReason || null,
    }

    if (paymentStatus === 'success') {
      statusUpdate.status = 'completed'
    } else if (currentStatus !== 'cancelled') {
      // Only set to 'pending' if not already 'cancelled'
      // This preserves 'cancelled' status when transactions are disabled
      statusUpdate.status = 'pending'
    }
    // If currentStatus is 'cancelled', don't change it

    const result = await db
      .update(transactions)
      .set(statusUpdate)
      .where(sql`${transactions.id} = ${transactionId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateTransactionPaymentStatus',
)

export const refundTransaction = wrapQuery(
  async (transactionId: number, refundAmount: number) => {
    const result = await db
      .update(transactions)
      .set({
        status: 'refunded',
        refundAmount,
        refundedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
      })
      .where(sql`${transactions.id} = ${transactionId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'refundTransaction',
)

// Payment Mutations
export const createPayment = wrapQuery(
  async (data: {
    transactionId: number
    cardNumber: string
    cardType?: string
    amount: number
    status: 'success' | 'declined' | 'pending'
    failureReason?: string
    deterministicSeed?: number
  }) => {
    const result = await db
      .insert(payments)
      .values({
        transactionId: data.transactionId,
        cardNumber: data.cardNumber,
        cardType: data.cardType || null,
        amount: data.amount,
        status: data.status,
        failureReason: data.failureReason || null,
        deterministicSeed: data.deterministicSeed || null,
      })
      .returning()
      .execute()

    return result[0]
  },
  'createPayment',
)

// Inventory Mutations
export const addToInventory = wrapQuery(
  async (data: {
    userId: number
    itemId: number
    transactionId?: number
    quantity?: number
  }) => {
    const result = await db
      .insert(inventory)
      .values({
        userId: data.userId,
        itemId: data.itemId,
        transactionId: data.transactionId || null,
        quantity: data.quantity || 1,
      })
      .returning()
      .execute()

    return result[0]
  },
  'addToInventory',
)

// Listing Mutations
export const createListing = wrapQuery(
  async (data: {
    sessionId?: number
    userId: number
    itemId: number
    listPrice: number
  }) => {
    const result = await db
      .insert(listings)
      .values({
        sessionId: data.sessionId || null,
        userId: data.userId,
        itemId: data.itemId,
        listPrice: data.listPrice,
        status: 'active',
      })
      .returning()
      .execute()

    return result[0]
  },
  'createListing',
)

export const updateListingStatus = wrapQuery(
  async (
    listingId: number,
    status: 'active' | 'sold' | 'cancelled' | 'expired',
  ) => {
    const result = await db
      .update(listings)
      .set({ status })
      .where(sql`${listings.id} = ${listingId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateListingStatus',
)

// User Mutations
export const updateUserSellerStats = wrapQuery(
  async (
    userId: number,
    stats: {
      totalItemsListed?: number
      totalSales?: number
      sellerRating?: number
    },
  ) => {
    const result = await db
      .update(users)
      .set(stats)
      .where(sql`${users.id} = ${userId}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateUserSellerStats',
)

// System Config Mutations
export const updateSystemConfig = wrapQuery(
  async (key: string, value: string) => {
    const result = await db
      .update(systemConfig)
      .set({
        value,
        updatedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
      })
      .where(sql`${systemConfig.key} = ${key}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'updateSystemConfig',
)

export const setSystemConfig = wrapQuery(
  async (data: {
    key: string
    value: string
    dataType?: string
    category?: string
    description?: string
  }) => {
    const result = await db
      .insert(systemConfig)
      .values({
        key: data.key,
        value: data.value,
        dataType: data.dataType || null,
        category: data.category || null,
        description: data.description || null,
      })
      .onConflictDoUpdate({
        target: systemConfig.key,
        set: {
          value: data.value,
          updatedAt: sql`(strftime('%Y-%m-%d %H:%M:%f', 'now'))`,
        },
      })
      .returning()
      .execute()

    return result[0]
  },
  'setSystemConfig',
)

// Payment Method Mutations
export const addUserPaymentMethod = wrapQuery(
  async (data: {
    userId: number
    cardType: string
    cardNumber: string
    expiry: string
    cardHolderName: string
    isDefault?: boolean
  }) => {
    // If setting as default, unset other defaults for this user
    if (data.isDefault) {
      await db
        .update(userPaymentMethods)
        .set({ isDefault: false })
        .where(sql`${userPaymentMethods.userId} = ${data.userId}`)
        .execute()
    }

    const result = await db
      .insert(userPaymentMethods)
      .values({
        userId: data.userId,
        cardType: data.cardType,
        cardNumber: data.cardNumber,
        expiry: data.expiry,
        cardHolderName: data.cardHolderName,
        isDefault: data.isDefault || false,
      })
      .returning()
      .execute()

    return result[0]
  },
  'addUserPaymentMethod',
)

export const removeUserPaymentMethod = wrapQuery(async (id: number) => {
  const result = await db
    .delete(userPaymentMethods)
    .where(sql`${userPaymentMethods.id} = ${id}`)
    .returning()
    .execute()

  return result[0] || null
}, 'removeUserPaymentMethod')

export const setDefaultPaymentMethod = wrapQuery(
  async (userId: number, id: number) => {
    // Unset all defaults for this user
    await db
      .update(userPaymentMethods)
      .set({ isDefault: false })
      .where(sql`${userPaymentMethods.userId} = ${userId}`)
      .execute()

    // Set the specific card as default
    const result = await db
      .update(userPaymentMethods)
      .set({ isDefault: true })
      .where(sql`${userPaymentMethods.id} = ${id}`)
      .returning()
      .execute()

    return result[0] || null
  },
  'setDefaultPaymentMethod',
)

export const queries = {
  // Database
  isDatabaseInitialized,

  // Categories
  getAllCategories,
  getCategoryById,
  getCategoryByCode,

  // Users
  getUserById,
  getUserByUsername,
  getAllUsers,
  getSellers,
  createUser,
  updateUserProfile,
  updateUserSellerStats,

  // Items
  getAllItems,
  getItemById,
  getItemsByCategory,
  getItemsBySeller,
  getActiveItems,
  getAuctionItems,
  getBuyNowItems,
  searchItems,
  getItemDetail,
  createItem,
  updateItem,
  updateItemStatus,
  updateItemQuantity,
  updateItemStatusAndQuantity,
  updateItemBid,

  // Sessions
  createSession,
  getSessionById,
  getSessionByDbId,
  getSessionsByUserId,
  endSession,

  // Bids
  getAllBids,
  getBidsByItem,
  getBidsByUser,
  getBidsBySession,
  getWinningBid,
  getBidById,
  createBid,
  updateBidOutcome,

  // Transactions
  getAllTransactions,
  getTransactionsByUser,
  getTransactionsBySession,
  getTransactionById,
  getTransactionsByItem,
  getRefundTransactionForPurchase,
  getPurchasesByUser,
  getSalesByUser,
  createTransaction,
  updateTransactionStatus,
  updateTransactionPaymentStatus,
  refundTransaction,

  // Payments
  getPaymentById,
  getPaymentsByTransaction,
  getMockCardByNumber,
  getAllMockCards,
  getUserPaymentMethods,
  getUserAddresses,
  createPayment,
  addUserPaymentMethod,
  removeUserPaymentMethod,
  setDefaultPaymentMethod,

  // Inventory
  getInventoryByUser,
  getInventoryByItem,
  getInventoryItem,
  addToInventory,

  // Listings
  getListingsByUser,
  getListingById,
  getActiveListings,
  createListing,
  updateListingStatus,

  // System Config
  getSystemConfig,
  getAllSystemConfig,
  updateSystemConfig,
  setSystemConfig,
}
