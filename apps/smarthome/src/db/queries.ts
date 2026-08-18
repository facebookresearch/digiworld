// Copyright (c) Meta Platforms, Inc. and affiliates.
import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

import { db } from '@/db/index'

import {
  users,
  rooms,
  deviceTypes,
  devices,
  scenes,
  sceneDevices,
  automations,
  automationActions,
  notifications,
  deviceHistory,
  userPreferences,
} from './schema'

export type User = InferSelectModel<typeof users>
export type Room = InferSelectModel<typeof rooms>
export type DeviceType = InferSelectModel<typeof deviceTypes>
export type Device = InferSelectModel<typeof devices>
export type Scene = InferSelectModel<typeof scenes>
export type SceneDevice = InferSelectModel<typeof sceneDevices>
export type Automation = InferSelectModel<typeof automations>
export type AutomationAction = InferSelectModel<typeof automationActions>
export type Notification = InferSelectModel<typeof notifications>
export type DeviceHistory = InferSelectModel<typeof deviceHistory>
export type UserPreference = InferSelectModel<typeof userPreferences>

const requireAuth = (userId: number | null | undefined): void => {
  if (!userId) {
    throw new Error('Authentication required')
  }
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if tables exist using a simpler query first
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'rooms', 'device_types', 'devices', 'scenes', 'scene_devices', 'automations', 'automation_actions', 'notifications', 'device_history', 'user_preferences')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 11 required tables
    const count = result[0].count
    const hasAllTables = count === 11
    console.log(`Database has ${count} of 11 required tables`)

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

export const registerUser = async (data: {
  email: string
  username: string
  password: string
  name?: string
}) => {
  try {
    const now = new Date().toISOString()
    const userRes = await db
      .insert(users)
      .values({ ...data, created_at: now, updated_at: now })
      .returning()
      .execute()
    const user = userRes[0]

    // Create default user preferences
    await db
      .insert(userPreferences)
      .values({
        user_id: user.id,
        theme: 'auto',
        language: 'en',
        notifications_enabled: true,
        geofencing_enabled: false,
        geofence_radius: 100,
        created_at: now,
        updated_at: now,
      })
      .execute()

    return user
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by email:', error)
    throw error
  }
}

export const getUserById = async (id: number) => {
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}
export const fetchUserById = getUserById

const fetchAllUsers = async () => {
  try {
    const res = await db.select().from(users).execute()
    return res
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw error
  }
}

export const checkEmailExists = async (
  email: string,
  excludeUserId?: number,
) => {
  try {
    let query = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))

    if (excludeUserId) {
      query = query.where(sql`${users.id} != ${excludeUserId}`)
    }

    const res = await query.execute()
    return res.length > 0
  } catch (error) {
    console.error('Error checking email existence:', error)
    throw new Error('Failed to check email availability')
  }
}

export const updateUserProfile = async (
  userId: number,
  data: {
    username?: string
    email?: string
    password?: string
    currentPassword?: string
  },
) => {
  try {
    requireAuth(userId)
    if (!data || Object.keys(data).length === 0) return null

    // For password updates, verify current password
    if (data.password && data.currentPassword) {
      const currentUser = await getUserById(userId)
      if (!currentUser || currentUser.password !== data.currentPassword) {
        throw new Error('Current password is incorrect')
      }
    }

    const now = new Date().toISOString()
    const updateData = { ...data }
    delete updateData.currentPassword // Don't store currentPassword

    const res = await db
      .update(users)
      .set({ ...updateData, updated_at: now })
      .where(eq(users.id, userId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Smart Home Queries

export const getAllRooms = async (userId: number) => {
  try {
    const res = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.user_id, userId), isNull(rooms.deleted_at)))
      .orderBy(rooms.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all rooms:', error)
    throw error
  }
}

export const getRoomsByFloor = async (userId: number, floor: number) => {
  try {
    const res = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.user_id, userId), eq(rooms.floor, floor)))
      .orderBy(rooms.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting rooms by floor:', error)
    throw error
  }
}

