import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
// import { ParkingStore } from '@/models/ParkingStore'
import { RootStore } from '@/models/RootStore'
import { UserStoreModel } from '@/models/UserStore'

describe('Parking Booking Flow Integration', () => {
  let rootStore: any
  let parkingStore: any
  let testUser: any
  let vehicleType: any
  let vehicleTypeRate: any
  let parkingZone: any
  let vehicle: any

  beforeEach(async () => {
    await mutations.initializeDatabase()

    // Create test user
    testUser = await queries.createUser({
      email: `bookingflow${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Booking User',
    })

    // Get or create vehicle type (use existing from seeded data if available)
    const existingTypes = await queries.getVehicleTypes()
    vehicleType = existingTypes.find((vt: any) => vt.code === 'car')

    if (!vehicleType) {
      // If 'car' doesn't exist, create it
      vehicleType = await queries.createVehicleType({
        code: 'car',
        name: 'Car',
      })
    }

    // Get or create vehicle type rate (ensure it's 5.0/hour for consistent test expectations)
    vehicleTypeRate = await queries.getVehicleTypeRateByVehicleTypeId(
      vehicleType.id,
    )

    if (!vehicleTypeRate) {
      vehicleTypeRate = await queries.createVehicleTypeRate({
        vehicleTypeId: vehicleType.id,
        ratePerHour: 5.0,
      })
    } else if (vehicleTypeRate.ratePerHour !== 5.0) {
      // Update existing rate to 5.0 for consistent test expectations
      vehicleTypeRate = await queries.updateVehicleTypeRate(
        vehicleTypeRate.id,
        {
          ratePerHour: 5.0,
        },
      )
    }

    // Create parking zone
    parkingZone = await queries.createParkingZone({
      name: 'Downtown Zone',
      latitude: 40.7128,
      longitude: -74.006,
      rateMultiplier: 1.0,
    })

    // Create vehicle
    vehicle = await queries.createVehicle({
      userId: testUser.id,
      vehicleTypeId: vehicleType.id,
      plateNumber: 'BOOK123',
      nickname: 'My Car',
    })

    // Create root store
    rootStore = RootStore.create({
      userStore: UserStoreModel.create({
        user: {
          id: testUser.id,
          username: testUser.fullName || 'Booking User',
          email: testUser.email,
          fullName: testUser.fullName,
          phoneNumber: testUser.phoneNumber,
          pin: null,
          securityQuestion: null,
          securityAnswer: null,
          password: testUser.password,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
          deletedAt: null,
        },
        isAuthenticated: true,
        authError: null,
        validationErrors: [],
      }),
    })

    parkingStore = rootStore.parkingStore
    await parkingStore.initialize()

    // Ensure vehicle is loaded in the store (needed for bookParking)
    await parkingStore.loadVehicles()
  })

  describe('Complete Parking Booking Flow', () => {
    test('user can book parking, view history, and end session', async () => {
      // Step 1: Book parking
      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 3600000).toISOString() // 1 hour

      const booking = await parkingStore.bookParking({
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
      })

      expect(booking).toBeDefined()
      expect(booking.status).toBe('active')
      expect(booking.chargedAmount).toBe(5.0) // 5.0/hour * 1 hour * 1.0 multiplier

      // Step 2: Verify booking appears in history
      await parkingStore.loadParkingHistory()
      const history = parkingStore.parkingHistory

      expect(history.length).toBeGreaterThan(0)
      const bookingInHistory = history.find((h: any) => h.id === booking.id)
      expect(bookingInHistory).toBeDefined()
      expect(bookingInHistory.status).toBe('active')

      // Step 3: Verify active sessions include the booking
      const activeSessions = parkingStore.activeParkingSessions
      expect(activeSessions.some((s: any) => s.id === booking.id)).toBe(true)

      // Step 4: End parking session
      const updated = await parkingStore.endParkingSession(booking.id)

      expect(updated).toBeDefined()
      expect(updated.status).toBe('completed')
      expect(updated.actualEndTime).toBeDefined()
      expect(updated.actualDurationMinutes).toBeDefined()

      // Step 5: Verify session no longer in active sessions
      await parkingStore.loadParkingHistory()
      const activeAfterEnd = parkingStore.activeParkingSessions
      expect(activeAfterEnd.some((s: any) => s.id === booking.id)).toBe(false)
    })

    test('parking cost calculation uses zone multiplier', async () => {
      // Create zone with 2.0 multiplier
      const premiumZone = await queries.createParkingZone({
        name: 'Premium Zone',
        latitude: 40.758,
        longitude: -73.9855,
        rateMultiplier: 2.0,
      })

      // Reload parking zones to include the new zone in the store
      await parkingStore.loadParkingZones()

      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 3600000).toISOString()

      const booking = await parkingStore.bookParking({
        vehicleId: vehicle.id,
        parkingZoneId: premiumZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
      })

      // Cost should be: 5.0/hour * 1 hour * 2.0 multiplier = 10.0
      expect(booking.chargedAmount).toBe(10.0)
    })

    test('multiple vehicles can have separate parking sessions', async () => {
      const vehicle2 = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'BOOK456',
      })

      // Reload vehicles to include the new vehicle in the store
      await parkingStore.loadVehicles()

      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 3600000).toISOString()

      const booking1 = await parkingStore.bookParking({
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
      })

      const booking2 = await parkingStore.bookParking({
        vehicleId: vehicle2.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
      })

      expect(booking1.id).not.toBe(booking2.id)
      expect(booking1.vehicleId).toBe(vehicle.id)
      expect(booking2.vehicleId).toBe(vehicle2.id)

      await parkingStore.loadParkingHistory()
      expect(parkingStore.parkingHistory.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Vehicle Management Flow', () => {
    test('user can add, update, and delete vehicles', async () => {
      // Add vehicle
      const newVehicle = await parkingStore.addVehicle({
        vehicleTypeId: vehicleType.id,
        plateNumber: 'NEW123',
        nickname: 'New Car',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
      })

      expect(newVehicle).toBeDefined()
      expect(newVehicle.plateNumber).toBe('NEW123')

      // Update vehicle
      const updated = await parkingStore.updateVehicleById(newVehicle.id, {
        nickname: 'Updated Car',
        color: 'Red',
      })

      expect(updated).toBeDefined()
      expect(updated?.nickname).toBe('Updated Car')
      expect(updated?.color).toBe('Red')

      // Delete vehicle
      await parkingStore.removeVehicle(newVehicle.id)

      await parkingStore.loadVehicles()
      const vehicleExists = parkingStore.vehicles.find(
        (v: any) => v.id === newVehicle.id,
      )
      expect(vehicleExists).toBeUndefined()
    })
  })

  describe('Payment Method Management Flow', () => {
    test('user can add, update, and delete payment methods', async () => {
      // Add payment method
      const method = await parkingStore.addPaymentMethod({
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
        expiryMonth: 12,
        expiryYear: 2025,
        provider: 'Visa',
        displayName: 'My Card',
      })

      expect(method).toBeDefined()
      expect(method.lastFour).toBe('1111')

      // Update payment method
      const updated = await parkingStore.updatePaymentMethodById(method.id, {
        displayName: 'Updated Card',
        isDefault: 1,
      })

      expect(updated).toBeDefined()
      expect(updated?.displayName).toBe('Updated Card')
      expect(updated?.isDefault).toBe(1)

      // Delete payment method
      await parkingStore.removePaymentMethod(method.id)

      await parkingStore.loadPaymentMethods()
      const methodExists = parkingStore.paymentMethods.find(
        (m: any) => m.id === method.id,
      )
      expect(methodExists).toBeUndefined()
    })
  })

  describe('User Location Management Flow', () => {
    test('user can add, update, and delete locations', async () => {
      // Add location
      const location = await parkingStore.addUserLocation({
        address: '123 Main St',
        label: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
        isDefault: 1,
      })

      expect(location).toBeDefined()
      expect(location.address).toBe('123 Main St')

      // Update location
      const updated = await parkingStore.updateUserLocationById(location.id, {
        address: '456 Oak Ave',
        label: 'Work',
      })

      expect(updated).toBeDefined()
      expect(updated?.address).toBe('456 Oak Ave')
      expect(updated?.label).toBe('Work')

      // Delete location
      await parkingStore.removeUserLocation(location.id)

      await parkingStore.loadUserLocations()
      const locationExists = parkingStore.userLocations.find(
        (l: any) => l.id === location.id,
      )
      expect(locationExists).toBeUndefined()
    })
  })
})
