import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
// import { ParkingStore } from '@/models/ParkingStore'
import { RootStore } from '@/models/RootStore'
import { UserStoreModel } from '@/models/UserStore'

describe('Parking Cost Calculation Integration', () => {
  let rootStore: any
  let parkingStore: any
  let testUser: any
  let vehicle: any

  beforeEach(async () => {
    await mutations.initializeDatabase()

    testUser = await queries.createUser({
      email: `costcalc${Date.now()}@example.com`,
      password: 'password123',
    })

    // Get or create vehicle type (use existing from seeded data if available)
    const existingTypes = await queries.getVehicleTypes()
    let vehicleType = existingTypes.find((vt: any) => vt.code === 'car')

    if (!vehicleType) {
      vehicleType = await queries.createVehicleType({
        code: 'car',
        name: 'Car',
      })
    }

    vehicle = await queries.createVehicle({
      userId: testUser.id,
      vehicleTypeId: vehicleType.id,
      plateNumber: 'COST123',
    })

    rootStore = RootStore.create({
      userStore: UserStoreModel.create({
        user: {
          id: testUser.id,
          username: 'Test User',
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

    // Ensure vehicle is loaded in the store
    await parkingStore.loadVehicles()
  })

  describe('Cost Calculation', () => {
    test('calculates cost correctly for different durations', async () => {
      const vehicleType = await queries.getVehicleTypeByCode('car')
      if (!vehicleType) throw new Error('Vehicle type not found')

      const rate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )
      if (!rate) throw new Error('Rate not found')

      const zone = await queries.createParkingZone({
        name: 'Standard Zone',
        latitude: 40.7128,
        longitude: -74.006,
        rateMultiplier: 1.0,
      })

      // Reload parking zones to include the new zone in the store
      await parkingStore.loadParkingZones()

      // 30 minutes = 0.5 hours
      const cost30min = parkingStore.calculateParkingCost(
        vehicleType.id,
        zone.id,
        30,
      )
      expect(cost30min).toBe(rate.ratePerHour * 0.5 * zone.rateMultiplier)

      // 60 minutes = 1 hour
      const cost60min = parkingStore.calculateParkingCost(
        vehicleType.id,
        zone.id,
        60,
      )
      expect(cost60min).toBe(rate.ratePerHour * 1.0 * zone.rateMultiplier)

      // 90 minutes = 1.5 hours
      const cost90min = parkingStore.calculateParkingCost(
        vehicleType.id,
        zone.id,
        90,
      )
      expect(cost90min).toBe(rate.ratePerHour * 1.5 * zone.rateMultiplier)
    })

    test('applies zone multiplier correctly', async () => {
      const vehicleType = await queries.getVehicleTypeByCode('car')
      if (!vehicleType) throw new Error('Vehicle type not found')

      const standardZone = await queries.createParkingZone({
        name: 'Standard Zone',
        latitude: 40.7128,
        longitude: -74.006,
        rateMultiplier: 1.0,
      })

      const premiumZone = await queries.createParkingZone({
        name: 'Premium Zone',
        latitude: 40.758,
        longitude: -73.9855,
        rateMultiplier: 2.0,
      })

      // Reload parking zones to include the new zones in the store
      await parkingStore.loadParkingZones()

      const standardCost = parkingStore.calculateParkingCost(
        vehicleType.id,
        standardZone.id,
        60,
      )

      const premiumCost = parkingStore.calculateParkingCost(
        vehicleType.id,
        premiumZone.id,
        60,
      )

      expect(premiumCost).toBe(standardCost * 2)
    })

    test('calculates cost for different vehicle types', async () => {
      // Get or create vehicle types (use existing from seeded data if available)
      const existingTypes = await queries.getVehicleTypes()
      let carType = existingTypes.find((vt: any) => vt.code === 'car')
      let motorcycleType = existingTypes.find(
        (vt: any) => vt.code === 'motorcycle',
      )

      if (!carType) {
        carType = await queries.createVehicleType({
          code: 'car',
          name: 'Car',
        })
      }

      if (!motorcycleType) {
        motorcycleType = await queries.createVehicleType({
          code: 'motorcycle',
          name: 'Motorcycle',
        })
      }

      // Get or create vehicle type rates (ensure specific rates for test)
      let carRate = await queries.getVehicleTypeRateByVehicleTypeId(carType.id)
      if (!carRate) {
        carRate = await queries.createVehicleTypeRate({
          vehicleTypeId: carType.id,
          ratePerHour: 5.0,
        })
      } else if (carRate.ratePerHour !== 5.0) {
        carRate = await queries.updateVehicleTypeRate(carRate.id, {
          ratePerHour: 5.0,
        })
      }

      let motorcycleRate = await queries.getVehicleTypeRateByVehicleTypeId(
        motorcycleType.id,
      )
      if (!motorcycleRate) {
        motorcycleRate = await queries.createVehicleTypeRate({
          vehicleTypeId: motorcycleType.id,
          ratePerHour: 3.0,
        })
      } else if (motorcycleRate.ratePerHour !== 3.0) {
        motorcycleRate = await queries.updateVehicleTypeRate(
          motorcycleRate.id,
          {
            ratePerHour: 3.0,
          },
        )
      }

      const zone = await queries.createParkingZone({
        name: 'Test Zone',
        latitude: 40.7128,
        longitude: -74.006,
        rateMultiplier: 1.0,
      })

      // Reload parking zones and vehicle type rates to include new data in the store
      await parkingStore.loadParkingZones()
      await parkingStore.loadVehicleTypeRates()

      const carCost = parkingStore.calculateParkingCost(carType.id, zone.id, 60)
      const motorcycleCost = parkingStore.calculateParkingCost(
        motorcycleType.id,
        zone.id,
        60,
      )

      expect(carCost).toBe(5.0)
      expect(motorcycleCost).toBe(3.0)
      expect(carCost).toBeGreaterThan(motorcycleCost)
    })
  })

  describe('Actual Cost vs Planned Cost', () => {
    test('actual cost matches planned cost when duration matches', async () => {
      const vehicleType = await queries.getVehicleTypeByCode('car')
      if (!vehicleType) throw new Error('Vehicle type not found')

      // Ensure vehicle type rate is 5.0/hour for consistent test expectations
      let vehicleTypeRate = await queries.getVehicleTypeRateByVehicleTypeId(
        vehicleType.id,
      )
      if (!vehicleTypeRate) {
        vehicleTypeRate = await queries.createVehicleTypeRate({
          vehicleTypeId: vehicleType.id,
          ratePerHour: 5.0,
        })
      } else if (vehicleTypeRate.ratePerHour !== 5.0) {
        vehicleTypeRate = await queries.updateVehicleTypeRate(
          vehicleTypeRate.id,
          {
            ratePerHour: 5.0,
          },
        )
      }

      // Reload vehicle type rates to update the store
      await parkingStore.loadVehicleTypeRates()

      const zone = await queries.createParkingZone({
        name: 'Test Zone',
        latitude: 40.7128,
        longitude: -74.006,
        rateMultiplier: 1.0,
      })

      // Reload parking zones to include the new zone in the store
      await parkingStore.loadParkingZones()

      const startTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      const plannedEndTime = new Date().toISOString()

      const booking = await queries.createParkingHistory({
        userId: testUser.id,
        vehicleId: vehicle.id,
        parkingZoneId: zone.id,
        startTime,
        plannedEndTime,
        plannedDurationMinutes: 60,
        chargedAmount: 5.0,
        status: 'active',
      })

      await parkingStore.loadParkingHistory()

      // End session (should calculate actual cost)
      const updated = await parkingStore.endParkingSession(booking.id)

      // Actual duration should be approximately 60 minutes
      expect(updated?.actualDurationMinutes).toBeGreaterThanOrEqual(59)
      expect(updated?.actualDurationMinutes).toBeLessThanOrEqual(61)

      // Actual cost should be close to planned cost (5.0/hour * 1 hour = 5.0)
      expect(updated?.chargedAmount).toBeGreaterThanOrEqual(4.9)
      expect(updated?.chargedAmount).toBeLessThanOrEqual(5.1)
    })
  })
})
