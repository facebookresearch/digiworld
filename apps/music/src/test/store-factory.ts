import React from 'react'
import { render } from '@testing-library/react-native'
import { RootStore } from '@/models/RootStore'
import { RootStoreProvider } from '@/models/helpers/useStores'
import mockUsers from '../data/mock-users.json'
import mockSongs from '../data/mock-songs.json'
import mockArtists from '../data/mock-artists.json'
import mockAlbums from '../data/mock-albums.json'
import mockPlaylists from '../data/mock-playlists.json'
import mockCategories from '../data/mock-categories.json'
import {
  AppName,
  AssetConfigType,
  AssetManager,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management'

// Transform mock data to match MST model types
const transformData = {
  user: (user: any) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    favoriteCategories: user.favoriteCategories,
    favoriteSongIds: user.favoriteSongIds,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }),

  artist: (artist: any) => ({
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    categories: artist.categories,
    profilePicture: artist.profilePicture,
    monthlyListeners: artist.monthlyListeners,
    rating: artist.rating,
    createdAt: artist.createdAt,
    updatedAt: artist.updatedAt,
  }),

  album: (album: any) => ({
    id: album.id,
    title: album.title,
    artistId: album.artistId,
    releaseDate: album.releaseDate,
    coverArt: album.coverArt,
    totalTracks: album.totalTracks,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
  }),

  song: (song: any) => ({
    id: song.id,
    title: song.title,
    artistId: song.artistId,
    albumId: song.albumId,
    duration: song.duration,
    audioUrl: song.audioUrl,
    playCount: song.playCount,
    isFavorite: false,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  }),

  playlist: (playlist: any) => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    userId: playlist.userId,
    coverArt: playlist.coverArt,
    songs: [], // Will be populated based on songIds
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  }),

  category: (category: any, index: number) => ({
    id: index + 1,
    categoryId: category.id,
    name: category.name,
    color: category.color,
  }),
}

// Transform mock data
const users = mockUsers.map(transformData.user)
export const assetManager = AssetManager.initialize({
  appName: AppName.MUSIC,
  entityType: EntityType.SONGS,
  entityId: 1,
  assetType: AssetType.AUDIO,
  assetConfig: {
    type: AssetConfigType.MAIN,
    index: 0,
  },
})
const songs = mockSongs.map(transformData.song)
const artists = mockArtists.map(transformData.artist)
const albums = mockAlbums.map(transformData.album)
const playlists = mockPlaylists.map(playlist => {
  const transformed = transformData.playlist(playlist)
  transformed.songs = playlist.songIds
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean)
  return transformed
})
const categories = mockCategories.map((category, index) =>
  transformData.category(category, index),
)

// Create a fresh store for each test
export const createTestStore = (options = { isAuthenticated: false }) => {
  const store = RootStore.create({
    userStore: {
      user: options.isAuthenticated ? users[0] : null,
      isAuthenticated: options.isAuthenticated,
      authError: null,
      validationErrors: [],
      recentlyPlayed: options.isAuthenticated
        ? [
            {
              songId: songs[0].id,
              playedAt: new Date('2024-03-20').toISOString(),
            },
            {
              songId: songs[1].id,
              playedAt: new Date('2024-03-19').toISOString(),
            },
          ]
        : [],
      libraryFilter: 'playlists',
      isCreatePlaylistModalVisible: false,
      isDeletePlaylistModalVisible: false,
      isAddToPlaylistModalVisible: false,
      selectedPlaylistId: null,
      selectedSongId: null,
      newPlaylistName: '',
    },
    uiStore: {
      isDeeplinkLoading: false,
      storagePermissionUri: null,
      isDrawerOpen: false,
    },
    musicStore: {
      artists,
      albums,
      songs,
      playlists: options.isAuthenticated ? playlists : [],
      isLoading: false,
      error: null,
      currentPlaylist: null,
      currentSongId: null,
      playbackState: {
        isPlaying: false,
        progress: 0,
        duration: 0,
        startTimestamp: null,
        isShuffleEnabled: false,
        repeatMode: 'none',
      },
      queueState: {},
      searchQuery: '',
      favoriteSongIds: options.isAuthenticated
        ? [songs[0].id, songs[1].id]
        : [],
      searchResults: {
        songIds: [],
        artistIds: [],
        albumIds: [],
      },
      categories,
    },
    authStore: {
      loginState: {
        email: '',
        password: '',
        isLoading: false,
        currentFocused: null,
        validationErrors: [],
      },
      signupState: {
        name: '',
        email: '',
        password: '',
        isLoading: false,
        currentFocused: null,
        validationErrors: [],
      },
      currentScreen: 'none',
      setName: (name: string) =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          name,
        }),
      setEmail: (email: string) =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          email,
        }),
      setPassword: (password: string) =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          password,
        }),
      setFocused: (field: string | null) =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          field,
        }),
      clearValidationErrors: () =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          validationErrors: [],
        }),
      reset: () =>
        (store.authStore.signupState = {
          ...store.authStore.signupState,
          name: '',
          email: '',
          password: '',
          isLoading: false,
          currentFocused: null,
          validationErrors: [],
        }),
    },
  })
  return store
}

// Helper function to render with MobX Provider
export const renderWithProvider = (
  component: React.ReactElement,
  store = createTestStore(),
) => {
  return render(
    React.createElement(RootStoreProvider, { value: store }, component),
  )
}
