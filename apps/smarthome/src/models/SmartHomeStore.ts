// Copyright (c) Meta Platforms, Inc. and affiliates.
import { flow, SnapshotOut, types } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { parseDeviceCapabilities } from '@/utils/deviceCapabilities'

export enum DeviceCategory {
  LIGHTING = 'lighting',
  TEMPERATURE = 'temperature',
  SECURITY = 'security',
  AUDIO = 'audio',
}

export enum RoomType {
  LIVING_ROOM = 'living_room',
  BEDROOM = 'bedroom',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  OFFICE = 'office',
  GARAGE = 'garage',
  DINING_ROOM = 'dining_room',
  GUEST_ROOM = 'guest_room',
  LAUNDRY_ROOM = 'laundry_room',
  BASEMENT = 'basement',
  ATTIC = 'attic',
  BALCONY = 'balcony',
  PATIO = 'patio',
  GARDEN = 'garden',
  OTHER = 'other',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
}

export enum AutomationTriggerType {
  TIME = 'time',
  MOTION = 'motion',
  TEMPERATURE = 'temperature',
  MANUAL = 'manual',
}

// Device Capabilities Enums
export enum DeviceCapability {
  // Basic capabilities
  ON_OFF = 'on_off',
  SCHEDULING = 'scheduling',
  ENERGY_MONITORING = 'energy_monitoring',

  // Lighting capabilities
  BRIGHTNESS = 'brightness',
  COLOR_TEMPERATURE = 'color_temperature',
  RGB_COLORS = 'rgb_colors',
  EFFECTS = 'effects',
  MUSIC_SYNC = 'music_sync',

  // Temperature capabilities
  TEMPERATURE_CONTROL = 'temperature_control',
  MODE_SELECTION = 'mode_selection',
  FAN_SPEED = 'fan_speed',
  OSCILLATION = 'oscillation',

  // Security capabilities
  MOTION_DETECTION = 'motion_detection',
  NIGHT_VISION = 'night_vision',
  TWO_WAY_AUDIO = 'two_way_audio',
  RECORDING = 'recording',
  CLOUD_STORAGE = 'cloud_storage',

  // Audio capabilities
  VOLUME_CONTROL = 'volume_control',
  MUSIC_PLAYBACK = 'music_playback',
  VOICE_ASSISTANT = 'voice_assistant',
  BLUETOOTH = 'bluetooth',
}

// Device Property Types
export interface LightingProperties {
  brightness?: number // 0-100
  color_temperature?: number // Kelvin (2200-6500)
  color?: string // Hex color (#ffffff)
  color_mode?: 'white' | 'color' | 'scene'
  effects?: boolean // Special effects enabled
  music_sync?: boolean // Music synchronization
}

export interface TemperatureProperties {
  temperature?: number // Current temperature
  target_temperature?: number // Desired temperature
  humidity?: number // Humidity percentage (0-100)
  fan_speed?: number // 1-5 levels
  mode?: 'heat' | 'cool' | 'auto' | 'fan_only' | 'dry'
  oscillation?: boolean // Fan oscillation
}

export interface SecurityProperties {
  is_armed?: boolean
  sensitivity?: number // 0-100
  recording_enabled?: boolean
  motion_detection?: boolean
  night_vision?: boolean
  two_way_audio?: boolean
  cloud_storage?: boolean
}

export interface AudioProperties {
  volume?: number // 0-100
  source?: string // Bluetooth, HDMI ARC, etc.
  is_playing?: boolean
  volume_control?: boolean
  music_playback?: boolean
  voice_assistant?: boolean
  bluetooth?: boolean
  hdmi_arc?: boolean
}

export interface EnergyProperties {
  power_consumption?: number // Watts
  energy_monitoring?: boolean
  usage_hours?: number // Hours of usage
}

export interface DeviceProperties {
  // Lighting properties
  brightness?: number
  color_temperature?: number
  color?: string
  color_mode?: 'white' | 'color' | 'scene'
  effects?: boolean
  music_sync?: boolean

  // Temperature properties
  temperature?: number
  target_temperature?: number
  humidity?: number
  fan_speed?: number
  mode?: 'heat' | 'cool' | 'auto' | 'fan_only' | 'dry'
  oscillation?: boolean

  // Audio properties
  volume?: number
  source?: string
  is_playing?: boolean
  volume_control?: boolean
  music_playback?: boolean
  voice_assistant?: boolean
  bluetooth?: boolean
  hdmi_arc?: boolean

  // Security properties
  is_armed?: boolean
  sensitivity?: number
  recording_enabled?: boolean
  motion_detection?: boolean
  night_vision?: boolean
  two_way_audio?: boolean
  cloud_storage?: boolean

  // Energy properties
  power_consumption?: number
  energy_monitoring?: boolean
  usage_hours?: number

  // Outdoor specific
  outdoor_rated?: boolean
}

