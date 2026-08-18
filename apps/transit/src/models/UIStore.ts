// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setDeeplinkLoading(loading: boolean) {
      store.isDeeplinkLoading = loading
    },
    setStoragePermissionUri(uri: string | null) {
      store.storagePermissionUri = uri
    },
    restore(data: any) {
      if (data.isDeeplinkLoading !== undefined) {
        store.isDeeplinkLoading = data.isDeeplinkLoading
      }
      if (data.storagePermissionUri !== undefined) {
        store.storagePermissionUri = data.storagePermissionUri
      }
    },
  }))

export interface UIStoreModel extends Instance<typeof UIStore> {}
