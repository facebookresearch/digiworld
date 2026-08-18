import { types, flow, Instance, getSnapshot, getRoot } from 'mobx-state-tree'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'

export type RideStatus =
  | 'booked'
  | 'driver-assigned'
  | 'started'
  | 'ongoing'
  | 'completed'
  | 'cancelled'

export const Driver = types.model('Driver', {
  id: types.string,
  name: types.string,
  phone: types.string,
  vehicle: types.model({
    type: types.string,
    model: types.string,
    color: types.string,
    plateNumber: types.string,
  }),
  rating: types.maybe(types.number),
})

export const Ride = types.model('Ride', {
  id: types.identifier,
  source: types.string,
  destination: types.string,
  rideOptionId: types.number,
  status: types.enumeration('RideStatus', [
    'booked',
    'driver-assigned',
    'started',
    'ongoing',
    'completed',
    'cancelled',
  ]),
  paymentMode: types.maybeNull(types.string),
  driverId: types.maybe(types.number),
  bookingTime: types.Date,
  startTime: types.maybe(types.Date),
  endTime: types.maybe(types.Date),
  fare: types.number,
  distance: types.number,
  duration: types.number,
  rating: types.maybe(types.number),
  review: types.maybe(types.string),
  cancellationReason: types.maybe(types.string),
  databaseId: types.maybe(types.number),
})

