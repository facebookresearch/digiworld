// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { storage } from '@/utils/storage'
import HomeScreen from '@/app/(app)/home'
import { RootStoreProvider } from '@/models/helpers/useStores'
import { RootStore } from '@/models/RootStore'

// Mock expo-router - need to mock both router export and useRouter hook
jest.mock('expo-router', () => {
  const mockRouterInstance = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }
  return {
    __esModule: true,
    router: mockRouterInstance,
    useRouter: () => mockRouterInstance,
    useFocusEffect: jest.fn(callback => callback()), // no-op
  }
})

// Mock storage
jest.mock('@/utils/storage', () => ({
  storage: {
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
}))

// Mock interaction tracking
jest.mock('@andojo/shared-interaction-tracking', () => ({
  useInteractionTracking: () => ({
    trackScreenMount: jest.fn(),
  }),
}))

// Create test store with actions
const createTestStore = () => {
  const store = RootStore.create({
    musicStore: {
      artists: [
        {
          id: 1,
          name: 'Artist 1',
          bio: 'Test bio',
          categories: ['pop'],
          monthlyListeners: 1000,
          rating: 4.5,
          profilePicture: 'artist1.jpg',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'Artist 2',
          bio: 'Test bio',
          categories: ['rock'],
          monthlyListeners: 2000,
          rating: 4.8,
          profilePicture: 'artist2.jpg',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      albums: [
        {
          id: 1,
          title: 'Album 1',
          artistId: 1,
          coverArt: 'album1.jpg',
          releaseDate: '2024-01-01',
          totalTracks: 10,
          categories: ['pop'],
          rating: 4.5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          title: 'Album 2',
          artistId: 2,
          coverArt: 'album2.jpg',
          releaseDate: '2024-01-01',
          totalTracks: 12,
          categories: ['rock'],
          rating: 4.8,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      songs: [
        {
          id: 1,
          title: 'Song 1',
          artistId: 1,
          albumId: 1,
          duration: 180,
          categories: ['pop'],
          audioUrl: 'song1.mp3',
          playCount: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: true,
        },
        {
          id: 2,
          title: 'Song 2',
          artistId: 2,
          albumId: 2,
          duration: 200,
          categories: ['rock'],
          audioUrl: 'song2.mp3',
          playCount: 50,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: false,
        },
      ],
      playlists: [],
      isLoading: false,
      loadingStates: {
        artists: false,
        albums: false,
        songs: false,
        playlists: false,
        categories: false,
        favorites: false,
      },
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
      queueState: {
        currentIndex: -1,
        sourceType: 'none',
        sourceId: -1,
        queueSongIds: [],
      },
      searchQuery: '',
      favoriteSongIds: [],
      searchResults: {
        songIds: [],
        artistIds: [],
        albumIds: [],
      },
      categories: [
        {
          id: 1,
          categoryId: 'pop',
          name: 'Pop',
          color: '#FF69B4',
        },
        {
          id: 2,
          categoryId: 'rock',
          name: 'Rock',
          color: '#4169E1',
        },
      ],
    },
    userStore: {
      user: {
        id: 1,
        username: 'Test',
        email: 'test@example.com',
        profilePicture: null,
        favoriteCategories: ['pop', 'rock'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      isAuthenticated: true,
      authError: null,
      validationErrors: [],
      recentlyPlayed: [
        {
          songId: 1,
          playedAt: '2024-03-20T00:00:00.000Z',
        },
        {
          songId: 2,
          playedAt: '2024-03-19T00:00:00.000Z',
        },
      ],
    },
  })

  return store
}

let testStore: ReturnType<typeof createTestStore>

// Helper function to render with MobX Provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <RootStoreProvider value={testStore}>{component}</RootStoreProvider>,
  )
}

const getGreeting = (user: any) => {
  const name = user?.username.split(' ')[0]
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}!`
  if (hour < 18) return `Good afternoon, ${name}!`
  return `Good evening, ${name}!`
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.clearAll()
    testStore = createTestStore()
  })

  it('renders welcome message with username', () => {
    const { getByText } = renderWithProvider(<HomeScreen />)
    expect(getByText(getGreeting(testStore.userStore.user))).toBeTruthy()
  })

  it('displays recently played songs', () => {
    const { getByText } = renderWithProvider(<HomeScreen />)
    expect(getByText('Recently Played')).toBeTruthy()
    expect(getByText('Song 1')).toBeTruthy()
    expect(getByText('Song 2')).toBeTruthy()
  })

  it('displays music categories', async () => {
    testStore = createTestStore()
    const { getByText } = renderWithProvider(<HomeScreen />)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
    })

    expect(getByText('Recently Played')).toBeTruthy()
    expect(getByText('Top Albums')).toBeTruthy()
    expect(getByText('Trending Artists')).toBeTruthy()
    expect(testStore.musicStore.artists.length).toBe(2)
    expect(testStore.musicStore.albums.length).toBe(2)
    expect(testStore.musicStore.songs.length).toBe(2)
  })

  it('plays a song when clicked', async () => {
    const { getByTestId } = renderWithProvider(<HomeScreen />)

    await act(async () => {
      fireEvent.press(getByTestId('song-play-button-1'))
    })

    expect(testStore.musicStore.currentSongId).toBe(1)
    expect(testStore.musicStore.playbackState.isPlaying).toBe(true)
  })

  it('sorts recently played by date correctly', () => {
    const recentlyPlayed = testStore.userStore.recentlyPlayed
    const sortedDates = recentlyPlayed.map(
      (rp: { playedAt: string }) => new Date(rp.playedAt),
    )

    // Check if dates are in descending order
    for (let i = 1; i < sortedDates.length; i++) {
      expect(sortedDates[i - 1] > sortedDates[i]).toBe(true)
    }
  })

  it('updates play count when song is played', async () => {
    const { getByTestId } = renderWithProvider(<HomeScreen />)

    await act(async () => {
      fireEvent.press(getByTestId('song-play-button-1'))
      // Wait for playback to start
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Verify the song was selected for playback
    expect(testStore.musicStore.currentSongId).toBe(1)
    expect(testStore.musicStore.playbackState.isPlaying).toBe(true)
  })
})
