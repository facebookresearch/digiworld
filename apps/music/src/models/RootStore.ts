import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { UserStoreModel } from './UserStore'
import { UIStore } from './UIStore'
import { MusicStoreModel } from './MusicStore'
import { SessionStore } from './SessionStore'
import { AuthStoreModel } from './AuthStore'
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
  }),
  musicStore: types.optional(MusicStoreModel, {
    artists: [],
    albums: [],
    songs: [],
    playlists: [],
    isLoading: false,
    error: null,
  }),
  sessionStore: types.optional(SessionStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
