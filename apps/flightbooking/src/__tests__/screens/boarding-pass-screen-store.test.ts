// Copyright (c) Meta Platforms, Inc. and affiliates.
import { BoardingPassScreenStore } from '@/models/BoardingPassScreenStore'

const createStore = () =>
  BoardingPassScreenStore.create({
    bookingData: null,
    passengersData: null,
    boardingPassesData: null,
    currentPassengerIndex: 0,
    loading: true,
    lastBookingId: null,
    lastFlightId: null,
  })

describe('BoardingPassScreenStore', () => {
  it('stores booking data and exposes derived views', () => {
    const store = createStore()

    const booking = {
      booking_id: 'booking-1',
      booking_reference: 'ABC123',
    }
    const passengers = [
      {
        passenger_id: 'p1',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    ]
    const passes = [
      {
        id: 'pass-1',
        passenger: passengers[0],
        bookingFlight: { flight_number: 'AL100' },
      },
    ]

    store.setBookingData(booking)
    store.setPassengersData(passengers)
    store.setBoardingPassesData(passes)
    store.setLoading(false)

    expect(store.booking).toEqual(booking)
    expect(store.passengers).toHaveLength(1)
    expect(store.boardingPasses).toHaveLength(1)
    expect(store.currentBoardingPass?.id).toBe('pass-1')
    expect(store.hasBooking).toBe(true)
    expect(store.hasBoardingPasses).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('tracks passenger index and resets state', () => {
    const store = createStore()

    store.setPassengersData([{ passenger_id: 'p1' }, { passenger_id: 'p2' }])
    store.setBoardingPassesData([{ id: 'pass-1' }, { id: 'pass-2' }])
    store.setCurrentPassengerIndex(1)

    expect(store.currentPassengerIndex).toBe(1)
    expect(store.currentBoardingPass?.id).toBe('pass-2')

    store.resetBoardingPass()
    expect(store.booking).toBeNull()
    expect(store.passengers).toEqual([])
    expect(store.boardingPasses).toEqual([])
    expect(store.currentPassengerIndex).toBe(0)
    expect(store.loading).toBe(true)
  })
})
