import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { storage } from '@/utils/storage'
import ProfileScreen from '@/app/(app)/profile'
import { RootStoreProvider } from '@/models/helpers/useStores'
import { RootStore } from '@/models/RootStore'

// Create mock router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: jest.fn(callback => callback()), // no-op
}))

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

// Create a fresh store for each test
const createTestStore = () => {
  const store = RootStore.create({
    userStore: {
      user: {
        id: 1,
        username: 'Test User',
        email: 'test@example.com',
        profilePicture: null,
        favoriteCategories: [],
        favoriteSongIds: [],
        recentlyPlayed: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      isAuthenticated: true,
      authError: null,
      validationErrors: [],
      recentlyPlayed: [
        {
          songId: 1,
          playedAt: new Date('2024-03-20').toISOString(),
        },
        {
          songId: 2,
          playedAt: new Date('2024-03-19').toISOString(),
        },
      ],
    },
    uiStore: {
      isDeeplinkLoading: false,
      storagePermissionUri: null,
      isDrawerOpen: false,
    },
    musicStore: {
      artists: [],
      albums: [],
      songs: [
        {
          id: 1,
          title: 'Song 1',
          duration: 180, // 3 minutes
          artistId: 1,
          albumId: 1,
          audioUrl: 'https://example.com/song1.mp3',
          playCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: false,
        },
        {
          id: 2,
          title: 'Song 2',
          duration: 240, // 4 minutes
          artistId: 1,
          albumId: 1,
          audioUrl: 'https://example.com/song2.mp3',
          playCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: false,
        },
      ],
      playlists: [
        {
          id: 1,
          name: 'My Playlist',
          userId: 1,
          songs: [
            {
              id: 1,
              title: 'Song 1',
              duration: 180,
              artistId: 1,
              albumId: 1,
              audioUrl: 'https://example.com/song1.mp3',
              playCount: 0,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              isFavorite: false,
            },
            {
              id: 2,
              title: 'Song 2',
              duration: 240,
              artistId: 1,
              albumId: 1,
              audioUrl: 'https://example.com/song2.mp3',
              playCount: 0,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              isFavorite: false,
            },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
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

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.clearAll()
    testStore = createTestStore()
  })

  it('renders user information correctly', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)

    expect(getByText('Test User')).toBeTruthy()
    expect(getByText('test@example.com')).toBeTruthy()
  })

  it('displays correct playlist count', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)

    expect(getByText('1')).toBeTruthy() // Number of playlists
    expect(getByText('Playlists')).toBeTruthy()
  })

  it('displays correct time spent', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)

    // Total duration is 7 minutes (420 seconds)
    expect(getByText('7 mins')).toBeTruthy()
    expect(getByText('Time Spent')).toBeTruthy()
  })

  it('navigates to terms and privacy policy', async () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)

    await act(async () => {
      fireEvent.press(getByText('Terms & Conditions'))
      fireEvent.press(getByText('Privacy Policy'))
    })

    expect(mockRouter.push).toHaveBeenCalledWith('/(legal)/terms')
    expect(mockRouter.push).toHaveBeenCalledWith('/(legal)/privacy')
  })

  it('handles logout correctly', async () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)

    await act(async () => {
      fireEvent.press(getByText('Log out'))
    })

    expect(testStore.userStore.isAuthenticated).toBe(false)
    expect(testStore.userStore.user).toBeNull()
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
  })

  it('renders menu sections correctly', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />)
    // Legal section
    expect(getByText('Legal')).toBeTruthy()
    expect(getByText('Terms & Conditions')).toBeTruthy()
    expect(getByText('Privacy Policy')).toBeTruthy()
  })
})
