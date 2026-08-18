// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  types,
  flow,
  Instance,
  cast,
  getRoot,
  getSnapshot,
} from 'mobx-state-tree'
import { runInAction } from 'mobx'
import {
  getUserVideos,
  loadVideoCategories,
  queries as videoQueries,
} from '@/db/queries'

import { withSetPropAction } from './helpers/withSetPropAction'

export const VideoModel = types.model('Video', {
  id: types.number,
  channelId: types.maybeNull(types.number),
  title: types.string,
  description: types.maybeNull(types.string),
  categoryId: types.number,
  videoUrl: types.string,
  thumbnailUrl: types.maybeNull(types.string),
  duration: types.number,
  visibility: types.string,
  status: types.string,
  viewCount: types.number,
  likeCount: types.number,
  commentCount: types.number,
  isCommentsEnabled: types.optional(types.boolean, true),
  createdAt: types.string,
  updatedAt: types.string,
  deletedAt: types.maybeNull(types.string),
})

export const ChannelModel = types.model('Channel', {
  id: types.identifierNumber,
  userId: types.number,
  name: types.string,
  description: types.maybeNull(types.string),
  subscriberCount: types.optional(types.number, 0),
  createdAt: types.string,
  updatedAt: types.string,
  deletedAt: types.maybeNull(types.string),
  banner: types.maybeNull(types.string),
  avatar: types.maybeNull(types.string),
})

export const CategoryModel = types.model('Category', {
  id: types.number,
  name: types.string,
  description: types.string,
})

export const HistoryEntryModel = types.model('HistoryEntry', {
  videoId: types.number,
  watchedAt: types.string,
})

export const PlaybackState = types.model('PlaybackState', {
  isPlaying: types.optional(types.boolean, false),
  progress: types.optional(types.number, 0),
  duration: types.optional(types.number, 0),
  currentVideoId: types.maybeNull(types.number),
  playlistOrder: types.optional(types.array(types.number), []),
  playlistIndex: types.optional(types.number, 0),
  currentPlaylist: types.maybeNull(types.frozen()),
  recommendedVideoIds: types.optional(types.array(types.number), []),
  startTimestamp: types.maybeNull(types.number),
  showControls: types.optional(types.boolean, true),
  isFullscreen: types.optional(types.boolean, false),
  isLiked: types.optional(types.boolean, false),
  likeCount: types.optional(types.number, 0),
})

export const RecommendationFeedModel = types.model('RecommendationFeed', {
  id: types.identifier,
  title: types.string,
  videos: types.frozen(),
})

type VideoInstance = Instance<typeof VideoModel>

