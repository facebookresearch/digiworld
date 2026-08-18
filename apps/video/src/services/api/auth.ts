import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'

interface RecentlyPlayed {
  songId: number
  playedAt: string
}

interface LoginResponse {
  user: {
    id: number
    username: string
    email: string
    profilePicture: string | null
    favoriteCategories: string[]
    favoriteSongIds: number[]
    recentlyPlayed: RecentlyPlayed[]
    createdAt: string
    updatedAt: string
  }
  token: string
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse | null> {
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      if (!results.length) {
        console.log('No user found')
        return null
      }
      const result = results[0]

      const isValidPassword = password === result.password
      if (!isValidPassword) {
        return null
      }

      // Parse JSON fields with type checking
      let favoriteCategories: string[] = []
      let favoriteSongIds: number[] = []
      let recentlyPlayed: RecentlyPlayed[] = []

      try {
        favoriteCategories = JSON.parse(result.favoriteCategories || '[]')
        favoriteSongIds = JSON.parse(result.favoriteSongIds || '[]')
        recentlyPlayed = JSON.parse(result.recentlyPlayed || '[]')
        // Normalize the recentlyPlayed data format
        recentlyPlayed = recentlyPlayed.map((item: any) => ({
          songId: item.song_id,
          playedAt: item.played_at,
        }))
      } catch (e) {
        console.error('Error parsing JSON fields:', e)
        // Use defaults if parsing fails
      }

      // Generate a dummy token for now
      // In a real app, you would use JWT or another token system
      const token = 'dummy-token'
      console.log(
        `Login successful for user ${result.id}, isValidPassword: ${isValidPassword}, token: ${token}`,
      )
      return {
        user: {
          id: result.id,
          username: result.username,
          email: result.email,
          profilePicture: result.profilePicture,
          favoriteCategories,
          favoriteSongIds,
          recentlyPlayed,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        token,
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  async signup(userData: {
    username: string
    email: string
    password: string
  }): Promise<LoginResponse> {
    try {
      const now = new Date().toISOString()
      const result = await db
        .insert(users)
        .values({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          favoriteCategories: '[]',
          favoriteSongIds: '[]',
          recentlyPlayed: '[]',
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()

      // Generate a dummy token for now
      // In a real app, you would use JWT or another token system
      const token = 'dummy-token'

      return {
        user: {
          id: result.id,
          username: result.username,
          email: result.email,
          profilePicture: result.profilePicture,
          favoriteCategories: [],
          favoriteSongIds: [],
          recentlyPlayed: [],
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        token,
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  },
}
