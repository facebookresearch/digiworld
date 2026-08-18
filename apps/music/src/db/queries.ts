import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/db/index'
import {
  users,
  songs,
  playlists,
  playlistSongs,
  favorites,
  recentlyPlayed,
  playbackSettings,
  playHistory,
  artists,
  albums,
  categories,
} from './schema'

interface FavoriteResult {
  songId: number
}

interface PlaylistResult {
  playlist: typeof playlists.$inferSelect
  settings: typeof playbackSettings.$inferSelect | null
  songCount: number
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if tables exist using a simpler query first
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'songs', 'playlists', 'playlist_songs', 'favorites', 'recently_played')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 6 required tables
    const count = result[0].count
    const hasAllTables = count === 6
    console.log(`Database has ${count} of 6 required tables`)

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

// User Queries
export const getUserByEmail = async (email: string) => {
  try {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute()
    return results[0]
  } catch (error) {
    console.error('Error in getUserByEmail:', error)
    return null
  }
}

export const getUserById = async (id: number) => {
  try {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .execute()
    return results[0]
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

// Favorites Queries
export const getFavoriteSongIds = async (userId: number) => {
  try {
    const results = await db
      .select({ songId: favorites.songId })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .execute()
    return results.map((r: FavoriteResult) => r.songId)
  } catch (error) {
    console.error('Error in getFavoriteSongIds:', error)
    return []
  }
}

export const addToFavorites = async (userId: number, songId: number) => {
  try {
    await db.insert(favorites).values({ userId, songId }).execute()
    return true
  } catch (error) {
    console.error('Error in addToFavorites:', error)
    return false
  }
}

export const removeFromFavorites = async (userId: number, songId: number) => {
  try {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
      .execute()
    return true
  } catch (error) {
    console.error('Error in removeFromFavorites:', error)
    return false
  }
}

// Playlist Queries
export const getPlaylistsByUserId = async (userId: number) => {
  try {
    const results = await db
      .select({
        playlist: playlists,
        settings: playbackSettings,
        songCount: sql<number>`COUNT(DISTINCT ${playlistSongs.songId})`,
      })
      .from(playlists)
      .leftJoin(
        playbackSettings,
        and(
          eq(playbackSettings.entityType, 'playlist'),
          eq(playbackSettings.entityId, playlists.id),
        ),
      )
      .leftJoin(playlistSongs, eq(playlistSongs.playlistId, playlists.id))
      .where(eq(playlists.userId, userId))
      .groupBy(playlists.id)
      .execute()

    return results.map((r: PlaylistResult) => {
      // Format settings to match MobX model
      const formattedSettings = r.settings
        ? {
            id: r.settings.id,
            playlistId: r.settings.entityId,
            isShuffleEnabled: r.settings.shuffle === 1,
            repeatMode: r.settings.repeatMode,
            lastPlayedSongId: r.settings.lastPlayedSongId,
            createdAt: r.settings.createdAt,
            updatedAt: r.settings.updatedAt,
          }
        : null

      return {
        ...r.playlist,
        settings: formattedSettings,
        songCount: r.songCount,
      }
    })
  } catch (error) {
    console.error('Error in getPlaylistsByUserId:', error)
    return []
  }
}

export const getPlaylistById = async (playlistId: number) => {
  try {
    const results = await db
      .select({
        playlist: playlists,
        settings: playbackSettings,
        songCount: sql<number>`COUNT(DISTINCT ${playlistSongs.songId})`,
      })
      .from(playlists)
      .leftJoin(
        playbackSettings,
        and(
          eq(playbackSettings.entityType, 'playlist'),
          eq(playbackSettings.entityId, playlists.id),
        ),
      )
      .leftJoin(playlistSongs, eq(playlistSongs.playlistId, playlists.id))
      .where(eq(playlists.id, playlistId))
      .groupBy(playlists.id)
      .execute()

    if (!results[0]) return null

    // Format settings to match MobX model
    const formattedSettings = results[0].settings
      ? {
          id: results[0].settings.id,
          playlistId: results[0].settings.entityId,
          isShuffleEnabled: results[0].settings.shuffle === 1,
          repeatMode: results[0].settings.repeatMode,
          lastPlayedSongId: results[0].settings.lastPlayedSongId,
          createdAt: results[0].settings.createdAt,
          updatedAt: results[0].settings.updatedAt,
        }
      : null

    return {
      ...results[0].playlist,
      settings: formattedSettings,
      songCount: results[0].songCount,
    }
  } catch (error) {
    console.error('Error in getPlaylistById:', error)
    return null
  }
}

// Music Queries
export const getRecentlyPlayed = async (userId: number, limit = 15) => {
  try {
    const results = await db
      .select({
        song: songs,
        playedAt: recentlyPlayed.playedAt,
      })
      .from(recentlyPlayed)
      .innerJoin(songs, eq(recentlyPlayed.songId, songs.id))
      .where(eq(recentlyPlayed.userId, userId))
      .orderBy(desc(recentlyPlayed.playedAt))
      .limit(limit)
      .execute()
    return results.map((r: any) => ({
      songId: r.song.id,
      playedAt: r.playedAt,
    }))
  } catch (error) {
    console.error('Error in getRecentlyPlayed:', error)
    return []
  }
}

export const getFavorites = async (userId: number) => {
  try {
    return await db
      .select({
        song: songs,
        album: albums,
      })
      .from(favorites)
      .innerJoin(songs, eq(favorites.songId, songs.id))
      .innerJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(favorites.userId, userId))
      .execute()
  } catch (error) {
    console.error('Error in getFavorites:', error)
    return []
  }
}

export const getPlaylistSongs = async (playlistId: number) => {
  try {
    return await db
      .select({
        song: songs,
        position: playlistSongs.position,
      })
      .from(playlistSongs)
      .innerJoin(songs, eq(songs.id, playlistSongs.songId))
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(playlistSongs.position)
      .execute()
  } catch (error) {
    console.error('Error in getPlaylistSongs:', error)
    return []
  }
}

export const updatePlayHistory = async (
  userId: number,
  songId: number,
  playlistId: number,
) => {
  try {
    await db
      .insert(playHistory)
      .values({
        userId,
        playlistId,
        songId,
        completionPercentage: 0,
        playedAt: new Date().toISOString(),
      })
      .execute()

    await db
      .update(playbackSettings)
      .set({
        lastPlayedSongId: songId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(playbackSettings.entityType, 'playlist'),
          eq(playbackSettings.entityId, playlistId),
        ),
      )
      .execute()

    return true
  } catch (error) {
    console.error('Error in updatePlayHistory:', error)
    return false
  }
}

const getMusicCategories = async () => {
  try {
    const results = await db.select().from(categories).execute()
    return results
  } catch (error) {
    console.error('Error in getMusicCategories:', error)
    return []
  }
}
const toggleFavorites = async (userId: number, songId: number) => {
  try {
    const results = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
      .execute()
    if (results.length > 0) {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
        .execute()
    } else {
      await db.insert(favorites).values({ userId, songId }).execute()
    }
    return true
  } catch (error) {
    console.error('Error in toggleFavorite:', error)
    return null
  }
}

const updateFavorites = async (userId: number) => {
  try {
    const results = await db
      .select({
        song: songs,
        album: albums,
      })
      .from(favorites)
      .innerJoin(songs, eq(favorites.songId, songs.id))
      .innerJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(favorites.userId, userId))
      .execute()
    return results.map((r: { song: any; album: any }) => ({
      ...r.song,
      album: r.album,
      isFavorite: true,
    }))
  } catch (error) {
    console.error('Error in updateFavorites:', error)
    return []
  }
}

