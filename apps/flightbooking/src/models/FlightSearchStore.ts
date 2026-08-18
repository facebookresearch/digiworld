// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const AirportModel = types.model('Airport').props({
  code: types.string,
  name: types.string,
  city: types.string,
  country: types.string,
})

const UserModel = types.model('User').props({
  id: types.number,
  name: types.string,
  email: types.string,
  avatar: types.optional(types.string, ''),
})

export const FlightSearchStore = types
  .model('FlightSearchStore')
  .props({
    // User data
    user: types.maybeNull(UserModel),
    // Trip data
    tripType: types.optional(
      types.enumeration(['oneWay', 'roundTrip']),
      'roundTrip',
    ),
    fromLocation: types.optional(types.string, ''),
    toLocation: types.optional(types.string, ''),
    departureDate: types.maybeNull(types.string),
    returnDate: types.maybeNull(types.string),
    adults: types.optional(types.number, 1),
    children: types.optional(types.number, 0),
    infants: types.optional(types.number, 0),
    travelClass: types.optional(types.string, 'Economy'),
    selectedFromAirport: types.maybeNull(AirportModel),
    selectedToAirport: types.maybeNull(AirportModel),
    // UI State
    showPassengerModal: types.optional(types.boolean, false),
    showAirportModal: types.optional(types.boolean, false),
    selectedAirportField: types.optional(
      types.enumeration(['from', 'to']),
      'from',
    ),
    showDateModal: types.optional(types.boolean, false),
    selectedDateField: types.optional(
      types.enumeration(['departure', 'return']),
      'departure',
    ),
    // Track if form has been initialized
    isInitialized: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setUser(
      user: { id: number; name: string; email: string; avatar?: string } | null,
    ) {
      if (user) {
        store.user = UserModel.create({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '',
        })
      } else {
        store.user = null
      }
    },
    markAsInitialized() {
      store.isInitialized = true
    },
    setTripType(type: 'oneWay' | 'roundTrip') {
      store.tripType = type
      // Clear return date when switching to one way
      if (type === 'oneWay') {
        store.returnDate = null
      }
    },
    setFromLocation(location: string) {
      store.fromLocation = location
    },
    setToLocation(location: string) {
      store.toLocation = location
    },
    setDepartureDate(date: Date | null) {
      store.departureDate = date ? date.toISOString() : null
    },
    setReturnDate(date: Date | null) {
      store.returnDate = date ? date.toISOString() : null
    },
    setAdults(count: number) {
      store.adults = Math.max(1, count)
    },
    setChildren(count: number) {
      store.children = Math.max(0, count)
    },
    setInfants(count: number) {
      store.infants = Math.max(0, count)
    },
    setTravelClass(travelClass: string) {
      store.travelClass = travelClass
    },
    setSelectedFromAirport(
      airport: {
        code: string
        name: string
        city: string
        country: string
      } | null,
    ) {
      if (airport) {
        store.selectedFromAirport = AirportModel.create(airport)
        store.fromLocation = `${airport.city} (${airport.code})`
      } else {
        store.selectedFromAirport = null
        store.fromLocation = ''
      }
    },
    setSelectedToAirport(
      airport: {
        code: string
        name: string
        city: string
        country: string
      } | null,
    ) {
      if (airport) {
        store.selectedToAirport = AirportModel.create(airport)
        store.toLocation = `${airport.city} (${airport.code})`
      } else {
        store.selectedToAirport = null
        store.toLocation = ''
      }
    },
    swapLocations() {
      const tempLocation = store.fromLocation
      const tempAirport = store.selectedFromAirport

      store.fromLocation = store.toLocation
      store.selectedFromAirport = store.selectedToAirport

      store.toLocation = tempLocation
      store.selectedToAirport = tempAirport
    },
    // UI State Actions
    setShowPassengerModal(show: boolean) {
      store.showPassengerModal = show
    },
    openAirportModal(field: 'from' | 'to') {
      store.selectedAirportField = field
      store.showAirportModal = true
    },
    closeAirportModal() {
      store.showAirportModal = false
    },
    openDateModal(field: 'departure' | 'return') {
      store.selectedDateField = field
      store.showDateModal = true
    },
    closeDateModal() {
      store.showDateModal = false
    },
    closeAllModals() {
      store.showPassengerModal = false
      store.showAirportModal = false
      store.showDateModal = false
    },
    resetForm() {
      store.tripType = 'roundTrip'
      store.fromLocation = ''
      store.toLocation = ''
      store.departureDate = null
      store.returnDate = null
      store.adults = 1
      store.children = 0
      store.infants = 0
      store.travelClass = 'Economy'
      store.selectedFromAirport = null
      store.selectedToAirport = null
      // Close all modals when resetting
      store.showPassengerModal = false
      store.showAirportModal = false
      store.showDateModal = false
      // Reset initialized flag
      store.isInitialized = false
      // Note: we keep user data intact
    },
    restore(data: any) {
      // Restore all properties from backup data
      if (data.tripType !== undefined) store.tripType = data.tripType
      if (data.fromLocation !== undefined) {
        store.fromLocation = data.fromLocation
      }
      if (data.toLocation !== undefined) {
        store.toLocation = data.toLocation
      }
      if (data.departureDate !== undefined) {
        store.departureDate = data.departureDate
      }
      if (data.returnDate !== undefined) store.returnDate = data.returnDate
      if (data.adults !== undefined) store.adults = data.adults
      if (data.children !== undefined) store.children = data.children
      if (data.infants !== undefined) store.infants = data.infants
      if (data.travelClass !== undefined) store.travelClass = data.travelClass

      // Restore airport objects
      if (data.selectedFromAirport !== undefined) {
        store.selectedFromAirport = data.selectedFromAirport
          ? AirportModel.create(data.selectedFromAirport)
          : null
      }
      if (data.selectedToAirport !== undefined) {
        store.selectedToAirport = data.selectedToAirport
          ? AirportModel.create(data.selectedToAirport)
          : null
      }

      // Restore UI states
      if (data.showPassengerModal !== undefined) {
        store.showPassengerModal = data.showPassengerModal
      }
      if (data.showAirportModal !== undefined) {
        store.showAirportModal = data.showAirportModal
      }
      if (data.selectedAirportField !== undefined) {
        store.selectedAirportField = data.selectedAirportField
      }
      if (data.showDateModal !== undefined) {
        store.showDateModal = data.showDateModal
      }
      if (data.selectedDateField !== undefined) {
        store.selectedDateField = data.selectedDateField
      }
      if (data.isInitialized !== undefined) {
        store.isInitialized = data.isInitialized
      }

      // Restore user if present
      if (data.user !== undefined) {
        store.user = data.user ? UserModel.create(data.user) : null
      }
    },
  }))
  .views(store => ({
    get totalPassengers() {
      return store.adults + store.children + store.infants
    },
    get departureDateObject() {
      return store.departureDate ? new Date(store.departureDate) : null
    },
    get returnDateObject() {
      return store.returnDate ? new Date(store.returnDate) : null
    },
    get isFormValid() {
      return !!(
        store.selectedFromAirport &&
        store.selectedToAirport &&
        store.departureDate &&
        (store.tripType === 'oneWay' || store.returnDate)
      )
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface FlightSearchStoreModel
  extends Instance<typeof FlightSearchStore> {}
export interface FlightSearchStoreSnapshot
  extends SnapshotOut<typeof FlightSearchStore> {}
