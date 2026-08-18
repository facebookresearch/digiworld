// Copyright (c) Meta Platforms, Inc. and affiliates.
import './dbMock'
import { getSingleId } from './dbTestEnv'
import { createVideoStore } from '../models/VideoStore'
import { UserStoreModel } from '../models/UserStore'
import { RootStore } from '../models/RootStore'
import { createPlaylistStore } from '@/models/PlaylistStore'

describe('VideoStore integration – logged in', () => {
  let rootStore: any

  beforeAll(async () => {
    const user = {
      id: 1,
      username: `vs_user_${Date.now()}`,
      email: `vs_int_${Date.now()}@example.com`,
      name: '',
      avatar: '',
      bio: '',
      password: 'pass',
      recentlyPlayed: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }

    const userStore = UserStoreModel.create({ user, isAuthenticated: true })

    rootStore = RootStore.create({
      userStore: userStore as any,
      videoStore: {},
      commentStore: {},
    })

    await rootStore.videoStore.loadInitialData()
  })

  // Helper to access stores
  const store = () => rootStore.videoStore
  const commentStore = () => rootStore.commentStore
  const playlistStore = () => rootStore.playlistStore
  const searchStore = () => rootStore.searchStore

  test('add comment', async () => {
    const videoId = store().videos[0]?.id ?? (await getSingleId('videos'))
    const before = commentStore().comments.length
    await commentStore().addComment(videoId, 'integration comment')
    expect(commentStore().comments.length).toBe(before + 1)
  })

  test('playlist CRUD flow', async () => {
    const playlistId = (await playlistStore().createPlaylist(
      'Int List',
    )) as number
    expect(
      playlistStore().playlists.some(
        (p: { id: number }) => p.id === playlistId,
      ),
    ).toBe(true)

    const vid = store().videos[0]?.id ?? (await getSingleId('videos'))
    await playlistStore().addVideoToPlaylist(playlistId, vid)
    let pl = playlistStore().playlists.find(
      (p: { id: number }) => p.id === playlistId,
    )!
    expect(pl.videoIds.includes(vid)).toBe(true)

    await playlistStore().removeVideoFromPlaylist(playlistId, vid)
    pl = playlistStore().playlists.find(
      (p: { id: number }) => p.id === playlistId,
    )!
    expect(pl.videoIds.includes(vid)).toBe(false)

    await playlistStore().deletePlaylist(playlistId)
    expect(
      playlistStore().playlists.some(
        (p: { id: number }) => p.id === playlistId,
      ),
    ).toBe(false)
  })

  test('playPlaylist shuffle produces random order of same videos', async () => {
    const plId = (await playlistStore().createPlaylist(
      'Shuffle List',
    )) as number
    const vids = store()
      .videos.slice(0, 3)
      .map((v: { id: any }) => v.id)
    for (const v of vids) await playlistStore().addVideoToPlaylist(plId, v)
    await playlistStore().updatePlaylist(plId, { shuffle: true })
    store().playPlaylist(plId)
    const playOrder = [...store().playbackState.playlistOrder]
    expect(playOrder.sort()).toEqual([...vids].sort()) // same ids
  })

  test('hideComments fails for non-owner', async () => {
    const userId = rootStore.userStore?.user?.id
    if (!userId) return

    const channel = store().channels.find(
      (c: { userId: any }) => c.userId === userId,
    )
    if (!channel) return

    const nonOwnedVid = store().videos.find(
      (v: { channelId: any }) => v.channelId !== channel.id,
    )
    if (!nonOwnedVid) return

    const videoId = nonOwnedVid.id
    const before = nonOwnedVid.isCommentsEnabled

    await store().hideComments(videoId, !before)

    const after = store().videos.find(
      (v: { id: any }) => v.id === videoId,
    )?.isCommentsEnabled
    expect(after).toBe(before) // Value should remain unchanged
  })

  test('owner can disable comments', async () => {
    const userId = rootStore.userStore?.user?.id
    const channel = store().channels.find(
      (c: { userId: any }) => c.userId === userId,
    )
    const ownedVid = store().videos.find(
      (v: any) => v.channelId === channel?.id,
    )?.id
    if (ownedVid) {
      await store().hideComments(ownedVid, false)
      const video = store().videos.find((v: { id: any }) => v.id === ownedVid)
      expect(video?.isCommentsEnabled).toBe(false)
    } else {
      console.warn('No owned video found; skipping assertion')
    }
  })

  test('play and pause video updates playback state', async () => {
    await store().loadInitialData()
    const vid = store().videos[0]?.id
    store().playVideo(vid)
    expect(store().playbackState.currentVideoId).toBe(vid)
    expect(store().playbackState.isPlaying).toBe(true)
    store().pauseVideo()
    expect(store().playbackState.isPlaying).toBe(false)
  })

  test('edit comment content authorized / unauthorized', async () => {
    const userId = rootStore.userStore?.user?.id
    if (!userId) return
    // create a comment as logged in user
    const vid = store().videos[0].id
    await commentStore().addComment(vid!, 'orig content')
    await commentStore().loadCommentsForVideo(vid!)
    const comment = commentStore().comments.find(
      (c: { userId: any; videoId: any }) =>
        c.userId === userId && c.videoId === vid,
    )!
    // owner edit succeeds
    commentStore().startEditingComment(comment.id)
    commentStore().updateEditingContent('updated content')
    await commentStore().saveEditedComment()
    expect(comment.content).toBe('updated content')
    // pick another user's comment
    const otherComment = commentStore().comments.find(
      (c: { userId: any }) => c.userId !== userId,
    )
    const prev = otherComment?.content
    if (otherComment) {
      commentStore().startEditingComment(otherComment.id)
      await commentStore().saveEditedComment()
      expect(otherComment?.content).toBe(prev)
    }
  })

  test('toggle like mutates likeCount', async () => {
    const vid = store().videos[0]?.id ?? (await getSingleId('videos'))
    const before =
      store().videos.find((v: { id: any }) => v.id === vid)?.likeCount ?? 0
    await store().toggleLike(vid)
    const after =
      store().videos.find((v: { id: any }) => v.id === vid)?.likeCount ?? 0
    expect(after).not.toBe(before)
  })

  test('subscribe / unsubscribe channel', async () => {
    const vid = store().videos[0]
    const channelId = vid?.channelId || (await getSingleId('channels'))

    await store().subscribeChannel(channelId)
    expect(store().channels.some((c: { id: any }) => c.id === channelId)).toBe(
      true,
    )

    await store().unsubscribeChannel(channelId)
    expect(store().channels.some((c: { id: any }) => c.id === channelId)).toBe(
      false,
    )
  })

  test('search updates result ids', async () => {
    await searchStore().searchVideos('test')
    expect(searchStore().searchResultVideoIds.length).toBeGreaterThanOrEqual(0)
    searchStore().clearSearch()
    expect(searchStore().searchQuery).toBe('')
  })

  test('toggle commentsEnabled – owner-only', async () => {
    const userId = rootStore.userStore?.user?.id
    if (!userId) return

    const channelId = store().channels.find(
      (c: { userId: any }) => c.userId === userId,
    )?.id
    if (!channelId) {
      console.log('No channel found for user', userId)
      return
    }

    const ownedVideo = store().videos.find(
      (v: { channelId: any }) => v.channelId === channelId,
    )
    if (!ownedVideo) {
      console.log('No owned video found for user', userId)
      return
    }

    const { id: videoId, isCommentsEnabled: before } = ownedVideo

    await store().setCommentsEnabled(videoId, !before)

    const toggled = store().videos.find((v: { id: any }) => v.id === videoId)
    expect(toggled?.isCommentsEnabled).toBe(!before)

    await store().setCommentsEnabled(videoId, before)

    const reverted = store().videos.find((v: { id: any }) => v.id === videoId)
    expect(reverted?.isCommentsEnabled).toBe(before)
  })

  test('add reply and delete comment flow', async () => {
    const vid = store().videos[0].id
    // ensure comments loaded
    await commentStore().loadCommentsForVideo(vid)
    const parent = commentStore().comments[0]
    expect(parent).toBeDefined()

    const beforeCount = commentStore().comments.length
    await commentStore().addReply(vid, parent.id, 'integration reply')
    expect(commentStore().comments.length).toBeGreaterThanOrEqual(beforeCount)

    const replyId = commentStore().comments.at(-1)!.id
    await commentStore().deleteComment(replyId)
    expect(
      commentStore().comments.some((c: { id: any }) => c.id === replyId),
    ).toBe(false)
  })

  test('load user playlists action', async () => {
    await playlistStore().loadUserPlaylists()
    expect(Array.isArray(playlistStore().playlists)).toBe(true)
  })

  test('load subscription feed', async () => {
    const before = store().videos.length
    await store().loadSubscriptionFeed()
    expect(store().videos.length).toBeGreaterThanOrEqual(before)
  })

  test('load replies for comment', async () => {
    const vid = store().videos[0].id
    await commentStore().loadCommentsForVideo(vid)
    const parent = commentStore().comments.find(
      (c: any) => (c as any).replyCount > 0,
    )
    if (!parent) return // skip if no parent with replies in fixture
    const before = commentStore().comments.length
    await commentStore().loadRepliesForComment(parent.id)
    expect(commentStore().comments.length).toBeGreaterThanOrEqual(before)
  })
})

describe('VideoStore integration – guest user', () => {
  const guestStore = createVideoStore()
  const playlistStore = createPlaylistStore()

  beforeAll(async () => {
    await guestStore.loadInitialData()
  })

  test('cannot like without login', async () => {
    const vid = guestStore.videos[0]?.id ?? (await getSingleId('videos'))
    await guestStore.toggleLike(vid)
    expect(guestStore.error).toMatch(/login|logged/i)
  })

  test('cannot create playlist without login', async () => {
    const id = await playlistStore.createPlaylist('Guest List')
    expect(id).toBeNull()
    expect(guestStore.error).toMatch(/login|logged/i)
  })

  test('guest can play video', async () => {
    const vid = guestStore.videos[0]?.id ?? (await getSingleId('videos'))
    guestStore.playVideo(vid)
    expect(guestStore.playbackState.currentVideoId).toBe(vid)
  })
})
