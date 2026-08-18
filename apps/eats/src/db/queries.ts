// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db'
import { eq, sql, and, like, or } from 'drizzle-orm'
import {
  usersTable,
  userAddressesTable,
  restaurantsTable,
  categoriesTable,
  menuItemsTable,
  ordersTable,
  orderItemsTable,
  driversTable,
  feedbackTable,
} from './schema'

export const queries = {
  // User queries
  async getUserByEmail(email: string) {
    return await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .get()
  },
  async getUserByPhone(phoneNumber: string) {
    return await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phoneNumber, phoneNumber))
      .get()
  },
  async getUserById(userId: number) {
    return await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get()
  },
  async getAllUsers() {
    return await db.select().from(usersTable).all()
  },

  // Address queries
  async getAddressesForUser(userId: number) {
    try {
      const addresses = await db
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.userId, userId))
        .all()
      return addresses
    } catch (error) {
      console.error('Error getting addresses:', error)
      return []
    }
  },

  async updateAddresses(update: any, where: any) {
    try {
      // First, get all addresses for the user
      const addresses = await db.select().from(userAddressesTable).where(where)

      // Update each address
      for (const address of addresses) {
        await db
          .update(userAddressesTable)
          .set({
            ...update,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userAddressesTable.id, address.id))
      }
      return true
    } catch (error) {
      console.error('Error updating addresses:', error)
      return false
    }
  },

  async insertAddress(address: any) {
    try {
      // If this is a default address, first unset all other default addresses
      if (address.isDefault === 1) {
        await db
          .update(userAddressesTable)
          .set({
            isDefault: 0,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userAddressesTable.userId, address.userId))
      }

      const id = await db
        .insert(userAddressesTable)
        .values({
          ...address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning({ id: userAddressesTable.id })
        .get()
      return { success: true, id }
    } catch (error) {
      console.error('Error inserting address:', error)
      return { success: false, error }
    }
  },

  async updateAddress(addressId: number, update: any) {
    try {
      const address = await db
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId))
        .get()

      if (!address) {
        throw new Error('Address not found')
      }

      // If this is being set as default, first unset all other default addresses
      if (update.isDefault === 1) {
        await db
          .update(userAddressesTable)
          .set({
            isDefault: 0,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userAddressesTable.userId, address.userId))
      }

      const updatedAddress = {
        ...address,
        ...update,
        updatedAt: new Date().toISOString(),
      }

      await db
        .update(userAddressesTable)
        .set(updatedAddress)
        .where(eq(userAddressesTable.id, addressId))

      return { success: true }
    } catch (error) {
      console.error('Error updating address:', error)
      return { success: false, error }
    }
  },

  // Restaurant queries
  async getAllRestaurants() {
    return await db.select().from(restaurantsTable).all()
  },
  async getRestaurantById(restaurantId: number) {
    return await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, restaurantId))
      .get()
  },
  async getCategoriesForRestaurant(restaurantId: number) {
    return await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.restaurantId, restaurantId))
      .all()
  },
  async getMenuForRestaurant(restaurantId: number) {
    return await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.restaurantId, restaurantId))
      .all()
  },

  // Menu queries
  async getMenuItemById(menuItemId: number) {
    return await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItemId))
      .get()
  },
  async getMenuItemsByCategory(categoryId: number) {
    return await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.categoryId, categoryId))
      .all()
  },
  async getPopularMenuItems(restaurantId: number) {
    return await db
      .select()
      .from(menuItemsTable)
      .where(
        and(
          eq(menuItemsTable.restaurantId, restaurantId),
          eq(menuItemsTable.isPopular, 1),
        ),
      )
      .all()
  },

  // Order queries
  async getOrdersForUser(userId: number) {
    return await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .all()
  },
  async getOrderById(orderId: number) {
    return await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .get()
  },
  async getOrderItemsForOrder(orderId: number) {
    return await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId))
      .all()
  },

  // Driver queries
  async getDriverByOrderId(orderId: number) {
    return await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.orderId, orderId))
      .get()
  },

  // Feedback queries
  async getFeedbackForOrder(orderId: number) {
    return await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.orderId, orderId))
      .get()
  },
  async getFeedbackForRestaurant(restaurantId: number) {
    // Get all orders for the restaurant
    const orders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.restaurantId, restaurantId))
      .all()
    const orderIds = orders.map((o: typeof ordersTable.$inferSelect) => o.id)
    if (orderIds.length === 0) return []
    // Get all feedback for those orders
    return await db
      .select()
      .from(feedbackTable)
      .where(sql`${feedbackTable.orderId} IN (${orderIds.join(',')})`)
      .all()
  },

  // Utility: Check if DB is initialized (copied from payment app)
  async isDatabaseInitialized() {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000

    while (retryCount < maxRetries) {
      try {
        // Check if db is accessible
        if (!db) {
          console.error('Database instance is not available')
          // Optionally, try to reconnect if you have a reopenConnection function
          // await reopenConnection?.();
          await new Promise(resolve => setTimeout(resolve, 500))
          if (!db) {
            throw new Error(
              'Failed to get database instance after reconnection',
            )
          }
        }
        // Test the connection with a simple query
        const result = await db
          .select({ count: sql`count(*)` })
          .from(usersTable)
          .get()
        const isInitialized = ((result as { count: number }).count ?? 0) > 0
        return isInitialized
      } catch (error: any) {
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    return false
  },

  // Search queries
  async searchCategories(query: string) {
    return await db
      .select()
      .from(categoriesTable)
      .where(like(categoriesTable.name, `%${query}%`))
      .all()
  },

  async searchRestaurants(query: string) {
    return await db
      .select()
      .from(restaurantsTable)
      .where(
        or(
          like(restaurantsTable.name, `%${query}%`),
          like(restaurantsTable.description, `%${query}%`),
        ),
      )
      .all()
  },

  async searchMenuItems(query: string) {
    return await db
      .select()
      .from(menuItemsTable)
      .where(
        or(
          like(menuItemsTable.name, `%${query}%`),
          like(menuItemsTable.description, `%${query}%`),
        ),
      )
      .all()
  },

  async getRestaurantsByCategory(categoryId: number) {
    return await db
      .select({
        id: restaurantsTable.id,
        name: restaurantsTable.name,
        description: restaurantsTable.description,
        rating: restaurantsTable.rating,
        address: restaurantsTable.address,
        logo: restaurantsTable.logo,
        deliveryFee: restaurantsTable.deliveryFee,
        minOrder: restaurantsTable.minOrder,
        deliveryRadius: restaurantsTable.deliveryRadius,
      })
      .from(restaurantsTable)
      .innerJoin(
        categoriesTable,
        and(
          eq(categoriesTable.restaurantId, restaurantsTable.id),
          eq(categoriesTable.id, categoryId),
        ),
      )
      .all()
  },

  // Category queries
  async getCategoryById(categoryId: number) {
    return await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .get()
  },

  async insertFeedback(feedback: {
    orderId: number
    foodRating: number
    deliveryRating: number
    comment: string
    createdAt: string
  }) {
    try {
      await db.insert(feedbackTable).values(feedback)
      return { success: true }
    } catch (error) {
      console.error('Error inserting feedback:', error)
      return { success: false, error }
    }
  },
}
