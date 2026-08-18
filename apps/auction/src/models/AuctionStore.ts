// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations' // Only for initializeDatabase
import {
  types,
  flow,
  Instance,
  SnapshotOut,
  SnapshotIn,
  getRoot,
  applySnapshot,
} from 'mobx-state-tree'

const Category = types.model('Category', {
  id: types.identifierNumber,
  code: types.string,
  name: types.string,
  description: types.maybeNull(types.string),
  createdAt: types.string,
})

const User = types.model('User', {
  id: types.identifierNumber,
  username: types.string,
  email: types.maybeNull(types.string),
  name: types.maybeNull(types.string),
  sellerRating: types.optional(types.number, 0),
  totalSales: types.optional(types.number, 0),
  totalItemsListed: types.optional(types.number, 0),
  createdAt: types.string,
  updatedAt: types.string,
})

const Item = types
  .model('Item', {
    id: types.identifierNumber,
    title: types.string,
    description: types.maybeNull(types.string),
    categoryId: types.number,
    sellerId: types.number,
    price: types.number,
    auctionFlag: types.number, // 1 = auction, 0 = buy-now
    currentBid: types.maybeNull(types.number),
    startingBid: types.maybeNull(types.number),
    bidIncrement: types.optional(types.number, 1.0),
    endTime: types.maybeNull(types.number), // Unix timestamp
    status: types.optional(
      types.enumeration(['active', 'sold', 'cancelled', 'expired']),
      'active',
    ),
    quantity: types.optional(types.number, 1),
    bidCount: types.optional(types.number, 0),
    imageUrl: types.maybeNull(types.string),
    createdAt: types.string,
    updatedAt: types.string,
    soldAt: types.maybeNull(types.string),
    expiresIn: types.maybeNull(types.string),
    expired: types.optional(types.boolean, false),
  })
  .views(self => ({
    get isAuction() {
      return self.auctionFlag === 1
    },
    get isBuyNow() {
      return self.auctionFlag === 0
    },
    get isActive() {
      return self.status === 'active'
    },
    get isExpired() {
      // Auctions only expire when owner manually ends them (via endListing)
      // Bidding closes at endTime, but auction doesn't auto-expire
      return self.expired === true
    },
    get timeRemaining() {
      if (!self.isAuction || !self.endTime) return null
      const now = Math.floor(Date.now() / 1000)
      return Math.max(0, self.endTime - now)
    },
    get currentPrice() {
      if (self.isAuction) {
        return self.currentBid || self.startingBid || self.price
      }
      return self.price
    },
    get minNextBid() {
      if (!self.isAuction) return null
      // Minimum bid is just the current price (no increments)
      return self.currentBid || self.startingBid || self.price
    },
  }))

const Bid = types.model('Bid', {
  id: types.identifierNumber,
  sessionId: types.maybeNull(types.number),
  itemId: types.number,
  userId: types.number,
  bidAmount: types.number,
  outcome: types.maybeNull(
    types.enumeration(['won', 'lost', 'pending', 'outbid']),
  ),
  isWinning: types.optional(types.boolean, false),
  bidTime: types.maybeNull(types.number),
  createdAt: types.string,
  deterministicSeed: types.maybeNull(types.number),
})

const Transaction = types
  .model('Transaction', {
    id: types.identifierNumber,
    sessionId: types.maybeNull(types.number),
    transactionType: types.enumeration([
      'purchase',
      'bid_win',
      'listing',
      'sale',
      'refund',
    ]),
    itemId: types.maybeNull(types.number),
    userId: types.number,
    sellerId: types.maybeNull(types.number),
    bidId: types.maybeNull(types.number),
    amount: types.number,
    quantity: types.optional(types.number, 1),
    status: types.optional(
      types.enumeration(['completed', 'pending', 'cancelled', 'refunded']),
      'completed',
    ),
    paymentStatus: types.optional(
      types.enumeration(['pending', 'success', 'failed']),
      'pending',
    ),
    paymentMethod: types.maybeNull(types.string),
    paymentCardNumber: types.maybeNull(types.string),
    failureReason: types.maybeNull(types.string),
    refundAmount: types.optional(types.number, 0),
    refundedAt: types.maybeNull(types.string),
    transactionDate: types.string,
    createdAt: types.string,
    metadata: types.maybeNull(types.string),
  })
  .views(self => ({
    get isPurchase() {
      return ['purchase', 'bid_win'].includes(self.transactionType)
    },
    get isSale() {
      return self.transactionType === 'sale'
    },
    get isRefunded() {
      return self.status === 'refunded' || self.refundAmount > 0
    },
    get canCancel() {
      // Refund transactions can never be cancelled
      if (self.transactionType === 'refund') {
        return false
      }
      // Only purchase transactions with completed status that haven't been refunded can be cancelled
      return (
        self.transactionType === 'purchase' &&
        self.status === 'completed' &&
        !self.isRefunded
      )
    },
    get isOutgoing() {
      // Outgoing transactions: purchases, bid wins (money going out)
      return ['purchase', 'bid_win'].includes(self.transactionType)
    },
    get signedAmount() {
      // Negative for outgoing, positive for incoming
      const sign = self.isOutgoing ? '-' : '+'
      return `${sign}$${Math.abs(self.amount).toFixed(2)}`
    },
  }))

const Payment = types.model('Payment', {
  id: types.identifierNumber,
  transactionId: types.number,
  cardNumber: types.string,
  cardType: types.maybeNull(types.string),
  amount: types.number,
  status: types.enumeration(['success', 'declined', 'pending']),
  failureReason: types.maybeNull(types.string),
  processedAt: types.string,
  createdAt: types.string,
  deterministicSeed: types.maybeNull(types.number),
})

const MockCard = types.model('MockCard', {
  id: types.identifierNumber,
  cardNumber: types.string,
  cardType: types.string,
  alwaysSucceeds: types.number, // 1 = succeeds, 0 = fails
  failureReason: types.maybeNull(types.string),
  createdAt: types.string,
})

const InventoryItem = types.model('InventoryItem', {
  id: types.identifierNumber,
  userId: types.number,
  itemId: types.number,
  transactionId: types.maybeNull(types.number),
  quantity: types.optional(types.number, 1),
  acquiredAt: types.string,
})

const Listing = types.model('Listing', {
  id: types.identifierNumber,
  sessionId: types.maybeNull(types.number),
  userId: types.number,
  itemId: types.number,
  listPrice: types.number,
  listDate: types.string,
  status: types.optional(
    types.enumeration(['active', 'sold', 'cancelled', 'expired']),
    'active',
  ),
})

const UserPaymentMethod = types.model('UserPaymentMethod', {
  id: types.identifierNumber,
  userId: types.number,
  cardType: types.string,
  cardNumber: types.string,
  expiry: types.string,
  cardHolderName: types.string,
  isDefault: types.optional(types.boolean, false),
  createdAt: types.string,
})

const Session = types.model('Session', {
  id: types.identifierNumber,
  sessionId: types.string,
  userId: types.maybeNull(types.number),
  seed: types.number,
  transactionsSucceed: types.optional(types.number, 1),
  status: types.optional(types.enumeration(['active', 'ended']), 'active'),
  createdAt: types.string,
  endedAt: types.maybeNull(types.string),
  metadata: types.maybeNull(types.string),
})

