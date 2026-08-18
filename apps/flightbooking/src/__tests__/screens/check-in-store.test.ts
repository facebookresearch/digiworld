// Copyright (c) Meta Platforms, Inc. and affiliates.
import { CheckInStore } from '@/models/CheckInStore'

const createStore = () =>
  CheckInStore.create({
    bookingData: null,
    passengersData: null,
    selectedSeats: {},
    occupiedSeats: {},
    lastBookingId: null,
  })

describe('CheckInStore', () => {
  it('tracks booking, passengers, and current selections', () => {
    const store = createStore()

    const booking = {
      booking_id: 'booking-55',
      bookingFlights: [{ id: 'bf-1' }, { id: 'bf-2' }],
    }
    const passengers = [
      { passenger_id: 'p1', first_name: 'Ada' },
      { passenger_id: 'p2', first_name: 'Grace' },
    ]

    store.setBookingData(booking)
    store.setPassengersData(passengers)
    store.setCurrentPassengerIndex(1)
    store.setCurrentFlightIndex(0)

    expect(store.booking).toEqual(booking)
    expect(store.passengers).toHaveLength(2)
    expect(store.currentPassenger?.passenger_id).toBe('p2')
    expect(store.currentFlight?.id).toBe('bf-1')
  })

  it('manages seat selection and occupied seats', () => {
    const store = createStore()

    const flightId = 'flight-1'
    store.setPassengersData([{ passenger_id: 'p1' }])
    store.setSelectedSeats({})
    store.updateSelectedSeat('p1_flight-1', '12A')

    expect(store.selectedSeats['p1_flight-1']).toBe('12A')

    store.setOccupiedSeats({ [flightId]: ['1A', '1B'] })
    expect(store.occupiedSeats[flightId]).toContain('1A')

    store.resetCheckIn()
    expect(store.booking).toBeNull()
    expect(store.selectedSeats).toEqual({})
    expect(store.loading).toBe(true)
  })
})
