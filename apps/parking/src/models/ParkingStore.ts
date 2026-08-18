import { types, flow, Instance, SnapshotOut, SnapshotIn } from 'mobx-state-tree'
import { getRootStore } from './helpers/getRootStore'
import {
  // Vehicle Types
  getVehicleTypes,

  // Vehicle Type Rates
  getVehicleTypeRates,

  // Vehicles
  createVehicle,
  getVehiclesByUserId,
  updateVehicle,
  deleteVehicle,

  // Parking Zones
  getParkingZones,

  // Parking History
  createParkingHistory,
  getParkingHistoryByUserId,
  updateParkingHistory,

  // Payment Methods
  createPaymentMethod,
  getPaymentMethodsByUserId,
  updatePaymentMethod,
  deletePaymentMethod,

  // User Locations
  createUserLocation,
  getUserLocationsByUserId,
  updateUserLocation,
  deleteUserLocation,
} from '@/db/queries'

// MODELS

const VehicleTypeModel = types.model('VehicleType', {
  id: types.identifierNumber,
  code: types.string,
  name: types.string,
  description: types.maybeNull(types.string),
  metadata: types.maybeNull(types.string),
  createdAt: types.string,
})

const VehicleTypeRateModel = types.model('VehicleTypeRate', {
  id: types.identifierNumber,
  vehicleTypeId: types.number,
  ratePerHour: types.number,
  currency: types.string,
  createdAt: types.string,
})

const VehicleModel = types.model('Vehicle', {
  id: types.identifierNumber,
  userId: types.number,
  vehicleTypeId: types.number,
  plateNumber: types.string,
  nickname: types.maybeNull(types.string),
  make: types.maybeNull(types.string),
  model: types.maybeNull(types.string),
  color: types.maybeNull(types.string),
  year: types.maybeNull(types.number),
  isDefault: types.number,
  createdAt: types.string,
  updatedAt: types.string,
  metadata: types.maybeNull(types.string),
})

const ParkingZoneModel = types.model('ParkingZone', {
  id: types.identifierNumber,
  name: types.string,
  description: types.maybeNull(types.string),
  latitude: types.number,
  longitude: types.number,
  zoneCode: types.maybeNull(types.string),
  operator: types.maybeNull(types.string),
  zoneType: types.maybeNull(types.string),
  capacity: types.maybeNull(types.number),
  rateCurrency: types.string,
  rateMultiplier: types.number,
  isActive: types.number,
  createdAt: types.string,
  updatedAt: types.string,
  metadata: types.maybeNull(types.string),
})

const ParkingHistoryModel = types.model('ParkingHistory', {
  id: types.identifierNumber,
  userId: types.number,
  vehicleId: types.number,
  parkingZoneId: types.number,
  startTime: types.maybeNull(types.string),
  plannedEndTime: types.maybeNull(types.string),
  actualEndTime: types.maybeNull(types.string),
  plannedDurationMinutes: types.maybeNull(types.number),
  actualDurationMinutes: types.maybeNull(types.number),
  chargedAmount: types.number,
  currency: types.string,
  status: types.string,
  metadata: types.maybeNull(types.string),
  createdAt: types.string,
  updatedAt: types.string,
})

const PaymentMethodModel = types.model('PaymentMethod', {
  id: types.identifierNumber,
  userId: types.number,
  type: types.string,
  provider: types.maybeNull(types.string),
  displayName: types.maybeNull(types.string),
  cardNumber: types.string,
  lastFour: types.string,
  expiryMonth: types.maybeNull(types.number),
  expiryYear: types.maybeNull(types.number),
  isDefault: types.number,
  createdAt: types.string,
  updatedAt: types.string,
  metadata: types.maybeNull(types.string),
})

const UserLocationModel = types.model('UserLocation', {
  id: types.identifierNumber,
  userId: types.number,
  label: types.maybeNull(types.string),
  address: types.string,
  latitude: types.maybeNull(types.number),
  longitude: types.maybeNull(types.number),
  isDefault: types.number,
  createdAt: types.string,
  updatedAt: types.string,
  metadata: types.maybeNull(types.string),
})

// DIALOG STATE MODEL

const DialogState = types.model('DialogState', {
  visible: types.optional(types.boolean, false),
  isSuccess: types.optional(types.boolean, true),
  message: types.optional(types.string, ''),
  subMessage: types.optional(types.string, ''),
})

// Callback registry for alert confirmations (outside MST since functions can't be serialized)
const alertCallbackRegistry = new Map<string, () => void>()
let alertCallbackIdCounter = 0

const AlertState = types.model('AlertState', {
  visible: types.optional(types.boolean, false),
  title: types.optional(types.string, ''),
  message: types.optional(types.string, ''),
  preset: types.optional(
    types.enumeration(['default', 'success', 'error', 'warning', 'delete']),
    'default',
  ),
  onConfirmCallbackId: types.maybeNull(types.string),
})

// PARKING STORE

