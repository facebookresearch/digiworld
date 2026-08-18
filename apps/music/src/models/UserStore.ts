// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, SnapshotOut, types, flow } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { storage } from '../utils/storage'
import { authService } from '@/services/api/auth'
import { favoritesService } from '@/services/api/favorites'
import {
  ValidationError,
  validateLoginData,
  validateSignupData,
} from '@/utils/validation'
import { db } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { recentlyPlayed } from '@/db/schema'
import { getRecentlyPlayed } from '@/db/queries'

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

const RecentlyPlayedModel = types.model('RecentlyPlayed', {
  songId: types.number,
  playedAt: types.string,
})

export const UserModel = types
  .model('User', {
    id: types.number,
    username: types.string,
    email: types.string,
    password: types.optional(types.string, ''),
    profilePicture: types.maybeNull(types.string),
    favoriteCategories: types.optional(types.array(types.string), []), // Category IDs
    favoriteSongIds: types.optional(types.array(types.number), []),
    recentlyPlayed: types.optional(types.array(RecentlyPlayedModel), []),
    createdAt: types.string,
    updatedAt: types.string,
  })
  .views(self => ({
    toJSON() {
      const { ...rest } = self
      return rest
    },
  }))
  .actions(withSetPropAction)
  .actions(self => ({
    setFavoriteSongIds(songIds: number[]) {
      self.favoriteSongIds.replace(songIds)
    },
    addToFavorites: flow(function* (songId: number) {
      try {
        yield favoritesService.addToFavorites(self.id, songId)
        self.favoriteSongIds.push(songId)
      } catch (error) {
        console.error('Error adding song to favorites:', error)
        throw error
      }
    }),
    removeFromFavorites: flow(function* (songId: number) {
      try {
        yield favoritesService.removeFromFavorites(self.id, songId)
        const index = self.favoriteSongIds.indexOf(songId)
        if (index > -1) {
          self.favoriteSongIds.splice(index, 1)
        }
      } catch (error) {
        console.error('Error removing song from favorites:', error)
        throw error
      }
    }),
  }))

export interface User extends Instance<typeof UserModel> {}
export interface UserSnapshotOut extends SnapshotOut<typeof UserModel> {}
export interface UserSnapshotIn extends SnapshotIn<typeof UserModel> {}

