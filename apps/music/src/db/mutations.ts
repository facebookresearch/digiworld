// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sql, and, eq } from 'drizzle-orm'
import { db } from './index'
import {
  users,
  songs,
  playlists,
  playlistSongs,
  favorites,
  recentlyPlayed,
  artists,
  albums,
  playlistSettings,
  playHistory,
  categories,
  playbackSettings,
} from './schema'
// Import mock data statically
import artistsStaticMock from '../data/mock-artists.json'
import albumStaticMock from '../data/mock-albums.json'
import songStaticMock from '../data/mock-songs.json'
import userStaticMock from '../data/mock-users.json'
import playlistStaticMock from '../data/mock-playlists.json'
import categoriesStaticMock from '../data/mock-categories.json'
import playbackSettingsStaticMock from '../data/mock-playback_settings.json'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

const bundledMocks = {
  'mock-artists.json': artistsStaticMock,
  'mock-albums.json': albumStaticMock,
  'mock-songs.json': songStaticMock,
  'mock-users.json': userStaticMock,
  'mock-playlists.json': playlistStaticMock,
  'mock-categories.json': categoriesStaticMock,
  'mock-playback_settings.json': playbackSettingsStaticMock,
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
//       // If file doesn't exist in storage, use imported mock data
//       console.log(`File ${filename} not found in storage, using bundled data`)
//       switch (filename) {
//         case 'artists.json':
//           return artistsStaticMock
//         case 'albums.json':
//           return artistStaticMock
//         case 'songs.json':
//           return songStaticMock
//         case 'users.json':
//           return userStaticMock
//         case 'playlists.json':
//           return playlistStaticMock
//         case 'playback_settings.json':
//           return playbackSettingsStaticMock
//         case 'categories.json':
//           return categoriesStaticMock
//         default:
//           console.error(`Unknown mock data file: ${filename}`)
//           return null
//       }
//     }
//   } catch (error) {
//     console.error(`Error accessing ${filename}:`, error)
//     return null
//   }
// }

export const mutations = {
  // Data Loading
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      // Check if tables exist and have data
      const [categoryCount, userCount, artistCount, albumCount, songCount] =
        await Promise.all([
          db
            .select({ count: sql`count(*)` })
            .from(categories)
            .execute(),
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .execute(),
          db
            .select({ count: sql`count(*)` })
            .from(artists)
            .execute(),
          db
            .select({ count: sql`count(*)` })
            .from(albums)
            .execute(),
          db
            .select({ count: sql`count(*)` })
            .from(songs)
            .execute(),
        ])

      if (
        categoryCount[0]?.count > 0 &&
        userCount[0]?.count > 0 &&
        artistCount[0]?.count > 0 &&
        albumCount[0]?.count > 0 &&
        songCount[0]?.count > 0
      ) {
        console.log('Database is already initialized with data')
        return { success: true, skipped: true }
      }

      // Clear existing data if any exists
      const clearTables = [
        'DELETE FROM play_history',
        'DELETE FROM playback_settings',
        'DELETE FROM playlist_songs',
        'DELETE FROM playlists',
        'DELETE FROM favorites',
        'DELETE FROM recently_played',
        'DELETE FROM songs',
        'DELETE FROM albums',
        'DELETE FROM artists',
        'DELETE FROM categories',
        'DELETE FROM users',
        'DELETE FROM sqlite_sequence',
      ]

      for (const query of clearTables) {
        await db.run(sql.raw(query))
      }

      // Load all JSON files in parallel for faster data loading
      const [
        userMock,
        artistMock,
        albumMock,
        songMock,
        playlistMock,
        categoryMock,
        playbackSettingsMock,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-artists.json'),
        readJSONFile('mock-albums.json'),
        readJSONFile('mock-songs.json'),
        readJSONFile('mock-playlists.json'),
        readJSONFile('mock-categories.json'),
        readJSONFile('mock-playback_settings.json'),
      ])

      // Batch insert categories - significantly faster than individual inserts
      console.log('Loading categories...')
      if (categoryMock.length > 0) {
        await db
          .insert(categories)
          .values(
            categoryMock.map((category: any) => ({
              categoryId: category.id,
              name: category.name,
              type: category.type,
              color: category.color,
              description: category.description,
              subcategories: JSON.stringify(category.subcategories),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          )
          .run()
      }

      // Batch insert users
      console.log('Loading users...')
      if (userMock.length > 0) {
        await db
          .insert(users)
          .values(
            userMock.map((user: any) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              password: user.password,
              profilePicture: user.profilePicture,
              favoriteCategories: JSON.stringify(user.favoriteCategories),
              favoriteSongIds: JSON.stringify(user.favoriteSongIds),
              recentlyPlayed: JSON.stringify(user.recentlyPlayed),
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert artists with category references
      console.log('Loading artists...')
      if (artistMock.length > 0) {
        await db
          .insert(artists)
          .values(
            artistMock.map((artist: any) => ({
              id: artist.id,
              name: artist.name,
              bio: artist.bio,
              categories: JSON.stringify(artist.categories),
              monthlyListeners: artist.monthlyListeners,
              rating: artist.rating,
              profilePicture: artist.profilePicture,
              createdAt: artist.createdAt,
              updatedAt: artist.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert albums with artist and category references
      console.log('Loading albums...')
      if (albumMock.length > 0) {
        await db
          .insert(albums)
          .values(
            albumMock.map((album: any) => ({
              id: album.id,
              title: album.title,
              artistId: album.artistId,
              releaseDate: album.releaseDate,
              categories: JSON.stringify(album.categories),
              coverArt: album.coverArt,
              totalTracks: album.totalTracks,
              rating: album.rating,
              createdAt: album.createdAt,
              updatedAt: album.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert songs with artist, album and category references
      console.log('Loading songs...')
      if (songMock.length > 0) {
        await db
          .insert(songs)
          .values(
            songMock.map((song: any) => ({
              id: song.id,
              title: song.title,
              artistId: song.artistId,
              albumId: song.albumId,
              duration: song.duration,
              categories: JSON.stringify(song.categories),
              audioUrl: song.audioUrl,
              coverArt: song.coverArt,
              playCount: song.playCount,
              rating: song.rating,
              createdAt: song.createdAt,
              updatedAt: song.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert playlists with user and category references
      console.log('Loading playlists...')
      if (playlistMock.length > 0) {
        await db
          .insert(playlists)
          .values(
            playlistMock.map((playlist: any) => ({
              id: playlist.id,
              name: playlist.name,
              description: playlist.description,
              userId: playlist.userId,
              categories: JSON.stringify(playlist.categories),
              songIds: JSON.stringify(playlist.songIds),
              coverArt: playlist.coverArt,
              createdAt: playlist.createdAt,
              updatedAt: playlist.updatedAt,
            })),
          )
          .run()
      }

      // Batch insert playlist_songs junction table
      console.log('Loading playlist songs...')
      const playlistSongsData = playlistMock.flatMap((playlist: any) =>
        (playlist.songIds || []).map((songId: number, index: number) => ({
          playlistId: playlist.id,
          songId,
          position: index,
          createdAt: new Date().toISOString(),
        })),
      )
      if (playlistSongsData.length > 0) {
        await db.insert(playlistSongs).values(playlistSongsData).run()
      }

      // Batch insert favorites
      console.log('Loading favorites...')
      const favoritesData = userMock.flatMap((user: any) =>
        (user.favoriteSongIds || []).map((songId: any) => ({
          userId: user.id,
          songId,
          createdAt: new Date().toISOString(),
        })),
      )
      if (favoritesData.length > 0) {
        await db.insert(favorites).values(favoritesData).run()
      }

      // Batch insert recently played
      console.log('Loading recently played...')
      const recentlyPlayedData = userMock.flatMap((user: any) =>
        (user.recentlyPlayed || []).map(({ songId, playedAt }: any) => ({
          userId: user.id,
          songId,
          playedAt: playedAt || new Date().toISOString(),
        })),
      )
      if (recentlyPlayedData.length > 0) {
        await db.insert(recentlyPlayed).values(recentlyPlayedData).run()
      }

      // Batch insert playback settings
      console.log('Loading playback settings...')
      if (playbackSettingsMock.length > 0) {
        await db
          .insert(playbackSettings)
          .values(
            playbackSettingsMock.map((setting: any) => ({
              entityType: setting.entityType,
              entityId: setting.entityId,
              shuffle: setting.shuffle ? 1 : 0,
              repeatMode: setting.repeatMode,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          )
          .run()
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  // User Mutations
  async createUser(userData: {
    firstName: string
    lastName: string
    email: string
    password: string
    phoneNumber?: string
    profilePicture?: string
  }) {
    return db
      .insert(users)
      .values({
        ...userData,
        dateJoined: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async updateUser(
    userId: number,
    userData: {
      firstName?: string
      lastName?: string
      phoneNumber?: string
      profilePicture?: string
    },
  ) {
    return db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date().toISOString(),
      })
      .where(sql`id = ${userId}`)
      .returning()
      .get()
  },

  // Song Mutations
  async createSong(songData: {
    title: string
    artist: string
    album: string
    duration: number
    genre?: string
    releaseYear?: number
    filePath: string
    coverArt?: string
  }) {
    return db.insert(songs).values(songData).returning().get()
  },

  async updateSong(
    songId: number,
    songData: {
      title?: string
      artist?: string
      album?: string
      duration?: number
      genre?: string
      releaseYear?: number
      filePath?: string
      coverArt?: string
    },
  ) {
    return db
      .update(songs)
      .set({
        ...songData,
        updatedAt: new Date().toISOString(),
      })
      .where(sql`id = ${songId}`)
      .returning()
      .get()
  },

  async deleteSong(songId: number) {
    await db.delete(songs).where(sql`id = ${songId}`)
  },

  // Playlist Mutations
  async createPlaylist(playlistData: {
    name: string
    description?: string
    userId: number
    coverArt?: string
  }) {
    const playlist = await db
      .insert(playlists)
      .values(playlistData)
      .returning()
      .get()

    if (playlist) {
      await db.insert(playlistSettings).values({
        playlistId: playlist.id,
        isShuffleEnabled: false,
        repeatMode: 'none',
      })
    }

    return playlist
  },

  async updatePlaylist(
    playlistId: number,
    userId: number,
    playlistData: {
      name?: string
      description?: string
      coverArt?: string
    },
  ) {
    return db
      .update(playlists)
      .set({
        ...playlistData,
        updatedAt: new Date().toISOString(),
      })
      .where(sql`id = ${playlistId} AND user_id = ${userId}`)
      .returning()
      .get()
  },

  async deletePlaylist(playlistId: number, userId: number) {
    await db
      .delete(playlists)
      .where(sql`id = ${playlistId} AND user_id = ${userId}`)
  },

  async addSongToPlaylist(
    playlistId: number,
    songId: number,
    position: number,
  ) {
    return db
      .insert(playlistSongs)
      .values({
        playlistId,
        songId,
        position,
      })
      .returning()
      .get()
  },

  async removeSongFromPlaylist(playlistId: number, songId: number) {
    await db
      .delete(playlistSongs)
      .where(sql`playlist_id = ${playlistId} AND song_id = ${songId}`)
  },

  async reorderPlaylistSongs(
    playlistId: number,
    songPositions: { songId: number; position: number }[],
  ) {
    await db.transaction(async (tx: any) => {
      for (const pos in songPositions) {
        const { songId, position } = songPositions[pos]
        await tx
          .update(playlistSongs)
          .set({ position })
          .where(sql`playlist_id = ${playlistId} AND song_id = ${songId}`)
      }
    })
  },

  // Favorites Mutations
  async addToFavorites(userId: number, songId: number) {
    return db
      .insert(favorites)
      .values({
        userId,
        songId,
      })
      .returning()
      .get()
  },

  async removeFromFavorites(userId: number, songId: number) {
    await db
      .delete(favorites)
      .where(sql`user_id = ${userId} AND song_id = ${songId}`)
  },

  // Recently Played Mutations
  async addToRecentlyPlayed(userId: number, songId: number) {
    return db
      .insert(recentlyPlayed)
      .values({
        userId,
        songId,
      })
      .returning()
      .get()
  },

  async clearRecentlyPlayed(userId: number) {
    await db.delete(recentlyPlayed).where(sql`user_id = ${userId}`)
  },

  // Playlist Settings Mutations
  async createPlaylistSettings(playlistId: number) {
    return db
      .insert(playlistSettings)
      .values({
        playlistId,
        isShuffleEnabled: false,
        repeatMode: 'none',
      })
      .returning()
      .get()
  },

  async updatePlaylistSettings(
    playlistId: number,
    settings: {
      isShuffleEnabled?: boolean
      repeatMode?: string
      lastPlayedSongId?: number | null
    },
  ) {
    return db
      .update(playlistSettings)
      .set({
        ...settings,
        updatedAt: new Date().toISOString(),
      })
      .where(sql`playlist_id = ${playlistId}`)
      .returning()
      .get()
  },

  async getPlaylistSettings(playlistId: number) {
    return db
      .select()
      .from(playlistSettings)
      .where(sql`playlist_id = ${playlistId}`)
      .get()
  },

  // Play History Mutations
  async addToPlayHistory(data: {
    userId: number
    playlistId?: number
    songId: number
    completionPercentage?: number
  }) {
    return db
      .insert(playHistory)
      .values({
        ...data,
        completionPercentage: data.completionPercentage || 0,
      })
      .returning()
      .get()
  },

  async updatePlayCompletion(historyId: number, completionPercentage: number) {
    return db
      .update(playHistory)
      .set({ completionPercentage })
      .where(sql`id = ${historyId}`)
      .returning()
      .get()
  },

  async getPlayHistory(userId: number, limit = 50) {
    return db
      .select({
        history: playHistory,
        song: songs,
        playlist: playlists,
      })
      .from(playHistory)
      .innerJoin(songs, sql`songs.id = playHistory.songId`)
      .leftJoin(playlists, sql`playlists.id = playHistory.playlistId`)
      .where(sql`playHistory.userId = ${userId}`)
      .orderBy(sql`playHistory.playedAt DESC`)
      .limit(limit)
      .execute()
  },

  // Update playback settings mutations
  async createPlaybackSettings(data: {
    entityType: 'artist' | 'album' | 'playlist'
    entityId: number
    shuffle?: boolean
    repeatMode?: 'repeat-one' | 'repeat-all' | 'none'
  }) {
    return db
      .insert(playbackSettings)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        shuffle: data.shuffle ? 1 : 0,
        repeatMode: data.repeatMode || 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  async updatePlaybackSettings(
    entityType: 'artist' | 'album' | 'playlist',
    entityId: number,
    settings: {
      shuffle?: boolean
      repeatMode?: 'repeat-one' | 'repeat-all' | 'none'
      lastPlayedSongId?: number | null
    },
  ) {
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    }

    if (settings.shuffle !== undefined) {
      updateData.shuffle = settings.shuffle ? 1 : 0
    }
    if (settings.repeatMode !== undefined) {
      updateData.repeatMode = settings.repeatMode
    }
    if (settings.lastPlayedSongId !== undefined) {
      updateData.lastPlayedSongId = settings.lastPlayedSongId
    }

    return db
      .update(playbackSettings)
      .set(updateData)
      .where(
        and(
          eq(playbackSettings.entityType, entityType),
          eq(playbackSettings.entityId, entityId),
        ),
      )
      .returning()
      .get()
  },

  async getPlaybackSettings(
    entityType: 'artist' | 'album' | 'playlist',
    entityId: number,
  ) {
    return db
      .select()
      .from(playbackSettings)
      .where(
        and(
          eq(playbackSettings.entityType, entityType),
          eq(playbackSettings.entityId, entityId),
        ),
      )
      .get()
  },
}