const setCurrentPlaylist = async (playlistId: number) => {
  try {
    const playlist = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!playlist.length) {
      return null
    }
    console.log('playlist', playlist)

    const settings = await db
      .select()
      .from(playbackSettings)
      .where(
        and(
          eq(playbackSettings.entityType, 'playlist'),
          eq(playbackSettings.entityId, playlistId),
        ),
      )
      .execute()
    console.log('settings', settings)

    // Format settings to match MobX model expectations
    const formattedSettings = settings[0]
      ? {
          id: settings[0].id,
          playlistId: settings[0].entityId,
          isShuffleEnabled: settings[0].shuffle === 1,
          repeatMode: settings[0].repeatMode,
          lastPlayedSongId: settings[0].lastPlayedSongId,
          createdAt: settings[0].createdAt,
          updatedAt: settings[0].updatedAt,
        }
      : null

    // Parse the base playlist data
    const playlistData = {
      ...playlist[0],
      categories: playlist[0].categories
        ? typeof playlist[0].categories === 'string'
          ? JSON.parse(playlist[0].categories)
          : playlist[0].categories
        : null,
      description: playlist[0].description,
      coverArt: playlist[0].coverArt,
      songIds:
        typeof playlist[0].songIds === 'string'
          ? JSON.parse(playlist[0].songIds)
          : playlist[0].songIds || [],
      settings: formattedSettings,
    }

    return playlistData
  } catch (error) {
    console.error('Error in setCurrentPlaylist:', error)
    return null
  }
}

