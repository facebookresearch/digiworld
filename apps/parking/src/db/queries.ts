import { db } from '@/db/index'
import {
  users,
  userLocations,
  vehicles,
  vehicleTypes,
  vehicleTypeRates,
  parkingZones,
  parkingHistory,
  paymentMethods,
  notifications,
} from './schema'
import { eq, sql, desc, and } from 'drizzle-orm'

export const requireAuth = (userId: number | null | undefined): void => {
  if (!userId) {
    throw new Error('Authentication required')
  }
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if parking app tables exist
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'user_locations', 'vehicles', 'vehicle_types', 'vehicle_type_rates', 'parking_zones', 'parking_history', 'payment_methods', 'notifications')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 9 required parking tables
    const count = result[0].count
    const hasAllTables = count === 9
    console.log(`Database has ${count} of 9 required parking tables`)

    if (!hasAllTables) {
      return false
    }

    // Check if we have at least one user (basic data check)
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .execute()

    const hasData = userCount[0]?.count > 0
    console.log(`Database has ${hasData ? 'some' : 'no'} user data`)
    return hasData
  } catch (error) {
    console.error('Error checking database initialization:', error)
    return false
  }
}

const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F =>
  (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    try {
      // @ts-ignore – preserve original type information
      return await fn(...args)
    } catch (error) {
      console.error(`Error in ${name}:`, error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error'
      throw new Error(`${name}: ${msg}`)
    }
  }) as F

// ============================================================================
// USER QUERIES
// ============================================================================

export const createUser = wrapQuery(
  async (data: {
    email: string
    password: string
    fullName?: string
    phoneNumber?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(users)
      .values({
        email: data.email,
        password: data.password,
        fullName: data.fullName ?? null,
        phoneNumber: data.phoneNumber ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()

    return inserted[0]
  },
  'createUser',
)

export const updateUserProfile = wrapQuery(
  async (
    userId: number,
    updates: Partial<{
      email: string
      password: string
      fullName: string
      phoneNumber: string
      currentPassword?: string
    }>,
  ) => {
    try {
      if (!updates || Object.keys(updates).length === 0) return null

      // For password updates, verify current password
      if (updates.password && updates.currentPassword) {
        const currentUser = await getUserById(userId)
        if (!currentUser || currentUser.password !== updates.currentPassword) {
          throw new Error('Current password is incorrect')
        }
      }

      const now = new Date().toISOString()
      const updateData = { ...updates }
      delete updateData.currentPassword // Don't store currentPassword

      const res = await db
        .update(users)
        .set({ ...updateData, updatedAt: now })
        .where(eq(users.id, userId))
        .returning()
        .execute()
      return res[0] || null
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  },
  'updateUserProfile',
)

export const getUserById = wrapQuery(async (userId: number) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}, 'getUserById')

export const login = wrapQuery(async (email: string, password: string) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .where(eq(users.password, password))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}, 'login')

export const getAllUsers = wrapQuery(async () => {
  return await db.select().from(users).execute()
}, 'getAllUsers')

// ============================================================================
// USER LOCATION QUERIES
// ============================================================================

export const createUserLocation = wrapQuery(
  async (data: {
    userId: number
    label?: string
    address: string
    latitude?: number
    longitude?: number
    isDefault?: number
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(userLocations)
      .values({
        userId: data.userId,
        label: data.label ?? null,
        address: data.address,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isDefault: data.isDefault ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createUserLocation',
)

export const getUserLocationsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.userId, userId))
    .orderBy(desc(userLocations.createdAt))
    .execute()
}, 'getUserLocationsByUserId')

export const getUserLocationById = wrapQuery(async (locationId: number) => {
  const res = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.id, locationId))
    .execute()
  return res[0] || null
}, 'getUserLocationById')

