// Copyright (c) Meta Platforms, Inc. and affiliates.
import { types, Instance, SnapshotOut, SnapshotIn } from 'mobx-state-tree'

export interface SelectedDevice {
  id: number
  name: string
  deviceType: string
  roomName?: string
  order: number
  actionType: 'turn_on' | 'turn_off'
}

export interface AutomationEditData {
  automationName: string
  automationDescription: string
  selectedTriggerType: string | null
  selectedTime: string
  repeatType: 'daily' | 'weekdays' | 'custom'
  selectedDays: string[]
  geofenceRadius: number
  geofenceTrigger: 'enter' | 'leave'
  selectedDevices: SelectedDevice[]
  deviceSearchQuery: string
  showDevicePicker: boolean
  showTimePicker: boolean
  selectedHour: number
  selectedMinute: number
  isFormValid: boolean
  lastUpdated?: number
  automationId?: string
}

export const AutomationEditStore = types
  .model('AutomationEditStore', {
    loading: types.optional(types.boolean, false),
    automationName: types.optional(types.string, ''),
    automationDescription: types.optional(types.string, ''),
    selectedTriggerType: types.maybeNull(types.string),
    selectedTime: types.optional(types.string, '09:00'),
    repeatType: types.optional(
      types.enumeration(['daily', 'weekdays', 'custom']),
      'daily',
    ),
    selectedDays: types.optional(types.array(types.string), []),
    geofenceRadius: types.optional(types.number, 100),
    geofenceTrigger: types.optional(
      types.enumeration(['enter', 'leave']),
      'enter',
    ),
    selectedDevices: types.optional(
      types.array(types.frozen<SelectedDevice>()),
      [],
    ),
    deviceSearchQuery: types.optional(types.string, ''),
    showDevicePicker: types.optional(types.boolean, false),
    showTimePicker: types.optional(types.boolean, false),
    selectedHour: types.optional(types.number, 9),
    selectedMinute: types.optional(types.number, 0),
    sessionId: types.optional(types.string, ''),
    isSessionActive: types.optional(types.boolean, false),
    lastUpdated: types.optional(types.number, 0),
    automationId: types.optional(types.string, ''),
    isEditMode: types.optional(types.boolean, false),
    originalAutomationData: types.optional(types.frozen(), null),
    dataLoaded: types.optional(types.boolean, false),
  })
  .views(self => ({
    get isFormValid(): boolean {
      return (
        self.automationName.trim() !== '' &&
        self.selectedTriggerType !== null &&
        self.selectedDevices.length > 0
      )
    },
    get automationEditData(): AutomationEditData {
      return {
        automationName: self.automationName,
        automationDescription: self.automationDescription,
        selectedTriggerType: self.selectedTriggerType,
        selectedTime: self.selectedTime,
        repeatType: self.repeatType,
        selectedDays: self.selectedDays.slice(),
        geofenceRadius: self.geofenceRadius,
        geofenceTrigger: self.geofenceTrigger,
        selectedDevices: self.selectedDevices.slice(),
        deviceSearchQuery: self.deviceSearchQuery,
        showDevicePicker: self.showDevicePicker,
        showTimePicker: self.showTimePicker,
        selectedHour: self.selectedHour,
        selectedMinute: self.selectedMinute,
        isFormValid: (self as any).isFormValid,
        lastUpdated: self.lastUpdated,
        automationId: self.automationId,
      }
    },
    get isEmpty(): boolean {
      return (
        self.automationName === '' &&
        self.automationDescription === '' &&
        self.selectedTriggerType === null &&
        self.selectedDevices.length === 0 &&
        self.deviceSearchQuery === '' &&
        !self.showDevicePicker &&
        !self.showTimePicker &&
        !self.isEditMode
      )
    },
  }))
  .actions(self => ({
    setAutomationName(name: string) {
      self.automationName = name
      self.lastUpdated = Date.now()
    },
    setAutomationDescription(description: string) {
      self.automationDescription = description
      self.lastUpdated = Date.now()
    },
    setSelectedTriggerType(triggerType: string | null) {
      self.selectedTriggerType = triggerType
      self.lastUpdated = Date.now()
    },
    setSelectedTime(time: string) {
      self.selectedTime = time
      self.lastUpdated = Date.now()
    },
    setRepeatType(repeatType: 'daily' | 'weekdays' | 'custom') {
      self.repeatType = repeatType
      self.lastUpdated = Date.now()
    },
    toggleDay(day: string) {
      const index = self.selectedDays.indexOf(day)
      if (index === -1) {
        self.selectedDays.push(day)
      } else {
        self.selectedDays.splice(index, 1)
      }
      self.lastUpdated = Date.now()
    },
    setGeofenceRadius(radius: number) {
      self.geofenceRadius = radius
      self.lastUpdated = Date.now()
    },
    setGeofenceTrigger(trigger: 'enter' | 'leave') {
      self.geofenceTrigger = trigger
      self.lastUpdated = Date.now()
    },
    setSelectedHour(hour: number) {
      self.selectedHour = hour
      self.lastUpdated = Date.now()
    },
    setSelectedMinute(minute: number) {
      self.selectedMinute = minute
      self.lastUpdated = Date.now()
    },
    setShowTimePicker(show: boolean) {
      self.showTimePicker = show
      self.lastUpdated = Date.now()
    },
    confirmTime() {
      const hourStr = self.selectedHour.toString().padStart(2, '0')
      const minuteStr = self.selectedMinute.toString().padStart(2, '0')
      self.selectedTime = `${hourStr}:${minuteStr}`
      self.showTimePicker = false
      self.lastUpdated = Date.now()
    },
    addDevice(device: SelectedDevice) {
      const existingIndex = self.selectedDevices.findIndex(
        d => d.id === device.id,
      )
      if (existingIndex === -1) {
        self.selectedDevices.push(device)
        self.lastUpdated = Date.now()
      }
    },
    removeDevice(deviceId: number) {
      const index = self.selectedDevices.findIndex(d => d.id === deviceId)
      if (index !== -1) {
        self.selectedDevices.splice(index, 1)
        self.lastUpdated = Date.now()
      }
    },
    updateDeviceAction(deviceId: number, actionType: 'turn_on' | 'turn_off') {
      const deviceIndex = self.selectedDevices.findIndex(d => d.id === deviceId)
      if (deviceIndex !== -1) {
        const device = self.selectedDevices[deviceIndex]
        const updatedDevice = { ...device, actionType }
        self.selectedDevices.splice(deviceIndex, 1, updatedDevice)
        self.lastUpdated = Date.now()
      }
    },
    setDeviceSearchQuery(query: string) {
      self.deviceSearchQuery = query
      self.lastUpdated = Date.now()
    },
    setShowDevicePicker(show: boolean) {
      self.showDevicePicker = show
      self.lastUpdated = Date.now()
    },
    startSession(sessionId: string) {
      self.sessionId = sessionId
      self.isSessionActive = true
      self.lastUpdated = Date.now()
    },
    endSession() {
      self.isSessionActive = false
      self.lastUpdated = Date.now()
    },
    clearForm() {
      self.automationName = ''
      self.automationDescription = ''
      self.selectedTriggerType = null
      self.selectedTime = '09:00'
      self.repeatType = 'daily'
      self.selectedDays.clear()
      self.geofenceRadius = 100
      self.geofenceTrigger = 'enter'
      self.selectedDevices.clear()
      self.deviceSearchQuery = ''
      self.showDevicePicker = false
      self.showTimePicker = false
      self.selectedHour = 9
      self.selectedMinute = 0
      self.sessionId = ''
      self.isSessionActive = false
      self.automationId = ''
      self.isEditMode = false
      self.originalAutomationData = null
      self.dataLoaded = false
      self.lastUpdated = 0
    },
    restoreFromSession(sessionData: AutomationEditData) {
      self.automationName = sessionData.automationName || ''
      self.automationDescription = sessionData.automationDescription || ''
      self.selectedTriggerType = sessionData.selectedTriggerType || null
      self.selectedTime = sessionData.selectedTime || '09:00'
      self.repeatType = sessionData.repeatType || 'daily'
      self.selectedDays.replace(sessionData.selectedDays || [])
      self.geofenceRadius = sessionData.geofenceRadius || 100
      self.geofenceTrigger = sessionData.geofenceTrigger || 'enter'
      self.selectedDevices.replace(sessionData.selectedDevices || [])
      self.deviceSearchQuery = sessionData.deviceSearchQuery || ''
      self.showDevicePicker = sessionData.showDevicePicker || false
      self.showTimePicker = sessionData.showTimePicker || false
      self.selectedHour = sessionData.selectedHour || 9
      self.selectedMinute = sessionData.selectedMinute || 0
      self.automationId = sessionData.automationId || ''
      self.lastUpdated = sessionData.lastUpdated || Date.now()
    },
    saveToSession(): AutomationEditData {
      const data = self.automationEditData
      self.lastUpdated = Date.now()
      return data
    },
    reset() {
      self.loading = false
      self.automationName = ''
      self.automationDescription = ''
      self.selectedTriggerType = null
      self.selectedTime = '09:00'
      self.repeatType = 'daily'
      self.selectedDays.clear()
      self.geofenceRadius = 100
      self.geofenceTrigger = 'enter'
      self.selectedDevices.clear()
      self.deviceSearchQuery = ''
      self.showDevicePicker = false
      self.showTimePicker = false
      self.selectedHour = 9
      self.selectedMinute = 0
      self.sessionId = ''
      self.isSessionActive = false
      self.automationId = ''
      self.isEditMode = false
      self.originalAutomationData = null
      self.dataLoaded = false
      self.lastUpdated = 0
    },
    restore(data: any) {
      if (data) {
        self.automationName = data.automationName || ''
        self.automationDescription = data.automationDescription || ''
        self.selectedTriggerType = data.selectedTriggerType || null
        self.selectedTime = data.selectedTime || '09:00'
        self.repeatType = data.repeatType || 'daily'
        self.selectedDays.replace(data.selectedDays || [])
        self.geofenceRadius = data.geofenceRadius || 100
        self.geofenceTrigger = data.geofenceTrigger || 'enter'
        self.selectedDevices.replace(data.selectedDevices || [])
        self.deviceSearchQuery = data.deviceSearchQuery || ''
        self.showDevicePicker = data.showDevicePicker || false
        self.showTimePicker = data.showTimePicker || false
        self.selectedHour = data.selectedHour || 9
        self.selectedMinute = data.selectedMinute || 0
        self.sessionId = data.sessionId || ''
        self.isSessionActive = data.isSessionActive || false
        self.automationId = data.automationId || ''
        self.isEditMode = data.isEditMode || false
        self.originalAutomationData = data.originalAutomationData || null
        self.dataLoaded = data.dataLoaded || false
        self.lastUpdated = data.lastUpdated || Date.now()
      }
    },
    setEditMode(automationId: string, originalData?: any) {
      self.isEditMode = true
      self.automationId = automationId
      self.originalAutomationData = originalData || null
      self.lastUpdated = Date.now()
    },
    loadAutomationForEdit(automationData: {
      name: string
      description: string
      trigger_type: string
      trigger_value: string
      devices: SelectedDevice[]
    }) {
      self.automationName = automationData.name
      self.automationDescription = automationData.description || ''
      self.selectedTriggerType = automationData.trigger_type || null

      // Parse trigger value
      try {
        const triggerValue = JSON.parse(automationData.trigger_value || '{}')
        if (automationData.trigger_type === 'time') {
          self.selectedTime = triggerValue.time || '09:00'
          if (triggerValue.days) {
            if (triggerValue.days.length === 7) {
              self.repeatType = 'daily'
            } else if (
              triggerValue.days.length === 5 &&
              triggerValue.days.includes('mon') &&
              triggerValue.days.includes('tue') &&
              triggerValue.days.includes('wed') &&
              triggerValue.days.includes('thu') &&
              triggerValue.days.includes('fri')
            ) {
              self.repeatType = 'weekdays'
            } else {
              self.repeatType = 'custom'
              self.selectedDays.replace(triggerValue.days)
            }
          }
        } else if (automationData.trigger_type === 'geofence') {
          self.geofenceTrigger = triggerValue.trigger || 'enter'
          self.geofenceRadius = triggerValue.radius || 100
        }
      } catch (error) {
        console.error('Error parsing trigger value:', error)
      }

      self.selectedDevices.replace(automationData.devices || [])
      self.dataLoaded = true
      self.lastUpdated = Date.now()
    },
    markDataLoaded(automationId: string) {
      self.automationId = automationId
      self.dataLoaded = true
      self.lastUpdated = Date.now()
    },
  }))

export interface AutomationEditStoreModel
  extends Instance<typeof AutomationEditStore> {}
export interface AutomationEditStoreSnapshot
  extends SnapshotOut<typeof AutomationEditStore> {}
export interface AutomationEditStoreSnapshotIn
  extends SnapshotIn<typeof AutomationEditStore> {}
