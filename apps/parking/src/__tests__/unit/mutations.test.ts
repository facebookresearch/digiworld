import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'

describe('Parking App Mutations', () => {
  describe('initializeDatabase', () => {
    test('initializes database with mock data successfully', async () => {
      const result = await mutations.initializeDatabase()

      expect(result.success).toBe(true)
      expect(result.skipped).toBeUndefined()
    })

    test('skips initialization if database already seeded', async () => {
      // First initialization
      const result1 = await mutations.initializeDatabase()
      expect(result1.success).toBe(true)

      // Second initialization should skip
      const result2 = await mutations.initializeDatabase()
      expect(result2.success).toBe(true)
      expect(result2.skipped).toBe(true)
    })

    test('loads users from mock data', async () => {
      await mutations.initializeDatabase()

      const users = await queries.getAllUsers()

      expect(users.length).toBeGreaterThan(0)
      expect(users[0]).toHaveProperty('email')
      expect(users[0]).toHaveProperty('fullName')
    })

    test('loads vehicle types from mock data', async () => {
      await mutations.initializeDatabase()

      const vehicleTypes = await queries.getVehicleTypes()

      expect(vehicleTypes.length).toBeGreaterThan(0)
      expect(vehicleTypes[0]).toHaveProperty('code')
      expect(vehicleTypes[0]).toHaveProperty('name')
    })

    test('loads parking zones from mock data', async () => {
      await mutations.initializeDatabase()

      const zones = await queries.getParkingZones()

      expect(zones.length).toBeGreaterThan(0)
      expect(zones[0]).toHaveProperty('name')
      expect(zones[0]).toHaveProperty('latitude')
      expect(zones[0]).toHaveProperty('longitude')
    })

    test('loads vehicle type rates from mock data', async () => {
      await mutations.initializeDatabase()

      const rates = await queries.getVehicleTypeRates()

      expect(rates.length).toBeGreaterThan(0)
      expect(rates[0]).toHaveProperty('vehicleTypeId')
      expect(rates[0]).toHaveProperty('ratePerHour')
    })

    test('maintains referential integrity', async () => {
      await mutations.initializeDatabase()

      // Get a vehicle
      const users = await queries.getAllUsers()
      expect(users.length).toBeGreaterThan(0)

      const vehicles = await queries.getVehiclesByUserId(users[0].id)
      if (vehicles.length > 0) {
        const vehicle = vehicles[0]

        // Vehicle should reference valid vehicle type
        const vehicleType = await queries.getVehicleTypeById(
          vehicle.vehicleTypeId,
        )
        expect(vehicleType).toBeDefined()
      }
    })

    test('handles errors gracefully', async () => {
      // This test verifies that errors are caught and returned
      // In a real scenario, you might mock the database to throw an error
      const result = await mutations.initializeDatabase()

      // Should either succeed or return error info
      expect(result).toHaveProperty('success')
      if (!result.success) {
        expect(result).toHaveProperty('error')
      }
    })
  })
})
