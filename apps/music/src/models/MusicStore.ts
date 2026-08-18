import { types, flow, Instance, cast, getRoot } from 'mobx-state-tree'
import { runInAction } from 'mobx'
import { queries } from '@/db/queries'
import { UserStoreModel } from './UserStore'
import { getRootStore } from './helpers/getRootStore'
import { withSetPropAction } from './helpers/withSetPropAction'

export const ArtistModel = types.model('Artist', {
  id: types.identifierNumber,
  name: types.string,
  bio: types.maybe(types.string),
  categories: types.array(types.string),
  monthlyListeners: types.number,
  rating: types.maybe(types.number),
  profilePicture: types.maybe(types.string),
  createdAt: types.string,
  updatedAt: types.string,
})

export const AlbumModel = types.model('Album', {
  id: types.identifierNumber,
  title: types.string,
  artistId: types.number,
  releaseDate: types.string,
  categories: types.array(types.string),
  coverArt: types.maybe(types.string),
  totalTracks: types.number,
  rating: types.maybe(types.number),
  createdAt: types.string,
  updatedAt: types.string,
})

export const SongModel = types.model('Song', {
  id: types.identifierNumber,
  title: types.string,
  artistId: types.number,
  albumId: types.number,
  duration: types.number,
  categories: types.array(types.string),
  audioUrl: types.string,
  coverArt: types.maybe(types.string),
  playCount: types.number,
  rating: types.maybe(types.number),
  createdAt: types.string,
  updatedAt: types.string,
  isFavorite: types.optional(types.boolean, false),
})

export const PlaylistSettingsModel = types.model('PlaylistSettings', {
  id: types.number,
  playlistId: types.number,
  isShuffleEnabled: types.boolean,
  repeatMode: types.string,
  lastPlayedSongId: types.maybeNull(types.number),
  createdAt: types.string,
  updatedAt: types.string,
})

export const PlaylistModel = types
  .model('Playlist', {
    id: types.identifierNumber,
    name: types.string,
    description: types.maybeNull(types.string),
    userId: types.number,
    categories: types.optional(types.array(types.string), []),
    coverArt: types.maybeNull(types.string),
    songIds: types.optional(types.array(types.number), []),
    createdAt: types.string,
    updatedAt: types.string,
    settings: types.maybeNull(
      types.model({
        id: types.number,
        playlistId: types.number,
        isShuffleEnabled: types.boolean,
        repeatMode: types.string,
        lastPlayedSongId: types.maybeNull(types.number),
        createdAt: types.string,
        updatedAt: types.string,
      }),
    ),
  })
  .views(self => ({
    get songs() {
      const store = getRoot<any>(self)
      return self.songIds
        .map(id => store.musicStore.songs.find((s: any) => s.id === id))
        .filter(Boolean)
    },
  }))

export const PlaybackState = types.model('PlaybackState', {
  isPlaying: types.optional(types.boolean, false),
  progress: types.optional(types.number, 0),
  duration: types.optional(types.number, 0),
  startTimestamp: types.maybeNull(types.number),
  isShuffleEnabled: types.optional(types.boolean, false),
  repeatMode: types.optional(
    types.enumeration(['none', 'repeat-one', 'repeat-all']),
    'none',
  ),
})

// Define a more comprehensive source type
export const SourceType = types.enumeration('SourceType', [
  'none',
  'album',
  'playlist',
  'artist',
  'search',
  'category',
])

type SourceTypeType = Instance<typeof SourceType>

export const QueueState = types.model('QueueState', {
  sourceType: types.optional(SourceType, 'none'),
  sourceId: types.optional(types.number, -1),
  queueSongIds: types.optional(types.array(types.number), []),
  currentIndex: types.optional(types.number, -1),
})

const LoadingStatesModel = types
  .model('LoadingStates', {
    artists: types.optional(types.boolean, false),
    albums: types.optional(types.boolean, false),
    songs: types.optional(types.boolean, false),
    playlists: types.optional(types.boolean, false),
    categories: types.optional(types.boolean, false),
    favorites: types.optional(types.boolean, false),
  })
  .actions(self => {
    let loading = false
    return {
      setLoading(type: keyof typeof self, value: boolean) {
        if (loading) return
        loading = true
        try {
          ;(self as any)[type] = value
        } finally {
          loading = false
        }
      },
      resetAll() {
        if (loading) return
        loading = true
        try {
          self.artists = false
          self.albums = false
          self.songs = false
          self.playlists = false
          self.categories = false
          self.favorites = false
        } finally {
          loading = false
        }
      },
    }
  })

export interface IMusicStore extends Instance<typeof MusicStoreModel> {}

