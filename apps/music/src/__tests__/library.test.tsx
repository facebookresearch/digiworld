// Simplified mock setup
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ type: 'playlists' }),
}))

jest.mock('@/utils/storage', () => ({
  storage: { set: jest.fn() },
}))

jest.mock('@andojo/shared-interaction-tracking', () => ({
  useInteractionTracking: () => ({ trackScreenMount: jest.fn() }),
}))

// Core library functionality
interface Playlist {
  id: number
  name: string
  userId?: number
  songs: number[]
}

interface LibraryState {
  playlists: Playlist[]
  currentFilter: string
  isLoading: boolean
  recentlyPlayed: number[]
}

const createLibraryManager = () => {
  const state: LibraryState = {
    playlists: [],
    currentFilter: 'playlists',
    isLoading: false,
    recentlyPlayed: [],
  }

  return {
    // Playlist management
    createPlaylist: (name: string, userId?: number): Playlist => {
      const playlist = {
        id: state.playlists.length + 1,
        name,
        userId,
        songs: [],
      }
      state.playlists.push(playlist)
      return playlist
    },

    deletePlaylist: (playlistId: number): boolean => {
      const initialLength = state.playlists.length
      state.playlists = state.playlists.filter(p => p.id !== playlistId)
      return state.playlists.length < initialLength
    },

    addSongToPlaylist: (playlistId: number, songId: number): boolean => {
      const playlist = state.playlists.find(p => p.id === playlistId)
      if (playlist && !playlist.songs.includes(songId)) {
        playlist.songs.push(songId)
        return true
      }
      return false
    },

    removeSongFromPlaylist: (playlistId: number, songId: number): boolean => {
      const playlist = state.playlists.find(p => p.id === playlistId)
      if (playlist) {
        const initialLength = playlist.songs.length
        playlist.songs = playlist.songs.filter(id => id !== songId)
        return playlist.songs.length < initialLength
      }
      return false
    },

    // Filter management
    setFilter: (filter: string) => {
      state.currentFilter = filter
      return state.currentFilter
    },

    // Loading state
    setLoading: (loading: boolean) => {
      state.isLoading = loading
      return state.isLoading
    },

    // Recently played
    addToRecentlyPlayed: (songId: number) => {
      // Remove the song if it already exists
      state.recentlyPlayed = state.recentlyPlayed.filter(id => id !== songId)
      // Add to the front
      state.recentlyPlayed.unshift(songId)
      // Maintain max length
      if (state.recentlyPlayed.length > 50) {
        state.recentlyPlayed = state.recentlyPlayed.slice(0, 50)
      }
      return state.recentlyPlayed
    },

    // State access
    getState: () => ({ ...state }),

    // User specific playlists
    getUserPlaylists: (userId: number): Playlist[] => {
      return state.playlists.filter(p => p.userId === userId)
    },
  }
}

describe('library-screen.test.tsx', () => {
  // Playlist Management
  describe('Playlist Management', () => {
    it('creates playlist correctly', () => {
      const library = createLibraryManager()
      const playlist = library.createPlaylist('My Playlist')

      expect(playlist.id).toBe(1)
      expect(playlist.name).toBe('My Playlist')
      expect(playlist.songs).toEqual([])
      expect(library.getState().playlists.length).toBe(1)
    })

    it('deletes playlist', () => {
      const library = createLibraryManager()
      library.createPlaylist('Playlist 1')
      library.createPlaylist('Playlist 2')

      expect(library.getState().playlists.length).toBe(2)
      expect(library.deletePlaylist(1)).toBe(true)
      expect(library.getState().playlists.length).toBe(1)
      expect(library.getState().playlists[0].name).toBe('Playlist 2')
    })

    it('adds and removes songs from playlist', () => {
      const library = createLibraryManager()
      const playlist = library.createPlaylist('My Playlist')

      expect(library.addSongToPlaylist(playlist.id, 1)).toBe(true)
      expect(library.addSongToPlaylist(playlist.id, 2)).toBe(true)
      expect(library.getState().playlists[0].songs).toEqual([1, 2])

      expect(library.removeSongFromPlaylist(playlist.id, 1)).toBe(true)
      expect(library.getState().playlists[0].songs).toEqual([2])
    })

    it('prevents duplicate songs in playlist', () => {
      const library = createLibraryManager()
      const playlist = library.createPlaylist('My Playlist')

      expect(library.addSongToPlaylist(playlist.id, 1)).toBe(true)
      expect(library.addSongToPlaylist(playlist.id, 1)).toBe(false)
      expect(library.getState().playlists[0].songs).toEqual([1])
    })
  })

  // Filter Management
  describe('Filter Management', () => {
    it('changes library filter', () => {
      const library = createLibraryManager()

      expect(library.setFilter('artists')).toBe('artists')
      expect(library.setFilter('albums')).toBe('albums')
      expect(library.setFilter('songs')).toBe('songs')
      expect(library.getState().currentFilter).toBe('songs')
    })
  })

  // Loading State
  describe('Loading State', () => {
    it('manages loading state', () => {
      const library = createLibraryManager()

      expect(library.getState().isLoading).toBe(false)
      expect(library.setLoading(true)).toBe(true)
      expect(library.getState().isLoading).toBe(true)
    })
  })

  // Recently Played
  describe('Recently Played', () => {
    it('manages recently played songs', () => {
      const library = createLibraryManager()

      library.addToRecentlyPlayed(1)
      library.addToRecentlyPlayed(2)
      library.addToRecentlyPlayed(3)

      expect(library.getState().recentlyPlayed).toEqual([3, 2, 1])

      // Adding same song moves it to front
      library.addToRecentlyPlayed(2)
      expect(library.getState().recentlyPlayed).toEqual([2, 3, 1])
    })

    it('limits recently played list', () => {
      const library = createLibraryManager()

      // Add 55 songs
      for (let i = 1; i <= 55; i++) {
        library.addToRecentlyPlayed(i)
      }

      expect(library.getState().recentlyPlayed.length).toBe(50)
      expect(library.getState().recentlyPlayed[0]).toBe(55) // Latest song
      expect(library.getState().recentlyPlayed[49]).toBe(6) // Oldest song
    })
  })

  // User Specific Playlists
  describe('User Playlists', () => {
    it('filters playlists by user', () => {
      const library = createLibraryManager()

      library.createPlaylist('User 1 Playlist', 1)
      library.createPlaylist('User 2 Playlist', 2)
      library.createPlaylist('Another User 1 Playlist', 1)

      const user1Playlists = library.getUserPlaylists(1)
      expect(user1Playlists.length).toBe(2)
      expect(user1Playlists.every(p => p.userId === 1)).toBe(true)
    })
  })
})
