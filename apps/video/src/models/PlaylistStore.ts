// Copyright (c) Meta Platforms, Inc. and affiliates.
import { types, flow, Instance, cast, getRoot } from 'mobx-state-tree'
import { getAllPlayLists, queries as videoQueries } from '@/db/queries'
import { withSetPropAction } from './helpers/withSetPropAction'

export const PlaylistModel = types.model('Playlist', {
  id: types.identifierNumber,
  name: types.string,
  description: types.maybeNull(types.string),
  userId: types.number,
  videoIds: types.optional(types.array(types.number), []),
  shuffle: types.boolean,
  createdAt: types.string,
  updatedAt: types.string,
})

export const PlaylistStoreModel = types
  .model('PlaylistStore', {
    playlists: types.array(PlaylistModel),
    allPlaylists: types.array(PlaylistModel),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),

    // Add to playlist modal state
    addToPlaylistModal: types.optional(
      types.model({
        isVisible: types.optional(types.boolean, false),
        selectedVideoId: types.maybeNull(types.number),
      }),
      {},
    ),

    // Playlist management UI state
    playlistUI: types.optional(
      types.model({
        showCreateModal: types.optional(types.boolean, false),
        showDeleteAlert: types.optional(types.boolean, false),
        selectedPlaylistId: types.maybeNull(types.number),
        newPlaylistName: types.optional(types.string, ''),
        newPlaylistDescription: types.optional(types.string, ''),
        showRemoveVideoAlert: types.optional(types.boolean, false),
        selectedVideoId: types.maybeNull(types.number),
        currentFocusedTextField: types.maybeNull(types.string),
      }),
      {},
    ),
    currentPlaylist: types.maybeNull(PlaylistModel),
  })
  .views(self => ({
    get playlistsWithVideoCount() {
      return self.playlists.map(playlist => ({
        ...playlist,
        videoCount: playlist.videoIds.length,
      }))
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    const setError = (err: any) => {
      self.error = err instanceof Error ? err.message : String(err)
    }

    const setCurrentPlaylist = flow(function* (playlistId: number) {
      try {
        const selectedPlaylist = self.playlists.find(pl => pl.id === playlistId)
        if (!selectedPlaylist) {
          console.log('No such playlist')
          return
        }
        self.currentPlaylist = selectedPlaylist
        return selectedPlaylist
      } catch (e) {
        setError(e)
        console.warn('Cannot set playlist due to ', e)
        return null
      }
    })

    const clearCurrentPlaylist = flow(function* () {
      try {
        self.currentPlaylist = null
      } catch (e) {
        setError(e)
        console.warn('Cannot clear playlist due to ', e)
        return null
      }
    })

    const loadUserPlaylists = flow(function* () {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) return

        const pls = yield videoQueries.getPlaylistsByUserId(userId)

        // Validate database response
        if (!pls || !Array.isArray(pls)) {
          throw new Error(
            `Failed to load user playlists for user ${userId} - response is null or not an array`,
          )
        }

        self.playlists.replace(cast(pls))
        console.log(
          `PlaylistStore: Successfully loaded ${pls.length} user playlists`,
        )
      } catch (e) {
        console.error('PlaylistStore: loadUserPlaylists failed:', e)
        setError(e)
        throw e // Propagate error to restore method
      }
    })

    const createPlaylist = flow(function* (
      name: string,
      description?: string,
      isPublic = false,
    ) {
      try {
        self.isLoading = true
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        const pl = yield videoQueries.createPlaylist({
          userId,
          name,
          description,
          isPublic,
          shuffle: false,
        })
        self.playlists.push(cast(pl))
        return pl.id
      } catch (e) {
        setError(e)
        return null
      } finally {
        self.isLoading = false
      }
    })

    const deletePlaylist = flow(function* (playlistId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        const ok = yield videoQueries.deletePlaylist(playlistId, userId)
        if (ok) {
          self.playlists.replace(
            self.playlists.filter(p => p.id !== playlistId),
          )
        }
      } catch (e) {
        setError(e)
      }
    })

    const addVideoToPlaylist = flow(function* (
      playlistId: number,
      videoId: number,
    ) {
      try {
        // First check if the video is in playlist
        const targetPlaylist = self.playlists.find(p => p.id === playlistId)
        const videoExists = targetPlaylist?.videoIds.includes(videoId)
        if (videoExists) {
          console.log('Video already exists in playlist')
          setError('Video already exists in Playlist')
          return { success: false, message: 'Video already exists in playlist' }
        } else {
          yield videoQueries.addVideoToPlaylist(playlistId, videoId)
          const pl = self.playlists.find(p => p.id === playlistId)
          if (pl && !pl.videoIds.includes(videoId)) pl.videoIds.push(videoId)
          return {
            success: true,
            message: 'Video added to playlist successfully',
          }
        }
      } catch (e) {
        setError(e)
      }
    })

    const removeVideoFromPlaylist = flow(function* (
      playlistId: number,
      videoId: number,
    ) {
      try {
        yield videoQueries.removeVideoFromPlaylist(playlistId, videoId)
        const pl = self.playlists.find(p => p.id === playlistId)
        if (pl) pl.videoIds.replace(pl.videoIds.filter(id => id !== videoId))
      } catch (e) {
        setError(e)
      }
    })

    const updatePlaylist = flow(function* (
      playlistId: number,
      data: Partial<{
        name: string
        description: string
        isPublic: boolean
        shuffle: boolean
      }>,
    ) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        yield videoQueries.updatePlaylist(playlistId, userId, data)
        const pl = self.playlists.find(p => p.id === playlistId)
        if (pl) {
          if (data.name !== undefined) pl.name = data.name as any
          if (data.description !== undefined) {
            pl.description = data.description as any
          }
          if (data.shuffle !== undefined) pl.shuffle = data.shuffle as any
        }
      } catch (e) {
        setError(e)
      }
    })

    // Modal and UI management actions
    const showAddToPlaylistModal = (videoId: number) => {
      self.addToPlaylistModal.isVisible = true
      self.addToPlaylistModal.selectedVideoId = videoId
    }

    const hideAddToPlaylistModal = () => {
      self.addToPlaylistModal.isVisible = false
      self.addToPlaylistModal.selectedVideoId = null
    }

    const showCreatePlaylistModal = () => {
      self.playlistUI.showCreateModal = true
      self.playlistUI.newPlaylistName = ''
      self.playlistUI.newPlaylistDescription = ''
      self.playlistUI.currentFocusedTextField = 'name' // Default focus to name field
    }

    const hideCreatePlaylistModal = () => {
      self.playlistUI.showCreateModal = false
      self.playlistUI.newPlaylistName = ''
      self.playlistUI.newPlaylistDescription = ''
      self.playlistUI.currentFocusedTextField = ''
    }

    const setNewPlaylistName = (name: string) => {
      self.playlistUI.newPlaylistName = name
    }

    const setNewPlaylistDescription = (description: string) => {
      self.playlistUI.newPlaylistDescription = description
    }

    const setCurrentFocusedTextField = (fieldName: string) => {
      self.playlistUI.currentFocusedTextField = fieldName
    }

    const showDeletePlaylistAlert = (playlistId: number) => {
      self.playlistUI.showDeleteAlert = true
      self.playlistUI.selectedPlaylistId = playlistId
    }

    const hideDeletePlaylistAlert = () => {
      self.playlistUI.showDeleteAlert = false
      self.playlistUI.selectedPlaylistId = null
    }

    const showRemoveVideoAlert = (videoId: number) => {
      self.playlistUI.showRemoveVideoAlert = true
      self.playlistUI.selectedVideoId = videoId
    }

    const hideRemoveVideoAlert = () => {
      self.playlistUI.showRemoveVideoAlert = false
      self.playlistUI.selectedVideoId = null
    }

    const resetPlaylistUI = () => {
      self.playlistUI.showCreateModal = false
      self.playlistUI.showDeleteAlert = false
      self.playlistUI.selectedPlaylistId = null
      self.playlistUI.newPlaylistName = ''
      self.playlistUI.newPlaylistDescription = ''
      self.playlistUI.showRemoveVideoAlert = false
      self.playlistUI.selectedVideoId = null
      self.playlistUI.currentFocusedTextField = ''
    }
    const loadAllPlaylists = flow(function* () {
      try {
        const allPlaylists = yield getAllPlayLists()

        // Validate database response
        if (!allPlaylists || !Array.isArray(allPlaylists)) {
          throw new Error(
            'Failed to load all playlists - response is null or not an array',
          )
        }

        self.allPlaylists.replace(cast(allPlaylists))
        console.log(
          `PlaylistStore: Successfully loaded ${allPlaylists.length} total playlists`,
        )
      } catch (e) {
        console.error('PlaylistStore: loadAllPlaylists failed:', e)
        setError(e)
        throw e // Propagate error to restore method
      }
    })

    const logOut = () => {
      self.playlists.replace([])
      self.allPlaylists.replace([])
      resetPlaylistUI()
    }

    // Internal self-management restore - handles both volatile state and data reloading
    const restore = flow(function* (data: any) {
      try {
        console.log('PlaylistStore: Starting internal self-managed restoration')

        // Phase 1: Restore volatile state immediately
        if (data.currentPlaylist) {
          self.currentPlaylist = cast(data.currentPlaylist)
        }

        if (data.addToPlaylistModal) {
          self.addToPlaylistModal.isVisible =
            data.addToPlaylistModal.isVisible || false
          self.addToPlaylistModal.selectedVideoId =
            data.addToPlaylistModal.selectedVideoId || null
        }

        if (data.playlistUI) {
          self.playlistUI.showCreateModal =
            data.playlistUI.showCreateModal || false
          self.playlistUI.showDeleteAlert =
            data.playlistUI.showDeleteAlert || false
          self.playlistUI.selectedPlaylistId =
            data.playlistUI.selectedPlaylistId || null
          self.playlistUI.newPlaylistName =
            data.playlistUI.newPlaylistName || ''
          self.playlistUI.newPlaylistDescription =
            data.playlistUI.newPlaylistDescription || ''
          self.playlistUI.showRemoveVideoAlert =
            data.playlistUI.showRemoveVideoAlert || false
          self.playlistUI.selectedVideoId =
            data.playlistUI.selectedVideoId || null
          self.playlistUI.currentFocusedTextField =
            data.playlistUI.currentFocusedTextField || null
        }

        console.log(
          'PlaylistStore: Volatile state restored, loading playlists from DB',
        )

        // Phase 2: Reload playlists from DB
        yield loadUserPlaylists()
        yield loadAllPlaylists()

        console.log('PlaylistStore: Restoration completed successfully')
      } catch (error) {
        console.error('PlaylistStore: Restoration failed:', error)
        resetPlaylistUI()
        throw error
      }
    })

    return {
      setError,
      loadUserPlaylists,
      createPlaylist,
      deletePlaylist,
      addVideoToPlaylist,
      removeVideoFromPlaylist,
      updatePlaylist,
      showAddToPlaylistModal,
      hideAddToPlaylistModal,
      showCreatePlaylistModal,
      hideCreatePlaylistModal,
      setNewPlaylistName,
      setNewPlaylistDescription,
      setCurrentFocusedTextField,
      showDeletePlaylistAlert,
      hideDeletePlaylistAlert,
      showRemoveVideoAlert,
      hideRemoveVideoAlert,
      resetPlaylistUI,
      loadAllPlaylists,
      setCurrentPlaylist,
      clearCurrentPlaylist,
      logOut,
      restore,
    }
  })

export const createPlaylistStore = () =>
  PlaylistStoreModel.create({
    playlists: [],
    allPlaylists: [],
    isLoading: false,
    error: null,
    addToPlaylistModal: { isVisible: false, selectedVideoId: null },
    playlistUI: {
      showCreateModal: false,
      showDeleteAlert: false,
      selectedPlaylistId: null,
      newPlaylistName: '',
      newPlaylistDescription: '',
      showRemoveVideoAlert: false,
      selectedVideoId: null,
    },
  })

export interface PlaylistStore extends Instance<typeof PlaylistStoreModel> {}
