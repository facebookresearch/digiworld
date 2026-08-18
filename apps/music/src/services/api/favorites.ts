import { eq, and } from 'drizzle-orm'
import { favorites } from '@/db/schema'
import { db } from '@/db'

export const favoritesService = {
  async getFavoriteSongIds(userId: number): Promise<number[]> {
    try {
      const result = await db
        .select({ songId: favorites.songId })
        .from(favorites)
        .where(eq(favorites.userId, userId))
      return result.map((row: { songId: number }) => row.songId)
    } catch (error) {
      console.error('Error getting favorite songs:', error)
      return []
    }
  },

  async addToFavorites(userId: number, songId: number): Promise<void> {
    try {
      await db.insert(favorites).values({
        userId,
        songId,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error adding song to favorites:', error)
      throw error
    }
  },

  async removeFromFavorites(userId: number, songId: number): Promise<void> {
    try {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
    } catch (error) {
      console.error('Error removing song from favorites:', error)
      throw error
    }
  },
}
