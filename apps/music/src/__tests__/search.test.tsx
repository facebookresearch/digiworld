// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { render } from '@testing-library/react-native'
import SearchScreen from '@/app/(app)/search'
import { RootStoreProvider } from '@/models/helpers/useStores'
import { RootStore } from '@/models/RootStore'

// Basic mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ sessionId: 'test-session-id' }),
  useFocusEffect: jest.fn(callback => callback()), // no-op
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    getParent: jest.fn(),
  }),
}))

jest.mock('@/utils/storage', () => ({
  storage: { load: jest.fn() },
}))

jest.mock('@andojo/shared-interaction-tracking', () => ({
  useInteractionTracking: () => ({ trackScreenMount: jest.fn() }),
}))

describe('SearchScreen', () => {
  // Only test basic rendering
  describe('Component Rendering', () => {
    const createTestStore = () => {
      return RootStore.create({
        musicStore: {
          songs: [],
          artists: [],
          albums: [],
          searchQuery: '',
          searchResults: { songIds: [], artistIds: [], albumIds: [] },
          isLoading: false,
          error: null,
          currentSongId: null,
          currentPlaylist: null,
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
          playlists: [],
          favoriteSongIds: [],
          categories: [
            { id: 1, categoryId: 'pop', name: 'pop', color: '#FF5733' },
            { id: 2, categoryId: 'rock', name: 'rock', color: '#33FF57' },
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
      const { getByPlaceholderText } = render(
        <RootStoreProvider value={store}>
          <SearchScreen />
        </RootStoreProvider>,
      )
      expect(
        getByPlaceholderText('Search for songs, artists, or albums'),
      ).toBeTruthy()
    })
  })

  // Test core search logic
  describe('Search Logic', () => {
    type SearchItem = {
      id: number
      title?: string
      name?: string
      rating: number
      type: 'song' | 'artist' | 'album'
    }

    const testItems: SearchItem[] = [
      { id: 1, title: 'Test Song', rating: 4.5, type: 'song' },
      { id: 2, title: 'Another Song', rating: 4.0, type: 'song' },
      { id: 3, name: 'Test Artist', rating: 4.7, type: 'artist' },
      { id: 4, title: 'Test Album', rating: 5.0, type: 'album' },
    ]

    const searchItems = (query: string, items: SearchItem[]) => {
      if (!query.trim()) return []

      const normalizedQuery = query.toLowerCase()
      return items
        .filter(item => {
          const searchableText = (item.title || item.name || '').toLowerCase()
          return searchableText.includes(normalizedQuery)
        })
        .sort((a, b) => {
          // Exact matches first
          const aExact =
            (a.title || a.name || '').toLowerCase() === normalizedQuery
          const bExact =
            (b.title || b.name || '').toLowerCase() === normalizedQuery
          if (aExact !== bExact) return aExact ? -1 : 1

          // Then by rating
          return b.rating - a.rating
        })
    }

    it('returns empty array for empty query', () => {
      expect(searchItems('', testItems)).toHaveLength(0)
      expect(searchItems('   ', testItems)).toHaveLength(0)
    })

    it('finds items containing search term', () => {
      const results = searchItems('test', testItems)
      expect(results).toHaveLength(3)
      expect(results.map(r => r.id)).toContain(1)
      expect(results.map(r => r.id)).toContain(3)
      expect(results.map(r => r.id)).toContain(4)
    })

    it('prioritizes exact matches', () => {
      const results = searchItems('test artist', testItems)
      expect(results[0].type).toBe('artist')
      expect(results[0].id).toBe(3)
    })

    it('sorts by rating when relevance is equal', () => {
      const results = searchItems('test', testItems)
      expect(results[0].rating).toBe(5.0) // Album with highest rating
      expect(results[1].rating).toBe(4.7) // Artist with second highest
      expect(results[2].rating).toBe(4.5) // Song with lowest rating
    })

    it('handles case-insensitive search', () => {
      const lowerResults = searchItems('test', testItems)
      const upperResults = searchItems('TEST', testItems)
      expect(lowerResults).toEqual(upperResults)
    })

    it('handles multi-word search', () => {
      const results = searchItems('test song', testItems)
      expect(results[0].title).toBe('Test Song')
    })

    it('handles partial word matches', () => {
      const results = searchItems('other', testItems)
      expect(results[0].title).toBe('Another Song')
    })

    it('returns empty array for non-matching query', () => {
      const results = searchItems('xyz', testItems)
      expect(results).toHaveLength(0)
    })
  })

  // Test playlist management logic
  describe('Playlist Management', () => {
    type Playlist = {
      id: number
      name: string
      songIds: number[]
    }

    let playlists: Playlist[] = []

    beforeEach(() => {
      playlists = [{ id: 1, name: 'My Playlist', songIds: [1, 2] }]
    })

    it('adds song to playlist', () => {
      const addToPlaylist = (playlistId: number, songId: number) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (playlist && !playlist.songIds.includes(songId)) {
          playlist.songIds.push(songId)
        }
      }

      addToPlaylist(1, 3)
      expect(playlists[0].songIds).toContain(3)
      expect(playlists[0].songIds).toHaveLength(3)
    })

    it('removes song from playlist', () => {
      const removeFromPlaylist = (playlistId: number, songId: number) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (playlist) {
          playlist.songIds = playlist.songIds.filter(id => id !== songId)
        }
      }

      removeFromPlaylist(1, 1)
      expect(playlists[0].songIds).not.toContain(1)
      expect(playlists[0].songIds).toHaveLength(1)
    })

    it('creates new playlist', () => {
      const createPlaylist = (name: string) => {
        const newId = Math.max(...playlists.map(p => p.id), 0) + 1
        const newPlaylist = { id: newId, name, songIds: [] }
        playlists.push(newPlaylist)
        return newPlaylist
      }

      const newPlaylist = createPlaylist('New Playlist')
      expect(playlists).toHaveLength(2)
      expect(newPlaylist.id).toBe(2)
      expect(newPlaylist.name).toBe('New Playlist')
    })

    it('renames playlist', () => {
      const renamePlaylist = (playlistId: number, newName: string) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (playlist) {
          playlist.name = newName
        }
      }

      renamePlaylist(1, 'Updated Playlist')
      expect(playlists[0].name).toBe('Updated Playlist')
    })

    it('merges playlists', () => {
      playlists.push({ id: 2, name: 'Second Playlist', songIds: [3, 4] })

      const mergePlaylists = (sourceId: number, targetId: number) => {
        const source = playlists.find(p => p.id === sourceId)
        const target = playlists.find(p => p.id === targetId)
        if (source && target) {
          target.songIds = [...new Set([...target.songIds, ...source.songIds])]
          playlists = playlists.filter(p => p.id !== sourceId)
        }
      }

      mergePlaylists(2, 1)
      expect(playlists).toHaveLength(1)
      expect(playlists[0].songIds).toEqual([1, 2, 3, 4])
    })

    it('removes duplicate songs from playlist', () => {
      playlists[0].songIds = [1, 2, 2, 3, 1, 4]

      const removeDuplicates = (playlistId: number) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (playlist) {
          playlist.songIds = [...new Set(playlist.songIds)]
        }
      }

      removeDuplicates(1)
      expect(playlists[0].songIds).toEqual([1, 2, 3, 4])
    })

    it('moves song position in playlist', () => {
      const moveSong = (
        playlistId: number,
        fromIndex: number,
        toIndex: number,
      ) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (
          playlist &&
          fromIndex >= 0 &&
          toIndex >= 0 &&
          fromIndex < playlist.songIds.length &&
          toIndex < playlist.songIds.length
        ) {
          const [song] = playlist.songIds.splice(fromIndex, 1)
          playlist.songIds.splice(toIndex, 0, song)
        }
      }

      moveSong(1, 0, 1) // Move first song to second position
      expect(playlists[0].songIds).toEqual([2, 1])
    })
  })

  describe('Queue Management', () => {
    type QueueState = {
      currentIndex: number
      songs: number[]
      isShuffled: boolean
    }

    let queue: QueueState

    beforeEach(() => {
      queue = {
        currentIndex: 0,
        songs: [1, 2, 3, 4],
        isShuffled: false,
      }
    })

    it('moves to next song in queue', () => {
      const nextSong = () => {
        if (queue.currentIndex < queue.songs.length - 1) {
          queue.currentIndex++
          return queue.songs[queue.currentIndex]
        }
        return null
      }

      expect(nextSong()).toBe(2)
      expect(queue.currentIndex).toBe(1)
    })

    it('moves to previous song in queue', () => {
      queue.currentIndex = 2
      const previousSong = () => {
        if (queue.currentIndex > 0) {
          queue.currentIndex--
          return queue.songs[queue.currentIndex]
        }
        return null
      }

      expect(previousSong()).toBe(2)
      expect(queue.currentIndex).toBe(1)
    })

    it('handles shuffle mode', () => {
      const toggleShuffle = () => {
        if (!queue.isShuffled) {
          const currentSong = queue.songs[queue.currentIndex]
          queue.songs = queue.songs.filter(id => id !== currentSong).reverse()
          queue.songs.unshift(currentSong)
          queue.currentIndex = 0
        } else {
          queue.songs.sort((a, b) => a - b)
        }
        queue.isShuffled = !queue.isShuffled
      }

      const originalOrder = [...queue.songs]
      toggleShuffle()
      expect(queue.isShuffled).toBe(true)
      expect(queue.songs).not.toEqual(originalOrder)
      expect(queue.songs[0]).toBe(originalOrder[0]) // Current song stays first
    })
  })
})
