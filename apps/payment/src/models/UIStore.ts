// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, types } from 'mobx-state-tree'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    mockDataAppendTime: types.optional(types.number, 0),
  })
  .actions(self => ({
    setDeeplinkLoading(loading: boolean) {
      self.isDeeplinkLoading = loading
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
      self.mockDataAppendTime = 0
    },
    restore(data: any) {
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
  }))

export interface IUIStore extends Instance<typeof UIStore> {}
