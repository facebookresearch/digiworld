import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'

// Helper function to get or create vehicle type
async function getOrCreateVehicleType(
  code: string,
  name: string,
  description?: string,
) {
  const existing = await queries.getVehicleTypeByCode(code)
  if (existing) {
    return existing
  }
  return await queries.createVehicleType({ code, name, description })
}

describe('Parking App Queries', () => {
  beforeEach(async () => {
    // Initialize database with mock data before each test
    await mutations.initializeDatabase()
  })

  describe('User Queries', () => {
    test('createUser creates a new user successfully', async () => {
      const userData = {
        email: 'testuser@example.com',
        password: 'password123',
        fullName: 'Test User',
        phoneNumber: '123-456-7890',
      }

      const user = await queries.createUser(userData)

      expect(user).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.fullName).toBe(userData.fullName)
      expect(user.phoneNumber).toBe(userData.phoneNumber)
      expect(user.id).toBeDefined()
    })

    test('createUser handles optional fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        password: 'password123',
      }

      const user = await queries.createUser(userData)

      expect(user).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.fullName).toBeNull()
      expect(user.phoneNumber).toBeNull()
    })

    test('getUserById returns correct user', async () => {
      const user = await queries.createUser({
        email: 'getuser@example.com',
        password: 'password123',
        fullName: 'Get User',
      })

      const foundUser = await queries.getUserById(user.id)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(user.id)
      expect(foundUser?.email).toBe('getuser@example.com')
      expect(foundUser?.fullName).toBe('Get User')
    })

    test('getUserById returns null for non-existent user', async () => {
      const user = await queries.getUserById(99999)
      expect(user).toBeNull()
    })

    test('login authenticates user correctly', async () => {
      const userData = {
        email: 'loginuser@example.com',
        password: 'password123',
      }

      await queries.createUser(userData)
      const loggedInUser = await queries.login(
        'loginuser@example.com',
        'password123',
      )

      expect(loggedInUser).toBeDefined()
      expect(loggedInUser?.email).toBe('loginuser@example.com')
    })

    test('login fails with wrong password', async () => {
      const userData = {
        email: 'wrongpass@example.com',
        password: 'password123',
      }

      await queries.createUser(userData)
      const loggedInUser = await queries.login(
        'wrongpass@example.com',
        'wrongpassword',
      )

      expect(loggedInUser).toBeNull()
    })

    test('login fails with non-existent email', async () => {
      const loggedInUser = await queries.login(
        'nonexistent@example.com',
        'password123',
      )

      expect(loggedInUser).toBeNull()
    })

    test('updateUserProfile updates user data', async () => {
      const user = await queries.createUser({
        email: 'updateuser@example.com',
        password: 'password123',
        fullName: 'Original Name',
      })

      const updatedUser = await queries.updateUserProfile(user.id, {
        email: 'newemail@example.com',
        fullName: 'Updated Name',
        phoneNumber: '987-654-3210',
      })

      expect(updatedUser).toBeDefined()
      expect(updatedUser?.email).toBe('newemail@example.com')
      expect(updatedUser?.fullName).toBe('Updated Name')
      expect(updatedUser?.phoneNumber).toBe('987-654-3210')
    })

    test('updateUserProfile validates current password for password updates', async () => {
      const user = await queries.createUser({
        email: 'passworduser@example.com',
        password: 'oldpassword',
      })

      // Should fail with wrong current password
      await expect(
        queries.updateUserProfile(user.id, {
          password: 'newpassword',
          currentPassword: 'wrongpassword',
        }),
      ).rejects.toThrow('Current password is incorrect')

      // Should succeed with correct current password
      const updated = await queries.updateUserProfile(user.id, {
        password: 'newpassword',
        currentPassword: 'oldpassword',
      })

      expect(updated).toBeDefined()
      expect(updated?.password).toBe('newpassword')
    })

    test('getAllUsers returns all users', async () => {
      await queries.createUser({
        email: 'user1@example.com',
        password: 'password123',
      })
      await queries.createUser({
        email: 'user2@example.com',
        password: 'password123',
      })

      const users = await queries.getAllUsers()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('User Location Queries', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await queries.createUser({
        email: `locationuser${Date.now()}@example.com`,
        password: 'password123',
      })
    })

    test('createUserLocation creates a new location', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: '123 Main St',
        label: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
      })

      expect(location).toBeDefined()
      expect(location.address).toBe('123 Main St')
      expect(location.label).toBe('Home')
      expect(location.latitude).toBe(40.7128)
      expect(location.longitude).toBe(-74.006)
    })

    test('getUserLocationsByUserId returns user locations', async () => {
      const location1 = await queries.createUserLocation({
        userId: testUser.id,
        address: 'Location 1',
      })
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      const location2 = await queries.createUserLocation({
        userId: testUser.id,
        address: 'Location 2',
      })

      const locations = await queries.getUserLocationsByUserId(testUser.id)

      expect(locations.length).toBeGreaterThanOrEqual(2)
      // Should be ordered by desc createdAt, so most recent (Location 2) should be first
      const location2InResults = locations.find(l => l.id === location2.id)
      const location1InResults = locations.find(l => l.id === location1.id)
      expect(location2InResults).toBeDefined()
      expect(location1InResults).toBeDefined()
      // Location 2 should come before Location 1 (desc order)
      expect(locations.findIndex(l => l.id === location2.id)).toBeLessThan(
        locations.findIndex(l => l.id === location1.id),
      )
    })

    test('getUserLocationById returns specific location', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: 'Test Address',
      })

      const found = await queries.getUserLocationById(location.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(location.id)
      expect(found?.address).toBe('Test Address')
    })

    test('updateUserLocation updates location data', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: 'Original Address',
      })

      const updated = await queries.updateUserLocation(location.id, {
        address: 'Updated Address',
        label: 'Work',
      })

      expect(updated).toBeDefined()
      expect(updated?.address).toBe('Updated Address')
      expect(updated?.label).toBe('Work')
    })

    test('deleteUserLocation removes location', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: 'To Delete',
      })

      await queries.deleteUserLocation(location.id)

      const found = await queries.getUserLocationById(location.id)
      expect(found).toBeNull()
    })
  })

  describe('Vehicle Type Queries', () => {
    test('createVehicleType creates a new vehicle type', async () => {
      // Use a unique code that doesn't exist in seeded data
      const uniqueCode = `motorcycle_${Date.now()}`
      const vehicleType = await queries.createVehicleType({
        code: uniqueCode,
        name: 'Motorcycle',
        description: 'Two-wheeled vehicle',
      })

      expect(vehicleType).toBeDefined()
      expect(vehicleType.code).toBe(uniqueCode)
      expect(vehicleType.name).toBe('Motorcycle')
    })

    test('getVehicleTypes returns all vehicle types', async () => {
      // Get existing types (seeded data already has car, motorcycle, etc.)
      const types = await queries.getVehicleTypes()

      expect(types.length).toBeGreaterThanOrEqual(2)
      expect(types.some(t => t.code === 'car')).toBe(true)
      expect(
        types.some(
          t =>
            t.code === 'motorcycle' ||
            t.code === 'truck' ||
            t.code === 'van' ||
            t.code === 'ev',
        ),
      ).toBe(true)
    })

    test('getVehicleTypeById returns specific type', async () => {
      // Use existing 'ev' type from seeded data or create with unique code
      let type = await queries.getVehicleTypeByCode('ev')
      if (!type) {
        type = await queries.createVehicleType({
          code: 'ev',
          name: 'Electric Vehicle',
        })
      }

      const found = await queries.getVehicleTypeById(type.id)

      expect(found).toBeDefined()
      expect(found?.code).toBe('ev')
    })

    test('getVehicleTypeByCode returns type by code', async () => {
      // Use existing 'van' type from seeded data or create it
      let type = await queries.getVehicleTypeByCode('van')
      if (!type) {
        type = await queries.createVehicleType({ code: 'van', name: 'Van' })
      }

      const found = await queries.getVehicleTypeByCode('van')

      expect(found).toBeDefined()
      expect(found?.code).toBe('van')
      expect(found?.name).toBe('Van')
    })
  })

  describe('Vehicle Type Rate Queries', () => {
    let vehicleType: any

    beforeEach(async () => {
      vehicleType = await getOrCreateVehicleType('car', 'Car')
      // Clear any existing rate for this vehicle type to avoid UNIQUE constraint issues
      const existingRate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )
      if (existingRate) {
        // Delete existing rate if it exists (we'll create new ones in tests)
        // Note: We can't delete directly, so we'll update it in tests instead
      }
    })

    test('createVehicleTypeRate creates a new rate', async () => {
      // Check if rate already exists (seeded data might have one)
      const existingRate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )
      if (existingRate) {
        // Update existing rate instead of creating new one (UNIQUE constraint)
        const rate = await queries.updateVehicleTypeRate(existingRate.id, {
          ratePerHour: 5.0,
          currency: 'USD',
        })
        expect(rate).toBeDefined()
        expect(rate.vehicleTypeId).toBe(vehicleType.id)
        expect(rate.ratePerHour).toBe(5.0)
        expect(rate.currency).toBe('USD')
      } else {
        const rate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 5.0,
          currency: 'USD',
        })
        expect(rate).toBeDefined()
        expect(rate.vehicleTypeId).toBe(vehicleType.id)
        expect(rate.ratePerHour).toBe(5.0)
        expect(rate.currency).toBe('USD')
      }
    })

    test('getVehicleTypeRates returns all rates', async () => {
      // Ensure rate exists (create or get existing)
      let rate = await queries.getVehicleTypeRateByVehicleTypeId(vehicleType.id)
      if (!rate) {
        rate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 5.0,
        })
      }

      const rates = await queries.getVehicleTypeRates()

      expect(rates.length).toBeGreaterThanOrEqual(1)
      expect(rates.some(r => r.vehicleTypeId === vehicleType.id)).toBe(true)
    })

    test('getVehicleTypeRateByVehicleTypeId returns rate for type', async () => {
      // Create or update rate to ensure it exists with expected value
      let rate = await queries.getVehicleTypeRateByVehicleTypeId(vehicleType.id)
      if (!rate) {
        rate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 7.5,
        })
      } else {
        rate = await queries.updateVehicleTypeRate(rate.id, {
          ratePerHour: 7.5,
        })
      }

      const foundRate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )

      expect(foundRate).toBeDefined()
      expect(foundRate?.vehicleTypeId).toBe(vehicleType.id)
      expect(foundRate?.ratePerHour).toBe(7.5)
    })

    test('updateVehicleTypeRate updates rate', async () => {
      // Get or create rate
      let rate = await queries.getVehicleTypeRateByVehicleTypeId(vehicleType.id)
      if (!rate) {
        rate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 5.0,
        })
      } else {
        // Update to 5.0 first
        rate = await queries.updateVehicleTypeRate(rate.id, {
          ratePerHour: 5.0,
        })
      }

      const updated = await queries.updateVehicleTypeRate(rate.id, {
        ratePerHour: 10.0,
      })

      expect(updated).toBeDefined()
      expect(updated?.ratePerHour).toBe(10.0)
    })
  })

  describe('Vehicle Queries', () => {
    let testUser: any
    let vehicleType: any

    beforeEach(async () => {
      testUser = await queries.createUser({
        email: `vehicleuser${Date.now()}@example.com`,
        password: 'password123',
      })
      vehicleType = await getOrCreateVehicleType('car', 'Car')
    })

    test('createVehicle creates a new vehicle', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'ABC123',
        nickname: 'My Car',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
      })

      expect(vehicle).toBeDefined()
      expect(vehicle.plateNumber).toBe('ABC123')
      expect(vehicle.nickname).toBe('My Car')
      expect(vehicle.make).toBe('Toyota')
    })

    test('getVehiclesByUserId returns user vehicles', async () => {
      await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'VEH1',
      })
      await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'VEH2',
      })

      const vehicles = await queries.getVehiclesByUserId(testUser.id)

      expect(vehicles.length).toBe(2)
    })

    test('getVehicleById returns specific vehicle', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'FIND123',
      })

      const found = await queries.getVehicleById(vehicle.id)

      expect(found).toBeDefined()
      expect(found?.plateNumber).toBe('FIND123')
    })

    test('getVehicleByPlateNumber returns vehicle by plate', async () => {
      await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'PLATE123',
      })

      const found = await queries.getVehicleByPlateNumber('PLATE123')

      expect(found).toBeDefined()
      expect(found?.plateNumber).toBe('PLATE123')
    })

    test('updateVehicle updates vehicle data', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'UPDATE123',
      })

      const updated = await queries.updateVehicle(vehicle.id, {
        nickname: 'Updated Nickname',
        color: 'Blue',
      })

      expect(updated).toBeDefined()
      expect(updated?.nickname).toBe('Updated Nickname')
      expect(updated?.color).toBe('Blue')
    })

    test('deleteVehicle removes vehicle', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'DELETE123',
      })

      await queries.deleteVehicle(vehicle.id)

      const found = await queries.getVehicleById(vehicle.id)
      expect(found).toBeNull()
    })
  })

  describe('Parking Zone Queries', () => {
    test('createParkingZone creates a new zone', async () => {
      const zone = await queries.createParkingZone({
        name: 'Downtown Zone',
        latitude: 40.7128,
        longitude: -74.006,
        description: 'City center parking',
        rateMultiplier: 1.5,
      })

      expect(zone).toBeDefined()
      expect(zone.name).toBe('Downtown Zone')
      expect(zone.latitude).toBe(40.7128)
      expect(zone.longitude).toBe(-74.006)
      expect(zone.rateMultiplier).toBe(1.5)
    })

    test('getParkingZones returns all zones', async () => {
      await queries.createParkingZone({
        name: 'Zone 1',
        latitude: 40.7128,
        longitude: -74.006,
      })
      await queries.createParkingZone({
        name: 'Zone 2',
        latitude: 40.758,
        longitude: -73.9855,
      })

      const zones = await queries.getParkingZones()

      expect(zones.length).toBeGreaterThanOrEqual(2)
    })

    test('getParkingZoneById returns specific zone', async () => {
      const zone = await queries.createParkingZone({
        name: 'Test Zone',
        latitude: 40.7128,
        longitude: -74.006,
      })

      const found = await queries.getParkingZoneById(zone.id)

      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Zone')
    })

    test('getActiveParkingZones returns only active zones', async () => {
      await queries.createParkingZone({
        name: 'Active Zone',
        latitude: 40.7128,
        longitude: -74.006,
        isActive: 1,
      })
      await queries.createParkingZone({
        name: 'Inactive Zone',
        latitude: 40.758,
        longitude: -73.9855,
        isActive: 0,
      })

      const activeZones = await queries.getActiveParkingZones()

      expect(activeZones.every(z => z.isActive === 1)).toBe(true)
      expect(activeZones.some(z => z.name === 'Active Zone')).toBe(true)
      expect(activeZones.some(z => z.name === 'Inactive Zone')).toBe(false)
    })

    test('updateParkingZone updates zone data', async () => {
      const zone = await queries.createParkingZone({
        name: 'Original Zone',
        latitude: 40.7128,
        longitude: -74.006,
      })

      const updated = await queries.updateParkingZone(zone.id, {
        name: 'Updated Zone',
        rateMultiplier: 2.0,
      })

      expect(updated).toBeDefined()
      expect(updated?.name).toBe('Updated Zone')
      expect(updated?.rateMultiplier).toBe(2.0)
    })
  })

  describe('Parking History Queries', () => {
    let testUser: any
    let vehicle: any
    let parkingZone: any

    beforeEach(async () => {
      testUser = await queries.createUser({
        email: `historyuser${Date.now()}@example.com`,
        password: 'password123',
      })
      const vehicleType = await getOrCreateVehicleType('car', 'Car')
      vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'HIST123',
      })
      parkingZone = await queries.createParkingZone({
        name: 'Test Zone',
        latitude: 40.7128,
        longitude: -74.006,
      })
    })

    test('createParkingHistory creates a new parking session', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const history = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'booked',
      })

      expect(history).toBeDefined()
      expect(history.userId).toBe(testUser.id)
      expect(history.vehicleId).toBe(vehicle.id)
      expect(history.parkingZoneId).toBe(parkingZone.id)
      expect(history.status).toBe('booked')
      expect(history.chargedAmount).toBe(5.0)
    })

    test('getParkingHistoryByUserId returns user history', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
      })

      const history = await queries.getParkingHistoryByUserId(testUser.id)

      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].userId).toBe(testUser.id)
    })

    test('getParkingHistoryById returns specific history', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const history = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
      })

      const found = await queries.getParkingHistoryById(history.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(history.id)
    })

    test('getParkingHistoryByZoneId returns zone history', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
      })

      const history = await queries.getParkingHistoryByZoneId(parkingZone.id)

      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].parkingZoneId).toBe(parkingZone.id)
    })

    test('getActiveParkingHistoryByUserId returns only active sessions', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'booked',
      })

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'completed',
      })

      const activeHistory = await queries.getActiveParkingHistoryByUserId(
        testUser.id,
      )

      expect(
        activeHistory.every(h =>
          ['booked', 'active', 'ongoing'].includes(h.status),
        ),
      ).toBe(true)
    })

    test('updateParkingHistory updates session data', async () => {
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const history = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'booked',
      })

      const actualEndTime = new Date().toISOString()
      const updated = await queries.updateParkingHistory(history.id, {
        actualEndTime,
        actualDurationMinutes: 45,
        status: 'completed',
        chargedAmount: 3.75,
      })

      expect(updated).toBeDefined()
      expect(updated?.status).toBe('completed')
      expect(updated?.actualDurationMinutes).toBe(45)
      expect(updated?.chargedAmount).toBe(3.75)
    })
  })

  describe('Payment Method Queries', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await queries.createUser({
        email: `paymentuser${Date.now()}@example.com`,
        password: 'password123',
      })
    })

    test('createPaymentMethod creates a new payment method', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
        expiryMonth: 12,
        expiryYear: 2025,
        provider: 'Visa',
        displayName: 'My Credit Card',
      })

      expect(method).toBeDefined()
      expect(method.type).toBe('credit_card')
      expect(method.lastFour).toBe('1111')
      expect(method.provider).toBe('Visa')
    })

    test('getPaymentMethodsByUserId returns user payment methods', async () => {
      await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })
      await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'debit_card',
        cardNumber: '5555555555554444',
        lastFour: '4444',
      })

      const methods = await queries.getPaymentMethodsByUserId(testUser.id)

      expect(methods.length).toBe(2)
    })

    test('getPaymentMethodById returns specific method', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      const found = await queries.getPaymentMethodById(method.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(method.id)
      expect(found?.lastFour).toBe('1111')
    })

    test('updatePaymentMethod updates method data', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      const updated = await queries.updatePaymentMethod(method.id, {
        displayName: 'Updated Card',
        isDefault: 1,
      })

      expect(updated).toBeDefined()
      expect(updated?.displayName).toBe('Updated Card')
      expect(updated?.isDefault).toBe(1)
    })

    test('deletePaymentMethod removes method', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      await queries.deletePaymentMethod(method.id)

      const found = await queries.getPaymentMethodById(method.id)
      expect(found).toBeNull()
    })
  })

  describe('Notification Queries', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await queries.createUser({
        email: `notifuser${Date.now()}@example.com`,
        password: 'password123',
      })
    })

    test('createNotification creates a new notification', async () => {
      const notification = await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'Parking Expiring Soon',
        message: 'Your parking session expires in 15 minutes',
      })

      expect(notification).toBeDefined()
      expect(notification.userId).toBe(testUser.id)
      expect(notification.notificationType).toBe('parking_reminder')
      expect(notification.title).toBe('Parking Expiring Soon')
    })

    test('getAllNotifications returns user notifications', async () => {
      await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'Notification 1',
        message: 'Message 1',
      })
      await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_complete',
        title: 'Notification 2',
        message: 'Message 2',
      })

      const notifications = await queries.getAllNotifications(testUser.id)

      expect(notifications.length).toBeGreaterThanOrEqual(2)
    })

    test('getUnreadNotifications returns only unread notifications', async () => {
      const notif1 = await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'Unread',
        message: 'Unread message',
      })
      await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_complete',
        title: 'Read',
        message: 'Read message',
      })

      // Mark second as read
      await queries.markNotificationAsRead(notif1.id + 1)

      const unread = await queries.getUnreadNotifications(testUser.id)

      expect(unread.every(n => n.isRead === 0)).toBe(true)
    })

    test('getNotificationById returns specific notification', async () => {
      const notification = await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'Test Notification',
        message: 'Test message',
      })

      const found = await queries.getNotificationById(notification.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(notification.id)
      expect(found?.title).toBe('Test Notification')
    })

    test('markNotificationAsRead marks notification as read', async () => {
      const notification = await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'To Read',
        message: 'Message',
      })

      await queries.markNotificationAsRead(notification.id)

      const found = await queries.getNotificationById(notification.id)
      expect(found?.isRead).toBe(1)
      expect(found?.readAt).toBeDefined()
    })

    test('deleteNotification removes notification', async () => {
      const notification = await queries.createNotification({
        userId: testUser.id,
        notificationType: 'parking_reminder',
        title: 'To Delete',
        message: 'Message',
      })

      await queries.deleteNotification(notification.id)

      const found = await queries.getNotificationById(notification.id)
      expect(found).toBeNull()
    })
  })
})
