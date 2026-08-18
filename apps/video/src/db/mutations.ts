import { sql, and, eq } from 'drizzle-orm'
import {
  users,
  channels,
  videoCategories,
  videoTags,
  videos,
  playlists,
  playlistVideos,
  comments,
  commentReports,
  likes,
  subscriptions,
  history,
  videoTagMap,
  videoReports,
} from './schema'
import categoriesStaticMock from '../data/mock-video_categories.json'
import channelsStaticMock from '../data/mock-channels.json'
import commentsStaticMock from '../data/mock-comments.json'
import playlistsStaticMock from '../data/mock-playlists.json'
import usersStaticMock from '../data/mock-users.json'
import videosStaticMock from '../data/mock-videos.json'

import { db } from './index'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

const bundledMocks = {
  'mock-users.json': usersStaticMock,
  'mock-channels.json': channelsStaticMock,
  'mock-videos.json': videosStaticMock,
  'mock-playlists.json': playlistsStaticMock,
  'mock-comments.json': commentsStaticMock,
  'mock-video_categories.json': categoriesStaticMock,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

// async function readJSONFile(filename: string) {
//   try {
//     const baseDir = Platform.select({
//       android: `${RNFS.ExternalDirectoryPath}/mockdata`,
//       ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
//       default: '',
//     })
//     const filePath = `${baseDir}/${filename}`
//     const exists = await RNFS.exists(filePath)
//     if (exists) {
//       console.log(`Reading ${filename} from storage`)
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       console.log(`File ${filename} not found in storage, using bundled data`)
//       switch (filename) {
//         case 'users.json':
//           return usersStaticMock
//         case 'channels.json':
//           return channelsStaticMock
//         case 'videos.json':
//           return videosStaticMock
//         case 'playlists.json':
//           return playlistsStaticMock
//         case 'comments.json':
//           return commentsStaticMock
//         case 'categories_tags.json':
//           return categoriesStaticMock
//         default:
//           console.error(`Unknown mock data file: ${filename}`)
//           return null
//       }
//     }
//   } catch (err) {
//     console.error(`Failed to load ${filename}:`, err)
//     return null
//   }
// }

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      const [
        userCount,
        channelCount,
        videoCount,
        playlistCount,
        commentCount,
        categoryCount,
        tagCount,
      ] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(channels)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(videos)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(playlists)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(comments)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(videoCategories)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(videoTags)
          .execute(),
      ])

      if (
        userCount[0]?.count > 0 &&
        channelCount[0]?.count > 0 &&
        videoCount[0]?.count > 0 &&
        playlistCount[0]?.count > 0 &&
        commentCount[0]?.count > 0 &&
        categoryCount[0]?.count > 0 &&
        tagCount[0]?.count > 0
      ) {
        console.log('Database already initialized with data')
        return { success: true, skipped: true }
      }

      const clearTables = [
        'DELETE FROM video_tag_map',
        'DELETE FROM video_tags',
        'DELETE FROM video_reports',
        'DELETE FROM comment_reports',
        'DELETE FROM comments',
        'DELETE FROM likes',
        'DELETE FROM subscriptions',
        'DELETE FROM history',
        'DELETE FROM playlist_videos',
        'DELETE FROM videos',
        'DELETE FROM video_categories',
        'DELETE FROM users',
        'DELETE FROM sqlite_sequence',
      ]
      for (const query of clearTables) {
        await db.run(sql.raw(query))
      }

      const [
        usersData,
        categoriesData,
        videosData,
        commentsData,
        playlistsData,
        channelsData,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-video_categories.json'),
        readJSONFile('mock-videos.json'),
        readJSONFile('mock-comments.json'),
        readJSONFile('mock-playlists.json'),
        readJSONFile('mock-channels.json'),
      ])

      console.log('Loading users...')
      await db
        .insert(users)
        .values(usersData.map((user: any) => ({ ...user })))
        .run()

      console.log('Loading categories...')
      await db
        .insert(videoCategories)
        .values(
          categoriesData.categories.map((category: any) => ({ ...category })),
        )
        .run()

      console.log('Loading channels...')
      await db
        .insert(channels)
        .values(
          channelsData.map((channel: any) => ({
            id: channel.id,
            userId: channel.userId,
            name: channel.name,
            description: channel.description,
            banner: channel.banner,
            avatar: channel.avatar,
            subscriberCount: channel.subscriberCount,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
          })),
        )
        .run()

      console.log('Loading videos...')
      await db
        .insert(videos)
        .values(
          videosData.map((video: any) => ({
            id: video.id,
            channelId: video.channelId,
            title: video.title,
            description: video.description,
            categoryId: video.categoryId,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            status: video.status,
            visibility: video.visibility,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
            likeCount: video.likeCount,
            viewCount: video.viewCount,
            commentCount: video.commentCount,
            isCommentsEnabled: video.isCommentsEnabled,
          })),
        )
        .run()

      console.log('Loading playlists...')
      await db
        .insert(playlists)
        .values(
          playlistsData.map((playlist: any) => ({
            id: playlist.id,
            userId: playlist.userId,
            name: playlist.name,
            description: playlist.description,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
          })),
        )
        .run()

      console.log('Loading top-level comments...')
      await db
        .insert(comments)
        .values(
          commentsData.map((comment: any) => ({
            id: comment.id,
            userId: comment.userId,
            videoId: comment.videoId,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            reportCount: comment.reportCount,
            deletedAt: comment.deletedAt,
            isEdited: comment.isEdited,
            likes: comment.likes,
            dislikes: comment.dislikes,
          })),
        )
        .run()

      console.log('Loading likes...')
      const allLikes = videosData.flatMap((video: any) =>
        video.likes.map((like: any) => ({
          userId: like.userId,
          videoId: like.videoId,
          createdAt: like.createdAt,
        })),
      )
      if (allLikes.length > 0) {
        await db.insert(likes).values(allLikes).run()
      }

      console.log('Loading subscriptions & history...')
      const allSubs = usersData.flatMap((user: any) =>
        user.subscriptions.map((sub: any) => ({
          userId: sub.userId,
          channelId: sub.channelId,
          createdAt: sub.createdAt,
        })),
      )
      const allHistory = usersData.flatMap((user: any) =>
        user.history.map((h: any) => ({
          userId: h.userId,
          videoId: h.videoId,
          watchedAt: h.watchedAt,
        })),
      )
      if (allSubs.length > 0) {
        await db.insert(subscriptions).values(allSubs).run()
      }
      if (allHistory.length > 0) {
        await db.insert(history).values(allHistory).run()
      }

      console.log('Loading playlist videos...')
      const allPlaylistVideos = playlistsData.flatMap((playlist: any) =>
        playlist.videos.map((video: any) => ({
          playlistId: playlist.id,
          videoId: video.videoId,
          position: video.position,
          addedAt: video.addedAt,
        })),
      )
      if (allPlaylistVideos.length > 0) {
        await db.insert(playlistVideos).values(allPlaylistVideos).run()
      }

      console.log('Loading comment replies...')
      const allReplies = commentsData.flatMap((comment: any) =>
        comment.replies.map((reply: any) => ({
          id: reply.id,
          parentId: reply.parentId,
          userId: reply.userId,
          videoId: reply.videoId,
          content: reply.content,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          reportCount: reply.reportCount,
          deletedAt: reply.deletedAt,
          isEdited: reply.isEdited,
          likes: reply.likes,
          dislikes: reply.dislikes,
        })),
      )
      if (allReplies.length > 0) {
        await db.insert(comments).values(allReplies).run()
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },

  // User Mutations
  createUser: async (userData: {
    email: string
    username: string
    password: string
    name?: string
    avatar?: string
    bio?: string
  }) => {
    return db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateUser: async (
    userId: number,
    userData: {
      email?: string
      username?: string
      name?: string
      avatar?: string
      bio?: string
    },
  ) => {
    return db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .get()
  },

  // Video Mutations
  createVideo: async (videoData: {
    channelId: number
    title: string
    description?: string
    videoUrl: string
    thumbnailUrl?: string
    duration?: number
    visibility?: 'public' | 'private' | 'unlisted'
  }) => {
    return db
      .insert(videos)
      .values({
        ...videoData,
        status: 'active',
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async updateVideo(
    videoId: number,
    videoData: {
      title?: string
      description?: string
      thumbnailUrl?: string
      visibility?: 'public' | 'private' | 'unlisted'
      status?: 'active' | 'deleted' | 'blocked'
    },
  ) {
    return db
      .update(videos)
      .set({
        ...videoData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videos.id, videoId))
      .returning()
      .get()
  },

  async deleteVideo(videoId: number) {
    return db
      .update(videos)
      .set({
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videos.id, videoId))
      .returning()
      .get()
  },

  async createPlaylist(playlistData: {
    userId: number
    name: string
    description?: string
    isPublic?: boolean
  }) {
    return db
      .insert(playlists)
      .values({
        ...playlistData,
        isPublic: playlistData.isPublic ? 1 : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async addVideoToPlaylist(
    playlistId: number,
    videoId: number,
    position?: number,
  ) {
    return db
      .insert(playlistVideos)
      .values({
        playlistId,
        videoId,
        position,
        addedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async removeVideoFromPlaylist(playlistId: number, videoId: number) {
    await db
      .delete(playlistVideos)
      .where(
        and(
          eq(playlistVideos.playlistId, playlistId),
          eq(playlistVideos.videoId, videoId),
        ),
      )
  },

  // Video Category Mutations
  async createVideoCategory(categoryData: {
    name: string
    description?: string
  }) {
    return db
      .insert(videoCategories)
      .values({
        ...categoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  // Video Tag Mutations
  async createVideoTag(tag: string) {
    return db
      .insert(videoTags)
      .values({
        tag,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  // Video Tag Mapping
  async addTagToVideo(videoId: number, tagId: number) {
    return db
      .insert(videoTagMap)
      .values({
        videoId,
        tagId,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async removeTagFromVideo(videoId: number, tagId: number) {
    await db
      .delete(videoTagMap)
      .where(
        and(eq(videoTagMap.videoId, videoId), eq(videoTagMap.tagId, tagId)),
      )
  },

  // Comment Mutations
  async createComment(commentData: {
    videoId: number
    userId: number
    parentId?: number
    content: string
  }) {
    // Create the comment
    const comment = await db
      .insert(comments)
      .values({
        ...commentData,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()

    // Update comment count on video
    await db
      .update(videos)
      .set({
        commentCount: sql`${videos.commentCount} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videos.id, commentData.videoId))

    return comment
  },

  async updateComment(commentId: number, content: string) {
    return db
      .update(comments)
      .set({
        content,
        isEdited: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(comments.id, commentId))
      .returning()
      .get()
  },

  async deleteComment(commentId: number) {
    // Get the comment first to update video count
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .get()

    if (!comment) return null

    // Soft delete the comment
    const deletedComment = await db
      .update(comments)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(comments.id, commentId))
      .returning()
      .get()

    // Update comment count on video
    if (deletedComment) {
      await db
        .update(videos)
        .set({
          commentCount: sql`${videos.commentCount} - 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(videos.id, comment.videoId))
    }

    return deletedComment
  },

  // Report Mutations
  async reportVideo(reportData: {
    videoId: number
    userId: number
    reason: string
    details?: string
  }) {
    return db
      .insert(videoReports)
      .values({
        ...reportData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async reportComment(reportData: {
    comment_id: number
    userId: number
    reason: string
    details?: string
  }) {
    return db
      .insert(commentReports)
      .values({
        ...reportData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async updateReportStatus(
    reportId: number,
    status: 'pending' | 'resolved' | 'dismissed',
    moderatorNotes?: string,
  ) {
    return db
      .update(videoReports)
      .set({
        status,
        moderator_notes: moderatorNotes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videoReports.id, reportId))
      .returning()
      .get()
  },

  async toggleLike(videoId: number, userId: number) {
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.videoId, videoId), eq(likes.userId, userId)))
      .get()

    if (existingLike) {
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.videoId, videoId), eq(likes.userId, userId)))

      // Decrement like count
      await db
        .update(videos)
        .set({
          likeCount: sql`${videos.likeCount} - 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(videos.id, videoId))

      return { liked: false }
    } else {
      // Like
      await db.insert(likes).values({
        videoId,
        userId,
        createdAt: new Date().toISOString(),
      })

      // Increment like count
      await db
        .update(videos)
        .set({
          likeCount: sql`${videos.likeCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(videos.id, videoId))

      return { liked: true }
    }
  },

  async toggleSubscription(channelId: number, userId: number) {
    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.channelId, channelId),
          eq(subscriptions.userId, userId),
        ),
      )
      .get()

    if (existingSub) {
      // Unsubscribe
      await db
        .delete(subscriptions)
        .where(
          and(
            eq(subscriptions.channelId, channelId),
            eq(subscriptions.userId, userId),
          ),
        )

      // Decrement subscriber count
      await db
        .update(channels)
        .set({
          subscriberCount: sql`${channels.subscriberCount} - 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(channels.id, channelId))

      return { subscribed: false }
    } else {
      // Subscribe
      await db.insert(subscriptions).values({
        channelId,
        userId,
        createdAt: new Date().toISOString(),
      })

      // Increment subscriber count
      await db
        .update(channels)
        .set({
          subscriberCount: sql`${channels.subscriberCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(channels.id, channelId))

      return { subscribed: true }
    }
  },

  addToHistory: async (userId: number, videoId: number) => {
    try {
      const existingEntry = await db
        .select()
        .from(history)
        .where(and(eq(history.userId, userId), eq(history.videoId, videoId)))
        .get()

      if (existingEntry) {
        return db
          .update(history)
          .set({
            watchedAt: new Date().toISOString(),
          })
          .where(eq(history.id, existingEntry.id))
          .returning()
          .get()
      } else {
        // Create new entry
        return db
          .insert(history)
          .values({
            userId,
            videoId,
            watchedAt: new Date().toISOString(),
          })
          .returning()
          .get()
      }
    } catch (error) {
      console.error('Error adding to history:', error)
      throw error
    }
  },

  clearHistory: async (userId: number) => {
    try {
      await db.delete(history).where(eq(history.userId, userId))
      return { success: true }
    } catch (error) {
      console.error('Error clearing history:', error)
      throw error
    }
  },
}
