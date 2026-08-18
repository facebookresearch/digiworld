// Copyright (c) Meta Platforms, Inc. and affiliates.
import { getDrizzle, isDatabaseReady } from '@/db'
import { eq, sql, and } from 'drizzle-orm'
import {
  users,
  userAddresses,
  drivers,
  rides,
  feedback,
  rideOptions,
  userPaymentMethods,
} from './schema'

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

export const queries = {
  // User queries
  async getUserByEmail(email: string) {
    return await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get()
  },
  async getUserByPhone(phoneNumber: string) {
    return await getDb()
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .get()
  },
  async getUserById(userId: number) {
    return await getDb().select().from(users).where(eq(users.id, userId)).get()
  },
  async getAllUsers() {
    return await getDb().select().from(users).all()
  },

  // Address queries
  async getAddressesForUser(userId: number) {
    return await getDb()
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId))
      .all()
  },
  async getAddressById(addressId: number) {
    return await getDb()
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.id, addressId))
      .get()
  },
  async getDefaultAddressForUser(userId: number) {
    return await getDb()
      .select()
      .from(userAddresses)
      .where(
        and(eq(userAddresses.userId, userId), eq(userAddresses.isDefault, 1)),
      )
      .get()
  },

  // Driver queries
  async getDriverById(driverId: number) {
    return await getDb()
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .get()
  },
  async getAllDrivers() {
    return await getDb().select().from(drivers).all()
  },
  async getDriversByRideOption(rideOptionId: number) {
    return await getDb()
      .select()
      .from(drivers)
      .where(eq(drivers.rideOptionId, rideOptionId))
      .all()
  },

  // Ride queries
  async getRideById(rideId: number) {
    return await getDb().select().from(rides).where(eq(rides.id, rideId)).get()
  },
  async getRidesForUser(userId: number) {
    return await getDb()
      .select()
      .from(rides)
      .where(eq(rides.userId, userId))
      .all()
  },
  async getRidesForDriver(driverId: number) {
    return await getDb()
      .select()
      .from(rides)
      .where(eq(rides.driverId, driverId))
      .all()
  },
  async getAllRides() {
    return await getDb().select().from(rides).all()
  },

  // Feedback queries
  async getFeedbackById(feedbackId: number) {
    return await getDb()
      .select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId))
      .get()
  },
  async getFeedbackForRide(rideId: number) {
    return await getDb()
      .select()
      .from(feedback)
      .where(eq(feedback.rideId, rideId))
      .all()
  },
  async getAllFeedback() {
    return await getDb().select().from(feedback).all()
  },

  // Ride Option queries
  async getRideOptionById(rideOptionId: number) {
    return await getDb()
      .select()
      .from(rideOptions)
      .where(eq(rideOptions.id, rideOptionId))
      .get()
  },
  async getAllRideOptions() {
    return await getDb().select().from(rideOptions).all()
  },

  // Payment Method queries
  async getPaymentMethodsForUser(userId: number) {
    return await getDb()
      .select()
      .from(userPaymentMethods)
      .where(eq(userPaymentMethods.userId, userId))
      .all()
  },
  async getPaymentMethodById(paymentMethodId: number) {
    return await getDb()
      .select()
      .from(userPaymentMethods)
      .where(eq(userPaymentMethods.id, paymentMethodId))
      .get()
  },
  async getDefaultPaymentMethodForUser(userId: number) {
    return await getDb()
      .select()
      .from(userPaymentMethods)
      .where(
        and(
          eq(userPaymentMethods.userId, userId),
          eq(userPaymentMethods.isDefault, 1),
        ),
      )
      .get()
  },

  // Utility: Check if DB is initialized
  async isDatabaseInitialized() {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000
    while (retryCount < maxRetries) {
      try {
        const db = getDb()
        const result = await db
          .select({ count: sql`count(*)` })
          .from(users)
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
}
