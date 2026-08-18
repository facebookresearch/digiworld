import { sql, and, eq } from 'drizzle-orm'

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

// Import JSON data files
import usersData from '../data/mock-users.json'
import roomsData from '../data/mock-rooms.json'
import devicesData from '../data/mock-devices.json'
import scenesData from '../data/mock-scenes.json'
import automationsData from '../data/mock-automations.json'
import automationActionsData from '../data/mock-automation_actions.json'
import notificationsData from '../data/mock-notifications.json'
import deviceHistoryData from '../data/mock-device_history.json'
import userPreferencesData from '../data/mock-user_preferences.json'
import sceneDevicesData from '../data/mock-scene_devices.json'
import deviceTypesData from '../data/mock-device_types.json'

import { db } from './index'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

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
//       console.log(`Reading ${filename} from storage`)
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       console.log(`File ${filename} not found in storage, using bundled data`)
//       // Return bundled data based on filename
//       switch (filename) {
//         case 'users.json':
//           return usersData
//         case 'rooms.json':
//           return roomsData
//         case 'devices.json':
//           return devicesData
//         case 'scenes.json':
//           return scenesData
//         case 'automations.json':
//           return automationsData
//         case 'automation-actions.json':
//           return automationActionsData
//         case 'notifications.json':
//           return notificationsData
//         case 'device-history.json':
//           return deviceHistoryData
//         case 'user-preferences.json':
//           return userPreferencesData
//         case 'scene-devices.json':
//           return sceneDevicesData
//         case 'device-types.json':
//           return deviceTypesData
//         default:
//           console.error(`Unknown mock data file: ${filename}`)
//           return []
//       }
//     }
//   } catch (err) {
//     console.error(`Failed to load ${filename}:`, err)
//     return []
//   }
// }