const updateRecentlyPlayed = async (userId: number) => {
  try {
    const results = await db
      .select({
        song: {
          id: songs.id,
          title: songs.title,
          artistId: songs.artistId,
          albumId: songs.albumId,
          duration: songs.duration,
          categories: songs.categories,
          audioUrl: songs.audioUrl,
          coverArt: songs.coverArt,
          playCount: songs.playCount,
          rating: songs.rating,
          createdAt: songs.createdAt,
          updatedAt: songs.updatedAt,
        },
        album: {
          id: albums.id,
          title: albums.title,
          artistId: albums.artistId,
          releaseDate: albums.releaseDate,
          categories: albums.categories,
          coverArt: albums.coverArt,
          totalTracks: albums.totalTracks,
          rating: albums.rating,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
        },
        artist: {
          id: artists.id,
          name: artists.name,
        },
        playedAt: recentlyPlayed.playedAt,
      })
      .from(recentlyPlayed)
      .innerJoin(songs, eq(recentlyPlayed.songId, songs.id))
      .innerJoin(albums, eq(songs.albumId, albums.id))
      .innerJoin(artists, eq(songs.artistId, artists.id))
      .where(eq(recentlyPlayed.userId, userId))
      .orderBy(desc(recentlyPlayed.playedAt))
      .limit(6)
      .execute()
    return results
  } catch (error) {
    console.error('Error in updateRecentlyPlayed:', error)
    return []
  }
}

const fetchUserPlaylists = async (userId: number) => {
  try {
    const results = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .execute()
    const parsedPlaylists = results.map((playlist: any) => ({
      ...playlist,
      categories: playlist.categories
        ? typeof playlist.categories === 'string'
          ? JSON.parse(playlist.categories)
          : playlist.categories
        : null,
      description: playlist.description,
      coverArt: playlist.coverArt,
      songIds:
        typeof playlist.songIds === 'string'
          ? JSON.parse(playlist.songIds)
          : playlist.songIds || null,
      songs: [],
      settings: null,
    }))
    return parsedPlaylists
  } catch (error) {
    console.error('Error in fetchUserPlaylists:', error)
    return []
  }
}