export const RideStore = types
  .model('RideStore', {
    currentRide: types.maybeNull(Ride),
    rideHistory: types.optional(types.array(Ride), []),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    origin: types.optional(types.string, ''),
    destination: types.optional(types.string, ''),
    isDriverArrived: types.optional(types.boolean, false),
    isLoadingDriver: types.optional(types.boolean, false),
    originCoordinates: types.maybeNull(types.array(types.number)),
    destinationCoordinates: types.maybeNull(types.array(types.number)),
    distance: types.optional(types.number, 0),
    places: types.optional(types.array(types.string), []),
    routeCoordinates: types.optional(
      types.array(types.array(types.number)),
      [],
    ),
    // Search state - consolidated
    searchType: types.optional(
      types.enumeration('SearchType', ['origin', 'destination']),
      'origin',
    ),
    searchQuery: types.optional(types.string, ''),
    searchResults: types.optional(types.array(types.string), []),
    showSearch: types.optional(types.boolean, false),
    // Flag to distinguish between rehydration and restore
    isRestored: types.optional(types.boolean, false),
    currentRideOption: types.optional(types.string, 'sedan'),
    currentPaymentMethod: types.optional(types.string, 'cash'),
    // Minimal additions
    userPaymentMethods: types.optional(types.array(types.frozen()), []),
    rideOptions: types.optional(types.array(types.frozen()), []),
  })
  .actions(self => ({
    setOrigin(origin: string) {
      self.origin = origin
    },
    setDestination(destination: string) {
      self.destination = destination
    },
    setOriginCoordinates(coordinates: number[] | null) {
      if (coordinates) {
        self.originCoordinates = coordinates as any
      } else {
        self.originCoordinates = null
      }
    },
    setDestinationCoordinates(coordinates: number[] | null) {
      if (coordinates) {
        self.destinationCoordinates = coordinates as any
      } else {
        self.destinationCoordinates = null
      }
    },
    setDistance(distance: number) {
      self.distance = distance
    },
    setPlaces(places: string[]) {
      self.places.replace(places)
    },
    setRouteCoordinates(coordinates: number[][]) {
      self.routeCoordinates.replace(coordinates as any)
    },
    setCurrentPaymentMethod(paymentMethod: string) {
      self.currentPaymentMethod = paymentMethod
    },
    setCurrentRideOption(rideOption: string) {
      self.currentRideOption = rideOption
    },
    clearRoute() {
      // Safely clear route data to prevent MST errors
      try {
        self.routeCoordinates.clear()
        self.origin = ''
        self.destination = ''
        self.originCoordinates = null
        self.destinationCoordinates = null
        self.currentRideOption = 'sedan'
        self.currentPaymentMethod = 'cash'
        self.distance = 0
      } catch (error) {
        console.error('Error clearing route:', error)
      }
    },
    clearCurrentRide() {
      // Safely clear current ride to prevent MST errors
      try {
        self.currentRide = null
        // Clear route data safely
        self.routeCoordinates.clear()
        self.origin = ''
        self.destination = ''
        self.originCoordinates = null
        self.destinationCoordinates = null
        self.distance = 0
        self.currentRideOption = 'sedan'
        self.currentPaymentMethod = 'cash'
        self.isDriverArrived = false
        self.isLoadingDriver = false
        // self.places.clear()
        // Clear search state
        self.searchQuery = ''
        self.searchResults.clear()
        self.showSearch = false
        self.isLoading = false
        self.error = null
      } catch (error) {
        console.error('Error clearing current ride:', error)
      }
    },
    clearError() {
      self.error = null
    },
    clearRideHistory() {
      self.rideHistory.clear()
    },
    setSearchType(type: 'origin' | 'destination') {
      self.searchType = type
    },
    setSearchQuery(query: string) {
      self.searchQuery = query
    },
    setSearchResults(results: string[]) {
      self.searchResults.replace(results)
    },
    setShowSearch(show: boolean) {
      self.showSearch = show
    },
    clearSearch() {
      self.searchQuery = ''
      self.searchResults.clear()
      self.showSearch = false
    },
    setRestored(restored: boolean) {
      self.isRestored = restored
    },
    setDriverArrived(arrived: boolean) {
      self.isDriverArrived = arrived
    },
    setLoadingDriver(loading: boolean) {
      self.isLoadingDriver = loading
    },
    setSelectedRideOption(rideOption: string) {
      self.currentRideOption = rideOption
    },
    setSelectedUserPaymentMethod(paymentMethod: string) {
      self.currentPaymentMethod = paymentMethod
    },
    updateSearchResults() {
      const trimmed = self.searchQuery.trim()
      if (trimmed.length === 0) {
        self.searchResults.clear()
        return
      }

      const lowerQuery = trimmed.toLowerCase()
      const queryWords = lowerQuery.split(/\s+/)
      const queryNormalized = lowerQuery.replace(/[^a-z0-9]/g, '')

      const filtered = self.places.toJSON().filter((place: string) => {
        const lowerPlace = place.toLowerCase()
        const wordMatch = queryWords.every(word => lowerPlace.includes(word))
        const normalizedMatch = lowerPlace
          .replace(/[^a-z0-9]/g, '')
          .includes(queryNormalized)
        return (
          (wordMatch || normalizedMatch) &&
          ((self.searchType === 'origin' && place !== self.destination) ||
            (self.searchType === 'destination' && place !== self.origin))
        )
      })

      self.searchResults.replace(filtered)
    },
    restore(snapshot: any) {
      try {
        if (snapshot.currentRide) {
          self.currentRide = snapshot.currentRide
        } else {
          self.currentRide = null
        }

        if (snapshot.rideHistory) {
          self.rideHistory.replace(snapshot.rideHistory)
        } else {
          self.rideHistory.clear()
        }

        self.isLoading = false
        self.error = snapshot.error || null

        self.origin = snapshot.origin || ''
        self.destination = snapshot.destination || ''
        self.originCoordinates = snapshot.originCoordinates || null
        self.destinationCoordinates = snapshot.destinationCoordinates || null
        self.distance = snapshot.distance || 0

        if (snapshot.places) {
          self.places.replace(snapshot.places)
        }

        if (snapshot.routeCoordinates) {
          self.routeCoordinates.replace(snapshot.routeCoordinates)
        } else {
          self.routeCoordinates.clear()
        }

        // Restore search state only if this is a user-initiated restore (not rehydration)
        self.searchType = snapshot.searchType || 'origin'
        self.searchQuery = snapshot.searchQuery || ''
        self.currentRideOption = snapshot.currentRideOption || 'sedan'
        self.currentPaymentMethod = snapshot.currentPaymentMethod || 'cash'
        if (snapshot.searchResults) {
          self.searchResults.replace(snapshot.searchResults)
        } else {
          self.searchResults.clear()
        }
        // Only show search overlay if this is a restore (not rehydration)
        self.showSearch = snapshot.showSearch || false

        // Mark as restored
        self.isRestored = true
        const root: any = getRoot(self)
        const userId = root.userStore?.currentUser?.id
        this.getPaymentMethods(userId)
        this.getRideOptions()

        // Debug logging
      } catch (error) {
        console.error('Error restoring ride store:', error)
        self.currentRide = null
        self.rideHistory.clear()
        self.isLoading = false
        self.error = null
        self.origin = ''
        self.destination = ''
        self.originCoordinates = null
        self.destinationCoordinates = null
        self.distance = 0
        self.places.clear()
        self.routeCoordinates.clear()
        // Reset search state
        self.searchType = 'origin'
        self.searchQuery = ''
        self.searchResults.clear()
        self.showSearch = false
        self.isRestored = false
      }
    },
    bookRide: flow(function* (
      source: string,
      destination: string,
      fare: number,
      distance: number,
      duration: number,
      rideOptionId: number,
      paymentMode: string,
    ) {
      try {
        self.isLoading = true
        self.error = null
        yield new Promise(resolve => setTimeout(resolve, 100))
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
        const newRide = {
          id,
          source,
          destination,
          rideOptionId,
          status: 'booked' as RideStatus,
          bookingTime: new Date(),
          fare,
          distance,
          duration,
          paymentMode,
        }
        self.currentRide = newRide as any

        // Clear search state when ride is booked
        self.searchQuery = ''
        self.searchResults.clear()
        self.showSearch = false

        self.isLoading = false
        return newRide
      } catch (error) {
        self.error = 'Failed to book ride'
        self.isLoading = false
        throw error
      }
    }),
    assignDriver: flow(function* () {
      if (!self.currentRide || self.currentRide.status !== 'booked') {
        throw new Error(
          'No ride to assign driver to, or ride not in booked state',
        )
      }

      if (self.currentRide.driverId !== undefined) {
        return
      }

      self.currentRide.driverId = 0

      try {
        self.isLoading = true
        self.error = null
        yield new Promise(resolve => setTimeout(resolve, 100))
        const rideOptionId = self.currentRide.rideOptionId
        const candidates = yield queries.getDriversByRideOption(rideOptionId)

        if (!candidates || candidates.length === 0) {
          throw new Error('No drivers available for this ride option')
        }
        const driver = candidates[Math.floor(Math.random() * candidates.length)]
        self.currentRide.driverId = driver.id
        self.currentRide.status = 'driver-assigned'

        const pickupLocation = {
          lat: self.originCoordinates?.[1] || 0,
          lng: self.originCoordinates?.[0] || 0,
          placename: self.origin || '',
        }

        const dropLocation = {
          lat: self.destinationCoordinates?.[1] || 0,
          lng: self.destinationCoordinates?.[0] || 0,
          placename: self.destination || '',
        }

        const snap = getSnapshot(self.currentRide)
        if (snap) {
          self.rideHistory.push(snap)
          const root: any = getRoot(self)
          const userId = root.userStore?.currentUser?.id
          const dbRide: any = {
            userId,
            driverId: Number(driver.id),
            pickupLocation: JSON.stringify(pickupLocation),
            dropLocation: JSON.stringify(dropLocation),
            status: 'driver-assigned',
            startTime: snap.startTime
              ? new Date(snap.startTime).toISOString()
              : null,
            endTime: snap.endTime ? new Date(snap.endTime).toISOString() : null,
            distanceKm: snap.distance,
            fareAmount: snap.fare,
            paymentMode: snap.paymentMode,
            feedbackSubmitted: 0,
          }
          if (typeof snap.id !== 'string') {
            dbRide.id = snap.id
            yield mutations.updateRide(snap.id, dbRide)
          } else {
            const result = yield mutations.createRide(dbRide)
            if (result.success && result.id) {
              self.currentRide.databaseId = result.id
            }
          }
        }
        self.isLoading = false
      } catch (error) {
        if (self.currentRide) {
          self.currentRide.driverId = undefined
        }
        self.error = 'Failed to assign driver'
        self.isLoading = false
        throw error
      }
    }),
    startRide: flow(function* () {
      if (!self.currentRide || self.currentRide.status !== 'driver-assigned') {
        throw new Error(
          'No ride to start, or ride not in driver-assigned state',
        )
      }
      try {
        self.isLoading = true
        self.error = null
        yield new Promise(resolve => setTimeout(resolve, 100))
        self.currentRide.status = 'ongoing'
        self.currentRide.startTime = new Date()

        const snap = getSnapshot(self.currentRide)
        if (snap && self.currentRide.databaseId) {
          const updateData = {
            status: 'ongoing',
            startTime: new Date().toISOString(),
          }
          yield mutations.updateRide(
            Number(self.currentRide.databaseId),
            updateData,
          )
        }

        self.isLoading = false
      } catch (error) {
        self.error = 'Failed to start ride'
        self.isLoading = false
        throw error
      }
    }),
    updateToOngoing: flow(function* () {
      if (!self.currentRide || self.currentRide.status !== 'driver-assigned') {
        throw new Error(
          'No ride to update to ongoing, or ride not in started state',
        )
      }

      const databaseId = self.currentRide.databaseId

      self.currentRide.status = 'ongoing'
      self.currentRide.startTime = new Date()

      try {
        const root: any = getRoot(self)
        const userId = root.userStore?.currentUser?.id
        if (userId && databaseId) {
          const userRides = yield queries.getRidesForUser(userId)
          const existingRide = userRides.find(
            (ride: any) => ride.id === databaseId,
          )

          if (existingRide) {
            const updateData = {
              status: 'ongoing',
              startTime: new Date().toISOString(),
            }
            yield mutations.updateRide(Number(databaseId), updateData)
          }
        }
      } catch (error) {
        console.error('Error updating ride status in database:', error)
      }
    }),
    completeRide: flow(function* () {
      if (!self.currentRide || self.currentRide.status !== 'ongoing') {
        throw new Error('No ride to complete, or ride not in ongoing state')
      }

      try {
        self.isLoading = true
        self.error = null

        // Get snapshot before any state changes to avoid MST errors
        // Check if currentRide is still valid before getting snapshot
        if (!self.currentRide) {
          throw new Error('Current ride is null')
        }

        const rideSnap = getSnapshot(self.currentRide)

        // Update ride status
        self.currentRide.status = 'completed'
        self.currentRide.endTime = new Date()

        // Add to history if we have a snapshot
        if (rideSnap) {
          self.rideHistory.push(rideSnap)
        }

        // Update database with retry mechanism
        if (rideSnap && self.currentRide.databaseId) {
          try {
            const updateData = {
              status: 'completed',
              endTime: new Date().toISOString(),
            }

            yield mutations.updateRide(
              Number(self.currentRide.databaseId),
              updateData,
            )
          } catch (dbError) {
            console.error(
              'Database update failed during ride completion:',
              dbError,
            )
          }
        }

        try {
          self.currentPaymentMethod = 'cash'
          self.currentRideOption = 'sedan'
          self.routeCoordinates.clear()
        } catch (routeError) {
          console.error('Error clearing route coordinates:', routeError)
        }

        self.isLoading = false
      } catch (error) {
        console.error('Error completing ride:', error)
        self.error = 'Failed to complete ride'
        self.isLoading = false
        throw error
      }
    }),

    clearCompletedRide() {
      try {
        self.currentRide = null
        self.routeCoordinates.clear()
        self.origin = ''
        self.destination = ''
        self.originCoordinates = null
        self.destinationCoordinates = null
        self.distance = 0
        self.searchQuery = ''
        self.searchResults.clear()
        self.showSearch = false
        self.isLoading = false
        self.currentRideOption = 'sedan'
        self.currentPaymentMethod = 'cash'
        self.error = null
        self.isDriverArrived = false
        self.isLoadingDriver = false
      } catch (error) {
        console.error('Error clearing completed ride:', error)
      }
    },

    cancelRide: flow(function* (rideId: string, reason: string) {
      if (!self.currentRide) {
        throw new Error('No current ride to cancel')
      }
      if (self.currentRide.id !== rideId) {
        throw new Error('Ride not found')
      }
      if (['ongoing', 'completed'].includes(self.currentRide.status)) {
        throw new Error('Cannot cancel ride in current state')
      }

      const originalStatus = self.currentRide.status
      const databaseId = self.currentRide.databaseId

      self.currentRide.status = 'cancelled'
      self.currentRide.startTime = new Date()
      self.currentRide.cancellationReason = reason
      self.currentPaymentMethod = 'cash'
      self.currentRideOption = 'sedan'

      const snap = getSnapshot(self.currentRide)
      if (snap && originalStatus === 'driver-assigned') {
        self.rideHistory.push(snap)

        try {
          const root: any = getRoot(self)
          const userId = root.userStore?.currentUser?.id
          if (userId && databaseId) {
            const userRides = yield queries.getRidesForUser(userId)
            const existingRide = userRides.find(
              (ride: any) => ride.id === databaseId,
            )

            if (existingRide) {
              const updateData = {
                status: 'cancelled',
                startTime: new Date().toISOString(),
              }
              yield mutations.updateRide(Number(databaseId), updateData)
            }
          }
        } catch (error) {
          console.error('Error updating ride status in database:', error)
        }
      }
    }),

    // New minimal data loaders
    getPaymentMethods: flow(function* (userId: number) {
      try {
        const methods = yield queries.getPaymentMethodsForUser(userId)
        if (methods) {
          self.userPaymentMethods.replace(methods as any)
        }
      } catch (error) {
        console.error('Failed to load payment methods', error)
      }
    }),
    getRideOptions: flow(function* () {
      try {
        const options = yield queries.getAllRideOptions()
        if (options) {
          self.rideOptions.replace(options as any)
        }
      } catch (error) {
        console.error('Failed to load ride options', error)
      }
    }),
  }))
  .views(self => ({
    getRideHistory() {
      return self.rideHistory
    },
    getRideById(rideId: string) {
      return self.rideHistory.find(ride => ride.id === rideId)
    },
    getCurrentCoordinates() {
      return {
        origin: {
          coordinates: self.originCoordinates,
          placeName: self.origin,
        },
        destination: {
          coordinates: self.destinationCoordinates,
          placeName: self.destination,
        },
      }
    },
    get showHeader() {
      return !self.origin || !self.destination
    },
    get hasRoute() {
      return self.origin && self.destination && self.routeCoordinates.length > 1
    },
    get availablePlaces() {
      return self.places.toJSON()
    },
    get currentRouteCoordinates() {
      try {
        return self.routeCoordinates.toJSON()
      } catch (error) {
        console.error('Error accessing route coordinates:', error)
        return []
      }
    },
    // Search computed views
    get currentSearchType() {
      return self.searchType
    },
    get currentSearchQuery() {
      return self.searchQuery
    },
    get currentSearchResults() {
      return self.searchResults.toJSON()
    },
    get isSearchVisible() {
      return self.showSearch
    },
    get wasRestored() {
      return self.isRestored
    },
  }))

export interface IRideStore extends Instance<typeof RideStore> {}

export { RideStore as RideStoreModel }
