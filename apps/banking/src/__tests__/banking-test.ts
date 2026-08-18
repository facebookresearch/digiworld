import { createTempDB, cleanupTempDB } from './helpers'
import { queries } from '@/db/queries'
import { createBankingStore } from '@/models/BankingStore'

let db: any

beforeAll(() => {
  db = createTempDB()
})

afterAll(() => {
  cleanupTempDB(db)
})

test('read users from fixture DB', async () => {
  const allUsers = await queries.getAllUsers()
  expect(allUsers.length).toBeGreaterThan(0)
})

test('BankingStore transfer updates balances', async () => {
  const store = createBankingStore()
  // example test
  const result = await store.transferFunds(1, 2, 50)
  expect(result.success).toBe(true)
})