// Use proper types from database schema
export interface Device {
  id: number
  user_id: number
  name: string
  device_type_id: number
  room_id?: number
  status: 'online' | 'offline' | 'error'
  is_on?: boolean
  properties?: string
  battery?: number
  signal_strength?: number
  firmware_version?: string
  last_seen: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  deviceType?: {
    name: string
    category: string
    subcategory?: string
    icon?: string
    brand: string
  }
  room?: {
    id: number
    name: string
  }
}

export interface Room {
  id: number
  user_id: number
  name: string
  description?: string
  type: RoomType
  floor?: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Scene {
  id: number
  user_id: number
  name: string
  description?: string
  icon?: string
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
  deviceCount?: number
  devices?: {
    device_id: number
    target_state: string
    order: number
  }[]
}

export interface Automation {
  id: number
  user_id: number
  name: string
  description?: string
  trigger_type: 'time' | 'motion' | 'temperature' | 'manual' | 'geofence'
  trigger_value?: string
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
  deviceCount?: number
  actions?: {
    device_id?: number
    scene_id?: number
    action_type: 'device_control' | 'scene_execution' | 'notification'
    action_value?: string
    order: number
  }[]
}

export const RoomModel = types.model('Room', {
  id: types.identifierNumber,
  user_id: types.number,
  name: types.string,
  description: types.maybeNull(types.string),
  type: types.string, // or enum if you have RoomType defined
  floor: types.maybeNull(types.number),
  created_at: types.string,
  updated_at: types.string,
  deleted_at: types.maybeNull(types.string),
})

export const DeviceTypeModel = types.model('DeviceType', {
  id: types.identifierNumber,
  name: types.string,
  category: types.string,
  subcategory: types.maybeNull(types.string),
  icon: types.maybeNull(types.string),
  brand: types.string,
  model: types.maybeNull(types.string),
  capabilities: types.maybeNull(types.string), // JSON string of capabilities array
  is_active: types.maybe(types.boolean),
  created_at: types.maybeNull(types.string),
  updated_at: types.maybeNull(types.string),
})

export const DeviceModel = types.model('Device', {
  id: types.identifierNumber,
  user_id: types.number,
  name: types.string,
  device_type_id: types.number,
  room_id: types.maybeNull(types.number),
  status: types.enumeration(['online', 'offline', 'error']),
  is_on: types.maybe(types.boolean),
  properties: types.maybeNull(types.string),
  battery: types.maybe(types.number),
  signal_strength: types.maybe(types.number),
  firmware_version: types.maybeNull(types.string),
  last_seen: types.string,
  created_at: types.string,
  updated_at: types.string,
  deleted_at: types.maybeNull(types.string),
  deviceType: types.maybeNull(DeviceTypeModel),
  room: types.maybeNull(
    types.model({
      id: types.number,
      name: types.string,
    }),
  ),
})

export const SceneDeviceModel = types.model('SceneDevice', {
  device_id: types.number,
  target_state: types.string,
  order: types.number,
})

export const SceneModel = types.model('Scene', {
  id: types.identifierNumber,
  user_id: types.number,
  name: types.string,
  description: types.maybeNull(types.string),
  icon: types.maybeNull(types.string),
  is_active: types.boolean,
  created_at: types.string,
  updated_at: types.string,
  deleted_at: types.maybeNull(types.string),
  deviceCount: types.optional(types.number, 0),
  devices: types.optional(types.array(SceneDeviceModel), []),
})

export const AutomationActionModel = types.model('AutomationAction', {
  device_id: types.maybe(types.number),
  scene_id: types.maybe(types.number),
  action_type: types.enumeration([
    'device_control',
    'scene_execution',
    'notification',
  ]),
  action_value: types.maybe(types.string),
  order: types.number,
})

export const AutomationModel = types.model('Automation', {
  id: types.identifierNumber,
  user_id: types.number,
  name: types.string,
  description: types.maybeNull(types.string),
  trigger_type: types.enumeration([
    'time',
    'motion',
    'temperature',
    'manual',
    'geofence',
  ]),
  trigger_value: types.maybe(types.string),
  is_active: types.boolean,
  created_at: types.string,
  updated_at: types.string,
  deleted_at: types.maybeNull(types.string),
  deviceCount: types.optional(types.number, 0),
  actions: types.optional(types.array(AutomationActionModel), []),
})

export const SmartHomeStoreModel = types
  .model('SmartHomeStore')
  .props({
    devices: types.optional(types.array(DeviceModel), []),
    rooms: types.optional(types.array(RoomModel), []),
    scenes: types.optional(types.array(SceneModel), []),
    automations: types.optional(types.array(AutomationModel), []),
    deviceTypes: types.optional(types.array(DeviceTypeModel), []),
    isLoading: types.optional(types.boolean, false),
    error: types.optional(types.string, ''),
    isDataLoaded: types.optional(types.boolean, false),
    lastLoadTime: types.optional(types.number, 0),
    currentUserId: types.optional(types.maybeNull(types.number), null),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    async loadInitialData(forceReload = false) {
      // Get current user ID from root store
      const rootStore = getRootStore(store)
      const currentUserId = rootStore.userStore.user?.id

      console.log('=== LOAD INITIAL DATA ===')
      console.log('Current user ID:', currentUserId)
      console.log('Force reload:', forceReload)

      if (!currentUserId) {
        console.warn('No authenticated user found, skipping data load')
        store.setProp('error', 'User not authenticated')
        return
      }

      // Check if user has changed
      const hasUserChanged =
        store.currentUserId !== null && store.currentUserId !== currentUserId

      // Prevent unnecessary reloads - only load if not already loaded, forced, or user changed
      const now = Date.now()
      const timeSinceLastLoad = now - store.lastLoadTime
      const shouldReload =
        forceReload ||
        !store.isDataLoaded ||
        hasUserChanged ||
        timeSinceLastLoad > 3000 // 5 seconds

      if (!shouldReload) {
        // Skipping data load - already loaded recently
        return
      }

      // If user changed, clear existing data first
      if (hasUserChanged) {
        console.log('User changed, clearing existing data...')
        store.setProp('devices', [])
        store.setProp('rooms', [])
        store.setProp('scenes', [])
        store.setProp('automations', [])
        store.setProp('deviceTypes', [])
        store.setProp('isDataLoaded', false)
      }

      store.setProp('isLoading', true)
      store.setProp('error', '')

      try {
        // Load data from database with fallback for memory issues
        const [
          roomsData,
          devicesData,
          scenesData,
          automationsData,
          deviceTypesData,
        ] = await Promise.all([
          queries.getAllRooms(currentUserId).catch(err => {
            console.warn('Failed to load rooms, using empty array:', err)
            return []
          }),
          queries.getAllDevices(currentUserId).catch(err => {
            console.warn('Failed to load devices, using empty array:', err)
            return []
          }),
          queries.getAllScenes(currentUserId).catch(err => {
            console.warn('Failed to load scenes, using empty array:', err)
            return []
          }),
          queries.getAllAutomations(currentUserId).catch(err => {
            console.warn('Failed to load automations, using empty array:', err)
            return []
          }),
          queries.getAllDeviceTypes().catch(err => {
            console.warn('Failed to load device types, using empty array:', err)
            return []
          }),
        ])

        const devices = devicesData || []
        const rooms = roomsData || []
        const scenes = scenesData || []
        const automations = automationsData || []

        // Transform device types data to ensure proper format
        const deviceTypes = deviceTypesData || []

        // Normalize device status based on is_on value
        devices.forEach((device: any) => {
          if (device.is_on !== undefined) {
            device.status = device.is_on ? 'online' : 'offline'
          }
        })

        console.log('=== DATA LOADED ===')
        console.log('Devices count:', devices.length)
        console.log('Rooms count:', rooms.length)
        console.log('Scenes count:', scenes.length)
        console.log('Automations count:', automations.length)
        console.log('Device types count:', deviceTypes.length)
        console.log('==================')

        store.setProp('devices', devices)
        store.setProp('rooms', rooms)
        store.setProp('scenes', scenes)
        store.setProp('automations', automations)
        store.setProp('deviceTypes', deviceTypes)
        store.setProp('isDataLoaded', true)
        store.setProp('lastLoadTime', now)
        store.setProp('currentUserId', currentUserId)

        rootStore.notificationStore.getNotifications()
      } catch (error) {
        store.setProp('error', 'Failed to load smart home data')
        console.error('Error loading smart home data:', error)

        // Set empty arrays as fallback
        store.setProp('devices', [])
        store.setProp('rooms', [])
        store.setProp('scenes', [])
        store.setProp('automations', [])
        store.setProp('deviceTypes', [])

        // Still mark as loaded to prevent continuous retries
        store.setProp('isDataLoaded', true)
        store.setProp('lastLoadTime', now)
      } finally {
        store.setProp('isLoading', false)
      }
    },

    // Method to force refresh data
    async refreshData() {
      await this.loadInitialData(true)
    },

    // Method to clear data (useful for logout)
    clearData() {
      store.setProp('devices', [])
      store.setProp('rooms', [])
      store.setProp('scenes', [])
      store.setProp('automations', [])
      store.setProp('deviceTypes', [])
      store.setProp('isDataLoaded', false)
      store.setProp('lastLoadTime', 0)
      store.setProp('currentUserId', null)
      store.setProp('error', '')
    },

    getDeviceTypeFromId(deviceTypeId: number): string {
      // Find device type from loaded device types
      const deviceType = store.deviceTypes.find(dt => dt.id === deviceTypeId)
      if (deviceType) {
        // Map category to icon type for UI consistency
        const categoryIconMap: Record<string, string> = {
          lighting: 'light',
          temperature: 'thermostat',
          security: 'camera',
          audio: 'audio',
        }
        return categoryIconMap[deviceType.category] || 'switch'
      }
      return 'switch' // fallback
    },

    getPropertyValue(properties: string | null, key: string): unknown {
      if (!properties) return undefined
      try {
        const props = JSON.parse(properties)
        return props[key]
      } catch {
        return undefined
      }
    },

    // Helper method to get device capabilities
    getDeviceCapabilities(deviceTypeId: number): string[] {
      const deviceType = store.deviceTypes.find(dt => dt.id === deviceTypeId)
      return parseDeviceCapabilities(deviceType)
    },

    // use flow() not async: MST actions lose context after await, yield keeps mutation inside action scope, this prevents "MobX state cannot be mutated outside an action" errors

    toggleDevice: flow(function* (this: any, deviceId: string) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id

        if (!currentUserId) {
          console.warn('No authenticated user found for device toggle')
          return
        }

        const deviceIdNum = parseInt(deviceId)
        const result = yield mutations.toggleDevice(currentUserId, deviceIdNum)

        const device = store.devices.find(d => d.id === deviceIdNum)
        if (device) {
          const oldValue = JSON.stringify({
            is_on: device.is_on,
            status: device.status,
          })
          device.is_on = result.is_on
          // Update device status based on power state
          device.status = result.is_on
            ? DeviceStatus.ONLINE
            : DeviceStatus.OFFLINE
          const description = result.is_on
            ? `${device.name} turned on. Device is now ${device.status}`
            : `${device.name} turned off. Device is now ${device.status}`
          // Add history entry for the toggle
          const newValue = JSON.stringify({
            is_on: device.is_on,
            status: device.status,
            description,
          })
          // @ts-ignore
          store.addDeviceHistoryEntry(
            deviceIdNum,
            'state_change',
            oldValue,
            newValue,
          )
        }
      } catch (error) {
        console.error('Error toggling device:', error)
        store.setProp('error', 'Failed to toggle device')
      }
    }),

