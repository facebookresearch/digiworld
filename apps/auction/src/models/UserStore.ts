// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, SnapshotOut, types, flow } from 'mobx-state-tree'

import {
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
import { storage } from '../utils/storage'

const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
}

interface ApiError {
  code?: string
  message: string
}

export type AuthError = {
  code: string
  message: string
}

export const UserModel = types
  .model('User', {
    id: types.identifierNumber,
    username: types.string,
    email: types.maybeNull(types.string),
    name: types.maybeNull(types.string),
    password: types.optional(types.string, ''),
    sellerRating: types.optional(types.number, 0),
    totalSales: types.optional(types.number, 0),
    totalItemsListed: types.optional(types.number, 0),
    createdAt: types.string,
    updatedAt: types.maybeNull(types.string),
  })
  .views(self => ({
    get displayName() {
      return self.name || self.username
    },
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
    email: null,
    name: null,
    password: '',
    sellerRating: 0,
    totalSales: 0,
    totalItemsListed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: null,
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
        lastFocusedField: types.optional(types.string, ''),
      }),
      {},
    ),
    // PIN setters will be added in actions below
  })
  .views(self => ({
    get authToken() {
      return storage.getString(STORAGE_KEYS.AUTH_TOKEN)
    },
    get hasErrors() {
      return self.authError !== null || self.validationErrors.length > 0
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

      // Map mock data fields to UserStore structure
      console.log('userData', userData)
      const mappedUserData = {
        id: Number(userData.id),
        username: String(userData.username),
        email: userData.email || null,
        name: userData.name || userData.fullName || null, // Handle both old and new field names
        password: String(userData.password || ''),
        sellerRating: Number(
          userData.sellerRating || userData.seller_rating || 0,
        ),
        totalSales: Number(userData.totalSales || userData.total_sales || 0),
        totalItemsListed: Number(
          userData.totalItemsListed || userData.total_items_listed || 0,
        ),
        createdAt: String(
          userData.createdAt || userData.created_at || new Date().toISOString(),
        ),
        updatedAt: userData.updatedAt || userData.updated_at || null,
      }

      self.user = UserModel.create(mappedUserData)
      self.isAuthenticated = true
      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUserData))
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
      // ...existing code...
      setUser,
      register: flow(function* (data: {
        email: string
        username: string
        password: string
      }) {
        try {
          self.isLoading = true
          clearErrors()

          // Create user in database
          const createdUser = yield queries.createUser({
            username: data.username,
            password: data.password,
            email: data.email,
            name: data.username, // Use username as name by default
          })

          console.log('User created in DB:', createdUser.id)

          // Set user in store
          setUser(createdUser)
          setAuthToken('local')

          console.log('✓ Registration complete')

          return true
        } catch (e: any) {
          console.error('Registration error', e)
          self.authError = {
            code: 'REGISTRATION_FAILED',
            message: e.message || 'Registration failed. Please try again.',
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
        name?: string
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
              message: 'Invalid credentials',
            }
            return false
          }

          setAuthToken(response.token)
          setUser(response.user)

          return true
        } catch (error: unknown) {
          console.error('Login error:', error)
          self.authError = {
            code: 'AUTH_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'An error occurred during login',
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
            return false
          }

          setAuthToken(response.token)
          setUser(response.user)
          return true
        } catch (error: unknown) {
          console.error('Signup error:', error)
          const apiError = error as ApiError
          if (apiError.code === 'EMAIL_EXISTS') {
            self.authError = {
              code: 'EMAIL_EXISTS',
              message: 'This email is already registered',
            }
          } else {
            self.authError = {
              code: 'SIGNUP_ERROR',
              message: apiError.message || 'An error occurred during signup',
            }
          }
          return false
        }
      }),

      loadInitialData: flow(function* () {
        try {
          console.log('Loading initial data for user', self.user?.id)
          // Banking app doesn't need video-related data loading
          console.log('User data loaded successfully')
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

      updatePassword: flow(function* (
        currentPassword: string,
        newPassword: string,
      ) {
        if (!currentPassword || !newPassword) {
          self.authError = {
            code: 'UPDATE_PASSWORD_ERROR',
            message: 'Current password and new password are required',
          }
          return false
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
              return false
            }
            // Update local user state
            if (self.user) {
              self.user.password = newPassword
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
        const usersData = yield queries.getAllUsers()
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
            self.profileEditUI.editValue =
              self.user?.name || self.user?.username || ''
            break
          case 'username':
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
