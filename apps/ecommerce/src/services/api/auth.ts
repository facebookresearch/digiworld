// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db/index' // Import your database instance
import { users } from '@/db/schema' // Import your user schema
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/utils/password' // Import your password utilities
import { encode } from 'base-64'

export interface AuthResponse {
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    role: string
    dateJoined: any
    createdAt?: any
    updatedAt?: any
  }
  token: string
}

export const authService = {
  async createUser(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing.length > 0) {
      throw new Error('Email already registered')
    }

    // Split full name and handle empty last name
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    const now = new Date()

    // Hash password and create user
    const result = await db
      .insert(users)
      .values({
        email,
        password,
        firstName,
        lastName,
        dateJoined: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const user = result[0]
    const token = encode(`${user.id}:${user.email}`)

    // Return user object that exactly matches MST model
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: null,
        profilePicture: null,
        cartId: null,
        dateJoined: now.toISOString(), // Serialize date
        wishlistIds: [],
      },
      token,
    }
  },

  async loginUser(email: string, password: string) {
    const results = await db.select().from(users).where(eq(users.email, email))
    const user = results[0]
    if (!user) {
      throw new Error('User not found')
    }

    const isValid = verifyPassword(password, hashPassword(user.password))
    if (!isValid) {
      throw new Error('Invalid password')
    }

    return user
  },

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      return results.length > 0
    } catch (error) {
      console.error('Failed to check email existence:', error)
      throw error
    }
  },
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const user = await authService.loginUser(email, password)
    if (!user) {
      throw new Error('Authentication failed')
    }
    // For demo purposes, we're using a simple token. In production, use JWT or similar
    const token = encode(`${user.id}:${user.email}`)
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'user',
        dateJoined: user.dateJoined,
        createdAt: user.createdAt?.toString(),
        updatedAt: user.updatedAt?.toString(),
      },
      token,
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Authentication failed',
    )
  }
}

export async function logoutUser(): Promise<void> {
  // In a real app, this would invalidate the token on the server
  return Promise.resolve()
}

export async function validateToken(): Promise<boolean> {
  // In a real app, this would validate the token with the server
  return Promise.resolve(true)
}

export async function registerUser(userData: {
  email: string
  password: string
  firstName: string
  lastName: string
}) {
  try {
    const db = await getDBConnection()

    // First create the user
    const result = await db.executeSql(
      `INSERT INTO users (email, password, first_name, last_name, date_joined) 
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
      ],
    )

    const userId = result[0].insertId

    // Initialize empty wishlist for the user
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS wishlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    )

    // Return the created user with empty wishlist
    return {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateJoined: new Date(),
      wishlistIds: [],
    }
  } catch (error) {
    console.error('Failed to register user:', error)
    throw error
  }
}
