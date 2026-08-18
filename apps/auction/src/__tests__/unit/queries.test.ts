import { queries } from '@/db/queries'
import { createTestData, TEST_USER_IDS, TEST_CATEGORY_IDS } from '../helpers'

describe('Auction Queries', () => {
  beforeEach(async () => {
    await createTestData()
  })

  // Database Initialization
  describe('isDatabaseInitialized', () => {
    it('should return true when database is initialized', async () => {
      const result = await queries.isDatabaseInitialized()
      expect(result).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const originalFn = queries.isDatabaseInitialized
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Database error'))
      queries.isDatabaseInitialized = mockFn as any

      await expect(queries.isDatabaseInitialized()).rejects.toThrow()

      // Restore original
      queries.isDatabaseInitialized = originalFn
    })

    it('should return false when database is not initialized', async () => {
      const { db } = require('@/db/index')
      jest.spyOn(db, 'select').mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValueOnce([{ count: 5 }]),
          }),
        }),
      })

      const result = await queries.isDatabaseInitialized()
      expect(result).toBe(false)
    })
  })

  describe('Category Queries', () => {
    it('should get all categories', async () => {
      const categories = await queries.getAllCategories()
      expect(categories).toBeDefined()
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should get category by id', async () => {
      const category = await queries.getCategoryById(
        TEST_CATEGORY_IDS.ELECTRONICS,
      )
      expect(category).toBeDefined()
      expect(category?.id).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
      expect(category?.code).toBe('electronics')
    })

    it('should return null for non-existent category', async () => {
      const category = await queries.getCategoryById(999)
      expect(category).toBeNull()
    })

    it('should get category by code', async () => {
      const category = await queries.getCategoryByCode('electronics')
      expect(category).toBeDefined()
      expect(category?.code).toBe('electronics')
    })

    it('should return null for non-existent category code', async () => {
      const category = await queries.getCategoryByCode('nonexistent')
      expect(category).toBeNull()
    })
  })

  // Users
  describe('User Queries', () => {
    it('should get user by id', async () => {
      const user = await queries.getUserById(TEST_USER_IDS.SELLER)
      expect(user).toBeDefined()
      expect(user?.id).toBe(TEST_USER_IDS.SELLER)
      expect(user?.username).toBe('seller1')
    })

    it('should return null for non-existent user', async () => {
      const user = await queries.getUserById(999)
      expect(user).toBeNull()
    })

    it('should get user by username', async () => {
      const user = await queries.getUserByUsername('seller1')
      expect(user).toBeDefined()
      expect(user?.username).toBe('seller1')
    })

    it('should return null for non-existent username', async () => {
      const user = await queries.getUserByUsername('nonexistent')
      expect(user).toBeNull()
    })

    it('should get all users', async () => {
      const users = await queries.getAllUsers()
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThan(0)
    })

    it('should get sellers only', async () => {
      const sellers = await queries.getSellers()
      expect(sellers).toBeDefined()
      expect(Array.isArray(sellers)).toBe(true)
      sellers.forEach((seller: any) => {
        expect(seller.sellerRating > 0 || seller.totalItemsListed > 0).toBe(
          true,
        )
      })
    })
  })

  // Items (F3, F4)
  describe('Item Queries', () => {
    let testItemId: number

    beforeEach(async () => {
      // Create a test item
      const item = await queries.createItem({
        title: 'Test Item',
        description: 'Test Description',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id
    })

    it('should get all items', async () => {
      const items = await queries.getAllItems()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should get item by id', async () => {
      const item = await queries.getItemById(testItemId)
      expect(item).toBeDefined()
      expect(item?.id).toBe(testItemId)
      expect(item?.title).toBe('Test Item')
    })

    it('should return null for non-existent item', async () => {
      const item = await queries.getItemById(999)
      expect(item).toBeNull()
    })

    it('should get items by category', async () => {
      const items = await queries.getItemsByCategory(
        TEST_CATEGORY_IDS.ELECTRONICS,
      )
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.categoryId).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
        expect(item.status).toBe('active')
      })
    })

    it('should get items by seller', async () => {
      const items = await queries.getItemsBySeller(TEST_USER_IDS.SELLER)
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.sellerId).toBe(TEST_USER_IDS.SELLER)
      })
    })

    it('should get active items only', async () => {
      const items = await queries.getActiveItems()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.status).toBe('active')
      })
    })

    it('should get auction items only', async () => {
      // Create an auction item
      const endTime = Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
      await queries.createItem({
        title: 'Auction Item',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 50.0,
        auctionFlag: 1,
        startingBid: 25.0,
        currentBid: 30.0,
        endTime,
        quantity: 1,
      })

      const items = await queries.getAuctionItems()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.auctionFlag).toBe(1)
        expect(item.status).toBe('active')
        expect(item.endTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
      })
    })

    it('should get buy-now items only', async () => {
      const items = await queries.getBuyNowItems()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.auctionFlag).toBe(0)
        expect(item.status).toBe('active')
      })
    })

    // F3: Search Items
    describe('searchItems (F3)', () => {
      beforeEach(async () => {
        // Create multiple test items
        await queries.createItem({
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone with advanced features',
          categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
          sellerId: TEST_USER_IDS.SELLER,
          price: 999.99,
          auctionFlag: 0,
          quantity: 1,
        })

        await queries.createItem({
          title: 'Programming Book',
          description: 'Learn TypeScript programming',
          categoryId: TEST_CATEGORY_IDS.BOOKS,
          sellerId: TEST_USER_IDS.SELLER,
          price: 29.99,
          auctionFlag: 0,
          quantity: 1,
        })
      })

      it('should search by keyword in title', async () => {
        const results = await queries.searchItems({ keyword: 'iPhone' })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(item.title.toLowerCase()).toContain('iphone')
        })
      })

      it('should search by keyword in description', async () => {
        const results = await queries.searchItems({ keyword: 'TypeScript' })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(
            item.title.toLowerCase().includes('typescript') ||
              (item.description &&
                item.description.toLowerCase().includes('typescript')),
          ).toBe(true)
        })
      })

      it('should filter by category', async () => {
        const results = await queries.searchItems({
          categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(item.categoryId).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
        })
      })

      it('should filter by seller', async () => {
        const results = await queries.searchItems({
          sellerId: TEST_USER_IDS.SELLER,
        })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(item.sellerId).toBe(TEST_USER_IDS.SELLER)
        })
      })

      it('should filter by auction flag', async () => {
        const results = await queries.searchItems({ auctionFlag: 0 })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(item.auctionFlag).toBe(0)
        })
      })

      it('should combine multiple filters', async () => {
        const results = await queries.searchItems({
          keyword: 'iPhone',
          categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
          auctionFlag: 0,
        })
        expect(results.length).toBeGreaterThan(0)
        results.forEach(item => {
          expect(item.title.toLowerCase()).toContain('iphone')
          expect(item.categoryId).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
          expect(item.auctionFlag).toBe(0)
        })
      })

      it('should limit results', async () => {
        const results = await queries.searchItems({ limit: 1 })
        expect(results.length).toBeLessThanOrEqual(1)
      })

      it('should return empty array for no matches', async () => {
        const results = await queries.searchItems({
          keyword: 'nonexistentxyz123',
        })
        expect(results).toEqual([])
      })
    })

    // F4: Item Detail View
    describe('getItemDetail (F4)', () => {
      it('should get item with seller and category info', async () => {
        const itemDetail = await queries.getItemDetail(testItemId)
        expect(itemDetail).toBeDefined()
        expect(itemDetail?.id).toBe(testItemId)
        expect(itemDetail?.seller).toBeDefined()
        expect(itemDetail?.seller?.id).toBe(TEST_USER_IDS.SELLER)
        expect(itemDetail?.category).toBeDefined()
        expect(itemDetail?.category?.id).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
      })

      it('should return null for non-existent item', async () => {
        const itemDetail = await queries.getItemDetail(999)
        expect(itemDetail).toBeNull()
      })
    })
  })

  describe('Session Queries (F2)', () => {
    let testSessionId: string

    beforeEach(async () => {
      const session = await queries.createSession({
        sessionId: `test_session_${Date.now()}`,
        userId: TEST_USER_IDS.BUYER,
        seed: 42,
        metadata: JSON.stringify({ test: true }),
      })
      testSessionId = session.sessionId
    })

    it('should create session successfully', async () => {
      const session = await queries.createSession({
        sessionId: `new_session_${Date.now()}`,
        userId: TEST_USER_IDS.BUYER,
        seed: 123,
      })
      expect(session).toBeDefined()
      expect(session.sessionId).toBeDefined()
      expect(session.seed).toBe(123)
      expect(session.status).toBe('active')
    })

    it('should get session by sessionId', async () => {
      const session = await queries.getSessionById(testSessionId)
      expect(session).toBeDefined()
      expect(session?.sessionId).toBe(testSessionId)
    })

    it('should return null for non-existent session', async () => {
      const session = await queries.getSessionById('nonexistent')
      expect(session).toBeNull()
    })

    it('should get sessions by user id', async () => {
      const sessions = await queries.getSessionsByUserId(TEST_USER_IDS.BUYER)
      expect(sessions).toBeDefined()
      expect(Array.isArray(sessions)).toBe(true)
      sessions.forEach(session => {
        expect(session.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should end session', async () => {
      const endedSession = await queries.endSession(testSessionId)
      expect(endedSession).toBeDefined()
      expect(endedSession?.status).toBe('ended')
      expect(endedSession?.endedAt).toBeDefined()
    })

    it('should handle ending non-existent session gracefully', async () => {
      const endedSession = await queries.endSession('nonexistent')
      expect(endedSession).toBeNull()
    })
  })

  describe('Bid Queries (F5)', () => {
    let testItemId: number
    let testBidId: number

    beforeEach(async () => {
      // Create auction item
      const endTime = Math.floor(Date.now() / 1000) + 86400
      const item = await queries.createItem({
        title: 'Auction Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        currentBid: 60.0,
        endTime,
        quantity: 1,
      })
      testItemId = item.id

      // Create bid
      const bid = await queries.createBid({
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 70.0,
      })
      testBidId = bid.id
    })

    it('should get bids by item', async () => {
      const bids = await queries.getBidsByItem(testItemId)
      expect(bids).toBeDefined()
      expect(Array.isArray(bids)).toBe(true)
      bids.forEach(bid => {
        expect(bid.itemId).toBe(testItemId)
      })
    })

    it('should get bids by user', async () => {
      const bids = await queries.getBidsByUser(TEST_USER_IDS.BUYER)
      expect(bids).toBeDefined()
      expect(Array.isArray(bids)).toBe(true)
      bids.forEach(bid => {
        expect(bid.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should get bid by id', async () => {
      const bid = await queries.getBidById(testBidId)
      expect(bid).toBeDefined()
      expect(bid?.id).toBe(testBidId)
      expect(bid?.itemId).toBe(testItemId)
    })

    it('should return null for non-existent bid', async () => {
      const bid = await queries.getBidById(999)
      expect(bid).toBeNull()
    })

    it('should get winning bid', async () => {
      const winningBid = await queries.getWinningBid(testItemId)
      expect(winningBid).toBeDefined()
      expect(winningBid?.isWinning).toBe(true)
      expect(winningBid?.itemId).toBe(testItemId)
    })

    it('should return null when no winning bid exists', async () => {
      // Create item without bids
      const item = await queries.createItem({
        title: 'New Auction Item',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 50.0,
        auctionFlag: 1,
        startingBid: 25.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })
      const winningBid = await queries.getWinningBid(item.id)
      expect(winningBid).toBeNull()
    })
  })

  describe('Transaction Queries (F8)', () => {
    let testTransactionId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })
      testTransactionId = transaction.id
    })

    it('should get transactions by user', async () => {
      const transactions = await queries.getTransactionsByUser(
        TEST_USER_IDS.BUYER,
      )
      expect(transactions).toBeDefined()
      expect(Array.isArray(transactions)).toBe(true)
      transactions.forEach(t => {
        expect(t.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should get transaction by id', async () => {
      const transaction = await queries.getTransactionById(testTransactionId)
      expect(transaction).toBeDefined()
      expect(transaction?.id).toBe(testTransactionId)
    })

    it('should return null for non-existent transaction', async () => {
      const transaction = await queries.getTransactionById(999)
      expect(transaction).toBeNull()
    })

    it('should get purchases by user', async () => {
      const purchases = await queries.getPurchasesByUser(TEST_USER_IDS.BUYER)
      expect(purchases).toBeDefined()
      expect(Array.isArray(purchases)).toBe(true)
      purchases.forEach(p => {
        expect(['purchase', 'bid_win']).toContain(p.transactionType)
        expect(p.status).toBe('completed')
      })
    })

    it('should get sales by user', async () => {
      // Create a sale transaction
      const item = await queries.createItem({
        title: 'Sale Item',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 49.99,
        auctionFlag: 0,
        quantity: 1,
      })

      const transaction = await queries.createTransaction({
        transactionType: 'sale',
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 49.99,
        quantity: 1,
      })

      await queries.updateTransactionStatus(transaction.id, 'completed')

      const sales = await queries.getSalesByUser(TEST_USER_IDS.SELLER)
      expect(sales).toBeDefined()
      expect(Array.isArray(sales)).toBe(true)
      sales.forEach(s => {
        expect(s.transactionType).toBe('sale')
        expect(s.sellerId).toBe(TEST_USER_IDS.SELLER)
        expect(s.status).toBe('completed')
      })
    })
  })

  describe('Payment Queries (F9)', () => {
    let testTransactionId: number
    let testPaymentId: number

    beforeEach(async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })
      testTransactionId = transaction.id

      const payment = await queries.createPayment({
        transactionId: testTransactionId,
        cardNumber: '4242424242424242',
        cardType: 'visa',
        amount: 99.99,
        status: 'success',
      })
      testPaymentId = payment.id
    })

    it('should get payment by id', async () => {
      const payment = await queries.getPaymentById(testPaymentId)
      expect(payment).toBeDefined()
      expect(payment?.id).toBe(testPaymentId)
      expect(payment?.transactionId).toBe(testTransactionId)
    })

    it('should return null for non-existent payment', async () => {
      const payment = await queries.getPaymentById(999)
      expect(payment).toBeNull()
    })

    it('should get payments by transaction', async () => {
      const payments = await queries.getPaymentsByTransaction(testTransactionId)
      expect(payments).toBeDefined()
      expect(Array.isArray(payments)).toBe(true)
      payments.forEach(p => {
        expect(p.transactionId).toBe(testTransactionId)
      })
    })

    it('should get mock card by number', async () => {
      const card = await queries.getMockCardByNumber('4242424242424242')
      expect(card).toBeDefined()
      expect(card?.cardNumber).toBe('4242424242424242')
    })

    it('should return null for non-existent card', async () => {
      const card = await queries.getMockCardByNumber('9999999999999999')
      expect(card).toBeNull()
    })

    it('should get all mock cards', async () => {
      const cards = await queries.getAllMockCards()
      expect(cards).toBeDefined()
      expect(Array.isArray(cards)).toBe(true)
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('Inventory Queries (F8)', () => {
    let testItemId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Inventory Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id

      await queries.addToInventory({
        userId: TEST_USER_IDS.BUYER,
        itemId: testItemId,
        quantity: 1,
      })
    })

    it('should get inventory by user', async () => {
      const inventory = await queries.getInventoryByUser(TEST_USER_IDS.BUYER)
      expect(inventory).toBeDefined()
      expect(Array.isArray(inventory)).toBe(true)
      inventory.forEach(inv => {
        expect(inv.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should get inventory by item', async () => {
      const inventory = await queries.getInventoryByItem(testItemId)
      expect(inventory).toBeDefined()
      expect(Array.isArray(inventory)).toBe(true)
      inventory.forEach(inv => {
        expect(inv.itemId).toBe(testItemId)
      })
    })

    it('should get specific inventory item', async () => {
      const inventory = await queries.getInventoryItem(
        TEST_USER_IDS.BUYER,
        testItemId,
      )
      expect(inventory).toBeDefined()
      expect(inventory?.userId).toBe(TEST_USER_IDS.BUYER)
      expect(inventory?.itemId).toBe(testItemId)
    })

    it('should return null for non-existent inventory item', async () => {
      const inventory = await queries.getInventoryItem(999, 999)
      expect(inventory).toBeNull()
    })
  })

  describe('Listing Queries (F7)', () => {
    let testItemId: number
    let testListingId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Listed Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id

      const listing = await queries.createListing({
        userId: TEST_USER_IDS.SELLER,
        itemId: testItemId,
        listPrice: 99.99,
      })
      testListingId = listing.id
    })

    it('should get listings by user', async () => {
      const listings = await queries.getListingsByUser(TEST_USER_IDS.SELLER)
      expect(listings).toBeDefined()
      expect(Array.isArray(listings)).toBe(true)
      listings.forEach(listing => {
        expect(listing.userId).toBe(TEST_USER_IDS.SELLER)
      })
    })

    it('should get listing by id', async () => {
      const listing = await queries.getListingById(testListingId)
      expect(listing).toBeDefined()
      expect(listing?.id).toBe(testListingId)
      expect(listing?.itemId).toBe(testItemId)
    })

    it('should return null for non-existent listing', async () => {
      const listing = await queries.getListingById(999)
      expect(listing).toBeNull()
    })

    it('should get active listings only', async () => {
      const listings = await queries.getActiveListings()
      expect(listings).toBeDefined()
      expect(Array.isArray(listings)).toBe(true)
      listings.forEach(listing => {
        expect(listing.status).toBe('active')
      })
    })
  })
})
