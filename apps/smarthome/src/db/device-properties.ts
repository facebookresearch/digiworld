// Device property interfaces for type safety
import { DeviceCapability } from '@/models/SmartHomeStore'

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

export interface SecurityProperties {
  is_armed?: boolean
  sensitivity?: number // 0-100
  recording_enabled?: boolean
  motion_detection?: boolean
  night_vision?: boolean
  two_way_audio?: boolean
  cloud_storage?: boolean
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

// DeviceCapability is now imported from SmartHomeStore.ts

// Helper functions to work with device properties
export const getDeviceProperty = (
  properties: string | null,
  key: string,
): any => {
  if (!properties) return null
  try {
    const props = JSON.parse(properties)
    return props[key] || null
  } catch {
    return null
  }
}

export const setDeviceProperty = (
  properties: string | null,
  key: string,
  value: any,
): string => {
  let props: Record<string, any> = {}
  if (properties) {
    try {
      props = JSON.parse(properties)
    } catch {
      props = {}
    }
  }
  props[key] = value
  return JSON.stringify(props)
}

// Helper function to check if device has specific capability
export const hasCapability = (
  capabilities: string[],
  capability: DeviceCapability,
): boolean => {
  return capabilities.includes(capability)
}

// Helper function to get device properties based on capabilities
export const getDefaultProperties = (
  capabilities: string[],
): Partial<DeviceProperties> => {
  const props: Partial<DeviceProperties> = {}

  if (hasCapability(capabilities, DeviceCapability.BRIGHTNESS)) {
    props.brightness = 50
  }

  if (hasCapability(capabilities, DeviceCapability.COLOR_TEMPERATURE)) {
    props.color_temperature = 3000
  }

  if (hasCapability(capabilities, DeviceCapability.RGB_COLORS)) {
    props.color = '#ffffff'
    props.color_mode = 'white'
  }

  if (hasCapability(capabilities, DeviceCapability.TEMPERATURE_CONTROL)) {
    props.temperature = 72
    props.target_temperature = 72
    props.humidity = 50
    props.mode = 'auto'
  }

  if (hasCapability(capabilities, DeviceCapability.FAN_SPEED)) {
    props.fan_speed = 1
  }

  if (hasCapability(capabilities, DeviceCapability.VOLUME_CONTROL)) {
    props.volume = 50
    props.is_playing = false
  }

  if (hasCapability(capabilities, DeviceCapability.MOTION_DETECTION)) {
    props.motion_detection = true
    props.sensitivity = 50
  }

  if (hasCapability(capabilities, DeviceCapability.RECORDING)) {
    props.recording_enabled = false
  }

  if (hasCapability(capabilities, DeviceCapability.NIGHT_VISION)) {
    props.night_vision = true
  }

  if (hasCapability(capabilities, DeviceCapability.OSCILLATION)) {
    props.oscillation = false
  }

  if (hasCapability(capabilities, DeviceCapability.EFFECTS)) {
    props.effects = false
  }

  if (hasCapability(capabilities, DeviceCapability.MUSIC_SYNC)) {
    props.music_sync = false
  }

  if (hasCapability(capabilities, DeviceCapability.ENERGY_MONITORING)) {
    props.energy_monitoring = true
    props.power_consumption = 0
  }

  return props
}