const fetchTopAlbums = async (limit = 6) => {
  try {
    const results = await db
      .select()
      .from(albums)
      .orderBy(desc(albums.rating))
      .limit(limit)
      .execute()
    return results
  } catch (error) {
    console.error('Error in fetchTopAlbums:', error)
    return []
  }
}
const addToRecentlyPlayed = async (userId: number, songId: number) => {
  try {
    await db
      .delete(recentlyPlayed)
      .where(
        and(
          eq(recentlyPlayed.userId, userId),
          eq(recentlyPlayed.songId, songId),
        ),
      )
      .execute()

    await db
      .insert(recentlyPlayed)
      .values({
        userId,
        songId,
        playedAt: new Date().toISOString(),
      })
      .execute()
  } catch (error) {
    console.error('Error in addToRecentlyPlayed:', error)
  }
}
const updatePlayCompletion = async (
  userId: number,
  songId: number,
  completionPercentage: number,
  currentPlaylistId: number,
) => {
  try {
    const latestHistoryEntry = await db
      .select()
      .from(playHistory)
      .where(
        and(
          eq(playHistory.userId, userId),
          eq(playHistory.songId, songId),
          eq(playHistory.playlistId, currentPlaylistId),
        ),
      )
      .orderBy(desc(playHistory.playedAt))
      .limit(1)
      .execute()

    if (latestHistoryEntry.length > 0) {
      await db
        .update(playHistory)
        .set({
          completionPercentage,
        })
        .where(eq(playHistory.id, latestHistoryEntry[0].id))
        .execute()
    }
  } catch (error) {
    console.error('Error in updatePlayCompletion:', error)
  }
}

