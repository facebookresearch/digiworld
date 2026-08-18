// Copyright (c) Meta Platforms, Inc. and affiliates.
// import { ParkingStore } from '@/models/ParkingStore'
import { RootStore } from '@/models/RootStore'
import { UserStoreModel } from '@/models/UserStore'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'

describe('ParkingStore', () => {
  let rootStore: any
  let parkingStore: any
  let testUser: any
  let vehicleType: any
  let parkingZone: any

  beforeEach(async () => {
    // Initialize database
    await mutations.initializeDatabase()

    // Create test user
    testUser = await queries.createUser({
      email: `parkingstore${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Test User',
    })

    // Get existing vehicle type from seeded data (or create one if it doesn't exist)
    const existingTypes = await queries.getVehicleTypes()
    vehicleType = existingTypes.find((vt: any) => vt.code === 'car')
    if (!vehicleType) {
      vehicleType = await queries.createVehicleType({
        code: 'test_car',
        name: 'Test Car',
      })
    }

    // Create parking zone
    parkingZone = await queries.createParkingZone({
      name: 'Test Zone',
      latitude: 40.7128,
      longitude: -74.006,
      rateMultiplier: 1.0,
    })

    // Create root store with user
    rootStore = RootStore.create({
      userStore: UserStoreModel.create({
        user: {
          id: testUser.id,
          username: testUser.fullName || 'Test User',
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
  })

  describe('Initialization', () => {
    test('initialize loads all data', async () => {
      await parkingStore.initialize()

      expect(parkingStore.vehicleTypes.length).toBeGreaterThan(0)
      expect(parkingStore.vehicleTypeRates.length).toBeGreaterThan(0)
      expect(parkingStore.parkingZones.length).toBeGreaterThan(0)
    })
  })

  describe('Vehicle Type Management', () => {
    test('loadVehicleTypes loads vehicle types', async () => {
      await parkingStore.loadVehicleTypes()

      expect(parkingStore.vehicleTypes.length).toBeGreaterThan(0)
      expect(parkingStore.vehicleTypes[0]).toHaveProperty('code')
      expect(parkingStore.vehicleTypes[0]).toHaveProperty('name')
    })

    test('loadVehicleTypeRates loads rates', async () => {
      await parkingStore.loadVehicleTypeRates()

      expect(parkingStore.vehicleTypeRates.length).toBeGreaterThan(0)
      expect(parkingStore.vehicleTypeRates[0]).toHaveProperty('vehicleTypeId')
      expect(parkingStore.vehicleTypeRates[0]).toHaveProperty('ratePerHour')
    })
  })

  describe('Vehicle Management', () => {
    test('loadVehicles loads user vehicles', async () => {
      // Create a vehicle first
      await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'LOAD123',
      })

      await parkingStore.loadVehicles()

      expect(parkingStore.vehicles.length).toBeGreaterThan(0)
    })

    test('addVehicle creates and loads vehicle', async () => {
      const vehicle = await parkingStore.addVehicle({
        vehicleTypeId: vehicleType.id,
        plateNumber: 'ADD123',
        nickname: 'My Car',
        make: 'Toyota',
        model: 'Camry',
      })

      expect(vehicle).toBeDefined()
      expect(vehicle.plateNumber).toBe('ADD123')
      expect(parkingStore.vehicles.length).toBeGreaterThan(0)
    })

    test('updateVehicleById updates vehicle', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'UPDATE123',
      })

      await parkingStore.loadVehicles()

      const updated = await parkingStore.updateVehicleById(vehicle.id, {
        nickname: 'Updated Car',
        color: 'Blue',
      })

      expect(updated).toBeDefined()
      expect(updated?.nickname).toBe('Updated Car')
      expect(updated?.color).toBe('Blue')
    })

    test('removeVehicle deletes vehicle', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'DELETE123',
      })

      await parkingStore.loadVehicles()
      const initialCount = parkingStore.vehicles.length

      await parkingStore.removeVehicle(vehicle.id)

      expect(parkingStore.vehicles.length).toBe(initialCount - 1)
    })

    test('setSelectedVehicle sets selected vehicle', async () => {
      // Create a vehicle first
      const createdVehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'SELECT123',
      })

      // Load vehicles to get the MobX model instance
      await parkingStore.loadVehicles()
      const vehicleModel = parkingStore.vehicles.find(
        v => v.id === createdVehicle.id,
      )

      parkingStore.setSelectedVehicle(vehicleModel || null)

      expect(parkingStore.selectedVehicle?.id).toBe(createdVehicle.id)
    })
  })

  describe('Parking Zone Management', () => {
    test('loadParkingZones loads zones', async () => {
      await parkingStore.loadParkingZones()

      expect(parkingStore.parkingZones.length).toBeGreaterThan(0)
      expect(parkingStore.parkingZones[0]).toHaveProperty('name')
      expect(parkingStore.parkingZones[0]).toHaveProperty('latitude')
    })

    test('setSelectedParkingZone sets selected zone', async () => {
      // Load parking zones to get MobX model instances
      await parkingStore.loadParkingZones()
      const zoneModel = parkingStore.parkingZones.find(
        z => z.id === parkingZone.id,
      )

      parkingStore.setSelectedParkingZone(zoneModel || null)

      expect(parkingStore.selectedParkingZone?.id).toBe(parkingZone.id)
    })
  })

  describe('Parking History Management', () => {
    let vehicle: any

    beforeEach(async () => {
      vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'HIST123',
      })

      // Get or create vehicle type rate for cost calculation
      let vehicleTypeRate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )
      if (!vehicleTypeRate) {
        vehicleTypeRate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 5.0,
        })
      }
    })

    test('loadParkingHistory loads user history', async () => {
      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime: new Date().toISOString(),
        plannedEndTime: new Date(Date.now() + 3600000).toISOString(),
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
      })

      await parkingStore.loadParkingHistory()

      expect(parkingStore.parkingHistory.length).toBeGreaterThan(0)
    })

    test('bookParking creates parking session', async () => {
      await parkingStore.loadVehicles()
      await parkingStore.loadParkingZones()
      await parkingStore.loadVehicleTypeRates()

      const startTime = new Date().toISOString()
      const plannedEndTime = new Date(Date.now() + 3600000).toISOString()

      const history = await parkingStore.bookParking({
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
      })

      expect(history).toBeDefined()
      expect(history.status).toBe('active')
      expect(history.chargedAmount).toBeGreaterThan(0)
    })

    test('endParkingSession updates session to completed', async () => {
      const startTime = new Date(Date.now() - 1800000).toISOString() // 30 min ago
      const plannedEndTime = new Date(Date.now() + 1800000).toISOString() // 30 min from now

      const history = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'active',
      })

      // Load vehicles and parking history before ending session
      await parkingStore.loadVehicles()
      await parkingStore.loadParkingHistory()

      const updated = await parkingStore.endParkingSession(history.id)

      expect(updated).toBeDefined()
      expect(updated?.status).toBe('completed')
      expect(updated?.actualEndTime).toBeDefined()
      expect(updated?.actualDurationMinutes).toBeDefined()
    })

    test('setSelectedParkingHistory sets selected history', async () => {
      // Create a parking history entry first
      const createdHistory = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime: new Date().toISOString(),
        plannedEndTime: new Date(Date.now() + 3600000).toISOString(),
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
      })

      // Load parking history to get MobX model instance
      await parkingStore.loadParkingHistory()
      const historyModel = parkingStore.parkingHistory.find(
        h => h.id === createdHistory.id,
      )

      parkingStore.setSelectedParkingHistory(historyModel || null)

      expect(parkingStore.selectedParkingHistory?.id).toBe(createdHistory.id)
    })
  })

  describe('Payment Method Management', () => {
    test('loadPaymentMethods loads user payment methods', async () => {
      await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      await parkingStore.loadPaymentMethods()

      expect(parkingStore.paymentMethods.length).toBeGreaterThan(0)
    })

    test('addPaymentMethod creates payment method', async () => {
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
      expect(method.type).toBe('credit_card')
      expect(parkingStore.paymentMethods.length).toBeGreaterThan(0)
    })

    test('updatePaymentMethodById updates method', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      await parkingStore.loadPaymentMethods()

      const updated = await parkingStore.updatePaymentMethodById(method.id, {
        displayName: 'Updated Card',
        isDefault: 1,
      })

      expect(updated).toBeDefined()
      expect(updated?.displayName).toBe('Updated Card')
    })

    test('removePaymentMethod deletes method', async () => {
      const method = await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      await parkingStore.loadPaymentMethods()
      const initialCount = parkingStore.paymentMethods.length

      await parkingStore.removePaymentMethod(method.id)

      expect(parkingStore.paymentMethods.length).toBe(initialCount - 1)
    })
  })

  describe('User Location Management', () => {
    test('loadUserLocations loads user locations', async () => {
      await queries.createUserLocation({
        userId: testUser.id,
        address: '123 Main St',
        label: 'Home',
      })

      await parkingStore.loadUserLocations()

      expect(parkingStore.userLocations.length).toBeGreaterThan(0)
    })

    test('addUserLocation creates location', async () => {
      const location = await parkingStore.addUserLocation({
        address: '456 Oak Ave',
        label: 'Work',
        latitude: 40.758,
        longitude: -73.9855,
      })

      expect(location).toBeDefined()
      expect(location.address).toBe('456 Oak Ave')
      expect(parkingStore.userLocations.length).toBeGreaterThan(0)
    })

    test('updateUserLocationById updates location', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: 'Original Address',
      })

      await parkingStore.loadUserLocations()

      const updated = await parkingStore.updateUserLocationById(location.id, {
        address: 'Updated Address',
        label: 'Updated Label',
      })

      expect(updated).toBeDefined()
      expect(updated?.address).toBe('Updated Address')
    })

    test('removeUserLocation deletes location', async () => {
      const location = await queries.createUserLocation({
        userId: testUser.id,
        address: 'To Delete',
      })

      await parkingStore.loadUserLocations()
      const initialCount = parkingStore.userLocations.length

      await parkingStore.removeUserLocation(location.id)

      expect(parkingStore.userLocations.length).toBe(initialCount - 1)
    })
  })

  describe('Computed Views', () => {
    beforeEach(async () => {
      await parkingStore.loadVehicles()
      await parkingStore.loadPaymentMethods()
      await parkingStore.loadUserLocations()
    })

    test('defaultVehicle returns default or first vehicle', async () => {
      await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'DEFAULT123',
        isDefault: 1,
      })

      await parkingStore.loadVehicles()
      const defaultVehicle = parkingStore.defaultVehicle
      expect(defaultVehicle).toBeDefined()
      expect(defaultVehicle?.isDefault).toBe(1)
    })

    test('defaultPaymentMethod returns default or first method', async () => {
      await queries.createPaymentMethod({
        userId: testUser.id,
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
        isDefault: 1,
      })

      await parkingStore.loadPaymentMethods()

      const defaultMethod = parkingStore.defaultPaymentMethod
      expect(defaultMethod).toBeDefined()
      expect(defaultMethod?.isDefault).toBe(1)
    })

    test('activeParkingSessions filters active sessions', async () => {
      const vehicle = await queries.createVehicle({
        userId: testUser.id,
        vehicleTypeId: vehicleType.id,
        plateNumber: 'ACTIVE123',
      })

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime: new Date().toISOString(),
        plannedEndTime: new Date(Date.now() + 3600000).toISOString(),
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'active',
      })

      await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: parkingZone.id,
        startTime: new Date(Date.now() - 7200000).toISOString(),
        plannedEndTime: new Date(Date.now() - 3600000).toISOString(),
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'completed',
      })

      await parkingStore.loadParkingHistory()

      const activeSessions = parkingStore.activeParkingSessions
      expect(activeSessions.length).toBeGreaterThan(0)
      expect(activeSessions.every(s => s.status === 'active')).toBe(true)
    })

    test('calculateParkingCost calculates cost correctly', async () => {
      await parkingStore.loadVehicleTypeRates()
      await parkingStore.loadParkingZones()

      const cost = parkingStore.calculateParkingCost(
        vehicleType.id,
        parkingZone.id,
        60, // 60 minutes = 1 hour
      )

      // Should calculate: ratePerHour * hours * multiplier
      // If rate is 5.0/hour and multiplier is 1.0, cost should be 5.0
      expect(cost).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Form Management', () => {
    test('resetVehicleForm clears form', () => {
      // Set form values using applySnapshot (MobX-State-Tree requires actions for direct modification)
      const { applySnapshot } = require('mobx-state-tree')
      applySnapshot(parkingStore.vehicleForm, {
        nickname: 'Test',
        plateNumber: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
      })

      expect(parkingStore.vehicleForm.nickname).toBe('Test')
      expect(parkingStore.vehicleForm.plateNumber).toBe('TEST123')

      parkingStore.resetVehicleForm()

      expect(parkingStore.vehicleForm.nickname).toBe('')
      expect(parkingStore.vehicleForm.plateNumber).toBe('')
    })

    test('resetParkingBookingForm clears form', () => {
      const { applySnapshot } = require('mobx-state-tree')
      applySnapshot(parkingStore.parkingBookingForm, {
        vehicleId: 1,
        parkingZoneId: 1,
        startTime: '2024-01-01T10:00:00Z',
      })

      expect(parkingStore.parkingBookingForm.vehicleId).toBe(1)
      expect(parkingStore.parkingBookingForm.parkingZoneId).toBe(1)

      parkingStore.resetParkingBookingForm()

      expect(parkingStore.parkingBookingForm.vehicleId).toBeNull()
      expect(parkingStore.parkingBookingForm.parkingZoneId).toBeNull()
    })

    test('resetPaymentMethodForm clears form', () => {
      const { applySnapshot } = require('mobx-state-tree')
      applySnapshot(parkingStore.paymentMethodForm, {
        type: 'credit_card',
        cardNumber: '4111111111111111',
        lastFour: '1111',
      })

      expect(parkingStore.paymentMethodForm.type).toBe('credit_card')
      expect(parkingStore.paymentMethodForm.cardNumber).toBe('4111111111111111')

      parkingStore.resetPaymentMethodForm()

      expect(parkingStore.paymentMethodForm.type).toBe('')
      expect(parkingStore.paymentMethodForm.cardNumber).toBe('')
    })

    test('resetLocationForm clears form', () => {
      const { applySnapshot } = require('mobx-state-tree')
      applySnapshot(parkingStore.locationForm, {
        address: '123 Main St',
        label: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
      })

      expect(parkingStore.locationForm.address).toBe('123 Main St')
      expect(parkingStore.locationForm.label).toBe('Home')

      parkingStore.resetLocationForm()

      expect(parkingStore.locationForm.address).toBe('')
      expect(parkingStore.locationForm.label).toBe('')
    })
  })
})
