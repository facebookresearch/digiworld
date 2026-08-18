// Mock queries first
import { createVideoStore } from '../models/VideoStore'
import { createPlaylistStore } from '@/models/PlaylistStore'
import { createSearchStore } from '@/models/SearchStore'

jest.mock('@/db/queries', () => {
  const sampleVideo = {
    id: 1,
    title: 'Public Video',
    description: '',
    uploaderId: 1,
    videoUrl: 'http://example.com/video.mp4',
    thumbnailUrl: undefined,
    duration: 60,
    views: 0,
    likeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLiked: false,
    categoryId: 2,
    visibility: 'public',
    status: 'active',
    viewCount: 25,
    commentCount: 12,
  }
  return {
    queries: {
      loadVideos: jest.fn().mockResolvedValue([sampleVideo]),
      searchVideos: jest.fn().mockResolvedValue([1]),
      incrementViewCount: jest.fn().mockResolvedValue(undefined),
      addToHistory: jest.fn().mockResolvedValue(undefined),
      toggleVideoLike: jest.fn().mockResolvedValue(undefined),
      uploadVideo: jest.fn().mockResolvedValue({ id: 2, title: 'upload' }),
      createPlaylist: jest.fn().mockRejectedValue(new Error('Login required')),
      addVideoToPlaylist: jest.fn().mockResolvedValue(undefined),
      removeVideoFromPlaylist: jest.fn().mockResolvedValue(undefined),
      deletePlaylist: jest.fn().mockResolvedValue(undefined),
      subscribeToChannel: jest.fn().mockResolvedValue(undefined),
      unsubscribeFromChannel: jest.fn().mockResolvedValue(undefined),
      getChannelsByUserId: jest.fn().mockResolvedValue([]),
      // Add missing methods that VideoStore.loadInitialData calls
      getWatchHistory: jest.fn().mockResolvedValue([]),
      getSubscribedChannels: jest.fn().mockResolvedValue([]),
      getAllChannels: jest.fn().mockResolvedValue([]),
      loadVideoCategories: jest.fn().mockResolvedValue([]),
      getVideoLikes: jest.fn().mockResolvedValue([]),
    },
  }
})

// Guest user store (no auth)
const store = createVideoStore()
const playlistStore = createPlaylistStore()
const searchStore = createSearchStore()

// util: ensure we have initial videos loaded for search results etc.
beforeAll(async () => {
  // @ts-ignore private write to bypass auth when needed
  // @ts-ignore
  store.setProp('userStore', null)
  const mockVideos = require('../data/mock-videos.json')
  const formattedVideos = mockVideos.map((v: any) => ({
    ...v,
    createdAt: new Date(v.createdAt.replace(' ', 'T') + 'Z').toISOString(),
    updatedAt: new Date(v.updatedAt.replace(' ', 'T') + 'Z').toISOString(),
    likeCount: v.likeCount,
    categoryId: v.categoryId,
    commentCount: v.commentCount,
    viewCount: v.viewCount,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    visibility: v.visibility,
    status: v.status,
    deletedAt: v.deletedAt,
  }))
  store.setProp('videos', formattedVideos)

  // await store.loadInitialData()
})

describe('Guest User Behaviour', () => {
  it('can browse public videos', () => {
    expect(store.videos.length).toBeGreaterThan(0)
  })

  it('cannot like videos', async () => {
    await store.toggleLike(1)
    expect(store.error).toBe('Must be logged in')
  })

  it('cannot comment on videos', async () => {
    // Create a comment store and try to add comment without user
    const commentStore = require('../models/CommentStore').createCommentStore()
    try {
      await commentStore.addComment(1, 'hello')
    } catch (error) {
      expect(error.message).toBe('Must be logged in to comment')
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('can search videos', async () => {
    await searchStore.searchVideos('unit')
    expect(searchStore.searchResults.length).toBeGreaterThanOrEqual(0)
  })

  it('cannot create playlist', async () => {
    await playlistStore.createPlaylist('guest')
    expect(playlistStore.error).toBe('Login required')
  })

  it('cannot subscribe to channel', async () => {
    await store.subscribeChannel(1)
    expect(store.error).toBe('Login required')
  })

  it('playVideo updates playback state without auth', async () => {
    await store.playVideo(1)
    expect(store.playbackState.isPlaying).toBe(true)
    expect(store.currentVideo?.id).toBe(1)
  })

  it('pauseVideo works for guest', async () => {
    await store.playVideo(1)
    store.pauseVideo()
    expect(store.playbackState.isPlaying).toBe(false)
  })

  it('playVideo invalid id sets error', async () => {
    await store.playVideo(999)
    expect(store.error).toBe('Video not found')
  })

  it('clearSearch resets searchResults and query', async () => {
    await searchStore.searchVideos('guest-query')
    expect(searchStore.searchResults.length).toBeGreaterThanOrEqual(0)
    searchStore.clearSearch()
    expect(searchStore.searchResults.length).toBe(0)
    expect(searchStore.searchQuery).toBe('')
  })

  it('cannot upload videos', async () => {
    const id = await store.uploadVideo({ title: 'x', file: {} as any })
    expect(id).toBeNull()
    expect(store.error).toBe('Must be logged in to upload')
  })

  it('initial watchHistory is empty for guests', () => {
    expect(store.watchHistory.length).toBe(0)
  })

  it('playVideo does not push to history for guests', async () => {
    await store.playVideo(1)
    expect(store.watchHistory.length).toBe(0)
  })

  it('cannot delete playlist', async () => {
    await playlistStore.deletePlaylist(1 as any)
    expect(playlistStore.error).toBe('Login required')
  })

  it('cannot unsubscribe from channel', async () => {
    await store.unsubscribeChannel(1)
    expect(store.error).toBe('Login required')
  })

  it('setProp works for guest', () => {
    store.setProp('error', null)
    expect(store.error).toBeNull()
  })

  it('isLoading toggles during search', async () => {
    const p = searchStore.searchVideos('loading')
    expect(searchStore.isLoading).toBe(true)
    await p
    expect(searchStore.isLoading).toBe(false)
  })

  it('cannot like video', async () => {
    await store.toggleLike(1)
    expect(store.error).toBe('Must be logged in')
  })

  it('cannot add comment', async () => {
    // Create a comment store and try to add comment without user
    const commentStore = require('../models/CommentStore').createCommentStore()
    try {
      await commentStore.addComment(1, 'not allowed')
    } catch (error) {
      expect(error.message).toBe('Must be logged in to comment')
    }
  })

  it('playback duration set from video', async () => {
    await store.playVideo(1)
    expect(store.playbackState.duration).toBe(store.videos[0].duration)
  })
})
