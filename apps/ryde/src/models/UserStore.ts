import {
  Instance,
  SnapshotIn,
  SnapshotOut,
  types,
  getRoot,
} from 'mobx-state-tree'
import { logoutUser } from '../services/api/auth'
import { loadDateFnsLocale } from '../utils/formatDate'
import { User, UserAddress } from './types'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'

export const UserStoreModel = types
  .model('UserStore')
  .props({
    currentUser: types.maybeNull(types.frozen<User>()),
    authToken: types.maybeNull(types.string),
    addresses: types.array(types.frozen<UserAddress>()),
    selectedAddress: types.maybeNull(types.frozen<UserAddress>()),
  })
  .actions(store => ({
    setCurrentUser(user: User | null) {
      store.currentUser = user
    },

    setAuthToken(token: string | null) {
      store.authToken = token
    },

    setAddresses(addresses: UserAddress[]) {
      store.addresses.replace(addresses)
    },

    setSelectedAddress(address: UserAddress | null) {
      store.selectedAddress = address
    },

    async login(userDetails: User, authToken: string) {
      try {
        if (userDetails && authToken) {
          this.setCurrentUser(userDetails)
          this.setAuthToken(authToken)
        }
      } catch (error) {
        this.setCurrentUser(null)
        this.setAuthToken(null)
      }
    },

    async logout() {
      try {
        if (store.authToken) {
          await logoutUser(store.authToken)
        }
      } finally {
        // Clear all stores on logout
        const root: any = getRoot(store)

        // Clear ride store data
        if (root.rideStore) {
          root.rideStore.clearCurrentRide()
          root.rideStore.clearRoute()
          root.rideStore.clearError()
          root.rideStore.clearRideHistory()
        }

        // Clear UI store data
        if (root.uiStore) {
          root.uiStore.resetState()
        }

        // Clear session store data
        if (root.sessionStore) {
          root.sessionStore.clearAllSessions()
        }

        // Clear user store data
        this.setCurrentUser(null)
        this.setAuthToken(null)
        this.setAddresses([])
        this.setSelectedAddress(null)
      }
    },

    updateUserSettings(settings: Record<string, any>) {
      if (store.currentUser) {
        const currentSettings = JSON.parse(store.currentUser.settings || '{}')
        const newSettings = JSON.stringify({
          ...currentSettings,
          ...settings,
        })

        store.currentUser = {
          ...store.currentUser,
          settings: newSettings,
        }
      }
    },

    async updateLanguage(language: string) {
      this.updateUserSettings({ language })
      await loadDateFnsLocale()
    },

    updateUserProfile(profile: Partial<User>) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          ...profile,
        }
      }
    },

    async fetchAddresses() {
      try {
        if (!store.currentUser?.id) return

        const data = await queries.getAddressesForUser(store.currentUser.id)

        this.setAddresses(data || [])
      } catch (error) {
        console.error('Error fetching addresses:', error)
        this.setAddresses([])
      }
    },

    async deleteAddress(addressId: number) {
      try {
        const result = await mutations.deleteUserAddress(addressId)
        if (result.success) {
          await this.fetchAddresses()
        }
        return result
      } catch (error) {
        console.error('Error deleting address:', error)
        return { success: false, error }
      }
    },

    restore(snapshot: any) {
      try {
        // Restore user data
        this.setCurrentUser(snapshot.currentUser || null)
        this.setAuthToken(snapshot.authToken || null)

        // Restore addresses
        if (snapshot.addresses) {
          this.setAddresses(snapshot.addresses)
        } else {
          this.setAddresses([])
        }

        // Restore selected address
        this.setSelectedAddress(snapshot.selectedAddress || null)
      } catch (error) {
        console.error('Error restoring user store:', error)
        // Reset to safe state
        this.setCurrentUser(null)
        this.setAuthToken(null)
        this.setAddresses([])
        this.setSelectedAddress(null)
      }
    },
  }))
  .views(store => ({
    get isAuthenticated() {
      return !!store.currentUser && !!store.authToken
    },

    get userSettings() {
      if (!store.currentUser?.settings) return {}
      try {
        return JSON.parse(store.currentUser.settings)
      } catch {
        return {}
      }
    },

    get userInitials() {
      if (!store.currentUser) return ''
      return `${store.currentUser.firstName[0]}${store.currentUser.lastName[0]}`.toUpperCase()
    },

    get accountStatus() {
      return store.currentUser?.status || 'inactive'
    },

    get hasNotifications() {
      const settings = this.userSettings
      return settings.notifications ?? false
    },

    get defaultAddress() {
      return (
        store.addresses.find(addr => addr.isDefault === 1) ||
        store.addresses[0] ||
        null
      )
    },
  }))

export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshotOut
  extends SnapshotOut<typeof UserStoreModel> {}
export interface UserStoreSnapshotIn
  extends SnapshotIn<typeof UserStoreModel> {}
