// Copyright (c) Meta Platforms, Inc. and affiliates.
import './dbMock'
import { SessionStore } from '../models/SessionStore'

// Mock the getLatestInteraction function
jest.mock('@andojo/shared-interaction-tracking', () => ({
  getLatestInteraction: () => ({
    data: {
      screenName: 'TestScreen',
      route: '/test',
      metadata: { test: 'data' },
    },
  }),
}))

describe('SessionStore integration', () => {
  const store = SessionStore.create({
    session: null,
  })

  beforeEach(() => {
    // Clear session before each test
    store.clearAllSessions()
  })

  test('handleDeepLink creates new session', () => {
    const sessionId = 'test-session-1'
    const session = store.handleDeepLink(sessionId)

    expect(session).toBeDefined()
    expect(session.id).toBe(sessionId)
    expect(session.data.screenName).toBeDefined()
    expect(session.data.route).toBeDefined()
    expect(session.data.startTime).toBeGreaterThan(0)
    expect(session.data.timestamp).toBeGreaterThan(0)
  })

  test('handleDeepLink replaces existing session with new one', () => {
    const sessionId1 = 'test-session-2'
    const sessionId2 = 'test-session-3'

    // Create first session
    const session1 = store.handleDeepLink(sessionId1)
    expect(store.session).toBe(session1)

    // Create second session (should replace the first)
    const session2 = store.handleDeepLink(sessionId2)
    expect(store.session).toBe(session2)
    expect(store.session).not.toBe(session1)
  })

  test('getSession returns current session', () => {
    const sessionId = 'test-session-4'
    const createdSession = store.handleDeepLink(sessionId)

    const retrievedSession = store.getSession()

    expect(retrievedSession).toBe(createdSession)
  })

  test('getSession returns null when no session exists', () => {
    const retrievedSession = store.getSession()

    expect(retrievedSession).toBeNull()
  })

  test('clearAllSessions removes current session', () => {
    // Create a session
    store.handleDeepLink('session-1')
    expect(store.session).toBeDefined()

    store.clearAllSessions()

    expect(store.session).toBeNull()
  })

  test('restore restores session from data', () => {
    const sessionData = {
      session: {
        id: 'restored-session-1',
        data: {
          screenName: 'RestoredScreen',
          route: '/restored',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          sessionData: { key: 'value' },
          action: 'restored',
          timestamp: Date.now(),
        },
      },
    }

    store.restore(sessionData)

    expect(store.session).toBeDefined()
    expect(store.session?.id).toBe('restored-session-1')
  })

  test('restore handles partial data gracefully', () => {
    const partialData = {
      session: {
        id: 'partial-session',
        data: {
          screenName: 'PartialScreen',
          route: '/partial',
          startTime: Date.now(),
          timestamp: Date.now(),
        },
      },
    }

    // Should not throw error
    expect(() => store.restore(partialData)).not.toThrow()
  })

  test('session data structure is correct', () => {
    const sessionId = 'test-session-6'
    const session = store.handleDeepLink(sessionId)

    expect(session.data).toHaveProperty('screenName')
    expect(session.data).toHaveProperty('route')
    expect(session.data).toHaveProperty('startTime')
    expect(session.data).toHaveProperty('endTime')
    expect(session.data).toHaveProperty('sessionData')
    expect(session.data).toHaveProperty('action')
    expect(session.data).toHaveProperty('timestamp')
  })

  test('session timestamps are valid', () => {
    const sessionId = 'test-session-7'
    const beforeCreate = Date.now()
    const session = store.handleDeepLink(sessionId)
    const afterCreate = Date.now()

    expect(session.data.startTime).toBeGreaterThanOrEqual(beforeCreate)
    expect(session.data.startTime).toBeLessThanOrEqual(afterCreate)
    expect(session.data.timestamp).toBeGreaterThanOrEqual(beforeCreate)
    expect(session.data.timestamp).toBeLessThanOrEqual(afterCreate)
  })

  test('only one session can exist at a time', () => {
    const session1 = store.handleDeepLink('single-session-1')
    const session2 = store.handleDeepLink('single-session-2')

    expect(store.session).toBe(session2)
    expect(store.session).not.toBe(session1)
    expect(store.session?.id).toBe('single-session-2')
  })
})
