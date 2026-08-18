// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Auction Data Generator
 *
 * Generates mock data for the auction app using faker.js
 * - Uses @example.com domain for all emails
 * - Uses simple, easy-to-remember passwords
 * - Maintains perfect schema mappings
 * - Deterministic with seed support
 */

import { faker } from '@faker-js/faker'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const SEED = 42 // For deterministic generation
const OUTPUT_DIR = path.join(__dirname)

// Counts
const NUM_SELLERS = 20
const NUM_AGENTS = 15
const NUM_ITEMS = 100
const NUM_MOCK_CARDS = 10

// Set seed for deterministic generation
faker.seed(SEED)

/**
 * Generate Categories
 * Fixed 5 categories: Electronics, Books, Fashion, Home, Toys
 */
function generateCategories() {
  const categories = [
    {
      code: 'electronics',
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
    },
    {
      code: 'books',
      name: 'Books',
      description: 'Books, magazines, and reading materials',
    },
    {
      code: 'fashion',
      name: 'Fashion',
      description: 'Clothing, accessories, and fashion items',
    },
    {
      code: 'home',
      name: 'Home',
      description: 'Home decor, furniture, and household items',
    },
    {
      code: 'toys',
      name: 'Toys',
      description: "Toys, games, and children's items",
    },
  ]

  return categories.map((cat, index) => ({
    id: index + 1,
    code: cat.code,
    name: cat.name,
    description: cat.description,
    created_at: faker.date.past({ years: 1 }).toISOString(),
  }))
}

/**
 * Generate Sellers
 * Uses @example.com domain and simple passwords
 */
