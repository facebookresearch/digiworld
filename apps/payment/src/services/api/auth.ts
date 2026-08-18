// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { User } from '@/models/types'

export interface LoginResponse {
  success: boolean
  user?: User
  error?: string
  token?: string
}

/**
 * Simulates an API call to authenticate user
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  // Ensure the database is initialized before any operation
  const isInitialized = await queries.isDatabaseInitialized()
  if (!isInitialized) {
    return {
      success: false,
      error: 'Database not intilized',
    }
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    // Query the database for the user
    const user = await queries.getUserByEmail(email)

    // Check if user exists and password matches
    if (!user || user.password !== password) {
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    // In a real app, we would get this from the backend
    const token = 'dummy-jwt-token-' + user.id

    return {
      success: true,
      user: user as User,
      token,
    }
  } catch (error) {
    return {
      success: false,
      error: 'An error occurred during login',
    }
  }
}

/**
 * Simulates an API call to validate token
 */
export async function validateToken(token: string): Promise<boolean> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // In a real app, we would validate with backend
  return token.startsWith('dummy-jwt-token-')
}

/**
 * Simulates an API call to logout
 */

export async function logoutUser(_token: string): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // In a real app, we would invalidate the token on the backend
}