    async setDeviceBrightness(deviceId: string, brightness: number) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldBrightness = properties.brightness ?? 50
        properties.brightness = Math.max(0, Math.min(100, brightness))

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for brightness change
        const oldValue = JSON.stringify({ brightness: oldBrightness })
        const description = `${device.name} brightness set to ${properties.brightness}% (previously ${oldBrightness}%)`

        // Add history entry for the toggle
        const newValue = JSON.stringify({
          brightness: properties.brightness,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device brightness:', error)
        store.setProp('error', 'Failed to set device brightness')
      }
    },

    async setDeviceTemperature(deviceId: string, temperature: number) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldTemperature = properties.temperature ?? 70
        properties.temperature = temperature

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for temperature change
        const oldValue = JSON.stringify({ temperature: oldTemperature })
        const description = `${device.name} AC set to ${properties.temperature}°F (previously ${oldTemperature}°F)`

        const newValue = JSON.stringify({
          temperature: properties.temperature,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device temperature:', error)
        store.setProp('error', 'Failed to set device temperature')
      }
    },

    async setDeviceFanSpeed(deviceId: string, fanSpeed: number) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldFanSpeed = properties.fan_speed ?? 1
        properties.fan_speed = Math.max(1, Math.min(5, fanSpeed))

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for fan speed change
        const oldValue = JSON.stringify({ fan_speed: oldFanSpeed })
        const description = `${device.name} fan speed set to ${properties.fan_speed} (previously ${oldFanSpeed})`
        const newValue = JSON.stringify({
          fan_speed: properties.fan_speed,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device fan speed:', error)
        store.setProp('error', 'Failed to set device fan speed')
      }
    },

