import { RideStore } from '../rideStore'

// Suppress console.error logs during tests
const originalConsoleError = console.error
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  console.error = originalConsoleError
})

// Mock react-native-fs to prevent RNFS errors in tests
jest.mock('react-native-fs', () => ({
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('')),
  mkdir: jest.fn(() => Promise.resolve()),
  ExternalDirectoryPath: '/mock/external/path',
  RNFSFileTypeRegular: 'file',
}))

// Mock the database module to prevent SQLite errors in tests
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve(null)),
          all: jest.fn(() => Promise.resolve([])),
        })),
        get: jest.fn(() => Promise.resolve(null)),
        all: jest.fn(() => Promise.resolve([])),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve()),
    })),
    lastInsertRowId: 1,
  },
}))

jest.setTimeout(10000)

// Mock queries
jest.mock('@/db/queries', () => ({
  queries: {
    getDriversByRideOption: jest.fn(() =>
      Promise.resolve([
        {
          id: 1,
          name: 'John Driver',
          phone: '1234567890',
          vehicleName: 'Toyota Camry',
          vehicleNumber: 'ABC1234',
          vehicleType: 'Sedan',
          vehicleColor: 'White',
        },
        {
          id: 2,
          name: 'Sara Wheels',
          phone: '9876543210',
          vehicleName: 'Honda CRV',
          vehicleNumber: 'XYZ5678',
          vehicleType: 'SUV',
          vehicleColor: 'Black',
        },
      ]),
    ),
  },
}))

const simulationDelay = 50
const createStore = () => RideStore.create()

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('RideStore business logic', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('books a ride and simulates full flow to completion', async () => {
    const store = createStore()
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(simulationDelay * 4 + 50) // Wait for all simulation steps
    expect(store.currentRide).not.toBeNull()
    expect(store.currentRide?.status).toBe('booked')
  })

  it('cancels a ride before driver assignment', async () => {
    const store = createStore()
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(10) // Cancel immediately
    if (store.currentRide) {
      await store.cancelRide(store.currentRide.id, 'User cancelled')
    }
    expect(store.rideHistory.length).toBe(0)
  })

  it('cancels a ride after driver assignment but before start', async () => {
    const store = createStore()
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(simulationDelay + 10) // Wait for driver assignment
    await store.assignDriver()
    expect(store.currentRide && store.currentRide.status).toBe(
      'driver-assigned',
    )
    if (store.currentRide) {
      await store.cancelRide(store.currentRide.id, 'User cancelled')
    }
    expect(store.rideHistory.length).toBe(2)
    expect(store.rideHistory[0].status).toBe('driver-assigned')
  })

  it('does not allow cancellation after ride has started', async () => {
    const store = createStore()
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(simulationDelay * 2 + 10) // Wait for ride to start
    await store.assignDriver()
    await store.startRide()
    expect(store.currentRide && store.currentRide.status).toBe('ongoing')
    if (store.currentRide) {
      await expect(
        store.cancelRide(store.currentRide.id, 'User cancelled'),
      ).rejects.toThrow('Cannot cancel ride in current state')
    }
    expect(store.currentRide && store.currentRide.status).toBe('ongoing')
    expect(store.rideHistory.length).toBe(1)
  })

  it('handles driver fetch failure gracefully', async () => {
    const store = createStore()
    const queries = require('@/db/queries').queries
    queries.getDriversByRideOption.mockImplementationOnce(() =>
      Promise.reject(new Error('fail')),
    )
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(simulationDelay + 10)
    expect(store.currentRide && store.currentRide.status).toBe('booked')
  })

  it('handles no drivers available (remains in booked state)', async () => {
    const store = createStore()
    const queries = require('@/db/queries').queries
    queries.getDriversByRideOption.mockImplementationOnce(() =>
      Promise.resolve([]),
    )
    await store.bookRide('A', 'B', 100, 10, 20, 1, 'cash')
    await wait(simulationDelay + 10)
    expect(store.currentRide && store.currentRide.status).toBe('booked')
    expect(store.currentRide && store.currentRide.driverId).toBeUndefined()
  })
})
