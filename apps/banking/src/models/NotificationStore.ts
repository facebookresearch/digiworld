import { types, flow, Instance, SnapshotOut, SnapshotIn } from 'mobx-state-tree'
import { getRootStore } from './helpers/getRootStore'
import {
  getAllNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '../db/queries'

export const NotificationStore = types
  .model('NotificationStore', {
    loading: types.optional(types.boolean, false),
    notifications: types.optional(types.array(types.frozen()), []), // observable notifications
    testMode: types.optional(types.boolean, false), // Flag to disable auto-clearing for testing
    sessionNotifications: types.optional(types.array(types.frozen()), []), // Notifications for current session
    hasLeftScreen: types.optional(types.boolean, false), // Track if user has left the screen
  })
  .views(self => ({
    // Get only unread notifications
    // Uses the same condition as markAllAsRead: !n.readAt && n.isRead === 0
    get unreadNotifications() {
      if (!self.notifications || self.notifications.length === 0) {
        return []
      }
      return self.notifications.filter(n => n && !n.readAt && n.isRead === 0)
    },
    // Get only unread session notifications
    get unreadSessionNotifications() {
      if (
        !self.sessionNotifications ||
        self.sessionNotifications.length === 0
      ) {
        return []
      }
      return self.sessionNotifications.filter(
        n => n && !n.readAt && n.isRead === 0,
      )
    },
    // Get count of unread notifications
    get unreadCount() {
      if (!self.notifications || self.notifications.length === 0) {
        return 0
      }
      return self.notifications.filter(n => n && !n.readAt && n.isRead === 0)
        .length
    },
    // Get count of unread session notifications
    get unreadSessionCount() {
      if (
        !self.sessionNotifications ||
        self.sessionNotifications.length === 0
      ) {
        return 0
      }
      return self.sessionNotifications.filter(
        n => n && !n.readAt && n.isRead === 0,
      ).length
    },
  }))
  .actions(self => ({
    // Toggle test mode
    setTestMode: (enabled: boolean) => {
      self.testMode = enabled
    },

    // Mark that user has left the screen
    setHasLeftScreen: (hasLeft: boolean) => {
      self.hasLeftScreen = hasLeft
    },

    // Fetch notifications from database and populate observable array
    getNotifications: flow(function* () {
      self.loading = true
      try {
        const store = getRootStore(self)
        const userId = store.userStore.user?.id
        console.log('userId', userId)

        if (!userId) {
          console.log('No user ID available')
          self.notifications.clear()
          self.sessionNotifications.clear()
          return
        }

        const rows = yield getAllNotifications(userId)
        console.log('notifications', rows.length)
        self.notifications.replace(rows) // update observable
        self.sessionNotifications.replace(rows) // update session notifications
        // If user has left and returned, reset session notifications
        if (self.hasLeftScreen) {
          self.sessionNotifications.clear()
          self.hasLeftScreen = false
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err)
        self.notifications.clear()
        self.sessionNotifications.clear()
      } finally {
        self.loading = false
      }
    }),

    // Mark a notification as read in DB and update state
    markAsRead: flow(function* (id: number) {
      try {
        yield markNotificationAsRead(id)

        const index = self.notifications.findIndex(n => n.id === id)
        if (index !== -1) {
          self.notifications.splice(index, 1, {
            ...self.notifications[index],
            isRead: 1,
            readAt: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('Failed to mark notification as read', err)
      }
    }),

    // Mark all notifications as read in DB and update state
    markAllAsRead: flow(function* () {
      try {
        // Skip if in test mode
        if (self.testMode) {
          console.log('Test mode enabled - skipping auto-mark as read')
          return
        }

        // pick notifications that actually need to be marked read:
        const unread = self.notifications.filter(
          n => !n.readAt && n.isRead === 0,
        )

        // call DB only for unread ones
        yield Promise.all(unread.map(n => markNotificationAsRead(n.id)))

        // stamp local unread items with now (don't overwrite existing readAt)
        const now = new Date().toISOString()
        self.notifications.replace(
          self.notifications.map(n => {
            // If it already had a readAt, keep it
            if (n.readAt) return n
            // otherwise mark it read now
            return { ...n, isRead: 1, readAt: now }
          }),
        )

        // Also update session notifications
        self.sessionNotifications.replace(
          self.sessionNotifications.map(n => {
            if (n.readAt) return n
            return { ...n, isRead: 1, readAt: now }
          }),
        )
      } catch (err) {
        console.error('Failed to mark all notifications as read', err)
      }
    }),

    // Delete a notification in DB and update state
    deleteNotification: flow(function* (id: number) {
      try {
        yield deleteNotification(id)
        self.notifications.replace(self.notifications.filter(n => n.id !== id))
      } catch (err) {
        console.error('Failed to delete notification', err)
      }
    }),

    // Restore observable state (rehydrate)
    restore: flow(function* (data: any[]) {
      if (Array.isArray(data)) {
        self.notifications.replace(data)
      }
      // Load fresh notifications after restore
      yield self.getNotifications()
    }),
  }))

export interface NotificationStoreModel
  extends Instance<typeof NotificationStore> {}
export interface NotificationStoreSnapshot
  extends SnapshotOut<typeof NotificationStore> {}
export interface NotificationStoreSnapshotIn
  extends SnapshotIn<typeof NotificationStore> {}
