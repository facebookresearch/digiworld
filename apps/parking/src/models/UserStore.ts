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
import { getRootStore } from './helpers/getRootStore'
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

// Banking-related tier and account configuration removed for parking app

export const UserModel = types
  .model('User', {
    id: types.identifierNumber,
    username: types.string,
    email: types.string,
    fullName: types.maybeNull(types.string),
    phoneNumber: types.maybeNull(types.string),
    pin: types.maybeNull(types.string),
    securityQuestion: types.maybeNull(types.string),
    securityAnswer: types.maybeNull(types.string),
    password: types.optional(types.string, ''),
    createdAt: types.string,
    updatedAt: types.maybeNull(types.string),
    deletedAt: types.maybeNull(types.string),
  })
  .views(self => ({
    get displayName() {
      return self.fullName || self.username
    },
    get isActive() {
      return !self.deletedAt
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
    email: '',
    fullName: null,
    phoneNumber: null,
    pin: null,
    securityQuestion: null,
    securityAnswer: null,
    password: '',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
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
        username: userData.fullName || userData.email?.split('@')[0] || '', // Use fullName or email prefix as username
        email: String(userData.email),
        fullName: userData.fullName || null,
        phoneNumber: userData.phoneNumber || null,
        pin: null, // PIN not used in parking app
        securityQuestion: null, // Not used in parking app
        securityAnswer: null, // Not used in parking app
        password: String(userData.password || ''),
        createdAt: String(userData.createdAt || new Date().toISOString()),
        updatedAt: userData.updatedAt || null,
        deletedAt: userData.deletedAt || null,
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

          // Create user in database (parking app uses email as identifier, not username)
          const createdUser = yield queries.createUser({
            email: data.email,
            password: data.password,
            fullName: data.username, // Use username as fullName for display
          })

          console.log('User created in DB:', createdUser.id)

          // Set user in store
          setUser(createdUser)
          setAuthToken('local')

          console.log('✓ Registration complete')

          // Create a random user location after successful registration
          try {
            console.log(
              'Creating default user location for user:',
              createdUser.id,
            )
            const rootStore = getRootStore(self)

            // Hardcoded NYC locations as fallback
            const locations = [
              {
                name: '408, East 13th Street, Manhattan, USA',
                lat: 40.730441,
                lon: -73.982559,
              },
              {
                name: '1177, Broadway, NoMad, Manhattan, USA',
                lat: 40.745128,
                lon: -73.988772,
              },
              {
                name: '97, Attorney Street, Manhattan, USA',
                lat: 40.718564,
                lon: -73.984366,
              },
              {
                name: 'Newman Library and Technology Center, East 25th Street, Kips Bay, Manhattan, USA',
                lat: 40.740709,
                lon: -73.983882,
              },
              {
                name: "Xi'an Famous Foods, 96, 8th Avenue, Manhattan, USA",
                lat: 40.740254,
                lon: -74.002129,
              },
              {
                name: '42nd Street-Bryant Park, West 40th Street, Midtown South, USA',
                lat: 40.754462,
                lon: -73.984392,
              },
              {
                name: 'Times Square, Manhattan, USA',
                lat: 40.758896,
                lon: -73.98513,
              },
              {
                name: 'Central Park, Manhattan, USA',
                lat: 40.785091,
                lon: -73.968285,
              },
              {
                name: 'Brooklyn Bridge, New York, USA',
                lat: 40.706086,
                lon: -73.996864,
              },
              {
                name: 'Empire State Building, 5th Avenue, Manhattan, USA',
                lat: 40.748817,
                lon: -73.985428,
              },
            ]

            const randomIndex = Math.floor(Math.random() * locations.length)
            const randomLocation = locations[randomIndex]

            console.log('Selected random location:', randomLocation.name)

            const location = yield rootStore.parkingStore.addUserLocation({
              label: 'Home',
              address: randomLocation.name,
              latitude: randomLocation.lat,
              longitude: randomLocation.lon,
              isDefault: 1,
            })

            console.log('Successfully created default user location:', location)
          } catch (locationError) {
            console.error('Failed to create user location:', locationError)
            // Don't fail registration if location creation fails
          }

          return true
        } catch (e) {
          console.error('Registration error', e)
          const errorMessage =
            e instanceof Error
              ? e.message
              : 'Registration failed. Please try again.'
          self.authError = {
            code: 'REGISTRATION_FAILED',
            message: errorMessage,
          }
          return false
        } finally {
          self.isLoading = false
        }
      }),

      // Banking-related function removed for parking app

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
        email?: string
        password?: string
        fullName?: string
        phoneNumber?: string
        currentPassword?: string
      }) {
        try {
          if (!self.user) throw new Error('Not logged in')
          self.isLoading = true
          const updated = yield dbUpdateUserProfile(self.user.id, data)
          if (updated) {
            // Use setUser to properly map API response to UserModel format
            setUser(updated)
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

          // Create a random user location after successful signup
          // Use setTimeout to ensure user is fully set in store
          setTimeout(() => {
            ;(async () => {
              try {
                console.log(
                  'Creating default user location for user:',
                  response.user.id,
                )
                const rootStore = getRootStore(self)
                const locations = require('../../data/static/locations.json')
                const randomLocation =
                  locations[Math.floor(Math.random() * locations.length)]

                console.log('Selected random location:', randomLocation.name)
                console.log('User ID from store:', rootStore.userStore.user?.id)

                const location = await rootStore.parkingStore.addUserLocation({
                  label: 'Home',
                  address: randomLocation.name,
                  latitude: randomLocation.lat,
                  longitude: randomLocation.lon,
                  isDefault: 1,
                })

                console.log(
                  'Successfully created default user location:',
                  location,
                )
              } catch (locationError) {
                console.error('Failed to create user location:', locationError)
                console.error(
                  'Location error details:',
                  JSON.stringify(locationError, null, 2),
                )
              }
            })()
          }, 0)

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
          // Parking app initial data loading
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
            // Convert dateJoined back to Date object
            const userDataWithDate = {
              ...userData,
              dateJoined: new Date(userData.dateJoined),
            }
            setUser(userDataWithDate)
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
              self.user?.fullName || self.user?.username || ''
            break
          case 'email':
            self.profileEditUI.editValue = self.user?.email || ''
            break
          case 'password':
            self.profileEditUI.editValue = ''
            self.profileEditUI.confirmValue = ''
            self.profileEditUI.currentPassword = ''
            break
          case 'changePin':
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
