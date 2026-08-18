// Copyright (c) Meta Platforms, Inc. and affiliates.
import './dbMock'
import { createUserStore } from '../models/UserStore'
import { getSingleId } from './dbTestEnv'

/**
 * Integration tests for UserStore against the real test DB.
 * Focuses on register → fetchProfile → updatePassword flows.
 */

describe('UserStore integration', () => {
  const store = createUserStore()

  it('registers a new user', async () => {
    const email = `test${Date.now()}@example.com`
    await store.register({
      email,
      username: `u${Date.now()}`,
      password: 'secret',
    })
    expect(store.user).not.toBeNull()
    expect(store.user?.email).toBe(email)
    expect(store.isAuthenticated).toBe(true)
  })

  it('fetchProfile hydrates existing user', async () => {
    const userId = store.user?.id || (await getSingleId('users'))
    await store.fetchProfile(userId as number)
    expect(store.user?.id).toBe(userId)
  })

  it('loadInitialData fetches history (empty array initially)', async () => {
    await store.loadInitialData()
    expect(Array.isArray(store.recentlyPlayed)).toBe(true)
  })

  it('updateProfile changes name and email', async () => {
    const newName = 'Updated Name'
    const newEmail = `updated_${Date.now()}@example.com`
    await store.updateProfile({ username: newName, email: newEmail })
    expect(store.user?.username).toBe(newName)
    expect(store.user?.email).toBe(newEmail)
  })

  it('updatePassword returns true', async () => {
    const ok = await store.updatePassword('secret', 'supersecret')
    expect(ok).toBe(true)
  })

  it('updatePassword returns false', async () => {
    const ok = await store.updatePassword('wrong', 'doesntmatter')
    expect(ok).toBe(false)
  })
})
