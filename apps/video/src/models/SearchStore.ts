import { types, flow, Instance, cast, getRoot } from 'mobx-state-tree'
import { queries as videoQueries } from '@/db/queries'
import { withSetPropAction } from './helpers/withSetPropAction'
import { RootStore } from '.'

export const SearchStoreModel = types
  .model('SearchStore', {
    searchQuery: types.optional(types.string, ''),
    searchResultVideoIds: types.optional(types.array(types.number), []),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),

    searchState: types.optional(
      types.model({
        query: types.optional(types.string, ''),
        selectedFilter: types.optional(types.string, 'All'),
        isSearching: types.optional(types.boolean, false),
        searchSections: types.optional(types.array(types.frozen()), []),
      }),
      {},
    ),
  })
  .views(self => ({
    get searchResults() {
      const rootStore = getRoot(self)
      const videos = rootStore.videoStore?.videos || []
      return self.searchResultVideoIds
        .map(id => videos.find(v => v.id === id))
        .filter(v => !!v)
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    const setError = (err: any) => {
      self.error = err instanceof Error ? err.message : String(err)
    }

    // Legacy search methods (for backward compatibility)
    const searchVideos = flow(function* (query: string) {
      try {
        self.searchQuery = query
        self.isLoading = true
        const results: number[] = yield videoQueries.searchVideos(query)
        self.searchResultVideoIds.replace(results)
      } catch (e) {
        setError(e)
      } finally {
        self.isLoading = false
      }
    })

    const clearSearch = () => {
      self.searchQuery = ''
      self.searchResultVideoIds.clear()
      self.searchState.query = ''
      self.searchState.searchSections.clear()
    }

    // Enhanced search methods
    const setSearchQuery = (query: string) => {
      console.log('Search query', query)
      self.searchState.query = query
    }

    const setSelectedFilter = (filter: string) => {
      self.searchState.selectedFilter = filter
    }

    const setIsSearching = (searching: boolean) => {
      self.searchState.isSearching = searching
    }

    const setSearchSections = (sections: any[]) => {
      self.searchState.searchSections.replace(cast(sections))
    }

    const resetSearchSections = () => {
      self.searchState.searchSections.replace([])
    }

    const performSearch = flow(function* (query: string, filter: string) {
      try {
        self.searchState.isSearching = true
        const rootStore: Instance<typeof RootStore> = getRoot(self)
        const videos = rootStore.videoStore?.videos || []

        // Search videos
        const videoResults = videos
          .filter(
            video =>
              video.title.toLowerCase().includes(query.toLowerCase()) ||
              video.description?.toLowerCase().includes(query.toLowerCase()),
          )
          .map(video => ({
            id: `video-${video.id}`,
            type: 'video',
            title: video.title,
            subtitle: `${video.viewCount} views`,
            thumbnail: video.thumbnailUrl,
            data: video,
          }))

        // Search playlists
        const rootPlaylistStore = rootStore.playlistStore
        const playlistResults =
          rootPlaylistStore?.allPlaylists
            .filter(
              playlist =>
                playlist.name.toLowerCase().includes(query.toLowerCase()) ||
                playlist.description
                  ?.toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map(playlist => ({
              id: `playlist-${playlist.id}`,
              type: 'playlist',
              title: playlist.name,
              subtitle: `${playlist.videoIds.length} videos`,
              thumbnail: null,
              data: playlist,
            })) || []

        const sections = []

        if (filter === 'All' || filter === 'Videos') {
          if (videoResults.length > 0) {
            sections.push({
              title: 'Videos',
              data: videoResults.slice(0, 10),
            })
          }
        }

        // if (filter === 'All' || filter === 'Channels') {
        //   if (channelResults.length > 0) {
        //     sections.push({
        //       title: 'Channels',
        //       data: channelResults.slice(0, 5),
        //     })
        //   }
        // }

        if (filter === 'All' || filter === 'Playlists') {
          if (playlistResults.length > 0) {
            sections.push({
              title: 'Playlists',
              data: playlistResults.slice(0, 5),
            })
          }
        }

        self.searchState.searchSections.replace(cast(sections))
      } catch (e) {
        setError(e)
      } finally {
        self.searchState.isSearching = false
      }
    })

    const resetSearchState = () => {
      self.searchQuery = ''
      self.searchResultVideoIds.clear()
      self.searchState.query = ''
      self.searchState.selectedFilter = 'All'
      self.searchState.isSearching = false
      self.searchState.searchSections.clear()
    }

    const restore = (data: any) => {
      if (data.searchQuery !== undefined) {
        self.searchQuery = data.searchQuery
      }
      if (data.searchResultVideoIds) {
        self.searchResultVideoIds.replace(data.searchResultVideoIds)
      }
      if (data.isLoading !== undefined) {
        self.isLoading = data.isLoading
      }
      if (data.error !== undefined) {
        self.error = data.error
      }
      if (data.searchState) {
        if (data.searchState.query !== undefined) {
          self.searchState.query = data.searchState.query
        }
        if (data.searchState.selectedFilter !== undefined) {
          self.searchState.selectedFilter = data.searchState.selectedFilter
        }
        if (data.searchState.isSearching !== undefined) {
          self.searchState.isSearching = data.searchState.isSearching
        }
        if (data.searchState.searchSections) {
          self.searchState.searchSections.replace(
            data.searchState.searchSections,
          )
        }
      }
    }

    return {
      setError,
      searchVideos,
      clearSearch,
      setSearchQuery,
      setSelectedFilter,
      setIsSearching,
      setSearchSections,
      performSearch,
      resetSearchState,
      resetSearchSections,
      restore,
    }
  })

export const createSearchStore = () =>
  SearchStoreModel.create({
    searchQuery: '',
    searchResultVideoIds: [],
    isLoading: false,
    error: null,
    searchState: {
      query: '',
      selectedFilter: 'All',
      isSearching: false,
      searchSections: [],
    },
  })

export interface SearchStore extends Instance<typeof SearchStoreModel> {}
