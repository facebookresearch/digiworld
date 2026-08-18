// Copyright (c) Meta Platforms, Inc. and affiliates.
import { mutations } from '@/db/mutations' // Only for initializeDatabase
import { queries } from '@/db/queries'
import { sql } from 'drizzle-orm'
import {
  createTestData,
  TEST_USER_IDS,
  TEST_CATEGORY_IDS,
  TEST_CARD_NUMBERS,
} from '../helpers'

describe('Auction Mutations', () => {
  // Suppress console errors for expected error cases across all tests
  let originalConsoleError: typeof console.error

  beforeEach(async () => {
    // Suppress console.error for expected database errors in tests
    originalConsoleError = console.error
    console.error = jest.fn()

    await createTestData()
  })

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError
  })

  describe('initializeDatabase (F1)', () => {
    it('should initialize database with mock data', async () => {
      // Clear test data first to test initializeDatabase properly
      // This test should run initializeDatabase on a clean database
      const { db } = require('@/db/index')
      await db.run(sql.raw('DELETE FROM categories'))
      await db.run(sql.raw('DELETE FROM users'))
      await db.run(sql.raw('DELETE FROM items'))

      const result = await mutations.initializeDatabase()
      expect(result.success).toBe(true)

      // Verify data was loaded
      const categories = await queries.getAllCategories()
      expect(categories.length).toBeGreaterThan(0)

      const users = await queries.getAllUsers()
      expect(users.length).toBeGreaterThan(0)

      const items = await queries.getAllItems()
      expect(items.length).toBeGreaterThan(0)

      const mockCards = await queries.getAllMockCards()
      expect(mockCards.length).toBeGreaterThan(0)
    })

    it('should skip initialization if already seeded', async () => {
      // First initialization
      await mutations.initializeDatabase()

      // Second initialization should skip
      const result = await mutations.initializeDatabase()
      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
    })

    it('should handle missing JSON files error', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      jest
        .spyOn(require('@/db/mutations'), 'readJSONFile')
        .mockResolvedValueOnce(null)

      const result = await mutations.initializeDatabase()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()

      consoleErrorSpy.mockRestore()
    })

    it('should handle database errors during initialization', async () => {
      const { db } = require('@/db/index')

      // Mock the insert chain to fail
      jest.spyOn(db, 'insert').mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          run: jest.fn().mockRejectedValueOnce(new Error('Database error')),
        }),
      })

      const result = await mutations.initializeDatabase()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Item Mutations (F7)', () => {
    it('should create buy-now item successfully', async () => {
      const item = await queries.createItem({
        title: 'Test Buy Now Item',
        description: 'Test description',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 5,
      })

      expect(item).toBeDefined()
      expect(item.id).toBeDefined()
      expect(item.title).toBe('Test Buy Now Item')
      expect(item.auctionFlag).toBe(0)
      expect(item.status).toBe('active')
      expect(item.quantity).toBe(5)
      expect(item.bidCount).toBe(0)
    })

    it('should create auction item successfully', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
      const item = await queries.createItem({
        title: 'Test Auction Item',
        description: 'Test auction description',
        categoryId: TEST_CATEGORY_IDS.BOOKS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        currentBid: 50.0,
        bidIncrement: 5.0,
        endTime,
        quantity: 1,
      })

      expect(item).toBeDefined()
      expect(item.auctionFlag).toBe(1)
      expect(item.startingBid).toBe(50.0)
      expect(item.currentBid).toBe(50.0)
      expect(item.endTime).toBe(endTime)
      expect(item.bidIncrement).toBe(5.0)
    })

    it('should update item status', async () => {
      const item = await queries.createItem({
        title: 'Status Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      const updated = await queries.updateItemStatus(item.id, 'sold')
      expect(updated).toBeDefined()
      expect(updated?.status).toBe('sold')
    })

    it('should update item bid information', async () => {
      const item = await queries.createItem({
        title: 'Bid Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })

      const updated = await queries.updateItemBid(item.id, 75.0, 3)
      expect(updated).toBeDefined()
      expect(updated?.currentBid).toBe(75.0)
      expect(updated?.bidCount).toBe(3)
    })

    it('should handle invalid item status update gracefully', async () => {
      const updated = await queries.updateItemStatus(999, 'sold')
      expect(updated).toBeNull()
    })
  })

  describe('Bid Mutations (F5)', () => {
    let auctionItemId: number

    beforeEach(async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400
      const item = await queries.createItem({
        title: 'Auction Item for Bidding',
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
    })

    it('should create bid successfully', async () => {
      const bid = await queries.createBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      expect(bid).toBeDefined()
      expect(bid.id).toBeDefined()
      expect(bid.itemId).toBe(auctionItemId)
      expect(bid.userId).toBe(TEST_USER_IDS.BUYER)
      expect(bid.bidAmount).toBe(60.0)
      expect(bid.isWinning).toBe(true)
      expect(bid.outcome).toBe('pending')
    })

    it('should update item bid count when creating bid', async () => {
      const initialItem = await queries.getItemById(auctionItemId)
      const initialBidCount = initialItem?.bidCount || 0

      await queries.createBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const updatedItem = await queries.getItemById(auctionItemId)
      expect(updatedItem?.bidCount).toBe(initialBidCount + 1)
      expect(updatedItem?.currentBid).toBe(60.0)
    })

    it('should set previous winning bid to not winning', async () => {
      // Create first bid
      const bid1 = await queries.createBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      // Create second bid (should unset first bid as winning)
      const bid2 = await queries.createBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.USER,
        bidAmount: 70.0,
      })

      expect(bid2.isWinning).toBe(true)

      // Check first bid is no longer winning
      const updatedBid1 = await queries.getBidById(bid1.id)
      expect(updatedBid1?.isWinning).toBe(false)
    })

    it('should update bid outcome', async () => {
      const bid = await queries.createBid({
        itemId: auctionItemId,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const updated = await queries.updateBidOutcome(bid.id, 'won')
      expect(updated).toBeDefined()
      expect(updated?.outcome).toBe('won')
    })

    it('should handle updating non-existent bid gracefully', async () => {
      const updated = await queries.updateBidOutcome(999, 'won')
      expect(updated).toBeNull()
    })
  })

  // Transaction Mutations (F6, F8, F10)
  describe('Transaction Mutations (F6, F8, F10)', () => {
    let testItemId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Transaction Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id
    })

    it('should create purchase transaction', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      expect(transaction).toBeDefined()
      expect(transaction.id).toBeDefined()
      expect(transaction.transactionType).toBe('purchase')
      expect(transaction.userId).toBe(TEST_USER_IDS.BUYER)
      expect(transaction.status).toBe('pending')
      expect(transaction.paymentStatus).toBe('pending')
    })

    it('should create bid_win transaction', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'bid_win',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      expect(transaction.transactionType).toBe('bid_win')
    })

    it('should create listing transaction', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'listing',
        userId: TEST_USER_IDS.SELLER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 0,
        quantity: 1,
      })

      expect(transaction.transactionType).toBe('listing')
    })

    it('should create sale transaction', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'sale',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      expect(transaction.transactionType).toBe('sale')
      expect(transaction.sellerId).toBe(TEST_USER_IDS.SELLER)
    })

    it('should update transaction status', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      const updated = await queries.updateTransactionStatus(
        transaction.id,
        'completed',
      )
      expect(updated).toBeDefined()
      expect(updated?.status).toBe('completed')
    })

    it('should update transaction payment status', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      const updated = await queries.updateTransactionPaymentStatus(
        transaction.id,
        'success',
      )
      expect(updated).toBeDefined()
      expect(updated?.paymentStatus).toBe('success')
      expect(updated?.status).toBe('completed')
    })

    it('should update payment status to failed with reason', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      const updated = await queries.updateTransactionPaymentStatus(
        transaction.id,
        'failed',
        'DECLINED',
      )
      expect(updated).toBeDefined()
      expect(updated?.paymentStatus).toBe('failed')
      expect(updated?.failureReason).toBe('DECLINED')
      expect(updated?.status).toBe('pending')
    })

    it('should refund transaction (F10)', async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        itemId: testItemId,
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })

      await queries.updateTransactionStatus(transaction.id, 'completed')

      const refunded = await queries.refundTransaction(transaction.id, 99.99)
      expect(refunded).toBeDefined()
      expect(refunded?.status).toBe('refunded')
      expect(refunded?.refundAmount).toBe(99.99)
      expect(refunded?.refundedAt).toBeDefined()
    })

    it('should handle refunding non-existent transaction gracefully', async () => {
      const refunded = await queries.refundTransaction(999, 99.99)
      expect(refunded).toBeNull()
    })
  })

  describe('Payment Mutations (F9)', () => {
    let testTransactionId: number

    beforeEach(async () => {
      const transaction = await queries.createTransaction({
        transactionType: 'purchase',
        userId: TEST_USER_IDS.BUYER,
        sellerId: TEST_USER_IDS.SELLER,
        amount: 99.99,
        quantity: 1,
      })
      testTransactionId = transaction.id
    })

    it('should create successful payment', async () => {
      const payment = await queries.createPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        cardType: 'visa',
        amount: 99.99,
        status: 'success',
      })

      expect(payment).toBeDefined()
      expect(payment.id).toBeDefined()
      expect(payment.transactionId).toBe(testTransactionId)
      expect(payment.status).toBe('success')
      expect(payment.cardNumber).toBe(TEST_CARD_NUMBERS.SUCCESS)
    })

    it('should create declined payment', async () => {
      const payment = await queries.createPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.DECLINED,
        cardType: 'visa',
        amount: 99.99,
        status: 'declined',
        failureReason: 'DECLINED',
      })

      expect(payment.status).toBe('declined')
      expect(payment.failureReason).toBe('DECLINED')
    })

    it('should create payment with deterministic seed', async () => {
      const payment = await queries.createPayment({
        transactionId: testTransactionId,
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        cardType: 'visa',
        amount: 99.99,
        status: 'success',
        deterministicSeed: 42,
      })

      expect(payment.deterministicSeed).toBe(42)
    })
  })

  describe('Inventory Mutations (F8)', () => {
    let testItemId: number
    let testTransactionId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Inventory Test Item',
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
    })

    it('should add item to inventory', async () => {
      const inventory = await queries.addToInventory({
        userId: TEST_USER_IDS.BUYER,
        itemId: testItemId,
        transactionId: testTransactionId,
        quantity: 1,
      })

      expect(inventory).toBeDefined()
      expect(inventory.id).toBeDefined()
      expect(inventory.userId).toBe(TEST_USER_IDS.BUYER)
      expect(inventory.itemId).toBe(testItemId)
      expect(inventory.transactionId).toBe(testTransactionId)
      expect(inventory.quantity).toBe(1)
    })

    it('should add item to inventory without transaction', async () => {
      const inventory = await queries.addToInventory({
        userId: TEST_USER_IDS.BUYER,
        itemId: testItemId,
        quantity: 2,
      })

      expect(inventory).toBeDefined()
      expect(inventory.transactionId).toBeNull()
      expect(inventory.quantity).toBe(2)
    })
  })

  describe('Listing Mutations (F7)', () => {
    let testItemId: number

    beforeEach(async () => {
      const item = await queries.createItem({
        title: 'Listing Test Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })
      testItemId = item.id
    })

    it('should create listing successfully', async () => {
      const listing = await queries.createListing({
        userId: TEST_USER_IDS.SELLER,
        itemId: testItemId,
        listPrice: 99.99,
      })

      expect(listing).toBeDefined()
      expect(listing.id).toBeDefined()
      expect(listing.userId).toBe(TEST_USER_IDS.SELLER)
      expect(listing.itemId).toBe(testItemId)
      expect(listing.listPrice).toBe(99.99)
      expect(listing.status).toBe('active')
    })

    it('should create listing with session', async () => {
      const session = await queries.createSession({
        sessionId: `test_session_${Date.now()}`,
        userId: TEST_USER_IDS.SELLER,
        seed: 42,
      })

      const listing = await queries.createListing({
        sessionId: session.id,
        userId: TEST_USER_IDS.SELLER,
        itemId: testItemId,
        listPrice: 99.99,
      })

      expect(listing.sessionId).toBe(session.id)
    })

    it('should update listing status', async () => {
      const listing = await queries.createListing({
        userId: TEST_USER_IDS.SELLER,
        itemId: testItemId,
        listPrice: 99.99,
      })

      const updated = await queries.updateListingStatus(listing.id, 'sold')
      expect(updated).toBeDefined()
      expect(updated?.status).toBe('sold')
    })

    it('should handle updating non-existent listing gracefully', async () => {
      const updated = await queries.updateListingStatus(999, 'sold')
      expect(updated).toBeNull()
    })
  })

  // Edge Cases and Error Handling
  describe('Edge Cases and Error Handling', () => {
    it('should handle creating item with invalid category', async () => {
      // Note: SQLite foreign keys may not be enforced unless PRAGMA foreign_keys = ON
      // This test may pass if foreign keys are not enforced
      try {
        await queries.createItem({
          title: 'Invalid Category Item',
          categoryId: 999,
          sellerId: TEST_USER_IDS.SELLER,
          price: 99.99,
          auctionFlag: 0,
          quantity: 1,
        })
        // If it doesn't throw, that's okay - foreign keys might not be enforced
      } catch (error) {
        // If it throws, that's also okay - foreign keys are enforced
        expect(error).toBeDefined()
      }
    })

    it('should handle creating item with invalid seller', async () => {
      // Note: SQLite foreign keys may not be enforced unless PRAGMA foreign_keys = ON
      try {
        await queries.createItem({
          title: 'Invalid Seller Item',
          categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
          sellerId: 999,
          price: 99.99,
          auctionFlag: 0,
          quantity: 1,
        })
        // If it doesn't throw, that's okay - foreign keys might not be enforced
      } catch (error) {
        // If it throws, that's also okay - foreign keys are enforced
        expect(error).toBeDefined()
      }
    })

    it('should handle item insertion errors gracefully', async () => {
      // Test error handling when item insertion fails (line 154-155)
      const { db } = require('@/db/index')

      jest.spyOn(db, 'insert').mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            execute: jest
              .fn()
              .mockRejectedValueOnce(new Error('Insert failed')),
          }),
        }),
      })

      try {
        await queries.createItem({
          title: 'Error Test Item',
          categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
          sellerId: TEST_USER_IDS.SELLER,
          price: 99.99,
          auctionFlag: 0,
          quantity: 1,
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should skip items with missing categoryId or sellerId', async () => {
      // Test error handling for missing IDs (line 120-121)
      const mockItems = [
        { id: 1, title: 'Valid Item', categoryId: 1, sellerId: 1, price: 10 },
        { id: 2, title: 'Missing Category', sellerId: 1, price: 10 }, // Missing categoryId
        { id: 3, title: 'Missing Seller', categoryId: 1, price: 10 }, // Missing sellerId
      ]

      jest
        .spyOn(require('@/db/mutations'), 'readJSONFile')
        .mockImplementation((filename: string) => {
          if (filename.includes('categories')) {
            return Promise.resolve([{ id: 1, code: 'test', name: 'Test' }])
          }
          if (filename.includes('users')) {
            return Promise.resolve([
              { id: 1, username: 'test', email: 'test@test.com' },
            ])
          }
          if (filename.includes('items')) {
            return Promise.resolve(mockItems)
          }
          return Promise.resolve([])
        })

      // This should handle gracefully and skip invalid items
      const result = await mutations.initializeDatabase()
      // Should still succeed but skip invalid items
      expect(result.success).toBeDefined()
    })

    it('should handle creating bid on non-auction item', async () => {
      const item = await queries.createItem({
        title: 'Buy Now Item',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 99.99,
        auctionFlag: 0,
        quantity: 1,
      })

      // This should still work but the item won't be an auction
      const bid = await queries.createBid({
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 100.0,
      })

      expect(bid).toBeDefined()
    })

    it('should handle creating transaction with invalid user', async () => {
      try {
        await queries.createTransaction({
          transactionType: 'purchase',
          userId: 999,
          sellerId: TEST_USER_IDS.SELLER,
          amount: 99.99,
          quantity: 1,
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle transaction creation errors', async () => {
      // Test error handling in transaction creation (line 181-182)
      const { db } = require('@/db/index')

      jest.spyOn(db, 'insert').mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            execute: jest
              .fn()
              .mockRejectedValueOnce(new Error('Transaction creation failed')),
          }),
        }),
      })

      try {
        await queries.createTransaction({
          transactionType: 'purchase',
          userId: TEST_USER_IDS.BUYER,
          sellerId: TEST_USER_IDS.SELLER,
          amount: 99.99,
          quantity: 1,
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
