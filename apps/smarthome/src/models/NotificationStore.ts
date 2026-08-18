import { types, flow, Instance, SnapshotOut, SnapshotIn } from 'mobx-state-tree'
import { queries } from '../db/queries'
import { getRootStore } from './helpers/getRootStore'

export const NotificationStore = types
  .model('NotificationStore', {
    loading: types.optional(types.boolean, false),
    notifications: types.optional(types.array(types.frozen()), []), // observable notifications
  })
  .actions(self => ({
    // Fetch notifications from DB and populate observable array
    getNotifications: flow(function* () {
      self.loading = true
      try {
        const store = getRootStore(self)
        const userId = store.userStore.user?.id
        console.log('userId', userId)
        const rows = yield queries.getNotifications(userId)
        console.log('rows', rows.length)
        self.notifications.replace(rows) // update observable
      } catch (err) {
        console.error('Failed to fetch notifications', err)
        self.notifications.clear()
      } finally {
        self.loading = false
      }
    }),

    // Mark a notification as read in DB and update state
    markAsRead: flow(function* (id: number) {
      try {
        yield queries.markNotificationAsRead(id)

        const index = self.notifications.findIndex(n => n.id === id)
        if (index !== -1) {
          self.notifications.splice(index, 1, {
            ...self.notifications[index],
            is_read: 1,
            read_at: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('Failed to mark notification as read', err)
      }
    }),

    // Mark all notifications as read in DB and update state
    markAllAsRead: flow(function* () {
      try {
        // pick notifications that actually need to be marked read:
        const unread = self.notifications.filter(
          n =>
            !n.read_at &&
            (n.is_read === 0 || n.is_read === false || n.is_read == null),
        )

        // call DB only for unread ones
        yield Promise.all(unread.map(n => queries.markNotificationAsRead(n.id)))

        // stamp local unread items with now (don't overwrite existing read_at)
        const now = new Date().toISOString()
        self.notifications.replace(
          self.notifications.map(n => {
            // If it already had a read_at, keep it
            if (n.read_at) return n
            // otherwise mark it read now
            return { ...n, is_read: 1, read_at: now }
          }),
        )
      } catch (err) {
        console.error('Failed to mark all notifications as read', err)
      }
    }),

    // Delete a notification in DB and update state
    deleteNotification: flow(function* (id: number) {
      try {
        yield queries.deleteNotification(id)
        self.notifications.replace(self.notifications.filter(n => n.id !== id))
      } catch (err) {
        console.error('Failed to delete notification', err)
      }
    }),

    // Method to force refresh notifications from database
    refreshData: flow(function* () {
      yield (self as any).getNotifications()
    }),

    // Restore observable state (rehydrate)
    restore: flow(function* (data: any[]) {
      if (Array.isArray(data)) {
        self.notifications.replace(data)
      }
      yield (self as any).getNotifications()
    }),
  }))

export interface NotificationStoreModel
  extends Instance<typeof NotificationStore> {}
export interface NotificationStoreSnapshot
  extends SnapshotOut<typeof NotificationStore> {}
export interface NotificationStoreSnapshotIn
  extends SnapshotIn<typeof NotificationStore> {}
