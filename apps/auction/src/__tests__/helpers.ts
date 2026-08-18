import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { inArray } from 'drizzle-orm'
import { mutations } from '@/db/mutations'
import { categories, users, mockCards, userPaymentMethods } from '@/db/schema'
import { db } from '@/db/index'

export const ORIGINAL_DB_PATH = path.resolve(__dirname, 'static/ABC.db')

// Copy ABC.db to temp DB for safe tests
export function createTempDB(): Database.Database {
  if (!fs.existsSync(ORIGINAL_DB_PATH)) {
    throw new Error(`Fixture database file not found at ${ORIGINAL_DB_PATH}`)
  }
  const tempPath = path.resolve(__dirname, `temp/auction_test_${Date.now()}.db`)
  const tempDir = path.dirname(tempPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  fs.copyFileSync(ORIGINAL_DB_PATH, tempPath)
  return new Database(tempPath)
}

// Cleanup temp DB
export function cleanupTempDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
}

// Create fresh DB from schema + optional mock data
export async function setupFreshDB(): Promise<Database.Database> {
  const dbPath = path.resolve(__dirname, `temp/fresh_test_${Date.now()}.db`)
  const tempDir = path.dirname(dbPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  const db = new Database(dbPath)
  // Note: This would need to run migrations, but for now we use in-memory DB in tests
  await mutations.initializeDatabase()
  return db
}

// Cleanup fresh DB
export function teardownTestDB(db: Database.Database) {
  const dbPath = db.name
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
}

// Helper to create test data
export async function createTestData() {
  // Note: In test environment, jest.setup.auction.ts already creates a fresh in-memory database
  // with the correct schema, so we don't need to reset or run migrations here.
  // The beforeEach hook in jest.setup.auction.ts clears all tables before each test file.

  // Create categories
  await db
    .insert(categories)
    .values([
      {
        id: 1,
        code: 'electronics',
        name: 'Electronics',
        description: 'Electronic devices',
      },
      {
        id: 2,
        code: 'books',
        name: 'Books',
        description: 'Books and reading materials',
      },
      {
        id: 3,
        code: 'fashion',
        name: 'Fashion',
        description: 'Clothing and accessories',
      },
      {
        id: 4,
        code: 'home',
        name: 'Home',
        description: 'Home decor and furniture',
      },
      { id: 5, code: 'toys', name: 'Toys', description: 'Toys and games' },
    ])
    .execute()

  // Create users
  await db
    .insert(users)
    .values([
      {
        id: 1,
        username: 'seller1',
        email: 'seller1@example.com',
        name: 'Seller One',
        password: 'password123',
        sellerRating: 4.5,
        totalSales: 100,
        totalItemsListed: 50,
      },
      {
        id: 2,
        username: 'buyer1',
        email: 'buyer1@example.com',
        name: 'Buyer One',
        password: 'password123',
        sellerRating: 0,
        totalSales: 0,
        totalItemsListed: 0,
      },
      {
        id: 3,
        username: 'user1',
        email: 'user1@example.com',
        name: 'User One',
        password: 'password123',
        sellerRating: 3.8,
        totalSales: 50,
        totalItemsListed: 25,
      },
    ])
    .execute()

  // Create mock cards
  await db
    .insert(mockCards)
    .values([
      {
        id: 1,
        cardNumber: '4242424242424242',
        cardType: 'visa',
        alwaysSucceeds: 1,
        failureReason: null,
      },
      {
        id: 2,
        cardNumber: '4000000000000002',
        cardType: 'visa',
        alwaysSucceeds: 0,
        failureReason: 'DECLINED',
      },
      {
        id: 3,
        cardNumber: '4000000000009995',
        cardType: 'visa',
        alwaysSucceeds: 0,
        failureReason: 'INSUFFICIENT_FUNDS',
      },
    ])
    .execute()

  // Create payment methods for test users
  await db
    .insert(userPaymentMethods)
    .values([
      {
        id: 1,
        userId: TEST_USER_IDS.BUYER,
        cardType: 'visa',
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        expiry: '12/25',
        cardHolderName: 'Buyer One',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        userId: TEST_USER_IDS.SELLER,
        cardType: 'visa',
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        expiry: '12/25',
        cardHolderName: 'Seller One',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        userId: TEST_USER_IDS.USER,
        cardType: 'visa',
        cardNumber: TEST_CARD_NUMBERS.SUCCESS,
        expiry: '12/25',
        cardHolderName: 'User One',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ])
    .execute()

  // Create payment methods for test users (BUYER=2, SELLER=1, USER=3)
  // Check if payment methods already exist to avoid duplicates
  const existingPaymentMethods = await db
    .select()
    .from(userPaymentMethods)
    .where(inArray(userPaymentMethods.userId, [1, 2, 3]))
    .execute()

  if (existingPaymentMethods.length === 0) {
    await db
      .insert(userPaymentMethods)
      .values([
        {
          userId: 2, // BUYER
          cardType: 'visa',
          cardNumber: '4242424242424242', // SUCCESS card
          expiry: '12/25',
          cardHolderName: 'Buyer One',
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
        {
          userId: 1, // SELLER
          cardType: 'visa',
          cardNumber: '4242424242424242', // SUCCESS card
          expiry: '12/25',
          cardHolderName: 'Seller One',
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
        {
          userId: 3, // USER
          cardType: 'visa',
          cardNumber: '4242424242424242', // SUCCESS card
          expiry: '12/25',
          cardHolderName: 'User One',
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      ])
      .execute()
  }
}

// Helper to get test user IDs
export const TEST_USER_IDS = {
  SELLER: 1,
  BUYER: 2,
  USER: 3,
}

// Helper to get test category IDs
export const TEST_CATEGORY_IDS = {
  ELECTRONICS: 1,
  BOOKS: 2,
  FASHION: 3,
  HOME: 4,
  TOYS: 5,
}

// Helper to get test mock card numbers
export const TEST_CARD_NUMBERS = {
  SUCCESS: '4242424242424242',
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
}
