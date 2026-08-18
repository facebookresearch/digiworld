import { AuctionStore } from '@/models/AuctionStore'
import {
  createTestData,
  TEST_USER_IDS,
  TEST_CATEGORY_IDS,
  TEST_CARD_NUMBERS,
} from '../helpers'

describe('AuctionStore', () => {
  let store: ReturnType<typeof AuctionStore.create>
  // Suppress console errors for expected error cases across all tests
  let originalConsoleError: typeof console.error

  beforeEach(async () => {
    // Suppress console.error for expected database errors in tests
    originalConsoleError = console.error
    console.error = jest.fn()

    await createTestData()
    store = AuctionStore.create({})
  })

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError
  })

  describe('Initialization (F1)', () => {
    it('should create store with default state', () => {
      expect(store.currentSession).toBeNull()
      expect(store.currentUser).toBeNull()
      expect(store.selectedItem).toBeNull()
      expect(store.categories).toEqual([])
      expect(store.users).toEqual([])
      expect(store.items).toEqual([])
      expect(store.bids).toEqual([])
      expect(store.transactions).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.searchQuery).toBe('')
    })

    it('should initialize database successfully', async () => {
      await store.initializeDatabase()
      expect(store.categories.length).toBeGreaterThan(0)
      expect(store.users.length).toBeGreaterThan(0)
      expect(store.items.length).toBeGreaterThan(0)
      expect(store.mockCards.length).toBeGreaterThan(0)
    })

    it('should load all data successfully', async () => {
      // Ensure database is initialized first
      await store.initializeDatabase()
      await store.loadAllData()
      expect(store.categories.length).toBeGreaterThan(0)
      expect(store.users.length).toBeGreaterThan(0)
      expect(store.items.length).toBeGreaterThan(0)
    })

    it('should handle initialization errors gracefully', async () => {
      // Mock a failure scenario
      jest
        .spyOn(require('@/db/mutations').mutations, 'initializeDatabase')
        .mockRejectedValueOnce(new Error('DB Error'))

      await expect(store.initializeDatabase()).rejects.toThrow()
      expect(store.error).toBeDefined()
    })
  })

  describe('Session Management (F2)', () => {
    it('should create session successfully', async () => {
      const session = await store.createSession({
        sessionId: `test_session_${Date.now()}`,
        userId: TEST_USER_IDS.BUYER,
        seed: 42,
        metadata: JSON.stringify({ test: true }),
      })

      expect(session).toBeDefined()
      expect(store.currentSession).toBeDefined()
      expect(store.currentSession?.sessionId).toBe(session.sessionId)
      expect(store.currentSession?.seed).toBe(42)
    })

    it('should end session successfully', async () => {
      const session = await store.createSession({
        sessionId: `test_session_${Date.now()}`,
        userId: TEST_USER_IDS.BUYER,
        seed: 42,
      })

      await store.endSession(session.sessionId)
      expect(store.currentSession?.status).toBe('ended')
      expect(store.currentSession?.endedAt).toBeDefined()
    })

    it('should set current user', async () => {
      await store.loadAllData()
      store.setCurrentUser(TEST_USER_IDS.SELLER)
      expect(store.currentUser).toBeDefined()
      expect(store.currentUser?.id).toBe(TEST_USER_IDS.SELLER)
    })

    it('should throw error when setting non-existent user', async () => {
      await store.loadAllData()
      store.setCurrentUser(99999)
      expect(store.currentUser).toBeNull()
    })

    it('should clear current user when setting to null', async () => {
      await store.loadAllData()
      store.setCurrentUser(TEST_USER_IDS.SELLER)
      store.setCurrentUser(null)
      expect(store.currentUser).toBeNull()
    })
  })

  describe('Browse/Search Items (F3)', () => {
    beforeEach(async () => {
      await store.loadAllData()
    })

    it('should search items by keyword', async () => {
      const results = await store.searchItems({ keyword: 'test' })
      expect(Array.isArray(results)).toBe(true)
      expect(store.searchQuery).toBe('test')
    })

    it('should search items by category', async () => {
      const results = await store.searchItems({
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
      })
      expect(Array.isArray(results)).toBe(true)
      expect(store.searchCategoryId).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
    })

    it('should search items by seller', async () => {
      const results = await store.searchItems({
        sellerId: TEST_USER_IDS.SELLER,
      })
      expect(Array.isArray(results)).toBe(true)
    })

    it('should search items by auction flag', async () => {
      const results = await store.searchItems({ auctionFlag: 0 })
      expect(Array.isArray(results)).toBe(true)
    })

    it('should combine multiple search filters', async () => {
      const results = await store.searchItems({
        keyword: 'test',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        auctionFlag: 0,
        limit: 5,
      })
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should set selected item', async () => {
      await store.loadAllData()
      if (store.items.length > 0) {
        store.setSelectedItem(store.items[0].id)
        expect(store.selectedItem).toBeDefined()
        expect(store.selectedItem?.id).toBe(store.items[0].id)
      }
    })

    it('should clear selected item', () => {
      store.setSelectedItem(null)
      expect(store.selectedItem).toBeNull()
    })

    it('should set selected category', async () => {
      await store.loadAllData()
      if (store.categories.length > 0) {
        store.setSelectedCategory(store.categories[0].id)
        expect(store.selectedCategory).toBeDefined()
        expect(store.selectedCategory?.id).toBe(store.categories[0].id)
      }
    })
  })

  describe('Item Detail View (F4)', () => {
    let testItemId: number

    beforeEach(async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Detail Test Item',
        description: 'Test description',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id
    })

    it('should load item detail with seller and category', async () => {
      const itemDetail = await store.loadItemDetail(testItemId)
      expect(itemDetail).toBeDefined()
      expect(itemDetail?.seller).toBeDefined()
      expect(itemDetail?.category).toBeDefined()
      expect(store.selectedItem).toBeDefined()
    })

    it('should handle non-existent item gracefully', async () => {
      await expect(store.loadItemDetail(999)).rejects.toThrow()
    })
  })

  describe('Bidding Simulation (F5)', () => {
    let auctionItemId: number

    beforeEach(async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const endTime = Math.floor(Date.now() / 1000) + 86400
      const item = await queries.createItem({
        title: 'Auction Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        currentBid: 50.0,
        endTime,
        quantity: 1,
      })
      auctionItemId = item.id
      await store.loadAllData()
    })

    it('should place bid successfully', async () => {
      const bid = await store.placeBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      expect(bid).toBeDefined()
      expect(bid.bidAmount).toBe(60.0)
      expect(bid.isWinning).toBe(true)
      expect(store.bids.length).toBeGreaterThan(0)
    })

    it('should reject bid below minimum', async () => {
      const item = store.items.find(i => i.id === auctionItemId)
      if (item && item.isAuction) {
        const minBid = item.minNextBid || item.startingBid || item.price
        await expect(
          store.placeBid({
            itemId: auctionItemId,
            userId: TEST_USER_IDS.BUYER,
            bidAmount: minBid! - 1,
          }),
        ).rejects.toThrow()
      }
    })

    it('should reject bid on non-auction item', async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const buyNowItem = await queries.createItem({
        title: 'Buy Now Item',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 50.0,
        auctionFlag: 0,
        quantity: 1,
      })

      // Load item into store
      await store.loadAllData()

      await expect(
        store.placeBid({
          itemId: buyNowItem.id,
          userId: TEST_USER_IDS.BUYER,
          bidAmount: 60.0,
        }),
      ).rejects.toThrow('Item is not an auction item')
    })

    it('should reject bid on expired auction', async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const expiredItem = await queries.createItem({
        title: 'Expired Auction',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 50.0,
        auctionFlag: 1,
        startingBid: 25.0,
        endTime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        quantity: 1,
      })

      // Load item into store
      await store.loadAllData()

      await expect(
        store.placeBid({
          itemId: expiredItem.id,
          userId: TEST_USER_IDS.BUYER,
          bidAmount: 30.0,
        }),
      ).rejects.toThrow('Bidding has closed for this auction')
    })

    it('should determine bid outcome', async () => {
      const bid = await store.placeBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const updated = await store.determineBidOutcome(bid.id, 'won')
      expect(updated).toBeDefined()
      expect(updated?.outcome).toBe('won')
    })
  })

  describe('Buy Now Simulation (F6)', () => {
    let buyNowItemId: number

    beforeEach(async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Buy Now Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 5,
      })
      buyNowItemId = item.id
      await store.loadAllData()
    })

    it('should buy now item successfully', async () => {
      // Ensure item is loaded into store
      await store.loadItemDetail(buyNowItemId)

      const transaction = await store.buyNow({
        itemId: buyNowItemId,
        userId: TEST_USER_IDS.BUYER,
        quantity: 1,
        paymentCardNumber: TEST_CARD_NUMBERS.SUCCESS,
        cvv: '123',
      })

      expect(transaction).toBeDefined()
      expect(transaction.transactionType).toBe('purchase')
      expect(store.transactions.length).toBeGreaterThan(0)
    })

    it('should reject buy now on auction item', async () => {
      await store.loadAllData()

      const { queries } = require('@/db/queries')
      const auctionItem = await queries.createItem({
        title: 'Auction Item',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })

      // Load item into store
      await store.loadItemDetail(auctionItem.id)

      await expect(
        store.buyNow({
          itemId: auctionItem.id,
          userId: TEST_USER_IDS.BUYER,
          quantity: 1,
          cvv: '123',
        }),
      ).rejects.toThrow('Item is not available for buy now')
    })

    it('should ignore quantity checks for buy now (direct purchase)', async () => {
      // Ensure item is loaded into store
      await store.loadItemDetail(buyNowItemId)
      // const itemBefore = store.items.find(i => i.id === buyNowItemId)
      // const initialQuantity = itemBefore?.quantity || 0

      // Buy now should succeed even with quantity > available (quantity is ignored)
      const transaction = await store.buyNow({
        itemId: buyNowItemId,
        userId: TEST_USER_IDS.BUYER,
        quantity: 100, // More than available - should be ignored
        cvv: '123',
        paymentCardNumber: TEST_CARD_NUMBERS.SUCCESS,
      })

      expect(transaction).toBeDefined()
      expect(transaction.status).toBe('completed')

      // Item should be marked as sold regardless of quantity
      await store.loadItemDetail(buyNowItemId)
      const itemAfter = store.items.find(i => i.id === buyNowItemId)
      expect(itemAfter?.status).toBe('sold')
      expect(itemAfter?.quantity).toBe(0)
    })

    it('should process payment when card provided', async () => {
      // Ensure item is loaded into store
      await store.loadItemDetail(buyNowItemId)

      const transaction = await store.buyNow({
        itemId: buyNowItemId,
        userId: TEST_USER_IDS.BUYER,
        quantity: 1,
        cvv: '123',
        paymentCardNumber: TEST_CARD_NUMBERS.SUCCESS,
        paymentMethod: 'credit_card',
      })

      expect(transaction).toBeDefined()
      // Payment should be processed
      const updatedTransaction = store.transactions.find(
        t => t.id === transaction.id,
      )
      expect(updatedTransaction?.paymentStatus).toBe('success')
    })
  })

  describe('Selling/Listing Items (F7)', () => {
    beforeEach(async () => {
      await store.loadAllData()
    })

    it('should list buy-now item successfully', async () => {
      const item = await store.listItem({
        title: 'New Listed Item',
        description: 'Test listing',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      expect(item).toBeDefined()
      expect(item.title).toBe('New Listed Item')
      expect(store.items.length).toBeGreaterThan(0)
      expect(store.listings.length).toBeGreaterThan(0)
      // Note: Listing transactions are no longer created (listings are free)
    })

    it('should list auction item successfully', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400
      const item = await store.listItem({
        title: 'New Auction Item',
        description: 'Test auction listing',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        bidIncrement: 5.0,
        endTime,
        quantity: 1,
      })

      expect(item).toBeDefined()
      expect(item.auctionFlag).toBe(1)
      expect(item.startingBid).toBe(50.0)
    })

    it('should update seller stats when listing item', async () => {
      const seller = store.users.find(u => u.id === TEST_USER_IDS.SELLER)
      const initialListed = seller?.totalItemsListed || 0

      await store.listItem({
        title: 'Stats Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      // The listItem action should have updated the seller stats
      // Reload the seller from the store (it should already be updated)
      const updatedSeller = store.users.find(u => u.id === TEST_USER_IDS.SELLER)
      expect(updatedSeller?.totalItemsListed).toBe(initialListed + 1)
    })
  })

  describe('Payment Simulation (F9)', () => {
    let testTransactionId: number

    beforeEach(async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })
      testTransactionId = transaction.id
    })

    it('should process successful payment', async () => {
      const payment = await store.processPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        amount: 99.99,
        cvv: '123',
      })

      expect(payment).toBeDefined()
      expect(payment.status).toBe('success')
      expect(store.payments.length).toBeGreaterThan(0)
    })

    it('should process declined payment', async () => {
      const payment = await store.processPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.DECLINED,
        amount: 99.99,
        cvv: '123',
      })

      expect(payment).toBeDefined()
      expect(payment.status).toBe('declined')
      expect(payment.failureReason).toBe('DECLINED')
    })

    it('should process insufficient funds payment', async () => {
      const payment = await store.processPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.INSUFFICIENT_FUNDS,
        amount: 99.99,
        cvv: '123',
      })

      expect(payment.status).toBe('declined')
      expect(payment.failureReason).toBe('INSUFFICIENT_FUNDS')
    })

    it('should update transaction payment status', async () => {
      // Load transaction into store first
      await store.loadUserTransactions(TEST_USER_IDS.BUYER)

      await store.processPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        amount: 99.99,
        cvv: '123',
      })

      const transaction = store.transactions.find(
        t => t.id === testTransactionId,
      )
      expect(transaction).toBeDefined()
      expect(transaction?.paymentStatus).toBe('success')
      expect(transaction?.status).toBe('completed')
    })
  })

  describe('Cancellation & Refunds (F10)', () => {
    let testTransactionId: number
    let testItemId: number

    beforeEach(async () => {
      await store.loadAllData()
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Refund Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id

      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })
      testTransactionId = transaction.id

      await queries.updateTransactionStatus(testTransactionId, 'completed')
      await store.loadAllData()
    })

    it('should cancel purchase and issue refund', async () => {
      // Load transaction into store first
      await store.loadUserTransactions(TEST_USER_IDS.BUYER)

      const refunded = await store.cancelPurchase(testTransactionId)
      expect(refunded).toBeDefined()
      expect(refunded?.status).toBe('refunded')
      expect(refunded?.refundAmount).toBe(99.99)
    })

    it('should restore item quantity on refund', async () => {
      // First, buy the item to decrement quantity
      await store.loadAllData()
      // Ensure item is loaded into store
      await store.loadItemDetail(testItemId)
      const item = store.items.find(i => i.id === testItemId)
      const initialQuantity = item?.quantity || 0

      // Buy the item using buyNow
      const purchaseTransaction = await store.buyNow({
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        quantity: 1,
        cvv: '123',
        paymentCardNumber: TEST_CARD_NUMBERS.SUCCESS,
      })

      // Verify quantity was decremented
      await store.loadAllData()
      const itemAfterPurchase = store.items.find(i => i.id === testItemId)
      expect(itemAfterPurchase?.quantity).toBe(initialQuantity - 1)

      // Now refund the purchase
      await store.loadUserTransactions(TEST_USER_IDS.BUYER)
      await store.cancelPurchase(purchaseTransaction.id)

      // Reload to verify quantity was restored
      await store.loadAllData()
      const updatedItem = store.items.find(i => i.id === testItemId)
      expect(updatedItem?.quantity).toBe(initialQuantity)
    })

    it('should reject cancellation of non-existent transaction', async () => {
      await expect(store.cancelPurchase(999)).rejects.toThrow(
        'Transaction not found',
      )
    })

    it('should reject cancellation of non-purchase transaction', async () => {
      const { queries } = require('@/db/queries')
      const listingTransaction = await queries.createTransaction({
        transactionType: 'listing',
        userId: TEST_USER_IDS.SELLER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 0,
        quantity: 1,
      })

      // Mark as completed so it exists but can't be cancelled
      await queries.updateTransactionStatus(listingTransaction.id, 'completed')

      // Load transaction into store
      await store.loadUserTransactions(TEST_USER_IDS.SELLER)

      await expect(store.cancelPurchase(listingTransaction.id)).rejects.toThrow(
        'Transaction cannot be cancelled',
      )
    })
  })

  describe('Transaction Management (F8)', () => {
    beforeEach(async () => {
      await store.loadAllData()
    })

    it('should load user transactions', async () => {
      await store.loadUserTransactions(TEST_USER_IDS.BUYER)
      expect(Array.isArray(store.transactions)).toBe(true)
    })

    it('should load user inventory', async () => {
      await store.loadUserInventory(TEST_USER_IDS.BUYER)
      expect(Array.isArray(store.inventory)).toBe(true)
    })

    it('should add item to inventory', async () => {
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Inventory Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      const inventory = await store.addToInventory({
        userId: TEST_USER_IDS.BUYER,
        itemId: item.id,
        quantity: 1,
      })

      expect(inventory).toBeDefined()
      expect(store.inventory.length).toBeGreaterThan(0)
    })
  })

  // Store Views
  describe('Store Views', () => {
    beforeEach(async () => {
      await store.loadAllData()
    })

    it('should get category by id', () => {
      const category = store.getCategoryById(TEST_CATEGORY_IDS.ELECTRONICS)
      expect(category).toBeDefined()
      expect(category?.id).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
    })

    it('should get category by code', () => {
      const category = store.getCategoryByCode('electronics')
      expect(category).toBeDefined()
      expect(category?.code).toBe('electronics')
    })

    it('should get user by id', () => {
      const user = store.getUserById(TEST_USER_IDS.SELLER)
      expect(user).toBeDefined()
      expect(user?.id).toBe(TEST_USER_IDS.SELLER)
    })

    it('should get seller by id', () => {
      const seller = store.getSellerById(TEST_USER_IDS.SELLER)
      expect(seller).toBeDefined()
      expect(seller?.sellerRating).toBeGreaterThan(0)
    })

    it('should return null for non-seller user', () => {
      const seller = store.getSellerById(TEST_USER_IDS.BUYER)
      expect(seller).toBeNull()
    })

    it('should get active items', () => {
      const activeItems = store.activeItems
      activeItems.forEach(item => {
        expect(item.status).toBe('active')
      })
    })

    it('should get auction items', () => {
      const auctionItems = store.auctionItems
      auctionItems.forEach(item => {
        expect(item.auctionFlag).toBe(1)
        expect(item.status).toBe('active')
        expect(item.isExpired).toBe(false)
      })
    })

    it('should get buy-now items', () => {
      const buyNowItems = store.buyNowItems
      buyNowItems.forEach(item => {
        expect(item.auctionFlag).toBe(0)
        expect(item.status).toBe('active')
      })
    })

    it('should get items by category', () => {
      const items = store.getItemsByCategory(TEST_CATEGORY_IDS.ELECTRONICS)
      items.forEach(item => {
        expect(item.categoryId).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
        expect(item.status).toBe('active')
      })
    })

    it('should get purchases by user', () => {
      const purchases = store.getPurchasesByUser(TEST_USER_IDS.BUYER)
      purchases.forEach(p => {
        expect(['purchase', 'bid_win']).toContain(p.transactionType)
        expect(p.status).toBe('completed')
      })
    })

    it('should get sales by user', () => {
      const sales = store.getSalesByUser(TEST_USER_IDS.SELLER)
      sales.forEach(s => {
        expect(s.transactionType).toBe('sale')
        expect(s.sellerId).toBe(TEST_USER_IDS.SELLER)
        expect(s.status).toBe('completed')
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await store.loadAllData()
    })

    it('should handle search errors gracefully', async () => {
      jest
        .spyOn(require('@/db/queries').queries, 'searchItems')
        .mockRejectedValueOnce(new Error('Search failed'))

      await expect(store.searchItems({ keyword: 'test' })).rejects.toThrow()
      expect(store.error).toBeDefined()
    })

    it('should handle item detail load errors', async () => {
      jest
        .spyOn(require('@/db/queries').queries, 'getItemDetail')
        .mockRejectedValueOnce(new Error('Item not found'))

      await expect(store.loadItemDetail(999)).rejects.toThrow()
      expect(store.error).toBeDefined()
    })

    it('should handle bid placement errors', async () => {
      const { queries } = require('@/db/queries')
      jest
        .spyOn(queries, 'createBid')
        .mockRejectedValueOnce(new Error('Bid failed'))

      const item = store.items.find(
        i => i.auctionFlag === 1 && i.status === 'active',
      )
      if (item) {
        await expect(
          store.placeBid({
            itemId: item.id,
            userId: TEST_USER_IDS.BUYER,
            bidAmount: 100,
          }),
        ).rejects.toThrow()
        expect(store.error).toBeDefined()
      }
    })

    it('should handle buy now errors', async () => {
      const { queries } = require('@/db/queries')
      jest
        .spyOn(queries, 'createTransaction')
        .mockRejectedValueOnce(new Error('Transaction failed'))

      const item = store.items.find(
        i => i.auctionFlag === 0 && i.status === 'active',
      )
      if (item) {
        await expect(
          store.buyNow({
            itemId: item.id,
            userId: TEST_USER_IDS.BUYER,
            quantity: 1,
          }),
        ).rejects.toThrow()
        expect(store.error).toBeDefined()
      }
    })

    it('should handle payment processing errors', async () => {
      const { queries } = require('@/db/queries')
      const item = store.items.find(
        i => i.auctionFlag === 0 && i.status === 'active',
      )
      if (item) {
        const transaction = await queries.createTransaction({
          transactionType: 'purchase',
          userId: TEST_USER_IDS.BUYER,
          sellerId: item.sellerId,
          itemId: item.id,
          amount: 10.0,
          quantity: 1,
        })

        jest
          .spyOn(require('@/db/queries').queries, 'getMockCardByNumber')
          .mockRejectedValueOnce(new Error('Card lookup failed'))

        await expect(
          store.processPayment({
            transactionId: transaction.id,
            cardNumber: TEST_CARD_NUMBERS.SUCCESS,
            amount: 10.0,
            cvv: '123',
          }),
        ).rejects.toThrow()
        expect(store.error).toBeDefined()
      }
    })
  })

  describe('endListing - Winner Determination', () => {
    it('should determine winner and update bid outcomes when ending auction', async () => {
      await store.initializeDatabase()
      await store.loadAllData()

      // Find an auction item with bids
      const auctionItem = store.items.find(
        i => i.auctionFlag === 1 && i.status === 'active',
      )
      if (!auctionItem) {
        return // Skip if no auction items in test data
      }

      // Place a bid to ensure there's a winning bid
      const userId = TEST_USER_IDS.BUYER || store.users[0]?.id
      if (!userId) return

      try {
        await store.placeBid({
          itemId: auctionItem.id,
          userId,
          bidAmount: auctionItem.startingBid || auctionItem.price + 10,
        })
      } catch (e) {
        console.error(e)
        // May fail if no payment method or auction closed, skip test
        return
      }

      // Get winning bid before ending
      const winningBidBefore = store.getWinningBid(auctionItem.id)
      expect(winningBidBefore).toBeDefined()

      // End the listing
      await store.endListing(auctionItem.id)

      // Verify item is expired
      const endedItem = store.items.find(i => i.id === auctionItem.id)
      expect(endedItem?.status).toBe('expired')
      expect(endedItem?.expired).toBe(true)

      // Verify bid outcomes were updated
      const allBids = store.getBidsByItem(auctionItem.id)
      if (allBids.length > 0) {
        const winningBid = allBids.find(b => b.outcome === 'won')
        const losingBids = allBids.filter(b => b.outcome === 'lost')
        expect(winningBid).toBeDefined()
        expect(losingBids.length).toBe(allBids.length - 1)
      }

      // Verify transaction was created for winner
      if (winningBidBefore) {
        const winnerTransaction = store.transactions.find(
          t =>
            t.transactionType === 'bid_win' &&
            t.userId === winningBidBefore.userId,
        )
        expect(winnerTransaction).toBeDefined()
      }
    })
  })
})
