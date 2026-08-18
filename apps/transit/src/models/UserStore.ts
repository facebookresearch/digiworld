import {
  Instance,
  SnapshotIn,
  SnapshotOut,
  types,
  flow,
  getRoot,
} from 'mobx-state-tree'

import {
  registerUser as dbRegisterUser,
  getUserById as dbGetUserById,
  updateUserProfile as dbUpdateUserProfile,
  queries,
} from '@/db/queries'

import { authService } from '@/services/api/auth'
import {
  ValidationError,
  validateLoginData,
  validateSignupData,
} from '@/utils/validation'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'
import { storage } from '../utils/storage'

const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
}

export type AuthError = {
  code: string
  message: string
}

export const UserModel = types
  .model('User', {
    id: types.number,
    username: types.string,
    email: types.string,
    name: types.optional(types.string, ''),
    bio: types.maybeNull(types.string),
    avatar: types.maybeNull(types.string),
    password: types.optional(types.string, ''),
    created_at: types.string,
    updated_at: types.string,
    deleted_at: types.maybeNull(types.string),
  })
  .views(self => ({
    toJSON() {
      const { ...rest } = self
      return rest
    },
  }))
  .actions(withSetPropAction)
export interface User extends Instance<typeof UserModel> {}
export interface UserSnapshotOut extends SnapshotOut<typeof UserModel> {}
export interface UserSnapshotIn extends SnapshotIn<typeof UserModel> {}

export const createUserDefaultModel = () =>
  UserModel.create({
    id: 0,
    username: '',
    email: '',
    name: '',
    bio: null,
    avatar: null,
    password: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  })