export const AuctionStore = types
  .model('AuctionStore', {
    // Data
    categories: types.array(Category),
    users: types.array(User),
    items: types.array(Item),
    bids: types.array(Bid),
    transactions: types.array(Transaction),
    payments: types.array(Payment),
    mockCards: types.array(MockCard),
    inventory: types.array(InventoryItem),
    listings: types.array(Listing),
    sessions: types.array(Session),
    userPaymentMethods: types.array(UserPaymentMethod),

    // Current state
    currentSession: types.maybeNull(types.reference(Session)),
    currentUser: types.maybeNull(types.reference(User)),
    selectedItem: types.maybeNull(types.reference(Item)),
    selectedCategory: types.maybeNull(types.reference(Category)),

    // UI State
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    searchQuery: types.optional(types.string, ''),
    searchCategoryId: types.maybeNull(types.number),
    searchResults: types.array(types.reference(Item)),

    // Performance optimization: track if data has been loaded
    dataLoaded: types.optional(types.boolean, false),
    lastDataLoadTime: types.optional(types.number, 0),
  })
  .views(self => ({
    // Categories
    getCategoryById(id: number) {
      return self.categories.find(c => c.id === id)
    },
    getCategoryByCode(code: string) {
      return self.categories.find(c => c.code === code)
    },

    // Users
    getUserById(id: number) {
      return self.users.find(u => u.id === id)
    },
    getUserByUsername(username: string) {
      return self.users.find(u => u.username === username)
    },
    getSellerById(id: number) {
      const user = this.getUserById(id)
      return user && (user.sellerRating > 0 || user.totalItemsListed > 0)
        ? user
        : null
    },
    getSellers() {
      return self.users.filter(
        u => u.sellerRating > 0 || u.totalItemsListed > 0,
      )
    },

    // Items
    getItemById(id: number) {
      return self.items.find(i => i.id === id)
    },
    get activeItems() {
      return self.items.filter(i => i.status === 'active')
    },
    get auctionItems() {
      return self.items.filter(
        i => i.auctionFlag === 1 && i.status === 'active' && !i.isExpired,
      )
    },
    get buyNowItems() {
      return self.items.filter(
        i => i.auctionFlag === 0 && i.status === 'active',
      )
    },
    getItemsByCategory(categoryId: number) {
      return self.items.filter(
        i => i.categoryId === categoryId && i.status === 'active',
      )
    },
    getItemsBySeller(sellerId: number) {
      return self.items.filter(i => i.sellerId === sellerId)
    },

    // Bids
    getBidsByItem(itemId: number) {
      return self.bids.filter(b => b.itemId === itemId)
    },
    getBidsByUser(userId: number) {
      return self.bids.filter(b => b.userId === userId)
    },
    getWinningBid(itemId: number) {
      return self.bids.find(b => b.itemId === itemId && b.isWinning)
    },

    // Transactions
    getTransactionsByUser(userId: number) {
      // Filter by user and exclude 'listing' transactions, sort by date descending
      return self.transactions
        .filter(t => t.userId === userId && t.transactionType !== 'listing')
        .sort((a, b) => {
          // Parse dates more robustly
          const parseDate = (dateStr: string | null | undefined): number => {
            if (!dateStr) return 0
            const parsed = new Date(dateStr).getTime()
            return isNaN(parsed) ? 0 : parsed
          }

          const dateA = parseDate(a.transactionDate || a.createdAt)
          const dateB = parseDate(b.transactionDate || b.createdAt)

          // If dates are equal, use ID as tiebreaker (higher ID = newer)
          if (dateB === dateA) {
            return b.id - a.id
          }
          return dateB - dateA // Latest first
        })
    },
    getPurchasesByUser(userId: number) {
      return self.transactions.filter(
        t =>
          t.userId === userId &&
          ['purchase', 'bid_win'].includes(t.transactionType) &&
          t.status === 'completed',
      )
    },
    getSalesByUser(userId: number) {
      return self.transactions.filter(
        t =>
          t.sellerId === userId &&
          t.transactionType === 'sale' &&
          t.status === 'completed',
      )
    },

    // Inventory
    getInventoryByUser(userId: number) {
      return self.inventory.filter(i => i.userId === userId)
    },
    getUserInventoryItem(userId: number, itemId: number) {
      return self.inventory.find(
        i => i.userId === userId && i.itemId === itemId,
      )
    },
    getInventoryItem(userId: number, itemId: number) {
      return self.inventory.find(
        i => i.userId === userId && i.itemId === itemId,
      )
    },

    // Mock Cards
    getMockCardByNumber(cardNumber: string) {
      return self.mockCards.find(c => c.cardNumber === cardNumber)
    },

    // User Payment Methods
    getUserPaymentMethods(userId: number) {
      return self.userPaymentMethods.filter(pm => pm.userId === userId)
    },
    getDefaultPaymentMethod(userId: number) {
      return self.userPaymentMethods.find(
        pm => pm.userId === userId && pm.isDefault,
      )
    },
  }))
  .actions(self => ({
    initializeDatabase: flow(function* () {
      self.isLoading = true
      self.error = null
      try {
        const result = yield mutations.initializeDatabase()
        if (!result.success) {
          throw new Error(result.error || 'Failed to initialize database')
        }
        yield self.loadAllData()
      } catch (error: any) {
        self.error = error.message || 'Failed to initialize database'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    loadAllData: flow(function* (force = false) {
      // Skip if data was loaded recently (within last 5 seconds) unless forced
      const now = Date.now()
      if (!force && self.dataLoaded && now - self.lastDataLoadTime < 5000) {
        return
      }

      self.isLoading = true
      self.error = null
      // Safely get userId from root store if it exists (may not exist in tests)
      let userId: number | undefined
      try {
        const root: any = getRoot(self)
        userId = root?.userStore?.user?.id
      } catch (error) {
        // Root store may not exist in test environments
        userId = undefined
      }
      try {
        const [
          categoriesData,
          usersData,
          itemsData,
          bidsData,
          transactionsData,
          userPaymentMethods,
          mockCardsData,
        ] = yield Promise.all([
          queries.getAllCategories(),
          queries.getAllUsers(),
          queries.getAllItems(),
          queries.getAllBids(),
          queries.getAllTransactions(),
          userId ? queries.getUserPaymentMethods(userId) : Promise.resolve([]),
          queries.getAllMockCards(),
          // Promise.resolve([]), // Payments loaded on demand
          // Promise.resolve([]), // Inventory loaded on demand
          // Promise.resolve([]), // Listings loaded on demand
          // Promise.resolve([]), // Sessions loaded on demand
        ])

        // Normalize DB rows into MST-friendly shapes (some DB columns can be NULL).
        // This is especially important after db-forge appends where JSON may omit fields
        // and the merge layer may write NULLs.
        const normalizedItems = (itemsData as any[]).map(i => ({
          ...i,
          bidIncrement: i?.bidIncrement ?? i?.bid_increment ?? 0.0,
          expired:
            i?.expired === null || i?.expired === undefined
              ? false
              : !!i.expired,
        }))

        self.categories.replace(categoriesData as any)
        self.users.replace(usersData as any)
        self.items.replace(normalizedItems as any)
        self.bids.replace(bidsData as any)
        self.transactions.replace(transactionsData as any)
        self.userPaymentMethods.replace(userPaymentMethods as any)
        self.mockCards.replace(mockCardsData as any)

        self.dataLoaded = true
        self.lastDataLoadTime = now
      } catch (error: any) {
        self.error = error.message || 'Failed to load data'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    createSession: flow(function* (data: {
      sessionId: string
      userId?: number
      seed: number
      transactionsSucceed?: boolean
      metadata?: string
    }) {
      self.isLoading = true
      self.error = null
      try {
        // If transactionsSucceed not explicitly provided, check system config
        let transactionsSucceed = data.transactionsSucceed
        if (transactionsSucceed === undefined) {
          try {
            const config = yield queries.getSystemConfig('transactions_succeed')
            if (config && config.value) {
              transactionsSucceed = config.value === 'true'
            } else {
              // Default to true if config not found
              transactionsSucceed = true
            }
          } catch (error) {
            // Default to true if error reading config
            transactionsSucceed = true
          }
        }

        const session = yield queries.createSession({
          ...data,
          transactionsSucceed,
        })
        // Check for duplicates by both id (MST identifier) and sessionId
        // MST uses 'id' as the unique identifier, so we must ensure no duplicates by id
        let sessionModel = self.sessions.find(
          s => s.id === session.id || s.sessionId === session.sessionId,
        )

        if (!sessionModel) {
          // Remove any existing sessions with the same id to prevent MST reference errors
          // This can happen if sessions are restored or created multiple times
          const duplicatesById = self.sessions.filter(s => s.id === session.id)
          duplicatesById.forEach(dup => {
            const index = self.sessions.indexOf(dup)
            if (index >= 0) {
              self.sessions.splice(index, 1)
            }
          })

          // Also remove any sessions with the same sessionId to keep only one active session
          const duplicatesBySessionId = self.sessions.filter(
            s => s.sessionId === session.sessionId && s.id !== session.id,
          )
          duplicatesBySessionId.forEach(dup => {
            const index = self.sessions.indexOf(dup)
            if (index >= 0) {
              self.sessions.splice(index, 1)
            }
          })

          sessionModel = Session.create(session as any)
          self.sessions.push(sessionModel)
        } else {
          // Update existing session if found (by id or sessionId)
          sessionModel.sessionId = session.sessionId
          sessionModel.userId = session.userId
          sessionModel.seed = session.seed
          sessionModel.transactionsSucceed = session.transactionsSucceed
          sessionModel.status = session.status
          sessionModel.createdAt = session.createdAt
          sessionModel.endedAt = session.endedAt
          sessionModel.metadata = session.metadata
        }
        self.currentSession = sessionModel || null

        // Ensure no duplicates exist after creating/updating session
        self.deduplicateSessions()

        return sessionModel
      } catch (error: any) {
        self.error = error.message || 'Failed to create session'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    endSession: flow(function* (sessionId: string) {
      self.isLoading = true
      self.error = null
      try {
        const session = yield queries.endSession(sessionId)
        if (session) {
          const sessionModel = self.sessions.find(
            s => s.sessionId === sessionId,
          )
          if (sessionModel) {
            sessionModel.status = 'ended'
            sessionModel.endedAt = session.endedAt
          }
          // Update currentSession reference if it matches - don't clear it
          if (self.currentSession?.sessionId === sessionId) {
            // The reference will automatically reflect the updated status
            // No need to clear it - just ensure the model is updated
          }
        }
      } catch (error: any) {
        self.error = error.message || 'Failed to end session'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    setCurrentUser(userId: number | null) {
      if (userId === null) {
        self.currentUser = null
        return
      }
      const user = self.users.find(u => u.id === userId)
      if (!user) {
        return
      }
      self.currentUser = user
    },

    searchItems: flow(function* (params: {
      keyword?: string
      categoryId?: number
      sellerId?: number
      auctionFlag?: number
      limit?: number
    }) {
      self.isLoading = true
      self.error = null
      try {
        const results = yield queries.searchItems(params)
        self.searchQuery = params.keyword || ''
        self.searchCategoryId = params.categoryId || null
        self.searchResults.replace(results.map((r: any) => r.id))
        return results
      } catch (error: any) {
        self.error = error.message || 'Failed to search items'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    setSelectedItem(itemId: number | null) {
      if (itemId === null) {
        self.selectedItem = null
        return
      }
      const item = self.items.find(i => i.id === itemId)
      self.selectedItem = item || null
    },

    setSelectedCategory(categoryId: number | null) {
      if (categoryId === null) {
        self.selectedCategory = null
        return
      }
      const category = self.categories.find(c => c.id === categoryId)
      self.selectedCategory = category || null
    },

    loadItemDetail: flow(function* (itemId: number) {
      self.isLoading = true
      self.error = null
      try {
        const itemDetail = yield queries.getItemDetail(itemId)
        if (!itemDetail) {
          throw new Error(`Item with id ${itemId} not found`)
        }
        // Update item if exists, or add if new
        const existingIndex = self.items.findIndex(i => i.id === itemId)
        if (existingIndex >= 0) {
          self.items[existingIndex] = itemDetail as any
        } else {
          self.items.push(itemDetail as any)
        }
        self.selectedItem = self.items.find(i => i.id === itemId) || null
        return itemDetail
      } catch (error: any) {
        self.error = error.message || 'Failed to load item detail'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    placeBid: flow(function* (data: {
      itemId: number
      userId: number
      bidAmount: number
      deterministicSeed?: number
    }) {
      self.isLoading = true
      self.error = null
      try {
        // Try to find item in store first, if not found, query it
        let item = self.items.find(i => i.id === data.itemId)
        if (!item) {
          const itemData = yield queries.getItemById(data.itemId)
          if (!itemData) {
            throw new Error('Item not found')
          }
          item = Item.create(itemData as any)
          self.items.push(item)
        }

        if (!item.isAuction) {
          throw new Error('Item is not an auction item')
        }
        // Check if bidding has closed (endTime passed) but auction hasn't auto-expired
        const now = Math.floor(Date.now() / 1000)
        if (item.endTime && item.endTime < now) {
          throw new Error('Bidding has closed for this auction')
        }
        if (item.isExpired) {
          throw new Error('Auction has been ended by the owner')
        }
        if (item.status !== 'active') {
          throw new Error('Item is not active')
        }

        const minBid = item.minNextBid
        // Bid must be strictly greater than current price (no increments)
        if (minBid && data.bidAmount <= minBid) {
          throw new Error(
            `Bid must be higher than current price of $${minBid.toFixed(2)}`,
          )
        }

        // Check if user has at least one payment method
        const userPaymentMethods = yield queries.getUserPaymentMethods(
          data.userId,
        )
        if (!userPaymentMethods || userPaymentMethods.length === 0) {
          throw new Error('You must add a payment method before placing a bid')
        }

        // If user has only one payment method, make it default
        if (
          userPaymentMethods.length === 1 &&
          !userPaymentMethods[0].isDefault
        ) {
          yield queries.setDefaultPaymentMethod(
            data.userId,
            userPaymentMethods[0].id,
          )
          // Update local store
          const pmIndex = self.userPaymentMethods.findIndex(
            (pm: any) => pm.id === userPaymentMethods[0].id,
          )
          if (pmIndex >= 0) {
            self.userPaymentMethods[pmIndex].isDefault = true
          }
        }

        // Verify currentSession exists in database before using it as foreign key
        let validSessionId: number | null = null
        if (self.currentSession?.id) {
          try {
            const dbSession = yield queries.getSessionByDbId(
              self.currentSession.id,
            )
            if (dbSession) {
              validSessionId = self.currentSession.id
            }
          } catch (error) {
            // Session doesn't exist in database, use null
            console.warn(
              'Current session not found in database, using null for bid sessionId',
            )
          }
        }

        const bid = yield queries.createBid({
          sessionId: validSessionId,
          itemId: data.itemId,
          userId: data.userId,
          bidAmount: data.bidAmount,
          deterministicSeed: data.deterministicSeed,
        })

        // Update item in store
        const itemIndex = self.items.findIndex(i => i.id === data.itemId)
        if (itemIndex >= 0) {
          const updatedItem = yield queries.getItemById(data.itemId)
          if (updatedItem) {
            self.items[itemIndex] = updatedItem as any
          }
        }

        // Add bid to store
        const bidModel = Bid.create(bid as any)
        self.bids.push(bidModel)

        return bidModel
      } catch (error: any) {
        self.error = error.message || 'Failed to place bid'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    determineBidOutcome: flow(function* (
      bidId: number,
      outcome: 'won' | 'lost' | 'pending' | 'outbid',
    ) {
      self.isLoading = true
      self.error = null
      try {
        const bid = yield queries.updateBidOutcome(bidId, outcome)
        if (bid) {
          const bidIndex = self.bids.findIndex(b => b.id === bidId)
          if (bidIndex >= 0) {
            self.bids[bidIndex] = bid as any
          }
        }
        return bid
      } catch (error: any) {
        self.error = error.message || 'Failed to update bid outcome'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    buyNow: flow(function* (data: {
      itemId: number
      userId: number
      quantity?: number
      paymentMethod?: string
      paymentCardNumber?: string
      cvv?: string // CVV for payment validation
    }) {
      self.isLoading = true
      self.error = null
      try {
        const item = self.items.find(i => i.id === data.itemId)
        if (!item) {
          throw new Error('Item not found')
        }
        if (!item.isBuyNow) {
          throw new Error('Item is not available for buy now')
        }
        if (item.status !== 'active') {
          throw new Error('Item is not active')
        }
        // Direct purchase: No quantity checks - item is sold immediately

        // Check if user has at least one payment method
        const userPaymentMethods = yield queries.getUserPaymentMethods(
          data.userId,
        )
        if (!userPaymentMethods || userPaymentMethods.length === 0) {
          throw new Error('You must add a payment method before purchasing')
        }

        // If no payment method provided, use default (or first if no default)
        if (!data.paymentMethod || !data.paymentCardNumber) {
          const defaultMethod =
            userPaymentMethods.find((pm: any) => pm.isDefault) ||
            userPaymentMethods[0]
          if (!defaultMethod) {
            throw new Error('No payment method available')
          }
          data.paymentMethod = defaultMethod.type || 'card'
          data.paymentCardNumber = defaultMethod.cardNumber || ''
        }

        // Create transaction immediately - skip blocking session validation for speed
        // If session doesn't exist, retry with null sessionId
        let transaction
        try {
          transaction = yield queries.createTransaction({
            sessionId: self.currentSession?.id || null,
            transactionType: 'purchase',
            itemId: data.itemId,
            userId: data.userId,
            sellerId: item.sellerId,
            amount: item.price * (data.quantity || 1),
            quantity: data.quantity || 1,
            paymentMethod: data.paymentMethod,
            paymentCardNumber: data.paymentCardNumber,
          })
        } catch (error: any) {
          // If foreign key constraint fails (session doesn't exist), retry with null
          if (
            error?.message?.includes('FOREIGN KEY') ||
            error?.message?.includes('foreign key')
          ) {
            transaction = yield queries.createTransaction({
              sessionId: null,
              transactionType: 'purchase',
              itemId: data.itemId,
              userId: data.userId,
              sellerId: item.sellerId,
              amount: item.price * (data.quantity || 1),
              quantity: data.quantity || 1,
              paymentMethod: data.paymentMethod,
              paymentCardNumber: data.paymentCardNumber,
            })
          } else {
            throw error
          }
        }

        // Map failure reason codes to user-friendly messages
        const getUserFriendlyError = (reason: string | null | undefined) => {
          if (!reason) return 'Purchase failed, please try again'
          const reasonUpper = reason.toUpperCase()
          if (
            reasonUpper === 'PAYMENT_DECLINED' ||
            reasonUpper === 'DECLINED'
          ) {
            return 'Purchase failed, please try again'
          }
          // Return the reason as-is if it's already user-friendly
          return reason
        }

        // Process payment if card provided
        if (data.paymentCardNumber) {
          const payment = yield self.processPayment({
            transactionId: transaction.id,
            cardNumber: data.paymentCardNumber,
            amount: transaction.amount,
            // CVV removed - no longer required
            transactionType: 'purchase',
          })

          // Check payment status - throw error if payment failed
          // This ensures buyNow fails when config toggle is off
          if (payment.status === 'declined') {
            // Ensure transaction is updated with failed status before throwing error
            const updatedTransaction = yield queries.getTransactionById(
              transaction.id,
            )
            if (
              updatedTransaction &&
              updatedTransaction.paymentStatus === 'failed'
            ) {
              // Transaction already updated with failed status - throw error with user-friendly message
              throw new Error(
                getUserFriendlyError(updatedTransaction.failureReason),
              )
            } else {
              // Fallback: Update transaction to failed status if not already updated
              yield queries.updateTransactionPaymentStatus(
                transaction.id,
                'failed',
                payment.failureReason || 'PAYMENT_DECLINED',
              )
              throw new Error(getUserFriendlyError(payment.failureReason))
            }
          }

          // Double-check transaction payment status from database
          const updatedTransaction = yield queries.getTransactionById(
            transaction.id,
          )
          if (
            updatedTransaction &&
            updatedTransaction.paymentStatus === 'failed'
          ) {
            throw new Error(
              getUserFriendlyError(updatedTransaction.failureReason),
            )
          }

          // Ensure payment succeeded before continuing
          if (payment.status !== 'success') {
            throw new Error('Payment processing failed')
          }
        }

        // Direct purchase: Always mark item as sold immediately (no quantity tracking)
        const itemIndex = self.items.findIndex(i => i.id === data.itemId)
        if (itemIndex >= 0) {
          // Update item status to 'sold' and remove from active listings
          yield queries.updateItemStatusAndQuantity(data.itemId, 'sold', 0)
          self.items[itemIndex].status = 'sold'
          self.items[itemIndex].quantity = 0

          // Update listing status to 'sold' to remove from active listings
          const listing = self.listings.find(l => l.itemId === data.itemId)
          if (listing) {
            yield queries.updateListingStatus(listing.id, 'sold')
          }
        }

        // Reload transaction from DB to get proper transactionDate
        const fullTransaction = yield queries.getTransactionById(transaction.id)
        let transactionModel: any

        if (fullTransaction) {
          // Check if transaction already exists in store
          const existingIndex = self.transactions.findIndex(
            t => t.id === transaction.id,
          )
          if (existingIndex >= 0) {
            applySnapshot(self.transactions[existingIndex], fullTransaction)
            transactionModel = self.transactions[existingIndex]
          } else {
            transactionModel = Transaction.create(fullTransaction as any)
            self.transactions.push(transactionModel)
          }
        } else {
          // Fallback: add transaction as-is
          transactionModel = Transaction.create(transaction as any)
          self.transactions.push(transactionModel)
        }

        return transactionModel
      } catch (error: any) {
        self.error = error.message || 'Failed to purchase item'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    listItem: flow(function* (data: {
      title: string
      description?: string
      categoryId: number
      sellerId: number
      price: number
      auctionFlag: number
      startingBid?: number
      bidIncrement?: number
      endTime?: number
      quantity?: number
      imageUrl?: string
    }) {
      self.isLoading = true
      self.error = null
      try {
        const item = yield queries.createItem(data)

        // Verify currentSession exists in database before using it as foreign key
        let validSessionId: number | null = null
        if (self.currentSession?.id) {
          try {
            const dbSession = yield queries.getSessionByDbId(
              self.currentSession.id,
            )
            if (dbSession) {
              validSessionId = self.currentSession.id
            }
          } catch (error) {
            // Session doesn't exist in database, use null
            console.warn(
              'Current session not found in database, using null for listing sessionId',
            )
          }
        }

        // Create listing record
        const listing = yield queries.createListing({
          sessionId: validSessionId,
          userId: data.sellerId,
          itemId: item.id,
          listPrice: data.price,
        })

        // No listing transaction needed - listings are free

        // Add to store
        const itemModel = Item.create(item as any)
        self.items.push(itemModel)

        const listingModel = Listing.create(listing as any)
        self.listings.push(listingModel)

        // Update seller stats in database
        const seller = yield queries.getUserById(data.sellerId)
        if (seller) {
          const newTotalItemsListed = (seller.totalItemsListed || 0) + 1
          yield queries.updateUserSellerStats(data.sellerId, {
            totalItemsListed: newTotalItemsListed,
          })

          // Update seller in store
          const sellerIndex = self.users.findIndex(u => u.id === data.sellerId)
          const updatedSeller = yield queries.getUserById(data.sellerId)
          if (updatedSeller) {
            if (sellerIndex >= 0) {
              self.users[sellerIndex] = updatedSeller as any
            } else {
              self.users.push(updatedSeller as any)
            }
          }
        }

        return itemModel
      } catch (error: any) {
        self.error = error.message || 'Failed to list item'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    updateItem: flow(function* (
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
        imageUrl?: string
      },
    ) {
      self.isLoading = true
      self.error = null
      try {
        const updatedItem = yield queries.updateItem(itemId, data)
        if (!updatedItem) {
          throw new Error('Item not found')
        }

        // Update item in store
        const itemIndex = self.items.findIndex(i => i.id === itemId)
        if (itemIndex >= 0) {
          applySnapshot(self.items[itemIndex], updatedItem)
        }

        return updatedItem
      } catch (error: any) {
        self.error = error.message || 'Failed to update item'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    endListing: flow(function* (itemId: number) {
      self.isLoading = true
      self.error = null
      try {
        const item = self.items.find(i => i.id === itemId)
        if (!item) {
          throw new Error('Item not found')
        }

        // Determine winner: Get the highest bid (winning bid)
        const winningBid = yield queries.getWinningBid(itemId)

        // If there's a winner, check payment method BEFORE updating any status
        // NOTE: Auctions always create successful transactions regardless of transactions_succeed flag
        // The transactions_succeed flag only affects buyNow (direct purchases), not auctions
        if (winningBid && winningBid.userId) {
          console.log(
            `[endListing] Found winning bid for user ${winningBid.userId}, checking payment methods...`,
          )
          // Verify currentSession exists in database before using it as foreign key
          let validSessionId: number | null = null
          if (self.currentSession?.id) {
            try {
              const dbSession = yield queries.getSessionByDbId(
                self.currentSession.id,
              )
              if (dbSession) {
                validSessionId = self.currentSession.id
              }
            } catch (error) {
              console.warn(
                'Current session not found in database, using null for winner transaction sessionId',
              )
            }
          }

          // Auctions always require payment method and create successful transactions
          // Check payment method BEFORE updating item/bid status to prevent partial state
          const winnerPaymentMethods = yield queries.getUserPaymentMethods(
            winningBid.userId,
          )

          // Explicit check: ensure we have valid payment methods array with at least one method
          if (
            !winnerPaymentMethods ||
            !Array.isArray(winnerPaymentMethods) ||
            winnerPaymentMethods.length === 0
          ) {
            console.error(
              `[endListing] Winner ${winningBid.userId} has no payment methods. Payment methods:`,
              winnerPaymentMethods,
            )
            throw new Error('Winner has no payment method on file')
          }

          console.log(
            `[endListing] Winner ${winningBid.userId} has ${winnerPaymentMethods.length} payment method(s)`,
          )

          // Get default payment method (or first if no default)
          let defaultMethod = winnerPaymentMethods.find(
            (pm: any) => pm.isDefault,
          )
          if (!defaultMethod) {
            // If only one method, make it default
            if (winnerPaymentMethods.length === 1) {
              yield queries.setDefaultPaymentMethod(
                winningBid.userId,
                winnerPaymentMethods[0].id,
              )
              defaultMethod = winnerPaymentMethods[0]
              // Update local store
              const pmIndex = self.userPaymentMethods.findIndex(
                (pm: any) => pm.id === winnerPaymentMethods[0].id,
              )
              if (pmIndex >= 0) {
                self.userPaymentMethods[pmIndex].isDefault = true
              }
            } else {
              defaultMethod = winnerPaymentMethods[0]
            }
          }

          // Create transaction for the winning bid with payment method
          // Auctions always create successful transactions (transactions_succeed flag doesn't apply)
          yield queries.createTransaction({
            sessionId: validSessionId,
            transactionType: 'bid_win',
            itemId,
            userId: winningBid.userId,
            sellerId: item.sellerId,
            bidId: winningBid.id,
            amount: winningBid.bidAmount,
            quantity: 1,
            paymentMethod: defaultMethod.type || 'card',
            paymentCardNumber: defaultMethod.cardNumber || '',
          })
        }

        // Only update bid outcomes and item status AFTER payment method validation and transaction creation
        // Update all bid outcomes
        const allBids = yield queries.getBidsByItem(itemId)
        for (const bid of allBids) {
          if (winningBid && bid.id === winningBid.id) {
            // Winner
            yield queries.updateBidOutcome(bid.id, 'won')
          } else {
            // Losers
            yield queries.updateBidOutcome(bid.id, 'lost')
          }
        }

        // Update item status to expired
        const updatedItem = yield queries.updateItem(itemId, {
          status: 'expired',
          expired: true,
        })

        // Update listing status
        const listing = self.listings.find(l => l.itemId === itemId)
        if (listing) {
          yield queries.updateListingStatus(listing.id, 'expired')
        }

        // Reload bids to get updated outcomes
        const updatedBids = yield queries.getBidsByItem(itemId)
        updatedBids.forEach((bid: any) => {
          const bidIndex = self.bids.findIndex(b => b.id === bid.id)
          if (bidIndex >= 0) {
            applySnapshot(self.bids[bidIndex], bid)
          }
        })

        // Update item in store
        const itemIndex = self.items.findIndex(i => i.id === itemId)
        if (itemIndex >= 0 && updatedItem) {
          applySnapshot(self.items[itemIndex], updatedItem)
        }

        return updatedItem
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to end listing'
        console.error('[endListing] Error ending listing:', errorMessage, error)
        self.error = errorMessage
        // Re-throw to ensure UI can catch and display the error
        throw new Error(errorMessage)
      } finally {
        self.isLoading = false
      }
    }),

    restartAuction: flow(function* (itemId: number, endTime?: number) {
      self.isLoading = true
      self.error = null
      try {
        const item = self.items.find(i => i.id === itemId)
        if (!item) {
          throw new Error('Item not found')
        }

        // Calculate new end time if not provided (default to 7 days from now)
        const newEndTime = endTime || Math.floor(Date.now() / 1000) + 7 * 86400

        // Update item status back to active and set new end time
        const updatedItem = yield queries.updateItem(itemId, {
          status: 'active',
          endTime: item.auctionFlag === 1 ? newEndTime : undefined,
          expired: false,
        })

        // Update listing status
        const listing = self.listings.find(l => l.itemId === itemId)
        if (listing) {
          yield queries.updateListingStatus(listing.id, 'active')
        }

        // Update item in store
        const itemIndex = self.items.findIndex(i => i.id === itemId)
        if (itemIndex >= 0 && updatedItem) {
          applySnapshot(self.items[itemIndex], updatedItem)
        }

        return updatedItem
      } catch (error: any) {
        self.error = error.message || 'Failed to restart auction'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    deleteItem: flow(function* (itemId: number) {
      self.isLoading = true
      self.error = null
      try {
        // Update item status to cancelled
        const updatedItem = yield queries.updateItem(itemId, {
          status: 'cancelled',
        })

        // Update listing status
        const listing = self.listings.find(l => l.itemId === itemId)
        if (listing) {
          yield queries.updateListingStatus(listing.id, 'cancelled')
        }

        // Update item in store
        const itemIndex = self.items.findIndex(i => i.id === itemId)
        if (itemIndex >= 0 && updatedItem) {
          applySnapshot(self.items[itemIndex], updatedItem)
        }

        return updatedItem
      } catch (error: any) {
        self.error = error.message || 'Failed to delete item'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    processPayment: flow(function* (data: {
      transactionId: number
      cardNumber: string
      amount: number
      cvv?: string // CVV removed - no longer required
      deterministicSeed?: number
      transactionType?: string // 'purchase' | 'bid_win' | 'refund'
    }) {
      self.isLoading = true
      self.error = null
      try {
        // CVV validation removed - no longer required for payments

        // Get the transaction to check if it's outgoing (purchase/bid_win) or incoming (refund)
        const transaction = self.transactions.find(
          t => t.id === data.transactionId,
        )
        const isOutgoing =
          transaction?.isOutgoing ??
          (data.transactionType
            ? ['purchase', 'bid_win'].includes(data.transactionType)
            : true)
        const isRefund =
          data.transactionType === 'refund' ||
          transaction?.transactionType === 'refund'

        // Check system config for transaction success setting (takes precedence)
        // Read config FRESH from database every time to ensure we get latest value
        let transactionsSucceed = true
        let configSource = 'default'
        let configValue: any = null
        try {
          const config = yield queries.getSystemConfig('transactions_succeed')
          configValue = config?.value

          if (
            config &&
            configValue !== undefined &&
            configValue !== null &&
            configValue !== ''
          ) {
            // Normalize the value - handle string 'true'/'false', boolean, and numeric values
            const normalizedValue = String(configValue).toLowerCase().trim()

            // Explicitly check for false values (most restrictive check)
            if (
              normalizedValue === 'false' ||
              normalizedValue === '0' ||
              configValue === false ||
              configValue === 0
            ) {
              transactionsSucceed = false
              configSource = 'system_config'
              console.log(
                `[processPayment] Config set to FAIL: value="${configValue}" (normalized="${normalizedValue}")`,
              )
            } else {
              // Any other value (including 'true', '1', etc.) means succeed
              transactionsSucceed = true
              configSource = 'system_config'
              console.log(
                `[processPayment] Config set to SUCCEED: value="${configValue}" (normalized="${normalizedValue}")`,
              )
            }
          } else {
            // If no config found in DB, check session flag as fallback
            const sessionTransactionsSucceed =
              self.currentSession?.transactionsSucceed
            if (sessionTransactionsSucceed !== undefined) {
              transactionsSucceed = sessionTransactionsSucceed === 1
              configSource = 'session'
              console.log(
                `[processPayment] Using session flag: transactionsSucceed=${transactionsSucceed}`,
              )
            } else {
              configSource = 'default'
              console.log(
                `[processPayment] No config found in DB or session, defaulting to succeed`,
              )
            }
          }
        } catch (error) {
          // Default to true if error reading config, but log it
          console.error(
            '[processPayment] ERROR reading transaction config, defaulting to succeed:',
            error,
          )
          transactionsSucceed = true
          configSource = 'error_fallback'
        }

        let paymentStatus: 'success' | 'declined' | 'pending' = 'pending'
        let transactionPaymentStatus: 'pending' | 'success' | 'failed' =
          'pending'
        let failureReason: string | undefined

        // Get mock card to check if it should always succeed/fail
        let mockCard: any = null
        try {
          mockCard = yield queries.getMockCardByNumber(data.cardNumber)
        } catch (error) {
          // If card lookup fails, continue without mock card
          console.warn('[processPayment] Failed to lookup mock card:', error)
        }

        // Payment decision logic (in priority order):
        // 1. Refunds always succeed (incoming transactions)
        // 2. Mock card failures override everything (explicit test failures)
        // 3. System config controls outgoing transactions (purchases/bid wins)
        // 4. Default to success for incoming transactions or when config allows

        if (isRefund) {
          // Refunds always succeed (incoming transactions)
          paymentStatus = 'success'
          transactionPaymentStatus = 'success'
          console.log(`[processPayment] Refund transaction - always succeed`)
        } else if (mockCard && mockCard.alwaysSucceeds === 0) {
          // Mock card explicitly set to fail - this overrides config for testing
          paymentStatus = 'declined'
          transactionPaymentStatus = 'failed'
          failureReason = mockCard.failureReason || 'PAYMENT_DECLINED'
          console.log(
            `[processPayment] Mock card failure: ${failureReason} (overrides config)`,
          )
        } else if (isOutgoing && !transactionsSucceed) {
          // Outgoing transactions (purchases/bid wins) fail when config toggle is off
          // This check happens AFTER mock card check, so config can still control behavior
          paymentStatus = 'declined'
          transactionPaymentStatus = 'failed'
          failureReason = 'PAYMENT_DECLINED'
          console.log(
            `[processPayment] Outgoing transaction FAILED due to config (configSource: ${configSource}, transactionsSucceed: ${transactionsSucceed})`,
          )
        } else {
          // Success: either incoming transaction, or outgoing with config allowing success
          paymentStatus = 'success'
          transactionPaymentStatus = 'success'
          console.log(
            `[processPayment] Transaction SUCCEEDED (isOutgoing: ${isOutgoing}, configSource: ${configSource}, transactionsSucceed: ${transactionsSucceed})`,
          )
        }

        // Create payment record
        const payment = yield queries.createPayment({
          transactionId: data.transactionId,
          cardNumber: data.cardNumber,
          cardType: mockCard?.cardType,
          amount: data.amount,
          status: paymentStatus,
          failureReason,
          deterministicSeed: data.deterministicSeed,
        })

        // Update transaction payment status (use 'failed' for transaction, 'declined' for payment)
        yield queries.updateTransactionPaymentStatus(
          data.transactionId,
          transactionPaymentStatus,
          failureReason,
        )

        // Update transaction in store - add if not present
        const updatedTransaction = yield queries.getTransactionById(
          data.transactionId,
        )

        if (updatedTransaction) {
          const existing = self.transactions.find(
            t => t.id === data.transactionId,
          )
          if (existing) {
            applySnapshot(existing, updatedTransaction)
          }
        }

        // Add payment to store
        const paymentModel = Payment.create(payment as any)
        self.payments.push(paymentModel)

        return paymentModel
      } catch (error: any) {
        self.error = error.message || 'Failed to process payment'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    addUserPaymentMethod: flow(function* (data: {
      userId: number
      cardType: string
      cardNumber: string
      expiry: string
      cardHolderName: string
      isDefault?: boolean
    }) {
      self.isLoading = true
      self.error = null
      try {
        const paymentMethod = yield queries.addUserPaymentMethod(data)

        // Update local state
        // If this is the first card or set as default, update others
        if (data.isDefault) {
          self.userPaymentMethods.forEach(pm => {
            if (pm.userId === data.userId) {
              pm.isDefault = false
            }
          })
        } else {
          // If no other cards, make this one default
          const hasCards = self.userPaymentMethods.some(
            pm => pm.userId === data.userId,
          )
          if (!hasCards) {
            // The DB mutation handles this logic too, but we need to reflect it in UI
            // However, the DB mutation returns the inserted record.
            // If the DB logic made it default, the returned record will have isDefault=true
          }
        }

        const paymentMethodModel = UserPaymentMethod.create(
          paymentMethod as any,
        )
        self.userPaymentMethods.push(paymentMethodModel)

        // Reload to ensure consistency (especially for default flags)
        yield self.loadUserPaymentMethods(data.userId)

        return paymentMethodModel
      } catch (error: any) {
        self.error = error.message || 'Failed to add payment method'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    removeUserPaymentMethod: flow(function* (id: number) {
      self.isLoading = true
      self.error = null
      try {
        const pm = self.userPaymentMethods.find(p => p.id === id)
        const userId = pm?.userId

        yield queries.removeUserPaymentMethod(id)

        const index = self.userPaymentMethods.findIndex(pm => pm.id === id)
        if (index >= 0) {
          self.userPaymentMethods.splice(index, 1)
        }

        if (userId) {
          // Reload to ensure consistency (e.g. new default assignment)
          yield self.loadUserPaymentMethods(userId)
        }
      } catch (error: any) {
        self.error = error.message || 'Failed to remove payment method'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    setDefaultPaymentMethod: flow(function* (id: number) {
      self.isLoading = true
      self.error = null
      try {
        const pm = self.userPaymentMethods.find(p => p.id === id)
        if (!pm) return

        yield queries.setDefaultPaymentMethod(pm.userId, id)

        // Update local state
        self.userPaymentMethods.forEach(p => {
          if (p.userId === pm.userId) {
            p.isDefault = false
          }
        })
        pm.isDefault = true

        // Reload to ensure consistency
        yield self.loadUserPaymentMethods(pm.userId)
      } catch (error: any) {
        self.error = error.message || 'Failed to set default payment method'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    cancelPurchase: flow(function* (transactionId: number) {
      self.isLoading = true
      self.error = null
      try {
        // Try to find transaction in store first, if not found, query it
        let transaction = self.transactions.find(t => t.id === transactionId)
        if (!transaction) {
          const transactionData =
            yield queries.getTransactionById(transactionId)
          if (!transactionData) {
            throw new Error('Transaction not found')
          }
          transaction = Transaction.create(transactionData as any)
          self.transactions.push(transaction)
        }

        // Explicitly prevent cancelling refund transactions
        if (transaction.transactionType === 'refund') {
          throw new Error('Refund transactions cannot be cancelled')
        }

        // Check if transaction can be cancelled using the view
        if (!transaction.canCancel) {
          throw new Error('Transaction cannot be cancelled')
        }

        // Additional safety check: Verify no refund transaction already exists for this purchase
        const existingRefund =
          yield queries.getRefundTransactionForPurchase(transactionId)
        if (existingRefund) {
          throw new Error(
            'This purchase has already been refunded. A refund transaction already exists.',
          )
        }

        // Double-check transaction status hasn't changed (race condition protection)
        const freshTransactionData =
          yield queries.getTransactionById(transactionId)
        if (
          !freshTransactionData ||
          freshTransactionData.status === 'refunded' ||
          freshTransactionData.refundAmount > 0 ||
          freshTransactionData.transactionType === 'refund'
        ) {
          throw new Error(
            'Transaction cannot be cancelled. It may have already been refunded.',
          )
        }

        // Issue full refund - update original transaction
        const refundedTransaction = yield queries.refundTransaction(
          transactionId,
          transaction.amount,
        )

        // Verify currentSession exists in database before using it as foreign key
        let validSessionId: number | null = null
        if (self.currentSession?.id) {
          try {
            const dbSession = yield queries.getSessionByDbId(
              self.currentSession.id,
            )
            if (dbSession) {
              validSessionId = self.currentSession.id
            }
          } catch (error) {
            // Session doesn't exist in database, use null
            console.warn(
              'Current session not found in database, using null for refund transaction sessionId',
            )
          }
        }

        // Create a separate refund transaction entry for visibility
        const refundTransaction = yield queries.createTransaction({
          sessionId: validSessionId,
          transactionType: 'refund',
          itemId: transaction.itemId || undefined,
          userId: transaction.userId,
          sellerId: transaction.sellerId || undefined,
          amount: transaction.amount, // Refund amount (positive for refund)
          quantity: transaction.quantity,
          paymentMethod: transaction.paymentMethod || undefined,
          paymentCardNumber: transaction.paymentCardNumber || undefined,
        })

        // Update refund transaction status to completed
        yield queries.updateTransactionStatus(refundTransaction.id, 'completed')

        // Update original transaction in store
        const transactionIndex = self.transactions.findIndex(
          t => t.id === transactionId,
        )
        if (transactionIndex >= 0) {
          self.transactions[transactionIndex] = refundedTransaction as any
        }

        // Add refund transaction to store
        const refundTransactionModel = Transaction.create(
          refundTransaction as any,
        )
        self.transactions.push(refundTransactionModel)

        // Restore item quantity if applicable
        if (transaction.itemId) {
          const itemIndex = self.items.findIndex(
            i => i.id === transaction.itemId,
          )
          if (itemIndex >= 0) {
            const item = self.items[itemIndex]
            // Get current quantity and add transaction quantity back
            const newQuantity = (item.quantity || 0) + transaction.quantity
            // Update item status to active and restore quantity in database
            const updatedItem = yield queries.updateItemStatusAndQuantity(
              transaction.itemId!,
              'active',
              newQuantity,
            )
            if (updatedItem) {
              self.items[itemIndex] = updatedItem as any
            }
          } else {
            // Item not in store, query and update in DB
            const itemData = yield queries.getItemById(transaction.itemId!)
            if (itemData) {
              const newQuantity =
                (itemData.quantity || 0) + transaction.quantity
              yield queries.updateItemStatusAndQuantity(
                transaction.itemId!,
                'active',
                newQuantity,
              )
            }
          }
        }

        return refundedTransaction
      } catch (error: any) {
        self.error = error.message || 'Failed to cancel purchase'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    loadUserTransactions: flow(function* (userId: number) {
      self.isLoading = true
      self.error = null
      try {
        const transactionsData = yield queries.getTransactionsByUser(userId)
        // Update existing or add new transactions
        transactionsData.forEach((t: any) => {
          const existingIndex = self.transactions.findIndex(
            tr => tr.id === t.id,
          )
          if (existingIndex >= 0) {
            self.transactions[existingIndex] = t
          } else {
            self.transactions.push(t)
          }
        })
        return transactionsData
      } catch (error: any) {
        self.error = error.message || 'Failed to load transactions'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    loadUserInventory: flow(function* (userId: number) {
      self.isLoading = true
      self.error = null
      try {
        const inventoryData = yield queries.getInventoryByUser(userId)
        self.inventory.replace(inventoryData as any)
        return inventoryData
      } catch (error: any) {
        self.error = error.message || 'Failed to load inventory'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    addToInventory: flow(function* (data: {
      userId: number
      itemId: number
      transactionId?: number
      quantity?: number
    }) {
      self.isLoading = true
      self.error = null
      try {
        const inventoryItem = yield queries.addToInventory(data)
        const inventoryModel = InventoryItem.create(inventoryItem as any)
        self.inventory.push(inventoryModel)
        return inventoryModel
      } catch (error: any) {
        self.error = error.message || 'Failed to add to inventory'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    loadUserPaymentMethods: flow(function* (userId: number) {
      self.isLoading = true
      self.error = null
      try {
        const paymentMethods = yield queries.getUserPaymentMethods(userId)
        // Replace existing payment methods for this user
        // First remove all existing for this user
        const otherMethods = self.userPaymentMethods.filter(
          pm => pm.userId !== userId,
        )
        self.userPaymentMethods.replace([
          ...otherMethods,
          ...paymentMethods,
        ] as any)
        return paymentMethods
      } catch (error: any) {
        self.error = error.message || 'Failed to load payment methods'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    // System Config helpers
    getSystemConfig: flow(function* (key: string) {
      try {
        const config = yield queries.getSystemConfig(key)
        return config
      } catch (error: any) {
        console.error(`Failed to get system config for key: ${key}`, error)
        return null
      }
    }),

    updateSystemConfig: flow(function* (key: string, value: string) {
      self.isLoading = true
      self.error = null
      try {
        const config = yield queries.updateSystemConfig(key, value)

        // Update current session's transactionsSucceed flag if it exists
        // This ensures the session reflects the config change immediately
        if (key === 'transactions_succeed' && self.currentSession) {
          const transactionsSucceed = value === 'true' ? 1 : 0
          // Update in store directly (sessions are managed in memory)
          const sessionIndex = self.sessions.findIndex(
            s => s.id === self.currentSession!.id,
          )
          if (sessionIndex >= 0) {
            self.sessions[sessionIndex].transactionsSucceed =
              transactionsSucceed
            // Also update currentSession reference
            if (self.currentSession) {
              self.currentSession.transactionsSucceed = transactionsSucceed
            }
          } else {
            // If session not in store, update it directly
            self.currentSession.transactionsSucceed = transactionsSucceed
          }
        }

        return config
      } catch (error: any) {
        self.error = error.message || 'Failed to update system config'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    setSystemConfig: flow(function* (data: {
      key: string
      value: string
      dataType?: string
      category?: string
      description?: string
    }) {
      self.isLoading = true
      self.error = null
      try {
        const config = yield queries.setSystemConfig(data)
        return config
      } catch (error: any) {
        self.error = error.message || 'Failed to set system config'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    clearError() {
      self.error = null
    },

    reset() {
      self.searchQuery = ''
      self.searchCategoryId = null
      self.searchResults.clear()
      self.selectedItem = null
      self.selectedCategory = null
    },

    // Deduplicate sessions array to prevent MST reference errors
    // This should be called after restore/applySnapshot to ensure no duplicate IDs
    deduplicateSessions() {
      const seenIds = new Set<number>()
      const seenSessionIds = new Set<string>()
      const toRemove: number[] = []
      const currentSessionId = self.currentSession?.id

      // Find duplicates by id (MST identifier)
      self.sessions.forEach((session, index) => {
        if (seenIds.has(session.id)) {
          // Duplicate by id - mark for removal
          toRemove.push(index)
        } else {
          seenIds.add(session.id)
        }
      })

      // Also check for duplicates by sessionId (keep the first one)
      self.sessions.forEach((session, index) => {
        if (seenSessionIds.has(session.sessionId)) {
          // Duplicate by sessionId - mark for removal if not already marked
          if (!toRemove.includes(index)) {
            toRemove.push(index)
          }
        } else {
          seenSessionIds.add(session.sessionId)
        }
      })

      // Check if currentSession is being removed
      const isCurrentSessionRemoved =
        currentSessionId !== undefined &&
        toRemove.some(index => self.sessions[index]?.id === currentSessionId)

      // Remove duplicates in reverse order to maintain indices
      toRemove
        .sort((a, b) => b - a)
        .forEach(index => {
          self.sessions.splice(index, 1)
        })

      // Clear currentSession if it was removed
      if (isCurrentSessionRemoved) {
        self.currentSession = null
      }
    },
    clearDataLoaded() {
      self.dataLoaded = false
    },

    /**
     * Restore MST references after a database restore.
     *
     * Called by the deeplink handler's `set` action after loadAllData()
     * repopulates the store arrays.  Re-resolves selectedItem /
     * selectedCategory so they point to items that actually exist in
     * the restored data, preventing "Failed to resolve reference" crashes.
     */
    restoreReferences(snapshot: any) {
      // Clear references first to avoid dangling pointers
      self.selectedItem = null
      self.selectedCategory = null

      // Re-resolve from snapshot if possible
      if (snapshot?.selectedItem?.id) {
        const item = self.items.find(i => i.id === snapshot.selectedItem.id)
        if (item) self.selectedItem = item
      }
      if (snapshot?.selectedCategory?.id) {
        const cat = self.categories.find(
          c => c.id === snapshot.selectedCategory.id,
        )
        if (cat) self.selectedCategory = cat
      }
    },
  }))

export type AuctionStoreInstance = Instance<typeof AuctionStore>
export type AuctionStoreSnapshot = SnapshotOut<typeof AuctionStore>
export type AuctionStoreSnapshotIn = SnapshotIn<typeof AuctionStore>
