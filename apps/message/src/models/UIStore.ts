import { Instance, types } from 'mobx-state-tree'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    isLoggingOut: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    currentSessionId: types.optional(types.string, ''),
    mockDataAppendTime: types.optional(types.number, 0),
  })
  .actions(self => ({
    setDeeplinkLoading(loading: boolean) {
      self.isDeeplinkLoading = loading
    },
    setLoggingOut(loading: boolean) {
      self.isLoggingOut = loading
    },
    setStoragePermissionUri(uri: string | null) {
      self.storagePermissionUri = uri
    },
    setMockDataAppended() {
      self.mockDataAppendTime = Date.now()
    },

    resetState() {
      self.isDeeplinkLoading = false
      self.storagePermissionUri = null
      self.currentSessionId = ''
      self.mockDataAppendTime = 0
    },
    restore(data: any) {
      if (data.mockDataAppendTime !== undefined) {
        self.mockDataAppendTime = data.mockDataAppendTime
      }
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
    setCurrentSessionId(sessionId: string) {
      self.currentSessionId = sessionId
    },
    clearCurrentSessionId() {
      self.currentSessionId = ''
    },
  }))

export interface IUIStore extends Instance<typeof UIStore> {}
