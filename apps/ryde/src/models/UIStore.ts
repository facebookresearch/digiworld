import { Instance, types } from 'mobx-state-tree'
import { Feedback } from './types'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    isLoggingOut: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    isDrawerOpen: types.optional(types.boolean, false),
    currentSessionId: types.optional(types.string, ''),
    isFeedbackModalVisible: types.optional(types.boolean, false),
    orderAnimationTimestamps: types.optional(
      types.frozen<{ [orderId: string]: number }>(),
      {},
    ),
    feedbacks: types.optional(
      types.frozen<{ [orderId: number]: Feedback | null }>(),
      {},
    ),
    origin: types.optional(types.string, ''),
    destination: types.optional(types.string, ''),
    distance: types.optional(types.number, 0),
    mockDataAppendTime: types.optional(types.number, 0),
  })
  .actions(self => ({
    setDeeplinkLoading(loading: boolean) {
      self.isDeeplinkLoading = loading
    },
    setLoggingOut(loading: boolean) {
      self.isLoggingOut = loading
    },
    setStoragePermissionUri(uri: string | null) {
      self.storagePermissionUri = uri
    },
    setDrawerOpen(isOpen: boolean) {
      self.isDrawerOpen = isOpen
    },
    resetState() {
      self.isDeeplinkLoading = false
      self.storagePermissionUri = null
      self.isDrawerOpen = false
      self.orderAnimationTimestamps = {}
      self.feedbacks = {}
      self.origin = ''
      self.destination = ''
    },
    restore(data: any) {
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
    setOrderAnimationTimestamp(orderId: string, timestamp: number) {
      self.orderAnimationTimestamps = {
        ...self.orderAnimationTimestamps,
        [orderId]: timestamp,
      }
    },
    clearOrderAnimationTimestamp(orderId: string) {
      const { [orderId]: _, ...rest } = self.orderAnimationTimestamps
      self.orderAnimationTimestamps = rest
    },
    setFeedback(orderId: number, feedback: Feedback | null) {
      self.feedbacks = { ...self.feedbacks, [orderId]: feedback }
    },
    clearFeedback(orderId: number) {
      const { [orderId]: _, ...rest } = self.feedbacks
      self.feedbacks = rest
    },
    setOrigin(origin: string) {
      self.origin = origin
    },
    setDestination(destination: string) {
      self.destination = destination
    },
    setDistance(distance: number) {
      self.distance = distance
    },
    setCurrentSessionId(sessionId: string) {
      self.currentSessionId = sessionId
    },
    clearCurrentSessionId() {
      self.currentSessionId = ''
    },
    setIsFeedbackModalVisible(isVisible: boolean) {
      self.isFeedbackModalVisible = isVisible
    },
    clearIsFeedbackModalVisible() {
      self.isFeedbackModalVisible = false
    },
    setMockDataAppended() {
      self.mockDataAppendTime = Date.now()
    },
  }))

export interface IUIStore extends Instance<typeof UIStore> {}
