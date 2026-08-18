import { Instance, SnapshotIn, types, cast, flow } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'
import { queries } from '../db/queries'
import { mutations } from '../db/mutations'
import { generateRouteOptions, Route } from '../utils/routeGeneratorDB'

export const TripPlannerValidationError = types.model(
  'TripPlannerValidationError',
  {
    field: types.string,
    message: types.string,
  },
)

export const Stop = types.model('Stop', {
  id: types.string,
  name: types.string,
  description: types.optional(types.string, ''),
})

export const RecentSearch = types.model('RecentSearch', {
  id: types.string,
  userId: types.number,
  origin: types.string,
  destination: types.string,
  modeFilters: types.array(types.string),
  createdAt: types.optional(types.string, ''),
})

export const TripPlannerState = types
  .model('TripPlannerState', {
    origin: types.optional(types.string, ''),
    destination: types.optional(types.string, ''),
    timeMode: types.optional(types.enumeration(['depart', 'arrive']), 'depart'),
    selectedTime: types.optional(types.string, 'Now'),
    selectedModes: types.optional(types.array(types.string), ['all']),
    searchResults: types.optional(types.array(Stop), []),
    recentSearches: types.optional(types.array(RecentSearch), []),
    generatedRoutes: types.optional(types.frozen<Route[]>(), []),
    isLoading: types.optional(types.boolean, false),
    isSearching: types.optional(types.boolean, false),
    showSearchModal: types.optional(types.boolean, false),
    showTimePicker: types.optional(types.boolean, false),
    searchingFor: types.optional(
      types.enumeration(['origin', 'destination']),
      'origin',
    ),
    validationErrors: types.optional(
      types.array(TripPlannerValidationError),
      [],
    ),
    // UI state fields for Plan screen
    selectedDate: types.optional(types.string, new Date().toISOString()),
    showNativePicker: types.optional(types.boolean, false),
    isSearchingRoute: types.optional(types.boolean, false),
    searchText: types.optional(types.string, ''),
  })
  .preProcessSnapshot((snapshot: any) => {
    // Migrate old selectedTime format (number) to new format (string)
    if (snapshot && typeof snapshot.selectedTime === 'number') {
      return {
        ...snapshot,
        selectedTime: 'Now',
      }
    }
    return snapshot
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setOrigin(value: string) {
      self.origin = value
      // Clear validation errors when origin changes
      self.validationErrors.replace(
        self.validationErrors.filter(
          error => error.field !== 'origin' && error.field !== 'routes',
        ),
      )
      // Re-validate if destination is already set
      if (
        self.destination &&
        value.trim().toLowerCase() === self.destination.trim().toLowerCase()
      ) {
        self.setValidationError(
          'routes',
          'Origin and destination cannot be the same',
        )
      }
    },
    setDestination(value: string) {
      self.destination = value
      // Clear validation errors when destination changes
      self.validationErrors.replace(
        self.validationErrors.filter(
          error => error.field !== 'destination' && error.field !== 'routes',
        ),
      )
      // Re-validate if origin is already set
      if (
        self.origin &&
        value.trim().toLowerCase() === self.origin.trim().toLowerCase()
      ) {
        self.setValidationError(
          'routes',
          'Origin and destination cannot be the same',
        )
      }
    },
    setTimeMode(mode: 'depart' | 'arrive') {
      self.timeMode = mode
    },
    setSelectedTime(time: string) {
      self.selectedTime = time
    },
    setShowTimePicker(show: boolean) {
      self.showTimePicker = show
    },
    toggleMode(modeId: string) {
      if (modeId === 'all') {
        self.selectedModes.replace(['all'])
      } else {
        const currentModes = self.selectedModes.slice()
        const newModes = currentModes.includes(modeId)
          ? currentModes.filter(m => m !== modeId)
          : [...currentModes.filter(m => m !== 'all'), modeId]
        self.selectedModes.replace(newModes.length > 0 ? newModes : ['all'])
      }
    },
    swapLocations() {
      const temp = self.origin
      self.origin = self.destination
      self.destination = temp
    },
    setValidationError(field: string, message: string) {
      const existingErrorIndex = self.validationErrors.findIndex(
        e => e.field === field,
      )
      if (existingErrorIndex >= 0) {
        self.validationErrors[existingErrorIndex] = cast({ field, message })
      } else {
        self.validationErrors.push(cast({ field, message }))
      }
    },
    clearValidationErrors() {
      self.validationErrors.clear()
    },
    setShowSearchModal(show: boolean) {
      self.showSearchModal = show
    },
    setSearchingFor(searchingFor: 'origin' | 'destination') {
      self.searchingFor = searchingFor
    },
    setIsSearching(isSearching: boolean) {
      self.isSearching = isSearching
    },
    selectStop(stop: { id: string; name: string; description?: string }) {
      if (self.searchingFor === 'origin') {
        this.setOrigin(stop.name)
      } else {
        this.setDestination(stop.name)
      }
      self.showSearchModal = false
      self.searchResults.clear()
    },
    loadRecentSearch(search: any) {
      this.setOrigin(search.origin)
      this.setDestination(search.destination)
      if (search.modeFilters && search.modeFilters.length > 0) {
        self.selectedModes.replace(search.modeFilters)
      }
    },
    reset() {
      self.origin = ''
      self.destination = ''
      self.timeMode = 'depart'
      self.selectedTime = 'Now'
      self.selectedModes.replace(['all'])
      self.isLoading = false
      self.isSearching = false
      self.showSearchModal = false
      self.showTimePicker = false
      self.validationErrors.clear()
      self.setProp('searchText', '')
    },
  }))
  .actions(self => ({
    loadRecentSearches: flow(function* (userId?: number, limit: number = 5) {
      try {
        const rootStore = getRootStore(self)
        const effectiveUserId = userId ?? rootStore.userStore.user?.id ?? 1

        const searches = yield queries.getRecentSearchesByUser(
          effectiveUserId,
          limit,
        )
        if (searches) {
          self.recentSearches.replace(
            searches.map((s: any) => ({
              id: s.id,
              userId: s.userId,
              origin: s.origin,
              destination: s.destination,
              modeFilters: s.modeFilters || [],
              createdAt: s.createdAt || '',
            })),
          )
        }
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }),

    handleLocationClick: flow(function* (userId?: number) {
      try {
        const rootStore = getRootStore(self)
        const effectiveUserId = userId ?? rootStore.userStore.user?.id ?? 1

        const recentSearches = yield queries.getRecentSearchesByUser(
          effectiveUserId,
          10,
        )

        if (recentSearches && recentSearches.length > 0) {
          const randomIndex = Math.floor(Math.random() * recentSearches.length)
          const randomSearch = recentSearches[randomIndex]
          self.setOrigin(randomSearch.origin)
        } else {
          const allStops = yield queries.getAllStops()
          if (allStops && allStops.length > 0) {
            const randomIndex = Math.floor(Math.random() * allStops.length)
            self.setOrigin(allStops[randomIndex].name)
          } else {
            self.setOrigin('Current Location')
          }
        }
      } catch (error) {
        console.error('Error handling location click:', error)
        self.setOrigin('Current Location')
      }
    }),

    searchStops: flow(function* (searchTerm: string) {
      // Store the search text
      self.setProp('searchText', searchTerm)

      if (!searchTerm || searchTerm.length < 2) {
        self.searchResults.clear()
        self.setIsSearching(false)
        return
      }

      self.isLoading = true
      self.setIsSearching(true)
      try {
        const results = yield queries.searchTransit(searchTerm)
        if (results && results.stops) {
          self.searchResults.replace(
            results.stops.map((stop: any) => ({
              id: stop.id,
              name: stop.name,
              description: stop.description || '',
            })),
          )
        }
      } catch (error) {
        console.error('Error searching stops:', error)
        self.searchResults.clear()
      } finally {
        self.isLoading = false
      }
    }),

    openStopSearch: flow(function* (
      type: 'origin' | 'destination',
      userId?: number,
    ) {
      self.setSearchingFor(type)
      self.setShowSearchModal(true)
      self.setIsSearching(false)

      try {
        const rootStore = getRootStore(self)
        const effectiveUserId = userId ?? rootStore.userStore.user?.id ?? 1

        const recentSearches = yield queries.getRecentSearchesByUser(
          effectiveUserId,
          10,
        )
        if (recentSearches && recentSearches.length > 0) {
          const uniqueStops = new Set<string>()
          const stopList: any[] = []

          // Filter recent searches based on what we're searching for
          for (const search of recentSearches) {
            if (type === 'origin') {
              // When searching for origin, show stops that were used as origins
              if (!uniqueStops.has(search.origin)) {
                uniqueStops.add(search.origin)
                stopList.push({
                  id: `origin-${search.id}`,
                  name: search.origin,
                  description: '',
                })
              }
            } else {
              // When searching for destination, show stops that were used as destinations
              if (!uniqueStops.has(search.destination)) {
                uniqueStops.add(search.destination)
                stopList.push({
                  id: `dest-${search.id}`,
                  name: search.destination,
                  description: '',
                })
              }
            }
          }
          self.searchResults.replace(stopList)
        } else {
          const allStops = yield queries.getAllStops()
          self.searchResults.replace(
            allStops.slice(0, 10).map((stop: any) => ({
              id: stop.id,
              name: stop.name,
              description: stop.description || '',
            })),
          )
        }
      } catch (error) {
        console.error('Error loading default stops:', error)
        self.searchResults.clear()
      }
    }),

    validateFields() {
      let isValid = true

      // Clear previous validation errors
      self.clearValidationErrors()

      if (!self.origin) {
        self.setValidationError('origin', 'Starting point is required')
        isValid = false
      }

      if (!self.destination) {
        self.setValidationError('destination', 'Destination is required')
        isValid = false
      }

      // Check if origin and destination are the same
      if (
        self.origin &&
        self.destination &&
        self.origin.trim().toLowerCase() ===
          self.destination.trim().toLowerCase()
      ) {
        self.setValidationError(
          'routes',
          'Origin and destination cannot be the same',
        )
        isValid = false
      }

      return isValid
    },

    handleSearch: flow(function* (
      userId?: number,

      router?: any,
    ) {
      if (!(self as any).validateFields()) {
        return false
      }

      const rootStore = getRootStore(self)
      const effectiveUserId = userId ?? rootStore.userStore.user?.id ?? 1

      self.isLoading = true
      try {
        // Save search to recent searches
        yield mutations.createRecentSearch({
          id: `search-${Date.now()}`,
          userId: effectiveUserId,
          origin: self.origin,
          destination: self.destination,
          modeFilters: self.selectedModes.slice(),
        })

        yield (self as any).loadRecentSearches(effectiveUserId, 5)

        // Generate route options using database
        const routes = yield generateRouteOptions({
          origin: self.origin,
          destination: self.destination,
          departureTime:
            self.selectedTime === 'Now' ? undefined : self.selectedTime,
          timeMode: self.timeMode as 'depart' | 'arrive',
          selectedModes: self.selectedModes.slice(),
          maxTransfers: 2,
        })

        if (!routes || routes.length === 0) {
          console.warn(
            'No routes found for the selected origin and destination',
          )
        }

        self.generatedRoutes = cast(routes || [])

        // Convert "Now" to actual railway time (24-hour format)
        const getDisplayTime = () => {
          if (self.selectedTime === 'Now') {
            const now = new Date()
            const hours = now.getHours().toString().padStart(2, '0')
            const minutes = now.getMinutes().toString().padStart(2, '0')
            return `${hours}:${minutes}`
          }
          return self.selectedTime
        }

        // Navigate to route options screen (always navigate, even if no routes found)
        if (router) {
          router.push({
            pathname: '/routes/route-options',
            params: {
              routes: JSON.stringify(routes || []),
              selectedTime: getDisplayTime(),
              timeMode: self.timeMode,
            },
          })
        }

        return true
      } catch (error) {
        console.error('Error generating routes:', error)
        return false
      } finally {
        self.isLoading = false
      }
    }),
  }))
  .views(self => ({
    get hasValidationErrors() {
      return self.validationErrors.length > 0
    },
    getValidationError(field: string) {
      return self.validationErrors.find(e => e.field === field)?.message
    },
    get isFormValid() {
      return (
        self.origin !== '' &&
        self.destination !== '' &&
        self.origin.trim().toLowerCase() !==
          self.destination.trim().toLowerCase()
      )
    },
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const TripPlannerStoreModel = types
  .model('TripPlannerStore')
  .props({
    tripState: types.optional(TripPlannerState, {}),
  })
  .actions(withSetPropAction)
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))
  .actions(self => ({
    reset() {
      self.tripState.reset()
    },
    restore(snapshot: any) {
      try {
        if (snapshot && snapshot.tripState) {
          const ts = snapshot.tripState
          if (ts.origin) self.tripState.setOrigin(ts.origin)
          if (ts.destination) self.tripState.setDestination(ts.destination)
          if (ts.timeMode) self.tripState.setTimeMode(ts.timeMode)

          // Handle migration from old number format to string format
          if (ts.selectedTime !== undefined) {
            if (typeof ts.selectedTime === 'string') {
              self.tripState.setSelectedTime(ts.selectedTime)
            } else if (typeof ts.selectedTime === 'number') {
              // Old format was milliseconds, convert to 'Now'
              self.tripState.setSelectedTime('Now')
            }
          }

          if (ts.selectedModes) {
            self.tripState.selectedModes.replace(ts.selectedModes)
          }

          // Restore modal/UI state fields - exact state restoration for testing
          if (typeof ts.showTimePicker === 'boolean') {
            self.tripState.setProp('showTimePicker', ts.showTimePicker)
          }
          if (typeof ts.showSearchModal === 'boolean') {
            self.tripState.setProp('showSearchModal', ts.showSearchModal)
          }
          if (ts.searchingFor) {
            self.tripState.setProp('searchingFor', ts.searchingFor)
          }
          if (ts.selectedDate) {
            self.tripState.setProp('selectedDate', ts.selectedDate)
          }
          if (typeof ts.showNativePicker === 'boolean') {
            self.tripState.setProp('showNativePicker', ts.showNativePicker)
          }
          if (typeof ts.isSearchingRoute === 'boolean') {
            self.tripState.setProp('isSearchingRoute', ts.isSearchingRoute)
          }

          console.log('TripPlannerStore restored with modal states:', {
            showTimePicker: ts.showTimePicker,
            showSearchModal: ts.showSearchModal,
            showNativePicker: ts.showNativePicker,
          })
        }
      } catch (error) {
        console.error('Error restoring trip planner store:', error)
        this.reset()
      }
    },
  }))

export interface TripPlannerStore
  extends Instance<typeof TripPlannerStoreModel> {}
export interface TripPlannerStoreSnapshot
  extends SnapshotIn<typeof TripPlannerStoreModel> {}
