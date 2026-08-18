// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { AuthStoreModel } from './AuthStore'
import { SessionStore } from './SessionStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'
import { AuctionStore } from './AuctionStore'
import { NotificationStore } from './NotificationStore'
/**
 * A RootStore model.
 */
export const RootStore = types.model('RootStore').props({
  userStore: types.optional(UserStoreModel, {
    user: null,
    isAuthenticated: false,
    authError: null,
    validationErrors: [],
  }),
  uiStore: types.optional(UIStore, {
    isDeeplinkLoading: false,
    storagePermissionUri: null,
    isDrawerOpen: false,
    currentFocusedElement: null,
    itemDetailForm: {},
    sellForm: {},
    searchState: {},
    browseState: {},
    transactionFilter: {},
    transactionDetails: {},
    addPaymentMethodForm: {},
    bidForm: {},
    paymentForm: {},
    dialogState: {},
  }),
  sessionStore: types.optional(SessionStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
  auctionStore: types.optional(AuctionStore, {}),
  notificationStore: types.optional(NotificationStore, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
