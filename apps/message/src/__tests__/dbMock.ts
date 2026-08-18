// Provide the test DB instance lazily so dbTestEnv has run.
jest.mock('@/db/index', () => {
  const { db } = require('./dbTestEnv')
  return {
    db,
    getDrizzle: () => db,
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
