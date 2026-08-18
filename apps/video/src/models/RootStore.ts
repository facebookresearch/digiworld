// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { AuthStoreModel } from './AuthStore'
import { CommentStoreModel } from './CommentStore'
import { PlaylistStoreModel } from './PlaylistStore'
import { SearchStoreModel } from './SearchStore'
import { SessionStore } from './SessionStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'
import { VideoStoreModel } from './VideoStore'
import { UploadStore as UploadStoreModel } from './UploadStore'
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
  }),
  sessionStore: types.optional(SessionStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
  videoStore: types.optional(VideoStoreModel, {}),
  playlistStore: types.optional(PlaylistStoreModel, {}),
  searchStore: types.optional(SearchStoreModel, {}),
  uploadStore: types.optional(UploadStoreModel, {} as any),
  commentStore: types.optional(CommentStoreModel, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
