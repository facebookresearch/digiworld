// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const CheckInStatusModel = types.model('CheckInStatus').props({
  allCheckedIn: types.optional(types.boolean, false),
  someCheckedIn: types.optional(types.boolean, false),
  total: types.optional(types.number, 0),
  checkedInCount: types.optional(types.number, 0),
})

export const BookingDetailsStore = types
  .model('BookingDetailsStore')
  .props({
    // Booking data
    bookingData: types.frozen(),
    checkInStatus: types.optional(CheckInStatusModel, {}),
    // UI state
    loading: types.optional(types.boolean, true),
    showCancelModal: types.optional(types.boolean, false),
    cancelReason: types.optional(types.string, ''),
    cancelling: types.optional(types.boolean, false),
    selectedFlightToCancel: types.frozen(),
    cancelType: types.optional(types.enumeration(['full', 'partial']), 'full'),
    // Track last booking ID to detect changes
    lastBookingId: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setBookingData(data: any) {
      store.bookingData = data
    },
    setCheckInStatus(status: any) {
      store.checkInStatus = CheckInStatusModel.create(status)
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    setShowCancelModal(show: boolean) {
      store.showCancelModal = show
    },
    setCancelReason(reason: string) {
      store.cancelReason = reason
    },
    setCancelling(cancelling: boolean) {
      store.cancelling = cancelling
    },
    setSelectedFlightToCancel(flight: any) {
      store.selectedFlightToCancel = flight
    },
    setCancelType(type: 'full' | 'partial') {
      store.cancelType = type
    },
    setLastBookingId(id: string | null) {
      store.lastBookingId = id
    },
    resetCancelState() {
      store.showCancelModal = false
      store.cancelReason = ''
      store.selectedFlightToCancel = null
      store.cancelType = 'full'
      store.cancelling = false
    },
    resetBookingDetails() {
      store.bookingData = null
      store.checkInStatus = CheckInStatusModel.create({})
      store.loading = true
      store.showCancelModal = false
      store.cancelReason = ''
      store.cancelling = false
      store.selectedFlightToCancel = null
      store.cancelType = 'full'
      store.lastBookingId = null
    },
    restore(data: any) {
      if (data.bookingData !== undefined) {
        store.bookingData = data.bookingData
      }
      if (data.checkInStatus !== undefined) {
        store.checkInStatus = CheckInStatusModel.create(data.checkInStatus)
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
      if (data.showCancelModal !== undefined) {
        store.showCancelModal = data.showCancelModal
      }
      if (data.cancelReason !== undefined) {
        store.cancelReason = data.cancelReason
      }
      if (data.cancelling !== undefined) {
        store.cancelling = data.cancelling
      }
      if (data.selectedFlightToCancel !== undefined) {
        store.selectedFlightToCancel = data.selectedFlightToCancel
      }
      if (data.cancelType !== undefined) {
        store.cancelType = data.cancelType
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
    get hasBooking() {
      return !!store.bookingData
    },
    get canCancelFull() {
      return !store.checkInStatus.someCheckedIn
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface BookingDetailsStoreModel
  extends Instance<typeof BookingDetailsStore> {}
export interface BookingDetailsStoreSnapshot
  extends SnapshotOut<typeof BookingDetailsStore> {}
