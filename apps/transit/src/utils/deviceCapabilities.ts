// Copyright (c) Meta Platforms, Inc. and affiliates.
import { DeviceCapability, DeviceType } from '@/models/SmartHomeStore'

// Utility functions for working with device capabilities and properties

/**
 * Get all available capabilities for a device type
 */
export function getDeviceCapabilities(
  deviceTypeId: number,
): DeviceCapability[] {
  const capabilitiesMap: Record<DeviceType, DeviceCapability[]> = {
    [DeviceType.SMART_BULB]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.BRIGHTNESS,
      DeviceCapability.COLOR_TEMPERATURE,
      DeviceCapability.RGB_COLORS,
      DeviceCapability.SCHEDULING,
    ],
    [DeviceType.SMART_SWITCH]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.SCHEDULING,
      DeviceCapability.ENERGY_MONITORING,
    ],
    [DeviceType.SMART_PLUG]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.SCHEDULING,
      DeviceCapability.ENERGY_MONITORING,
    ],
    [DeviceType.SECURITY_CAMERA]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.MOTION_DETECTION,
      DeviceCapability.NIGHT_VISION,
      DeviceCapability.TWO_WAY_AUDIO,
      DeviceCapability.RECORDING,
      DeviceCapability.CLOUD_STORAGE,
    ],
    [DeviceType.SMART_AC]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.TEMPERATURE_CONTROL,
      DeviceCapability.MODE_SELECTION,
      DeviceCapability.FAN_SPEED,
      DeviceCapability.SCHEDULING,
      DeviceCapability.ENERGY_MONITORING,
    ],
    [DeviceType.SMART_FAN]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.FAN_SPEED,
      DeviceCapability.OSCILLATION,
      DeviceCapability.SCHEDULING,
    ],
    [DeviceType.SMART_SPEAKER]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.VOLUME_CONTROL,
      DeviceCapability.MUSIC_PLAYBACK,
      DeviceCapability.VOICE_ASSISTANT,
      DeviceCapability.BLUETOOTH,
    ],
    [DeviceType.LED_STRIP]: [
      DeviceCapability.ON_OFF,
      DeviceCapability.BRIGHTNESS,
      DeviceCapability.RGB_COLORS,
      DeviceCapability.EFFECTS,
      DeviceCapability.MUSIC_SYNC,
    ],
  }
  return capabilitiesMap[deviceTypeId as DeviceType] || []
}

/**
 * Validate if a property is valid for a device type
 */
export function isValidProperty(
  deviceTypeId: number,
  propertyKey: string,
): boolean {
  const capabilities = getDeviceCapabilities(deviceTypeId)
  return (
    capabilities.includes(propertyKey as DeviceCapability) ||
    // Special cases for security devices
    (deviceTypeId === DeviceType.SECURITY_CAMERA &&
      ['is_armed', 'sensitivity', 'recording_enabled'].includes(propertyKey))
  )
}
/**
 * Stringify device properties with validation
 */
export function stringifyDeviceProperties(
  properties: Record<string, any>,
  deviceTypeId: number,
): string {
  // Filter out invalid properties
  const validProperties: Record<string, any> = {}
  Object.keys(properties).forEach(key => {
    if (isValidProperty(deviceTypeId, key)) {
      validProperties[key] = properties[key]
    }
  })

  return JSON.stringify(validProperties)
}

/**
 * Get capability display name
 */
export function getCapabilityDisplayName(capability: DeviceCapability): string {
  const displayNames: Record<DeviceCapability, string> = {
    [DeviceCapability.ON_OFF]: 'On/Off',
    [DeviceCapability.SCHEDULING]: 'Scheduling',
    [DeviceCapability.ENERGY_MONITORING]: 'Energy Monitoring',
    [DeviceCapability.BRIGHTNESS]: 'Brightness Control',
    [DeviceCapability.COLOR_TEMPERATURE]: 'Color Temperature',
    [DeviceCapability.RGB_COLORS]: 'RGB Colors',
    [DeviceCapability.EFFECTS]: 'Effects',
    [DeviceCapability.MUSIC_SYNC]: 'Music Sync',
    [DeviceCapability.TEMPERATURE_CONTROL]: 'Temperature Control',
    [DeviceCapability.MODE_SELECTION]: 'Mode Selection',
    [DeviceCapability.FAN_SPEED]: 'Fan Speed',
    [DeviceCapability.OSCILLATION]: 'Oscillation',
    [DeviceCapability.MOTION_DETECTION]: 'Motion Detection',
    [DeviceCapability.NIGHT_VISION]: 'Night Vision',
    [DeviceCapability.TWO_WAY_AUDIO]: 'Two-Way Audio',
    [DeviceCapability.RECORDING]: 'Recording',
    [DeviceCapability.CLOUD_STORAGE]: 'Cloud Storage',
    [DeviceCapability.VOLUME_CONTROL]: 'Volume Control',
    [DeviceCapability.MUSIC_PLAYBACK]: 'Music Playback',
    [DeviceCapability.VOICE_ASSISTANT]: 'Voice Assistant',
    [DeviceCapability.BLUETOOTH]: 'Bluetooth',
  }
  return displayNames[capability] || capability
}
