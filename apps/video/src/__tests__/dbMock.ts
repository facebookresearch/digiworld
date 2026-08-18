// Provide the test DB instance lazily so dbTestEnv has run.
jest.mock('@/db/index', () => {
  const { db } = require('./dbTestEnv')
  return { db }
})

jest.mock('@/db/index', () => {
  const { db } = require('./dbTestEnv')
  return { db }
})

export {}
