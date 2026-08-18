// Copyright (c) Meta Platforms, Inc. and affiliates.
import { DocumentPickerAsset } from 'expo-document-picker'
import {
  types,
  getRoot,
  Instance,
  SnapshotOut,
  SnapshotIn,
} from 'mobx-state-tree'
import { RootStore } from '.'

export const UploadStore = types
  .model('UploadStore', {
    title: types.maybeNull(types.string),
    description: types.maybeNull(types.string),
    categoryId: types.maybeNull(types.number),
    base64Thumbnail: types.maybeNull(types.string),
    file: types.frozen<File | DocumentPickerAsset | null>(),
    fileSize: types.maybeNull(types.number),
    duration: types.maybeNull(types.number),
    isUploading: types.optional(types.boolean, false),
    showDetailsSheet: types.optional(types.boolean, false),
    currentFocusedField: types.maybeNull(types.string),
    isReadyToUpload: types.optional(types.boolean, false),
    commentsEnabled: types.optional(types.boolean, true),
    showUploadSuccess: types.optional(types.boolean, false),
  })
  .actions(self => ({
    setField(key: string | number, value: any) {
      // @ts-ignore
      self[key] = value
    },
    setCurrentFocusedField(field: string | null) {
      self.currentFocusedField = field
    },
    startUpload() {
      self.isUploading = true
      setTimeout(() => {
        // Call `finishUpload` inside timeout as arrow function to keep `this`/context
        this.finishUpload()
      }, 10000)
    },
    finishUpload() {
      const root = getRoot<typeof RootStore>(self)
      const videoData = {
        title: self.title || 'Untitled',
        description: self.description,
        file: self.file,
        duration: self.duration || 0,
        thumbnailUrl: self.base64Thumbnail,
        categoryId: self.categoryId || 1,
      }
      const currentUserId = root.userStore.user?.id
      const channelId = root.videoStore.channels.find(
        (c: any) => c.userId === currentUserId,
      )?.id
      if (!currentUserId) {
        console.log('No userID')
      }
      if (!channelId) {
        console.log('No channelId')
      }
      const res = root.videoStore.uploadVideo({
        title: videoData.title,
        description: videoData.description,
        thumbnailUrl: videoData.thumbnailUrl,
        duration: videoData.duration,
        categoryId: videoData.categoryId,
        channelId,
        videoUrl: '',
        isCommentsEnabled: self.commentsEnabled,
      })
      console.log(res)
      setTimeout(() => {
        this.reset()
      }, 1000)
    },
    reset() {
      self.title = null
      self.description = null
      self.categoryId = null
      self.base64Thumbnail = null
      self.file = null
      self.fileSize = null
      self.duration = null
      self.isUploading = false
      self.showDetailsSheet = false
      self.currentFocusedField = null
      self.isReadyToUpload = false
      self.commentsEnabled = true
      self.showUploadSuccess = false
    },
    restore(data: any) {
      if (data.title !== undefined) self.title = data.title
      if (data.description !== undefined) self.description = data.description
      if (data.categoryId !== undefined) self.categoryId = data.categoryId
      if (data.base64Thumbnail !== undefined) {
        self.base64Thumbnail = data.base64Thumbnail
      }
      if (data.file !== undefined) self.file = data.file
      if (data.fileSize !== undefined) self.fileSize = data.fileSize
      if (data.duration !== undefined) self.duration = data.duration
      if (data.showDetailsSheet !== undefined) {
        self.showDetailsSheet = data.showDetailsSheet
      }
      if (data.currentFocusedField !== undefined) {
        self.currentFocusedField = data.currentFocusedField
      }
      if (data.isReadyToUpload !== undefined) {
        self.isReadyToUpload = data.isReadyToUpload
      }
      if (data.commentsEnabled !== undefined) {
        self.commentsEnabled = data.commentsEnabled
      }
      if (data.showUploadSuccess !== undefined) {
        self.showUploadSuccess = data.showUploadSuccess
      }

      // Handle uploading state safely
      if (data.isUploading) {
        this.startUpload() // re-schedule the upload flow
      } else {
        self.isUploading = false
      }
    },
  }))

export interface UploadStoreModel extends Instance<typeof UploadStore> {}
export interface UploadStoreSnapshot extends SnapshotOut<typeof UploadStore> {}
export interface UploadStoreSnapshotIn extends SnapshotIn<typeof UploadStore> {}
