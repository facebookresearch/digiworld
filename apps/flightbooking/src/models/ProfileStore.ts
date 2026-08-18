import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const ProfileStore = types
  .model('ProfileStore')
  .props({
    // Only track loading state, no data persistence
    loading: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setLoading(loading: boolean) {
      store.loading = loading
    },
    restore(data: any) {
      // Only restore loading state
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
    },
  }))
  .views(store => ({
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface ProfileStoreModel extends Instance<typeof ProfileStore> {}
export interface ProfileStoreSnapshot
  extends SnapshotOut<typeof ProfileStore> {}