const bundledMocks = {
  'mock-users.json': usersData,
  'mock-rooms.json': roomsData,
  'mock-devices.json': devicesData,
  'mock-scenes.json': scenesData,
  'mock-automations.json': automationsData,
  'mock-automation_actions.json': automationActionsData,
  'mock-notifications.json': notificationsData,
  'mock-device_history.json': deviceHistoryData,
  'mock-user_preferences.json': userPreferencesData,
  'mock-scene_devices.json': sceneDevicesData,
  'mock-device_types.json': deviceTypesData,
}
export const readJSONFile = createReadJSONFile(bundledMocks)

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      const [
        userCount,
        roomCount,
        deviceTypeCount,
        deviceCount,
        sceneCount,
        automationCount,
        notificationCount,
        deviceHistoryCount,
        userPreferenceCount,
      ] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(rooms)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(deviceTypes)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(devices)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(scenes)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(automations)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(notifications)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(deviceHistory)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(userPreferences)
          .execute(),
      ])

      if (
        userCount[0]?.count > 0 &&
        roomCount[0]?.count > 0 &&
        deviceTypeCount[0]?.count > 0 &&
        deviceCount[0]?.count > 0 &&
        sceneCount[0]?.count > 0 &&
        automationCount[0]?.count > 0 &&
        notificationCount[0]?.count > 0 &&
        deviceHistoryCount[0]?.count > 0 &&
        userPreferenceCount[0]?.count > 0
      ) {
        console.log('Database already initialized with data')
        return { success: true, skipped: true }
      }

      const clearTables = [
        'DELETE FROM automation_actions',
        'DELETE FROM automations',
        'DELETE FROM scene_devices',
        'DELETE FROM scenes',
        'DELETE FROM device_history',
        'DELETE FROM notifications',
        'DELETE FROM devices',
        'DELETE FROM device_types',
        'DELETE FROM rooms',
        'DELETE FROM user_preferences',
        'DELETE FROM users',
        'DELETE FROM sqlite_sequence',
      ]
      for (const query of clearTables) {
        await db.run(sql.raw(query))
      }

      // Load data from JSON files
      const [
        usersData,
        roomsData,
        devicesData,
        scenesData,
        automationsData,
        automationActionsData,
        notificationsData,
        deviceHistoryData,
        userPreferencesData,
        sceneDevicesData,
        deviceTypesData,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-rooms.json'),
        readJSONFile('mock-devices.json'),
        readJSONFile('mock-scenes.json'),
        readJSONFile('mock-automations.json'),
        readJSONFile('mock-automation_actions.json'),
        readJSONFile('mock-notifications.json'),
        readJSONFile('mock-device_history.json'),
        readJSONFile('mock-user_preferences.json'),
        readJSONFile('mock-scene_devices.json'),
        readJSONFile('mock-device_types.json'),
      ])

      // Batch insert device types
      console.log('Loading device types...')
      if (deviceTypesData.length > 0) {
        await db
          .insert(deviceTypes)
          .values(
            deviceTypesData.map((deviceType: any) => ({
              id: deviceType.id,
              name: deviceType.name,
              category: deviceType.category,
              subcategory: deviceType.subcategory,
              capabilities: deviceType.capabilities,
              icon: deviceType.icon,
              brand: deviceType.brand,
              model: deviceType.model,
              is_active: deviceType.isActive,
              created_at: deviceType.createdAt,
              updated_at: deviceType.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${deviceTypesData.length} device types`)
      }

      // Batch insert users
      console.log('Loading users...')
      if (usersData.length > 0) {
        await db
          .insert(users)
          .values(
            usersData.map((user: any) => ({
              id: user.id,
              email: user.email,
              username: user.username,
              password: user.password,
              avatar: user.avatar,
              bio: user.bio,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
              deleted_at: user.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${usersData.length} users`)
      }

      // Batch insert rooms
      console.log('Loading rooms...')
      if (roomsData.length > 0) {
        await db
          .insert(rooms)
          .values(
            roomsData.map((room: any) => ({
              id: room.id,
              user_id: room.userId,
              name: room.name,
              description: room.description,
              type: room.type,
              floor: room.floor,
              created_at: room.createdAt,
              updated_at: room.updatedAt,
              deleted_at: room.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${roomsData.length} rooms`)
      }

      // Batch insert devices
      console.log('Loading devices...')
      if (devicesData.length > 0) {
        await db
          .insert(devices)
          .values(
            devicesData.map((device: any) => ({
              id: device.id,
              user_id: device.userId,
              name: device.name,
              device_type_id: device.deviceTypeId,
              room_id: device.roomId,
              status: device.status,
              is_on: device.isOn,
              properties: device.properties,
              battery: device.battery,
              signal_strength: device.signalStrength,
              firmware_version: device.firmwareVersion,
              last_seen: device.last_seen,
              created_at: device.createdAt,
              updated_at: device.updatedAt,
              deleted_at: device.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${devicesData.length} devices`)
      }

      // Batch insert scenes
      console.log('Loading scenes...')
      if (scenesData.length > 0) {
        await db
          .insert(scenes)
          .values(
            scenesData.map((scene: any) => ({
              id: scene.id,
              user_id: scene.userId,
              name: scene.name,
              description: scene.description,
              icon: scene.icon,
              is_active: scene.isActive,
              created_at: scene.createdAt,
              updated_at: scene.updatedAt,
              deleted_at: scene.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${scenesData.length} scenes`)
      }

      // Batch insert scene devices
      console.log('Loading scene devices...')
      if (sceneDevicesData.length > 0) {
        await db
          .insert(sceneDevices)
          .values(
            sceneDevicesData.map((sceneDevice: any) => ({
              id: sceneDevice.id,
              scene_id: sceneDevice.sceneId,
              device_id: sceneDevice.deviceId,
              target_state: sceneDevice.targetState,
              order: sceneDevice.order,
            })),
          )
          .run()
        console.log(`Loaded ${sceneDevicesData.length} scene devices`)
      }

      // Batch insert automations
      console.log('Loading automations...')
      if (automationsData.length > 0) {
        await db
          .insert(automations)
          .values(
            automationsData.map((automation: any) => ({
              id: automation.id,
              user_id: automation.userId,
              name: automation.name,
              description: automation.description,
              trigger_type: automation.triggerType,
              trigger_value: automation.triggerValue,
              is_active: automation.isActive,
              created_at: automation.createdAt,
              updated_at: automation.updatedAt,
              deleted_at: automation.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${automationsData.length} automations`)
      }

      // Batch insert automation actions
      console.log('Loading automation actions...')
      if (automationActionsData.length > 0) {
        await db
          .insert(automationActions)
          .values(
            automationActionsData.map((action: any) => ({
              id: action.id,
              automation_id: action.automationId,
              action_type: action.actionType,
              device_id: action.deviceId,
              scene_id: action.sceneId,
              action_value: action.actionValue,
              order: action.order,
            })),
          )
          .run()
        console.log(`Loaded ${automationActionsData.length} automation actions`)
      }

      // Batch insert notifications
      console.log('Loading notifications...')
      if (notificationsData.length > 0) {
        await db
          .insert(notifications)
          .values(
            notificationsData.map((notification: any) => ({
              id: notification.id,
              user_id: notification.userId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              device_id: notification.deviceId,
              is_read: notification.isRead,
              priority: notification.priority,
              created_at: notification.createdAt,
              deleted_at: notification.deletedAt,
              read_at: notification.readAt,
            })),
          )
          .run()
        console.log(`Loaded ${notificationsData.length} notifications`)
      }

      // Batch insert device history
      console.log('Loading device history...')
      if (deviceHistoryData.length > 0) {
        await db
          .insert(deviceHistory)
          .values(
            deviceHistoryData.map((history: any) => ({
              id: history.id,
              device_id: history.deviceId,
              event_type: history.eventType,
              old_value: history.oldValue,
              new_value: history.newValue,
              timestamp: history.timestamp,
            })),
          )
          .run()
        console.log(`Loaded ${deviceHistoryData.length} device history entries`)
      }

      // Batch insert user preferences
      console.log('Loading user preferences...')
      if (userPreferencesData.length > 0) {
        await db
          .insert(userPreferences)
          .values(
            userPreferencesData.map((preference: any) => ({
              id: preference.id,
              user_id: preference.userId,
              theme: preference.theme,
              language: preference.language,
              notifications_enabled: preference.notificationsEnabled,
              geofencing_enabled: preference.geofencingEnabled,
              home_location: preference.homeLocation,
              geofence_radius: preference.geofenceRadius,
              created_at: preference.createdAt,
              updated_at: preference.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${userPreferencesData.length} user preferences`)
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },

  // User Mutations
  createUser: async (userData: {
    email: string
    username: string
    password: string
    name?: string
    avatar?: string
    bio?: string
  }) => {
    return db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateUser: async (
    userId: number,
    userData: {
      email?: string
      username?: string
      name?: string
      avatar?: string
      bio?: string
    },
  ) => {
    return db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .get()
  },

  // Room Mutations
  createRoom: async (roomData: {
    name: string
    description?: string
    type: string
    floor?: number
  }) => {
    return db
      .insert(rooms)
      .values({
        ...roomData,
        floor: roomData.floor || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateRoom: async (
    roomId: number,
    roomData: {
      name?: string
      description?: string
      type?: string
      floor?: number
    },
  ) => {
    return db
      .update(rooms)
      .set({
        ...roomData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(rooms.id, roomId))
      .returning()
      .get()
  },

  deleteRoom: async (roomId: number) => {
    await db.delete(rooms).where(eq(rooms.id, roomId))
    return { success: true }
  },

  // Device Type Mutations
  createDeviceType: async (deviceTypeData: {
    name: string
    category: string
    subcategory?: string
    capabilities?: string
    icon?: string
    brand?: string
    model?: string
  }) => {
    return db
      .insert(deviceTypes)
      .values({
        ...deviceTypeData,
        brand: deviceTypeData.brand || 'Andojo',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateDeviceType: async (
    deviceTypeId: number,
    deviceTypeData: {
      name?: string
      category?: string
      subcategory?: string
      capabilities?: string
      icon?: string
      brand?: string
      model?: string
      is_active?: boolean
    },
  ) => {
    return db
      .update(deviceTypes)
      .set({
        ...deviceTypeData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(deviceTypes.id, deviceTypeId))
      .returning()
      .get()
  },

  // Device Mutations
  createDevice: async (deviceData: {
    name: string
    device_type_id: number
    room_id?: number
    properties?: string
  }) => {
    return db
      .insert(devices)
      .values({
        ...deviceData,
        status: 'online',
        is_on: false,
        battery: 100,
        signal_strength: 100,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateDevice: async (
    deviceId: number,
    deviceData: {
      name?: string
      room_id?: number
      status?: string
      is_on?: boolean
      properties?: string
      battery?: number
      signal_strength?: number
    },
  ) => {
    return db
      .update(devices)
      .set({
        ...deviceData,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(devices.id, deviceId))
      .returning()
      .get()
  },

  toggleDevice: async (userId: number, deviceId: number) => {
    const device = await db
      .select({ is_on: devices.is_on })
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.user_id, userId)))
      .get()

    if (!device) throw new Error('Device not found')

    const newState = !device.is_on
    const now = new Date().toISOString()

    return db
      .update(devices)
      .set({ is_on: newState, last_seen: now, updated_at: now })
      .where(and(eq(devices.id, deviceId), eq(devices.user_id, userId)))
      .returning()
      .get()
  },

  // Scene Mutations
  createScene: async (sceneData: {
    name: string
    description?: string
    icon?: string
    user_id: number
  }) => {
    return db
      .insert(scenes)
      .values({
        ...sceneData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateScene: async (
    sceneId: number,
    sceneData: {
      name?: string
      description?: string
      icon?: string
      is_active?: boolean
    },
  ) => {
    return db
      .update(scenes)
      .set({
        ...sceneData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(scenes.id, sceneId))
      .returning()
      .get()
  },

  addDeviceToScene: async (sceneDeviceData: {
    scene_id: number
    device_id: number
    target_state: string
    order?: number
  }) => {
    console.log('Adding device to scene:', sceneDeviceData)
    const result = db
      .insert(sceneDevices)
      .values({
        ...sceneDeviceData,
        order: sceneDeviceData.order || 0,
      })
      .returning()
      .get()

    console.log('Device added to scene result:', result)
    return result
  },

  removeDeviceFromScene: async (sceneId: number, deviceId: number) => {
    await db
      .delete(sceneDevices)
      .where(
        and(
          eq(sceneDevices.scene_id, sceneId),
          eq(sceneDevices.device_id, deviceId),
        ),
      )
    return { success: true }
  },

  removeAllDevicesFromScene: async (sceneId: number) => {
    await db.delete(sceneDevices).where(eq(sceneDevices.scene_id, sceneId))
    return { success: true }
  },

  // Automation Mutations
  createAutomation: async (
    userId: number,
    automationData: {
      name: string
      description?: string
      trigger_type: string
      trigger_value?: string
    },
  ) => {
    console.log(
      'Mutations: Creating automation for user:',
      userId,
      'with data:',
      automationData,
    )
    const result = db
      .insert(automations)
      .values({
        ...automationData,
        user_id: userId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()

    console.log('Mutations: Automation created:', result)
    return result
  },

  updateAutomation: async (
    automationId: number,
    automationData: {
      name?: string
      description?: string
      trigger_type?: string
      trigger_value?: string
      is_active?: boolean
    },
  ) => {
    return db
      .update(automations)
      .set({
        ...automationData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(automations.id, automationId))
      .returning()
      .get()
  },

  addActionToAutomation: async (actionData: {
    automation_id: number
    action_type: string
    device_id?: number
    scene_id?: number
    action_value?: string
    order?: number
  }) => {
    console.log('Mutations: Adding action to automation:', actionData)
    const result = db
      .insert(automationActions)
      .values({
        ...actionData,
        order: actionData.order || 0,
      })
      .returning()
      .get()

    console.log('Mutations: Action added:', result)
    return result
  },

  removeActionFromAutomation: async (automationId: number, order: number) => {
    await db
      .delete(automationActions)
      .where(
        and(
          eq(automationActions.automation_id, automationId),
          eq(automationActions.order, order),
        ),
      )
    return { success: true }
  },

  deleteAutomationActions: async (automationId: number) => {
    await db
      .delete(automationActions)
      .where(eq(automationActions.automation_id, automationId))
    return { success: true }
  },

  // Notification Mutations
  createNotification: async (notificationData: {
    title: string
    message: string
    type: string
    device_id?: number
    priority?: string
  }) => {
    return db
      .insert(notifications)
      .values({
        ...notificationData,
        is_read: false,
        priority: notificationData.priority || 'medium',
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  markNotificationAsRead: async (notificationId: number) => {
    return db
      .update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.id, notificationId))
      .returning()
      .get()
  },

  // Device History Mutations
  addDeviceHistoryEntry: async (historyData: {
    device_id: number
    event_type: string
    old_value?: string
    new_value?: string
  }) => {
    return db
      .insert(deviceHistory)
      .values({
        ...historyData,
        timestamp: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  // User Preferences Mutations
  createUserPreferences: async (preferencesData: {
    user_id: number
    theme?: string
    language?: string
    notifications_enabled?: boolean
    geofencing_enabled?: boolean
    home_location?: string
    geofence_radius?: number
  }) => {
    return db
      .insert(userPreferences)
      .values({
        ...preferencesData,
        theme: preferencesData.theme || 'auto',
        language: preferencesData.language || 'en',
        notifications_enabled: preferencesData.notifications_enabled ?? true,
        geofencing_enabled: preferencesData.geofencing_enabled ?? false,
        geofence_radius: preferencesData.geofence_radius || 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateUserPreferences: async (
    userId: number,
    preferencesData: {
      theme?: string
      language?: string
      notifications_enabled?: boolean
      geofencing_enabled?: boolean
      home_location?: string
      geofence_radius?: number
    },
  ) => {
    return db
      .update(userPreferences)
      .set({
        ...preferencesData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(userPreferences.user_id, userId))
      .returning()
      .get()
  },

  toggleAutomation: async (userId: number, automationId: number) => {
    const automation = await db
      .select({ is_active: automations.is_active })
      .from(automations)
      .where(
        and(eq(automations.id, automationId), eq(automations.user_id, userId)),
      )
      .get()

    if (!automation) throw new Error('Automation not found')

    const newState = !automation.is_active
    const now = new Date().toISOString()

    const result = await db
      .update(automations)
      .set({ is_active: newState, updated_at: now })
      .where(
        and(eq(automations.id, automationId), eq(automations.user_id, userId)),
      )
      .returning()
      .get()

    return result
  },
}