export const ParkingStore = types
  .model('ParkingStore', {
    // Loading states
    loading: types.optional(types.boolean, false),
    vehiclesLoading: types.optional(types.boolean, false),
    zonesLoading: types.optional(types.boolean, false),
    zonesReady: types.optional(types.boolean, false),
    historyLoading: types.optional(types.boolean, false),
    paymentMethodsLoading: types.optional(types.boolean, false),
    locationsLoading: types.optional(types.boolean, false),

    // Dialog states
    dialogState: types.optional(DialogState, {}),
    alertState: types.optional(AlertState, {}),

    // Data arrays
    vehicleTypes: types.optional(types.array(VehicleTypeModel), []),
    vehicleTypeRates: types.optional(types.array(VehicleTypeRateModel), []),
    vehicles: types.optional(types.array(VehicleModel), []),
    parkingZones: types.optional(types.array(ParkingZoneModel), []),
    parkingHistory: types.optional(types.array(ParkingHistoryModel), []),
    paymentMethods: types.optional(types.array(PaymentMethodModel), []),
    userLocations: types.optional(types.array(UserLocationModel), []),

    // Selected items
    selectedVehicle: types.maybeNull(types.reference(VehicleModel)),
    selectedParkingZone: types.maybeNull(types.reference(ParkingZoneModel)),
    selectedParkingHistory: types.maybeNull(
      types.reference(ParkingHistoryModel),
    ),
    selectedPaymentMethod: types.maybeNull(types.reference(PaymentMethodModel)),

    // Form states
    vehicleForm: types.optional(
      types.model({
        nickname: types.optional(types.string, ''),
        make: types.optional(types.string, ''),
        model: types.optional(types.string, ''),
        color: types.optional(types.string, ''),
        year: types.optional(types.string, ''),
        plateNumber: types.optional(types.string, ''),
        vehicleTypeId: types.maybeNull(types.number),
        showVehicleTypeDropdown: types.optional(types.boolean, false),
        currentFocused: types.maybeNull(types.string),
      }),
      {},
    ),
    vehicleManagementUI: types.optional(
      types.model({
        showDeleteConfirm: types.optional(types.boolean, false),
        vehicleToDelete: types.maybeNull(types.number),
      }),
      {},
    ),
    parkingBookingForm: types.optional(
      types.model({
        vehicleId: types.maybeNull(types.number),
        parkingZoneId: types.maybeNull(types.number),
        startTime: types.optional(types.string, ''),
        plannedEndTime: types.optional(types.string, ''),
        plannedDurationMinutes: types.maybeNull(types.number),
        showVehicleDropdown: types.optional(types.boolean, false),
        extendingSessionId: types.maybeNull(types.number),
        currentFocused: types.maybeNull(types.string),
      }),
      {},
    ),
    searchForm: types.optional(
      types.model({
        searchQuery: types.optional(types.string, ''),
        currentFocused: types.maybeNull(types.string),
      }),
      {},
    ),
    historyFilter: types.optional(
      types.model({
        sortBy: types.optional(types.enumeration(['date', 'cost']), 'date'),
        sortOrder: types.optional(types.enumeration(['asc', 'desc']), 'desc'),
        filterVehicleId: types.maybeNull(types.number),
        showFilterDropdown: types.optional(types.boolean, false),
      }),
      {},
    ),
    paymentForm: types.optional(
      types.model({
        selectedPaymentMethodId: types.maybeNull(types.number),
        showPaymentDropdown: types.optional(types.boolean, false),
        isProcessing: types.optional(types.boolean, false),
      }),
      {},
    ),
    paymentMethodForm: types.optional(
      types.model({
        nameOnCard: types.optional(types.string, ''),
        cardNumber: types.optional(types.string, ''),
        expiryMonth: types.optional(types.string, ''),
        expiryYear: types.optional(types.string, ''),
        type: types.optional(types.string, ''),
        lastFour: types.optional(types.string, ''),
        provider: types.optional(types.string, ''),
        displayName: types.optional(types.string, ''),
        currentFocused: types.maybeNull(types.string),
      }),
      {},
    ),
    paymentMethodFormErrors: types.optional(
      types.model({
        nameOnCard: types.optional(types.string, ''),
        cardNumber: types.optional(types.string, ''),
        expiryMonth: types.optional(types.string, ''),
        expiryYear: types.optional(types.string, ''),
      }),
      {},
    ),
    paymentMethodUI: types.optional(
      types.model({
        showAddModal: types.optional(types.boolean, false),
        deletePaymentId: types.maybeNull(types.number),
      }),
      {},
    ),
    vehicleFormErrors: types.optional(
      types.model({
        plateNumber: types.optional(types.string, ''),
        vehicleTypeId: types.optional(types.string, ''),
        make: types.optional(types.string, ''),
        model: types.optional(types.string, ''),
        color: types.optional(types.string, ''),
        year: types.optional(types.string, ''),
      }),
      {},
    ),
    locationForm: types.optional(
      types.model({
        label: types.optional(types.string, ''),
        address: types.optional(types.string, ''),
        latitude: types.maybeNull(types.number),
        longitude: types.maybeNull(types.number),
      }),
      {},
    ),
  })
  .views(self => ({
    // Get default vehicle
    get defaultVehicle() {
      return (
        self.vehicles.find(v => v.isDefault === 1) || self.vehicles[0] || null
      )
    },

    // Get default payment method
    get defaultPaymentMethod() {
      return (
        self.paymentMethods.find(pm => pm.isDefault === 1) ||
        self.paymentMethods[0] ||
        null
      )
    },

    // Get default user
    get defaultUserLocation() {
      return (
        self.userLocations.find(loc => loc.isDefault === 1) ||
        self.userLocations[0] ||
        null
      )
    },

    // Get active parking sessions
    get activeParkingSessions() {
      return self.parkingHistory.filter(ph => ph.status === 'active')
    },

    // Get completed parking sessions
    get completedParkingSessions() {
      return self.parkingHistory.filter(
        ph => ph.status === 'completed' || ph.status === 'expired',
      )
    },

    // Get filtered and sorted history
    get filteredHistory() {
      // Get completed/expired sessions directly
      let history = self.parkingHistory.filter(
        ph => ph.status === 'completed' || ph.status === 'expired',
      )

      // Filter by vehicle if selected
      if (self.historyFilter.filterVehicleId) {
        history = history.filter(
          (h: typeof ParkingHistoryModel.Type) =>
            h.vehicleId === self.historyFilter.filterVehicleId,
        )
      }

      // Sort
      const sorted = [...history].sort((a, b) => {
        if (self.historyFilter.sortBy === 'date') {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return self.historyFilter.sortOrder === 'desc'
            ? dateB - dateA
            : dateA - dateB
        } else {
          // Sort by cost
          return self.historyFilter.sortOrder === 'desc'
            ? b.chargedAmount - a.chargedAmount
            : a.chargedAmount - b.chargedAmount
        }
      })

      return sorted
    },

    // Get vehicle by ID
    getVehicleById(id: number) {
      return self.vehicles.find(v => v.id === id) || null
    },

    // Get parking zone by ID
    getParkingZoneById(id: number) {
      return self.parkingZones.find(z => z.id === id) || null
    },

    // Get active parking zones
    get activeParkingZones() {
      return self.parkingZones.filter(z => z.isActive === 1)
    },

    // Calculate parking cost
    calculateParkingCost(
      vehicleTypeId: number,
      zoneId: number,
      durationMinutes: number,
    ): number {
      const rate = self.vehicleTypeRates.find(
        r => r.vehicleTypeId === vehicleTypeId,
      )
      const zone = self.parkingZones.find(z => z.id === zoneId)

      if (!rate || !zone) return 0

      const hours = durationMinutes / 60
      const baseCost = rate.ratePerHour * hours
      return baseCost * zone.rateMultiplier
    },

    // Get filtered zones based on search query
    get filteredParkingZones() {
      const query = self.searchForm.searchQuery.trim().toLowerCase()
      const activeZones = self.parkingZones.filter(z => z.isActive === 1)

      if (!query) {
        return activeZones
      }

      return activeZones.filter(
        (zone: any) =>
          zone.zoneCode?.toLowerCase().includes(query) ||
          zone.name.toLowerCase().includes(query) ||
          zone.operator?.toLowerCase().includes(query),
      )
    },
  }))
  .actions(self => {
    // VEHICLE TYPE ACTIONS

    const loadVehicleTypes = flow(function* () {
      try {
        self.loading = true
        const types = yield getVehicleTypes()
        self.vehicleTypes.replace(types)
      } catch (error) {
        console.error('Failed to load vehicle types:', error)
      } finally {
        self.loading = false
      }
    })

    const loadVehicleTypeRates = flow(function* () {
      try {
        self.loading = true
        const rates = yield getVehicleTypeRates()
        self.vehicleTypeRates.replace(rates)
      } catch (error) {
        console.error('Failed to load vehicle type rates:', error)
      } finally {
        self.loading = false
      }
    })

    // VEHICLE ACTIONS

    const loadVehicles = flow(function* () {
      try {
        self.vehiclesLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          console.log('No user ID available')
          self.vehicles.clear()
          return
        }

        const vehicles = yield getVehiclesByUserId(userId)
        self.vehicles.replace(vehicles)
      } catch (error) {
        console.error('Failed to load vehicles:', error)
      } finally {
        self.vehiclesLoading = false
      }
    })

    const addVehicle = flow(function* (data: {
      vehicleTypeId: number
      plateNumber: string
      nickname?: string
      make?: string
      model?: string
      color?: string
      year?: number
      isDefault?: number
    }) {
      try {
        self.vehiclesLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          throw new Error('User not authenticated')
        }

        const vehicle = yield createVehicle({
          userId,
          ...data,
        })

        // Reload vehicles to get updated list
        yield loadVehicles()

        return vehicle
      } catch (error) {
        console.error('Failed to add vehicle:', error)
        throw error
      } finally {
        self.vehiclesLoading = false
      }
    })

    const updateVehicleById = flow(function* (
      vehicleId: number,
      updates: Partial<{
        nickname: string
        make: string
        model: string
        color: string
        year: number
        isDefault: number
      }>,
    ) {
      try {
        self.vehiclesLoading = true
        const updated = yield updateVehicle(vehicleId, updates)

        // Update local state
        const index = self.vehicles.findIndex(v => v.id === vehicleId)
        if (index !== -1 && updated) {
          self.vehicles[index] = updated
        }

        return updated
      } catch (error) {
        console.error('Failed to update vehicle:', error)
        throw error
      } finally {
        self.vehiclesLoading = false
      }
    })

    const removeVehicle = flow(function* (vehicleId: number) {
      try {
        self.vehiclesLoading = true
        yield deleteVehicle(vehicleId)

        // Remove from local state
        self.vehicles.replace(self.vehicles.filter(v => v.id !== vehicleId))

        // Also remove parking history records for this vehicle from local state
        self.parkingHistory.replace(
          self.parkingHistory.filter(h => h.vehicleId !== vehicleId),
        )
      } catch (error) {
        console.error('Failed to remove vehicle:', error)
        throw error
      } finally {
        self.vehiclesLoading = false
      }
    })

    const setSelectedVehicle = (vehicle: typeof VehicleModel.Type | null) => {
      self.selectedVehicle = vehicle
    }

    // PARKING ZONE ACTIONS

    const loadParkingZones = flow(function* () {
      try {
        self.zonesLoading = true
        self.zonesReady = false
        const zones = yield getParkingZones()
        self.parkingZones.replace(zones)
        self.zonesReady = true
      } catch (error) {
        console.error('Failed to load parking zones:', error)
        self.zonesReady = false
      } finally {
        self.zonesLoading = false
      }
    })

    const setZonesReady = (ready: boolean) => {
      self.zonesReady = ready
    }

    const setSelectedParkingZone = (
      zone: typeof ParkingZoneModel.Type | null,
    ) => {
      self.selectedParkingZone = zone
    }

    // PARKING HISTORY ACTIONS

    const loadParkingHistory = flow(function* () {
      try {
        self.historyLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          console.log('No user ID available')
          self.parkingHistory.clear()
          return
        }

        const history = yield getParkingHistoryByUserId(userId)
        self.parkingHistory.replace(history)
      } catch (error) {
        console.error('Failed to load parking history:', error)
      } finally {
        self.historyLoading = false
      }
    })

    const bookParking = flow(function* (data: {
      vehicleId: number
      parkingZoneId: number
      plannedDurationMinutes: number
      paymentMethodId?: number
    }) {
      try {
        self.historyLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          throw new Error('User not authenticated')
        }

        // Calculate cost
        const vehicle = self.vehicles.find(v => v.id === data.vehicleId)
        if (!vehicle) {
          throw new Error('Vehicle not found')
        }

        const cost = self.calculateParkingCost(
          vehicle.vehicleTypeId,
          data.parkingZoneId,
          data.plannedDurationMinutes,
        )

        // Calculate start and end times
        const startTime = new Date()
        const endTime = new Date(
          startTime.getTime() + data.plannedDurationMinutes * 60000,
        )

        console.log('=== PARKINGSTORE: Creating Booking ===')
        console.log('User ID:', userId)
        console.log('Vehicle ID:', data.vehicleId)
        console.log('Zone ID:', data.parkingZoneId)
        console.log('Duration:', data.plannedDurationMinutes, 'minutes')
        console.log('Calculated Cost:', cost)
        console.log('Start Time:', startTime.toISOString())
        console.log('End Time:', endTime.toISOString())

        // Create parking history
        const parkingHistory = yield createParkingHistory({
          userId,
          vehicleId: data.vehicleId,
          parkingZoneId: data.parkingZoneId,
          startTime: startTime.toISOString(),
          plannedEndTime: endTime.toISOString(),
          plannedDurationMinutes: data.plannedDurationMinutes,
          chargedAmount: cost,
          status: 'active',
        })

        console.log(
          'Created parking history record:',
          JSON.stringify(parkingHistory, null, 2),
        )

        // Reload parking history
        yield loadParkingHistory()

        console.log(
          'Reloaded parking history. Total records:',
          self.parkingHistory.length,
        )
        console.log(
          'Active sessions after reload:',
          self.activeParkingSessions.length,
        )
        console.log('======================================')

        return parkingHistory
      } catch (error) {
        console.error('Failed to book parking:', error)
        throw error
      } finally {
        self.historyLoading = false
      }
    })

    const endParkingSession = flow(function* (historyId: number) {
      try {
        self.historyLoading = true
        const history = self.parkingHistory.find(h => h.id === historyId)

        if (!history) {
          throw new Error('Parking history not found')
        }

        const now = new Date().toISOString()
        const startTime = history.startTime
          ? new Date(history.startTime)
          : new Date()
        const actualDurationMinutes = Math.floor(
          (new Date(now).getTime() - startTime.getTime()) / 60000,
        )

        // Keep the original charged amount - don't recalculate
        // User already paid for the planned duration
        const updated = yield updateParkingHistory(historyId, {
          actualEndTime: now,
          actualDurationMinutes,
          status: 'completed',
        })

        // Update local state
        const index = self.parkingHistory.findIndex(h => h.id === historyId)
        if (index !== -1 && updated) {
          self.parkingHistory[index] = updated
        }

        return updated
      } catch (error) {
        console.error('Failed to end parking session:', error)
        throw error
      } finally {
        self.historyLoading = false
      }
    })

    const expireSessionIfNeeded = flow(function* (
      session: typeof ParkingHistoryModel.Type,
    ) {
      const now = new Date()
      const endTime = session.plannedEndTime
        ? new Date(session.plannedEndTime)
        : null

      if (session.status !== 'active' || !endTime || now < endTime) {
        return session
      }

      console.log(`Session ${session.id} has expired, updating status...`)

      const startTime = session.startTime
        ? new Date(session.startTime)
        : new Date()
      const actualDurationMinutes = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 60000,
      )

      const updated = yield updateParkingHistory(session.id, {
        actualEndTime: endTime.toISOString(),
        actualDurationMinutes,
        status: 'expired',
      })

      const index = self.parkingHistory.findIndex(h => h.id === session.id)
      if (index !== -1 && updated) {
        self.parkingHistory[index] = updated
      }

      if (self.parkingBookingForm.extendingSessionId === session.id) {
        self.parkingBookingForm.extendingSessionId = null
      }

      return updated || session
    })

    const checkAndExpireSessions = flow(function* () {
      try {
        const activeSessions = self.activeParkingSessions

        for (const session of activeSessions) {
          yield expireSessionIfNeeded(session)
        }
      } catch (error) {
        console.error('Failed to check and expire sessions:', error)
      }
    })

    const setSelectedParkingHistory = (
      history: typeof ParkingHistoryModel.Type | null,
    ) => {
      self.selectedParkingHistory = history
    }

    // PAYMENT METHOD ACTIONS

    const loadPaymentMethods = flow(function* () {
      try {
        self.paymentMethodsLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          console.log('No user ID available')
          self.paymentMethods.clear()
          return
        }

        const methods = yield getPaymentMethodsByUserId(userId)
        self.paymentMethods.replace(methods)
      } catch (error) {
        console.error('Failed to load payment methods:', error)
      } finally {
        self.paymentMethodsLoading = false
      }
    })

    const addPaymentMethod = flow(function* (data: {
      type: string
      cardNumber: string
      lastFour: string
      expiryMonth?: number
      expiryYear?: number
      provider?: string
      displayName?: string
      isDefault?: number
    }) {
      try {
        self.paymentMethodsLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          throw new Error('User not authenticated')
        }

        const method = yield createPaymentMethod({
          userId,
          ...data,
        })

        // Reload payment methods
        yield loadPaymentMethods()

        return method
      } catch (error) {
        console.error('Failed to add payment method:', error)
        throw error
      } finally {
        self.paymentMethodsLoading = false
      }
    })

    const updatePaymentMethodById = flow(function* (
      paymentMethodId: number,
      updates: Partial<{
        type: string
        cardNumber: string
        lastFour: string
        expiryMonth: number
        expiryYear: number
        provider: string
        displayName: string
        isDefault: number
      }>,
    ) {
      try {
        self.paymentMethodsLoading = true

        // If setting this payment method as default, unset all others
        if (updates.isDefault === 1) {
          // First, set all other payment methods to non-default
          for (const pm of self.paymentMethods) {
            if (pm.id !== paymentMethodId && pm.isDefault === 1) {
              yield updatePaymentMethod(pm.id, { isDefault: 0 })
              // Update local state
              const pmIndex = self.paymentMethods.findIndex(p => p.id === pm.id)
              if (pmIndex !== -1) {
                self.paymentMethods[pmIndex] = {
                  ...self.paymentMethods[pmIndex],
                  isDefault: 0,
                }
              }
            }
          }
        }

        // Now update the target payment method
        const updated = yield updatePaymentMethod(paymentMethodId, updates)

        // Update local state
        const index = self.paymentMethods.findIndex(
          pm => pm.id === paymentMethodId,
        )
        if (index !== -1 && updated) {
          self.paymentMethods[index] = updated
        }

        return updated
      } catch (error) {
        console.error('Failed to update payment method:', error)
        throw error
      } finally {
        self.paymentMethodsLoading = false
      }
    })

    const removePaymentMethod = flow(function* (paymentMethodId: number) {
      try {
        self.paymentMethodsLoading = true
        yield deletePaymentMethod(paymentMethodId)

        // Remove from local state
        self.paymentMethods.replace(
          self.paymentMethods.filter(pm => pm.id !== paymentMethodId),
        )
      } catch (error) {
        console.error('Failed to remove payment method:', error)
        throw error
      } finally {
        self.paymentMethodsLoading = false
      }
    })

    const setSelectedPaymentMethod = (
      method: typeof PaymentMethodModel.Type | null,
    ) => {
      self.selectedPaymentMethod = method
    }

    // USER LOCATION ACTIONS

    const loadUserLocations = flow(function* () {
      try {
        self.locationsLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          console.log('No user ID available')
          self.userLocations.clear()
          return
        }

        const locations = yield getUserLocationsByUserId(userId)
        self.userLocations.replace(locations)
      } catch (error) {
        console.error('Failed to load user locations:', error)
      } finally {
        self.locationsLoading = false
      }
    })

    const addUserLocation = flow(function* (data: {
      label?: string
      address: string
      latitude?: number
      longitude?: number
      isDefault?: number
    }) {
      try {
        self.locationsLoading = true
        const store = getRootStore(self)
        const userId = store.userStore.user?.id

        if (!userId) {
          throw new Error('User not authenticated')
        }

        const location = yield createUserLocation({
          userId,
          ...data,
        })

        // Reload locations
        yield loadUserLocations()

        return location
      } catch (error) {
        console.error('Failed to add user location:', error)
        throw error
      } finally {
        self.locationsLoading = false
      }
    })

    const updateUserLocationById = flow(function* (
      locationId: number,
      updates: Partial<{
        label: string
        address: string
        latitude: number
        longitude: number
        isDefault: number
      }>,
    ) {
      try {
        self.locationsLoading = true
        const updated = yield updateUserLocation(locationId, updates)

        // Update local state
        const index = self.userLocations.findIndex(loc => loc.id === locationId)
        if (index !== -1 && updated) {
          self.userLocations[index] = updated
        }

        return updated
      } catch (error) {
        console.error('Failed to update user location:', error)
        throw error
      } finally {
        self.locationsLoading = false
      }
    })

    const removeUserLocation = flow(function* (locationId: number) {
      try {
        self.locationsLoading = true
        yield deleteUserLocation(locationId)

        // Remove from local state
        self.userLocations.replace(
          self.userLocations.filter(loc => loc.id !== locationId),
        )
      } catch (error) {
        console.error('Failed to remove user location:', error)
        throw error
      } finally {
        self.locationsLoading = false
      }
    })

    // FORM ACTIONS

    const resetVehicleForm = () => {
      self.vehicleForm.nickname = ''
      self.vehicleForm.make = ''
      self.vehicleForm.model = ''
      self.vehicleForm.color = ''
      self.vehicleForm.year = ''
      self.vehicleForm.plateNumber = ''
      self.vehicleForm.vehicleTypeId = null
      self.vehicleForm.showVehicleTypeDropdown = false
      self.vehicleForm.currentFocused = null
      clearVehicleFormErrors()
    }

    const setVehicleFormFocused = (field: string | null) => {
      self.vehicleForm.currentFocused = field
    }

    const setVehicleFormField = (
      field: string,
      value: string | number | null,
    ) => {
      ;(self.vehicleForm as any)[field] = value
      // Clear error when user types/selects
      if (field === 'vehicleTypeId' && value !== null) {
        self.vehicleFormErrors.vehicleTypeId = ''
      } else if (
        field !== 'vehicleTypeId' &&
        (self.vehicleFormErrors as any)[field]
      ) {
        ;(self.vehicleFormErrors as any)[field] = ''
      }
    }

    const toggleVehicleTypeDropdown = () => {
      self.vehicleForm.showVehicleTypeDropdown =
        !self.vehicleForm.showVehicleTypeDropdown
    }

    const showDeleteVehicleConfirm = (vehicleId: number) => {
      self.vehicleManagementUI.showDeleteConfirm = true
      self.vehicleManagementUI.vehicleToDelete = vehicleId
    }

    const hideDeleteVehicleConfirm = () => {
      self.vehicleManagementUI.showDeleteConfirm = false
      self.vehicleManagementUI.vehicleToDelete = null
    }

    const deleteVehicleWithValidation = flow(function* (vehicleId: number) {
      try {
        // Check if THIS SPECIFIC vehicle has an ACTIVE parking session only
        const activeSessions = self.activeParkingSessions
        console.log(
          `[Delete Vehicle] Checking vehicle ${vehicleId} for active sessions`,
        )
        console.log(
          `[Delete Vehicle] Total active sessions: ${activeSessions.length}`,
        )

        const activeSessionForThisVehicle = activeSessions.find(
          h => h.vehicleId === vehicleId,
        )

        console.log(
          `[Delete Vehicle] Active session for vehicle ${vehicleId}:`,
          activeSessionForThisVehicle,
        )

        if (activeSessionForThisVehicle) {
          console.log(
            `[Delete Vehicle] Vehicle ${vehicleId} has active session, blocking deletion`,
          )
          throw new Error('Cannot delete vehicle with active parking session')
        }

        console.log(
          `[Delete Vehicle] No active session found for vehicle ${vehicleId}, proceeding with deletion`,
        )
        // Delete the vehicle
        // Note: deleteVehicle will automatically delete completed/expired parking history records
        yield removeVehicle(vehicleId)

        hideDeleteVehicleConfirm()
        return true
      } catch (error: any) {
        console.error('[Delete Vehicle] Failed to delete vehicle:', error)
        throw error
      }
    })

    const resetParkingBookingForm = () => {
      self.parkingBookingForm.vehicleId = null
      self.parkingBookingForm.parkingZoneId = null
      self.parkingBookingForm.startTime = ''
      self.parkingBookingForm.plannedEndTime = ''
      self.parkingBookingForm.plannedDurationMinutes = null
      self.parkingBookingForm.showVehicleDropdown = false
      self.parkingBookingForm.extendingSessionId = null
      self.parkingBookingForm.currentFocused = null
    }

    const setBookingFormFocused = (field: string | null) => {
      self.parkingBookingForm.currentFocused = field
    }

    const setBookingVehicle = (vehicleId: number | null) => {
      self.parkingBookingForm.vehicleId = vehicleId
    }

    const setBookingDuration = (minutes: number | null) => {
      self.parkingBookingForm.plannedDurationMinutes = minutes
    }

    const toggleVehicleDropdown = () => {
      self.parkingBookingForm.showVehicleDropdown =
        !self.parkingBookingForm.showVehicleDropdown
    }

    const setExtendingSession = (sessionId: number | null) => {
      self.parkingBookingForm.extendingSessionId = sessionId
    }

    const extendParkingSession = flow(function* (
      sessionId: number,
      additionalMinutes: number,
      paymentMethodId?: number,
    ) {
      try {
        self.historyLoading = true
        const session = self.parkingHistory.find(h => h.id === sessionId)

        if (!session) {
          throw new Error('Parking session not found')
        }

        if (session.status !== 'active') {
          throw new Error(
            'This parking session is no longer active and cannot be extended.',
          )
        }

        const currentEndTime = session.plannedEndTime
          ? new Date(session.plannedEndTime)
          : null
        const now = new Date()

        if (currentEndTime && now >= currentEndTime) {
          const updatedSession = yield expireSessionIfNeeded(session)
          if (updatedSession?.status === 'expired') {
            throw new Error(
              'This parking session has expired and can no longer be extended.',
            )
          }
        }

        // Calculate new end time
        const latestSession = self.parkingHistory.find(h => h.id === sessionId)
        if (!latestSession) {
          throw new Error('Parking session not found')
        }

        const latestEndTime = latestSession.plannedEndTime
          ? new Date(latestSession.plannedEndTime)
          : new Date()
        const newEndTime = new Date(
          latestEndTime.getTime() + additionalMinutes * 60000,
        )

        // Calculate new total duration
        const newTotalDuration =
          (latestSession.plannedDurationMinutes || 0) + additionalMinutes

        // Calculate additional cost
        const vehicle = self.vehicles.find(
          v => v.id === latestSession.vehicleId,
        )
        if (!vehicle) {
          throw new Error('Vehicle not found')
        }

        const additionalCost = self.calculateParkingCost(
          vehicle.vehicleTypeId,
          latestSession.parkingZoneId,
          additionalMinutes,
        )

        const newTotalCost = latestSession.chargedAmount + additionalCost

        console.log('=== EXTENDING SESSION ===')
        console.log('Session ID:', sessionId)
        console.log('Current End Time:', latestEndTime.toISOString())
        console.log('Additional Minutes:', additionalMinutes)
        console.log('New End Time:', newEndTime.toISOString())
        console.log('New Total Duration:', newTotalDuration, 'minutes')
        console.log('Additional Cost:', additionalCost)
        console.log('New Total Cost:', newTotalCost)
        console.log('Payment method', paymentMethodId)
        console.log('========================')

        // Update parking history
        const updated = yield updateParkingHistory(sessionId, {
          plannedEndTime: newEndTime.toISOString(),
          plannedDurationMinutes: newTotalDuration,
          chargedAmount: newTotalCost,
        })

        // Update local state
        const index = self.parkingHistory.findIndex(h => h.id === sessionId)
        if (index !== -1 && updated) {
          self.parkingHistory[index] = updated
        }

        return updated
      } catch (error) {
        console.error('Failed to extend parking session:', error)
        throw error
      } finally {
        self.historyLoading = false
      }
    })

    // SEARCH FORM ACTIONS

    const setSearchQuery = (query: string) => {
      self.searchForm.searchQuery = query
    }

    const clearSearchQuery = () => {
      self.searchForm.searchQuery = ''
    }

    const setSearchFocused = (field: string | null) => {
      self.searchForm.currentFocused = field
    }

    const resetSearchForm = () => {
      self.searchForm.searchQuery = ''
      self.searchForm.currentFocused = null
    }

    // HISTORY FILTER ACTIONS

    const setHistorySortBy = (sortBy: 'date' | 'cost') => {
      self.historyFilter.sortBy = sortBy
    }

    const setHistorySortOrder = (sortOrder: 'asc' | 'desc') => {
      self.historyFilter.sortOrder = sortOrder
    }

    const setHistoryFilterVehicle = (vehicleId: number | null) => {
      self.historyFilter.filterVehicleId = vehicleId
    }

    const toggleHistoryFilterDropdown = () => {
      self.historyFilter.showFilterDropdown =
        !self.historyFilter.showFilterDropdown
    }

    const resetHistoryFilter = () => {
      self.historyFilter.sortBy = 'date'
      self.historyFilter.sortOrder = 'desc'
      self.historyFilter.filterVehicleId = null
      self.historyFilter.showFilterDropdown = false
    }

    // PAYMENT FORM ACTIONS

    const setPaymentMethodId = (id: number | null) => {
      self.paymentForm.selectedPaymentMethodId = id
    }

    const togglePaymentDropdown = () => {
      self.paymentForm.showPaymentDropdown =
        !self.paymentForm.showPaymentDropdown
    }

    const setPaymentProcessing = (isProcessing: boolean) => {
      self.paymentForm.isProcessing = isProcessing
    }

    const resetPaymentForm = () => {
      self.paymentForm.selectedPaymentMethodId = null
      self.paymentForm.showPaymentDropdown = false
      self.paymentForm.isProcessing = false
    }

    const initializePaymentForm = () => {
      // Auto-select default payment method
      if (
        !self.paymentForm.selectedPaymentMethodId &&
        self.paymentMethods.length > 0
      ) {
        const defaultMethod = self.defaultPaymentMethod
        if (defaultMethod) {
          self.paymentForm.selectedPaymentMethodId = defaultMethod.id
        }
      }
    }

    const setPaymentMethodFormField = (field: string, value: string) => {
      ;(self.paymentMethodForm as any)[field] = value
      // Keep displayName in sync with nameOnCard
      if (field === 'nameOnCard') {
        self.paymentMethodForm.displayName = value
      }
      // Clear error when user types
      if ((self.paymentMethodFormErrors as any)[field]) {
        ;(self.paymentMethodFormErrors as any)[field] = ''
      }
    }

    const setPaymentMethodFormError = (field: string, error: string) => {
      ;(self.paymentMethodFormErrors as any)[field] = error
    }

    const clearPaymentMethodFormErrors = () => {
      self.paymentMethodFormErrors.nameOnCard = ''
      self.paymentMethodFormErrors.cardNumber = ''
      self.paymentMethodFormErrors.expiryMonth = ''
      self.paymentMethodFormErrors.expiryYear = ''
    }

    const resetPaymentMethodForm = () => {
      self.paymentMethodForm.nameOnCard = ''
      self.paymentMethodForm.cardNumber = ''
      self.paymentMethodForm.expiryMonth = ''
      self.paymentMethodForm.expiryYear = ''
      self.paymentMethodForm.type = ''
      self.paymentMethodForm.lastFour = ''
      self.paymentMethodForm.provider = ''
      self.paymentMethodForm.displayName = ''
      self.paymentMethodForm.currentFocused = null
      clearPaymentMethodFormErrors()
    }

    const setPaymentMethodFormFocused = (field: string | null) => {
      self.paymentMethodForm.currentFocused = field
    }

    const setVehicleFormError = (field: string, error: string) => {
      ;(self.vehicleFormErrors as any)[field] = error
    }

    const clearVehicleFormErrors = () => {
      self.vehicleFormErrors.plateNumber = ''
      self.vehicleFormErrors.vehicleTypeId = ''
      self.vehicleFormErrors.make = ''
      self.vehicleFormErrors.model = ''
      self.vehicleFormErrors.color = ''
      self.vehicleFormErrors.year = ''
    }

    const showPaymentMethodAddModal = () => {
      self.paymentMethodUI.showAddModal = true
    }

    const hidePaymentMethodAddModal = () => {
      self.paymentMethodUI.showAddModal = false
      resetPaymentMethodForm()
    }

    const setDeletePaymentMethodId = (id: number | null) => {
      self.paymentMethodUI.deletePaymentId = id
    }

    const resetLocationForm = () => {
      self.locationForm.label = ''
      self.locationForm.address = ''
      self.locationForm.latitude = null
      self.locationForm.longitude = null
    }

    // DIALOG ACTIONS

    const showDialog = (config: {
      isSuccess: boolean
      message: string
      subMessage?: string
    }) => {
      self.dialogState.visible = true
      self.dialogState.isSuccess = config.isSuccess
      self.dialogState.message = config.message
      self.dialogState.subMessage = config.subMessage || ''
    }

    const hideDialog = () => {
      self.dialogState.visible = false
      self.dialogState.isSuccess = true
      self.dialogState.message = ''
      self.dialogState.subMessage = ''
    }

    const showAlert = (config: {
      title?: string
      message: string
      preset?: 'default' | 'success' | 'error' | 'warning' | 'delete'
      onConfirm?: () => void
    }) => {
      // Clear any existing callback
      if (self.alertState.onConfirmCallbackId) {
        alertCallbackRegistry.delete(self.alertState.onConfirmCallbackId)
      }

      // Store callback in registry if provided
      let callbackId: string | null = null
      if (config.onConfirm) {
        callbackId = `alert_${++alertCallbackIdCounter}_${Date.now()}`
        alertCallbackRegistry.set(callbackId, config.onConfirm)
      }

      self.alertState.visible = true
      self.alertState.title = config.title || ''
      self.alertState.message = config.message
      self.alertState.preset = config.preset || 'default'
      self.alertState.onConfirmCallbackId = callbackId
    }

    const hideAlert = () => {
      // Clean up callback from registry
      if (self.alertState.onConfirmCallbackId) {
        alertCallbackRegistry.delete(self.alertState.onConfirmCallbackId)
      }

      self.alertState.visible = false
      self.alertState.title = ''
      self.alertState.message = ''
      self.alertState.preset = 'default'
      self.alertState.onConfirmCallbackId = null
    }

    // Helper to get the onConfirm callback
    const getAlertOnConfirm = (): (() => void) | null => {
      if (!self.alertState.onConfirmCallbackId) {
        return null
      }
      return (
        alertCallbackRegistry.get(self.alertState.onConfirmCallbackId) || null
      )
    }

    // INITIALIZATION

    const initialize = flow(function* () {
      try {
        // Load reference data first
        yield loadVehicleTypes()
        yield loadVehicleTypeRates()
        yield loadParkingZones()

        // Load user-specific data
        const store = getRootStore(self)
        if (store.userStore.user?.id) {
          yield loadVehicles()
          yield loadPaymentMethods()
          yield loadUserLocations()
          yield loadParkingHistory()
        }
      } catch (error) {
        console.error('Failed to initialize parking store:', error)
      }
    })

    // RESTORE

    const restore = flow(function* (data: any) {
      if (data) {
        // Don't restore data arrays - they should be loaded fresh from the database
        // This prevents stale data and ensures data consistency
        // Only restore UI state, form state, and selected items

        // Restore parking zones state (zonesReady flag) but not the zones themselves
        // Zones will be loaded fresh from database in initialize()
        if (data.parkingZones && data.parkingZones.length > 0) {
          self.zonesReady = true
        }

        // Restore form states
        if (data.searchForm) {
          self.searchForm.searchQuery = data.searchForm.searchQuery || ''
          self.searchForm.currentFocused =
            data.searchForm.currentFocused || null
        }
        if (data.parkingBookingForm) {
          Object.assign(self.parkingBookingForm, data.parkingBookingForm)
          if (data.parkingBookingForm.currentFocused !== undefined) {
            self.parkingBookingForm.currentFocused =
              data.parkingBookingForm.currentFocused || null
          }
        }
        if (data.vehicleForm) {
          Object.assign(self.vehicleForm, data.vehicleForm)
          if (data.vehicleForm.currentFocused !== undefined) {
            self.vehicleForm.currentFocused =
              data.vehicleForm.currentFocused || null
          }
        }
        if (data.paymentMethodForm) {
          Object.assign(self.paymentMethodForm, data.paymentMethodForm)
          if (data.paymentMethodForm.currentFocused !== undefined) {
            self.paymentMethodForm.currentFocused =
              data.paymentMethodForm.currentFocused || null
          }
        }
        if (data.historyFilter) {
          Object.assign(self.historyFilter, data.historyFilter)
        }
        if (data.paymentForm) {
          Object.assign(self.paymentForm, data.paymentForm)
        }
        if (data.paymentMethodForm) {
          Object.assign(self.paymentMethodForm, data.paymentMethodForm)
        }
        if (data.paymentMethodFormErrors) {
          Object.assign(
            self.paymentMethodFormErrors,
            data.paymentMethodFormErrors,
          )
        }
        if (data.selectedParkingZone) {
          self.selectedParkingZone = data.selectedParkingZone
        }
        if (data.selectedVehicle) {
          self.selectedVehicle = data.selectedVehicle
        }

        // Restore modal/dialog states
        if (data.dialogState) {
          self.dialogState.visible = data.dialogState.visible || false
          self.dialogState.isSuccess = data.dialogState.isSuccess ?? true
          self.dialogState.message = data.dialogState.message || ''
          self.dialogState.subMessage = data.dialogState.subMessage || ''
        }
        if (data.alertState) {
          self.alertState.visible = data.alertState.visible || false
          self.alertState.title = data.alertState.title || ''
          self.alertState.message = data.alertState.message || ''
          self.alertState.preset = data.alertState.preset || 'default'
          // Note: onConfirmCallbackId is not restored as callbacks can't be serialized
        }
        if (data.vehicleManagementUI) {
          // Only restore if not a delete confirmation (we don't want to restore delete confirmations)
          if (!data.vehicleManagementUI.showDeleteConfirm) {
            self.vehicleManagementUI.showDeleteConfirm =
              data.vehicleManagementUI.showDeleteConfirm || false
            self.vehicleManagementUI.vehicleToDelete =
              data.vehicleManagementUI.vehicleToDelete || null
          }
        }
        if (data.paymentMethodUI) {
          // Restore payment method modal state
          self.paymentMethodUI.showAddModal =
            data.paymentMethodUI.showAddModal || false
          // Only restore deletePaymentId if showAddModal is false (don't restore delete state if add modal is open)
          if (!data.paymentMethodUI.showAddModal) {
            self.paymentMethodUI.deletePaymentId =
              data.paymentMethodUI.deletePaymentId || null
          }
        }
      }
      // Reload fresh data after restore
      yield initialize()
    })

    return {
      // Vehicle Types
      loadVehicleTypes,
      loadVehicleTypeRates,

      // Vehicles
      loadVehicles,
      addVehicle,
      updateVehicleById,
      removeVehicle,
      setSelectedVehicle,

      // Parking Zones
      loadParkingZones,
      setSelectedParkingZone,
      setZonesReady,

      // Parking History
      loadParkingHistory,
      bookParking,
      endParkingSession,
      checkAndExpireSessions,
      setSelectedParkingHistory,

      // Payment Methods
      loadPaymentMethods,
      addPaymentMethod,
      updatePaymentMethodById,
      removePaymentMethod,
      setSelectedPaymentMethod,

      // User Locations
      loadUserLocations,
      addUserLocation,
      updateUserLocationById,
      removeUserLocation,

      // Forms
      resetVehicleForm,
      setVehicleFormField,
      setVehicleFormFocused,
      toggleVehicleTypeDropdown,
      showDeleteVehicleConfirm,
      hideDeleteVehicleConfirm,
      deleteVehicleWithValidation,
      resetParkingBookingForm,
      setBookingVehicle,
      setBookingDuration,
      setBookingFormFocused,
      toggleVehicleDropdown,
      setExtendingSession,
      extendParkingSession,
      setSearchQuery,
      clearSearchQuery,
      setSearchFocused,
      resetSearchForm,
      setHistorySortBy,
      setHistorySortOrder,
      setHistoryFilterVehicle,
      toggleHistoryFilterDropdown,
      resetHistoryFilter,
      setPaymentMethodId,
      togglePaymentDropdown,
      setPaymentProcessing,
      resetPaymentForm,
      initializePaymentForm,
      resetPaymentMethodForm,
      setPaymentMethodFormField,
      setPaymentMethodFormFocused,
      setPaymentMethodFormError,
      clearPaymentMethodFormErrors,
      setVehicleFormError,
      clearVehicleFormErrors,
      showPaymentMethodAddModal,
      hidePaymentMethodAddModal,
      setDeletePaymentMethodId,
      resetLocationForm,

      // Dialogs
      showDialog,
      hideDialog,
      showAlert,
      hideAlert,
      getAlertOnConfirm,

      // Initialization
      initialize,
      restore,
    }
  })

export interface ParkingStoreModel extends Instance<typeof ParkingStore> {}
export interface ParkingStoreSnapshot
  extends SnapshotOut<typeof ParkingStore> {}
export interface ParkingStoreSnapshotIn
  extends SnapshotIn<typeof ParkingStore> {}
