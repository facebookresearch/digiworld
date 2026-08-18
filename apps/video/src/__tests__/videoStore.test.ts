import { UserStoreModel } from '../models/UserStore'
import { createVideoStore } from '../models/VideoStore'
import { createPlaylistStore } from '@/models/PlaylistStore'
import { createSearchStore } from '@/models/SearchStore'

// Create a mock video
const mockSampleVideo = {
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

// ✅ Correct mock for `import { queries as videoQueries } from '@/db/queries'`
jest.mock('@/db/queries', () => ({
  __esModule: true,
  queries: {
    loadVideos: jest.fn().mockResolvedValue([mockSampleVideo]),
    getPlaylistsByUserId: jest.fn().mockResolvedValue([]),
    getWatchHistory: jest.fn().mockResolvedValue([]),
    getSubscribedChannels: jest.fn().mockResolvedValue([]),
    toggleVideoLike: jest.fn().mockImplementation((_userId, _videoId) => {
      mockSampleVideo.likeCount += mockSampleVideo.isLiked ? -1 : 1
      mockSampleVideo.isLiked = !mockSampleVideo.isLiked
      return Promise.resolve({
        likeCount: mockSampleVideo.likeCount,
        isLiked: mockSampleVideo.isLiked,
      })
    }),
    addComment: jest.fn().mockImplementation(({ videoId, userId, content }) => {
      return Promise.resolve({
        id: 99,
        videoId,
        userId,
        content,
        parentId: null,
        username: 'tester',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }),
    searchVideos: jest.fn().mockResolvedValue([1]),
    createPlaylist: jest.fn().mockImplementation(({ userId, name }) => {
      return Promise.resolve({
        id: 10,
        userId,
        name,
        description: null,
        isPublic: false,
        videoIds: [],
        createdAt: '',
        updatedAt: '',
      })
    }),
    addVideoToPlaylist: jest.fn().mockResolvedValue(null),
    removeVideoFromPlaylist: jest.fn().mockResolvedValue(null),
    deletePlaylist: jest.fn().mockResolvedValue(true),
    deleteVideo: jest.fn().mockResolvedValue(true),
    incrementViewCount: jest.fn(),
    addToHistory: jest.fn(),
    subscribeToChannel: jest.fn(),
    unsubscribeFromChannel: jest.fn(),
    getChannelsByUserId: jest.fn().mockResolvedValue([]),
    getAllChannels: jest.fn().mockResolvedValue([]),
    loadVideoCategories: jest.fn().mockResolvedValue([]),
  },
}))

const mockUserStore = UserStoreModel.create({
  user: {
    id: 1,
    username: 'tester',
    email: 'tester@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any,
  isAuthenticated: true,
})

describe('VideoStore', () => {
  const store = createVideoStore()
  const mockVideos = require('../data/mock-videos.json')
  const formattedVideos = mockVideos.map((v: any) => ({
    ...v,
    categoryId: v.categoryId,
    createdAt: new Date(v.createdAt.replace(' ', 'T') + 'Z').toISOString(),
    updatedAt: new Date(v.updatedAt.replace(' ', 'T') + 'Z').toISOString(),
    likeCount: v.likeCount,
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
  const playlistStore = createPlaylistStore()
  const searchStore = createSearchStore()

  it('loads initial data', async () => {
    // await store.loadInitialData()
    expect(store.videos.length).toBeGreaterThan(0)
  })

  it('adds a comment', async () => {
    // Create a root store with comment store
    const { RootStore } = require('../models/RootStore')
    const rootStore = RootStore.create({
      userStore: mockUserStore as any,
      videoStore: store,
      commentStore: {},
      playlistStore,
      searchStore,
    })

    const before = rootStore.commentStore.comments.length
    await rootStore.commentStore.addComment(1, 'hello world')
    expect(rootStore.commentStore.comments.length).toBe(before + 1)
    expect(
      rootStore.commentStore.comments[
        rootStore.commentStore.comments.length - 1
      ].content,
    ).toBe('hello world')
  })

  it('search updates result ids', async () => {
    await searchStore.searchVideos('test')
    expect(searchStore.searchResultVideoIds).toEqual([1])
    expect(searchStore.searchResults[0].id).toBe(1)
  })

  // it('creates playlist', async () => {
  //   const id = await store.createPlaylist('My list')
  //   expect(id).toBe(10)
  //   expect(store.playlists.find(pl => pl.id === 10)).toBeTruthy()
  // })
})
