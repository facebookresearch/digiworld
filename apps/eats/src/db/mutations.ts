import { db } from '@/db'
import { eq, sql } from 'drizzle-orm'
import {
  categoriesTable,
  driversTable,
  feedbackTable,
  menuItemsTable,
  orderItemsTable,
  ordersTable,
  restaurantsTable,
  userAddressesTable,
  usersTable,
} from './schema'

// Import mock data directly
import mockCategories from '@/data/mock-categories.json'
import mockDrivers from '@/data/mock-drivers.json'
import mockFeedback from '@/data/mock-feedback.json'
import mockMenuItems from '@/data/mock-menu_items.json'
import mockOrderItems from '@/data/mock-order_items.json'
import mockOrders from '@/data/mock-orders.json'
import mockRestaurants from '@/data/mock-restaurants.json'
import mockUserAddresses from '@/data/mock-user_addresses.json'
import mockUsers from '@/data/mock-users.json'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

// Type imports for insert shapes
type UserInsert = typeof usersTable.$inferInsert
type UserAddressInsert = typeof userAddressesTable.$inferInsert
type RestaurantInsert = typeof restaurantsTable.$inferInsert
type CategoryInsert = typeof categoriesTable.$inferInsert
type MenuItemInsert = typeof menuItemsTable.$inferInsert
type OrderInsert = typeof ordersTable.$inferInsert
type OrderItemInsert = typeof orderItemsTable.$inferInsert
type DriverInsert = typeof driversTable.$inferInsert
type FeedbackInsert = typeof feedbackTable.$inferInsert
const bundledMocks = {
  'mock-users.json': mockUsers,
  'mock-user_addresses.json': mockUserAddresses,
  'mock-restaurants.json': mockRestaurants,
  'mock-categories.json': mockCategories,
  'mock-menu_items.json': mockMenuItems,
  'mock-orders.json': mockOrders,
  'mock-order_items.json': mockOrderItems,
  'mock-drivers.json': mockDrivers,
  'mock-feedback.json': mockFeedback,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

// // Helper function to get mock data
// async function readJSONFile(filename: string) {
//   try {
//     const baseDir = Platform.select({
//       android: `${RNFS.ExternalDirectoryPath}/mockdata`,
//       ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
//       default: '',
//     })
//     const filePath = `${baseDir}/${filename}`
//     const exists = await RNFS.exists(filePath)
//     if (exists) {
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       // If file doesn't exist in storage, use imported mock data
//       switch (filename) {
//         case 'mock-users.json':
//           return mockUsers
//         case 'mock-user-addresses.json':
//           return mockUserAddresses
//         case 'mock-restaurants.json':
//           return mockRestaurants
//         case 'mock-categories.json':
//           return mockCategories
//         case 'mock-menu-items.json':
//           return mockMenuItems
//         case 'mock-orders.json':
//           return mockOrders
//         case 'mock-order-items.json':
//           return mockOrderItems
//         case 'mock-drivers.json':
//           return mockDrivers
//         case 'mock-feedback.json':
//           return mockFeedback
//         default:
//           console.error(`Unknown mock file: ${filename}`)
//           return null
//       }
//     }
//   } catch (error) {
//     console.error(`Error accessing ${filename}:`, error)
//     return null
//   }
// }

export const mutations = {
  async initializeDatabase() {
    try {
      // Check if database is already initialized
      const existingUsers = await db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .get()
      if (existingUsers && (existingUsers as { count: number }).count > 0) {
        return { success: true, skipped: true }
      }

      // Read mock data in parallel
      const [
        users,
        userAddresses,
        restaurants,
        categories,
        menuItems,
        orders,
        orderItems,
        drivers,
        feedback,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-user_addresses.json'),
        readJSONFile('mock-restaurants.json'),
        readJSONFile('mock-categories.json'),
        readJSONFile('mock-menu_items.json'),
        readJSONFile('mock-orders.json'),
        readJSONFile('mock-order_items.json'),
        readJSONFile('mock-drivers.json'),
        readJSONFile('mock-feedback.json'),
      ])

      if (!users) {
        throw new Error('Failed to load mock users data')
      }

      // Batch insert users
      if (users.length > 0) {
        await db
          .insert(usersTable)
          .values(
            users.map((user: any) => ({
              id: user.id,
              email: user.email,
              password: user.password,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneNumber: user.phoneNumber,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              settings: user.settings,
              status: user.status,
            })),
          )
          .run()
      }

      // Batch insert user addresses
      if (userAddresses && userAddresses.length > 0) {
        await db
          .insert(userAddressesTable)
          .values(
            userAddresses.map((address: any) => ({
              id: address.id,
              userId: address.userId,
              label: address.label,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
              latitude: address.latitude,
              longitude: address.longitude,
              isDefault: address.isDefault ? 1 : 0,
              createdAt: address.createdAt,
              updatedAt: address.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert restaurants
      if (restaurants && restaurants.length > 0) {
        await db
          .insert(restaurantsTable)
          .values(
            restaurants.map((restaurant: any) => ({
              id: restaurant.id,
              name: restaurant.name,
              description: restaurant.description,
              address: restaurant.address,
              phone: restaurant.phone,
              rating: restaurant.rating,
              deliveryTime: restaurant.deliveryTime,
              deliveryFee: restaurant.deliveryFee,
              minOrder: restaurant.minOrder,
              isOpen: restaurant.isOpen,
              createdAt: restaurant.createdAt,
              updatedAt: restaurant.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert categories
      if (categories && categories.length > 0) {
        await db
          .insert(categoriesTable)
          .values(
            categories.map((category: any) => ({
              id: category.id,
              restaurantId: category.restaurantId,
              name: category.name,
              description: category.description,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert menu items
      if (menuItems && menuItems.length > 0) {
        await db
          .insert(menuItemsTable)
          .values(
            menuItems.map((item: any) => ({
              id: item.id,
              restaurantId: item.restaurantId,
              categoryId: item.categoryId,
              name: item.name,
              description: item.description,
              price: item.price,
              calories: item.calories,
              isPopular: item.isPopular,
              isActive: item.isActive,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert orders
      if (orders && orders.length > 0) {
        await db
          .insert(ordersTable)
          .values(
            orders.map((order: any) => ({
              id: order.id,
              userId: order.userId,
              restaurantId: order.restaurantId,
              addressId: order.addressId,
              status: order.status,
              total: order.total,
              deliveryAddress: order.deliveryAddress,
              paymentMethod: order.paymentMethod,
              specialInstructions: order.specialInstructions,
              cutlery: order.cutlery ? 1 : 0,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert order items
      if (orderItems && orderItems.length > 0) {
        await db
          .insert(orderItemsTable)
          .values(
            orderItems.map((item: any) => ({
              id: item.id,
              orderId: item.orderId,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              specialInstructions: item.specialInstructions,
            })),
          )
          .run()
      }

      // Batch insert drivers
      if (drivers && drivers.length > 0) {
        await db
          .insert(driversTable)
          .values(
            drivers.map((driver: any) => ({
              id: driver.id,
              orderId: driver.orderId,
              name: driver.name,
              phone: driver.phone,
              vehicle: driver.vehicle,
              assignedAt: driver.assignedAt,
            })),
          )
          .run()
      }

      // Batch insert feedback
      if (feedback && feedback.length > 0) {
        await db
          .insert(feedbackTable)
          .values(
            feedback.map((fb: any) => ({
              id: fb.id,
              orderId: fb.orderId,
              foodRating: fb.foodRating,
              deliveryRating: fb.deliveryRating,
              comment: fb.comment,
              createdAt: fb.createdAt,
            })),
          )
          .run()
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  async createUser(userData: UserInsert) {
    try {
      const result = await db.insert(usersTable).values(userData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user:', error)
      return { success: false, error }
    }
  },
  async createUserAddress(addressData: UserAddressInsert) {
    try {
      const result = await db.insert(userAddressesTable).values(addressData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user address:', error)
      return { success: false, error }
    }
  },
  async createRestaurant(restaurantData: RestaurantInsert) {
    try {
      const result = await db.insert(restaurantsTable).values(restaurantData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create restaurant:', error)
      return { success: false, error }
    }
  },
  async createCategory(categoryData: CategoryInsert) {
    try {
      const result = await db.insert(categoriesTable).values(categoryData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create category:', error)
      return { success: false, error }
    }
  },
  async createMenuItem(menuItemData: MenuItemInsert) {
    try {
      const result = await db.insert(menuItemsTable).values(menuItemData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create menu item:', error)
      return { success: false, error }
    }
  },
  async createOrder(orderData: OrderInsert) {
    try {
      const result = await db.insert(ordersTable).values(orderData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create order:', error)
      return { success: false, error }
    }
  },
  async createOrderItem(orderItemData: OrderItemInsert) {
    try {
      const result = await db.insert(orderItemsTable).values(orderItemData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create order item:', error)
      return { success: false, error }
    }
  },
  async createDriver(driverData: DriverInsert) {
    try {
      const result = await db.insert(driversTable).values(driverData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create driver:', error)
      return { success: false, error }
    }
  },
  async createFeedback(feedbackData: FeedbackInsert) {
    try {
      const result = await db.insert(feedbackTable).values(feedbackData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create feedback:', error)
      return { success: false, error }
    }
  },
  async updateUser(userId: number, userData: Partial<UserInsert>) {
    try {
      await db.update(usersTable).set(userData).where(eq(usersTable.id, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user:', error)
      return { success: false, error }
    }
  },
  async updateUserAddress(
    addressId: number,
    addressData: Partial<UserAddressInsert>,
  ) {
    try {
      await db
        .update(userAddressesTable)
        .set({
          ...addressData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userAddressesTable.id, addressId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user address:', error)
      return { success: false, error }
    }
  },
  async deleteUserAddress(addressId: number) {
    try {
      await db
        .delete(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete user address:', error)
      return { success: false, error }
    }
  },
  async updateOrder(orderId: number, orderData: Partial<OrderInsert>) {
    try {
      await db
        .update(ordersTable)
        .set(orderData)
        .where(eq(ordersTable.id, orderId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update order:', error)
      return { success: false, error }
    }
  },
}
