// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const CheckInStore = types
  .model('CheckInStore')
  .props({
    // Booking and passenger data
    bookingData: types.frozen(),
    passengersData: types.frozen(),
    // Current selection indices
    currentPassengerIndex: types.optional(types.number, 0),
    currentFlightIndex: types.optional(types.number, 0),
    // Seat selection state
    selectedSeats: types.frozen<Record<string, string>>({}),
    occupiedSeats: types.frozen<Record<string, string[]>>({}),
    // UI state
    loading: types.optional(types.boolean, true),
    processing: types.optional(types.boolean, false),
    // Track last booking ID to detect changes
    lastBookingId: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setBookingData(data: any) {
      store.bookingData = data
    },
    setPassengersData(data: any) {
      store.passengersData = data
    },
    setCurrentPassengerIndex(index: number) {
      store.currentPassengerIndex = index
    },
    setCurrentFlightIndex(index: number) {
      store.currentFlightIndex = index
    },
    setSelectedSeats(seats: Record<string, string>) {
      store.selectedSeats = seats
    },
    updateSelectedSeat(key: string, seatNumber: string) {
      const current = { ...(store.selectedSeats as Record<string, string>) }
      current[key] = seatNumber
      store.selectedSeats = current
    },
    setOccupiedSeats(seats: Record<string, string[]>) {
      store.occupiedSeats = seats
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    setProcessing(processing: boolean) {
      store.processing = processing
    },
    setLastBookingId(id: string | null) {
      store.lastBookingId = id
    },
    resetCheckIn() {
      store.bookingData = null
      store.passengersData = null
      store.currentPassengerIndex = 0
      store.currentFlightIndex = 0
      store.selectedSeats = {}
      store.occupiedSeats = {}
      store.loading = true
      store.processing = false
      store.lastBookingId = null
    },
    restore(data: any) {
      if (data.bookingData !== undefined) {
        store.bookingData = data.bookingData
      }
      if (data.passengersData !== undefined) {
        store.passengersData = data.passengersData
      }
      if (data.currentPassengerIndex !== undefined) {
        store.currentPassengerIndex = data.currentPassengerIndex
      }
      if (data.currentFlightIndex !== undefined) {
        store.currentFlightIndex = data.currentFlightIndex
      }
      if (data.selectedSeats !== undefined) {
        store.selectedSeats = data.selectedSeats
      }
      if (data.occupiedSeats !== undefined) {
        store.occupiedSeats = data.occupiedSeats
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
      if (data.processing !== undefined) {
        store.processing = data.processing
      }
      if (data.lastBookingId !== undefined) {
        store.lastBookingId = data.lastBookingId
      }
    },
  }))
  .views(store => ({
    get booking() {
      return store.bookingData
    },
    get passengers() {
      return store.passengersData || []
    },
    get currentPassenger() {
      const passengers = store.passengersData as any[]
      return passengers?.[store.currentPassengerIndex] || null
    },
    get currentFlight() {
      const booking = store.bookingData as any
      return booking?.bookingFlights?.[store.currentFlightIndex] || null
    },
    get hasBooking() {
      return !!store.bookingData
    },
    get hasPassengers() {
      const passengers = store.passengersData as any[]
      return passengers && passengers.length > 0
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface CheckInStoreModel extends Instance<typeof CheckInStore> {}
export interface CheckInStoreSnapshot
  extends SnapshotOut<typeof CheckInStore> {}
