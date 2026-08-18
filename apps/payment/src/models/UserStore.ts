import i18n from 'i18next'
import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'
import { initI18n } from '../i18n'
import { logoutUser } from '../services/api/auth'
import { loadDateFnsLocale } from '../utils/formatDate'
import { User } from './types'

export const UserStoreModel = types
  .model('UserStore')
  .props({
    currentUser: types.maybeNull(types.frozen<User>()),
    authToken: types.maybeNull(types.string),
  })
  .actions(store => ({
    setCurrentUser(user: User | null) {
      store.currentUser = user
    },

    setAuthToken(token: string | null) {
      store.authToken = token
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
        this.setCurrentUser(null)
        this.setAuthToken(null)
      }
    },

    updateUserSettings(settings: Partial<User['settings']>) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          settings: {
            ...store.currentUser.settings,
            ...settings,
          },
        }
      }
    },

    updateUserPin(pin: string) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          pin,
        }
      }
    },

    updateTransactionLimits(limits: {
      dailyLimit?: number
      monthlyLimit?: number
    }) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          ...limits,
        }
      }
    },

    async updateLanguage(language: string) {
      this.updateUserSettings({ language })
      await initI18n()
      i18n.changeLanguage(language)
      loadDateFnsLocale()
    },

    updateUserProfile(profile: Partial<User>) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          ...profile,
        }
      }
    },
  }))
  .views(store => ({
    get isAuthenticated() {
      return !!store.currentUser && !!store.authToken
    },

    get userProfile() {
      if (!store.currentUser) return null
      const {
        id,
        firstName,
        lastName,
        displayName,
        phoneNumber,
        status,
        kycVerified,
        pin,
      } = store.currentUser
      return {
        id,
        firstName,
        lastName,
        displayName,
        phoneNumber,
        status,
        kycVerified,
        pin,
      }
    },

    get userSettings() {
      return store.currentUser?.settings
    },

    get transactionLimits() {
      if (!store.currentUser) return null
      return {
        dailyLimit: store.currentUser.dailyLimit,
        monthlyLimit: store.currentUser.monthlyLimit,
      }
    },

    get userInitials() {
      if (!store.currentUser) return ''
      return `${store.currentUser.firstName[0]}${store.currentUser.lastName[0]}`.toUpperCase()
    },

    get isKycVerified() {
      return store.currentUser?.kycVerified === 1
    },

    get accountStatus() {
      return store.currentUser?.status || 'inactive'
    },

    get hasNotifications() {
      return store.currentUser?.settings.notifications ?? false
    },
  }))

export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshotOut
  extends SnapshotOut<typeof UserStoreModel> {}
export interface UserStoreSnapshotIn
  extends SnapshotIn<typeof UserStoreModel> {}
