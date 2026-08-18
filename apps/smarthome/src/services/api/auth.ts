// Copyright (c) Meta Platforms, Inc. and affiliates.
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'

interface LoginResponse {
  user: {
    id: number
    username: string
    email: string
    name: string
    bio: string | null
    avatar: string | null
    password: string
    created_at: string
    updated_at: string
    deleted_at: string | null
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

      // Smart home user data - no music app fields needed

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
          name: result.name || '',
          bio: result.bio,
          avatar: result.avatar,
          password: result.password,
          created_at: result.created_at,
          updated_at: result.updated_at,
          deleted_at: result.deleted_at,
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
          avatar: '',
          bio: '',
          created_at: now,
          updated_at: now,
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
          name: '',
          bio: result.bio,
          avatar: result.avatar,
          password: result.password,
          created_at: result.created_at,
          updated_at: result.updated_at,
          deleted_at: result.deleted_at,
        },
        token,
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  },
}
