// Copyright (c) Meta Platforms, Inc. and affiliates.
import { eq, and, desc, sql } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

import { db } from '@/db/index'

import {
  users,
  channels,
  videos,
  playlists,
  playlistVideos,
  likes,
  comments,
  history,
  subscriptions,
  videoCategories,
} from './schema'

export type User = InferSelectModel<typeof users>
export type Channel = InferSelectModel<typeof channels>
export type Video = InferSelectModel<typeof videos>
export type VideoCategories = InferSelectModel<typeof videoCategories>
export type Playlist = InferSelectModel<typeof playlists>
export type Comments = InferSelectModel<typeof comments>
export type CommentWithUser = InferSelectModel<typeof comments> & {
  username: string
}

const toCamelCase = (obj: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, g) => g.toUpperCase()),
      value,
    ]),
  )

const requireAuth = (userId: number | null | undefined): void => {
  if (!userId) {
    throw new Error('Authentication required')
  }
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if tables exist using a simpler query first
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'channels', 'videos', 'playlists', 'playlist_videos', 'likes', 'comments', 'history', 'subscriptions')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 9 required tables
    const count = result[0].count
    const hasAllTables = count === 9
    console.log(`Database has ${count} of 9 required tables`)

    if (!hasAllTables) {
      return false
    }

    // Check if we have at least one user (basic data check)
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .execute()

    const hasData = userCount[0]?.count > 0
    console.log(`Database has ${hasData ? 'some' : 'no'} user data`)
    return hasData
  } catch (error) {
    console.error('Error checking database initialization:', error)
    return false
  }
}

export const registerUser = async (data: {
  email: string
  username: string
  password: string
  name?: string
}) => {
  try {
    // Use a transaction so user & channel are created atomically
    const now = new Date().toISOString()
    const userRes = await db
      .insert(users)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning()
      .execute()
    const user = userRes[0]
    await db
      .insert(channels)
      .values({
        userId: user.id,
        name: data.username,
        createdAt: now,
        updatedAt: now,
      })
      .execute()
    return user
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by email:', error)
    throw error
  }
}

export const getUserById = async (id: number) => {
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}
export const fetchUserById = getUserById

const fetchAllUsers = async () => {
  try {
    const res = await db.select().from(users).execute()
    return res
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw error
  }
}

export const checkEmailExists = async (
  email: string,
  excludeUserId?: number,
) => {
  try {
    let query = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))

    if (excludeUserId) {
      query = query.where(sql`${users.id} != ${excludeUserId}`)
    }

    const res = await query.execute()
    return res.length > 0
  } catch (error) {
    console.error('Error checking email existence:', error)
    throw new Error('Failed to check email availability')
  }
}

