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

export interface SceneCreationData {
  sceneName: string
  sceneDescription: string
  selectedIcon: string | null
  selectedDevices: SelectedDevice[]
  deviceSearchQuery: string
  showDevicePicker: boolean
  isFormValid: boolean
  lastUpdated?: number
}

export const SceneCreationStore = types
  .model('SceneCreationStore', {
    loading: types.optional(types.boolean, false),
    sceneName: types.optional(types.string, ''),
    sceneDescription: types.optional(types.string, ''),
    selectedIcon: types.optional(types.string, ''),
    selectedDevices: types.optional(
      types.array(types.frozen<SelectedDevice>()),
      [],
    ),
    deviceSearchQuery: types.optional(types.string, ''),
    showDevicePicker: types.optional(types.boolean, false),
    sessionId: types.optional(types.string, ''),
    isSessionActive: types.optional(types.boolean, false),
    lastUpdated: types.optional(types.number, 0),
  })
  .views(self => ({
    get isFormValid(): boolean {
      return (
        self.sceneName.trim() !== '' &&
        self.selectedIcon !== '' &&
        self.selectedDevices.length > 0
      )
    },
    get sceneCreationData(): SceneCreationData {
      return {
        sceneName: self.sceneName,
        sceneDescription: self.sceneDescription,
        selectedIcon: self.selectedIcon,
        selectedDevices: self.selectedDevices.slice(),
        deviceSearchQuery: self.deviceSearchQuery,
        showDevicePicker: self.showDevicePicker,
        isFormValid: (self as any).isFormValid,
        lastUpdated: self.lastUpdated,
      }
    },
  }))
  .actions(self => ({
    setSceneName(name: string) {
      self.sceneName = name
      self.lastUpdated = Date.now()
    },
    setSceneDescription(description: string) {
      self.sceneDescription = description
      self.lastUpdated = Date.now()
    },
    setSelectedIcon(icon: string | null) {
      self.selectedIcon = icon || ''
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
      self.sceneName = ''
      self.sceneDescription = ''
      self.selectedIcon = ''
      self.selectedDevices.clear()
      self.deviceSearchQuery = ''
      self.showDevicePicker = false
      self.lastUpdated = Date.now()
    },
    restoreFromSession(sessionData: SceneCreationData) {
      self.sceneName = sessionData.sceneName || ''
      self.sceneDescription = sessionData.sceneDescription || ''
      self.selectedIcon = sessionData.selectedIcon || ''
      self.selectedDevices.replace(sessionData.selectedDevices || [])
      self.deviceSearchQuery = sessionData.deviceSearchQuery || ''
      self.showDevicePicker = sessionData.showDevicePicker || false
      self.lastUpdated = sessionData.lastUpdated || Date.now()
    },
    saveToSession(): SceneCreationData {
      const data = self.sceneCreationData
      self.lastUpdated = Date.now()
      return data
    },
    reset() {
      self.loading = false
      self.sceneName = ''
      self.sceneDescription = ''
      self.selectedIcon = ''
      self.selectedDevices.clear()
      self.deviceSearchQuery = ''
      self.showDevicePicker = false
      self.sessionId = ''
      self.isSessionActive = false
      self.lastUpdated = 0
    },
    restore(data: any) {
      if (data) {
        self.sceneName = data.sceneName || ''
        self.sceneDescription = data.sceneDescription || ''
        self.selectedIcon = data.selectedIcon || ''
        self.selectedDevices.replace(data.selectedDevices || [])
        self.deviceSearchQuery = data.deviceSearchQuery || ''
        self.showDevicePicker = data.showDevicePicker || false
        self.sessionId = data.sessionId || ''
        self.isSessionActive = data.isSessionActive || false
        self.lastUpdated = data.lastUpdated || Date.now()
      }
    },
  }))

export interface SceneCreationStoreModel
  extends Instance<typeof SceneCreationStore> {}
export interface SceneCreationStoreSnapshot
  extends SnapshotOut<typeof SceneCreationStore> {}
export interface SceneCreationStoreSnapshotIn
  extends SnapshotIn<typeof SceneCreationStore> {}
