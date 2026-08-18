// Copyright (c) Meta Platforms, Inc. and affiliates.
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'

interface LoginResponse {
  user: {
    id: number
    username: string
    email: string
    fullName: string
    phoneNumber: string
    accountTierId: number
    pin: string | null
    securityQuestion: string | null
    securityAnswer: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
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
          email: result.email,
          fullName: result.fullName,
          phoneNumber: result.phoneNumber,
          accountTierId: result.accountTierId,
          pin: result.pin,
          securityQuestion: result.securityQuestion,
          securityAnswer: result.securityAnswer,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: result.deletedAt,
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
          fullName: userData.username, // Use username as fullName for now
          phoneNumber: '', // Default empty phone number
          accountTierId: 1, // Default to tier 1
          pin: null,
          securityQuestion: null,
          securityAnswer: null,
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
          fullName: result.fullName,
          phoneNumber: result.phoneNumber,
          accountTierId: result.accountTierId,
          pin: result.pin,
          securityQuestion: result.securityQuestion,
          securityAnswer: result.securityAnswer,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: result.deletedAt,
        },
        token,
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  },
}
