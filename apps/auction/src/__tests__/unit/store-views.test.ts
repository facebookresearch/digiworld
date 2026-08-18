import { AuctionStore } from '@/models/AuctionStore'
import { createTestData, TEST_USER_IDS, TEST_CATEGORY_IDS } from '../helpers'

describe('AuctionStore Views', () => {
  let store: ReturnType<typeof AuctionStore.create>

  beforeEach(async () => {
    await createTestData()
    store = AuctionStore.create({})
    await store.loadAllData()
  })

  describe('Category Views', () => {
    it('should get category by id', () => {
      const category = store.getCategoryById(TEST_CATEGORY_IDS.ELECTRONICS)
      expect(category).toBeDefined()
      expect(category?.id).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
      expect(category?.code).toBe('electronics')
    })

    it('should get category by code', () => {
      const category = store.getCategoryByCode('electronics')
      expect(category).toBeDefined()
      expect(category?.code).toBe('electronics')
      expect(category?.id).toBe(TEST_CATEGORY_IDS.ELECTRONICS)
    })

    it('should return undefined for non-existent category', () => {
      const category = store.getCategoryById(99999)
      expect(category).toBeUndefined()
    })

    it('should return undefined for non-existent category code', () => {
      const category = store.getCategoryByCode('nonexistent')
      expect(category).toBeUndefined()
    })
  })

  describe('User Views', () => {
    it('should get user by id', () => {
      const user = store.getUserById(TEST_USER_IDS.SELLER)
      expect(user).toBeDefined()
      expect(user?.id).toBe(TEST_USER_IDS.SELLER)
    })

    it('should get user by username', () => {
      const seller = store.getUserById(TEST_USER_IDS.SELLER)
      if (seller) {
        const user = store.getUserByUsername(seller.username)
        expect(user).toBeDefined()
        expect(user?.id).toBe(TEST_USER_IDS.SELLER)
      }
    })

    it('should get sellers', () => {
      const sellers = store.getSellers()
      expect(Array.isArray(sellers)).toBe(true)
      sellers.forEach(seller => {
        expect(seller.sellerRating > 0 || seller.totalItemsListed > 0).toBe(
          true,
        )
      })
    })

    it('should return undefined for non-existent user', () => {
      const user = store.getUserById(99999)
      expect(user).toBeUndefined()
    })

    it('should return undefined for non-existent username', () => {
      const user = store.getUserByUsername('nonexistent')
      expect(user).toBeUndefined()
    })
  })

  describe('Item Views', () => {
    it('should get item by id', () => {
      const item = store.items[0]
      if (item) {
        const foundItem = store.getItemById(item.id)
        expect(foundItem).toBeDefined()
        expect(foundItem?.id).toBe(item.id)
      }
    })

    it('should get active items', () => {
      const activeItems = store.activeItems
      expect(Array.isArray(activeItems)).toBe(true)
      activeItems.forEach(item => {
        expect(item.status).toBe('active')
      })
    })

    it('should get auction items', () => {
      const auctionItems = store.auctionItems
      expect(Array.isArray(auctionItems)).toBe(true)
      auctionItems.forEach(item => {
        expect(item.auctionFlag).toBe(1)
        expect(item.status).toBe('active')
      })
    })

    it('should get buy-now items', () => {
      const buyNowItems = store.buyNowItems
      expect(Array.isArray(buyNowItems)).toBe(true)
      buyNowItems.forEach(item => {
        expect(item.auctionFlag).toBe(0)
        expect(item.status).toBe('active')
      })
    })

    it('should get items by seller', () => {
      const items = store.getItemsBySeller(TEST_USER_IDS.SELLER)
      expect(Array.isArray(items)).toBe(true)
      items.forEach(item => {
        expect(item.sellerId).toBe(TEST_USER_IDS.SELLER)
      })
    })

    it('should return empty array for non-existent seller', () => {
      const items = store.getItemsBySeller(99999)
      expect(items).toEqual([])
    })

    it('should return undefined for non-existent item', () => {
      const item = store.getItemById(99999)
      expect(item).toBeUndefined()
    })
  })

  describe('Bid Views', () => {
    it('should get bids by item', async () => {
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Test Auction',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })

      await store.placeBid({
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const bids = store.getBidsByItem(item.id)
      expect(Array.isArray(bids)).toBe(true)
      expect(bids.length).toBeGreaterThan(0)
      bids.forEach(bid => {
        expect(bid.itemId).toBe(item.id)
      })
    })

    it('should get bids by user', async () => {
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Test Auction',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })

      await store.placeBid({
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const bids = store.getBidsByUser(TEST_USER_IDS.BUYER)
      expect(Array.isArray(bids)).toBe(true)
      bids.forEach(bid => {
        expect(bid.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should get winning bid', async () => {
      const { queries } = require('@/db/queries')
      const item = await queries.createItem({
        title: 'Test Auction',
        categoryId: TEST_CATEGORY_IDS.ELECTRONICS,
        sellerId: TEST_USER_IDS.SELLER,
        price: 100.0,
        auctionFlag: 1,
        startingBid: 50.0,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        quantity: 1,
      })

      await store.placeBid({
        itemId: item.id,
        userId: TEST_USER_IDS.BUYER,
        bidAmount: 60.0,
      })

      const winningBid = store.getWinningBid(item.id)
      expect(winningBid).toBeDefined()
      expect(winningBid?.isWinning).toBe(true)
    })

    it('should return empty array for item with no bids', () => {
      const item = store.items.find(i => i.auctionFlag === 1)
      if (item) {
        const bids = store.getBidsByItem(item.id)
        expect(Array.isArray(bids)).toBe(true)
      }
    })

    it('should return undefined for non-existent winning bid', () => {
      const winningBid = store.getWinningBid(99999)
      expect(winningBid).toBeUndefined()
    })
  })

  describe('Transaction Views', () => {
    it('should get transactions by user', async () => {
      const item = store.items.find(i => i.auctionFlag === 0)
      if (item) {
        await store.buyNow({
          itemId: item.id,
          userId: TEST_USER_IDS.BUYER,
          quantity: 1,
          paymentCardNumber: '4242424242424242',
        })

        const transactions = store.getTransactionsByUser(TEST_USER_IDS.BUYER)
        expect(Array.isArray(transactions)).toBe(true)
        transactions.forEach(transaction => {
          expect(transaction.userId).toBe(TEST_USER_IDS.BUYER)
        })
      }
    })

    it('should get purchases by user', async () => {
      const item = store.items.find(i => i.auctionFlag === 0)
      if (item) {
        await store.buyNow({
          itemId: item.id,
          userId: TEST_USER_IDS.BUYER,
          quantity: 1,
          paymentCardNumber: '4242424242424242',
        })

        const purchases = store.getPurchasesByUser(TEST_USER_IDS.BUYER)
        expect(Array.isArray(purchases)).toBe(true)
        purchases.forEach(purchase => {
          expect(['purchase', 'bid_win']).toContain(purchase.transactionType)
          expect(purchase.status).toBe('completed')
        })
      }
    })

    it('should get sales by user', async () => {
      const sales = store.getSalesByUser(TEST_USER_IDS.SELLER)
      expect(Array.isArray(sales)).toBe(true)
      sales.forEach(sale => {
        expect(sale.sellerId).toBe(TEST_USER_IDS.SELLER)
        expect(sale.transactionType).toBe('sale')
        expect(sale.status).toBe('completed')
      })
    })

    it('should return empty array for user with no transactions', () => {
      const transactions = store.getTransactionsByUser(99999)
      expect(transactions).toEqual([])
    })
  })

  describe('Payment Views', () => {
    it('should get mock card by number', () => {
      const card = store.getMockCardByNumber('4242424242424242')
      expect(card).toBeDefined()
      expect(card?.cardNumber).toBe('4242424242424242')
    })

    it('should return undefined for non-existent card', () => {
      const card = store.getMockCardByNumber('0000000000000000')
      expect(card).toBeUndefined()
    })
  })

  describe('Inventory Views', () => {
    it('should get inventory by user', async () => {
      await store.loadUserInventory(TEST_USER_IDS.BUYER)
      const inventory = store.getInventoryByUser(TEST_USER_IDS.BUYER)
      expect(Array.isArray(inventory)).toBe(true)
      inventory.forEach(item => {
        expect(item.userId).toBe(TEST_USER_IDS.BUYER)
      })
    })

    it('should get inventory item', async () => {
      const item = store.items.find(i => i.auctionFlag === 0)
      if (item) {
        await store.buyNow({
          itemId: item.id,
          userId: TEST_USER_IDS.BUYER,
          quantity: 1,
          paymentCardNumber: '4242424242424242',
        })

        await store.loadUserInventory(TEST_USER_IDS.BUYER)
        const inventoryItem = store.getInventoryItem(
          TEST_USER_IDS.BUYER,
          item.id,
        )
        expect(inventoryItem).toBeDefined()
        expect(inventoryItem?.itemId).toBe(item.id)
      }
    })

    it('should return empty array for user with no inventory', () => {
      const inventory = store.getInventoryByUser(99999)
      expect(inventory).toEqual([])
    })

    it('should return undefined for non-existent inventory item', () => {
      const inventoryItem = store.getInventoryItem(99999, 99999)
      expect(inventoryItem).toBeUndefined()
    })
  })
})