export const createUserDefaultModel = () =>
  UserModel.create({
    id: 0,
    username: '',
    email: '',
    favoriteCategories: [],
    favoriteSongIds: [],
    recentlyPlayed: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    libraryFilter: types.optional(
      types.enumeration(['playlists', 'artists', 'albums', 'songs', 'history']),
      'playlists',
    ),
    isCreatePlaylistModalVisible: types.optional(types.boolean, false),
    isDeletePlaylistModalVisible: types.optional(types.boolean, false),
    isAddToPlaylistModalVisible: types.optional(types.boolean, false),
    selectedPlaylistId: types.maybeNull(types.number),
    selectedSongId: types.maybeNull(types.number),
    newPlaylistName: types.optional(types.string, ''),
    recentlyPlayed: types.optional(types.array(RecentlyPlayedModel), []),
  })
  .views(self => ({
    get authToken() {
      return storage.getString(STORAGE_KEYS.AUTH_TOKEN)
    },
    get hasErrors() {
      return self.authError !== null || self.validationErrors.length > 0
    },
    get getFavoriteSongIds() {
      return self.user?.favoriteSongIds
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    const setUser = (userData: any) => {
      try {
        if (!userData) {
          self.user = null
          self.isAuthenticated = false
          storage.delete(STORAGE_KEYS.USER_DATA)
          return
        }

        // Convert dateJoined from ISO string to Date object if needed
        const userDataWithDate = {
          ...userData,
          dateJoined:
            userData.dateJoined instanceof Date
              ? userData.dateJoined
              : new Date(userData.dateJoined),
          favoriteSongIds: userData.favoriteSongIds || [],
        }

        self.user = userDataWithDate
        self.isAuthenticated = true
        storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithDate))
        storage.set(STORAGE_KEYS.AUTH_TOKEN, 'dummy-token')
      } catch (error) {
        console.error('Error setting user', error)
      }
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

          // Load favorite songs
          if (self.user) {
            const favoriteSongIds = yield favoritesService.getFavoriteSongIds(
              self.user.id,
            )
            self.user.setFavoriteSongIds(favoriteSongIds)
          }
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
          const recentlyPlayed = yield getRecentlyPlayed(self.user?.id || 1)
          if (recentlyPlayed.length > 0) {
            self.recentlyPlayed.replace(recentlyPlayed)
          } else {
            console.log('no recently played data')
          }
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

            // Transform stored recentlyPlayed data if it exists
            const storedRecentlyPlayed = userData.recentlyPlayed || []
            const normalizedRecentlyPlayed = storedRecentlyPlayed.map(
              (item: any) => ({
                songId: item.song_id || item.songId,
                playedAt: item.played_at || item.playedAt,
              }),
            )

            const userWithDefaults = {
              ...userData,
              recentlyPlayed: normalizedRecentlyPlayed,
              dateJoined: new Date(userData.dateJoined),
            }

            setAuthToken(storedToken)
            setUser(userWithDefaults)

            // Load recently played data from DB
            if (userData.id) {
              const recentlyPlayedData = yield db
                .select()
                .from(recentlyPlayed)
                .where(eq(recentlyPlayed.userId, userData.id))
                .orderBy(desc(recentlyPlayed.playedAt))
                .limit(20)
                .execute()

              if (self.user && recentlyPlayedData.length > 0) {
                // Transform DB data to match our model
                self.user.recentlyPlayed.replace(
                  recentlyPlayedData.map(
                    (data: { songId: number; playedAt: Date }) => ({
                      songId: data.songId,
                      playedAt: data.playedAt,
                    }),
                  ),
                )
              }
            }

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
        this.setRecentlyPlayed([])
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
            // Load favorite songs
            const favoriteSongIds = yield favoritesService.getFavoriteSongIds(
              userData.id,
            )
            if (self.user) {
              self.user.setFavoriteSongIds(favoriteSongIds)
            }
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
          console.log('restoring user', data.user)
          setUser(data.user)
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
        if (data.favoriteSongIds) {
          self.user?.setFavoriteSongIds(data.favoriteSongIds)
        }
        if (data.recentlyPlayed) {
          self.recentlyPlayed.replace(data.recentlyPlayed)
        }
        if (data.favoriteCategories) {
          self.user?.favoriteCategories.replace(data.favoriteCategories)
        }
        if (data.libraryFilter) {
          self.libraryFilter = data.libraryFilter
        }
        if (data.isCreatePlaylistModalVisible) {
          self.isCreatePlaylistModalVisible = data.isCreatePlaylistModalVisible
        }
        if (data.isDeletePlaylistModalVisible) {
          self.isDeletePlaylistModalVisible = data.isDeletePlaylistModalVisible
        }
        if (data.isAddToPlaylistModalVisible) {
          self.isAddToPlaylistModalVisible = data.isAddToPlaylistModalVisible
        }
        if (data.selectedPlaylistId) {
          self.selectedPlaylistId = data.selectedPlaylistId
        }
        if (data.selectedSongId) {
          self.selectedSongId = data.selectedSongId
        }
        if (data.newPlaylistName) {
          self.newPlaylistName = data.newPlaylistName
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
        if (data.favoriteSongIds) {
          self.user?.setFavoriteSongIds(data.favoriteSongIds)
        }
      },

      setLibraryFilter(
        filter: 'playlists' | 'artists' | 'albums' | 'songs' | 'history',
      ) {
        self.libraryFilter = filter
      },

      setCreatePlaylistModalVisible(visible: boolean) {
        self.isCreatePlaylistModalVisible = visible
        if (!visible) {
          self.newPlaylistName = ''
        }
      },

      setDeletePlaylistModalVisible(visible: boolean) {
        self.isDeletePlaylistModalVisible = visible
        if (!visible) {
          self.selectedPlaylistId = null
        }
      },

      setAddToPlaylistModalVisible(visible: boolean) {
        self.isAddToPlaylistModalVisible = visible
        if (!visible) {
          self.selectedPlaylistId = null
          self.selectedSongId = null
        }
      },

      setSelectedPlaylistId(id: number | null) {
        self.selectedPlaylistId = id
      },

      setSelectedSongId(id: number | null) {
        self.selectedSongId = id
      },

      setNewPlaylistName(name: string) {
        self.newPlaylistName = name
      },

      setRecentlyPlayed(
        recentlyPlayed: Instance<typeof RecentlyPlayedModel>[],
      ) {
        self.recentlyPlayed.replace(recentlyPlayed)
      },

      clearPlaylistInfo() {
        self.selectedPlaylistId = null
        self.newPlaylistName = ''
        self.isAddToPlaylistModalVisible = false
        self.isDeletePlaylistModalVisible = false
        self.isCreatePlaylistModalVisible = false
        self.selectedSongId = null
        self.newPlaylistName = ''
        self.selectedPlaylistId = null
        self.selectedSongId = null
      },

      // addToRecentlyPlayed(songId: number) {
      //   const latestEntry = {
      //     songId,
      //     playedAt: new Date().toISOString(),
      //   }
      //   self.recentlyPlayed.push(latestEntry)
      // },
    }
  })

export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshotOut
  extends SnapshotOut<typeof UserStoreModel> {}
export interface UserStoreSnapshotIn
  extends SnapshotIn<typeof UserStoreModel> {}
