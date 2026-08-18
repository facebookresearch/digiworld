import { setupFreshDB, teardownTestDB } from './helpers'
import { queries } from '../db/queries'
import { createBankingStore } from '@/models/BankingStore'

let db: any

beforeAll(() => {
  db = setupFreshDB()
})

afterAll(() => {
  teardownTestDB(db)
})

test('all accounts seeded correctly', async () => {
  const accounts = await queries.getAccounts()
  expect(accounts.length).toBeGreaterThan(0)
})

test('transactions execute correctly', async () => {
  const store = createBankingStore()
  const result = await store.transferFunds(1, 2, 100)
  expect(result.success).toBe(true)
})