function generateSellers() {
  const sellers = []

  for (let i = 0; i < NUM_SELLERS; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const username = faker.internet
      .userName({ firstName, lastName })
      .toLowerCase()

    sellers.push({
      id: `seller_${i + 1}`,
      name: `${firstName} ${lastName}`,
      username,
      email: `${username}@example.com`,
      rating: parseFloat(
        faker.number
          .float({ min: 3.0, max: 5.0, fractionDigits: 2 })
          .toFixed(2),
      ), // 3.0 to 5.0
      total_sales: faker.number.int({ min: 0, max: 500 }),
      total_items: faker.number.int({ min: 1, max: 100 }),
      created_at: faker.date.past({ years: 2 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    })
  }

  return sellers
}

/**
 * Generate Agents
 * Uses @example.com domain and simple passwords
 */
function generateAgents() {
  const agents = []

  for (let i = 0; i < NUM_AGENTS; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const username = faker.internet
      .userName({ firstName, lastName })
      .toLowerCase()

    agents.push({
      id: `agent_${i + 1}`,
      username,
      email: `${username}@example.com`,
      name: `${firstName} ${lastName}`,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    })
  }

  return agents
}

/**
 * Generate Items
 * Mix of auction and buy-now items
 */
function generateItems(categories: any[], sellers: any[]) {
  const items = []
  const categoryNames = ['Electronics', 'Books', 'Fashion', 'Home', 'Toys']

  // Category-specific item generators
  const itemGenerators: Record<
    string,
    () => { title: string; description: string; priceRange: [number, number] }
  > = {
    Electronics: () => ({
      title:
        faker.commerce.productName() + ' ' + faker.commerce.productAdjective(),
      description: faker.commerce.productDescription(),
      priceRange: [29.99, 1299.99] as [number, number],
    }),
    Books: () => ({
      title: faker.commerce.productName() + ' by ' + faker.person.fullName(),
      description: faker.lorem.paragraph(),
      priceRange: [5.99, 49.99] as [number, number],
    }),
    Fashion: () => ({
      title:
        faker.commerce.productName() +
        ' - ' +
        faker.commerce.productAdjective(),
      description: faker.commerce.productDescription(),
      priceRange: [14.99, 199.99] as [number, number],
    }),
    Home: () => ({
      title:
        faker.commerce.productName() + ' for ' + faker.commerce.department(),
      description: faker.commerce.productDescription(),
      priceRange: [19.99, 499.99] as [number, number],
    }),
    Toys: () => ({
      title:
        faker.commerce.productName() +
        ' - ' +
        faker.commerce.productAdjective(),
      description: faker.commerce.productDescription(),
      priceRange: [9.99, 149.99] as [number, number],
    }),
  }

  for (let i = 0; i < NUM_ITEMS; i++) {
    const category = faker.helpers.arrayElement(categories)
    const seller = faker.helpers.arrayElement(sellers)
    const categoryName = categoryNames[category.id - 1]
    const generator = itemGenerators[categoryName]
    const { title, description, priceRange } = generator()

    const isAuction = faker.datatype.boolean({ probability: 0.4 }) // 40% auctions
    const basePrice = parseFloat(
      faker.number
        .float({
          min: priceRange[0],
          max: priceRange[1],
          fractionDigits: 2,
        })
        .toFixed(2),
    )

    const item: any = {
      id: `item_${i + 1}`,
      title,
      description,
      category_id: category.id,
      seller_id: seller.id,
      price: basePrice,
      auction_flag: isAuction ? 1 : 0,
      status: 'active',
      quantity: faker.number.int({ min: 1, max: 10 }),
      created_at: faker.date.past({ months: 6 }).toISOString(),
      updated_at: faker.date.recent({ days: 7 }).toISOString(),
    }

    if (isAuction) {
      // Auction-specific fields
      const daysFromNow = faker.number.int({ min: 1, max: 14 })
      const endTime = new Date()
      endTime.setDate(endTime.getDate() + daysFromNow)

      item.starting_bid = parseFloat((basePrice * 0.7).toFixed(2))
      item.current_bid = parseFloat((basePrice * 0.75).toFixed(2))
      item.bid_increment = parseFloat(
        faker.number
          .float({ min: 1.0, max: 10.0, fractionDigits: 2 })
          .toFixed(2),
      )
      item.end_time = Math.floor(endTime.getTime() / 1000) // Unix timestamp
    }

    items.push(item)
  }

  return items
}

/**
 * Generate Mock Cards
 * For deterministic payment success/failure
 */
function generateMockCards() {
  const cards = []

  // Some cards always succeed, some always fail
  const cardPatterns = [
    { number: '4242 4242 4242 4242', alwaysSucceeds: 1, failureReason: null },
    {
      number: '4000 0000 0000 0002',
      alwaysSucceeds: 0,
      failureReason: 'DECLINED',
    },
    {
      number: '4000 0000 0000 9995',
      alwaysSucceeds: 0,
      failureReason: 'INSUFFICIENT_FUNDS',
    },
    { number: '5555 5555 5555 4444', alwaysSucceeds: 1, failureReason: null },
    { number: '5105 1051 0510 5100', alwaysSucceeds: 1, failureReason: null },
    {
      number: '4000 0000 0000 0069',
      alwaysSucceeds: 0,
      failureReason: 'EXPIRED_CARD',
    },
    {
      number: '4000 0000 0000 0127',
      alwaysSucceeds: 0,
      failureReason: 'INCORRECT_CVC',
    },
    {
      number: '4000 0000 0000 0119',
      alwaysSucceeds: 0,
      failureReason: 'PROCESSING_ERROR',
    },
    { number: '4111 1111 1111 1111', alwaysSucceeds: 1, failureReason: null },
    {
      number: '4000 0000 0000 0259',
      alwaysSucceeds: 0,
      failureReason: 'DECLINED',
    },
  ]

  for (let i = 0; i < NUM_MOCK_CARDS && i < cardPatterns.length; i++) {
    const pattern = cardPatterns[i]
    cards.push({
      id: i + 1,
      card_number: pattern.number,
      always_succeeds: pattern.alwaysSucceeds,
      failure_reason: pattern.failureReason,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    })
  }

  return cards
}

/**
 * Main generation function
 */
function generateAllData() {
  console.log('🚀 Starting auction data generation...')
  console.log(`📊 Seed: ${SEED}`)

  // Generate data
  console.log('📦 Generating categories...')
  const categories = generateCategories()

  console.log('👥 Generating sellers...')
  const sellers = generateSellers()

  console.log('🤖 Generating agents...')
  const agents = generateAgents()

  console.log('🛍️  Generating items...')
  const items = generateItems(categories, sellers)

  console.log('💳 Generating mock cards...')
  const mockCards = generateMockCards()

  // Write to JSON files
  console.log('💾 Writing data to files...')

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mock-categories.json'),
    JSON.stringify(categories, null, 2),
  )

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mock-sellers.json'),
    JSON.stringify(sellers, null, 2),
  )

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mock-agents.json'),
    JSON.stringify(agents, null, 2),
  )

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mock-items.json'),
    JSON.stringify(items, null, 2),
  )

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mock-cards.json'),
    JSON.stringify(mockCards, null, 2),
  )

  // Generate summary
  const summary = {
    generatedAt: new Date().toISOString(),
    seed: SEED,
    counts: {
      categories: categories.length,
      sellers: sellers.length,
      agents: agents.length,
      items: items.length,
      auctionItems: items.filter((i: any) => i.auction_flag === 1).length,
      buyNowItems: items.filter((i: any) => i.auction_flag === 0).length,
      mockCards: mockCards.length,
    },
    files: [
      'mock-categories.json',
      'mock-sellers.json',
      'mock-agents.json',
      'mock-items.json',
      'mock-cards.json',
    ],
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
  )

  console.log('✅ Data generation complete!')
  console.log('\n📊 Summary:')
  console.log(`   Categories: ${summary.counts.categories}`)
  console.log(`   Sellers: ${summary.counts.sellers}`)
  console.log(`   Agents: ${summary.counts.agents}`)
  console.log(`   Items: ${summary.counts.items}`)
  console.log(`   - Auction items: ${summary.counts.auctionItems}`)
  console.log(`   - Buy-now items: ${summary.counts.buyNowItems}`)
  console.log(`   Mock Cards: ${summary.counts.mockCards}`)
  console.log(`\n📁 Files saved to: ${OUTPUT_DIR}`)
}

// Run if executed directly
if (require.main === module) {
  generateAllData()
}

export {
  generateAllData,
  generateCategories,
  generateSellers,
  generateAgents,
  generateItems,
  generateMockCards,
}
