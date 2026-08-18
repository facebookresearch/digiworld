type DeviceTypeMetadata = {
  category?: string | null
  icon?: string | null
  capabilities?: string[] | string | null
}

// Utility functions for working with device capabilities and properties

/**
 * Get all available capabilities for a device type
 */
export function parseDeviceCapabilities(
  deviceType?: DeviceTypeMetadata | null,
): string[] {
  if (!deviceType?.capabilities) {
    return []
  }

  if (Array.isArray(deviceType.capabilities)) {
    return deviceType.capabilities
      .map(cap => String(cap).trim())
      .filter(Boolean)
  }

  try {
    const parsed = JSON.parse(deviceType.capabilities)
    return Array.isArray(parsed) ? parsed.map(cap => String(cap).trim()) : []
  } catch {
    const capString = deviceType.capabilities.replace(/[[\]"]/g, '')
    return capString
      .split(',')
      .map(cap => cap.trim())
      .filter(Boolean)
  }
}

/**
 * Validate if a property is valid for a device type
 */
export function isValidProperty(
  deviceType: DeviceTypeMetadata | null | undefined,
  propertyKey: string,
): boolean {
  const capabilities = parseDeviceCapabilities(deviceType)
  return (
    capabilities.includes(propertyKey) ||
    // Special cases for security devices
    (deviceType?.category === 'security' &&
      ['is_armed', 'sensitivity', 'recording_enabled'].includes(propertyKey))
  )
}

export function getDeviceIconName(
  deviceType?: DeviceTypeMetadata | null,
): string {
  const iconMap: Record<string, string> = {
    bulb: 'bulb',
    switch: 'toggle',
    plug: 'flash',
    strip: 'flashlight',
    ac: 'snow',
    fan: 'leaf',
    speaker: 'volume-high',
    camera: 'camera',
    lighting: 'bulb',
    temperature: 'thermometer',
    security: 'camera',
    audio: 'volume-high',
  }

  if (deviceType?.icon && iconMap[deviceType.icon]) {
    return iconMap[deviceType.icon]
  }

  return iconMap[deviceType?.category || ''] || 'hardware-chip'
}
/**
 * Stringify device properties with validation
 */
export function stringifyDeviceProperties(
  properties: Record<string, any>,
  deviceType: DeviceTypeMetadata | null | undefined,
): string {
  // Filter out invalid properties
  const validProperties: Record<string, any> = {}
  Object.keys(properties).forEach(key => {
    if (isValidProperty(deviceType, key)) {
      validProperties[key] = properties[key]
    }
  })

  return JSON.stringify(validProperties)
}

export function getCapabilityDisplayName(capability: string): string {
  const displayNames: Record<string, string> = {
    on_off: 'On/Off',
    scheduling: 'Scheduling',
    energy_monitoring: 'Energy Monitoring',
    brightness: 'Brightness Control',
    color_temperature: 'Color Temperature',
    rgb_colors: 'RGB Colors',
    effects: 'Effects',
    music_sync: 'Music Sync',
    temperature_control: 'Temperature Control',
    mode_selection: 'Mode Selection',
    fan_speed: 'Fan Speed',
    oscillation: 'Oscillation',
    motion_detection: 'Motion Detection',
    night_vision: 'Night Vision',
    two_way_audio: 'Two-Way Audio',
    recording: 'Recording',
    cloud_storage: 'Cloud Storage',
    volume_control: 'Volume Control',
    music_playback: 'Music Playback',
    voice_assistant: 'Voice Assistant',
    bluetooth: 'Bluetooth',
  }
  return displayNames[capability] || capability
}
