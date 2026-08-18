// Copyright (c) Meta Platforms, Inc. and affiliates.
import { SearchResultsStore } from '@/models/SearchResultsStore'

const createStore = () => SearchResultsStore.create({})

const sampleSearchParams = {
  origin: 'JFK',
  destination: 'LAX',
  date: '2025-01-01',
  returnDate: '2025-01-10',
  passengers: 2,
  tripType: 'roundTrip' as const,
  adults: 2,
  children: 0,
  infants: 0,
}

describe('SearchResultsStore', () => {
  it('stores search params and flight lists', () => {
    const store = createStore()

    store.setSearchParams(sampleSearchParams)
    store.setDepartureFlights([{ flight_id: 'dep-1', fare: 199 }])
    store.setReturnFlights([{ flight_id: 'ret-1', fare: 249 }])
    store.setLoading(false)

    expect(store.hasSearchParams).toBe(true)
    expect(store.hasDepartureFlights).toBe(true)
    expect(store.hasReturnFlights).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.currentFlights).toHaveLength(1)
  })

  it('tracks selected flights and tabs', () => {
    const store = createStore()
    store.setSearchParams(sampleSearchParams)
    store.setDepartureFlights([{ flight_id: 'dep-1' }])
    store.setReturnFlights([{ flight_id: 'ret-1' }])

    store.setSelectedDepartureFlight({ flight_id: 'dep-1' })
    expect(store.canProceed).toBe(false)

    store.setCurrentTab('return')
    store.setSelectedReturnFlight({ flight_id: 'ret-1' })
    expect(store.canProceed).toBe(true)

    store.clearSelectionAndFilters()
    expect(store.canProceed).toBe(false)
    expect(store.currentTab).toBe('departure')
    expect(store.sortBy).toBe('price')
  })

  it('clears results completely', () => {
    const store = createStore()

    store.setSearchParams(sampleSearchParams)
    store.setDepartureFlights([{ flight_id: 'dep-1' }])
    store.resetSearchResults()

    expect(store.hasSearchParams).toBe(false)
    expect(store.hasDepartureFlights).toBe(false)
    expect(store.selectedDepartureFlight).toBeNull()
    expect(store.loading).toBe(true)
  })
})