export const updateUserLocation = wrapQuery(
  async (
    locationId: number,
    updates: Partial<{
      label: string
      address: string
      latitude: number
      longitude: number
      isDefault: number
    }>,
  ) => {
    const now = new Date().toISOString()
    const res = await db
      .update(userLocations)
      .set({ ...updates, updatedAt: now })
      .where(eq(userLocations.id, locationId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updateUserLocation',
)

export const deleteUserLocation = wrapQuery(async (locationId: number) => {
  await db
    .delete(userLocations)
    .where(eq(userLocations.id, locationId))
    .execute()
}, 'deleteUserLocation')

// ============================================================================
// VEHICLE TYPE QUERIES
// ============================================================================

export const createVehicleType = wrapQuery(
  async (data: { code: string; name: string; description?: string }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(vehicleTypes)
      .values({
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        createdAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createVehicleType',
)

export const getVehicleTypes = wrapQuery(async () => {
  return await db.select().from(vehicleTypes).execute()
}, 'getVehicleTypes')

export const getVehicleTypeById = wrapQuery(async (vehicleTypeId: number) => {
  const res = await db
    .select()
    .from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId))
    .execute()
  return res[0] || null
}, 'getVehicleTypeById')

export const getVehicleTypeByCode = wrapQuery(async (code: string) => {
  const res = await db
    .select()
    .from(vehicleTypes)
    .where(eq(vehicleTypes.code, code))
    .execute()
  return res[0] || null
}, 'getVehicleTypeByCode')

// ============================================================================
// VEHICLE TYPE RATE QUERIES
// ============================================================================

export const createVehicleTypeRate = wrapQuery(
  async (data: {
    vehicleTypeId: number
    ratePerHour: number
    currency?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(vehicleTypeRates)
      .values({
        vehicleTypeId: data.vehicleTypeId,
        ratePerHour: data.ratePerHour,
        currency: data.currency ?? 'USD',
        createdAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createVehicleTypeRate',
)

export const getVehicleTypeRates = wrapQuery(async () => {
  return await db.select().from(vehicleTypeRates).execute()
}, 'getVehicleTypeRates')

export const getVehicleTypeRateByVehicleTypeId = wrapQuery(
  async (vehicleTypeId: number) => {
    const res = await db
      .select()
      .from(vehicleTypeRates)
      .where(eq(vehicleTypeRates.vehicleTypeId, vehicleTypeId))
      .execute()
    return res[0] || null
  },
  'getVehicleTypeRateByVehicleTypeId',
)

export const updateVehicleTypeRate = wrapQuery(
  async (
    rateId: number,
    updates: Partial<{
      ratePerHour: number
      currency: string
    }>,
  ) => {
    const res = await db
      .update(vehicleTypeRates)
      .set(updates)
      .where(eq(vehicleTypeRates.id, rateId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updateVehicleTypeRate',
)

// ============================================================================
// VEHICLE QUERIES
// ============================================================================

export const createVehicle = wrapQuery(
  async (data: {
    userId: number
    vehicleTypeId: number
    plateNumber: string
    nickname?: string
    make?: string
    model?: string
    color?: string
    year?: number
    isDefault?: number
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(vehicles)
      .values({
        userId: data.userId,
        vehicleTypeId: data.vehicleTypeId,
        plateNumber: data.plateNumber,
        nickname: data.nickname ?? null,
        make: data.make ?? null,
        model: data.model ?? null,
        color: data.color ?? null,
        year: data.year ?? null,
        isDefault: data.isDefault ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createVehicle',
)

export const getVehiclesByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .orderBy(desc(vehicles.createdAt))
    .execute()
}, 'getVehiclesByUserId')

export const getVehicleById = wrapQuery(async (vehicleId: number) => {
  const res = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .execute()
  return res[0] || null
}, 'getVehicleById')

export const getVehicleByPlateNumber = wrapQuery(
  async (plateNumber: string) => {
    const res = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plateNumber, plateNumber))
      .execute()
    return res[0] || null
  },
  'getVehicleByPlateNumber',
)

export const updateVehicle = wrapQuery(
  async (
    vehicleId: number,
    updates: Partial<{
      nickname: string
      make: string
      model: string
      color: string
      year: number
      isDefault: number
    }>,
  ) => {
    const now = new Date().toISOString()
    const res = await db
      .update(vehicles)
      .set({ ...updates, updatedAt: now })
      .where(eq(vehicles.id, vehicleId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updateVehicle',
)

export const deleteVehicle = wrapQuery(async (vehicleId: number) => {
  // First, delete ALL parking history records for this vehicle
  // Note: This function should only be called after validation that there are no active sessions
  // The validation happens in ParkingStore.deleteVehicleWithValidation before calling this
  await db
    .delete(parkingHistory)
    .where(eq(parkingHistory.vehicleId, vehicleId))
    .execute()

  // Now delete the vehicle (should succeed since all history records are deleted)
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId)).execute()
}, 'deleteVehicle')

// ============================================================================
// PARKING ZONE QUERIES
// ============================================================================

export const createParkingZone = wrapQuery(
  async (data: {
    name: string
    latitude: number
    longitude: number
    description?: string
    zoneCode?: string
    operator?: string
    zoneType?: string
    capacity?: number
    rateMultiplier?: number
    isActive?: number
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(parkingZones)
      .values({
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description ?? null,
        zoneCode: data.zoneCode ?? null,
        operator: data.operator ?? null,
        zoneType: data.zoneType ?? null,
        capacity: data.capacity ?? null,
        rateMultiplier: data.rateMultiplier ?? 1.0,
        isActive: data.isActive ?? 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createParkingZone',
)

export const getParkingZones = wrapQuery(async () => {
  return await db.select().from(parkingZones).execute()
}, 'getParkingZones')

export const getParkingZoneById = wrapQuery(async (zoneId: number) => {
  const res = await db
    .select()
    .from(parkingZones)
    .where(eq(parkingZones.id, zoneId))
    .execute()
  return res[0] || null
}, 'getParkingZoneById')

export const getActiveParkingZones = wrapQuery(async () => {
  return await db
    .select()
    .from(parkingZones)
    .where(eq(parkingZones.isActive, 1))
    .execute()
}, 'getActiveParkingZones')

export const updateParkingZone = wrapQuery(
  async (
    zoneId: number,
    updates: Partial<{
      name: string
      description: string
      latitude: number
      longitude: number
      zoneCode: string
      operator: string
      zoneType: string
      capacity: number
      rateMultiplier: number
      isActive: number
    }>,
  ) => {
    const now = new Date().toISOString()
    const res = await db
      .update(parkingZones)
      .set({ ...updates, updatedAt: now })
      .where(eq(parkingZones.id, zoneId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updateParkingZone',
)

// ============================================================================
// PARKING HISTORY QUERIES
// ============================================================================

export const createParkingHistory = wrapQuery(
  async (data: {
    userId: number
    vehicleId: number
    parkingZoneId: number
    startTime: string
    plannedEndTime: string
    plannedDurationMinutes: number
    chargedAmount: number
    status?: string
    currency?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(parkingHistory)
      .values({
        userId: data.userId,
        vehicleId: data.vehicleId,
        parkingZoneId: data.parkingZoneId,
        startTime: data.startTime,
        plannedEndTime: data.plannedEndTime,
        plannedDurationMinutes: data.plannedDurationMinutes,
        chargedAmount: data.chargedAmount,
        status: data.status ?? 'active',
        currency: data.currency ?? 'USD',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createParkingHistory',
)

export const getParkingHistoryByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(parkingHistory)
    .where(eq(parkingHistory.userId, userId))
    .orderBy(desc(parkingHistory.createdAt))
    .execute()
}, 'getParkingHistoryByUserId')

export const getParkingHistoryById = wrapQuery(async (historyId: number) => {
  const res = await db
    .select()
    .from(parkingHistory)
    .where(eq(parkingHistory.id, historyId))
    .execute()
  return res[0] || null
}, 'getParkingHistoryById')

export const getParkingHistoryByZoneId = wrapQuery(async (zoneId: number) => {
  return await db
    .select()
    .from(parkingHistory)
    .where(eq(parkingHistory.parkingZoneId, zoneId))
    .orderBy(desc(parkingHistory.createdAt))
    .execute()
}, 'getParkingHistoryByZoneId')

export const getActiveParkingHistoryByUserId = wrapQuery(
  async (userId: number) => {
    return await db
      .select()
      .from(parkingHistory)
      .where(
        and(
          eq(parkingHistory.userId, userId),
          sql`status IN ('booked', 'active', 'ongoing')`,
        ),
      )
      .orderBy(desc(parkingHistory.createdAt))
      .execute()
  },
  'getActiveParkingHistoryByUserId',
)

export const updateParkingHistory = wrapQuery(
  async (
    historyId: number,
    updates: Partial<{
      plannedEndTime: string
      plannedDurationMinutes: number
      actualEndTime: string
      actualDurationMinutes: number
      chargedAmount: number
      status: string
    }>,
  ) => {
    const now = new Date().toISOString()
    const res = await db
      .update(parkingHistory)
      .set({ ...updates, updatedAt: now })
      .where(eq(parkingHistory.id, historyId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updateParkingHistory',
)

// ============================================================================
// PAYMENT METHOD QUERIES
// ============================================================================

export const createPaymentMethod = wrapQuery(
  async (data: {
    userId: number
    type: string
    cardNumber: string
    lastFour: string
    expiryMonth?: number
    expiryYear?: number
    provider?: string
    displayName?: string
    isDefault?: number
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(paymentMethods)
      .values({
        userId: data.userId,
        type: data.type,
        cardNumber: data.cardNumber,
        lastFour: data.lastFour,
        expiryMonth: data.expiryMonth ?? null,
        expiryYear: data.expiryYear ?? null,
        provider: data.provider ?? null,
        displayName: data.displayName ?? null,
        isDefault: data.isDefault ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createPaymentMethod',
)

export const getPaymentMethodsByUserId = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.createdAt))
    .execute()
}, 'getPaymentMethodsByUserId')

export const getPaymentMethodById = wrapQuery(
  async (paymentMethodId: number) => {
    const res = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .execute()
    return res[0] || null
  },
  'getPaymentMethodById',
)

export const updatePaymentMethod = wrapQuery(
  async (
    paymentMethodId: number,
    updates: Partial<{
      type: string
      cardNumber: string
      lastFour: string
      expiryMonth: number
      expiryYear: number
      provider: string
      displayName: string
      isDefault: number
    }>,
  ) => {
    const now = new Date().toISOString()
    const res = await db
      .update(paymentMethods)
      .set({ ...updates, updatedAt: now })
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning()
      .execute()
    return res[0] || null
  },
  'updatePaymentMethod',
)

export const deletePaymentMethod = wrapQuery(
  async (paymentMethodId: number) => {
    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .execute()
  },
  'deletePaymentMethod',
)

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

export const createNotification = wrapQuery(
  async (data: {
    userId: number
    notificationType: string
    title: string
    message: string
    relatedParkingHistoryId?: number
    expiresAt?: string
  }) => {
    const now = new Date().toISOString()
    const inserted = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        relatedParkingHistoryId: data.relatedParkingHistoryId ?? null,
        createdAt: now,
        expiresAt: data.expiresAt ?? null,
      })
      .returning()
      .execute()
    return inserted[0]
  },
  'createNotification',
)

export const getAllNotifications = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0),
        sql`(read_at IS NULL OR read_at = '')`,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .execute()
}, 'getAllNotifications')

export const getUnreadNotifications = wrapQuery(async (userId: number) => {
  return await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0),
        sql`(expires_at IS NULL OR expires_at > datetime('now'))`,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .execute()
}, 'getUnreadNotifications')

export const getNotificationById = wrapQuery(async (notificationId: number) => {
  const res = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .execute()
  return res[0] || null
}, 'getNotificationById')

export const markNotificationAsRead = wrapQuery(
  async (notificationId: number) => {
    const now = new Date().toISOString()
    await db
      .update(notifications)
      .set({ isRead: 1, readAt: now })
      .where(eq(notifications.id, notificationId))
      .execute()
  },
  'markNotificationAsRead',
)

export const deleteNotification = wrapQuery(async (notificationId: number) => {
  await db
    .delete(notifications)
    .where(eq(notifications.id, notificationId))
    .execute()
}, 'deleteNotification')

// ============================================================================
// EXPORTS
// ============================================================================

export const queries = {
  // Database
  isDatabaseInitialized,

  // Users
  createUser,
  updateUserProfile,
  getUserById,
  login,
  getAllUsers,

  // User Locations
  createUserLocation,
  getUserLocationsByUserId,
  getUserLocationById,
  updateUserLocation,
  deleteUserLocation,

  // Vehicle Types
  createVehicleType,
  getVehicleTypes,
  getVehicleTypeById,
  getVehicleTypeByCode,

  // Vehicle Type Rates
  createVehicleTypeRate,
  getVehicleTypeRates,
  getVehicleTypeRateByVehicleTypeId,
  updateVehicleTypeRate,

  // Vehicles
  createVehicle,
  getVehiclesByUserId,
  getVehicleById,
  getVehicleByPlateNumber,
  updateVehicle,
  deleteVehicle,

  // Parking Zones
  createParkingZone,
  getParkingZones,
  getParkingZoneById,
  getActiveParkingZones,
  updateParkingZone,

  // Parking History
  createParkingHistory,
  getParkingHistoryByUserId,
  getParkingHistoryById,
  getParkingHistoryByZoneId,
  getActiveParkingHistoryByUserId,
  updateParkingHistory,

  // Payment Methods
  createPaymentMethod,
  getPaymentMethodsByUserId,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod,

  // Notifications
  createNotification,
  getAllNotifications,
  getUnreadNotifications,
  getNotificationById,
  markNotificationAsRead,
  deleteNotification,
}
