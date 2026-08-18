import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'

interface LoginResponse {
  user: {
    id: number
    username: string
    email: string | null
    name: string | null
    password: string
    sellerRating: number
    totalSales: number
    totalItemsListed: number
    createdAt: string
    updatedAt: string | null
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
          email: result.email || null,
          name: result.name || null,
          password: result.password || '',
          sellerRating: result.sellerRating || 0,
          totalSales: result.totalSales || 0,
          totalItemsListed: result.totalItemsListed || 0,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt || null,
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
          name: userData.username, // Use username as name for now
          sellerRating: 0,
          totalSales: 0,
          totalItemsListed: 0,
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
          email: result.email || null,
          name: result.name || null,
          password: result.password || '',
          sellerRating: result.sellerRating || 0,
          totalSales: result.totalSales || 0,
          totalItemsListed: result.totalItemsListed || 0,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt || null,
        },
        token,
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  },
}
