// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { SessionStore } from './SessionStore'
import { UserStoreModel } from './UserStore'
import { UIStore } from './UIStore'
import { RideStore } from '@/stores/rideStore'

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model('RootStore').props({
  sessionStore: types.optional(SessionStore, {}),
  userStore: types.optional(UserStoreModel, {}),
  uiStore: types.optional(UIStore, {}),
  rideStore: types.optional(RideStore, {}),
})

/**
 * The RootStore instance.
 */

export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
