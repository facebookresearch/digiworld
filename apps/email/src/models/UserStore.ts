import i18n from 'i18next'
import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'
import { initI18n } from '../i18n'
import { mutations } from '../db/mutations'
import { logoutUser, validateToken } from '../services/api/auth'
import { loadDateFnsLocale } from '../utils/formatDate'
import { User } from './types'

const normalizeDateOfBirth = (value: string | Date | undefined) => {
  if (value === undefined) return undefined
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return value
}

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
      } catch {
        // Ignore logout errors, just clear the session
      } finally {
        this.setCurrentUser(null)
        this.setAuthToken(null)
      }
    },

    async validateSession() {
      try {
        if (!store.authToken) return false
        const isValid = await validateToken(store.authToken)
        if (!isValid) {
          this.setCurrentUser(null)
          this.setAuthToken(null)
        }
        return isValid
      } catch {
        this.setCurrentUser(null)
        this.setAuthToken(null)
        return false
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

    updateEmailSettings(settings: Partial<User['emailSettings']>) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          emailSettings: {
            ...store.currentUser.emailSettings,
            ...settings,
          },
        }
      }
    },

    updateTheme(theme: User['settings']['theme']) {
      this.updateUserSettings({
        theme,
      })
    },

    async updateLanguage(language: string) {
      this.updateUserSettings({
        language,
      })
      // Reinitialize i18n with the new language
      await initI18n()
      i18n.changeLanguage(language)
      // Update date-fns locale
      loadDateFnsLocale()
    },

    async updateUserProfile(profile: Partial<User>) {
      if (store.currentUser) {
        const normalizedDateOfBirth = normalizeDateOfBirth(profile.dateOfBirth)
        store.currentUser = {
          ...store.currentUser,
          ...profile,
          ...(normalizedDateOfBirth !== undefined
            ? { dateOfBirth: normalizedDateOfBirth }
            : {}),
        }

        const dbUpdates: Record<string, any> = {}
        if (profile.firstName !== undefined) {
          dbUpdates.firstName = profile.firstName
        }
        if (profile.lastName !== undefined) {
          dbUpdates.lastName = profile.lastName
        }
        if (profile.displayName !== undefined) {
          dbUpdates.displayName = profile.displayName
        }
        if (profile.email !== undefined) dbUpdates.email = profile.email
        if (profile.phoneNumber !== undefined) {
          dbUpdates.phoneNumber = profile.phoneNumber
        }
        if (profile.avatar !== undefined) dbUpdates.avatar = profile.avatar
        if (normalizedDateOfBirth !== undefined) {
          dbUpdates.dateOfBirth = normalizedDateOfBirth
        }

        if (Object.keys(dbUpdates).length > 0) {
          await mutations.updateUserProfile(store.currentUser.id, dbUpdates)
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
        email,
        firstName,
        lastName,
        displayName,
        avatar,
        role,
        phoneNumber,
        dateOfBirth,
      } = store.currentUser
      return {
        id,
        email,
        firstName,
        lastName,
        displayName,
        avatar,
        role,
        phoneNumber,
        dateOfBirth,
      }
    },

    get userSettings() {
      return store.currentUser?.settings
    },

    get emailSettings() {
      return store.currentUser?.emailSettings
    },

    get userInitials() {
      if (!store.currentUser) return ''
      return `${store.currentUser.firstName[0]}${store.currentUser.lastName[0]}`.toUpperCase()
    },

    get isAdmin() {
      return store.currentUser?.role === 'admin'
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
