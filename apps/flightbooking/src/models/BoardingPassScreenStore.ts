import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

export const BoardingPassScreenStore = types
  .model('BoardingPassScreenStore')
  .props({
    // Booking and passenger data
    bookingData: types.frozen(),
    passengersData: types.frozen(),
    boardingPassesData: types.frozen(),
    // Current selection
    currentPassengerIndex: types.optional(types.number, 0),
    // UI state
    loading: types.optional(types.boolean, true),
    // Track last booking/flight ID to detect changes
    lastBookingId: types.maybeNull(types.string),
    lastFlightId: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setBookingData(data: any) {
      store.bookingData = data
    },
    setPassengersData(data: any) {
      store.passengersData = data
    },
    setBoardingPassesData(data: any) {
      store.boardingPassesData = data
    },
    setCurrentPassengerIndex(index: number) {
      store.currentPassengerIndex = index
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    setLastBookingId(id: string | null) {
      store.lastBookingId = id
    },
    setLastFlightId(id: string | null) {
      store.lastFlightId = id
    },
    resetBoardingPass() {
      store.bookingData = null
      store.passengersData = null
      store.boardingPassesData = null
      store.currentPassengerIndex = 0
      store.loading = true
      store.lastBookingId = null
      store.lastFlightId = null
    },
    restore(data: any) {
      if (data.bookingData !== undefined) {
        store.bookingData = data.bookingData
      }
      if (data.passengersData !== undefined) {
        store.passengersData = data.passengersData
      }
      if (data.boardingPassesData !== undefined) {
        store.boardingPassesData = data.boardingPassesData
      }
      if (data.currentPassengerIndex !== undefined) {
        store.currentPassengerIndex = data.currentPassengerIndex
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
      if (data.lastBookingId !== undefined) {
        store.lastBookingId = data.lastBookingId
      }
      if (data.lastFlightId !== undefined) {
        store.lastFlightId = data.lastFlightId
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
    get boardingPasses() {
      return store.boardingPassesData || []
    },
    get currentBoardingPass() {
      const passes = store.boardingPassesData as any[]
      return passes?.[store.currentPassengerIndex] || null
    },
    get hasBooking() {
      return !!store.bookingData
    },
    get hasBoardingPasses() {
      const passes = store.boardingPassesData as any[]
      return passes && passes.length > 0
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface BoardingPassScreenStoreModel
  extends Instance<typeof BoardingPassScreenStore> {}
export interface BoardingPassScreenStoreSnapshot
  extends SnapshotOut<typeof BoardingPassScreenStore> {}