export const VideoStoreModel = types
  .model('VideoStore', {
    videos: types.array(VideoModel),
    channels: types.array(ChannelModel),
    categories: types.array(CategoryModel),
    watchHistory: types.array(HistoryEntryModel),
    playbackState: types.optional(PlaybackState, {} as any),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    userSubscriptions: types.optional(types.array(types.frozen()), []),
    recommendationFeeds: types.optional(
      types.array(RecommendationFeedModel),
      [],
    ),
    isFetchingFeeds: types.optional(types.boolean, false),

    videoEditForm: types.optional(
      types.model({
        title: types.optional(types.string, ''),
        description: types.optional(types.string, ''),
        categoryId: types.maybeNull(types.number),
        commentsEnabled: types.optional(types.boolean, true),
        currentFocused: types.optional(types.string, ''),
        hasInitialised: types.optional(types.boolean, false),
      }),
      {},
    ),
  })
  .views(self => ({
    get currentVideo(): VideoInstance | null {
      return self.playbackState.currentVideoId != null
        ? self.videos.find(v => v.id === self.playbackState.currentVideoId) ||
            null
        : null
    },

    get recommendedVideos(): VideoInstance[] {
      const shuffled = [...self.videos].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, 5)
    },

    get canPlayNext(): boolean {
      const { playlistOrder, playlistIndex } = self.playbackState
      return (
        playlistOrder.length > 0 && playlistIndex < playlistOrder.length - 1
      )
    },

    get canPlayPrev(): boolean {
      const { playlistOrder, playlistIndex } = self.playbackState
      return playlistOrder.length > 0 && playlistIndex > 0
    },

    get isInPlaylistMode(): boolean {
      return self.playbackState.playlistOrder.length > 0
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    let intervalTimer: NodeJS.Timeout | null = null

    /* Helpers */
    const setError = (err: any) => {
      self.error = err instanceof Error ? err.message : String(err)
    }

    const loadCategories = flow(function* () {
      try {
        const categoriesData = yield loadVideoCategories()
        self.categories.replace(categoriesData)
      } catch (e) {
        console.error('Failed to load categories:', e)
      }
    })

    const getChannelInfo = (channelId: number | null) => {
      if (!channelId) return { name: 'Unknown Channel', avatar: null }
      const channel = self.channels.find(c => c.id === channelId)
      return {
        name: channel?.name || 'Unknown Channel',
        avatar: channel?.avatar || null,
      }
    }

    const transformVideoData = (video: any) => {
      const channelInfo = getChannelInfo(video.channelId)
      return {
        ...video,
        channelName: channelInfo.name,
        channelAvatar: channelInfo.avatar,
      }
    }

    const shuffleArray = <T>(array: T[]): T[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    const updateWatchHistory = flow(function* (videoId: number) {
      try {
        const now = new Date().toISOString()

        // Remove existing entry for this videoId
        self.watchHistory.replace(
          self.watchHistory.filter(item => item.videoId !== videoId),
        )

        // Add new entry at the top
        self.watchHistory.unshift({ videoId, watchedAt: now })

        // Enforce limit (e.g., 30)
        if (self.watchHistory.length > 30) {
          self.watchHistory.replace(self.watchHistory.slice(0, 30))
        }
      } catch (e) {
        console.warn("Couldn't update history", e)
      }
    })

    const loadInitialData = flow(function* (options?: {
      skipRecommendationFeeds?: boolean
    }) {
      try {
        self.isLoading = true
        self.error = null

        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id ?? null
        const [videos, history, subs, channels] = yield Promise.all([
          videoQueries.loadVideos(),
          userId ? videoQueries.getWatchHistory(userId) : [],
          userId ? videoQueries.getSubscribedChannels(userId) : [],
          videoQueries.getAllChannels(),
        ])

        // Validate results to catch database issues
        if (!videos || !Array.isArray(videos)) {
          throw new Error(
            'Failed to load videos from database - videos is null or not an array',
          )
        }
        if (!channels || !Array.isArray(channels)) {
          throw new Error(
            'Failed to load channels from database - channels is null or not an array',
          )
        }

        self.videos.replace(cast(videos))
        self.watchHistory.replace(cast(history))
        self.channels.replace(cast(channels))
        self.userSubscriptions.replace(cast(subs))

        // Load playlists in separate store
        if (userId && rootStore.playlistStore) {
          rootStore.playlistStore.loadUserPlaylists()
        }

        // Only fetch recommendation feeds if not skipped (e.g., during restoration)
        if (!options?.skipRecommendationFeeds) {
          // @ts-ignore
          const isLoggedIn = !!rootStore.userStore?.user?.id
          fetchRecommendationFeeds(isLoggedIn)
          console.log('VideoStore: Recommendation feeds refreshed')
        } else {
          console.log(
            'VideoStore: Skipped recommendation feeds refresh (using restored feeds)',
          )
        }

        // Load categories
        yield loadCategories()

        console.log(
          `VideoStore: Successfully loaded ${videos.length} videos, ${channels.length} channels`,
        )
      } catch (e) {
        console.error('VideoStore: loadInitialData failed:', e)
        setError(e)
        throw e // Propagate error to restore method
      } finally {
        self.isLoading = false
      }
    })

    const uploadVideo = flow(function* (data: {
      channelId: number
      title: string
      description?: string
      videoUrl: string
      thumbnailUrl?: string
      duration: number
      categoryId?: number
      isCommentsEnabled?: boolean
    }) {
      try {
        self.isLoading = true
        const rootStore = getRoot(self)
        const uploaderId = rootStore.userStore?.user?.id
        if (!uploaderId) throw new Error('Must be logged in to upload')
        const video = yield videoQueries.uploadVideo(data)
        self.videos.unshift(video)
        return video.id
      } catch (e) {
        setError(e)
        return null
      } finally {
        self.isLoading = false
      }
    })

    const updateVideo = flow(function* (
      videoId: number,
      data: {
        title?: string
        description?: string
        categoryId?: number
        isCommentsEnabled?: boolean
      },
    ) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Must be logged in to update video')

        const updatedVideo = yield videoQueries.updateVideo(
          videoId,
          userId,
          data,
        )

        // Update the video in the store
        const videoIndex = self.videos.findIndex(v => v.id === videoId)
        if (videoIndex !== -1) {
          self.videos[videoIndex] = cast(updatedVideo)
        }

        return updatedVideo
      } catch (e) {
        setError(e)
        throw e
      }
    })

    const playVideo = flow(function* (
      videoId: number,
      options?: { resetProgress?: boolean },
    ) {
      const video = self.videos.find(v => v.id === videoId)
      if (!video) {
        self.error = 'Video not found'
        return
      }

      const shouldResetProgress =
        options?.resetProgress === true ||
        (options?.resetProgress !== false &&
          self.playbackState.currentVideoId !== videoId)

      if (shouldResetProgress) {
        // Set loading state while we initialize video details
        self.isLoading = true

        self.playbackState.currentVideoId = videoId
        self.playbackState.duration = video.duration
        self.playbackState.progress = 0
        self.playbackState.likeCount = video.likeCount || 0

        // Update playlist index if we're in playlist mode
        if (self.playbackState.playlistOrder.length > 0) {
          const index = self.playbackState.playlistOrder.indexOf(videoId)
          if (index !== -1) {
            self.playbackState.playlistIndex = index
          }
        }

        try {
          const rootStore = getRoot(self)
          const userId = rootStore.userStore?.user?.id

          // Fetch like status
          if (userId) {
            const likes = yield videoQueries.getVideoLikes(userId, videoId)
            self.playbackState.isLiked = likes.length > 0
          } else {
            self.playbackState.isLiked = false
          }

          // Wait for view count increment to complete
          yield videoQueries.incrementViewCount(videoId)

          // Update local video view count immediately for UI consistency
          const videoIndex = self.videos.findIndex(v => v.id === videoId)
          if (videoIndex !== -1) {
            self.videos[videoIndex].viewCount += 1
          }

          // Wait for history addition to complete
          if (userId) {
            yield videoQueries.addToHistory(userId, videoId)
            updateWatchHistory(videoId)
          }
        } catch (e) {
          console.error('Error initializing video details:', e)
          // Don't fail the entire playback for these operations
          self.playbackState.isLiked = false
        } finally {
          self.isLoading = false
        }
      }

      self.playbackState.isPlaying = true
      self.playbackState.showControls = true
      self.playbackState.startTimestamp = Date.now()
      actions.startProgressTimer()
    })

    const playPlaylist = flow(function* (playlistId: number, videoId?: number) {
      try {
        const rootStore = getRoot(self)
        const playlistStore = rootStore.playlistStore
        const selectedPlaylist =
          playlistStore.playlists.find((pl: any) => pl.id === playlistId) ||
          playlistStore.allPlaylists.find((pl: any) => pl.id === playlistId)
        if (!selectedPlaylist) {
          console.warn('playPlaylist aborted — playlist not found')
          return
        }
        self.playbackState.currentPlaylist = getSnapshot(selectedPlaylist)

        const videoIds = [...selectedPlaylist.videoIds]
        let playlistOrder: number[] = []

        if (selectedPlaylist.shuffle) {
          playlistOrder = videoIds.sort(() => Math.random() - 0.5)

          if (videoId !== undefined) {
            playlistOrder = [
              videoId,
              ...playlistOrder.filter(id => id !== videoId),
            ]
          }
        } else {
          if (videoId !== undefined) {
            playlistOrder = [videoId, ...videoIds.filter(id => id !== videoId)]
          } else {
            playlistOrder = videoIds
          }
        }

        if (playlistOrder.length === 0) {
          self.error = 'Playlist is empty'
          return
        }
        self.playbackState.playlistOrder.replace(playlistOrder)

        yield playVideo(playlistOrder[0], { resetProgress: true })
      } catch (e) {
        console.warn(`Failed to play playlist due to ${e}`)
      }
    })

    const pauseVideo = () => {
      self.playbackState.isPlaying = false
      self.playbackState.startTimestamp = null
      actions.stopProgressTimer()
    }

    const playNext = flow(function* () {
      const { playlistOrder, playlistIndex } = self.playbackState
      if (
        playlistOrder.length === 0 ||
        playlistIndex >= playlistOrder.length - 1
      ) {
        pauseVideo()
        return false
      }

      const nextVideoId = playlistOrder[playlistIndex + 1]
      return yield playVideo(nextVideoId, { resetProgress: true })
    })

    const playPrev = flow(function* () {
      const { playlistOrder, playlistIndex } = self.playbackState
      if (playlistOrder.length === 0 || playlistIndex <= 0) {
        return false
      }

      const prevVideoId = playlistOrder[playlistIndex - 1]
      return yield playVideo(prevVideoId, { resetProgress: true })
    })

    const getCurrentVideo = () => {
      const currentVideoId = self.playbackState.currentVideoId
      if (!currentVideoId) return null
      return self.videos.find(v => v.id === currentVideoId) || null
    }

    const toggleLike = flow(function* (videoId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) {
          setError('Must be logged in')
          return null
        }
        const res = yield videoQueries.toggleVideoLike(userId, videoId)
        if (res) {
          const video = self.videos.find(v => v.id === videoId)
          if (video) {
            video.likeCount = res.likeCount
            // Update playback state if this is the current video
            if (self.playbackState.currentVideoId === videoId) {
              self.playbackState.likeCount = res.likeCount
              self.playbackState.isLiked = !self.playbackState.isLiked
            }
          }
        }
        return res
      } catch (e) {
        setError(e)
        throw e
      }
    })

    const fetchVideoLikesForUser = flow(function* (videoId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Must be logged in')
        const likes = yield videoQueries.getVideoLikes(userId, videoId)
        return likes
      } catch (e) {
        console.log('Cannot fetch likes for video due to', e)
      }
    })

    const deleteVideo = flow(function* (videoId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        const ok = yield videoQueries.deleteVideo(videoId, userId)
        if (ok) {
          self.videos.replace(self.videos.filter(v => v.id !== videoId))
        }
      } catch (e) {
        setError(e)
      }
    })

    const loadSubscriptions = flow(function* () {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) {
          self.userSubscriptions.replace([])
          return
        }
        const subscriptions = yield videoQueries.getSubscribedChannels(userId)
        if (subscriptions) {
          self.userSubscriptions.replace(cast(subscriptions))
        }
      } catch (e) {
        console.error('Error loading subscriptions:', e)
        setError(e)
      }
    })

    const subscribeChannel = flow(function* (channelId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        yield videoQueries.subscribeToChannel(userId, channelId)
        // Fetch and add channel to store if not already present
        const channelExists = self.channels.find(c => c.id === channelId)
        if (!channelExists) {
          const channel = yield videoQueries.getChannelById(channelId)
          if (channel) {
            self.channels.push(cast(channel))
          }
        }
        // Refresh only subscriptions list
        yield loadSubscriptions()
      } catch (e) {
        setError(e)
      }
    })

    const unsubscribeChannel = flow(function* (channelId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Login required')
        yield videoQueries.unsubscribeFromChannel(userId, channelId)
        // Remove channel from store (test expectation)
        const channelIndex = self.channels.findIndex(c => c.id === channelId)
        if (channelIndex !== -1) {
          self.channels.splice(channelIndex, 1)
        }
        // Refresh only subscriptions list
        yield loadSubscriptions()
      } catch (e) {
        setError(e)
      }
    })

    const hideComments = flow(function* (videoId: number, enabled: boolean) {
      yield setCommentsEnabled(videoId, enabled)
    })

    const setCommentsEnabled = flow(function* (
      videoId: number,
      enabled: boolean,
    ) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) {
          throw new Error('Login required')
        }

        console.log(
          `User ${userId} has requested to edit for ${videoId} to set comments to ${enabled}`,
        )

        const resp = yield videoQueries.setCommentsEnabled(
          videoId,
          userId,
          enabled,
        )

        if (!resp.status) {
          console.log(
            `Failed to set comments enabled to ${enabled} by ${userId} for video ${videoId}`,
            resp,
          )
        } else {
          const video = self.videos.find(v => v.id === videoId)
          if (video) {
            // double check ownership here as well
            if (video.channelId === userId) {
              video.isCommentsEnabled = enabled
            } else {
              console.log(
                `User ${userId} tried to update video ${videoId} not owned by them`,
              )
            }
          } else {
            console.log('Video not found')
          }
        }
      } catch (e) {
        setError(e)
      }
    })

    const fetchRecommendationFeeds = flow(function* (isLoggedIn: boolean) {
      self.isFetchingFeeds = true
      try {
        const allVideos = (yield Promise.all(
          self.videos.map(transformVideoData),
        )) as (typeof VideoModel.Type)[]

        const feeds: any = []

        const addFeed = (
          id: string,
          title: string,
          videos: (typeof VideoModel.Type)[],
        ) => {
          const topVideos = shuffleArray(videos).slice(0, 8)
          if (topVideos.length) feeds.push({ id, title, videos: topVideos })
        }

        if (isLoggedIn) {
          addFeed('recommended-for-you', 'Recommended for you', allVideos)
          addFeed(
            'similar-watched',
            'Similar to what you watched',
            allVideos.filter(v => [1, 4].includes(v.categoryId)),
          )
          addFeed(
            'in-your-orbit',
            'In your orbit',
            allVideos.filter(v => v.viewCount > 1000),
          )
          addFeed(
            'in-your-zone',
            'In your zone',
            allVideos.filter(v => [2, 6].includes(v.categoryId)),
          )
        } else {
          addFeed('recommended-area', 'Recommended in your area', allVideos)
          addFeed(
            'inspired-travel',
            'Inspired by travel',
            allVideos.filter(v => v.categoryId === 7),
          )
          addFeed(
            'best-gaming',
            'Best in gaming',
            allVideos.filter(v => v.categoryId === 1),
          )
          addFeed(
            'trending-now',
            'Trending now',
            allVideos.filter(v => v.viewCount > 500),
          )
        }

        // Create "Popular in..." feeds for various categories
        // Include gaming and music categories to support scenario tests
        const popularCategoryIds = isLoggedIn
          ? [0, 1, 2, 3, 4]
          : [3, 4, 5, 0, 1]

        popularCategoryIds.forEach(categoryId => {
          const category = self.categories.find(c => c.id === categoryId)
          if (!category) return
          const catVideos = allVideos.filter(v => v.categoryId === categoryId)
          if (catVideos.length === 0) return // Skip if no videos in category
          addFeed(
            `category-${categoryId}`,
            `Popular in ${category.name}`,
            catVideos,
          )
        })
        self.recommendationFeeds = feeds
      } catch (err) {
        console.error('Failed to fetch recommendation feeds:', err)
        self.recommendationFeeds.replace([])
      } finally {
        self.isFetchingFeeds = false
      }
    })

    const fetchUserVideos = flow(function* (userId: number) {
      try {
        const userVideos = yield getUserVideos(userId)
        return userVideos
      } catch (e) {
        console.log('Cannot fetch user videos due to', e)
      }
    })

    const loadSubscriptionFeed = flow(function* () {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) return
        const vids = yield videoQueries.getSubscriptionFeed(userId)
        vids.forEach((v: any) => {
          if (!self.videos.find(existing => existing.id === v.id)) {
            self.videos.push(cast(v))
          }
        })
      } catch (e) {
        setError(e)
      }
    })

    const setVideos = (videos: any[]) => {
      self.videos.replace(videos)
    }

    const logOut = () => {
      // Stop any active playback
      actions.resetPlayback()

      self.userSubscriptions.replace([])
      self.watchHistory.replace([])
      self.userSubscriptions.replace([])
      self.playbackState = {
        isPlaying: false,
        progress: 0,
        duration: 0,
        currentVideoId: null,
        playlistOrder: [],
        playlistIndex: 0,
        recommendedVideoIds: [],
        startTimestamp: null,
        showControls: true,
        isFullscreen: false,
        isLiked: false,
        likeCount: 0,
      } as any
      self.isLoading = false
      self.error = ''

      // Delegate to other stores
      const rootStore = getRoot(self)
      rootStore.playlistStore?.logOut()
      rootStore.searchStore?.resetSearchState()
    }

    // UI State Management Actions
    const setShowControls = (show: boolean) => {
      self.playbackState.showControls = show
    }

    const toggleControls = () => {
      self.playbackState.showControls = !self.playbackState.showControls
    }

    const setFullscreen = (fullscreen: boolean) => {
      self.playbackState.isFullscreen = fullscreen
    }

    const toggleFullscreen = () => {
      self.playbackState.isFullscreen = !self.playbackState.isFullscreen
    }

    const setVideoLikeState = (isLiked: boolean, likeCount: number) => {
      self.playbackState.isLiked = isLiked
      self.playbackState.likeCount = likeCount
    }

    const initializeVideoPlayerState = flow(function* (videoId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id

        if (userId) {
          const likes = yield videoQueries.getVideoLikes(userId, videoId)
          self.playbackState.isLiked = likes.length > 0
        } else {
          self.playbackState.isLiked = false
        }
      } catch (e) {
        console.log('Cannot fetch likes for video due to', e)
        self.playbackState.isLiked = false
      }
    })

    // Video edit form actions
    const initializeVideoEditForm = (video: any) => {
      self.videoEditForm.title = video.title || ''
      self.videoEditForm.description = video.description || ''
      self.videoEditForm.categoryId = video.categoryId || null
      self.videoEditForm.commentsEnabled = video.isCommentsEnabled !== false
      self.videoEditForm.currentFocused = 'title'
      self.videoEditForm.hasInitialised = true
    }

    const setVideoEditTitle = (title: string) => {
      self.videoEditForm.title = title
    }

    const setVideoEditDescription = (description: string) => {
      self.videoEditForm.description = description
    }

    const setVideoEditCategoryId = (categoryId: number | null) => {
      self.videoEditForm.categoryId = categoryId
    }

    const setVideoEditCommentsEnabled = (enabled: boolean) => {
      self.videoEditForm.commentsEnabled = enabled
    }

    const setCurrentFocusedField = (name: string) => {
      self.videoEditForm.currentFocused = name
    }

    const resetVideoEditForm = () => {
      self.videoEditForm.title = ''
      self.videoEditForm.description = ''
      self.videoEditForm.categoryId = null
      self.videoEditForm.commentsEnabled = true
      self.videoEditForm.currentFocused = ''
      self.videoEditForm.hasInitialised = false
    }
    const resetPlaybackState = () => {
      actions.stopProgressTimer()
      self.playbackState = {
        showControls: false,
        isPlaying: false,
        progress: 0,
        duration: 0,
        currentVideoId: 0,
        playlistIndex: 0,
        playlistOrder: [],
        recommendedVideoIds: [],
        startTimestamp: null,
        isFullscreen: false,
        isLiked: false,
        likeCount: 0,
      }
    }

    const setPlaybackProgress = (value: number) => {
      self.playbackState.progress = value
    }

    const setRecommendedVideoIds = (videoIds: number[]) => {
      self.playbackState.recommendedVideoIds.replace(videoIds)
    }

    const fetchChannelById = flow(function* (channelId: number) {
      try {
        // First check if channel is already in store
        const existingChannel = self.channels.find(c => c.id === channelId)
        if (existingChannel) {
          return existingChannel
        }

        // If not, fetch from database
        const channel = yield videoQueries.getChannelById(channelId)
        if (channel) {
          // Add to store if not already present
          const channelExists = self.channels.find(c => c.id === channelId)
          if (!channelExists) {
            self.channels.push(cast(channel))
          }
          return channel
        }
        return null
      } catch (error) {
        console.error('Error fetching channel by ID:', error)
        self.error =
          error instanceof Error ? error.message : 'Failed to fetch channel'
        throw error
      }
    })

    const fetchVideosByChannelId = flow(function* (channelId: number) {
      try {
        const videos = yield videoQueries.getVideosByChannelId(channelId)
        return videos
      } catch (error) {
        console.error('Error fetching videos by channel ID:', error)
        self.error =
          error instanceof Error ? error.message : 'Failed to fetch videos'
        throw error
      }
    })

    const actions = {
      setError,
      loadCategories,
      getChannelInfo,
      fetchChannelById,
      fetchVideosByChannelId,
      transformVideoData,
      shuffleArray,
      loadInitialData,
      loadSubscriptions,
      uploadVideo,
      updateVideo,
      updateWatchHistory,
      playVideo,
      playPlaylist,
      pauseVideo,
      playNext,
      playPrev,
      getCurrentVideo,
      toggleLike,
      fetchVideoLikesForUser,
      deleteVideo,
      subscribeChannel,
      unsubscribeChannel,
      hideComments,
      setCommentsEnabled,
      fetchRecommendationFeeds,
      fetchUserVideos,
      loadSubscriptionFeed,
      setVideos,
      logOut,
      setShowControls,
      toggleControls,
      setFullscreen,
      toggleFullscreen,
      setVideoLikeState,
      initializeVideoPlayerState,
      initializeVideoEditForm,
      setVideoEditTitle,
      setVideoEditDescription,
      setVideoEditCategoryId,
      setVideoEditCommentsEnabled,
      setCurrentFocusedField,
      resetVideoEditForm,
      resetPlaybackState,
      setPlaybackProgress,
      setRecommendedVideoIds,

      startProgressTimer() {
        self.playbackState.isPlaying = true
        if (intervalTimer) {
          clearInterval(intervalTimer)
        }
        intervalTimer = setInterval(() => {
          runInAction(() => {
            if (self.playbackState.progress >= self.playbackState.duration) {
              actions.onVideoComplete()
            } else {
              actions.setProgress(self.playbackState.progress + 1)
            }
          })
        }, 1000)
      },

      stopProgressTimer() {
        if (intervalTimer) {
          clearInterval(intervalTimer)
          intervalTimer = null
        }
      },

      onVideoComplete: flow(function* () {
        const { playlistOrder, playlistIndex } = self.playbackState

        if (playlistOrder.length === 0) {
          pauseVideo()
          return
        }

        if (playlistIndex >= playlistOrder.length - 1) {
          pauseVideo()
          return
        }

        yield playNext()
      }),

      togglePlayback() {
        if (self.playbackState.isPlaying) {
          pauseVideo()
        } else {
          if (self.playbackState.currentVideoId) {
            playVideo(self.playbackState.currentVideoId, {
              resetProgress: false,
            })
          }
        }
      },

      resetPlayback() {
        actions.stopProgressTimer()
        self.playbackState.isPlaying = false
        self.playbackState.progress = 0
        self.playbackState.duration = 0
        self.playbackState.currentVideoId = null
        self.playbackState.playlistOrder.replace([])
        self.playbackState.playlistIndex = 0
        self.playbackState.startTimestamp = null
        self.playbackState.showControls = true
        self.playbackState.isFullscreen = false
        self.playbackState.isLiked = false
        self.playbackState.likeCount = 0
      },

      setProgress(seconds: number) {
        self.playbackState.progress = seconds
      },

      setDuration(seconds: number) {
        self.playbackState.duration = seconds
      },

      switchToVideo: flow(function* (
        videoId: number,
        context?: 'single' | 'playlist',
      ) {
        const isDifferentVideo = self.playbackState.currentVideoId !== videoId
        console.log(
          isDifferentVideo,
          self.playbackState.currentVideoId,
          videoId,
        )

        if (context === 'single') {
          // Clear playlist mode
          self.playbackState.playlistOrder.replace([])
          self.playbackState.playlistIndex = 0
          self.playbackState.currentPlaylist = null

          // Clear old recommendations when switching to a different video
          if (isDifferentVideo) {
            self.playbackState.recommendedVideoIds.replace([])
          }
        }

        return yield playVideo(videoId, { resetProgress: true })
      }),

      initializeVideo: flow(function* (videoId: number) {
        if (self.playbackState.currentVideoId === videoId) {
          return
        }

        const context =
          self.playbackState.playlistOrder.length > 0 ? 'playlist' : 'single'

        return yield actions.switchToVideo(videoId, context)
      }),

      navigateToVideo: flow(function* (
        videoId: number,
        preservePlaylist: boolean = false,
      ) {
        if (!preservePlaylist) {
          return yield actions.switchToVideo(videoId, 'single')
        } else {
          return yield actions.switchToVideo(videoId, 'playlist')
        }
      }),

      // Internal self-management restore - handles both volatile state and data reloading
      restore: flow(function* (data: any) {
        try {
          console.log('VideoStore: Starting internal self-managed restoration')

          // Phase 1: Restore volatile state immediately
          if (data.playbackState) {
            console.log(
              'VideoStore: Restoring playback state:',
              data.playbackState,
            )

            // Stop any existing timers first
            actions.stopProgressTimer()

            // Handle array fields specially
            if (
              data.playbackState.playlistOrder &&
              Array.isArray(data.playbackState.playlistOrder)
            ) {
              self.playbackState.playlistOrder.replace(
                data.playbackState.playlistOrder,
              )
            }

            // Handle other fields with validation
            const playbackFields = [
              'isPlaying',
              'progress',
              'duration',
              'currentVideoId',
              'playlistIndex',
              'currentPlaylist',
              'startTimestamp',
              'showControls',
              'isFullscreen',
              'isLiked',
              'likeCount',
            ]

            playbackFields.forEach(key => {
              if (key in data.playbackState && key in self.playbackState) {
                ;(self.playbackState as any)[key] = data.playbackState[key]
              }
            })

            // Restart timer if video was playing
            if (
              data.playbackState.isPlaying &&
              data.playbackState.currentVideoId
            ) {
              actions.startProgressTimer()
            }

            console.log('VideoStore: Playback state restored successfully')
          }

          // Note: watchHistory and userSubscriptions are static data (stored in DB)
          // They will be reloaded from DB via loadInitialData(), so don't restore from snapshot

          if (data.recommendationFeeds) {
            self.recommendationFeeds.replace(cast(data.recommendationFeeds))
          }

          if (data.videoEditForm) {
            Object.keys(data.videoEditForm).forEach(key => {
              if (key in self.videoEditForm) {
                ;(self.videoEditForm as any)[key] = data.videoEditForm[key]
              }
            })
          }

          console.log(
            'VideoStore: Volatile state restored, loading static data from DB',
          )

          // Phase 2: Reload static data from DB (videos, channels, categories)
          // Skip recommendation feeds since we already restored them from volatile state
          yield actions.loadInitialData({ skipRecommendationFeeds: true })

          console.log('VideoStore: Restoration completed successfully')
        } catch (error) {
          console.error('VideoStore: Restoration failed:', error)
          // Don't reset playback state - preserve what was restored
          // Only reset if it's a critical error that makes the state unusable
          if (error instanceof Error && error.message.includes('critical')) {
            actions.resetPlayback()
          }
          throw error
        }
      }),
    }

    return actions
  })

export const createVideoStore = () =>
  VideoStoreModel.create({
    videos: [],
    playlists: [],
    channels: [],
    categories: [],
    watchHistory: [],
    playbackState: {
      isPlaying: false,
      progress: 0,
      duration: 0,
      currentVideoId: null,
      playlistOrder: [],
      playlistIndex: 0,
      startTimestamp: null,
      showControls: true,
      isFullscreen: false,
      isLiked: false,
      likeCount: 0,
    },
    playlistUI: {
      showCreateModal: false,
      showDeleteAlert: false,
      selectedPlaylistId: null,
      newPlaylistName: '',
      showRemoveVideoAlert: false,
      selectedVideoId: null,
    },
  })

export interface VideoStore extends Instance<typeof VideoStoreModel> {}
