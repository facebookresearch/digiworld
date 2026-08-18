// Copyright (c) Meta Platforms, Inc. and affiliates.
import { makeAutoObservable } from 'mobx'
import { mutations } from '../db/mutations'
import { hash, verify } from '../utils/password'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

export class AuthStore {
  user: User | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setUser(user: User | null) {
    this.user = user
  }

  async login(email: string, password: string) {
    this.isLoading = true
    this.error = null

    try {
      const result = await mutations.findUserByEmail(email)
      if (!result.success || !result.user) {
        throw new Error('Invalid email or password')
      }

      const isValid = await verify(password, result.user.password)
      if (!isValid) {
        throw new Error('Invalid email or password')
      }

      this.setUser({
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      })

      return true
    } catch (error) {
      this.error = error.message
      return false
    } finally {
      this.isLoading = false
    }
  }

  async signup(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) {
    this.isLoading = true
    this.error = null

    try {
      const hashedPassword = await hash(password)
      const result = await mutations.addUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      })

      if (!result.success) {
        throw new Error('Failed to create account')
      }

      this.setUser({
        id: result.id,
        email,
        firstName,
        lastName,
      })

      return true
    } catch (error) {
      this.error = error.message
      return false
    } finally {
      this.isLoading = false
    }
  }

  logout() {
    this.user = null
  }
}
