// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const SearchParamsModel = types.model('SearchParams').props({
  origin: types.string,
  destination: types.string,
  date: types.string,
  returnDate: types.maybeNull(types.string),
  passengers: types.number,
  tripType: types.enumeration(['oneWay', 'roundTrip']),
  adults: types.optional(types.number, 1),
  children: types.optional(types.number, 0),
  infants: types.optional(types.number, 0),
})

export const SearchResultsStore = types
  .model('SearchResultsStore')
  .props({
    // Search parameters
    searchParams: types.maybeNull(SearchParamsModel),
    // Flight results - using frozen to allow same flight data in multiple places
    departureFlights: types.optional(types.array(types.frozen()), []),
    returnFlights: types.optional(types.array(types.frozen()), []),
    // Selected flights - using frozen to avoid MST duplicate object errors
    selectedDepartureFlight: types.maybeNull(types.frozen()),
    selectedReturnFlight: types.maybeNull(types.frozen()),
    // UI state
    loading: types.optional(types.boolean, true),
    sortBy: types.optional(
      types.enumeration(['price', 'departure', 'arrival', 'duration']),
      'price',
    ),
    showSortModal: types.optional(types.boolean, false),
    currentTab: types.optional(
      types.enumeration(['departure', 'return']),
      'departure',
    ),
    // Track search to prevent reload on same params
    lastSearchKey: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setSearchParams(params: any) {
      store.searchParams = SearchParamsModel.create(params)
    },
    setDepartureFlights(flights: any[]) {
      store.departureFlights.replace(flights)
    },
    setReturnFlights(flights: any[]) {
      store.returnFlights.replace(flights)
    },
    setSelectedDepartureFlight(flight: any | null) {
      store.selectedDepartureFlight = flight
    },
    setSelectedReturnFlight(flight: any | null) {
      store.selectedReturnFlight = flight
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    setSortBy(sortBy: 'price' | 'departure' | 'arrival' | 'duration') {
      store.sortBy = sortBy
    },
    setShowSortModal(show: boolean) {
      store.showSortModal = show
    },
    setCurrentTab(tab: 'departure' | 'return') {
      store.currentTab = tab
    },
    setLastSearchKey(key: string | null) {
      store.lastSearchKey = key
    },
    clearSelection() {
      store.selectedDepartureFlight = null
      store.selectedReturnFlight = null
    },
    clearSelectionAndFilters() {
      store.selectedDepartureFlight = null
      store.selectedReturnFlight = null
      store.sortBy = 'price'
      store.showSortModal = false
      store.currentTab = 'departure'
    },
    resetSearchResults() {
      store.searchParams = null
      store.departureFlights.clear()
      store.returnFlights.clear()
      store.selectedDepartureFlight = null
      store.selectedReturnFlight = null
      store.loading = true
      store.sortBy = 'price'
      store.showSortModal = false
      store.currentTab = 'departure'
      store.lastSearchKey = null
    },
    restore(data: any) {
      if (data.searchParams !== undefined) {
        store.searchParams = data.searchParams
          ? SearchParamsModel.create(data.searchParams)
          : null
      }
      if (data.departureFlights !== undefined) {
        store.departureFlights.replace(data.departureFlights)
      }
      if (data.returnFlights !== undefined) {
        store.returnFlights.replace(data.returnFlights)
      }
      if (data.selectedDepartureFlight !== undefined) {
        store.selectedDepartureFlight = data.selectedDepartureFlight
      }
      if (data.selectedReturnFlight !== undefined) {
        store.selectedReturnFlight = data.selectedReturnFlight
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
      if (data.sortBy !== undefined) {
        store.sortBy = data.sortBy
      }
      if (data.showSortModal !== undefined) {
        store.showSortModal = data.showSortModal
      }
      if (data.currentTab !== undefined) {
        store.currentTab = data.currentTab
      }
      if (data.lastSearchKey !== undefined) {
        store.lastSearchKey = data.lastSearchKey
      }
    },
  }))
  .views(store => ({
    get hasSearchParams() {
      return !!store.searchParams
    },
    get hasDepartureFlights() {
      return store.departureFlights.length > 0
    },
    get hasReturnFlights() {
      return store.returnFlights.length > 0
    },
    get currentFlights() {
      return store.currentTab === 'departure'
        ? store.departureFlights.slice()
        : store.returnFlights.slice()
    },
    get isRoundTrip() {
      return store.searchParams?.tripType === 'roundTrip'
    },
    get canProceed() {
      if (store.isRoundTrip) {
        return !!(store.selectedDepartureFlight && store.selectedReturnFlight)
      }
      return !!store.selectedDepartureFlight
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface SearchResultsStoreModel
  extends Instance<typeof SearchResultsStore> {}
export interface SearchResultsStoreSnapshot
  extends SnapshotOut<typeof SearchResultsStore> {}