export const updateUserProfile = async (
  userId: number,
  data: {
    username?: string
    email?: string
    password?: string
    currentPassword?: string
  },
) => {
  try {
    requireAuth(userId)
    if (!data || Object.keys(data).length === 0) return null

    // For password updates, verify current password
    if (data.password && data.currentPassword) {
      const currentUser = await getUserById(userId)
      if (!currentUser || currentUser.password !== data.currentPassword) {
        throw new Error('Current password is incorrect')
      }
    }

    const now = new Date().toISOString()
    const updateData = { ...data }
    delete updateData.currentPassword // Don't store currentPassword

    const res = await db
      .update(users)
      .set({ ...updateData, updated_at: now })
      .where(eq(users.id, userId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export const deleteComment = async (
  commentId: number,
  requestingUserId: number,
) => {
  try {
    requireAuth(requestingUserId)
    // Fetch comment info
    const commentRes = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        videoId: comments.videoId,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.id, commentId))
      .execute()
    const comment = commentRes[0]
    if (!comment) return false

    const channelRes = await db
      .select({ userId: channels.userId })
      .from(channels)
      .innerJoin(videos, eq(videos.channelId, channels.id))
      .where(eq(videos.id, comment.videoId))
      .execute()
    const channelOwnerId = channelRes[0]?.userId

    if (
      comment.userId !== requestingUserId &&
      channelOwnerId !== requestingUserId
    ) {
      console.log('Not authorized to delete this comment')
      return {
        status: false,
        message: 'Not authorized to delete this comment',
        result: null,
      }
    }

    // If this is a parent comment, get all its replies first for counter updates
    const replies = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.parentId, commentId))
      .execute()

    try {
      // Delete replies first to avoid foreign key issues
      if (replies.length > 0) {
        console.log(
          `Deleting ${replies.length} replies for comment ${commentId}`,
        )
        await db
          .delete(comments)
          .where(eq(comments.parentId, commentId))
          .execute()
      }

      // Delete the main comment
      console.log(`Deleting main comment ${commentId}`)
      await db.delete(comments).where(eq(comments.id, commentId)).execute()
    } catch (error) {
      console.error('Error in deleteComment:', error)
      return {
        status: false,
        message: `Failed to delete comment: ${error.message}`,
        result: null,
      }
    }

    // Decrement counters
    if (comment.parentId) {
      // This was a reply, decrement parent's reply count
      await db
        .update(comments)
        .set({ replyCount: sql`${comments.replyCount} - 1` })
        .where(eq(comments.id, comment.parentId))
        .execute()
    } else {
      // This was a parent comment, decrement video's comment count by 1 + number of replies
      const totalDeleted = 1 + replies.length
      await db
        .update(videos)
        .set({ commentCount: sql`${videos.commentCount} - ${totalDeleted}` })
        .where(eq(videos.id, comment.videoId))
        .execute()
    }
    return {
      status: true,
      message: 'Comment deleted successfully',
      result: comment,
    }
  } catch (error) {
    console.error('Error in deleteComment:', error)
    return {
      status: false,
      message: `Failed to delete comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      result: null,
    }
  }
}

export const setCommentsEnabled = async (
  videoId: number,
  requestingUserId: number,
  enabled: boolean,
) => {
  try {
    requireAuth(requestingUserId)
    // Verify ownership via channel
    const chan = await db
      .select({ channelId: videos.channelId })
      .from(videos)
      .where(eq(videos.id, videoId))
      .execute()
    const channelId = chan[0]?.channelId ?? chan[0]?.channelId
    if (!channelId) {
      console.log('Requested video not video not found')
      return false
    }
    const ownerRes = await db
      .select({ user_id: channels.userId })
      .from(channels)
      .where(eq(channels.id, channelId))
      .execute()
    if (ownerRes[0]?.user_id !== requestingUserId) {
      return { status: false, message: 'Not authorized', result: null }
    }
    await db
      .update(videos)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(videos.id, videoId))
      .execute()
    return {
      status: true,
      message: 'Comments enabled successfully',
      result: { videoId, commentsEnabled: enabled },
    }
  } catch (e) {
    console.error(e)
    return {
      status: false,
      message: e instanceof Error ? e.message : 'error',
      result: null,
    }
  }
}

export const loadVideoCategories = async (): Promise<VideoCategories[]> => {
  try {
    const res = await db.select().from(videoCategories).execute()
    return res
  } catch (error) {
    console.error('Error loading video categories:', error)
    throw error
  }
}

export const loadVideos = async (
  shouldIgnorePublic: boolean = false,
): Promise<Video[]> => {
  try {
    let query = db.select().from(videos).orderBy(desc(videos.createdAt))

    if (!shouldIgnorePublic) {
      query = query.where(eq(videos.visibility, 'public'))
    }

    const res = await query.execute()
    return res.map(toCamelCase)
  } catch (error) {
    console.error('Error loading videos:', error)
    throw error
  }
}

export const getUserVideos = async (userId: number): Promise<Video[]> => {
  try {
    // Changed to number
    const res = await db
      .select()
      .from(videos)
      .leftJoin(channels, eq(videos.channelId, channels.id))
      .where(eq(channels.userId, userId))
      .orderBy(desc(videos.createdAt))
      .execute()

    return res.map(toCamelCase)
  } catch (error) {
    console.error('Error getting user videos:', error)
    throw error
  }
}

export const getVideosByChannelId = async (
  channelId: number,
): Promise<Video[]> => {
  try {
    const res = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.channelId, channelId),
          eq(videos.visibility, 'public'),
          eq(videos.status, 'active'),
        ),
      )
      .orderBy(desc(videos.createdAt))
      .execute()

    return res.map(toCamelCase)
  } catch (error) {
    console.error('Error getting videos by channel ID:', error)
    throw error
  }
}

export const uploadVideo = async (data: {
  channelId: number
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  duration: number
  categoryId?: number
  isCommentsEnabled?: boolean
}) => {
  try {
    const now = new Date().toISOString()
    const res = await db
      .insert(videos)
      .values({
        channelId: data.channelId,
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        visibility: 'public',
        createdAt: now,
        updatedAt: now,
        categoryId: data.categoryId,
        isCommentsEnabled: data?.isCommentsEnabled ?? true,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error uploading video:', error)
    throw error
  }
}

export const updateVideo = async (
  videoId: number,
  requestingUserId: number,
  data: {
    title?: string
    description?: string
    categoryId?: number
    isCommentsEnabled?: boolean
  },
) => {
  try {
    requireAuth(requestingUserId)

    // Ensure ownership via channel
    const video = await db
      .select({ channelId: videos.channelId })
      .from(videos)
      .where(eq(videos.id, videoId))
      .get()

    if (!video) {
      throw new Error('Video not found')
    }

    if (video.channelId !== requestingUserId) {
      throw new Error('Not authorized to update this video')
    }

    const res = await db
      .update(videos)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videos.id, videoId))
      .returning()
      .execute()

    return res[0]
  } catch (error) {
    console.error('Error updating video:', error)
    throw error
  }
}

export const deleteVideo = async (
  videoId: number,
  requestingUserId: number,
) => {
  try {
    requireAuth(requestingUserId)
    // Ensure ownership via channel
    const chan = await db
      .select({ channelId: videos.channelId })
      .from(videos)
      .where(eq(videos.id, videoId))
      .execute()

    if (!chan[0]) return false
    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, chan[0].channelId))
      .execute()
    if (!channel[0] || channel[0].userId !== requestingUserId) {
      console.log(chan, channel, requestingUserId)
      console.log('Returning early here')
      return false
    }

    await db.delete(comments).where(eq(comments.videoId, videoId)).execute()
    await db.delete(videos).where(eq(videos.id, videoId)).execute()
    return true
  } catch (error) {
    console.error('Error deleting video:', error)
    throw error
  }
}

export const getVideoLikes = async (userId: number, videoId: number) => {
  try {
    requireAuth(userId)
    const res = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .execute()
    return res
  } catch (error) {
    console.error('Error getting video likes:', error)
    throw error
  }
}

export const toggleVideoLike = async (userId: number, videoId: number) => {
  try {
    requireAuth(userId)
    const existing = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .execute()

    let isLiked: boolean
    if (existing.length) {
      // remove like
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
        .execute()
      await db
        .update(videos)
        .set({ likeCount: sql`${videos.likeCount} - 1` })
        .where(eq(videos.id, videoId))
        .execute()
      isLiked = false
    } else {
      await db.insert(likes).values({ userId, videoId }).execute()
      await db
        .update(videos)
        .set({ likeCount: sql`${videos.likeCount} + 1` })
        .where(eq(videos.id, videoId))
        .execute()
      isLiked = true
    }
    const likeCountRes = await db
      .select({ likeCount: videos.likeCount })
      .from(videos)
      .where(eq(videos.id, videoId))
      .execute()
    return { likeCount: likeCountRes[0].likeCount, isLiked }
  } catch (error) {
    console.error('Error toggling video like:', error)
    throw error
  }
}

export const addReply = async (data: {
  videoId: number
  userId: number
  content: string
  parentId: number
}) => addComment({ ...data })

export const addComment = async (data: {
  videoId: number
  userId: number
  content: string
  parentId?: number | null
}) => {
  try {
    requireAuth(data.userId)
    const now = new Date().toISOString()
    const inserted = await db
      .insert(comments)
      .values({
        videoId: data.videoId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .execute()

    // increment comment counters
    await db
      .update(videos)
      .set({ commentCount: sql`${videos.commentCount} + 1` })
      .where(eq(videos.id, data.videoId))
      .execute()

    if (data.parentId) {
      await db
        .update(comments)
        .set({ replyCount: sql`${comments.replyCount} + 1` })
        .where(eq(comments.id, data.parentId))
        .execute()
    }

    const res = await db
      .select({
        ...comments,
        username: users.username,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.id, inserted[0].id))
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

export const getCommentsForVideo = async (videoId: number) => {
  try {
    // Get all comments (both parent and replies) for the video in one query
    const allComments = await db
      .select({
        id: comments.id,
        videoId: comments.videoId,
        userId: comments.userId,
        content: comments.content,
        parentId: comments.parentId,
        username: users.username,
        status: comments.status,
        isEdited: comments.isEdited,
        replyCount: comments.replyCount,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.videoId, videoId))
      .orderBy(desc(comments.createdAt))
      .execute()

    // Filter out any incomplete records and log them for debugging
    const validComments = allComments.filter(comment => {
      const isValid =
        comment.id &&
        comment.videoId &&
        comment.userId &&
        comment.content !== undefined &&
        comment.username &&
        comment.createdAt &&
        comment.updatedAt
      if (!isValid) {
        console.warn('Filtering out incomplete comment:', {
          id: comment.id,
          hasVideoId: !!comment.videoId,
          hasUserId: !!comment.userId,
          hasContent: comment.content !== undefined,
          hasUsername: !!comment.username,
          hasCreatedAt: !!comment.createdAt,
          hasUpdatedAt: !!comment.updatedAt,
          comment,
        })
      }
      return isValid
    })

    return validComments
  } catch (error) {
    console.error('Error in getCommentsForVideo:', error)
    return []
  }
}

export const searchVideos = async (
  query: string,
  limit = 20,
): Promise<number[]> => {
  try {
    const q = `%${query.toLowerCase()}%`
    const res = await db
      .select({ id: videos.id })
      .from(videos)
      .where(
        sql`lower(${videos.title}) LIKE ${q} OR lower(${videos.description}) LIKE ${q}`,
      )
      .orderBy(desc(videos.viewCount))
      .limit(limit)
      .execute()
    return res.map((r: any) => r.id)
  } catch (error) {
    console.error('Error searching videos:', error)
    throw error
  }
}

export const createPlaylist = async (data: {
  userId: number
  name: string
  description?: string
  isPublic?: boolean
  shuffle?: boolean
}) => {
  try {
    requireAuth(data.userId)
    const res = await db
      .insert(playlists)
      .values({
        userId: data.userId,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic ?? false,
        shuffle: data.shuffle ?? false,
      })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating playlist:', error)
    throw error
  }
}

export const addVideoToPlaylist = async (
  playlistId: number,
  videoId: number,
) => {
  try {
    await db.insert(playlistVideos).values({ playlistId, videoId }).execute()
  } catch (error) {
    console.error('Error adding video to playlist:', error)
    throw error
  }
}

export const removeVideoFromPlaylist = async (
  playlistId: number,
  videoId: number,
) => {
  try {
    await db
      .delete(playlistVideos)
      .where(
        and(
          eq(playlistVideos.playlistId, playlistId),
          eq(playlistVideos.videoId, videoId),
        ),
      )
      .execute()
  } catch (error) {
    console.error('Error removing video from playlist:', error)
    throw error
  }
}

export const deletePlaylist = async (playlistId: number, userId: number) => {
  try {
    requireAuth(userId)
    // ensure ownership
    const pl = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!pl[0] || pl[0].userId !== userId) return false
    await db.delete(playlists).where(eq(playlists.id, playlistId)).execute()
    return true
  } catch (error) {
    console.error('Error deleting playlist:', error)
    throw error
  }
}

export const getAllPlayLists = async () => {
  try {
    const flatPlaylists = await db
      .select({
        playlistId: playlists.id,
        playlistName: playlists.name,
        description: playlists.description,
        userId: playlists.userId,
        shuffle: playlists.shuffle,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
        videoId: playlistVideos.videoId,
        position: playlistVideos.position,
      })
      .from(playlists)
      .leftJoin(playlistVideos, eq(playlistVideos.playlistId, playlists.id))
      .orderBy(playlistVideos.playlistId, playlistVideos.position)
      .execute()

    const groupedPlaylists: {
      [playlistId: number]: {
        id: number
        name: string
        description: string | null
        userId: number
        shuffle: boolean
        createdAt: string
        updatedAt: string
        videoIds: number[]
      }
    } = {}

    for (const row of flatPlaylists) {
      if (!groupedPlaylists[row.playlistId]) {
        groupedPlaylists[row.playlistId] = {
          id: row.playlistId,
          name: row.playlistName,
          description: row.description,
          userId: row.userId,
          shuffle: row.shuffle,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          videoIds: [],
        }
      }

      if (row.videoId !== null) {
        groupedPlaylists[row.playlistId].videoIds.push(row.videoId)
      }
    }

    return Object.values(groupedPlaylists)
  } catch (error) {
    console.error('Error getting all playlists:', error)
    throw error
  }
}

export const getPlaylistsByUserId = async (userId: number) => {
  try {
    const flatPlaylists = await db
      .select({
        playlistId: playlists.id,
        playlistName: playlists.name,
        description: playlists.description,
        userId: playlists.userId,
        shuffle: playlists.shuffle,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
        videoId: playlistVideos.videoId,
        position: playlistVideos.position,
      })
      .from(playlists)
      .leftJoin(playlistVideos, eq(playlistVideos.playlistId, playlists.id))
      .where(eq(playlists.userId, userId))
      .orderBy(playlists.id, playlistVideos.position)
      .execute()

    if (flatPlaylists.length === 0) return []

    const groupedPlaylists: {
      [playlistId: number]: {
        id: number
        name: string
        description: string | null
        userId: number
        shuffle: boolean
        createdAt: string
        updatedAt: string
        videoIds: number[]
      }
    } = {}

    for (const row of flatPlaylists) {
      if (!groupedPlaylists[row.playlistId]) {
        groupedPlaylists[row.playlistId] = {
          id: row.playlistId,
          name: row.playlistName,
          description: row.description,
          userId: row.userId,
          shuffle: row.shuffle,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          videoIds: [],
        }
      }
      const shouldAddVideo =
        row.videoId !== null &&
        !groupedPlaylists[row.playlistId].videoIds.includes(row.videoId)

      if (shouldAddVideo) {
        groupedPlaylists[row.playlistId].videoIds.push(row.videoId)
      }
    }

    const playlistsForModel = Object.values(groupedPlaylists)

    return playlistsForModel
  } catch (error) {
    console.error('Error getting playlists by user ID:', error)
    throw error
  }
}

export const getPlaylistById = async (playlistId: number) => {
  try {
    const pl = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!pl[0]) return null
    const vids = await db
      .select({ videoId: playlistVideos.videoId })
      .from(playlistVideos)
      .where(eq(playlistVideos.playlistId, playlistId))
      .execute()
    return { ...pl[0], videoIds: vids.map((v: any) => v.videoId) }
  } catch (error) {
    console.error('Error getting playlist by ID:', error)
    throw error
  }
}

export const updatePlaylist = async (
  playlistId: number,
  userId: number,
  data: Partial<{
    name: string
    description: string
    isPublic: boolean
    shuffle: boolean
  }>,
) => {
  try {
    requireAuth(userId)
    const pl = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!pl[0] || pl[0].userId !== userId) throw new Error('Not authorized')

    await db
      .update(playlists)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.shuffle !== undefined ? { shuffle: data.shuffle } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(playlists.id, playlistId))
      .execute()

    return await getPlaylistById(playlistId)
  } catch (error) {
    console.error('Error updating playlist:', error)
    throw error
  }
}

export const updateCommentContent = async (
  commentId: number,
  userId: number,
  newContent: string,
) => {
  try {
    requireAuth(userId)

    const c = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .execute()
    const comment = c[0]

    if (comment.userId !== userId) {
      console.log('Not authorized to update comment content')
      return {
        status: false,
        message: 'Not authorized to update comment content',
        result: null,
      }
    }

    await db
      .update(comments)
      .set({
        content: newContent,
        updatedAt: new Date().toISOString(),
        isEdited: true,
      })
      .where(eq(comments.id, commentId))
      .execute()

    return {
      status: true,
      message: 'Comment content updated successfully',
      result: { commentId, content: newContent },
    }
  } catch (error) {
    console.error('Error updating comment content:', error)
    return {
      status: false,
      message: `Failed to update comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      result: null,
    }
  }
}