    setDeviceVolume: flow(function* (
      this: any,
      deviceId: string,
      volume: number,
    ) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldVolume = properties.volume ?? 50
        properties.volume = Math.max(0, Math.min(100, volume))

        yield mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        device.properties = JSON.stringify(properties)

        // Add history entry for volume change
        const oldValue = JSON.stringify({ volume: oldVolume })
        const description = `${device.name} volume set to ${properties.volume} (previously ${oldVolume})`
        const newValue = JSON.stringify({
          volume: properties.volume,
          description,
        })
        // @ts-ignore
        store.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device volume:', error)
        store.setProp('error', 'Failed to set device volume')
      }
    }),

    async setDeviceMode(deviceId: string, mode: string) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldMode = properties.mode ?? 'auto'
        properties.mode = mode

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for mode change
        const oldValue = JSON.stringify({ mode: oldMode })
        const description = `${device.name} mode set to ${properties.mode} (previously ${oldMode})`
        const newValue = JSON.stringify({ mode: properties.mode, description })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device mode:', error)
        store.setProp('error', 'Failed to set device mode')
      }
    },

    async setDeviceOscillation(deviceId: string, oscillation: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldOscillation = properties.oscillation ?? 0
        properties.oscillation = oscillation ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for oscillation change
        const oldValue = JSON.stringify({ oscillation: oldOscillation })
        const description = properties.oscillation
          ? `${device.name} oscillation is now turned on`
          : `${device.name} oscillation is now turned off`
        const newValue = JSON.stringify({
          oscillation: properties.oscillation,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device oscillation:', error)
        store.setProp('error', 'Failed to set device oscillation')
      }
    },

    async setDeviceColorTemperature(
      deviceId: string,
      colorTemperature: number,
    ) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldColorTemperature = properties.color_temperature ?? 3000
        properties.color_temperature = Math.max(
          2200,
          Math.min(6500, colorTemperature),
        )

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for color temperature change
        const oldValue = JSON.stringify({
          color_temperature: oldColorTemperature,
        })
        const description = `${device.name} Chromaticity set to ${properties.color_temperature}K (previously ${oldColorTemperature}K)`

        const newValue = JSON.stringify({
          color_temperature: properties.color_temperature,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device color temperature:', error)
        store.setProp('error', 'Failed to set device color temperature')
      }
    },

    setDeviceAudioMode: flow(function* (
      this: any,
      deviceId: string,
      mode: 'music' | 'voice' | 'bluetooth',
    ) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldAudioMode = properties.audio_mode ?? 'music'
        properties.audio_mode = mode

        yield mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        device.properties = JSON.stringify(properties)

        // Add history entry for audio mode change
        const oldValue = JSON.stringify({ audio_mode: oldAudioMode })
        const description = `${device.name} audio mode set to ${properties.audio_mode} (previously ${oldAudioMode})`
        const newValue = JSON.stringify({
          audio_mode: properties.audio_mode,
          description,
        })
        // @ts-ignore
        store.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device audio mode:', error)
        store.setProp('error', 'Failed to set device audio mode')
      }
    }),

    async setDeviceColorMode(deviceId: string, colorMode: string) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldColorMode = properties.color_mode ?? 'white'
        properties.color_mode = colorMode

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for color mode change
        const oldValue = JSON.stringify({ color_mode: oldColorMode })
        const description = `${device.name} Color mode set to ${properties.color_mode} (previously ${oldColorMode})`
        const newValue = JSON.stringify({
          color_mode: properties.color_mode,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device color mode:', error)
        store.setProp('error', 'Failed to set device color mode')
      }
    },

    toggleDevicePlayback: flow(function* (this: any, deviceId: string) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldIsPlaying = properties.is_playing ?? 0
        properties.is_playing = !properties.is_playing

        yield mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        device.properties = JSON.stringify(properties)

        // Add history entry for playback toggle
        const oldValue = JSON.stringify({ is_playing: oldIsPlaying })
        const description = properties.is_playing
          ? `${device.name} playback is now turned on`
          : `${device.name} playback is now turned off`
        const newValue = JSON.stringify({
          is_playing: properties.is_playing,
          description,
        })
        // @ts-ignore
        store.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error toggling device playback:', error)
        store.setProp('error', 'Failed to toggle device playback')
      }
    }),

    async setDeviceColor(deviceId: string, color: string) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldColor = properties.color ?? '#ffffff'
        properties.color = color

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        // Update local state - create new array with updated device (since devices are frozen)
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for color change
        const oldValue = JSON.stringify({ color: oldColor })
        const description = `${device.name} Color set to ${properties.color} (previously ${oldColor})`
        const newValue = JSON.stringify({
          color: properties.color,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device color:', error)
        store.setProp('error', 'Failed to set device color')
      }
    },

    toggleSurveillanceCapability: flow(function* (
      this: any,
      deviceId: string,
      capability:
        | 'motion_detection'
        | 'night_vision'
        | 'two_way_audio'
        | 'recording'
        | 'cloud_storage',
    ) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldCapability = properties[capability] ?? 0
        properties[capability] = !properties[capability]

        yield mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        device.properties = JSON.stringify(properties)

        // Add history entry for surveillance capability toggle
        const oldValue = JSON.stringify({ [capability]: oldCapability })

        // Format capability name for description
        const capabilityName = capability
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        const description = properties[capability]
          ? `${device.name} ${capabilityName} is now enabled`
          : `${device.name} ${capabilityName} is now disabled`

        const newValue = JSON.stringify({
          [capability]: properties[capability],
          description,
        })
        // @ts-ignore
        store.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error(`Error toggling ${capability}:`, error)
        store.setProp('error', `Failed to toggle ${capability}`)
      }
    }),

    toggleAutomation: flow(function* (this: any, automationId: string) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id

        if (!currentUserId) {
          console.warn('No authenticated user found for automation toggle')
          return
        }

        const automationIdNum = parseInt(automationId)
        const automation = store.automations.find(a => a.id === automationIdNum)
        if (!automation) {
          console.warn('Automation not found:', automationIdNum)
          return
        }

        console.log('Toggling automation:', {
          id: automationIdNum,
          currentState: automation.is_active,
          newState: !automation.is_active,
        })

        // Update database first
        yield mutations.toggleAutomation(currentUserId, automationIdNum)

        // Reload automations from database to ensure UI updates
        const updatedAutomations =
          yield queries.getAllAutomations(currentUserId)
        if (updatedAutomations) {
          store.setProp('automations', updatedAutomations)
          console.log('Automations reloaded from database after toggle')
        }
      } catch (error) {
        console.error('Error toggling automation:', error)
        store.setProp('error', 'Failed to toggle automation')
      }
    }),

    getDeviceById(id: number) {
      return store.devices.find(d => d.id === id)
    },

    getDeviceTypeById(id: number) {
      return store.deviceTypes.find(dt => dt.id === id)
    },

    getDeviceTypesByCategory(category: string) {
      return store.deviceTypes.filter(dt => dt.category === category)
    },

    getDevicesByRoom(roomId: number) {
      return store.devices.filter(d => d.room?.id === roomId)
    },

    getOnlineDevices() {
      return store.devices.filter(d => d.status === DeviceStatus.ONLINE)
    },

    getActiveAutomations() {
      return store.automations.filter(a => a.is_active)
    },

    getActiveScenes() {
      return store.scenes.filter(s => s.is_active)
    },

    async setDeviceEffects(deviceId: string, effects: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldEffects = properties.effects ?? 0
        properties.effects = effects ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for effects change
        const oldValue = JSON.stringify({ effects: oldEffects })
        const description = properties.effects
          ? `${device.name} effects are now enabled`
          : `${device.name} effects are now disabled`
        const newValue = JSON.stringify({
          effects: properties.effects,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device effects:', error)
        store.setProp('error', 'Failed to set device effects')
      }
    },

    async setDeviceMusicSync(deviceId: string, musicSync: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldMusicSync = properties.music_sync ?? 0
        properties.music_sync = musicSync ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for music sync change
        const oldValue = JSON.stringify({ music_sync: oldMusicSync })
        const description = properties.effects
          ? `${device.name} Music sync is now enabled`
          : `${device.name} Music sync is now disabled`
        const newValue = JSON.stringify({
          music_sync: properties.music_sync,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device music sync:', error)
        store.setProp('error', 'Failed to set device music sync')
      }
    },

    // Energy monitoring methods for smart switches and plugs
    async toggleEnergyMonitoring(deviceId: string, enabled: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldEnergyMonitoring = properties.energy_monitoring ?? 0
        properties.energy_monitoring = enabled ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for energy monitoring change
        const oldValue = JSON.stringify({
          energy_monitoring: oldEnergyMonitoring,
        })
        const description = properties.energy_monitoring
          ? `${device.name} energy monitoring is now enabled`
          : `${device.name} energy monitoring is now disabled`
        const newValue = JSON.stringify({
          energy_monitoring: properties.energy_monitoring,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error toggling energy monitoring:', error)
        store.setProp('error', 'Failed to toggle energy monitoring')
      }
    },

    async setDeviceMotionDetection(deviceId: string, motionDetection: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldMotionDetection = properties.motion_detection ?? 0
        properties.motion_detection = motionDetection ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for motion detection change
        const oldValue = JSON.stringify({
          motion_detection: oldMotionDetection,
        })
        const description = properties.motion_detection
          ? `${device.name} motion detection is now enabled`
          : `${device.name} motion detection is now disabled`
        const newValue = JSON.stringify({
          motion_detection: properties.motion_detection,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device motion detection:', error)
        store.setProp('error', 'Failed to set device motion detection')
      }
    },
    async setDeviceScheduling(deviceId: string, scheduling: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)
        if (!device) return

        const properties = device.properties
          ? JSON.parse(device.properties)
          : {}

        const oldScheduling = properties.scheduling ?? 0
        properties.scheduling = scheduling ? 1 : 0

        await mutations.updateDevice(deviceIdNum, {
          properties: JSON.stringify(properties),
        })

        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, properties: JSON.stringify(properties) }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        // Add history entry for scheduling change
        const oldValue = JSON.stringify({ scheduling: oldScheduling })
        const description = properties.scheduling
          ? `${device.name} scheduling is now enabled`
          : `${device.name} scheduling is now disabled`
        const newValue = JSON.stringify({
          scheduling: properties.scheduling,
          description,
        })
        this.addDeviceHistoryEntry(
          deviceIdNum,
          'state_change',
          oldValue,
          newValue,
        )
      } catch (error) {
        console.error('Error setting device scheduling:', error)
        store.setProp('error', 'Failed to set device scheduling')
      }
    },

    getAudioDevices() {
      return store.devices.filter(d => {
        const deviceType = this.getDeviceTypeById(d.device_type_id)
        return deviceType?.category === 'audio'
      })
    },

    // User Preferences Methods
    async getUserPreferences() {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id
        if (!currentUserId) return null

        const preferences = await queries.getUserPreferences(currentUserId)
        return preferences
      } catch (error) {
        console.error('Error getting user preferences:', error)
        return null
      }
    },

    async updateUserPreferences(preferencesData: {
      theme?: string
      language?: string
      notificationsEnabled?: boolean
      geofencingEnabled?: boolean
      homeLocation?: string
      geofenceRadius?: number
    }) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id
        if (!currentUserId) return null

        const updatedPreferences = await queries.updateUserPreferences(
          currentUserId,
          preferencesData,
        )
        return updatedPreferences
      } catch (error) {
        console.error('Error updating user preferences:', error)
        return null
      }
    },

    // Automation Creation Methods
    async createAutomation(automationData: {
      name: string
      description?: string
      trigger_type: string
      trigger_value: string
      is_active?: boolean
    }) {
      try {
        console.log(
          'SmartHomeStore: Creating automation with data:',
          automationData,
        )
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id
        if (!currentUserId) {
          console.log('SmartHomeStore: No current user ID')
          return null
        }

        console.log('SmartHomeStore: Current user ID:', currentUserId)
        const newAutomation = await mutations.createAutomation(currentUserId, {
          name: automationData.name,
          description: automationData.description,
          trigger_type: automationData.trigger_type,
          trigger_value: automationData.trigger_value,
        })

        console.log('SmartHomeStore: Automation created:', newAutomation)

        // Refresh automations list
        await this.loadInitialData()
        return newAutomation
      } catch (error) {
        console.error('SmartHomeStore: Error creating automation:', error)
        return null
      }
    },

    async createAutomationAction(actionData: {
      automation_id: number
      action_type: string
      device_id?: number
      scene_id?: number
      action_value?: string
      order?: number
    }) {
      try {
        const newAction = await mutations.addActionToAutomation(actionData)
        return newAction
      } catch (error) {
        console.error(
          'SmartHomeStore: Error creating automation action:',
          error,
        )
        return null
      }
    },

    async updateAutomation(
      automationId: string,
      automationData: {
        name?: string
        description?: string
        trigger_type?: string
        trigger_value?: string
        is_active?: boolean
      },
    ) {
      try {
        const updatedAutomation = await mutations.updateAutomation(
          parseInt(automationId),
          automationData,
        )
        // Refresh automations list
        await this.loadInitialData()
        return updatedAutomation
      } catch (error) {
        console.error('Error updating automation:', error)
        return null
      }
    },

    async deleteAutomationActions(automationId: string) {
      try {
        await mutations.deleteAutomationActions(parseInt(automationId))
        return true
      } catch (error) {
        console.error('Error deleting automation actions:', error)
        return false
      }
    },

    // Scene Creation Methods
    async createScene(sceneData: {
      name: string
      description?: string
      icon?: string
    }) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id
        if (!currentUserId) return null

        const newScene = await mutations.createScene({
          ...sceneData,
          user_id: currentUserId,
        })

        // Refresh scenes list
        await this.loadInitialData()
        return newScene
      } catch (error) {
        console.error('Error creating scene:', error)
        return null
      }
    },

    async updateScene(
      sceneId: string,
      sceneData: {
        name?: string
        description?: string
        icon?: string
        is_active?: boolean
      },
    ) {
      try {
        const updatedScene = await mutations.updateScene(
          parseInt(sceneId),
          sceneData,
        )
        // Refresh scenes list
        await this.loadInitialData()
        return updatedScene
      } catch (error) {
        console.error('Error updating scene:', error)
        return null
      }
    },

    async addDeviceToScene(sceneDeviceData: {
      scene_id: number
      device_id: number
      target_state: string
      order?: number
    }) {
      try {
        const newSceneDevice = await mutations.addDeviceToScene(sceneDeviceData)
        return newSceneDevice
      } catch (error) {
        console.error('Error adding device to scene:', error)
        return null
      }
    },

    async removeDeviceFromScene(sceneId: number, deviceId: number) {
      try {
        await mutations.removeDeviceFromScene(sceneId, deviceId)
        return true
      } catch (error) {
        console.error('Error removing device from scene:', error)
        return false
      }
    },

    async removeAllDevicesFromScene(sceneId: string) {
      try {
        await mutations.removeAllDevicesFromScene(parseInt(sceneId))
        return true
      } catch (error) {
        console.error('Error removing all devices from scene:', error)
        return false
      }
    },

    toggleScene: flow(function* (this: any, sceneId: string) {
      try {
        const scene = store.scenes.find(s => s.id.toString() === sceneId)
        if (!scene) {
          console.warn('Scene not found:', sceneId)
          return false
        }

        console.log('Toggling scene:', {
          id: sceneId,
          currentState: scene.is_active,
          newState: !scene.is_active,
        })

        // Update database first
        yield mutations.updateScene(parseInt(sceneId), {
          is_active: !scene.is_active,
        })

        // Reload scenes from database to ensure UI updates
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id
        if (currentUserId) {
          const updatedScenes = yield queries.getAllScenes(currentUserId)
          if (updatedScenes) {
            store.setProp('scenes', updatedScenes)
            console.log('Scenes reloaded from database after toggle')
          }
        }

        return true
      } catch (error) {
        console.error('Error toggling scene:', error)
        return false
      }
    }),

    async getSceneDevices(sceneId: number) {
      try {
        const sceneDevices = await queries.getSceneWithDevices(sceneId)
        return sceneDevices?.devices || []
      } catch (error) {
        console.error('Error getting scene devices:', error)
        return []
      }
    },

    async getAutomationActions(automationId: number) {
      try {
        const actions = await queries.getAutomationWithActions(automationId)
        return actions?.actions || []
      } catch (error) {
        console.error('Error getting automation actions:', error)
        return []
      }
    },

    getRootStore() {
      return getRootStore(store)
    },

    // Device Utility Methods
    async setDeviceIsOn(deviceId: string, isOn: boolean) {
      try {
        const deviceIdNum = parseInt(deviceId)
        const device = store.devices.find(d => d.id === deviceIdNum)

        if (!device) {
          console.warn(`Device with ID ${deviceId} not found`)
          return false
        }

        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id

        if (!currentUserId) {
          console.warn('No authenticated user found for device update')
          return false
        }

        // Update device in database
        await mutations.updateDevice(deviceIdNum, {
          is_on: isOn,
          status: isOn ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
        })

        // Update local state
        const deviceIndex = store.devices.findIndex(d => d.id === deviceIdNum)
        if (deviceIndex !== -1) {
          const updatedDevices = store.devices.map((d, index) =>
            index === deviceIndex
              ? { ...d, is_on: isOn, status: isOn ? 'online' : 'offline' }
              : d,
          )
          store.setProp('devices', updatedDevices)
        }

        return true
      } catch (error) {
        console.error('Error setting device is_on:', error)
        store.setProp('error', 'Failed to set device power state')
        return false
      }
    },

    // Device History Methods
    async getDeviceHistory(deviceId: number) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id

        if (!currentUserId) {
          console.warn('No authenticated user found for device history')
          return []
        }

        const historyData = await queries.getDeviceHistory(deviceId, 100)
        return historyData
      } catch (error) {
        console.error('Error getting device history:', error)
        return []
      }
    },

    async addDeviceHistoryEntry(
      deviceId: number,
      eventType: string,
      oldValue?: string,
      newValue?: string,
    ) {
      try {
        const rootStore = getRootStore(store)
        const currentUserId = rootStore.userStore.user?.id

        if (!currentUserId) {
          console.warn('No authenticated user found for device history entry')
          return
        }

        await mutations.addDeviceHistoryEntry({
          device_id: deviceId,
          event_type: eventType,
          old_value: oldValue,
          new_value: newValue,
        })
      } catch (error) {
        console.error('Error adding device history entry:', error)
      }
    },
    restore(snapshot: any) {
      try {
        if (snapshot.error !== undefined) {
          store.setProp('error', snapshot.error || '')
        }
        if (snapshot.lastLoadTime !== undefined) {
          store.setProp('lastLoadTime', snapshot.lastLoadTime ?? 0)
        }
        if (snapshot.isDataLoaded !== undefined) {
          store.setProp('isDataLoaded', snapshot.isDataLoaded ?? false)
        }
        if (snapshot.currentUserId !== undefined) {
          store.setProp('currentUserId', snapshot.currentUserId ?? null)
        }
        if (snapshot.isLoading !== undefined) {
          store.setProp('isLoading', snapshot.isLoading ?? false)
        }

        // Restore arrays with null cleaning
        if (snapshot.devices && Array.isArray(snapshot.devices)) {
          try {
            store.devices.replace(snapshot.devices)
            console.log('SmartHomeStore: Devices restored successfully')
          } catch (error) {
            console.error('SmartHomeStore: Failed to restore devices:', error)
          }
        }

        if (snapshot.rooms && Array.isArray(snapshot.rooms)) {
          try {
            store.rooms.replace(snapshot.rooms)
            console.log('SmartHomeStore: Rooms restored successfully')
          } catch (error) {
            console.error('SmartHomeStore: Failed to restore rooms:', error)
          }
        }

        if (snapshot.scenes && Array.isArray(snapshot.scenes)) {
          try {
            store.scenes.replace(snapshot.scenes)
            console.log('SmartHomeStore: Scenes restored successfully')
          } catch (error) {
            console.error('SmartHomeStore: Failed to restore scenes:', error)
          }
        }

        if (snapshot.automations && Array.isArray(snapshot.automations)) {
          try {
            store.automations.replace(snapshot.automations)
            console.log('SmartHomeStore: Automations restored successfully')
          } catch (error) {
            console.error(
              'SmartHomeStore: Failed to restore automations:',
              error,
            )
          }
        }

        if (snapshot.deviceTypes && Array.isArray(snapshot.deviceTypes)) {
          try {
            store.deviceTypes.replace(snapshot.deviceTypes)
            console.log('SmartHomeStore: DeviceTypes restored successfully')
          } catch (error) {
            console.error(
              'SmartHomeStore: Failed to restore deviceTypes:',
              error,
            )
          }
        }

        console.log('SmartHomeStore: Restore completed successfully')
      } catch (error) {
        console.error('SmartHomeStore: Restore failed:', error)
        store.setProp('error', 'Failed to restore smart home data')
      }
    },
  }))

export interface SmartHomeStoreSnapshot
  extends SnapshotOut<typeof SmartHomeStoreModel> {}