export const createPlaylist = async (data: {
  name: string
  userId: number
  description?: string
  coverArt?: string
}) => {
  try {
    // Create playlist with empty arrays
    const playlistResult = await db
      .insert(playlists)
      .values({
        name: data.name,
        userId: data.userId,
        description: data.description,
        coverArt: data.coverArt,
        categories: '[]', // Empty JSON array
        songIds: '[]', // Empty JSON array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .execute()

    const playlist = playlistResult[0]
    if (!playlist) throw new Error('Failed to create playlist')

    // Create default settings
    const settingsResult = await db
      .insert(playbackSettings)
      .values({
        entityType: 'playlist',
        entityId: playlist.id,
        playlistId: playlist.id,
        shuffle: 0,
        repeatMode: 'none',
        lastPlayedSongId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .execute()

    // Return playlist with parsed arrays and settings
    const returnObj = {
      ...playlist,
      playlistId: playlist.id,
      categories: JSON.parse(playlist.categories || '[]'),
      songIds: JSON.parse(playlist.songIds || '[]'),
      settings: {
        ...settingsResult[0],
        playlistId: playlist.id,
        isShuffleEnabled: settingsResult[0].shuffle === 1,
        repeatMode: settingsResult[0].repeatMode || 'none',
        lastPlayedSongId: settingsResult[0].lastPlayedSongId || null,
      },
    }
    return returnObj
  } catch (error) {
    console.error('Error in createPlaylist:', error)
    return null
  }
}

const deletePlaylist = async (playlistId: number) => {
  try {
    // Delete all related data in a transaction
    await db.transaction(async (tx: any) => {
      // Delete playlist songs first
      await tx
        .delete(playlistSongs)
        .where(eq(playlistSongs.playlistId, playlistId))
        .execute()

      // Delete playback settings
      await tx
        .delete(playbackSettings)
        .where(
          and(
            eq(playbackSettings.entityType, 'playlist'),
            eq(playbackSettings.entityId, playlistId),
          ),
        )
        .execute()

      // Delete play history
      await tx
        .delete(playHistory)
        .where(eq(playHistory.playlistId, playlistId))
        .execute()

      // Finally delete the playlist itself
      await tx.delete(playlists).where(eq(playlists.id, playlistId)).execute()
    })

    return true
  } catch (error) {
    console.error('Error in deletePlaylist:', error)
    return false
  }
}

const setPlaylistSettings = async (
  playlistId: number,
  settings: {
    isShuffleEnabled: boolean
    repeatMode: 'none' | 'one' | 'all'
  },
) => {
  try {
    await db
      .insert(playbackSettings)
      .values({
        entityType: 'playlist',
        entityId: playlistId,
        isShuffleEnabled: settings.isShuffleEnabled,
        repeatMode: settings.repeatMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute()
  } catch (error) {
    console.error('Error in setPlaylistSettings:', error)
  }
}

const updatePlaylistSettings = async (
  playlistId: number,
  settings: {
    isShuffleEnabled: boolean
    repeatMode: 'none' | 'one' | 'all'
  },
) => {
  try {
    const updatedRows = await db
      .update(playbackSettings)
      .set({
        isShuffleEnabled: settings.isShuffleEnabled,
        repeatMode: settings.repeatMode,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(playbackSettings.entityType, 'playlist'),
          eq(playbackSettings.entityId, playlistId),
        ),
      )
      .returning()
      .execute()

    // Format the response to match MobX model
    const formattedSettings = updatedRows[0]
      ? {
          id: updatedRows[0].id,
          playlistId: updatedRows[0].entityId,
          isShuffleEnabled: updatedRows[0].shuffle === 1,
          repeatMode: updatedRows[0].repeatMode,
          lastPlayedSongId: updatedRows[0].lastPlayedSongId,
          createdAt: updatedRows[0].createdAt,
          updatedAt: updatedRows[0].updatedAt,
        }
      : null

    return formattedSettings
  } catch (error) {
    console.error('Error in updatePlaylistSettings:', error)
    return null
  }
}

const loadArtists = async () => {
  try {
    const results = await db.select().from(artists).execute()
    return results
  } catch (error) {
    console.error('Error in loadArtists:', error)
  }
}

const loadAlbums = async () => {
  try {
    const results = await db
      .select({
        album: {
          id: albums.id,
          title: albums.title,
          artistId: albums.artistId,
          releaseDate: albums.releaseDate,
          categories: albums.categories,
          coverArt: albums.coverArt,
          totalTracks: albums.totalTracks,
          rating: albums.rating,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
        },
        artist: {
          id: artists.id,
          name: artists.name,
        },
      })
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      .execute()
    return results
  } catch (error) {
    console.error('Error in loadAlbums:', error)
  }
}

const loadSongs = async () => {
  try {
    const results = await db
      .select({
        song: {
          id: songs.id,
          title: songs.title,
          artistId: songs.artistId,
          albumId: songs.albumId,
          duration: songs.duration,
          categories: songs.categories,
          audioUrl: songs.audioUrl,
          coverArt: songs.coverArt,
          playCount: songs.playCount,
          rating: songs.rating,
          createdAt: songs.createdAt,
          updatedAt: songs.updatedAt,
        },
        artist: {
          id: artists.id,
          name: artists.name,
        },
        album: {
          id: albums.id,
          title: albums.title,
          artistId: albums.artistId,
          releaseDate: albums.releaseDate,
          categories: albums.categories,
          coverArt: albums.coverArt,
          totalTracks: albums.totalTracks,
          rating: albums.rating,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
        },
      })
      .from(songs)
      .innerJoin(albums, eq(songs.albumId, albums.id))
      .innerJoin(artists, eq(songs.artistId, artists.id))
      .execute()
    return results
  } catch (error) {
    console.error('Error in loadSongs:', error)
  }
}

// Playlist Song Management
export const addSongToPlaylist = async (playlistId: number, songId: number) => {
  try {
    const playlist = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!playlist.length) {
      return false
    }

    let songIds = JSON.parse(playlist[0].songIds) || null
    if (songIds) {
      if (songIds.includes(songId)) {
        console.log('Song already in playlist')
        return false
      } else {
        songIds.push(songId)
      }
    } else {
      songIds = [songId]
    }
    await db
      .update(playlists)
      .set({ songIds: JSON.stringify(songIds) })
      .where(eq(playlists.id, playlistId))
      .execute()
    return true
  } catch (error) {
    console.error('Error in addSongToPlaylist:', error)
    return false
  }
}

export const removeSongFromPlaylist = async (
  playlistId: number,
  songId: number,
) => {
  try {
    const playlist = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .execute()
    if (!playlist.length) {
      return false
    }

    const playlistSongs = JSON.parse(playlist[0].songIds)
    const newSongIds = playlistSongs.filter((id: number) => id !== songId)

    await db
      .update(playlists)
      .set({ songIds: JSON.stringify(newSongIds) })
      .where(eq(playlists.id, playlistId))
      .execute()

    return true
  } catch (error) {
    console.error('Error in removeSongFromPlaylist:', error)
    return false
  }
}

// Add new functions for artist and album playback settings
export const getArtistPlaybackSettings = async (artistId: number) => {
  try {
    const results = await db
      .select()
      .from(playbackSettings)
      .where(
        and(
          eq(playbackSettings.entityType, 'artist'),
          eq(playbackSettings.entityId, artistId),
        ),
      )
      .execute()
    return results[0] || null
  } catch (error) {
    console.error('Error in getArtistPlaybackSettings:', error)
    return null
  }
}

export const getAlbumPlaybackSettings = async (albumId: number) => {
  try {
    const results = await db
      .select()
      .from(playbackSettings)
      .where(
        and(
          eq(playbackSettings.entityType, 'album'),
          eq(playbackSettings.entityId, albumId),
        ),
      )
      .execute()
    return results[0] || null
  } catch (error) {
    console.error('Error in getAlbumPlaybackSettings:', error)
    return null
  }
}

// Add new functions for playback settings
export const getPlaybackSettings = async (
  entityType: 'artist' | 'album' | 'playlist',
  entityId: number,
) => {
  try {
    const results = await db
      .select()
      .from(playbackSettings)
      .where(
        and(
          eq(playbackSettings.entityType, entityType),
          eq(playbackSettings.entityId, entityId),
        ),
      )
      .execute()
    return results[0] || null
  } catch (error) {
    console.error('Error in getPlaybackSettings:', error)
    return null
  }
}

export const updatePlaybackSettings = async (
  entityType: 'artist' | 'album' | 'playlist',
  entityId: number,
  settings: {
    shuffle?: boolean
    repeatMode?: 'repeat-one' | 'repeat-all' | 'none'
    lastPlayedSongId?: number | null
  },
) => {
  try {
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

    const results = await db
      .update(playbackSettings)
      .set(updateData)
      .where(
        and(
          eq(playbackSettings.entityType, entityType),
          eq(playbackSettings.entityId, entityId),
        ),
      )
      .returning()
      .execute()

    // Format the response to match MobX model
    const formattedSettings = results[0]
      ? {
          id: results[0].id,
          playlistId: results[0].entityId,
          isShuffleEnabled: results[0].shuffle === 1,
          repeatMode: results[0].repeatMode,
          lastPlayedSongId: results[0].lastPlayedSongId,
          createdAt: results[0].createdAt,
          updatedAt: results[0].updatedAt,
        }
      : null

    return formattedSettings
  } catch (error) {
    console.error('Error in updatePlaybackSettings:', error)
    return null
  }
}

export const createPlaybackSettings = async (data: {
  entityType: 'artist' | 'album' | 'playlist'
  entityId: number
  shuffle?: boolean
  repeatMode?: 'repeat-one' | 'repeat-all' | 'none'
}) => {
  try {
    const results = await db
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
      .execute()

    return results[0] || null
  } catch (error) {
    console.error('Error in createPlaybackSettings:', error)
    return null
  }
}

export const queries = {
  isDatabaseInitialized,
  getUserByEmail,
  getUserById,
  getFavoriteSongIds,
  addToFavorites,
  removeFromFavorites,
  getPlaylistsByUserId,
  getPlaylistById,
  getRecentlyPlayed,
  getFavorites,
  getPlaylistSongs,
  updatePlayHistory,
  getMusicCategories,
  toggleFavorites,
  updateFavorites,
  setCurrentPlaylist,
  updateRecentlyPlayed,
  fetchUserPlaylists,
  fetchTopAlbums,
  addToRecentlyPlayed,
  updatePlayCompletion,
  createPlaylist,
  setPlaylistSettings,
  deletePlaylist,
  updatePlaylistSettings,
  loadArtists,
  loadAlbums,
  loadSongs,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getArtistPlaybackSettings,
  getAlbumPlaybackSettings,
  getPlaybackSettings,
  updatePlaybackSettings,
  createPlaybackSettings,
}
