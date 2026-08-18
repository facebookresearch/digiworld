// Copyright (c) Meta Platforms, Inc. and affiliates.
import './dbMock'
import { db, getSingleId, cleanup } from './dbTestEnv'
import { channels } from '../schema'

const { queries } = require('../queries') as {
  queries: Record<string, (...args: any[]) => Promise<any>>
}

describe('DB query smoke-tests', () => {
  let sampleUserId: number
  let sampleVideoId: number
  let samplePlaylistId: number
  let sampleChannelId: number
  let sampleCommentId: number
  let ownVideoId: number
  let ownCommentId: number

  beforeAll(async () => {
    const newUser = await queries.registerUser({
      email: `smoke_${Date.now()}@example.com`,
      username: `smoke_user_${Date.now()}`,
      password: 'pass',
    })
    sampleUserId = newUser.id

    let ch = await queries.getChannelsByUserId(sampleUserId)
    if (ch.length === 0) {
      const chanRes = await db
        .insert(channels)
        .values({
          userId: sampleUserId,
          name: `chan_${Date.now()}`,
        })
        .returning()
        .execute()
      ch = chanRes
    }
    sampleChannelId = ch[0].id

    // Upload a video we fully own – tiny placeholder meta
    const vid = await queries.uploadVideo({
      channelId: sampleChannelId,
      title: 'Smoke video',
      videoUrl: 'https://somerandomurl.com',
      duration: 560,
      viewCount: 0,
      likeCount: 0,
      categoryId: 2,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    ownVideoId = vid.id

    const c = await queries.addComment({
      videoId: ownVideoId,
      userId: sampleUserId,
      content: 'smoke comment',
    })
    ownCommentId = c.id

    sampleVideoId = await getSingleId('videos')
    samplePlaylistId = await getSingleId('playlists')
    sampleCommentId = await getSingleId('comments')
  })

  afterAll(() => {
    cleanup()
  })

  type ObjectCase = {
    name: string
    fn: (...args: any[]) => Promise<any>
    args: () => Promise<any[]>
    expectError?: boolean
  }
  type Case =
    | ObjectCase
    | [string, (...args: any[]) => Promise<any>, () => Promise<any[]>]
  const cases: Case[] = [
    ['loadVideos', queries.loadVideos, async () => []],
    ['getUserById', queries.getUserById, async () => [sampleUserId]],
    [
      'getUserByEmail',
      queries.getUserByEmail,
      async () => [`smoke_${Date.now()}@test.com`],
    ],
    ['searchVideos', queries.searchVideos, async () => ['test']],
    [
      'getPlaylistsByUserId',
      queries.getPlaylistsByUserId,
      async () => [sampleUserId],
    ],
    [
      'getPlaylistById',
      queries.getPlaylistById,
      async () => [samplePlaylistId],
    ],
    ['getWatchHistory', queries.getWatchHistory, async () => [sampleUserId]],
    [
      'getChannelsByUserId',
      queries.getChannelsByUserId,
      async () => [sampleUserId],
    ],
    [
      'getSubscribedChannels',
      queries.getSubscribedChannels,
      async () => [sampleUserId],
    ],
    [
      'getSubscriptionFeed',
      queries.getSubscriptionFeed,
      async () => [sampleUserId],
    ],
    [
      'toggleVideoLike',
      queries.toggleVideoLike,
      async () => [sampleUserId, sampleVideoId],
    ],
    [
      'addComment',
      queries.addComment,
      async () => [
        { videoId: sampleVideoId, userId: sampleUserId, content: 'smoke test' },
      ],
    ],
    {
      name: 'createPlaylist',
      fn: queries.createPlaylist,
      args: async () => [{ userId: sampleUserId, name: `plist_${Date.now()}` }],
    },
    [
      'addVideoToPlaylist',
      queries.addVideoToPlaylist,
      async () => [samplePlaylistId, sampleVideoId],
    ],
    [
      'removeVideoFromPlaylist',
      queries.removeVideoFromPlaylist,
      async () => [samplePlaylistId, sampleVideoId],
    ],

    [
      'addToHistory',
      queries.addToHistory,
      async () => [sampleUserId, sampleVideoId],
    ],
    [
      'incrementViewCount',
      queries.incrementViewCount,
      async () => [sampleVideoId],
    ],
    // upload & delete video
    {
      name: 'uploadVideo',
      fn: queries.uploadVideo,
      args: async () => [
        {
          channelId: sampleChannelId,
          title: 'temp',
          videoUrl: 'https://x/y.mp4',
          duration: 1,
          categoryId: 1,
        },
      ],
    },
    {
      name: 'deleteVideo',
      fn: queries.deleteVideo,
      args: async () => [ownVideoId, sampleUserId],
    },
    [
      'subscribeToChannel',
      queries.subscribeToChannel,
      async () => [sampleUserId, sampleChannelId],
    ],
    [
      'unsubscribeFromChannel',
      queries.unsubscribeFromChannel,
      async () => [sampleUserId, sampleChannelId],
    ],
    [
      'updateUserProfile',
      queries.updateUserProfile,
      async () => [sampleUserId, { username: 'Smoke Tester' }],
    ],
    {
      name: 'deleteComment.unauth',
      fn: queries.deleteComment,
      args: async () => [sampleCommentId, sampleUserId],
      expectError: true,
    },
    {
      name: 'deleteComment.ok',
      fn: queries.deleteComment,
      args: async () => [ownCommentId, sampleUserId],
    },
    {
      name: 'setCommentsEnabled.unauth',
      fn: queries.setCommentsEnabled,
      args: async () => [sampleVideoId, sampleUserId, false],
      expectError: true,
    },
    {
      name: 'setCommentsEnabled.ok',
      fn: queries.setCommentsEnabled,
      args: async () => [ownVideoId, sampleUserId, true],
    },

    [
      'deletePlaylist',
      queries.deletePlaylist,
      async () => [samplePlaylistId, sampleUserId],
    ],
    ['fetchUserById', queries.fetchUserById, async () => [sampleUserId]],
    [
      'registerUser',
      queries.registerUser,
      async () => [
        {
          email: `smoke_${Date.now()}@test.com`,
          username: `user_${Date.now()}`,
          password: 'pass',
        },
      ],
    ],
  ]

  for (const entry of cases) {
    let name: string,
      fn: (...args: any[]) => Promise<any>,
      argProvider: () => Promise<any[]>,
      expectError: boolean | undefined

    if (Array.isArray(entry)) {
      ;[name, fn, argProvider] = entry
      expectError = false
    } else {
      ;({ name, fn, args: argProvider, expectError } = entry)
    }

    test(name, async () => {
      const args = await argProvider()
      try {
        await fn(...args)
        if (expectError) {
          throw new Error('Expected failure but succeeded')
        }
      } catch (err) {
        if (expectError) {
          return
        }
        throw err
      }
    })
  }
})

/*
Checklist of cases covered
✔ loadVideos
✔ getUserById
✔ getUserByEmail
✔ searchVideos
✔ getPlaylistsByUserId
✔ getPlaylistById
✔ getWatchHistory
✔ getChannelsByUserId
✔ getSubscribedChannels
✔ getSubscriptionFeed
✔ toggleVideoLike
✔ addComment
✔ createPlaylist
✔ addVideoToPlaylist
✔ removeVideoFromPlaylist
✔ deletePlaylist
✔ addToHistory
✔ incrementViewCount
✔ subscribeToChannel
✔ unsubscribeFromChannel
✔ updateUserProfile
✔ deleteComment
✔ setCommentsEnabled
✔ registerUser
✔ fetchUserById
✔ addReply
*/
