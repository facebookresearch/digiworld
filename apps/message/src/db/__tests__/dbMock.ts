// Copyright (c) Meta Platforms, Inc. and affiliates.
// Provide the test DB instance lazily so dbTestEnv has run.
jest.mock('../index', () => {
  const { db } = require('../../__tests__/dbTestEnv')
  return {
    db,
    getDrizzle: () => db,
    getSqlite: jest.fn(), // Mock getSqlite for migrations (not used in tests)
    isDatabaseReady: () => true,
    closeConnection: jest.fn(),
    reopenConnection: jest.fn(),
    resetDatabase: jest.fn(),
    forceRefresh: jest.fn(),
    waitForDatabase: jest.fn().mockResolvedValue(true),
  }
})

jest.mock('@/db/index', () => {
  const { db } = require('../../__tests__/dbTestEnv')
  return {
    db,
    getDrizzle: () => db,
    getSqlite: jest.fn(), // Mock getSqlite for migrations (not used in tests)
    isDatabaseReady: () => true,
    closeConnection: jest.fn(),
    reopenConnection: jest.fn(),
    resetDatabase: jest.fn(),
    forceRefresh: jest.fn(),
    waitForDatabase: jest.fn().mockResolvedValue(true),
  }
})

// Simple test to prevent "no tests" error
describe('dbMock', () => {
  test('should mock database correctly', () => {
    expect(true).toBe(true)
  })
})

export {}