export const createRoom = async (
  userId: number,
  data: {
    name: string
    description?: string
    type: string
    floor?: number
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .insert(rooms)
      .values({
        ...data,
        user_id: userId,
        floor: data.floor || 1,
        created_at: now,
        updated_at: now,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating room:', error)
    throw error
  }
}

export const updateRoom = async (
  roomId: number,
  data: {
    name?: string
    description?: string
    type?: string
    floor?: number
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .update(rooms)
      .set({ ...data, updated_at: now })
      .where(eq(rooms.id, roomId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating room:', error)
    throw error
  }
}

export const deleteRoom = async (roomId: number) => {
  try {
    await db.delete(rooms).where(eq(rooms.id, roomId)).execute()
    return true
  } catch (error) {
    console.error('Error deleting room:', error)
    throw error
  }
}

export const getAllDeviceTypes = async () => {
  try {
    const res = await db
      .select()
      .from(deviceTypes)
      .where(eq(deviceTypes.is_active, true))
      .orderBy(deviceTypes.name)
      .execute()

    console.log(`Loaded ${res.length} device types from database`)
    if (res.length === 0) {
      console.warn('No device types found in database!')
    }

    return res
  } catch (error) {
    console.error('Error getting all device types:', error)
    throw error
  }
}

export const getDeviceTypesByCategory = async (category: string) => {
  try {
    const res = await db
      .select()
      .from(deviceTypes)
      .where(
        and(
          eq(deviceTypes.category, category),
          eq(deviceTypes.is_active, true),
        ),
      )
      .orderBy(deviceTypes.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting device types by category:', error)
    throw error
  }
}

export const getAllDevices = async (userId: number) => {
  try {
    // First, get devices with minimal data to avoid memory issues
    const devicesRes = await db
      .select({
        id: devices.id,
        name: devices.name,
        user_id: devices.user_id,
        device_type_id: devices.device_type_id,
        room_id: devices.room_id,
        status: devices.status,
        is_on: devices.is_on,
        battery: devices.battery,
        signal_strength: devices.signal_strength,
        last_seen: devices.last_seen,
        properties: devices.properties,
        created_at: devices.created_at,
        updated_at: devices.updated_at,
        deleted_at: devices.deleted_at,
      })
      .from(devices)
      .where(eq(devices.user_id, userId))
      .orderBy(devices.name)
      .execute()

    // Get room data separately to avoid complex joins
    const roomIds = [
      ...new Set(devicesRes.map((d: any) => d.room_id).filter(Boolean)),
    ]

    console.log('Device room IDs:', roomIds)
    console.log('User ID:', userId)

    // First, let's check what rooms exist for this user
    const allUserRooms = await db
      .select({
        id: rooms.id,
        name: rooms.name,
        type: rooms.type,
        floor: rooms.floor,
        user_id: rooms.user_id,
      })
      .from(rooms)
      .where(eq(rooms.user_id, userId))
      .execute()

    console.log(
      'All user rooms:',
      allUserRooms.map(r => ({ id: r.id, name: r.name, user_id: r.user_id })),
    )

    const roomsRes =
      roomIds.length > 0
        ? allUserRooms.filter(room => roomIds.includes(room.id))
        : []

    console.log(
      'Found rooms:',
      roomsRes.map(r => ({ id: r.id, name: r.name })),
    )

    // Get device type data separately
    const deviceTypeIds = [
      ...new Set(devicesRes.map((d: any) => d.device_type_id).filter(Boolean)),
    ]

    console.log('Device type IDs:', deviceTypeIds)

    // First, let's check what device types exist
    const allDeviceTypes = await db
      .select({
        id: deviceTypes.id,
        name: deviceTypes.name,
        category: deviceTypes.category,
        subcategory: deviceTypes.subcategory,
        capabilities: deviceTypes.capabilities,
        icon: deviceTypes.icon,
        brand: deviceTypes.brand,
        model: deviceTypes.model,
      })
      .from(deviceTypes)
      .execute()

    console.log(
      'All device types:',
      allDeviceTypes.map(dt => ({ id: dt.id, name: dt.name })),
    )

    const deviceTypesRes =
      deviceTypeIds.length > 0
        ? allDeviceTypes.filter(dt => deviceTypeIds.includes(dt.id))
        : []

    // Combine the data
    const result = devicesRes.map((device: any) => {
      const deviceType = deviceTypesRes.find(
        (dt: any) => dt.id === device.device_type_id,
      )

      // Debug logging for missing device types
      if (!deviceType) {
        console.warn(
          `Device type not found for device ${device.id} (device_type_id: ${device.device_type_id})`,
        )
        console.log(
          'Available device types:',
          deviceTypesRes.map(dt => ({ id: dt.id, name: dt.name })),
        )
      }

      return {
        ...device,
        room: (() => {
          const room =
            roomsRes.find((r: any) => r.id === device.room_id) || null
          if (device.room_id && !room) {
            console.warn(
              `Room not found for device ${device.id} (room_id: ${device.room_id})`,
            )
            console.log(
              'Available rooms:',
              roomsRes.map(r => ({ id: r.id, name: r.name })),
            )
          }
          return room
        })(),
        deviceType: deviceType || null,
      }
    })

    return result
  } catch (error) {
    console.error('Error getting all devices:', error)
    throw error
  }
}

export const getDevicesByRoom = async (roomId: number) => {
  try {
    const res = await db
      .select({
        ...devices,
        room: {
          id: rooms.id,
          name: rooms.name,
          type: rooms.type,
          floor: rooms.floor,
        },
        deviceType: {
          id: deviceTypes.id,
          name: deviceTypes.name,
          category: deviceTypes.category,
          subcategory: deviceTypes.subcategory,
          icon: deviceTypes.icon,
          brand: deviceTypes.brand,
          model: deviceTypes.model,
        },
      })
      .from(devices)
      .leftJoin(rooms, eq(devices.room_id, rooms.id))
      .leftJoin(deviceTypes, eq(devices.device_type_id, deviceTypes.id))
      .where(eq(devices.room_id, roomId))
      .orderBy(devices.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting devices by room:', error)
    throw error
  }
}

export const getDevicesByType = async (deviceTypeId: number) => {
  try {
    const res = await db
      .select({
        ...devices,
        room: {
          id: rooms.id,
          name: rooms.name,
          type: rooms.type,
          floor: rooms.floor,
        },
        deviceType: {
          id: deviceTypes.id,
          name: deviceTypes.name,
          category: deviceTypes.category,
          subcategory: deviceTypes.subcategory,
          icon: deviceTypes.icon,
          brand: deviceTypes.brand,
          model: deviceTypes.model,
        },
      })
      .from(devices)
      .leftJoin(rooms, eq(devices.room_id, rooms.id))
      .leftJoin(deviceTypes, eq(devices.device_type_id, deviceTypes.id))
      .where(eq(devices.device_type_id, deviceTypeId))
      .orderBy(devices.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting devices by type:', error)
    throw error
  }
}

export const createDevice = async (
  userId: number,
  data: {
    name: string
    deviceTypeId: number
    roomId?: number
    properties?: string
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .insert(devices)
      .values({
        name: data.name,
        device_type_id: data.deviceTypeId,
        room_id: data.roomId,
        properties: data.properties,
        user_id: userId,
        status: 'online',
        is_on: false,
        battery: 100,
        signal_strength: 100,
        last_seen: now,
        created_at: now,
        updated_at: now,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating device:', error)
    throw error
  }
}

export const updateDevice = async (
  deviceId: number,
  data: {
    name?: string
    roomId?: number
    status?: string
    is_on?: boolean
    properties?: string
    battery?: number
    signal_strength?: number
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .update(devices)
      .set({ ...data, last_seen: now, updated_at: now })
      .where(eq(devices.id, deviceId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating device:', error)
    throw error
  }
}

export const toggleDevice = async (deviceId: number) => {
  try {
    const device = await db
      .select({ is_on: devices.is_on })
      .from(devices)
      .where(eq(devices.id, deviceId))
      .execute()

    if (!device[0]) throw new Error('Device not found')

    const newState = !device[0].is_on
    const now = new Date().toISOString()

    const res = await db
      .update(devices)
      .set({ is_on: newState, last_seen: now, updated_at: now })
      .where(eq(devices.id, deviceId))
      .returning()
      .execute()

    return res[0]
  } catch (error) {
    console.error('Error toggling device:', error)
    throw error
  }
}

export const getAllScenes = async (userId: number) => {
  try {
    const scenesRes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.user_id, userId))
      .orderBy(scenes.name)
      .execute()

    console.log('Raw scenes from DB:', scenesRes)

    // Check if scene_devices table has any data
    const allSceneDevices = await db.select().from(sceneDevices).execute()

    console.log('All scene_devices records:', allSceneDevices)

    // Get device count for each scene
    const scenesWithDeviceCount = await Promise.all(
      scenesRes.map(async (scene: any) => {
        const deviceCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(sceneDevices)
          .where(eq(sceneDevices.scene_id, scene.id))
          .execute()

        const result = {
          ...scene,
          is_active: Boolean(scene.is_active), // Ensure boolean conversion
          deviceCount: deviceCount[0]?.count || 0,
        }

        // Debug logging
        console.log(
          `Scene ${scene.name} (ID: ${scene.id}) deviceCount:`,
          deviceCount[0]?.count || 0,
        )

        return result
      }),
    )

    console.log('All scenes with device counts:', scenesWithDeviceCount)

    // Additional debug: Check if we have any scenes at all
    if (scenesRes.length === 0) {
      console.log('No scenes found for user:', userId)
    } else {
      console.log(`Found ${scenesRes.length} scenes for user ${userId}`)
    }

    return scenesWithDeviceCount
  } catch (error) {
    console.error('Error getting all scenes:', error)
    throw error
  }
}

export const getSceneWithDevices = async (sceneId: number) => {
  try {
    const scene = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .execute()

    if (!scene[0]) return null

    const sceneDevicesData = await db
      .select({
        ...sceneDevices,
        deviceName: devices.name,
        deviceTypeName: deviceTypes.name,
      })
      .from(sceneDevices)
      .leftJoin(devices, eq(sceneDevices.device_id, devices.id))
      .leftJoin(deviceTypes, eq(devices.device_type_id, deviceTypes.id))
      .where(eq(sceneDevices.scene_id, sceneId))
      .orderBy(sceneDevices.order)
      .execute()

    return { ...scene[0], devices: sceneDevicesData }
  } catch (error) {
    console.error('Error getting scene with devices:', error)
    throw error
  }
}

export const createScene = async (
  userId: number,
  data: {
    name: string
    description?: string
    icon?: string
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .insert(scenes)
      .values({
        ...data,
        user_id: userId,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating scene:', error)
    throw error
  }
}

export const addDeviceToScene = async (data: {
  sceneId: number
  deviceId: number
  targetState: string
  order?: number
}) => {
  try {
    const res = await db
      .insert(sceneDevices)
      .values({
        ...data,
        order: data.order || 0,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error adding device to scene:', error)
    throw error
  }
}

export const getAllAutomations = async (userId: number) => {
  try {
    const automationsRes = await db
      .select()
      .from(automations)
      .where(eq(automations.user_id, userId))
      .orderBy(automations.name)
      .execute()

    console.log('Raw automations from DB:', automationsRes)

    // Check if automation_actions table has any data
    const allAutomationActions = await db
      .select()
      .from(automationActions)
      .execute()

    console.log('All automation_actions records:', allAutomationActions)

    // Get device count for each automation (similar to scenes)
    const automationsWithDeviceCount = await Promise.all(
      automationsRes.map(async (automation: any) => {
        const deviceCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(automationActions)
          .where(
            sql`${automationActions.automation_id} = ${automation.id} AND ${automationActions.device_id} IS NOT NULL`,
          )
          .execute()

        const result = {
          ...automation,
          is_active: Boolean(automation.is_active), // Ensure boolean conversion
          deviceCount: deviceCount[0]?.count || 0,
        }

        // Debug logging
        console.log(
          `Automation ${automation.name} (ID: ${automation.id}) deviceCount:`,
          deviceCount[0]?.count || 0,
        )

        return result
      }),
    )

    console.log(
      'All automations with device counts:',
      automationsWithDeviceCount,
    )

    // Additional debug: Check if we have any automations at all
    if (automationsRes.length === 0) {
      console.log('No automations found for user:', userId)
    } else {
      console.log(
        `Found ${automationsRes.length} automations for user ${userId}`,
      )
    }

    return automationsWithDeviceCount
  } catch (error) {
    console.error('Error getting all automations:', error)
    throw error
  }
}

export const getAutomationWithActions = async (automationId: number) => {
  try {
    const automation = await db
      .select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .execute()

    if (!automation[0]) return null

    const actions = await db
      .select({
        ...automationActions,
        deviceName: devices.name,
        sceneName: scenes.name,
      })
      .from(automationActions)
      .leftJoin(devices, eq(automationActions.device_id, devices.id))
      .leftJoin(scenes, eq(automationActions.scene_id, scenes.id))
      .where(eq(automationActions.automation_id, automationId))
      .orderBy(automationActions.order)
      .execute()

    return { ...automation[0], actions }
  } catch (error) {
    console.error('Error getting automation with actions:', error)
    throw error
  }
}

export const createAutomation = async (
  userId: number,
  data: {
    name: string
    description?: string
    trigger_type: string
    trigger_value?: string
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .insert(automations)
      .values({
        ...data,
        user_id: userId,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating automation:', error)
    throw error
  }
}

export const addActionToAutomation = async (data: {
  automation_id: number
  action_type: string
  device_id?: number
  scene_id?: number
  action_value?: string
  order?: number
}) => {
  try {
    const res = await db
      .insert(automationActions)
      .values({
        ...data,
        order: data.order || 0,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error adding action to automation:', error)
    throw error
  }
}

export const toggleAutomation = async (automationId: number) => {
  try {
    const automation = await db
      .select({ is_active: automations.is_active })
      .from(automations)
      .where(eq(automations.id, automationId))
      .execute()

    if (!automation[0]) throw new Error('Automation not found')

    const newState = !automation[0].is_active
    const now = new Date().toISOString()

    const res = await db
      .update(automations)
      .set({ is_active: newState, updated_at: now })
      .where(eq(automations.id, automationId))
      .returning()
      .execute()

    return res[0]
  } catch (error) {
    console.error('Error toggling automation:', error)
    throw error
  }
}

export const getNotifications = async (userId: number) => {
  try {
    const res = await db
      .select({
        ...notifications,
        deviceName: devices.name,
      })
      .from(notifications)
      .leftJoin(devices, eq(notifications.device_id, devices.id))
      .where(eq(notifications.user_id, userId)) // ✅ only this user's notifications
      .orderBy(desc(notifications.created_at))
      .execute()

    return res
  } catch (error) {
    console.error('Error getting notifications:', error)
    throw error
  }
}

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const res = await db
      .update(notifications)
      .set({ is_read: 1, read_at: new Date().toISOString() })
      .where(eq(notifications.id, notificationId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export const deleteNotification = async (notificationId: number) => {
  try {
    const res = await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

export const getDeviceHistory = async (deviceId: number, limit = 100) => {
  try {
    const res = await db
      .select()
      .from(deviceHistory)
      .where(eq(deviceHistory.device_id, deviceId))
      .orderBy(desc(deviceHistory.timestamp))
      .limit(limit)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting device history:', error)
    throw error
  }
}

export const addDeviceHistoryEntry = async (data: {
  deviceId: number
  eventType: string
  oldValue?: string
  newValue?: string
}) => {
  try {
    const res = await db
      .insert(deviceHistory)
      .values({
        ...data,
        timestamp: new Date().toISOString(),
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error adding device history entry:', error)
    throw error
  }
}

export const getUserPreferences = async (userId: number) => {
  try {
    const res = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user preferences:', error)
    throw error
  }
}

export const updateUserPreferences = async (
  userId: number,
  data: {
    theme?: string
    language?: string
    notificationsEnabled?: boolean
    geofencingEnabled?: boolean
    homeLocation?: string
    geofenceRadius?: number
  },
) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .update(userPreferences)
      .set({ ...data, updated_at: now })
      .where(eq(userPreferences.user_id, userId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating user preferences:', error)
    throw error
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

export const queries = {
  /* setup */ isDatabaseInitialized,
  /* user */ registerUser: wrapQuery(registerUser, 'registerUser'),
  fetchUserById: wrapQuery(fetchUserById, 'fetchUserById'),
  updateUserProfile: wrapQuery(updateUserProfile, 'updateUserProfile'),
  checkEmailExists: wrapQuery(checkEmailExists, 'checkEmailExists'),
  getUserByEmail: wrapQuery(getUserByEmail, 'getUserByEmail'),
  getUserById: wrapQuery(getUserById, 'getUserById'),
  fetchAllUsers: wrapQuery(fetchAllUsers, 'fetchAllUsers'),

  /* rooms */ getAllRooms: wrapQuery(getAllRooms, 'getAllRooms'),
  getRoomsByFloor: wrapQuery(getRoomsByFloor, 'getRoomsByFloor'),
  createRoom: wrapQuery(createRoom, 'createRoom'),
  updateRoom: wrapQuery(updateRoom, 'updateRoom'),
  deleteRoom: wrapQuery(deleteRoom, 'deleteRoom'),

  /* device types */ getAllDeviceTypes: wrapQuery(
    getAllDeviceTypes,
    'getAllDeviceTypes',
  ),
  getDeviceTypesByCategory: wrapQuery(
    getDeviceTypesByCategory,
    'getDeviceTypesByCategory',
  ),

  /* devices */ getAllDevices: wrapQuery(getAllDevices, 'getAllDevices'),
  getDevicesByRoom: wrapQuery(getDevicesByRoom, 'getDevicesByRoom'),
  getDevicesByType: wrapQuery(getDevicesByType, 'getDevicesByType'),
  createDevice: wrapQuery(createDevice, 'createDevice'),
  updateDevice: wrapQuery(updateDevice, 'updateDevice'),
  toggleDevice: wrapQuery(toggleDevice, 'toggleDevice'),

  /* scenes */ getAllScenes: wrapQuery(getAllScenes, 'getAllScenes'),
  getSceneWithDevices: wrapQuery(getSceneWithDevices, 'getSceneWithDevices'),
  createScene: wrapQuery(createScene, 'createScene'),
  addDeviceToScene: wrapQuery(addDeviceToScene, 'addDeviceToScene'),

  /* automations */ getAllAutomations: wrapQuery(
    getAllAutomations,
    'getAllAutomations',
  ),
  getAutomationWithActions: wrapQuery(
    getAutomationWithActions,
    'getAutomationWithActions',
  ),
  createAutomation: wrapQuery(createAutomation, 'createAutomation'),
  addActionToAutomation: wrapQuery(
    addActionToAutomation,
    'addActionToAutomation',
  ),
  toggleAutomation: wrapQuery(toggleAutomation, 'toggleAutomation'),

  /* notifications */ getNotifications: wrapQuery(
    getNotifications,
    'getNotifications',
  ),
  markNotificationAsRead: wrapQuery(
    markNotificationAsRead,
    'markNotificationAsRead',
  ),
  deleteNotification: wrapQuery(deleteNotification, 'deleteNotification'),
  /* device history */ getDeviceHistory: wrapQuery(
    getDeviceHistory,
    'getDeviceHistory',
  ),
  addDeviceHistoryEntry: wrapQuery(
    addDeviceHistoryEntry,
    'addDeviceHistoryEntry',
  ),

  /* user preferences */ getUserPreferences: wrapQuery(
    getUserPreferences,
    'getUserPreferences',
  ),
  updateUserPreferences: wrapQuery(
    updateUserPreferences,
    'updateUserPreferences',
  ),
}
