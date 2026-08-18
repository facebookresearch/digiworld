import './dbMock'
import { UserStoreModel } from '../models/UserStore'

describe('UserStore integration', () => {
  let store: any

  beforeEach(() => {
    // Create a fresh store instance for each test
    store = UserStoreModel.create({
      currentUser: null,
      authToken: null,
    })
  })

  test('store initializes correctly', () => {
    expect(store.currentUser).toBeNull()
    expect(store.authToken).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  test('login sets user and token', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    const token = 'test-auth-token'

    await store.login(user, token)

    expect(store.currentUser).toEqual(user)
    expect(store.authToken).toBe(token)
    expect(store.isAuthenticated).toBe(true)
  })

  test('logout clears user and token', async () => {
    // First login
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    const token = 'test-auth-token'
    await store.login(user, token)

    // Then logout
    await store.logout()

    expect(store.currentUser).toBeNull()
    expect(store.authToken).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  test('updateUserProfile updates user data', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    const updatedProfile = {
      name: 'Updated Name',
      avatarUrl: 'https://example.com/new-avatar.jpg',
    }

    store.updateUserProfile(updatedProfile)

    expect(store.currentUser?.name).toBe('Updated Name')
    expect(store.currentUser?.avatarUrl).toBe(
      'https://example.com/new-avatar.jpg',
    )
    expect(store.currentUser?.id).toBe('test-user') // Should remain unchanged
  })

  test('userInitials returns correct initials', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.userInitials).toBe('JD')
  })

  test('userInitials handles single name', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.userInitials).toBe('JO') // Takes first 2 characters for single name
  })

  test('userInitials handles no name', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: null,
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.userInitials).toBe('')
  })

  test('displayName returns user name or phone number', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.displayName).toBe('John Doe')
  })

  test('displayName falls back to default', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: null,
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.displayName).toBe('User') // Falls back to 'User' not phone number
  })

  test('phoneNumber returns user phone number', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.phoneNumber).toBe('+1234567890')
  })

  test('avatarUrl returns user avatar URL', async () => {
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: Date.now(),
    }
    await store.login(user, 'token')

    expect(store.avatarUrl).toBe('https://example.com/avatar.jpg')
  })

  test('lastLoggedIn returns user last logged in timestamp', async () => {
    const timestamp = Date.now()
    const user = {
      id: 'test-user',
      phoneNumber: '+1234567890',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastLoggedIn: timestamp,
    }
    await store.login(user, 'token')

    expect(store.lastLoggedIn).toBe(timestamp)
  })

  test('restore restores user store from snapshot', async () => {
    const snapshot = {
      currentUser: {
        id: 'restored-user',
        phoneNumber: '+9876543210',
        name: 'Restored User',
        avatarUrl: 'https://example.com/restored.jpg',
        lastLoggedIn: Date.now(),
      },
      authToken: 'restored-token',
    }

    store.restore(snapshot)

    expect(store.currentUser).toEqual(snapshot.currentUser)
    expect(store.authToken).toBe(snapshot.authToken)
  })

  test('restore handles invalid snapshot gracefully', async () => {
    const invalidSnapshot = {
      invalidField: 'invalid value',
    }

    // Should not throw error
    expect(() => store.restore(invalidSnapshot)).not.toThrow()
  })
})
