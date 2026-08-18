import { Instance, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    isDrawerOpen: types.optional(types.boolean, false),
    // Video edit screen dialogs
    deleteVideoAlertVisible: types.optional(types.boolean, false),
    saveVideoAlertVisible: types.optional(types.boolean, false),
    // Comment section dialogs
    toggleCommentDialog: types.optional(types.boolean, false),
    deleteCommentDialogVisible: types.optional(types.boolean, false),
    actionCommentId: types.maybeNull(types.number),
    // Upload animation state
    showUploadAnimation: types.optional(types.boolean, false),
    showUploadSuccess: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setDeeplinkLoading(loading: boolean) {
      store.isDeeplinkLoading = loading
    },
    setStoragePermissionUri(uri: string | null) {
      store.storagePermissionUri = uri
    },
    setDrawerOpen(isOpen: boolean) {
      store.isDrawerOpen = isOpen
    },
    // Video edit screen actions
    showDeleteVideoAlert() {
      store.deleteVideoAlertVisible = true
    },
    hideDeleteVideoAlert() {
      store.deleteVideoAlertVisible = false
    },
    showSaveVideoAlert() {
      store.saveVideoAlertVisible = true
    },
    hideSaveVideoAlert() {
      store.saveVideoAlertVisible = false
    },
    // Comment section actions
    showHideCommentDialog(commentId: number) {
      store.toggleCommentDialog = true
      store.actionCommentId = commentId
    },
    hideHideCommentDialog() {
      store.toggleCommentDialog = false
      store.actionCommentId = null
    },
    showDeleteCommentDialog(commentId: number) {
      store.deleteCommentDialogVisible = true
      store.actionCommentId = commentId
    },
    hideDeleteCommentDialog() {
      store.deleteCommentDialogVisible = false
      store.actionCommentId = null
    },
    // Upload animation actions
    showUploadAnimationModal() {
      store.showUploadAnimation = true
      store.showUploadSuccess = false
    },
    hideUploadAnimationModal() {
      store.showUploadAnimation = false
      store.showUploadSuccess = false
    },
    showUploadSuccessState() {
      store.showUploadSuccess = true
    },
    resetDialogs() {
      store.deleteVideoAlertVisible = false
      store.saveVideoAlertVisible = false
      store.toggleCommentDialog = false
      store.deleteCommentDialogVisible = false
      store.actionCommentId = null
      store.showUploadAnimation = false
      store.showUploadSuccess = false
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
