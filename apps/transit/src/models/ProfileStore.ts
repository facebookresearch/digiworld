import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const ProfileState = types
  .model('ProfileState', {
    // User preferences (persist these)
    homeStopId: types.optional(types.string, ''),
    homeStopName: types.optional(types.string, ''),
    workStopId: types.optional(types.string, ''),
    workStopName: types.optional(types.string, ''),
    preferredModes: types.optional(types.array(types.string), []),
    notificationsEnabled: types.optional(types.boolean, true),
    locationEnabled: types.optional(types.boolean, true),
    // Persist search term so it's restored when modal reopens
    stopSearchTerm: types.optional(types.string, ''),
    // Modal state - persists during session navigation
    showStopModal: types.optional(types.boolean, false),
    stopModalType: types.maybeNull(
      types.enumeration('stopModalType', ['home', 'work']),
    ),
  })
  .volatile(() => ({
    // Modal UI state (don't persist these - reset on app restart)
    stopSearchResults: [] as {
      id: string
      name: string
      description?: string
    }[],
    isSearchingStops: false,
    isLoggingOut: false,
  }))
  .actions(withSetPropAction)
  .actions(self => ({
    setHomeStop(id: string, name: string) {
      self.homeStopId = id
      self.homeStopName = name
    },
    setWorkStop(id: string, name: string) {
      self.workStopId = id
      self.workStopName = name
    },
    setPreferredModes(modes: string[]) {
      self.preferredModes.replace(modes)
    },
    setNotificationsEnabled(enabled: boolean) {
      self.notificationsEnabled = enabled
    },
    setLocationEnabled(enabled: boolean) {
      self.locationEnabled = enabled
    },
    openStopModal(type: 'home' | 'work') {
      self.showStopModal = true
      self.stopModalType = type as 'home' | 'work'
      // Don't clear search term - preserve it when reopening modal
      self.stopSearchResults = []
    },
    closeStopModal() {
      self.showStopModal = false
      self.stopModalType = null
      // Clear search term when closing modal
      self.stopSearchTerm = ''
      self.stopSearchResults = []
    },
    setStopSearchTerm(term: string) {
      self.stopSearchTerm = term
    },
    setStopSearchResults(
      results: { id: string; name: string; description?: string }[],
    ) {
      self.stopSearchResults = results
    },
    setIsSearchingStops(searching: boolean) {
      self.isSearchingStops = searching
    },
    setIsLoggingOut(loggingOut: boolean) {
      self.isLoggingOut = loggingOut
    },
    reset() {
      self.homeStopId = ''
      self.homeStopName = ''
      self.workStopId = ''
      self.workStopName = ''
      self.preferredModes.clear()
      self.notificationsEnabled = true
      self.locationEnabled = true
      self.stopSearchTerm = ''
      self.showStopModal = false
      self.stopModalType = null
      self.stopSearchResults = []
      self.isSearchingStops = false
      self.isLoggingOut = false
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const ProfileStore = types
  .model('ProfileStore')
  .props({
    profileState: types.optional(ProfileState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      profileState?: {
        homeStopId?: string
        homeStopName?: string
        workStopId?: string
        workStopName?: string
        preferredModes?: string[]
        notificationsEnabled?: boolean
        locationEnabled?: boolean
        stopSearchTerm?: string
        showStopModal?: boolean
        stopModalType?: 'home' | 'work'
      }
    }) {
      try {
        if (snapshot && snapshot.profileState) {
          const ps = snapshot.profileState
          if (ps.homeStopId) {
            self.profileState.setHomeStop(ps.homeStopId, ps.homeStopName || '')
          }
          if (ps.workStopId) {
            self.profileState.setWorkStop(ps.workStopId, ps.workStopName || '')
          }
          if (ps.preferredModes) {
            self.profileState.setPreferredModes(ps.preferredModes)
          }
          if (ps.notificationsEnabled !== undefined) {
            self.profileState.setNotificationsEnabled(ps.notificationsEnabled)
          }
          if (ps.locationEnabled !== undefined) {
            self.profileState.setLocationEnabled(ps.locationEnabled)
          }
          if (ps.stopSearchTerm !== undefined) {
            self.profileState.setStopSearchTerm(ps.stopSearchTerm)
          }
          // Restore modal state if it was open
          if (ps.showStopModal !== undefined) {
            self.profileState.showStopModal = ps.showStopModal
          }
          if (ps.stopModalType) {
            self.profileState.stopModalType = ps.stopModalType as
              | 'home'
              | 'work'
          } else {
            // Reset modal state if no modal type (don't persist modal visibility across app restarts)
            self.profileState.showStopModal = false
            self.profileState.stopModalType = null
          }
        }
      } catch (error) {
        console.error('Error restoring profile store:', error)
        this.reset()
      }
    },
    reset() {
      self.profileState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface ProfileStoreModel extends Instance<typeof ProfileStore> {}
export interface ProfileStoreSnapshot
  extends SnapshotOut<typeof ProfileStore> {}
