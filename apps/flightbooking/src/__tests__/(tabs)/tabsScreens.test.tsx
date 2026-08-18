// Copyright (c) Meta Platforms, Inc. and affiliates.
import { BoardingPassStore } from '@/models/BoardingPassStore'
import { FlightSearchStore } from '@/models/FlightSearchStore'
import { TicketsStore } from '@/models/TicketsStore'

describe('TicketsStore basic behaviour', () => {
  it('tracks bookings and derived views', () => {
    const store = TicketsStore.create({})

    expect(store.hasBookings).toBe(false)

    store.setBookings([
      {
        booking_id: 'booking-123',
        booking_reference: 'REF-001',
        trip_type: 'round_trip',
        booking_date: '2025-02-01T12:00:00.000Z',
        status: 'confirmed',
        payment_status: 'paid',
        total_price: 199.99,
        passengerCount: 2,
      },
    ])

    expect(store.bookingsCount).toBe(1)
    expect(store.hasBookings).toBe(true)
    expect(store.confirmedBookings).toHaveLength(1)
    expect(store.pendingBookings).toHaveLength(0)

    store.setLoading(false)
    expect(store.loading).toBe(false)

    store.clearBookings()
    expect(store.hasBookings).toBe(false)
    expect(store.loading).toBe(true)
  })
})

describe('BoardingPassStore basic behaviour', () => {
  const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  it('stores checked-in flights and exposes helpers', () => {
    const store = BoardingPassStore.create({})

    expect(store.hasFlights).toBe(false)

    store.setCheckedInFlights([
      {
        id: 'flight-1',
        booking: { booking_id: 'booking-1', booking_reference: 'REF-100' },
        bookingFlight: {
          flight_number: 'AB123',
          origin: 'JFK',
          destination: 'LAX',
          departure_time: futureTime,
        },
        flight: { departure_time: futureTime },
        flightId: 'flight-1',
        passengers: [
          {
            passenger: { first_name: 'Ada', last_name: 'Lovelace' },
            seatAssignment: {
              seat_number: '12A',
              flight_id: 'flight-1',
              check_in_status: 'checked_in',
            },
          },
        ],
      },
    ])

    expect(store.hasFlights).toBe(true)
    expect(store.flightsCount).toBe(1)
    expect(store.upcomingFlights).toHaveLength(1)
    expect(
      store.checkedInFlights[0].passengers[0].seatAssignment.seat_number,
    ).toBe('12A')

    store.clearCheckedInFlights()
    expect(store.hasFlights).toBe(false)
  })
})

describe('FlightSearchStore basic behaviour', () => {
  it('manages trip type and locations', () => {
    const store = FlightSearchStore.create({})

    expect(store.tripType).toBe('roundTrip')

    store.setTripType('oneWay')
    expect(store.tripType).toBe('oneWay')
    expect(store.returnDate).toBeNull()

    store.setSelectedFromAirport({
      code: 'JFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      country: 'USA',
    })
    store.setSelectedToAirport({
      code: 'LAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      country: 'USA',
    })

    expect(store.fromLocation).toBe('New York (JFK)')
    expect(store.toLocation).toBe('Los Angeles (LAX)')

    store.swapLocations()
    expect(store.fromLocation).toBe('Los Angeles (LAX)')
    expect(store.toLocation).toBe('New York (JFK)')

    store.setAdults(2)
    store.setChildren(1)
    store.setInfants(1)
    expect(store.totalPassengers).toBe(4)
  })
})
