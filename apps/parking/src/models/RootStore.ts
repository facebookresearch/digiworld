// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { AuthStoreModel } from './AuthStore'
import { SessionStore } from './SessionStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'
import { NotificationStore } from './NotificationStore'
import { ParkingStore } from './ParkingStore'
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
    deleteVideoAlertVisible: false,
    saveVideoAlertVisible: false,
    toggleCommentDialog: false,
    deleteCommentDialogVisible: false,
    actionCommentId: null,
    showUploadAnimation: false,
    showUploadSuccess: false,
    currentFocusedElement: null,
    transferForm: {},
    transactionFilter: {},
    addPayeeForm: {},
    manualPayeeForm: {},
    schedulePaymentForm: {},
    allBillsFilter: {},
    payBillForm: {},
    dialogState: {},
  }),
  sessionStore: types.optional(SessionStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
  notificationStore: types.optional(NotificationStore, {}),
  parkingStore: types.optional(ParkingStore, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
