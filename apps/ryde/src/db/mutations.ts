import { getDrizzle, isDatabaseReady } from '@/db'
import { eq, sql } from 'drizzle-orm'
import {
  users,
  userAddresses,
  drivers,
  rides,
  feedback,
  rideOptions,
  userPaymentMethods,
} from './schema'

import mockDrivers from '@/data/mock-drivers.json'
import mockFeedback from '@/data/mock-feedback.json'
import mockRideOptions from '@/data/mock-ride_options.json'
import mockRides from '@/data/mock-rides.json'
import mockUserAddresses from '@/data/mock-user_addresses.json'
import mockUsers from '@/data/mock-users.json'
import mockUserPaymentMethods from '@/data/mock-user_payment_methods.json'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

const bundledMocks = {
  'mock-users.json': mockUsers,
  'mock-user_addresses.json': mockUserAddresses,
  'mock-drivers.json': mockDrivers,
  'mock-feedback.json': mockFeedback,
  'mock-ride_options.json': mockRideOptions,
  'mock-rides.json': mockRides,
  'mock-user_payment_methods.json': mockUserPaymentMethods,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

// Type imports for insert shapes
// (Drizzle infers insert types as users.$inferInsert, etc.)
type UserInsert = typeof users.$inferInsert
type UserAddressInsert = typeof userAddresses.$inferInsert
type DriverInsert = typeof drivers.$inferInsert
type RideInsert = typeof rides.$inferInsert
type FeedbackInsert = typeof feedback.$inferInsert
type RideOptionInsert = typeof rideOptions.$inferInsert
type UserPaymentMethodInsert = typeof userPaymentMethods.$inferInsert

// Helper function to get mock data
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
//         case 'mock-drivers.json':
//           return mockDrivers
//         case 'mock-feedback.json':
//           return mockFeedback
//         case 'mock-ride-options.json':
//           return mockRideOptions
//         case 'mock-rides.json':
//           return mockRides
//         case 'mock-user-payment-methods.json':
//           return mockUserPaymentMethods
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

// Helper function to get database instance with error handling
const getDb = () => {
  if (!isDatabaseReady()) {
    throw new Error('Database not available - may be resetting')
  }
  const db = getDrizzle()
  if (!db) {
    throw new Error('Database not available - may be resetting')
  }
  return db
}

export const mutations = {
  async initializeDatabase() {
    try {
      // Check if database is already initialized
      const existingUsers = await getDb()
        .select({ count: sql`count(*)` })
        .from(users)
        .get()
      if (existingUsers && (existingUsers as { count: number }).count > 0) {
        return { success: true, skipped: true }
      }
      // Read mock data
      const usersData = await readJSONFile('mock-users.json')
      const userAddressesData = await readJSONFile('mock-user_addresses.json')
      const driversData = await readJSONFile('mock-drivers.json')
      const feedbackData = await readJSONFile('mock-feedback.json')
      const rideOptionsData = await readJSONFile('mock-ride_options.json')
      const ridesData = await readJSONFile('mock-rides.json')
      const userPaymentMethodsData = await readJSONFile(
        'mock-user_payment_methods.json',
      )
      if (!usersData) {
        throw new Error('Failed to load mock users data')
      }
      // Insert in transaction using batch insertions for better performance
      try {
        await getDb().transaction(async (tx: any) => {
          console.log('Inserting users...')
          // Users (independent) - batch insert
          if (usersData && usersData.length > 0) {
            await tx.insert(users).values(usersData).run()
          }

          console.log('Inserting ride options...')
          // Ride Options (independent) - batch insert with field mapping
          if (rideOptionsData && rideOptionsData.length > 0) {
            const mappedRideOptions = rideOptionsData.map((option: any) => ({
              id: option.id,
              name: option.name,
              base_fare: option.baseFare,
              rate_per_km: option.ratePerKm,
              icon: option.icon,
            }))
            await tx.insert(rideOptions).values(mappedRideOptions).run()
          }

          console.log('Inserting user addresses...')
          // User Addresses (depends on users) - batch insert
          if (userAddressesData && userAddressesData.length > 0) {
            await tx.insert(userAddresses).values(userAddressesData).run()
          }

          console.log('Inserting drivers...')
          // Drivers (depends on ride_options) - batch insert
          if (driversData && driversData.length > 0) {
            await tx.insert(drivers).values(driversData).run()
          }

          console.log('Inserting rides...')
          // Rides (depends on users and drivers) - batch insert
          if (ridesData && ridesData.length > 0) {
            await tx.insert(rides).values(ridesData).run()
          }

          console.log('Inserting user payment methods...')
          // User Payment Methods - batch insert
          if (userPaymentMethodsData && userPaymentMethodsData.length > 0) {
            await tx
              .insert(userPaymentMethods)
              .values(userPaymentMethodsData)
              .run()
          }

          console.log('Inserting feedback...')
          // Feedback (depends on rides) - batch insert
          if (feedbackData && feedbackData.length > 0) {
            await tx.insert(feedback).values(feedbackData).run()
          }
        })
        return { success: true }
      } catch (txError) {
        console.error('Transaction failed:', txError)
        throw txError
      }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  async createUser(userData: UserInsert) {
    try {
      const result = await getDb().insert(users).values(userData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user:', error)
      return { success: false, error }
    }
  },
  async createUserAddress(addressData: UserAddressInsert) {
    try {
      const result = await getDb().insert(userAddresses).values(addressData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user address:', error)
      return { success: false, error }
    }
  },
  async createDriver(driverData: DriverInsert) {
    try {
      const result = await getDb().insert(drivers).values(driverData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create driver:', error)
      return { success: false, error }
    }
  },
  async createRide(rideData: RideInsert) {
    try {
      const result = await getDb().insert(rides).values(rideData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create ride:', error)
      return { success: false, error }
    }
  },
  async createFeedback(feedbackData: FeedbackInsert) {
    try {
      const result = await getDb().insert(feedback).values(feedbackData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create feedback:', error)
      return { success: false, error }
    }
  },
  async createRideOption(rideOptionData: RideOptionInsert) {
    try {
      const result = await getDb().insert(rideOptions).values(rideOptionData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create ride option:', error)
      return { success: false, error }
    }
  },

  async createUserPaymentMethod(paymentMethodData: UserPaymentMethodInsert) {
    try {
      const result = await getDb()
        .insert(userPaymentMethods)
        .values(paymentMethodData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user payment method:', error)
      return { success: false, error }
    }
  },

  async updateUser(userId: number, userData: Partial<UserInsert>) {
    try {
      await getDb().update(users).set(userData).where(eq(users.id, userId))
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
      await getDb()
        .update(userAddresses)
        .set({
          ...addressData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userAddresses.id, addressId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user address:', error)
      return { success: false, error }
    }
  },
  async updateUserPaymentMethod(
    paymentMethodId: number,
    paymentMethodData: Partial<UserPaymentMethodInsert>,
  ) {
    try {
      await getDb()
        .update(userPaymentMethods)
        .set(paymentMethodData)
        .where(eq(userPaymentMethods.id, paymentMethodId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user payment method:', error)
      return { success: false, error }
    }
  },
  async deleteUserPaymentMethod(paymentMethodId: number) {
    try {
      await getDb()
        .delete(userPaymentMethods)
        .where(eq(userPaymentMethods.id, paymentMethodId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete user payment method:', error)
      return { success: false, error }
    }
  },
  async setDefaultUserPaymentMethod(userId: number, paymentMethodId: number) {
    try {
      await getDb().transaction(async (tx: any) => {
        // Unset other defaults for the user
        await tx
          .update(userPaymentMethods)
          .set({ isDefault: 0 })
          .where(eq(userPaymentMethods.userId, userId))

        // Set the new default
        await tx
          .update(userPaymentMethods)
          .set({ isDefault: 1 })
          .where(eq(userPaymentMethods.id, paymentMethodId))
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to set default payment method:', error)
      return { success: false, error }
    }
  },
  async deleteUserAddress(addressId: number) {
    try {
      await getDb().delete(userAddresses).where(eq(userAddresses.id, addressId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete user address:', error)
      return { success: false, error }
    }
  },
  async updateRide(rideId: number, rideData: Partial<RideInsert>) {
    try {
      await getDb().update(rides).set(rideData).where(eq(rides.id, rideId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update ride:', error)
      return { success: false, error }
    }
  },
}