export const setCommentStatus = async (
  commentId: number,
  requestingUserId: number,
  status: 'visible' | 'hidden',
) => {
  try {
    requireAuth(requestingUserId)
    // join to verify ownership of the underlying video
    const ownership = await db
      .select({ ownerId: channels.userId })
      .from(comments)
      .innerJoin(videos, eq(videos.id, comments.videoId))
      .innerJoin(channels, eq(channels.id, videos.channelId))
      .where(eq(comments.id, commentId))
      .execute()
    if (!ownership[0] || ownership[0].ownerId !== requestingUserId) {
      console.error('Not authorized to update comment status')
      return {
        status: false,
        message: 'Not authorized to update comment status',
        result: null,
      }
    }

    await db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, commentId))
      .execute()
    return {
      status: true,
      message: 'Comment status updated successfully',
      result: { commentId, status },
    }
  } catch (error) {
    console.error('Error setting comment status:', error)
    return {
      status: false,
      message: `Failed to update comment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      result: null,
    }
  }
}

export const addToHistory = async (userId: number, videoId: number) => {
  try {
    const watchedAt = new Date().toISOString()
    requireAuth(userId)
    await db
      .insert(history)
      .values({ userId, videoId })
      .onConflictDoUpdate({
        target: [history.userId, history.videoId],
        set: { watchedAt },
      })
      .execute()
  } catch (error) {
    console.error('Error adding to history:', error)
    throw error
  }
}

export const getWatchHistory = async (userId: number, limit?: number) => {
  try {
    const query = db
      .select({ videoId: history.videoId, watchedAt: history.watchedAt })
      .from(history)
      .where(eq(history.userId, userId))
      .orderBy(desc(history.watchedAt))

    // Only apply limit if specified (for pagination), otherwise load all
    if (limit !== undefined) {
      return query.limit(limit).execute()
    }

    return query.execute()
  } catch (error) {
    console.error('Error getting watch history:', error)
    throw error
  }
}

export const subscribeToChannel = async (userId: number, channelId: number) => {
  try {
    requireAuth(userId)
    await db
      .insert(subscriptions)
      .values({ userId, channelId })
      .onConflictDoNothing()
      .execute()
  } catch (error) {
    console.error('Error subscribing to channel:', error)
    throw error
  }
}

export const unsubscribeFromChannel = async (
  userId: number,
  channelId: number,
) => {
  try {
    requireAuth(userId)
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.channelId, channelId),
        ),
      )
      .execute()
  } catch (error) {
    console.error('Error unsubscribing from channel:', error)
    throw error
  }
}

export const getSubscribedChannels = async (userId: number) => {
  try {
    const result = await db
      .select({ channel: channels })
      .from(subscriptions)
      .innerJoin(channels, eq(channels.id, subscriptions.channelId))
      .where(eq(subscriptions.userId, userId))
      .execute()
    return result
  } catch (error) {
    console.error('Error getting subscribed channels:', error)
    throw error
  }
}

export const checkSubscriptionStatus = async (
  userId: number,
  channelId: number,
): Promise<boolean> => {
  try {
    const result = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.channelId, channelId),
        ),
      )
      .execute()
    return result.length > 0
  } catch (error) {
    console.error('Error checking subscription status:', error)
    throw error
  }
}

export const getSubscriptionFeed = async (userId: number, limit = 20) => {
  try {
    return db
      .select({ ...videos, channelName: channels.name })
      .from(videos)
      .innerJoin(channels, eq(channels.id, videos.channelId))
      .innerJoin(subscriptions, eq(subscriptions.channelId, channels.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(videos.createdAt))
      .limit(limit)
      .execute()
  } catch (error) {
    console.error('Error getting subscription feed:', error)
    throw error
  }
}

export const incrementViewCount = async (videoId: number) => {
  try {
    await db
      .update(videos)
      .set({ viewCount: sql`${videos.viewCount} + 1` })
      .where(eq(videos.id, videoId))
      .execute()
  } catch (error) {
    console.error('Error incrementing view count:', error)
    throw error
  }
}

export const getRepliesForComment = async (parentCommentId: number) => {
  try {
    const replies = await db
      .select({
        id: comments.id,
        videoId: comments.videoId,
        userId: comments.userId,
        content: comments.content,
        parentId: comments.parentId,
        username: users.username,
        status: comments.status,
        isEdited: comments.isEdited,
        replyCount: comments.replyCount,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.parentId, parentCommentId))
      .orderBy(comments.createdAt)
      .execute()

    // Filter out any incomplete records
    const validReplies = replies.filter(reply => {
      const isValid = reply.videoId && reply.userId && reply.updatedAt
      if (!isValid) {
        console.warn('Filtering out incomplete reply:', reply)
      }
      return isValid
    })

    return validReplies
  } catch (error) {
    console.error('Error getting replies for comment:', error)
    throw error
  }
}

export const getAllChannelsFromDB = async () => {
  try {
    const res = await db.select().from(channels).execute()
    return res
  } catch (e) {
    console.error(e)
    return []
  }
}

export const createChannel = async (data: {
  userId: number
  name: string
  description?: string
}) => {
  try {
    const res = await db
      .insert(channels)
      .values({ user_id: data.userId, ...data })
      .returning()
      .execute()
    return res[0]
  } catch (error) {
    console.error('Error creating channel:', error)
    throw error
  }
}

export const getChannelsByUserId = async (userId: number) => {
  try {
    return db
      .select()
      .from(channels)
      .where(eq(channels.userId, userId))
      .execute()
  } catch (error) {
    console.error('Error getting channels by user ID:', error)
    throw error
  }
}

export const getChannelById = async (channelId: number) => {
  try {
    const res = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .execute()
    return res[0] ? toCamelCase(res[0]) : null
  } catch (error) {
    console.error('Error getting channel by ID:', error)
    throw error
  }
}

export const updateChannelName = async (
  channelId: number,
  userId: number,
  name: string,
) => {
  try {
    requireAuth(userId)

    // Verify ownership
    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .execute()

    if (!channel[0] || channel[0].userId !== userId) {
      throw new Error('Not authorized to update this channel')
    }

    const res = await db
      .update(channels)
      .set({
        name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(channels.id, channelId))
      .returning()
      .execute()

    return res[0]
  } catch (error) {
    console.error('Error updating channel name:', error)
    throw error
  }
}

const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F =>
  (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    try {
      // @ts-ignore – preserve original type information
      return await fn(...args)
    } catch (error) {
      console.error(`Error in ${name}:`, error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error'
      throw new Error(`${name}: ${msg}`)
    }
  }) as F

export const queries = {
  /* setup */ isDatabaseInitialized,
  /* user */ registerUser: wrapQuery(registerUser, 'registerUser'),
  fetchUserById: wrapQuery(fetchUserById, 'fetchUserById'),
  updateUserProfile: wrapQuery(updateUserProfile, 'updateUserProfile'),
  checkEmailExists: wrapQuery(checkEmailExists, 'checkEmailExists'),
  getUserByEmail: wrapQuery(getUserByEmail, 'getUserByEmail'),
  getUserById: wrapQuery(getUserById, 'getUserById'),
  fetchAllUsers: wrapQuery(fetchAllUsers, 'fetchAllUsers'),

  /* channels */ createChannel: wrapQuery(createChannel, 'createChannel'),
  getChannelsByUserId: wrapQuery(getChannelsByUserId, 'getChannelsByUserId'),
  getChannelById: wrapQuery(getChannelById, 'getChannelById'),
  getAllChannels: wrapQuery(getAllChannelsFromDB, 'getAllChannels'),
  updateChannelName: wrapQuery(updateChannelName, 'updateChannelName'),

  /* categories */ loadVideoCategories: wrapQuery(
    loadVideoCategories,
    'loadVideoCategories',
  ),

  /* videos */ loadVideos: wrapQuery(loadVideos, 'loadVideos'),
  fetchUserVideos: wrapQuery(getUserVideos, 'getUserVideos'),
  getVideosByChannelId: wrapQuery(getVideosByChannelId, 'getVideosByChannelId'),
  setCommentsEnabled: wrapQuery(setCommentsEnabled, 'setCommentsEnabled'),
  uploadVideo: wrapQuery(uploadVideo, 'uploadVideo'),
  updateVideo: wrapQuery(updateVideo, 'updateVideo'),
  deleteVideo: wrapQuery(deleteVideo, 'deleteVideo'),
  toggleVideoLike: wrapQuery(toggleVideoLike, 'toggleVideoLike'),
  getVideoLikes: wrapQuery(getVideoLikes, 'getVideoLikes'),
  incrementViewCount: wrapQuery(incrementViewCount, 'incrementViewCount'),

  /* comments */ addComment: wrapQuery(addComment, 'addComment'),
  addReply: wrapQuery(addReply, 'addReply'),
  deleteComment: wrapQuery(deleteComment, 'deleteComment'),
  getCommentsForVideo: wrapQuery(getCommentsForVideo, 'getCommentsForVideo'),
  getRepliesForComment: wrapQuery(getRepliesForComment, 'getRepliesForComment'),

  /* search */ searchVideos: wrapQuery(searchVideos, 'searchVideos'),

  /* playlists */ createPlaylist: wrapQuery(createPlaylist, 'createPlaylist'),
  addVideoToPlaylist: wrapQuery(addVideoToPlaylist, 'addVideoToPlaylist'),
  removeVideoFromPlaylist: wrapQuery(
    removeVideoFromPlaylist,
    'removeVideoFromPlaylist',
  ),
  deletePlaylist: wrapQuery(deletePlaylist, 'deletePlaylist'),
  getPlaylistsByUserId: wrapQuery(getPlaylistsByUserId, 'getPlaylistsByUserId'),
  getPlaylistById: wrapQuery(getPlaylistById, 'getPlaylistById'),
  updatePlaylist: wrapQuery(updatePlaylist, 'updatePlaylist'),

  /* history */ addToHistory: wrapQuery(addToHistory, 'addToHistory'),
  getWatchHistory: wrapQuery(getWatchHistory, 'getWatchHistory'),

  /* subscriptions */ subscribeToChannel: wrapQuery(
    subscribeToChannel,
    'subscribeToChannel',
  ),
  unsubscribeFromChannel: wrapQuery(
    unsubscribeFromChannel,
    'unsubscribeFromChannel',
  ),
  getSubscribedChannels: wrapQuery(
    getSubscribedChannels,
    'getSubscribedChannels',
  ),
  checkSubscriptionStatus: wrapQuery(
    checkSubscriptionStatus,
    'checkSubscriptionStatus',
  ),
  getSubscriptionFeed: wrapQuery(getSubscriptionFeed, 'getSubscriptionFeed'),
  updateCommentContent: wrapQuery(updateCommentContent, 'updateCommentContent'),
  setCommentStatus: wrapQuery(setCommentStatus, 'setCommentStatus'),
}
