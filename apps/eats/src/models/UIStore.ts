import { Instance, types } from 'mobx-state-tree'
import { Feedback } from './types'

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    orderAnimationTimestamps: types.optional(
      types.frozen<{ [orderId: string]: number }>(),
      {},
    ),
    feedbacks: types.optional(
      types.frozen<{ [orderId: number]: Feedback | null }>(),
      {},
    ),
  })
  .actions(self => ({
    setDeeplinkLoading(loading: boolean) {
      self.isDeeplinkLoading = loading
    },
    setStoragePermissionUri(uri: string | null) {
      self.storagePermissionUri = uri
    },
    resetState() {
      self.isDeeplinkLoading = false
      self.storagePermissionUri = null
      self.orderAnimationTimestamps = {}
      self.feedbacks = {}
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
  }))

export interface IUIStore extends Instance<typeof UIStore> {}
