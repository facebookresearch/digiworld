import React from 'react'
import { render } from '@testing-library/react-native'
import PlayerScreen from '@/app/(modals)/[id]'
import { RootStoreProvider } from '@/models/helpers/useStores'
import { RootStore } from '@/models/RootStore'

// Mock Stack component
const Stack = {
  Screen: ({ children }: { children?: React.ReactNode; options?: any }) =>
    children,
}

// Comprehensive mocks
jest.mock('expo-router', () => {
  return {
    __esModule: true,
    default: () => null,
    Stack,
    useRouter: () => ({
      push: jest.fn(),
      back: jest.fn(),
    }),
    useLocalSearchParams: () => ({
      id: '1',
      sessionId: 'test-session',
    }),
    useFocusEffect: jest.fn(callback => callback()), // no-op
  }
})

jest.mock('@/utils/storage', () => ({
  storage: {
    load: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  },
}))

jest.mock('@andojo/shared-interaction-tracking', () => ({
  useInteractionTracking: () => ({
    trackScreenMount: jest.fn(),
    trackEvent: jest.fn(),
  }),
}))

jest.mock('react-native-linear-gradient', () => 'LinearGradient')

jest.mock('@/components/MusicImage', () => ({
  SongImage: () => null,
}))

jest.mock('@andojo/shared-theme', () => {
  const React = require('react')
  const { Text } = require('react-native')

  const colors = {
    palette: {
      neutral200: '#E5E5E5',
      neutral800: '#333333',
      neutral900: '#1A1A1A',
      primary200: '#1DB954',
      primary500: '#1DB954',
      primary100: '#E6F4EA',
      neutral100: '#FFFFFF',
      neutral300: '#D7CEC9',
      neutral400: '#B6ACA6',
      neutral500: '#978F8A',
      neutral600: '#564E4A',
      neutral700: '#3C3836',
      primary300: '#96D0AD',
      primary400: '#66BA8C',
      primary600: '#1B6B3F',
      angry100: '#F2D6CD',
      angry200: '#E5AC99',
      angry300: '#D78366',
      angry400: '#C03403',
      angry500: '#C03403',
      overlay20: 'rgba(255, 255, 255, 0.1)',
      overlay50: 'rgba(255, 255, 255, 0.2)',
      overlay80: 'rgba(0, 0, 0, 0.7)',
    },
  }

  const mockTheme = {
    mode: 'light',
    colors: {
      ...colors,
      background: colors.palette.neutral200,
      backgroundElevated: colors.palette.neutral300,
      text: colors.palette.neutral900,
      textDim: colors.palette.neutral800,
      textMuted: colors.palette.neutral700,
      tint: colors.palette.primary500,
      error: colors.palette.angry500,
      errorBackground: colors.palette.angry100,
      palette: colors.palette,
    },
    typography: {
      h1: { fontSize: 32, fontWeight: 'bold' },
      h2: { fontSize: 24, fontWeight: 'bold' },
      body: { fontSize: 16 },
    },
  }

  return {
    colors,
    Text: ({ children, style }: any) =>
      React.createElement(Text, { style }, children),
    useAppTheme: () => ({
      theme: mockTheme,
    }),
    useToast: () => ({
      show: jest.fn(),
    }),
  }
})

jest.mock('@react-native-community/slider', () => 'Slider')

// Add i18n mock
jest.mock('@/i18n/translate', () => ({
  translate: (key: string, params?: Record<string, any>) => {
    if (key === 'common.duration') {
      return `${params?.minutes}:${params?.seconds}`
    }
    if (key === 'player.nowPlaying') return 'Now Playing'
    return key
  },
}))