export const MusicStoreModel = types
  .model('MusicStore')
  .props({
    artists: types.array(ArtistModel),
    albums: types.array(AlbumModel),
    songs: types.array(SongModel),
    playlists: types.array(PlaylistModel),
    isLoading: types.optional(types.boolean, false),
    loadingStates: types.optional(LoadingStatesModel, {
      artists: false,
      albums: false,
      songs: false,
      playlists: false,
      categories: false,
      favorites: false,
    }),
    error: types.union(types.string, types.undefined, types.null),
    currentPlaylist: types.maybeNull(types.reference(PlaylistModel)),
    currentSongId: types.maybeNull(types.number),
    playbackState: types.optional(PlaybackState, {
      isPlaying: false,
      progress: 0,
      duration: 0,
      startTimestamp: null,
      isShuffleEnabled: false,
      repeatMode: 'none',
    }),
    queueState: types.optional(QueueState, {}),
    userStore: types.maybeNull(types.late(() => UserStoreModel)),
    searchQuery: types.optional(types.string, ''),
    favoriteSongIds: types.optional(types.array(types.number), []),
    searchResults: types.optional(
      types.model({
        songIds: types.array(types.number),
        artistIds: types.array(types.number),
        albumIds: types.array(types.number),
      }),
      { songIds: [], artistIds: [], albumIds: [] },
    ),
    categories: types.optional(
      types.array(
        types.model({
          id: types.number,
          categoryId: types.string,
          name: types.string,
          color: types.string,
        }),
      ),
      [],
    ),
  })
  .views(self => {
    const views = {
      get currentSong() {
        return self.currentSongId
          ? self.songs.find(s => s.id === self.currentSongId)
          : null
      },

      get currentSongArtist() {
        const song = views.currentSong
        return song ? self.artists.find(a => a.id === song.artistId) : null
      },

      get currentSongAlbum() {
        const song = views.currentSong
        return song ? self.albums.find(a => a.id === song.albumId) : null
      },

      get queueSongs(): Instance<typeof SongModel>[] {
        return self.queueState.queueSongIds
          .map(id => self.songs.find(s => s.id === id))
          .filter(
            (song): song is Instance<typeof SongModel> => song !== undefined,
          )
      },

      get nextSongInQueue(): Instance<typeof SongModel> | null {
        if (self.queueState.currentIndex < 0 || !views.queueSongs.length) {
          return null
        }
        if (self.playbackState.isShuffleEnabled) {
          const availableSongs = views.queueSongs.filter(
            (_song: Instance<typeof SongModel>, i: number) =>
              i !== self.queueState.currentIndex,
          )
          if (!availableSongs.length) return null
          return availableSongs[
            Math.floor(Math.random() * availableSongs.length)
          ]
        }
        const nextIndex = self.queueState.currentIndex + 1
        return views.queueSongs[nextIndex] || null
      },

      get previousSongInQueue(): Instance<typeof SongModel> | null {
        if (self.queueState.currentIndex <= 0 || !views.queueSongs.length) {
          return null
        }
        if (self.playbackState.isShuffleEnabled) {
          const availableSongs = views.queueSongs.filter(
            (_song: Instance<typeof SongModel>, i: number) =>
              i !== self.queueState.currentIndex,
          )
          if (!availableSongs.length) return null
          return availableSongs[
            Math.floor(Math.random() * availableSongs.length)
          ]
        }
        const prevIndex = self.queueState.currentIndex - 1
        return views.queueSongs[prevIndex] || null
      },

      get hasError() {
        return !!self.error
      },

      get currentPlaylistSongs() {
        return self.currentPlaylist?.songs || []
      },

      get currentPlaylistSettings() {
        return self.currentPlaylist?.settings
      },

      get hasSearchResults() {
        return (
          self.searchResults.songIds.length > 0 ||
          self.searchResults.artistIds.length > 0 ||
          self.searchResults.albumIds.length > 0
        )
      },

      get searchResultSongs() {
        return self.searchResults.songIds
          .map(id => self.songs.find(s => s.id === id))
          .filter(Boolean)
      },

      get searchResultArtists() {
        return self.searchResults.artistIds
          .map(id => self.artists.find(a => a.id === id))
          .filter(Boolean)
      },

      get searchResultAlbums() {
        return self.searchResults.albumIds
          .map(id => self.albums.find(a => a.id === id))
          .filter(Boolean)
      },
      get progress() {
        return self.playbackState.progress
      },
    }
    return views
  })
  .actions(withSetPropAction)
  .actions(self => {
    // Helper functions
    const setLoadingState = (
      key:
        | 'artists'
        | 'albums'
        | 'songs'
        | 'playlists'
        | 'categories'
        | 'favorites',
      value: boolean,
    ) => {
      self.loadingStates.setLoading(key, value)
    }

    const resetLoadingStates = () => {
      self.loadingStates.resetAll()
    }

    const getPlaybackSettings = flow(function* (
      entityType: 'artist' | 'album' | 'playlist',
      entityId: number,
    ) {
      try {
        const settings = yield queries.getPlaybackSettings(entityType, entityId)
        return settings
      } catch (error) {
        console.error(`Error getting ${entityType} playback settings:`, error)
        return null
      }
    })

    // Helper function to check if a source type is valid for playback settings
    const isValidPlaybackSettingsType = (
      sourceType: string,
    ): sourceType is 'album' | 'playlist' | 'artist' => {
      return ['album', 'playlist', 'artist'].includes(sourceType)
    }

    const updateEntityPlaybackSettings = flow(function* (
      entityType: 'artist' | 'album' | 'playlist',
      entityId: number,
      settings: {
        shuffle?: boolean
        repeatMode?: 'none' | 'repeat-one' | 'repeat-all'
        lastPlayedSongId?: number | null
      },
    ) {
      try {
        const updatedSettings = yield queries.updatePlaybackSettings(
          entityType,
          entityId,
          settings,
        )
        if (updatedSettings) {
          // Update current playback state if this is the current playing entity
          const currentSourceType = self.queueState.sourceType
          if (
            isValidPlaybackSettingsType(currentSourceType) &&
            currentSourceType === entityType &&
            self.queueState.sourceId === entityId
          ) {
            if (settings.shuffle !== undefined) {
              self.playbackState.isShuffleEnabled = settings.shuffle
            }
            if (settings.repeatMode !== undefined) {
              self.playbackState.repeatMode = settings.repeatMode
            }
          }
        }
        return updatedSettings
      } catch (error) {
        console.error(`Error updating ${entityType} playback settings:`, error)
        return null
      }
    })

    const applyPlaybackSettings = flow(function* (
      entityType: 'artist' | 'album' | 'playlist',
      entityId: number,
    ) {
      const settings = yield getPlaybackSettings(entityType, entityId)
      if (settings) {
        self.playbackState.isShuffleEnabled = settings.shuffle === 1
        self.playbackState.repeatMode = settings.repeatMode
      } else {
        // Create default settings if none exist
        yield queries.createPlaybackSettings({
          entityType,
          entityId,
          shuffle: false,
          repeatMode: 'none',
        })
        self.playbackState.isShuffleEnabled = false
        self.playbackState.repeatMode = 'none'
      }
    })

    const updateRecentlyPlayed = flow(function* (songId: number) {
      try {
        const rootStore = getRootStore(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) return

        // Update in DB
        yield queries.addToRecentlyPlayed(userId, songId)

        // Update in store
        const recentlyPlayed = yield queries.getRecentlyPlayed(userId)
        rootStore.userStore.setRecentlyPlayed(recentlyPlayed)
      } catch (error) {
        console.error('Failed to update recently played:', error)
      }
    })

    const updateFavorites = flow(function* (userId: number) {
      const results = yield queries.updateFavorites(userId)
      self.songs = cast(results)
    })

    // Helper function to get next song in shuffle mode
    const getNextShuffleSong = (
      currentSongId: number | null,
      queueSongIds: number[],
    ): number | null => {
      if (queueSongIds.length === 0) return null
      if (queueSongIds.length === 1) return queueSongIds[0]

      // Filter out current song to avoid immediate repeat
      const availableSongs = currentSongId
        ? queueSongIds.filter(id => id !== currentSongId)
        : queueSongIds

      // If no songs left after filtering and repeat-all is on, use all songs
      if (
        availableSongs.length === 0 &&
        self.playbackState.repeatMode === 'repeat-all'
      ) {
        const randomIndex = Math.floor(Math.random() * queueSongIds.length)
        return queueSongIds[randomIndex]
      }

      // Pick random song from available songs
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length)
        return availableSongs[randomIndex]
      }

      return null
    }

    // Define return types for play functions
    type PlayResult = {
      success: boolean
      error?: string
    }

    // Define the actions type
    type Actions = {
      play(): void
      pause(): void
      togglePlayback(): void
      resetPlayback(): void
      stop(): void
      logout(): Promise<void>
      setDuration(seconds: number): void
      setProgress(seconds: number): void
      updatePlaybackProgress(progress: number): void
      setCurrentSong(
        songId: number,
        sourceType?: SourceTypeType,
        sourceId?: number,
      ): Promise<PlayResult>
      onSongComplete(): Promise<boolean>
      playNext(): Promise<void>
      playPrevious(): Promise<void>
      setCurrentPlaylist(playlistId: number): Promise<void>
      createPlaylist(data: {
        name: string
        userId: number
        description?: string
        coverArt?: string
      }): Promise<any>
      addSongToPlaylist(playlistId: number, songId: number): Promise<void>
      removeSongFromPlaylist(playlistId: number, songId: number): Promise<void>
      deletePlaylist(playlistId: number): Promise<void>
      toggleShuffle(): void
      setRepeatMode(mode: 'none' | 'repeat-one' | 'repeat-all'): void
      loadInitialData(): Promise<void>
      fetchUserPlaylists(userId: number): Promise<void>
      fetchTopAlbums(limit?: number): Promise<void>
      fetchRecentlyPlayed(userId: number): Promise<void>
      addToRecentlyPlayed(userId: number, songId: number): Promise<void>
      fetchFavorites(userId: number): Promise<void>
      toggleFavorite(userId: number, songId: number): Promise<void>
      searchItems(query: string): Promise<void>
      clearSearch(): void
      setError(error: string | null): void
      setLoading(loading: boolean): void
      updatePlayHistory(songId: number, playlistId: number): Promise<void>
      updatePlayCompletion(completionPercentage: number): Promise<void>
      playPlaylist(playlistId: number): Promise<PlayResult>
      playAlbum(albumId: number): Promise<PlayResult>
      playArtist(artistId: number): Promise<PlayResult>
      updatePlaylistSettings(
        playlistId: number,
        settings: {
          isShuffleEnabled: boolean
          repeatMode: 'none' | 'one' | 'all'
        },
      ): Promise<void>
      getRoot(): any
      reset(): void
      restore(snapshot: any): void
      setSearchResults(results: {
        songIds: number[]
        artistIds: number[]
        albumIds: number[]
      }): void
      applyPlaybackSettings(
        entityType: 'artist' | 'album' | 'playlist',
        entityId: number,
      ): Promise<void>
      setLoadingState(
        loadingState:
          | 'artists'
          | 'albums'
          | 'songs'
          | 'playlists'
          | 'categories'
          | 'favorites',
        value: boolean,
      ): void
    }
    let intervalTimer: NodeJS.Timeout | null = null

    const actions: Actions = {
      applyPlaybackSettings,
      setLoadingState,
      getRoot: () => getRootStore(self),
      // Playback Control Actions
      play() {
        self.playbackState.isPlaying = true
        if (intervalTimer) {
          clearInterval(intervalTimer)
        }
        intervalTimer = setInterval(() => {
          runInAction(() => {
            if (self.progress >= self.playbackState.duration) {
              actions.onSongComplete()
            } else {
              actions.setProgress(self.progress + 1)
            }
          })
        }, 1000)
      },
      pause() {
        if (intervalTimer) {
          clearInterval(intervalTimer)
        }
        self.playbackState.isPlaying = false
        self.playbackState.startTimestamp = null
      },
      togglePlayback() {
        if (self.playbackState.isPlaying) {
          actions.pause()
        } else {
          actions.play()
        }
      },
      resetPlayback() {
        // Reset playback state
        self.playbackState.isPlaying = false
        self.playbackState.progress = 0
        self.playbackState.duration = 0
        self.playbackState.startTimestamp = null
        self.playbackState.isShuffleEnabled = false
        self.playbackState.repeatMode = 'none'

        // Reset queue state
        self.queueState.currentIndex = -1
        self.queueState.sourceType = 'none'
        self.queueState.sourceId = -1
        self.queueState.queueSongIds.replace([])

        // Reset current song and playlist
        self.currentSongId = null
        self.currentPlaylist = null

        // Clear any intervals
        if (intervalTimer) {
          clearInterval(intervalTimer)
          intervalTimer = null
        }
      },
      stop() {
        actions.resetPlayback()
      },
      logout: flow(function* () {
        try {
          // Reset playback first
          actions.resetPlayback()

          // Clear all data
          self.artists.replace([])
          self.albums.replace([])
          self.songs.replace([])
          self.categories.replace([])
          self.playlists.replace([])
          self.favoriteSongIds.replace([])
          self.searchResults = cast({
            songIds: [],
            artistIds: [],
            albumIds: [],
          })
          self.searchQuery = ''
          self.error = null

          // Reset all loading states
          self.loadingStates.resetAll()
        } catch (error) {
          console.error('Error during music store logout:', error)
        }
      }),
      setDuration(seconds: number) {
        self.playbackState.duration = seconds
      },
      setProgress(seconds: number) {
        self.playbackState.progress = seconds
      },
      updatePlaybackProgress(progress: number) {
        self.playbackState.progress = progress
      },

      // Queue Management Actions
      setCurrentSong: flow(function* (
        songId: number,
        sourceType: SourceTypeType = 'none',
        sourceId: number = -1,
      ) {
        try {
          const song = self.songs.find(s => s.id === songId)
          if (!song) {
            self.error = 'Song not found'
            return { success: false, error: 'Song not found' }
          }

          // Update recently played first
          try {
            yield updateRecentlyPlayed(songId)
          } catch (error) {
            console.error('Failed to update recently played:', error)
            // Don't fail the whole operation if recently played update fails
          }

          self.currentSongId = songId

          // Handle different source types
          try {
            switch (sourceType) {
              case 'album': {
                const albumSongs = self.songs
                  .filter(s => s.albumId === sourceId)
                  .map(s => s.id)
                if (albumSongs.length === 0) {
                  throw new Error('No songs found in album')
                }
                self.queueState.queueSongIds.replace(albumSongs)
                self.queueState.currentIndex = albumSongs.indexOf(songId)
                break
              }
              case 'artist': {
                const artistSongs = self.songs
                  .filter(s => s.artistId === sourceId)
                  .map(s => s.id)
                if (artistSongs.length === 0) {
                  throw new Error('No songs found for artist')
                }
                self.queueState.queueSongIds.replace(artistSongs)
                self.queueState.currentIndex = artistSongs.indexOf(songId)
                break
              }
              case 'playlist': {
                const playlist = self.playlists.find(p => p.id === sourceId)
                if (
                  !playlist ||
                  !playlist.songIds ||
                  playlist.songIds.length === 0
                ) {
                  throw new Error('No songs found in playlist')
                }
                self.queueState.queueSongIds.replace(playlist.songIds)
                self.queueState.currentIndex = playlist.songIds.indexOf(songId)
                break
              }
              case 'category': {
                const category = self.categories.find(c => c.id === sourceId)
                if (!category) {
                  throw new Error('Category not found')
                }
                const categorySongs = self.songs.filter(s =>
                  s.categories.includes(category.categoryId),
                )
                if (categorySongs.length === 0) {
                  throw new Error('No songs found in category')
                }
                self.queueState.queueSongIds.replace(
                  categorySongs.map(s => s.id),
                )
                self.queueState.currentIndex = categorySongs.findIndex(
                  s => s.id === songId,
                )
                break
              }
              default: {
                self.queueState.queueSongIds.replace([songId])
                self.queueState.currentIndex = 0
              }
            }
          } catch (error) {
            console.error('Error setting up queue:', error)
            self.error =
              error instanceof Error ? error.message : 'Failed to set up queue'
            return { success: false, error: self.error }
          }

          self.queueState.sourceType = sourceType
          self.queueState.sourceId = sourceId

          self.playbackState.progress = 0
          self.playbackState.duration = song.duration
          actions.play()

          if (sourceType === 'playlist') {
            try {
              yield actions.updatePlayHistory(songId, Number(sourceId))
            } catch (error) {
              console.error('Failed to update play history:', error)
              // Don't fail the whole operation if history update fails
            }
          }

          return { success: true }
        } catch (error) {
          console.error('Failed to set current song:', error)
          self.error =
            error instanceof Error
              ? error.message
              : 'Failed to set current song'
          return { success: false, error: self.error }
        }
      }),
      onSongComplete: flow(function* () {
        const { queueSongIds, currentIndex } = self.queueState
        const currentSongId = self.currentSongId

        // Handle empty queue
        if (queueSongIds.length === 0) {
          actions.pause()
          return false
        }

        try {
          // Single song playback
          if (queueSongIds.length === 1) {
            if (self.playbackState.repeatMode === 'none') {
              actions.pause()
              return false
            }
            // For single song, repeat modes 'one' and 'all' behave the same
            if (currentSongId) {
              yield actions.setCurrentSong(
                currentSongId,
                self.queueState.sourceType,
                self.queueState.sourceId,
              )
              return true
            }
            return false
          }

          // Multiple songs playback
          if (self.playbackState.repeatMode === 'repeat-one' && currentSongId) {
            // Repeat current song regardless of shuffle
            yield actions.setCurrentSong(
              currentSongId,
              self.queueState.sourceType,
              self.queueState.sourceId,
            )
            return true
          }

          // Handle shuffle mode
          if (self.playbackState.isShuffleEnabled) {
            const nextSongId = getNextShuffleSong(currentSongId, queueSongIds)
            if (nextSongId) {
              self.queueState.currentIndex = queueSongIds.indexOf(nextSongId)
              yield actions.setCurrentSong(
                nextSongId,
                self.queueState.sourceType,
                self.queueState.sourceId,
              )
              return true
            }
            // If no next song and not repeat-all, pause
            if (self.playbackState.repeatMode !== 'repeat-all') {
              actions.pause()
              return false
            }
          }

          // Handle sequential playback
          const nextIndex = currentIndex + 1
          if (nextIndex < queueSongIds.length) {
            // Next song available
            const nextSongId = queueSongIds[nextIndex]
            self.queueState.currentIndex = nextIndex
            yield actions.setCurrentSong(
              nextSongId,
              self.queueState.sourceType,
              self.queueState.sourceId,
            )
            return true
          }

          // End of queue reached
          if (self.playbackState.repeatMode === 'repeat-all') {
            // Start from beginning
            self.queueState.currentIndex = 0
            yield actions.setCurrentSong(
              queueSongIds[0],
              self.queueState.sourceType,
              self.queueState.sourceId,
            )
            return true
          }

          // No repeat, end of queue
          actions.pause()
          return false
        } catch (error) {
          console.error('Error in onSongComplete:', error)
          actions.pause()
          return false
        }
      }),
      playNext: flow(function* () {
        const { queueSongIds, currentIndex } = self.queueState
        const currentSongId = self.currentSongId

        if (queueSongIds.length === 0) {
          actions.pause()
          return
        }

        try {
          // Single song playback
          if (queueSongIds.length === 1) {
            if (self.playbackState.repeatMode !== 'none') {
              // Repeat the song
              yield actions.setCurrentSong(
                queueSongIds[0],
                self.queueState.sourceType,
                self.queueState.sourceId,
              )
            } else {
              actions.pause()
            }
            return
          }

          // Multiple songs
          if (self.playbackState.isShuffleEnabled) {
            // Get next shuffle song, excluding current
            const nextSongId = getNextShuffleSong(currentSongId, queueSongIds)
            if (nextSongId) {
              self.queueState.currentIndex = queueSongIds.indexOf(nextSongId)
              yield actions.setCurrentSong(
                nextSongId,
                self.queueState.sourceType,
                self.queueState.sourceId,
              )
              return
            }
          }

          // Sequential next
          let nextIndex = currentIndex + 1
          if (nextIndex >= queueSongIds.length) {
            if (self.playbackState.repeatMode === 'repeat-all') {
              nextIndex = 0
            } else {
              actions.pause()
              return
            }
          }

          const nextSongId = queueSongIds[nextIndex]
          self.queueState.currentIndex = nextIndex
          yield actions.setCurrentSong(
            nextSongId,
            self.queueState.sourceType,
            self.queueState.sourceId,
          )
        } catch (error) {
          console.error('Error in playNext:', error)
          actions.pause()
        }
      }),
      playPrevious: flow(function* () {
        const prevSong = self.previousSongInQueue
        if (!prevSong) {
          if (
            self.playbackState.repeatMode === 'repeat-all' &&
            self.queueSongs.length > 0
          ) {
            const lastSong = self.queueSongs[self.queueSongs.length - 1]
            if (lastSong) {
              yield actions.setCurrentSong(
                lastSong.id,
                self.queueState.sourceType,
                self.queueState.sourceId,
              )
            }
          }
          return
        }
        yield actions.setCurrentSong(
          prevSong.id,
          self.queueState.sourceType,
          self.queueState.sourceId,
        )
      }),

      // Playlist Management Actions
      setCurrentPlaylist: flow(function* (playlistId: number) {
        try {
          self.isLoading = true
          const playlistData = yield queries.setCurrentPlaylist(playlistId)

          // Parse the playlist data
          const parsedPlaylist = {
            ...playlistData,
            categories:
              typeof playlistData.categories === 'string'
                ? JSON.parse(playlistData.categories)
                : playlistData.categories,
            // Parse each song's categories
            songs: (playlistData.songs || []).map((song: any) => ({
              ...song,
              categories:
                typeof song.categories === 'string'
                  ? JSON.parse(song.categories)
                  : song.categories,
            })),
          }

          // Update or add the playlist to the store's playlists array
          const existingIndex = self.playlists.findIndex(
            p => p.id === playlistId,
          )
          if (existingIndex >= 0) {
            self.playlists[existingIndex] = cast(parsedPlaylist)
          } else {
            self.playlists.push(cast(parsedPlaylist))
          }

          // Set the reference using the playlist from the store
          const playlist = self.playlists.find(p => p.id === playlistId)
          if (playlist) {
            self.currentPlaylist = playlist
          }
          self.isLoading = false
          return parsedPlaylist
        } catch (error) {
          console.log('Error loading playlist', error)
          self.error = 'Failed to load playlist'
          self.isLoading = false
          throw error
        }
      }),
      createPlaylist: flow(function* (data: {
        name: string
        userId: number
        description?: string
        coverArt?: string
      }) {
        try {
          self.isLoading = true
          self.error = null

          const newPlaylist = yield queries.createPlaylist(data)
          if (!newPlaylist) throw new Error('Failed to create playlist')

          // Add to playlists array using cast
          self.playlists.push(
            cast({
              id: newPlaylist.id,
              name: newPlaylist.name,
              description: newPlaylist.description,
              userId: newPlaylist.userId,
              coverArt: newPlaylist.coverArt,
              createdAt: newPlaylist.createdAt,
              updatedAt: newPlaylist.updatedAt,
              settings: newPlaylist.settings,
              songIds: [],
            }),
          )

          self.isLoading = false
          return self.playlists[self.playlists.length - 1]
        } catch (error) {
          console.error('Failed to create playlist:', error)
          self.error = 'Failed to create playlist'
          self.isLoading = false
          throw error
        }
      }),
      playPlaylist: flow(function* (playlistId: number) {
        try {
          const playlistData = yield actions.setCurrentPlaylist(playlistId)
          if (
            !playlistData ||
            !playlistData.songIds ||
            playlistData.songIds.length === 0
          ) {
            self.error = 'No songs found in this playlist'
            return {
              success: false,
              error: 'No playable songs in this playlist',
            }
          }

          // Get and apply playlist's playback settings
          const settings = yield getPlaybackSettings('playlist', playlistId)
          if (settings) {
            self.playbackState.isShuffleEnabled = settings.shuffle === 1
            self.playbackState.repeatMode = settings.repeatMode
          }

          // Filter songs from the main songs array using songIds
          const playlistSongs = self.songs.filter(song =>
            playlistData.songIds.includes(song.id),
          )

          if (playlistSongs.length === 0) {
            self.error = 'No playable songs found in this playlist'
            return {
              success: false,
              error: 'No playable songs in this playlist',
            }
          }

          // Set up the queue
          self.queueState.queueSongIds.replace(playlistData.songIds)
          self.queueState.sourceType = 'playlist'
          self.queueState.sourceId = playlistId

          // Determine first song
          let firstSongId: number
          if (playlistSongs.length === 1) {
            // If only one song, always play it regardless of shuffle
            firstSongId = playlistSongs[0].id
          } else if (self.playbackState.isShuffleEnabled) {
            // For shuffle, use helper to get random song
            firstSongId =
              getNextShuffleSong(null, playlistData.songIds) ||
              playlistSongs[0].id
          } else {
            // For sequential, try to resume from last played or start from beginning
            firstSongId =
              settings?.lastPlayedSongId &&
              playlistSongs.find(s => s.id === settings.lastPlayedSongId)
                ? settings.lastPlayedSongId
                : playlistSongs[0].id
          }

          self.queueState.currentIndex =
            playlistData.songIds.indexOf(firstSongId)

          // Start playing
          if (firstSongId) {
            self.currentSongId = firstSongId
            const song = playlistSongs.find(s => s.id === firstSongId)
            if (song) {
              self.playbackState.progress = 0
              self.playbackState.duration = song.duration
              actions.play()
              yield actions.updatePlayHistory(firstSongId, playlistId)
              return { success: true }
            }
          }

          self.error = 'Failed to start playback'
          return { success: false, error: 'Failed to start playback' }
        } catch (error) {
          console.error('Failed to play playlist:', error)
          self.error = 'Failed to play playlist'
          return { success: false, error: 'Failed to play playlist' }
        }
      }),

      playAlbum: flow(function* (albumId: number) {
        try {
          const album = self.albums.find(a => a.id === albumId)
          if (!album) {
            self.error = 'Album not found'
            return { success: false, error: 'Album not found' }
          }

          const albumSongs = self.songs.filter(s => s.albumId === albumId)
          if (albumSongs.length === 0) {
            self.error = 'No playable songs in this album'
            return { success: false, error: 'No playable songs in this album' }
          }

          // Get and apply album's playback settings
          const settings = yield getPlaybackSettings('album', albumId)
          if (settings && typeof settings === 'object') {
            self.playbackState.isShuffleEnabled = settings.shuffle === 1
            self.playbackState.repeatMode = settings.repeatMode as
              | 'none'
              | 'repeat-one'
              | 'repeat-all'
          }

          // Set up the queue
          const songIds = albumSongs.map(s => s.id)
          self.queueState.queueSongIds.replace(songIds)
          self.queueState.sourceType = 'album'
          self.queueState.sourceId = albumId

          // Determine first song
          let firstSongId: number
          if (albumSongs.length === 1) {
            // If only one song, always play it regardless of shuffle
            firstSongId = albumSongs[0].id
          } else if (self.playbackState.isShuffleEnabled) {
            // For shuffle, use helper to get random song
            const shuffledId = getNextShuffleSong(null, songIds)
            if (!shuffledId) {
              self.error = 'Failed to select song for playback'
              return {
                success: false,
                error: 'Failed to select song for playback',
              }
            }
            firstSongId = shuffledId
          } else {
            // For sequential, try to resume from last played or start from beginning
            firstSongId =
              settings &&
              'lastPlayedSongId' in settings &&
              settings.lastPlayedSongId &&
              albumSongs.find(s => s.id === settings.lastPlayedSongId)
                ? settings.lastPlayedSongId
                : albumSongs[0].id
          }

          self.queueState.currentIndex = songIds.indexOf(firstSongId)

          // Start playing
          const result = yield actions.setCurrentSong(
            firstSongId,
            'album',
            albumId,
          )

          if (
            result &&
            typeof result === 'object' &&
            'success' in result &&
            !result.success
          ) {
            const error =
              ('error' in result && result.error) || 'Failed to start playback'
            self.error = error
            return { success: false, error }
          }

          return { success: true }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to play album'
          self.error = errorMessage
          return { success: false, error: errorMessage }
        }
      }),

      playArtist: flow(function* (artistId: number) {
        try {
          const artist = self.artists.find(a => a.id === artistId)
          if (!artist) {
            self.error = 'Artist not found'
            return { success: false, error: 'Artist not found' }
          }

          const artistSongs = self.songs.filter(s => s.artistId === artistId)
          if (artistSongs.length === 0) {
            self.error = 'No playable songs for this artist'
            return {
              success: false,
              error: 'No playable songs for this artist',
            }
          }

          // Get and apply artist's playback settings
          const settings = yield getPlaybackSettings('artist', artistId)
          if (settings && typeof settings === 'object') {
            self.playbackState.isShuffleEnabled = settings.shuffle === 1
            self.playbackState.repeatMode = settings.repeatMode as
              | 'none'
              | 'repeat-one'
              | 'repeat-all'
          }

          // Set up the queue
          const songIds = artistSongs.map(s => s.id)
          self.queueState.queueSongIds.replace(songIds)
          self.queueState.sourceType = 'artist'
          self.queueState.sourceId = artistId

          // Determine first song
          let firstSongId: number
          if (artistSongs.length === 1) {
            // If only one song, always play it regardless of shuffle
            firstSongId = artistSongs[0].id
          } else if (self.playbackState.isShuffleEnabled) {
            // For shuffle, use helper to get random song
            const shuffledId = getNextShuffleSong(null, songIds)
            if (!shuffledId) {
              self.error = 'Failed to select song for playback'
              return {
                success: false,
                error: 'Failed to select song for playback',
              }
            }
            firstSongId = shuffledId
          } else {
            // For sequential, try to resume from last played or start from beginning
            firstSongId =
              settings &&
              'lastPlayedSongId' in settings &&
              settings.lastPlayedSongId &&
              artistSongs.find(s => s.id === settings.lastPlayedSongId)
                ? settings.lastPlayedSongId
                : artistSongs[0].id
          }

          self.queueState.currentIndex = songIds.indexOf(firstSongId)

          // Start playing
          const result = yield actions.setCurrentSong(
            firstSongId,
            'artist',
            artistId,
          )

          if (
            result &&
            typeof result === 'object' &&
            'success' in result &&
            !result.success
          ) {
            const error =
              ('error' in result && result.error) || 'Failed to start playback'
            self.error = error
            return { success: false, error }
          }

          return { success: true }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to play artist songs'
          self.error = errorMessage
          return { success: false, error: errorMessage }
        }
      }),

      // Playback Settings Actions
      toggleShuffle: flow(function* () {
        const newValue = !self.playbackState.isShuffleEnabled
        self.playbackState.isShuffleEnabled = newValue

        // Update settings in DB if we have a current source
        const currentSourceType = self.queueState.sourceType
        if (currentSourceType !== 'none' && self.queueState.sourceId !== -1) {
          if (isValidPlaybackSettingsType(currentSourceType)) {
            yield updateEntityPlaybackSettings(
              currentSourceType,
              self.queueState.sourceId,
              { shuffle: newValue },
            )
          }
        }
      }),

      setRepeatMode: flow(function* (
        mode: 'none' | 'repeat-one' | 'repeat-all',
      ) {
        console.log('setRepeatMode', mode)
        self.playbackState.repeatMode = mode

        // Update settings in DB if we have a current source
        if (
          self.queueState.sourceType !== 'none' &&
          self.queueState.sourceId !== -1
        ) {
          const entityType = self.queueState.sourceType
          // Only update if it's a valid entity type
          if (
            entityType === 'artist' ||
            entityType === 'album' ||
            entityType === 'playlist'
          ) {
            yield updateEntityPlaybackSettings(
              entityType,
              self.queueState.sourceId,
              { repeatMode: mode },
            )
          }
        }
      }),

      // Data Loading Actions
      loadInitialData: flow(function* () {
        try {
          // Load categories
          const userStore = actions.getRoot().userStore
          userStore?.loadInitialData()
          // If we're loading data, then always reset the playback state to false to pause the player, we don't want continuous playback if app is resumed or started
          self.playbackState.isPlaying = false
          self.loadingStates.setLoading('categories', true)
          const categories = yield queries.getMusicCategories()
          self.categories = cast(categories)
          self.loadingStates.setLoading('categories', false)

          // Load artists
          self.loadingStates.setLoading('artists', true)
          const artists = yield queries.loadArtists()
          const parsedArtists = artists.map((artist: any) => ({
            ...artist,
            categories:
              typeof artist.categories === 'string'
                ? JSON.parse(artist.categories)
                : artist.categories,
          }))
          self.artists = cast(parsedArtists)
          self.loadingStates.setLoading('artists', false)

          // Load albums
          self.loadingStates.setLoading('albums', true)
          const albumsWithArtists = yield queries.loadAlbums()
          const parsedAlbums = albumsWithArtists.map((r: any) => ({
            ...r.album,
            categories:
              typeof r.album.categories === 'string'
                ? JSON.parse(r.album.categories)
                : r.album.categories,
            artist: r.artist,
          }))
          self.albums = cast(parsedAlbums)
          self.loadingStates.setLoading('albums', false)

          // Load songs
          self.loadingStates.setLoading('songs', true)
          const songsWithDetails = yield queries.loadSongs()
          const parsedSongs = songsWithDetails.map((r: any) => ({
            ...r.song,
            categories:
              typeof r.song.categories === 'string'
                ? JSON.parse(r.song.categories)
                : r.song.categories,
            album: {
              ...r.album,
              categories:
                typeof r.album.categories === 'string'
                  ? JSON.parse(r.album.categories)
                  : r.album.categories,
            },
            artist: r.artist,
            isFavorite: false,
          }))
          self.songs = cast(parsedSongs)
          self.loadingStates.setLoading('songs', false)

          // Load favorites
          self.loadingStates.setLoading('favorites', true)
          const favoriteSongIds = yield queries.getFavoriteSongIds(
            userStore?.user?.id || 1,
          )
          self.favoriteSongIds = cast(favoriteSongIds)
          self.loadingStates.setLoading('favorites', false)

          // Load playlists
          self.loadingStates.setLoading('playlists', true)
          console.log('Fetching user playlists for user', userStore?.user?.id)
          const userPlaylists = yield queries.fetchUserPlaylists(
            userStore?.user?.id || 1,
          )
          self.playlists = cast(userPlaylists)
          self.loadingStates.setLoading('playlists', false)
        } catch (error) {
          console.error('Failed to load initial data:', error)
          self.error = 'Failed to load initial data'
          self.loadingStates.resetAll()
        }
      }),
      fetchUserPlaylists: flow(function* (userId: number) {
        try {
          self.isLoading = true
          const results = yield queries.fetchUserPlaylists(userId)
          self.playlists = cast(results)
          self.isLoading = false
        } catch (error) {
          self.error = 'Failed to fetch playlists'
          self.isLoading = false
        }
      }),
      fetchTopAlbums: flow(function* (limit = 6) {
        try {
          self.isLoading = true
          const results = yield queries.fetchTopAlbums(limit)
          self.albums = cast(results)
          self.isLoading = false
        } catch (error) {
          self.error = 'Failed to fetch top albums'
          self.isLoading = false
        }
      }),

      // History and Favorites Actions
      fetchRecentlyPlayed: flow(function* (userId: number) {
        try {
          self.isLoading = true
          yield updateRecentlyPlayed(userId)
          self.isLoading = false
        } catch (error) {
          self.error = 'Failed to fetch recently played songs'
          self.isLoading = false
        }
      }),
      addToRecentlyPlayed: flow(function* (userId: number, songId: number) {
        try {
          yield queries.addToRecentlyPlayed(userId, songId)
          yield updateRecentlyPlayed(songId)
        } catch (error) {
          self.error = 'Failed to update recently played'
        }
      }),
      fetchFavorites: flow(function* (userId: number) {
        try {
          self.isLoading = true
          yield updateFavorites(userId)
          self.isLoading = false
        } catch (error) {
          self.error = 'Failed to fetch favorites'
          self.isLoading = false
        }
      }),
      toggleFavorite: flow(function* (userId: number, songId: number) {
        try {
          yield queries.toggleFavorites(userId, songId)
          self.favoriteSongIds = yield queries.getFavoriteSongIds(userId)
          yield updateFavorites(userId)
        } catch (error) {
          self.error = 'Failed to update favorites'
        }
      }),

      // Search Actions
      searchItems: flow(function* (query: string) {
        try {
          self.isLoading = true
          self.searchQuery = query

          if (!query.trim()) {
            self.searchResults = cast({
              songIds: [],
              artistIds: [],
              albumIds: [],
            })
            self.isLoading = false
            return
          }

          const lowerQuery = query.toLowerCase()

          const matchingSongs = self.songs.filter(
            song =>
              song.title.toLowerCase().includes(lowerQuery) ||
              song.categories.some(cat =>
                cat.toLowerCase().includes(lowerQuery),
              ),
          )

          const matchingArtists = self.artists.filter(
            artist =>
              artist.name.toLowerCase().includes(lowerQuery) ||
              artist.categories.some(cat =>
                cat.toLowerCase().includes(lowerQuery),
              ),
          )

          const matchingAlbums = self.albums.filter(
            album =>
              album.title.toLowerCase().includes(lowerQuery) ||
              album.categories.some(cat =>
                cat.toLowerCase().includes(lowerQuery),
              ),
          )

          self.searchResults = cast({
            songIds: matchingSongs.slice(0, 20).map(s => s.id),
            artistIds: matchingArtists.slice(0, 10).map(a => a.id),
            albumIds: matchingAlbums.slice(0, 10).map(a => a.id),
          })

          self.isLoading = false
        } catch (error) {
          console.error('Search error:', error)
          self.error = 'Failed to perform search'
          self.isLoading = false
        }
      }),
      clearSearch() {
        self.searchQuery = ''
        self.searchResults = cast({ songIds: [], artistIds: [], albumIds: [] })
      },

      // State Management Actions
      setError(error: string | null) {
        self.error = error || undefined
      },
      setLoading(loading: boolean) {
        self.isLoading = loading
      },
      updatePlayHistory: flow(function* (songId: number, playlistId: number) {
        const userStore = actions.getRoot().userStore
        const userId = userStore?.user?.id
        if (!userId) return
        yield queries.updatePlayHistory(userId, songId, playlistId)
      }),
      updatePlayCompletion: flow(function* (completionPercentage: number) {
        const userStore = actions.getRoot().userStore
        const userId = userStore?.user?.id
        if (!userId || !self.currentSongId || !self.currentPlaylist?.id) return

        yield queries.updatePlayCompletion(
          userId,
          self.currentSongId,
          completionPercentage,
          self.currentPlaylist.id,
        )
      }),

      // Playlist Management Actions
      addSongToPlaylist: flow(function* (playlistId: number, songId: number) {
        try {
          self.isLoading = true
          self.error = null

          const playlist = self.playlists.find(p => p.id === playlistId)
          if (!playlist) throw new Error('Playlist not found')

          // Check if song we want to add already exists in the playlist
          if (playlist.songIds.includes(songId)) {
            self.error = 'Song already exists in playlist'
            console.log('Song already exists in playlist')
            self.isLoading = false
            return
          }

          // Add song to playlist in the database
          yield queries.addSongToPlaylist(playlistId, songId)

          // Update local state
          const updatedSongIds = Array.from(playlist.songIds)
          updatedSongIds.push(songId)
          playlist.songIds.replace(updatedSongIds)

          // If this is the current playlist, update queue
          if (self.currentPlaylist?.id === playlistId) {
            self.queueState.queueSongIds.replace(updatedSongIds)
          }

          // Force update the playlist to trigger UI refresh
          const updatedPlaylist = { ...playlist }
          const index = self.playlists.findIndex(p => p.id === playlistId)
          if (index !== -1) {
            self.playlists[index] = cast(updatedPlaylist)
          }

          self.isLoading = false
        } catch (error) {
          console.error('Failed to add song to playlist:', error)
          self.error = 'Failed to add song to playlist'
          self.isLoading = false
          throw error
        }
      }),

      removeSongFromPlaylist: flow(function* (
        playlistId: number,
        songId: number,
      ) {
        try {
          self.isLoading = true
          self.error = null

          const isCurrentPlaylist = self.currentPlaylist?.id === playlistId
          const isCurrentSong = self.currentSong?.id === songId

          // Step 1: If song is currentSong in current playlist
          if (isCurrentPlaylist && isCurrentSong) {
            if (self.queueState.queueSongIds.length > 1) {
              actions.playNext()
            } else {
              actions.pause()
            }
          }

          // Step 2: Remove song from DB
          yield queries.removeSongFromPlaylist(playlistId, songId)

          // Step 3: Update local state
          const playlist = self.playlists.find(p => p.id === playlistId)
          if (playlist && playlist.songIds) {
            // Update songIds array
            const updatedSongIds = playlist.songIds.filter(id => id !== songId)
            playlist.songIds.replace(updatedSongIds)

            // If this is the current playlist, update queue
            if (isCurrentPlaylist) {
              self.queueState.queueSongIds.replace(updatedSongIds)
              self.queueState.currentIndex = updatedSongIds.indexOf(
                self.currentSongId || -1,
              )
            }

            // Force update the playlist to trigger UI refresh
            const updatedPlaylist = { ...playlist }
            const index = self.playlists.findIndex(p => p.id === playlistId)
            if (index !== -1) {
              self.playlists[index] = cast(updatedPlaylist)
            }
          }
        } catch (error) {
          console.error('Failed to remove song from playlist:', error)
          self.error = 'Failed to remove song from playlist'
          throw error
        } finally {
          self.isLoading = false
        }
      }),
      deletePlaylist: flow(function* (playlistId: number) {
        try {
          const res = yield queries.deletePlaylist(playlistId)
          if (res) {
            // First find the index
            const index = self.playlists.findIndex(p => p.id === playlistId)
            const updatedPlaylists = self.playlists.filter(
              p => p.id !== playlistId,
            )
            if (index > -1) {
              // Remove the playlist at the found index
              self.playlists.replace(updatedPlaylists)
            }
          }
          return res
        } catch (error) {
          console.error('Failed to delete playlist:', error)
          return false
        }
      }),
      updatePlaylistSettings: flow(function* (
        playlistId: number,
        settings: {
          isShuffleEnabled: boolean
          repeatMode: 'none' | 'one' | 'all'
        },
      ) {
        try {
          const updatedPlaylist = yield queries.updatePlaylistSettings(
            playlistId,
            settings,
          )
          if (!updatedPlaylist) {
            throw new Error('Failed to update playlist settings')
          }

          const playlist = self.playlists.find(p => p.id === playlistId)
          if (playlist) {
            if (!playlist.settings) {
              playlist.settings = updatedPlaylist
            } else {
              playlist.settings!.isShuffleEnabled =
                updatedPlaylist.isShuffleEnabled
              playlist.settings!.repeatMode = updatedPlaylist.repeatMode
              playlist.settings!.updatedAt = updatedPlaylist.updatedAt
            }
          }
        } catch (error) {
          console.error('Failed to update playlist settings:', error)
        }
      }),

      restore: flow(function* (snapshot: any) {
        try {
          // Preserve volatile state before loadInitialData (which resets playback)
          const savedPlaybackState = snapshot?.playbackState
            ? { ...snapshot.playbackState }
            : null
          const savedQueueState = snapshot?.queueState
            ? {
                ...snapshot.queueState,
                currentIndex: snapshot.restorePlayback
                  ? snapshot.queueState.currentIndex
                  : -1,
                sourceType: snapshot.restorePlayback
                  ? snapshot.queueState.sourceType
                  : 'none',
                sourceId: snapshot.restorePlayback
                  ? snapshot.queueState.sourceId
                  : -1,
              }
            : null
          const savedSearchQuery = snapshot?.searchQuery || ''
          const savedSearchResults = snapshot?.searchResults
            ? {
                songIds: snapshot.searchResults.songIds || [],
                artistIds: snapshot.searchResults.artistIds || [],
                albumIds: snapshot.searchResults.albumIds || [],
              }
            : null
          const savedCurrentSongId = snapshot?.currentSongId || null
          const savedCurrentPlaylistId = snapshot?.currentPlaylist?.id || null

          // Reset volatile UI states
          self.isLoading = false
          self.error = null

          // Load ALL static and user data from database
          // This includes: artists, albums, songs, categories, playlists, favoriteSongIds
          // Note: loadInitialData() will reset playback state, so we restore it after
          yield actions.loadInitialData()

          // Restore volatile state after loading data from DB
          // Restore playback state
          if (savedPlaybackState) {
            self.playbackState = cast(savedPlaybackState)
          } else {
            // Reset playback state if not being restored
            self.playbackState = cast({
              isPlaying: false,
              progress: 0,
              duration: 0,
              startTimestamp: null,
              isShuffleEnabled: false,
              repeatMode: 'none',
            })
          }

          // Restore queue state
          if (savedQueueState) {
            self.queueState = cast(savedQueueState)
          }

          // Restore search state
          self.searchQuery = savedSearchQuery
          if (savedSearchResults) {
            self.searchResults = cast(savedSearchResults)
          } else {
            self.searchResults = cast({
              songIds: [],
              artistIds: [],
              albumIds: [],
            })
          }

          // Restore currentSongId
          self.currentSongId = savedCurrentSongId

          // Restore currentPlaylist reference (after playlists are loaded from DB)
          if (savedCurrentPlaylistId) {
            const playlist = self.playlists.find(
              p => p.id === savedCurrentPlaylistId,
            )
            if (playlist) {
              self.currentPlaylist = playlist
            } else {
              self.currentPlaylist = null
            }
          } else {
            self.currentPlaylist = null
          }

          // Restore playback if it was playing
          if (savedPlaybackState?.isPlaying) {
            actions.play()
          }

          resetLoadingStates()
        } catch (error) {
          console.error('Error restoring music store:', error)
          this.reset()
          throw error
        }
      }),
      reset(): void {
        if (self.playbackState.isPlaying) {
          actions.pause()
        }
        // Reset static data collections
        self.artists.clear()
        self.albums.clear()
        self.songs.clear()
        self.categories.clear()

        // Reset mutable data
        self.playlists.clear()
        self.favoriteSongIds.clear()

        // Reset playback state
        self.setProp('playbackState', {
          isPlaying: false,
          progress: 0,
          duration: 0,
          startTimestamp: null,
          isShuffleEnabled: false,
          repeatMode: 'none',
        })

        // Reset queue state
        self.setProp('queueState', {
          currentIndex: -1,
          sourceType: 'none',
          sourceId: -1,
          queueSongIds: [],
        })

        // Reset search and UI states individually
        self.setProp('searchQuery', '')
        self.setProp('searchResults', {
          songIds: [],
          artistIds: [],
          albumIds: [],
        })
        self.setProp('isLoading', false)
        self.setProp('error', null)
        self.setProp('currentSongId', null)
        self.setProp('currentPlaylist', null)

        // Reset all loading states
        resetLoadingStates()
      },
      setSearchResults(results: {
        songIds: number[]
        artistIds: number[]
        albumIds: number[]
      }) {
        self.searchResults = cast({
          songIds: cast(results.songIds),
          artistIds: cast(results.artistIds),
          albumIds: cast(results.albumIds),
        })
      },
    }

    return actions
  })

// Create a function to initialize the store with default values
export const createMusicStore = () =>
  MusicStoreModel.create({
    artists: [],
    albums: [],
    songs: [],
    playlists: [],
    isLoading: false,
    error: null,
  })

// Export a singleton instance
export const musicStore = createMusicStore()
