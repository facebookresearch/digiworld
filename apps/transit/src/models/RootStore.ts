import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { AlertsStore } from './AlertsStore'
import { AuthStoreModel } from './AuthStore'
import { LineDetailStore } from './LineDetailStore'
import { LinesStore } from './LinesStore'
import { NearbyStoreModel } from './NearbyStore'
import { ProfileStore } from './ProfileStore'
import { RouteDetailStore } from './RouteDetailStore'
import { RouteOptionsStore } from './RouteOptionsStore'
import { SessionStore } from './SessionStore'
import { StopScheduleStore } from './StopScheduleStore'
import { TripPlannerStoreModel } from './TripPlannerStore'
import { UIStore } from './UIStore'
import { UserStoreModel } from './UserStore'

/**
 * A RootStore model for Transit App.
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
    profileStore: types.optional(ProfileStore, {}),
    tripPlannerStore: types.optional(TripPlannerStoreModel, {}),
    nearbyStore: types.optional(NearbyStoreModel, {}),
    linesStore: types.optional(LinesStore, {}),
    routeOptionsStore: types.optional(RouteOptionsStore, {}),
    routeDetailStore: types.optional(RouteDetailStore, {}),
    lineDetailStore: types.optional(LineDetailStore, {}),
    stopScheduleStore: types.optional(StopScheduleStore, {}),
    alertsStore: types.optional(AlertsStore, {}),
  })
  .preProcessSnapshot((snapshot: any) => {
    // Handle migration for tripPlannerStore
    if (
      snapshot &&
      snapshot.tripPlannerStore &&
      snapshot.tripPlannerStore.tripState
    ) {
      const tripState = snapshot.tripPlannerStore.tripState
      if (
        tripState.selectedTime !== undefined &&
        typeof tripState.selectedTime === 'number'
      ) {
        return {
          ...snapshot,
          tripPlannerStore: {
            ...snapshot.tripPlannerStore,
            tripState: {
              ...tripState,
              selectedTime: 'Now',
            },
          },
        }
      }
    }
    return snapshot
  })
  .actions(self => ({
    /**
     * Clear all stores except userStore (called on logout)
     */
    clearAllStores() {
      // Clear sessions
      if (self.sessionStore?.clearAllSessions) {
        self.sessionStore.clearAllSessions()
      }
      // Reset auth state
      if (self.authStore?.reset) {
        self.authStore.reset()
      }
      // Reset trip planner state
      if (self.tripPlannerStore?.reset) {
        self.tripPlannerStore.reset()
      }
      // Reset nearby state
      if (self.nearbyStore?.reset) {
        self.nearbyStore.reset()
      }
      // Reset lines state
      if (self.linesStore?.reset) {
        self.linesStore.reset()
      }
      // Reset route options state
      if (self.routeOptionsStore?.reset) {
        self.routeOptionsStore.reset()
      }
      // Reset route detail state
      if (self.routeDetailStore?.reset) {
        self.routeDetailStore.reset()
      }
      // Reset line detail state
      if (self.lineDetailStore?.reset) {
        self.lineDetailStore.reset()
      }
      // Reset stop schedule state
      if (self.stopScheduleStore?.reset) {
        self.stopScheduleStore.reset()
      }
      // Reset alerts state
      if (self.alertsStore?.reset) {
        self.alertsStore.reset()
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
