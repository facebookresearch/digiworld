import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { AuthStoreModel } from './AuthStore'
import { BoardingPassScreenStore } from './BoardingPassScreenStore'
import { BoardingPassStore } from './BoardingPassStore'
import { BookingDetailsStore } from './BookingDetailsStore'
import { BookingFlowStore } from './BookingFlowStore'
import { BookingSuccessStore } from './BookingSuccessStore'
import { CheckInStore } from './CheckInStore'
import { FlightSearchStore } from './FlightSearchStore'
import { ProfileStore } from './ProfileStore'
import { SearchResultsStore } from './SearchResultsStore'
import { SessionStore } from './SessionStore'
import { TicketsStore } from './TicketsStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'

/**
 * A RootStore model.
 */
export const RootStore = types
  .model('RootStore')
  .props({
    userStore: types.optional(UserStoreModel, {
      user: null,
      isAuthenticated: false,
      authError: null,
      validationErrors: [],
    }),
    uiStore: types.optional(UIStore, {
      isDeeplinkLoading: false,
      storagePermissionUri: null,
    }),
    sessionStore: types.optional(SessionStore, {}),
    authStore: types.optional(AuthStoreModel, {}),
    flightSearchStore: types.optional(FlightSearchStore, {}),
    ticketsStore: types.optional(TicketsStore, {}),
    boardingPassStore: types.optional(BoardingPassStore, {}),
    boardingPassScreenStore: types.optional(BoardingPassScreenStore, {}),
    profileStore: types.optional(ProfileStore, {}),
    bookingFlowStore: types.optional(BookingFlowStore, {}),
    bookingSuccessStore: types.optional(BookingSuccessStore, {}),
    checkInStore: types.optional(CheckInStore, {}),
    searchResultsStore: types.optional(SearchResultsStore, {}),
    bookingDetailsStore: types.optional(BookingDetailsStore, {}),
  })
  .actions(self => ({
    /**
     * Clear all stores except userStore (called on logout)
     */
    clearAllStores() {
      // Clear all feature stores
      if (self.flightSearchStore?.resetForm) {
        self.flightSearchStore.resetForm()
      }
      if (self.ticketsStore?.clearBookings) {
        self.ticketsStore.clearBookings()
      }
      if (self.searchResultsStore?.resetSearchResults) {
        self.searchResultsStore.resetSearchResults()
      }
      if (self.bookingFlowStore?.resetBookingFlow) {
        self.bookingFlowStore.resetBookingFlow()
      }
      if (self.checkInStore?.resetCheckIn) {
        self.checkInStore.resetCheckIn()
      }
      if (self.boardingPassStore?.clearCheckedInFlights) {
        self.boardingPassStore.clearCheckedInFlights()
      }
      if (self.boardingPassScreenStore?.resetBoardingPass) {
        self.boardingPassScreenStore.resetBoardingPass()
      }
      if (self.bookingSuccessStore?.resetBookingSuccess) {
        self.bookingSuccessStore.resetBookingSuccess()
      }
      if (self.bookingDetailsStore?.resetBookingDetails) {
        self.bookingDetailsStore.resetBookingDetails()
      }
      // Clear sessions
      if (self.sessionStore?.clearAllSessions) {
        self.sessionStore.clearAllSessions()
      }
    },
  }))

/**
 * The RootStore instance.
 */
export interface RootStoreModel extends Instance<typeof RootStore> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStore> {}