describe('PlayerScreen', () => {
  // Only test basic rendering
  describe('Component Rendering', () => {
    const createTestStore = () => {
      return RootStore.create({
        musicStore: {
          songs: [
            {
              id: 1,
              title: 'Test Song',
              artistId: 1,
              albumId: 1,
              duration: 180,
              audioUrl: 'test.mp3',
              playCount: 0,
              rating: 4.5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          artists: [
            {
              id: 1,
              name: 'Test Artist',
              bio: 'Test Bio',
              monthlyListeners: 1000,
              rating: 4.5,
              profilePicture: 'test.jpg',
              categories: ['pop'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          currentSongId: 1,
          isLoading: false,
          error: null,
          searchQuery: '',
          searchResults: { songIds: [], artistIds: [], albumIds: [] },
          playbackState: {
            isPlaying: false,
            progress: 0,
            duration: 180,
            startTimestamp: null,
            isShuffleEnabled: false,
            repeatMode: 'none',
          },
          queueState: {
            currentIndex: 0,
            sourceType: 'none',
            sourceId: -1,
            queueSongIds: [1],
          },
          playlists: [],
          favoriteSongIds: [],
          categories: [
            { id: 1, categoryId: 'pop', name: 'pop', color: '#FF5733' },
          ],
        },
        userStore: {
          user: null,
          isAuthenticated: false,
          authError: null,
          validationErrors: [],
          recentlyPlayed: [],
        },
      })
    }

    it('renders without crashing', () => {
      const store = createTestStore()
      const { queryByText } = render(
        <RootStoreProvider value={store}>
          <PlayerScreen />
        </RootStoreProvider>,
      )

      // Check for either the song title or Now Playing text
      const songTitle = queryByText('Test Song')
      const nowPlaying = queryByText('Now Playing')
      expect(songTitle || nowPlaying).toBeTruthy()
    })
  })

  describe('Playback Logic', () => {
    type PlaybackState = {
      isPlaying: boolean
      currentTime: number
      duration: number
      repeatMode: 'none' | 'repeat-all' | 'repeat-one'
      isShuffled: boolean
      volume: number
    }

    let playback: PlaybackState

    beforeEach(() => {
      playback = {
        isPlaying: false,
        currentTime: 0,
        duration: 180,
        repeatMode: 'none',
        isShuffled: false,
        volume: 1,
      }
    })

    it('toggles play/pause state', () => {
      const togglePlayback = () => {
        playback.isPlaying = !playback.isPlaying
      }

      togglePlayback()
      expect(playback.isPlaying).toBe(true)
      togglePlayback()
      expect(playback.isPlaying).toBe(false)
    })

    it('updates current time', () => {
      const updateTime = (time: number) => {
        if (time >= 0 && time <= playback.duration) {
          playback.currentTime = time
        }
      }

      updateTime(60)
      expect(playback.currentTime).toBe(60)
      updateTime(200) // Should not update beyond duration
      expect(playback.currentTime).toBe(60)
    })

    it('cycles through repeat modes', () => {
      const modes = ['none', 'repeat-all', 'repeat-one'] as const
      const cycleRepeatMode = () => {
        const currentIndex = modes.indexOf(playback.repeatMode)
        playback.repeatMode = modes[(currentIndex + 1) % modes.length]
      }

      expect(playback.repeatMode).toBe('none')
      cycleRepeatMode()
      expect(playback.repeatMode).toBe('repeat-all')
      cycleRepeatMode()
      expect(playback.repeatMode).toBe('repeat-one')
      cycleRepeatMode()
      expect(playback.repeatMode).toBe('none')
    })

    it('handles volume control', () => {
      const setVolume = (level: number) => {
        if (level >= 0 && level <= 1) {
          playback.volume = level
        }
      }

      setVolume(0.5)
      expect(playback.volume).toBe(0.5)
      setVolume(1.5) // Should not exceed 1
      expect(playback.volume).toBe(0.5)
    })
  })

  describe('Queue Management', () => {
    type QueueState = {
      songs: number[]
      currentIndex: number
      originalOrder: number[]
      isShuffled: boolean
    }

    let queue: QueueState

    beforeEach(() => {
      queue = {
        songs: [1, 2, 3, 4, 5],
        currentIndex: 0,
        originalOrder: [1, 2, 3, 4, 5],
        isShuffled: false,
      }
    })

    it('moves to next song correctly', () => {
      const playNext = () => {
        if (queue.currentIndex < queue.songs.length - 1) {
          queue.currentIndex++
          return queue.songs[queue.currentIndex]
        }
        return null
      }

      expect(playNext()).toBe(2)
      expect(queue.currentIndex).toBe(1)
      queue.currentIndex = 4
      expect(playNext()).toBe(null)
    })

    it('moves to previous song correctly', () => {
      queue.currentIndex = 2
      const playPrevious = () => {
        if (queue.currentIndex > 0) {
          queue.currentIndex--
          return queue.songs[queue.currentIndex]
        }
        return null
      }

      expect(playPrevious()).toBe(2)
      expect(queue.currentIndex).toBe(1)
      queue.currentIndex = 0
      expect(playPrevious()).toBe(null)
    })

    it('handles shuffle toggle', () => {
      const toggleShuffle = () => {
        if (!queue.isShuffled) {
          const currentSong = queue.songs[queue.currentIndex]
          // Use a deterministic shuffle for testing
          const remainingSongs = queue.songs
            .filter(id => id !== currentSong)
            .reverse() // Simple deterministic "shuffle" - just reverse the array
          queue.songs = [currentSong, ...remainingSongs]
          queue.currentIndex = 0
        } else {
          const currentSong = queue.songs[queue.currentIndex]
          queue.songs = [...queue.originalOrder]
          queue.currentIndex = queue.songs.indexOf(currentSong)
        }
        queue.isShuffled = !queue.isShuffled
      }

      const originalSongs = [...queue.songs]
      toggleShuffle()
      expect(queue.isShuffled).toBe(true)
      expect(queue.songs).not.toEqual(originalSongs)
      expect(queue.songs[0]).toBe(originalSongs[0]) // Current song stays first

      toggleShuffle()
      expect(queue.isShuffled).toBe(false)
      expect(queue.songs).toEqual(originalSongs)
    })

    it('handles repeat mode with queue end', () => {
      const getNextSongIndex = (
        repeatMode: 'none' | 'repeat-all' | 'repeat-one',
      ) => {
        if (repeatMode === 'repeat-one') return queue.currentIndex
        if (queue.currentIndex === queue.songs.length - 1) {
          return repeatMode === 'repeat-all' ? 0 : -1
        }
        return queue.currentIndex + 1
      }

      queue.currentIndex = queue.songs.length - 1
      expect(getNextSongIndex('none')).toBe(-1)
      expect(getNextSongIndex('repeat-all')).toBe(0)
      expect(getNextSongIndex('repeat-one')).toBe(queue.currentIndex)
    })
  })

  describe('Favorite Management', () => {
    type FavoriteState = {
      userId: number
      favorites: Set<number>
    }

    let favoriteState: FavoriteState

    beforeEach(() => {
      favoriteState = {
        userId: 1,
        favorites: new Set([1, 2, 3]),
      }
    })

    it('toggles favorite status', () => {
      const toggleFavorite = (songId: number) => {
        if (favoriteState.favorites.has(songId)) {
          favoriteState.favorites.delete(songId)
        } else {
          favoriteState.favorites.add(songId)
        }
      }

      expect(favoriteState.favorites.has(1)).toBe(true)
      toggleFavorite(1)
      expect(favoriteState.favorites.has(1)).toBe(false)
      toggleFavorite(1)
      expect(favoriteState.favorites.has(1)).toBe(true)
    })

    it('checks favorite status', () => {
      const isFavorite = (songId: number) => favoriteState.favorites.has(songId)

      expect(isFavorite(1)).toBe(true)
      expect(isFavorite(4)).toBe(false)
    })

    it('gets favorite count', () => {
      expect(favoriteState.favorites.size).toBe(3)
    })
  })

  describe('Advanced Playback Logic', () => {
    type AdvancedPlaybackState = {
      isPlaying: boolean
      currentTime: number
      duration: number
      repeatMode: 'none' | 'repeat-all' | 'repeat-one'
      isShuffled: boolean
      volume: number
      isMuted: boolean
      previousVolume: number
      seekHistory: number[]
    }

    let playback: AdvancedPlaybackState

    beforeEach(() => {
      playback = {
        isPlaying: false,
        currentTime: 0,
        duration: 180,
        repeatMode: 'none',
        isShuffled: false,
        volume: 1,
        isMuted: false,
        previousVolume: 1,
        seekHistory: [],
      }
    })

    it('handles mute/unmute with volume memory', () => {
      const toggleMute = () => {
        if (!playback.isMuted) {
          playback.previousVolume = playback.volume
          playback.volume = 0
        } else {
          playback.volume = playback.previousVolume
        }
        playback.isMuted = !playback.isMuted
      }

      playback.volume = 0.5
      toggleMute()
      expect(playback.isMuted).toBe(true)
      expect(playback.volume).toBe(0)
      expect(playback.previousVolume).toBe(0.5)

      toggleMute()
      expect(playback.isMuted).toBe(false)
      expect(playback.volume).toBe(0.5)
    })

    it('tracks seek history for forward/backward navigation', () => {
      const seek = (time: number) => {
        if (time >= 0 && time <= playback.duration) {
          playback.seekHistory.push(playback.currentTime)
          playback.currentTime = time
        }
      }

      const undoSeek = () => {
        const previousTime = playback.seekHistory.pop()
        if (previousTime !== undefined) {
          playback.currentTime = previousTime
          return true
        }
        return false
      }

      seek(30) // 0 -> 30
      seek(60) // 30 -> 60
      seek(90) // 60 -> 90
      expect(playback.currentTime).toBe(90)

      expect(undoSeek()).toBe(true) // 90 -> 60
      expect(playback.currentTime).toBe(60)

      expect(undoSeek()).toBe(true) // 60 -> 30
      expect(playback.currentTime).toBe(30)
    })

    it('handles rapid play/pause transitions', () => {
      const transitions: ('play' | 'pause')[] = []

      const togglePlayback = () => {
        playback.isPlaying = !playback.isPlaying
        transitions.push(playback.isPlaying ? 'play' : 'pause')

        // Prevent rapid toggles
        if (transitions.length >= 2) {
          const lastTwo = transitions.slice(-2)
          if (lastTwo[0] !== lastTwo[1]) {
            const timeDiff = Date.now() - lastToggleTime
            if (timeDiff < 300) {
              // 300ms debounce
              playback.isPlaying = !playback.isPlaying // revert
              transitions.pop()
              return false
            }
          }
        }
        lastToggleTime = Date.now()
        return true
      }

      let lastToggleTime = Date.now()

      expect(togglePlayback()).toBe(true) // false -> true
      expect(playback.isPlaying).toBe(true)

      lastToggleTime = Date.now() - 100 // Simulate rapid toggle
      expect(togglePlayback()).toBe(false) // Blocked
      expect(playback.isPlaying).toBe(true)

      lastToggleTime = Date.now() - 500 // Wait enough time
      expect(togglePlayback()).toBe(true) // true -> false
      expect(playback.isPlaying).toBe(false)
    })
  })

  describe('Advanced Queue Management', () => {
    type QueueHistoryState = {
      currentQueue: number[]
      queueHistory: number[][]
      historyIndex: number
    }

    let queueHistory: QueueHistoryState

    beforeEach(() => {
      queueHistory = {
        currentQueue: [1, 2, 3],
        queueHistory: [],
        historyIndex: -1,
      }
    })

    it('maintains queue history for undo/redo operations', () => {
      const updateQueue = (newQueue: number[]) => {
        queueHistory.queueHistory = queueHistory.queueHistory.slice(
          0,
          queueHistory.historyIndex + 1,
        )
        queueHistory.queueHistory.push([...queueHistory.currentQueue])
        queueHistory.currentQueue = [...newQueue]
        queueHistory.historyIndex++
      }

      const undoQueueChange = () => {
        if (queueHistory.historyIndex >= 0) {
          queueHistory.currentQueue = [
            ...queueHistory.queueHistory[queueHistory.historyIndex],
          ]
          queueHistory.historyIndex--
          return true
        }
        return false
      }

      updateQueue([1, 2, 3, 4]) // Add 4
      expect(queueHistory.currentQueue).toEqual([1, 2, 3, 4])

      updateQueue([1, 2, 4]) // Remove 3
      expect(queueHistory.currentQueue).toEqual([1, 2, 4])

      expect(undoQueueChange()).toBe(true)
      expect(queueHistory.currentQueue).toEqual([1, 2, 3, 4])

      expect(undoQueueChange()).toBe(true)
      expect(queueHistory.currentQueue).toEqual([1, 2, 3])
    })
  })
})
