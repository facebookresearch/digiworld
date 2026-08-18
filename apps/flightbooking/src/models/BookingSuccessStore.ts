// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const BookingSuccessStore = types
  .model('BookingSuccessStore')
  .props({
    // Booking details
    bookingReference: types.optional(types.string, ''),
    totalPaid: types.optional(types.string, ''),
    tripType: types.optional(types.string, ''),
    passengerCount: types.optional(types.string, ''),
    // Animation states
    animationCompleted: types.optional(types.boolean, false),
    // Track last booking reference to detect changes
    lastBookingReference: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setBookingDetails(details: {
      bookingReference: string
      totalPaid: string
      tripType: string
      passengerCount: string
    }) {
      store.bookingReference = details.bookingReference
      store.totalPaid = details.totalPaid
      store.tripType = details.tripType
      store.passengerCount = details.passengerCount
    },
    setBookingReference(ref: string) {
      store.bookingReference = ref
    },
    setTotalPaid(amount: string) {
      store.totalPaid = amount
    },
    setTripType(type: string) {
      store.tripType = type
    },
    setPassengerCount(count: string) {
      store.passengerCount = count
    },
    setAnimationCompleted(completed: boolean) {
      store.animationCompleted = completed
    },
    setLastBookingReference(ref: string | null) {
      store.lastBookingReference = ref
    },
    resetBookingSuccess() {
      store.bookingReference = ''
      store.totalPaid = ''
      store.tripType = ''
      store.passengerCount = ''
      store.animationCompleted = false
      store.lastBookingReference = null
    },
    restore(data: any) {
      if (data.bookingReference !== undefined) {
        store.bookingReference = data.bookingReference
      }
      if (data.totalPaid !== undefined) {
        store.totalPaid = data.totalPaid
      }
      if (data.tripType !== undefined) {
        store.tripType = data.tripType
      }
      if (data.passengerCount !== undefined) {
        store.passengerCount = data.passengerCount
      }
      if (data.animationCompleted !== undefined) {
        store.animationCompleted = data.animationCompleted
      }
      if (data.lastBookingReference !== undefined) {
        store.lastBookingReference = data.lastBookingReference
      }
    },
  }))
  .views(store => ({
    get hasBookingDetails() {
      return !!(
        store.bookingReference &&
        store.totalPaid &&
        store.tripType &&
        store.passengerCount
      )
    },
    get formattedTripType() {
      return store.tripType === 'round_trip' ? 'Round Trip' : 'One Way'
    },
    get passengerCountInt() {
      return parseInt(store.passengerCount) || 0
    },
    get passengerLabel() {
      const count = parseInt(store.passengerCount) || 0
      return count > 1 ? 'travelers' : 'traveler'
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface BookingSuccessStoreModel
  extends Instance<typeof BookingSuccessStore> {}
export interface BookingSuccessStoreSnapshot
  extends SnapshotOut<typeof BookingSuccessStore> {}
