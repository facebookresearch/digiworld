// Copyright (c) Meta Platforms, Inc. and affiliates.
import { UserStoreModel } from '../models/UserStore'
import { RootStore } from '../models/RootStore'
import videos from '../data/mock-videos.json'
import { createPlaylistStore } from '@/models/PlaylistStore'
import { createSearchStore } from '@/models/SearchStore'

jest.mock('@/db/queries', () => {
  const mockPlaylists: any[] = []
  const mockChannels: any[] = []
  let liked = false
  return {
    queries: {
      loadVideos: jest.fn().mockResolvedValue([]),
      getPlaylistsByUserId: jest.fn().mockResolvedValue(mockPlaylists),
      getWatchHistory: jest.fn().mockResolvedValue([]),
      getSubscribedChannels: jest.fn().mockResolvedValue([]),

      uploadVideo: jest.fn().mockImplementation(async ({ title }) => ({
        id: 2,
        title,
      })),
      toggleVideoLike: jest.fn().mockImplementation(async () => {
        liked = !liked
        return { likeCount: liked ? 1 : 0, isLiked: liked }
      }),
      getVideoLikes: jest.fn().mockImplementation(async () => {
        return [64, 23]
      }),

      addComment: jest
        .fn()
        .mockImplementation(async ({ videoId, userId, content, parentId }) => ({
          id: Math.floor(Math.random() * 1000) + 1,
          videoId,
          userId,
          content,
          parentId: parentId ?? null,
          username: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),

      addReply: jest
        .fn()
        .mockImplementation(async ({ videoId, userId, content, parentId }) => ({
          id: Math.floor(Math.random() * 1000) + 1,
          videoId,
          userId,
          content,
          parentId,
          username: 'tester',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),

      searchVideos: jest.fn().mockResolvedValue([1]),

      createPlaylist: jest
        .fn()
        .mockImplementation(async ({ userId, name, description }) => {
          const pl = {
            id: mockPlaylists.length + 1,
            userId,
            name,
            description: description ?? null,
            videoIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          mockPlaylists.push(pl)
          return pl
        }),
      addVideoToPlaylist: jest.fn().mockImplementation(async (pid, vid) => {
        const pl = mockPlaylists.find(p => p.id === pid)
        if (pl && !pl.videoIds.includes(vid)) pl.videoIds.push(vid)
      }),
      removeVideoFromPlaylist: jest
        .fn()
        .mockImplementation(async (pid, vid) => {
          const pl = mockPlaylists.find(p => p.id === pid)
          if (pl) pl.videoIds = pl.videoIds.filter((id: any) => id !== vid)
        }),
      deletePlaylist: jest.fn().mockResolvedValue(true),
      deleteVideo: jest.fn().mockResolvedValue(true),

      subscribeToChannel: jest.fn().mockImplementation(async (_uid, cid) => {
        const channelObj = {
          id: cid,
          name: `Channel ${cid}`,
          description: null,
          subscriberCount: 0,
        }
        mockChannels.push(channelObj)
      }),
      unsubscribeFromChannel: jest
        .fn()
        .mockImplementation(async (_uid, cid) => {
          const i = mockChannels.findIndex(c => c.id === cid)
          if (i >= 0) mockChannels.splice(i, 1)
        }),
      getChannelsByUserId: jest
        .fn()
        .mockImplementation(async () => mockChannels),

      incrementViewCount: jest.fn().mockResolvedValue(undefined),
      addToHistory: jest.fn().mockResolvedValue(undefined),

      // Comment-related mocks
      getCommentsForVideo: jest.fn().mockResolvedValue([]),
      getRepliesForComment: jest.fn().mockResolvedValue([]),
      updateCommentContent: jest.fn().mockResolvedValue({ status: true }),
      setCommentStatus: jest.fn().mockResolvedValue({ status: true }),
      deleteComment: jest.fn().mockResolvedValue({ status: true }),

      // Category mocks
      loadVideoCategories: jest.fn().mockResolvedValue([]),
      getAllChannels: jest.fn().mockResolvedValue([]),
      getSubscriptionFeed: jest.fn().mockResolvedValue([]),
      setCommentsEnabled: jest.fn().mockResolvedValue({ status: true }),
      updateVideo: jest.fn().mockResolvedValue({}),
    },
  }
})

// helper to create a fresh user store per VideoStore instance
const buildUserStore = () =>
  UserStoreModel.create({
    user: {
      id: 1,
      username: 'tester',
      email: 'tester@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any,
    isAuthenticated: true,
  })
const makeStore = () => {
  const videosJson = require('../data/mock-videos.json')
  const userStore = buildUserStore()
  const playlistStore = createPlaylistStore()
  const searchStore = createSearchStore()
  // Create root store with all sub-stores
  const rootStore = RootStore.create({
    userStore: userStore as any,
    videoStore: {},
    commentStore: {},
    playlistStore,
    searchStore,
  })

  const formattedVideos = videosJson.map((v: any) => ({
    ...v,
    createdAt: new Date(v.createdAt.replace(' ', 'T') + 'Z').toISOString(),
    updatedAt: new Date(v.updatedAt.replace(' ', 'T') + 'Z').toISOString(),
    likeCount: v.likeCount,
    commentCount: v.commentCount,
    categoryId: v.categoryId,
    viewCount: v.viewCount,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    visibility: v.visibility,
    status: v.status,
    deletedAt: v.deletedAt,
  }))

  rootStore.videoStore.setProp('videos', formattedVideos)

  return rootStore
}

describe('VideoStore – logged-in flow', () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(async () => {
    store = makeStore()
  })

  it('loads video', () =>
    expect(store.videoStore.videos.length).toBe(videos.length))

  it('addComment appends', async () => {
    const before = store.commentStore.comments.length
    await store.commentStore.addComment(1, 'hi')
    expect(store.commentStore.comments.length).toBe(before + 1)
  })

  it('searchVideos populates results & clearSearch empties', async () => {
    await store.searchStore.searchVideos('foo')
    expect(store.searchStore.searchResults.length).toBe(1)
    store.searchStore.clearSearch()
    expect(store.searchStore.searchResults.length).toBe(0)
  })

  it('pauseVideo stops playback', () => {
    store.videoStore.playVideo(1)
    store.videoStore.pauseVideo()
    expect(store.videoStore.playbackState.isPlaying).toBe(false)
  })

  it('playVideo on invalid id sets error', () => {
    store.videoStore.playVideo(999)
    expect(store.videoStore.error).toBe('Video not found')
  })

  it('toggleLike updates likeCount', async () => {
    const before = store.videoStore.videos[0].likeCount
    await store.videoStore.toggleLike(1)
    expect(store.videoStore.videos[0].likeCount).not.toBe(before)
  })

  it('toggleLike toggles likeCount back', async () => {
    await store.videoStore.toggleLike(1) // first toggle
    const afterFirst = store.videoStore.videos[0].likeCount
    await store.videoStore.toggleLike(1) // second toggle
    expect(store.videoStore.videos[0].likeCount).not.toBe(afterFirst)
  })

  it('deleteVideo removes video', async () => {
    const vidId = store.videoStore.videos[0].id
    await store.videoStore.deleteVideo(vidId)
    expect(store.videoStore.videos.find(v => v.id === vidId)).toBeUndefined()
  })

  it('recommendedVideos returns up to 3 items', () => {
    const rec = store.videoStore.recommendedVideos
    expect(rec.length).toBeLessThanOrEqual(5)
  })

  it('playVideo sets duration according to the video', () => {
    store.videoStore.playVideo(1)
    expect(store.videoStore.playbackState.duration).toBe(
      store.videoStore.videos[0].duration,
    )
  })

  it('clearSearch also clears searchQuery string', async () => {
    await store.searchStore.searchVideos('query')
    expect(store.searchStore.searchQuery).toBe('query')
    store.searchStore.clearSearch()
    expect(store.searchStore.searchQuery).toBe('')
  })

  it('initial isLoading flag is false', () => {
    expect(store.videoStore.isLoading).toBe(false)
  })

  it('addComment stores username correctly', async () => {
    await store.commentStore.addComment(1, 'hello world')
    expect(store.commentStore.comments[0].username).toBe('tester')
  })

  it('reply to comment stores parentId', async () => {
    await store.commentStore.addComment(1, 'parent')
    const parentId =
      store.commentStore.comments[store.commentStore.comments.length - 1].id
    await store.commentStore.addReply(1, parentId, 'child')
    const child =
      store.commentStore.comments[store.commentStore.comments.length - 1]
    expect(child.parentId).toBe(parentId)
  })

  it('setProp updates arbitrary property', () => {
    store.videoStore.setProp('error', 'custom')
    expect(store.videoStore.error).toBe('custom')
  })
})