export const UserStoreModel = types
  .model('UserStore', {
    user: types.maybeNull(UserModel),
    isAuthenticated: types.optional(types.boolean, false),
    authError: types.maybeNull(types.frozen<AuthError>()),
    validationErrors: types.optional(
      types.array(types.frozen<ValidationError>()),
      [],
    ),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    // Profile editing UI state
    profileEditUI: types.optional(
      types.model({
        editValue: types.optional(types.string, ''),
        confirmValue: types.optional(types.string, ''),
        currentPassword: types.optional(types.string, ''),
        showPassword: types.optional(types.boolean, false),
        showConfirmPassword: types.optional(types.boolean, false),
        showCurrentPassword: types.optional(types.boolean, false),
        lastFocusedField: types.optional(types.string, ''), // Track which field was last focused
      }),
      {},
    ),
  })
  .views(self => ({
    get authToken() {
      return storage.getString(STORAGE_KEYS.AUTH_TOKEN)
    },
    get hasErrors() {
      return self.authError !== null || self.validationErrors.length > 0
    },
    getRootStore() {
      return getRootStore(self)
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    const setUser = (userData: any) => {
      if (!userData) {
        self.user = null
        self.isAuthenticated = false
        storage.delete(STORAGE_KEYS.USER_DATA)
        return
      }

      self.user = userData
      self.isAuthenticated = true
      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
    }

    const setAuthToken = (token: string | null) => {
      if (token) {
        storage.set(STORAGE_KEYS.AUTH_TOKEN, token)
      } else {
        storage.delete(STORAGE_KEYS.AUTH_TOKEN)
      }
    }

    const clearErrors = () => {
      self.authError = null
      self.validationErrors.clear()
    }

    return {
      setUser,
      register: flow(function* (data: {
        email: string
        username: string
        password: string
      }) {
        try {
          self.isLoading = true
          const user = yield dbRegisterUser(data)
          setUser(user)
          setAuthToken('local')
          return true
        } catch (e: any) {
          // Check if it's a duplicate email error
          const errorMessage = e?.message || String(e)

          if (
            errorMessage.includes('UNIQUE constraint') &&
            errorMessage.includes('email')
          ) {
            if (__DEV__) {
              console.warn('Registration: Email already exists')
            }
            self.authError = {
              code: 'DUPLICATE_EMAIL',
              message:
                'This email is already registered. Try logging in instead or use a different email.',
            }
          } else if (errorMessage.includes('UNIQUE constraint')) {
            if (__DEV__) {
              console.warn('Registration: Duplicate entry detected')
            }
            self.authError = {
              code: 'DUPLICATE_USER',
              message: 'An account already exists. Please try logging in.',
            }
          } else {
            if (__DEV__) {
              console.error('Registration error:', e)
            }
            self.authError = {
              code: 'AUTH_FAILED',
              message:
                'Unable to create your account. Please try again in a moment.',
            }
          }
          return false
        } finally {
          self.isLoading = false
        }
      }),
      fetchProfile: flow(function* (userId: number) {
        try {
          self.isLoading = true
          const user = yield dbGetUserById(userId)
          if (user) setUser(user)
        } catch (e) {
          self.error = (e as Error).message
        } finally {
          self.isLoading = false
        }
      }),
      updateProfile: flow(function* (data: {
        username?: string
        email?: string
        password?: string
        currentPassword?: string
      }) {
        try {
          if (!self.user) throw new Error('Not logged in')
          self.isLoading = true
          const updated = yield dbUpdateUserProfile(self.user.id, data)
          if (updated) {
            self.user = updated
          } else {
            console.log('Failed to update user')
          }
        } catch (e) {
          self.error = (e as Error).message
          throw e // Re-throw to handle in UI
        } finally {
          self.isLoading = false
        }
      }),
      setAuthToken,
      clearErrors,
      login: flow(function* (email: string, password: string) {
        clearErrors()
        try {
          // Validate input
          const errors = validateLoginData({ email, password })
          if (errors.length > 0) {
            self.validationErrors.replace(errors)
            return false
          }

          const response = yield authService.login(email.trim(), password)
          if (!response) {
            self.authError = {
              code: 'AUTH_FAILED',
              message:
                'Email or password is incorrect. Please check and try again.',
            }
            return false
          }

          setAuthToken(response.token)
          setUser(response.user)

          return true
        } catch (error: unknown) {
          console.error('Login error:', error)

          const errorMessage =
            error instanceof Error ? error.message : String(error)

          // User-friendly error messages
          if (
            errorMessage.includes('credentials') ||
            errorMessage.includes('password') ||
            errorMessage.includes('not found')
          ) {
            self.authError = {
              code: 'AUTH_FAILED',
              message:
                'Email or password is incorrect. Please check and try again.',
            }
          } else if (errorMessage.includes('network')) {
            self.authError = {
              code: 'NETWORK_ERROR',
              message:
                'Unable to connect. Please check your internet connection.',
            }
          } else {
            self.authError = {
              code: 'AUTH_ERROR',
              message: 'Something went wrong. Please try again in a moment.',
            }
          }
          return false
        }
      }),

      signup: flow(function* (userData: {
        email: string
        password: string
        username: string
      }) {
        clearErrors()

        if (__DEV__) {
          console.log('UserStore.signup called with:', {
            email: userData.email,
            username: userData.username,
          })
        }

        try {
          // Validate input
          const errors = validateSignupData(userData)
          if (errors.length > 0) {
            self.validationErrors.replace(errors)
            return false
          }

          const response = yield authService.signup({
            ...userData,
            email: userData.email.trim(),
            username: userData.username.trim(),
          })

          if (!response) {
            self.authError = {
              code: 'SIGNUP_FAILED',
              message: 'Failed to create account',
            }
            if (__DEV__) {
              console.log(
                'UserStore.signup: No response, error set:',
                self.authError,
              )
            }
            return false
          }

          setAuthToken(response.token)
          setUser(response.user)
          if (__DEV__) {
            console.log('UserStore.signup: Success!')
          }
          return true
        } catch (error: any) {
          const errorMessage = error?.message || String(error)
          const errorCode = error?.code

          if (__DEV__) {
            console.log('UserStore.signup CAUGHT ERROR:', {
              errorCode,
              errorMessage,
              fullError: error,
            })
          }

          // Check for duplicate email
          if (
            errorCode === 'EMAIL_EXISTS' ||
            errorMessage.includes('email is already registered') ||
            (errorMessage.includes('UNIQUE constraint') &&
              errorMessage.includes('email'))
          ) {
            if (__DEV__) {
              console.warn('→ Setting DUPLICATE_EMAIL error')
            }
            self.authError = {
              code: 'DUPLICATE_EMAIL',
              message:
                'This email is already registered. Try logging in instead or use a different email.',
            }
          }
          // Check for duplicate username
          else if (
            errorCode === 'USERNAME_EXISTS' ||
            errorMessage.includes('name already exists') ||
            errorMessage.includes('name is already taken') ||
            (errorMessage.includes('UNIQUE constraint') &&
              errorMessage.includes('username'))
          ) {
            if (__DEV__) {
              console.warn('→ Setting DUPLICATE_USERNAME error')
            }
            self.authError = {
              code: 'DUPLICATE_USERNAME',
              message:
                'This name is already taken. Please try a different name.',
            }
          } else {
            if (__DEV__) {
              console.error('→ Setting generic SIGNUP_ERROR')
            }
            self.authError = {
              code: 'SIGNUP_ERROR',
              message:
                'Unable to create your account. Please try again in a moment.',
            }
          }

          if (__DEV__) {
            console.log('UserStore.authError after setting:', self.authError)
          }

          return false
        }
      }),

      loadInitialData: flow(function* () {
        try {
          console.log('Loading initial data for user', self.user?.id)
          // For smart home app, we don't need to load watch history
          // This can be used for loading user preferences, devices, etc.
          console.log('Smart home initial data loaded')
        } catch (error) {
          console.error('Error loading initial data:', error)
        }
      }),

      hydrate: flow(function* () {
        try {
          const storedToken = storage.getString(STORAGE_KEYS.AUTH_TOKEN)
          const storedUser = storage.getString(STORAGE_KEYS.USER_DATA)

          if (storedToken && storedUser) {
            const userData = JSON.parse(storedUser)

            setAuthToken(storedToken)
            setUser(userData)

            return true
          }
          return false
        } catch (error) {
          console.error('Hydration failed:', error)
          setUser(null)
          setAuthToken(null)
          return false
        }
      }),

      logout() {
        setUser(null)
        setAuthToken(null)
        clearErrors()

        // Clear all stores on logout
        try {
          const rootStore = getRoot(self) as any
          if (rootStore?.clearAllStores) {
            rootStore.clearAllStores()
          }
        } catch (error) {
          console.error('Error clearing stores on logout:', error)
        }
      },

      loadStoredUser: flow(function* () {
        const storedUserData = storage.getString(STORAGE_KEYS.USER_DATA)
        const authToken = storage.getString(STORAGE_KEYS.AUTH_TOKEN)

        if (storedUserData && authToken) {
          try {
            const userData = JSON.parse(storedUserData)
            setUser(userData)
            return true
          } catch (error: unknown) {
            console.error('Error loading stored user:', error)
            setUser(null)
            setAuthToken(null)
            clearErrors()
            return false
          }
        }
        return false
      }),

      restore(data: any) {
        if (data.user) {
          self.user = UserModel.create(data.user)
        }
        if (data.isAuthenticated !== undefined) {
          self.isAuthenticated = data.isAuthenticated || false
        }
        if (data.authError) {
          self.authError = data.authError
        }
        if (data.validationErrors) {
          self.validationErrors.replace(data.validationErrors)
        }

        if (data.isLoading) {
          self.isLoading = data.isLoading
        }
        if (data.error) {
          self.error = data.error
        }
        if (data.authToken) {
          setAuthToken(data.authToken)
        }
        if (data.profileEditUI) {
          console.log(
            'data.profileEditUI',
            JSON.stringify(data.profileEditUI, null, 2),
          )
          self.profileEditUI = data.profileEditUI
        }
      },

      // Smart home specific functions can be added here
      // For example: getUserDevices, getUserRooms, etc.

      updatePassword: flow(function* (
        currentPassword: string,
        newPassword: string,
      ) {
        if (!currentPassword || !newPassword) {
          self.authError = {
            code: 'UPDATE_PASSWORD_ERROR',
            message: 'Current password and new password are required',
          }
          return
        }

        // First, we check if current password is correct, then update password
        try {
          if (currentPassword !== self.user?.password) {
            self.authError = {
              code: 'UPDATE_PASSWORD_ERROR',
              message: 'Current password is incorrect',
            }
            return false
          } else {
            const response = yield dbUpdateUserProfile(
              self.user?.id as number,
              { password: newPassword },
            )
            if (!response) {
              self.authError = {
                code: 'UPDATE_PASSWORD_ERROR',
                message: 'Failed to update password',
              }
              return
            }
            return true
          }
        } catch (error: unknown) {
          console.error('Update password error:', error)
          self.authError = {
            code: 'UPDATE_PASSWORD_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'An error occurred during password update',
          }
          return false
        }
      }),

      fetchAllUsers: flow(function* () {
        const usersData = yield queries.fetchAllUsers()
        return usersData
      }),

      // Profile Edit UI Management
      setEditValue: (value: string) => {
        self.profileEditUI.editValue = value
      },

      setConfirmValue: (value: string) => {
        self.profileEditUI.confirmValue = value
      },

      setCurrentPassword: (value: string) => {
        self.profileEditUI.currentPassword = value
      },

      toggleShowPassword: () => {
        self.profileEditUI.showPassword = !self.profileEditUI.showPassword
      },

      toggleShowConfirmPassword: () => {
        self.profileEditUI.showConfirmPassword =
          !self.profileEditUI.showConfirmPassword
      },

      toggleShowCurrentPassword: () => {
        self.profileEditUI.showCurrentPassword =
          !self.profileEditUI.showCurrentPassword
      },

      initializeEditValues: (editType: string) => {
        switch (editType) {
          case 'name':
            self.profileEditUI.editValue = self.user?.username || ''
            break
          case 'email':
            self.profileEditUI.editValue = self.user?.email || ''
            break
          case 'password':
            self.profileEditUI.editValue = ''
            self.profileEditUI.confirmValue = ''
            self.profileEditUI.currentPassword = ''
            break
        }
        self.profileEditUI.showPassword = false
        self.profileEditUI.showConfirmPassword = false
        self.profileEditUI.showCurrentPassword = false
      },

      resetProfileEditUI: () => {
        self.profileEditUI.editValue = ''
        self.profileEditUI.confirmValue = ''
        self.profileEditUI.currentPassword = ''
        self.profileEditUI.showPassword = false
        self.profileEditUI.showConfirmPassword = false
        self.profileEditUI.showCurrentPassword = false
        self.profileEditUI.lastFocusedField = ''
      },

      setLastFocusedField: (fieldName: string) => {
        self.profileEditUI.lastFocusedField = fieldName
      },

      // Smart home specific functions can be added here
      // For example: getUserDevices, getUserRooms, etc.
    }
  })

export const createUserStore = () =>
  UserStoreModel.create({
    user: null,
    isAuthenticated: false,
    authError: null,
    validationErrors: [],
    isLoading: false,
    error: null,
    profileEditUI: {
      editValue: '',
      confirmValue: '',
      currentPassword: '',
      showPassword: false,
      showConfirmPassword: false,
      showCurrentPassword: false,
      lastFocusedField: '',
    },
  })

export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshotOut
  extends SnapshotOut<typeof UserStoreModel> {}
export interface UserStoreSnapshotIn
  extends SnapshotIn<typeof UserStoreModel> {}
