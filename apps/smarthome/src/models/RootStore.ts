import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { AuthStoreModel } from './AuthStore'
import { SessionStore } from './SessionStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'
import { SmartHomeStoreModel } from './SmartHomeStore'
import { NotificationStore } from './NotificationStore'
import { SceneCreationStore } from './SceneCreationStore'
import { SceneEditStore } from './SceneEditStore'
import { AutomationCreationStore } from './AutomationCreationStore'
import { AutomationEditStore } from './AutomationEditStore'

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
  }),
  sessionStore: types.optional(SessionStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
  smartHomeStore: types.optional(SmartHomeStoreModel, {}),
  notificationStore: types.optional(NotificationStore, {}),
  sceneCreationStore: types.optional(SceneCreationStore, {}),
  sceneEditStore: types.optional(SceneEditStore, {}),
  automationCreationStore: types.optional(AutomationCreationStore, {}),
  automationEditStore: types.optional(AutomationEditStore, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
