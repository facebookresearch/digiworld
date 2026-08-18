import { Platform } from 'react-native'
import { sql, and, eq } from 'drizzle-orm'
import RNFS from 'react-native-fs'

import {
  users,
  airlines,
  airports,
  cityPairs,
  flights,
  flightsconfig,
  bookings,
  bookingFlights,
  passengers,
  seatAssignments,
} from './schema'

// Import JSON data files
import usersData from '../data/mock-users.json'
import airlinesData from '../data/mock-airlines.json'
import airportsData from '../data/mock-airports.json'
import cityPairsData from '../data/mock-city_pairs.json'
import flightsData from '../data/mock-flights.json'
import flightsconfigData from '../data/mock-flights_config.json'
import bookingsData from '../data/mock-bookings.json'

import { db } from './index'

async function readJSONFile(filename: string) {
  try {
    const baseDir = Platform.select({
      android: `${RNFS.ExternalDirectoryPath}/mockdata`,
      ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
      default: '',
    })
    const filePath = `${baseDir}/${filename}`
    const exists = await RNFS.exists(filePath)
    if (exists) {
      console.log(`Reading ${filename} from storage`)
      const content = await RNFS.readFile(filePath, 'utf8')
      return JSON.parse(content)
    } else {
      console.log(`File ${filename} not found in storage, using bundled data`)
      // Return bundled data based on filename
      switch (filename) {
        case 'mock-users.json':
          return usersData
        case 'mock-airlines.json':
          return airlinesData
        case 'mock-airports.json':
          return airportsData
        case 'mock-city_pairs.json':
          return cityPairsData
        case 'mock-flights.json':
          return flightsData
        case 'mock-flights_config.json':
          return flightsconfigData
        case 'mock-bookings.json':
          return bookingsData
        default:
          console.error(`Unknown mock data file: ${filename}`)
          return []
      }
    }
  } catch (err) {
    console.error(`Failed to load ${filename}:`, err)
    return []
  }
}

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      // Check if database is already initialized by checking a key table
      const userCount = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .execute()

      if (userCount[0]?.count > 0) {
        console.log('Database already initialized with data')
        return { success: true, skipped: true }
      }

      const clearTables = [
        'DELETE FROM seat_assignments',
        'DELETE FROM passengers',
        'DELETE FROM booking_flights',
        'DELETE FROM bookings',
        'DELETE FROM flightsconfig',
        'DELETE FROM flights',
        'DELETE FROM city_pairs',
        'DELETE FROM airports',
        'DELETE FROM airlines',
        'DELETE FROM users',
        'DELETE FROM sqlite_sequence',
      ]
      for (const query of clearTables) {
        await db.run(sql.raw(query))
      }

      // Load data from JSON files
      const [
        usersData,
        airlinesData,
        airportsData,
        cityPairsData,
        flightsData,
        flightsconfigData,
        bookingsData,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-airlines.json'),
        readJSONFile('mock-airports.json'),
        readJSONFile('mock-city_pairs.json'),
        readJSONFile('mock-flights.json'),
        readJSONFile('mock-flights_config.json'),
        readJSONFile('mock-bookings.json'),
      ])

      // Batch insert airlines
      console.log('Loading airlines...')
      if (airlinesData.length > 0) {
        await db
          .insert(airlines)
          .values(
            airlinesData.map((airline: any) => ({
              id: airline.id,
              name: airline.name,
              iata_code: airline.iataCode,
              country: airline.country,
              created_at: airline.createdAt || new Date().toISOString(),
            })),
          )
          .run()
        console.log(`Loaded ${airlinesData.length} airlines`)
      }

      // Batch insert airports
      console.log('Loading airports...')
      if (airportsData.length > 0) {
        await db
          .insert(airports)
          .values(
            airportsData.map((airport: any) => ({
              code: airport.code,
              name: airport.name,
              city: airport.city,
              country: airport.country,
              timezone: airport.timezone,
              created_at: airport.createdAt || new Date().toISOString(),
            })),
          )
          .run()
        console.log(`Loaded ${airportsData.length} airports`)
      }

      // Batch insert city pairs in chunks
      console.log('Loading city pairs...')
      if (cityPairsData.length > 0) {
        const CITY_PAIR_CHUNK = 150
        const cpValues = cityPairsData.map((cityPair: any) => ({
          id: cityPair.id,
          origin: cityPair.origin,
          destination: cityPair.destination,
          distance_km: cityPair.distanceKm,
          avg_duration_minutes: cityPair.avgDurationMinutes,
          created_at: cityPair.createdAt || new Date().toISOString(),
        }))
        for (let i = 0; i < cpValues.length; i += CITY_PAIR_CHUNK) {
          await db
            .insert(cityPairs)
            .values(cpValues.slice(i, i + CITY_PAIR_CHUNK))
            .run()
        }
        console.log(`Loaded ${cityPairsData.length} city pairs`)
      }

      // Batch insert users
      console.log('Loading users...')
      if (usersData.length > 0) {
        await db
          .insert(users)
          .values(
            usersData.map((user: any) => ({
              id: user.id,
              email: user.email,
              username: user.username,
              password: user.password,
              avatar: user.avatar,
              bio: user.bio,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
              deleted_at: user.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${usersData.length} users`)
      }

      // Batch insert flights in chunks to stay under SQLite's 999 variable limit
      console.log('Loading flights...')
      if (flightsData.length > 0) {
        const CHUNK_SIZE = 60
        const flightValues = flightsData.map((flight: any) => ({
          flight_id: flight.flightId,
          airline_id: flight.airlineId,
          airline_code: flight.airlineCode,
          flight_number: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          departure_time: flight.departureTime,
          arrival_time: flight.arrivalTime,
          duration_minutes: flight.durationMinutes,
          fare: flight.fare,
          currency: flight.currency,
          seats_available: flight.seatsAvailable,
          aircraft_type: flight.aircraftType,
          date: flight.date,
          created_at: flight.createdAt || new Date().toISOString(),
        }))
        for (let i = 0; i < flightValues.length; i += CHUNK_SIZE) {
          await db
            .insert(flights)
            .values(flightValues.slice(i, i + CHUNK_SIZE))
            .run()
        }
        console.log(`Loaded ${flightsData.length} flights`)
      }

      // Batch insert flightsconfig with error handling
      console.log('Loading flightsconfig...')
      if (flightsconfigData.length > 0) {
        const configValues = flightsconfigData.map((flight: any) => ({
          flight_id: flight.flightId,
          airline_id: flight.airlineId,
          airline_code: flight.airlineCode,
          flight_number: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          departure_time: flight.departureTime,
          arrival_time: flight.arrivalTime,
          duration_minutes: flight.durationMinutes,
          fare: flight.fare,
          currency: flight.currency,
          seats_available: flight.seatsAvailable,
          aircraft_type: flight.aircraftType,
          created_at: flight.createdAt || new Date().toISOString(),
        }))

        try {
          const CONFIG_CHUNK = 60
          for (let i = 0; i < configValues.length; i += CONFIG_CHUNK) {
            await db
              .insert(flightsconfig)
              .values(configValues.slice(i, i + CONFIG_CHUNK))
              .run()
          }
          console.log(`Loaded ${configValues.length} flight configs`)
        } catch (error: any) {
          // If batch insert fails due to conflicts, fall back to individual inserts
          console.warn(
            'Batch insert failed, falling back to individual inserts with error handling',
          )
          let loadedConfigs = 0
          let failedConfigs = 0
          for (const flight of flightsconfigData) {
            try {
              await db
                .insert(flightsconfig)
                .values({
                  flight_id: flight.flightId,
                  airline_id: flight.airlineId,
                  airline_code: flight.airlineCode,
                  flight_number: flight.flightNumber,
                  origin: flight.origin,
                  destination: flight.destination,
                  departure_time: flight.departureTime,
                  arrival_time: flight.arrivalTime,
                  duration_minutes: flight.durationMinutes,
                  fare: flight.fare,
                  currency: flight.currency,
                  seats_available: flight.seatsAvailable,
                  aircraft_type: flight.aircraftType,
                  created_at: flight.createdAt || new Date().toISOString(),
                })
                .run()
              loadedConfigs++
            } catch (error: any) {
              if (
                error?.message?.includes('UNIQUE constraint') ||
                error?.message?.includes('FOREIGN KEY constraint')
              ) {
                failedConfigs++
                if (failedConfigs <= 5) {
                  console.warn(
                    `Failed to load config ${flight.flightId} (${flight.origin} -> ${flight.destination}):`,
                    error?.message,
                  )
                }
              } else {
                throw error
              }
            }
          }
          console.log(
            `Loaded ${loadedConfigs} flight configs, skipped ${failedConfigs} duplicates/constraints`,
          )
        }
      }

      // Batch insert bookings
      console.log('Loading bookings...')
      if (bookingsData.length > 0) {
        await db
          .insert(bookings)
          .values(
            bookingsData.map((booking: any) => ({
              booking_id: booking.bookingId,
              booking_reference: booking.bookingReference,
              user_id: booking.userId,
              trip_type: booking.tripType,
              booking_date: booking.bookingDate,
              status: booking.status,
              payment_status: booking.paymentStatus,
              total_price: booking.totalPrice,
              refund_amount: booking.refundAmount,
              amount_paid: booking.amountPaid,
              currency: booking.currency,
              created_at: booking.createdAt,
              updated_at: booking.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${bookingsData.length} bookings`)
      }

      // Collect and batch insert booking flights, passengers, and seat assignments
      console.log('Loading booking flights and passengers...')
      const allBookingFlights = []
      const allPassengers = []
      const allSeatAssignments = []

      for (const booking of bookingsData) {
        // Collect booking flights
        if (booking.flights) {
          for (const flight of booking.flights) {
            allBookingFlights.push({
              booking_id: booking.bookingId,
              flight_id: flight.flightId,
              airline_code: flight.airlineCode,
              flight_number: flight.flightNumber,
              origin: flight.origin,
              destination: flight.destination,
              departure_time: flight.departureTime,
              arrival_time: flight.arrivalTime,
              duration_minutes: flight.durationMinutes,
              fare: flight.fare,
              segment: flight.segment,
              status: flight.status,
              cancellation_date: flight.cancellationDate,
              cancellation_reason: flight.cancellationReason,
              refund_amount: flight.refundAmount,
            })
          }
        }

        // Collect passengers and seat assignments
        if (booking.passengers) {
          for (const passenger of booking.passengers) {
            allPassengers.push({
              passenger_id: passenger.passengerId,
              booking_id: booking.bookingId,
              first_name: passenger.firstName,
              last_name: passenger.lastName,
              email: passenger.email,
              phone: passenger.phone,
              date_of_birth: passenger.dateOfBirth,
              passport_number: passenger.passportNumber,
              ticket_number: passenger.ticketNumber,
              created_at: passenger.createdAt || new Date().toISOString(),
            })

            // Collect seat assignments
            if (passenger.seatAssignments) {
              for (const seatAssignment of passenger.seatAssignments) {
                allSeatAssignments.push({
                  passenger_id: passenger.passengerId,
                  flight_id: seatAssignment.flightId,
                  seat_number: seatAssignment.seatNumber,
                  check_in_status:
                    seatAssignment.checkInStatus || 'not_checked_in',
                  check_in_time: seatAssignment.checkInTime || null,
                })
              }
            }
          }
        }
      }

      // Batch insert booking flights
      if (allBookingFlights.length > 0) {
        await db.insert(bookingFlights).values(allBookingFlights).run()
        console.log(`Loaded ${allBookingFlights.length} booking flights`)
      }

      // Batch insert passengers
      if (allPassengers.length > 0) {
        await db.insert(passengers).values(allPassengers).run()
        console.log(`Loaded ${allPassengers.length} passengers`)
      }

      // Batch insert seat assignments
      if (allSeatAssignments.length > 0) {
        await db.insert(seatAssignments).values(allSeatAssignments).run()
        console.log(`Loaded ${allSeatAssignments.length} seat assignments`)
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },

  // User Mutations
  createUser: async (userData: {
    email: string
    username: string
    password: string
    avatar?: string
    bio?: string
  }) => {
    return db
      .insert(users)
      .values({
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateUser: async (
    userId: number,
    userData: {
      email?: string
      username?: string
      avatar?: string
      bio?: string
    },
  ) => {
    return db
      .update(users)
      .set({
        ...userData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .get()
  },

  // Flight Mutations
  createFlight: async (flightData: {
    flight_id: string
    airline_id: string
    airline_code: string
    flight_number: string
    origin: string
    destination: string
    departure_time: string
    arrival_time: string
    duration_minutes: number
    fare: number
    currency?: string
    seats_available: number
    aircraft_type: string
    date: string
  }) => {
    return db
      .insert(flights)
      .values({
        ...flightData,
        currency: flightData.currency || 'USD',
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateFlight: async (
    flightId: string,
    flightData: {
      airline_id?: string
      airline_code?: string
      flight_number?: string
      origin?: string
      destination?: string
      departure_time?: string
      arrival_time?: string
      duration_minutes?: number
      fare?: number
      currency?: string
      seats_available?: number
      aircraft_type?: string
      date?: string
    },
  ) => {
    return db
      .update(flights)
      .set(flightData)
      .where(eq(flights.flight_id, flightId))
      .returning()
      .get()
  },

  // Generate flights from config for a specific date
  generateFlightsFromConfig: async (
    origin: string,
    destination: string,
    date: string, // YYYY-MM-DD format
  ) => {
    try {
      console.log(
        `[generateFlightsFromConfig] Attempting to generate flights for ${origin} -> ${destination} on ${date}`,
      )
      // Get matching configs
      const configs = await db
        .select()
        .from(flightsconfig)
        .where(
          and(
            eq(flightsconfig.origin, origin),
            eq(flightsconfig.destination, destination),
          ),
        )
        .execute()

      console.log(
        `[generateFlightsFromConfig] Found ${configs.length} flight configs for ${origin} -> ${destination}`,
      )

      if (configs.length === 0) {
        console.error(
          `[generateFlightsFromConfig] ERROR: No flight configs found for ${origin} -> ${destination}`,
        )
        // Log available routes from this origin for debugging
        const availableFromOrigin = await db
          .select({
            destination: flightsconfig.destination,
          })
          .from(flightsconfig)
          .where(eq(flightsconfig.origin, origin))
          .groupBy(flightsconfig.destination)
          .execute()
        const destinations = availableFromOrigin
          .map((r: { destination: string }) => r.destination)
          .join(', ')
        console.log(
          `[generateFlightsFromConfig] Available destinations from ${origin}: ${destinations || 'NONE'}`,
        )
        return 0
      }

      let generatedCount = 0

      for (const config of configs) {
        // Generate flight_id: config_flight_id + "_" + date
        const flightId = `${config.flight_id}_${date}`

        // Check if flight already exists
        const exists = await db
          .select()
          .from(flights)
          .where(eq(flights.flight_id, flightId))
          .execute()

        if (exists.length > 0) {
          continue // Skip if already exists
        }

        // Parse times and handle overnight flights
        const [depHour, depMin] = config.departure_time.split(':').map(Number)
        const [arrHour, arrMin] = config.arrival_time.split(':').map(Number)

        // Create departure datetime
        const departureDateTime = new Date(
          `${date}T${config.departure_time}:00Z`,
        )

        // Create arrival datetime
        const arrivalDateTime = new Date(`${date}T${config.arrival_time}:00Z`)

        // If arrival time < departure time, it's an overnight flight - add 1 day
        if (arrHour < depHour || (arrHour === depHour && arrMin < depMin)) {
          arrivalDateTime.setDate(arrivalDateTime.getDate() + 1)
        }

        // Insert the flight.
        // NOTE: We still need to handle a possible race where multiple `loadFlights()`
        // calls generate the same `flight_id` concurrently (common on deeplink append/refresh).
        try {
          await db
            .insert(flights)
            .values({
              flight_id: flightId,
              airline_id: config.airline_id,
              airline_code: config.airline_code,
              flight_number: config.flight_number,
              origin: config.origin,
              destination: config.destination,
              departure_time: departureDateTime.toISOString(),
              arrival_time: arrivalDateTime.toISOString(),
              duration_minutes: config.duration_minutes,
              fare: config.fare,
              currency: config.currency,
              seats_available: config.seats_available,
              aircraft_type: config.aircraft_type,
              date,
              created_at: new Date().toISOString(),
            })
            .run()

          generatedCount++
        } catch (error: any) {
          const msg = error?.message ? String(error.message) : String(error)
          if (msg.includes('UNIQUE constraint failed: flights.flight_id')) {
            // Another concurrent generation inserted it first; ignore and continue.
            continue
          }
          throw error
        }
      }

      console.log(
        `Generated ${generatedCount} flights for ${origin} -> ${destination} on ${date}`,
      )
      return generatedCount
    } catch (error) {
      console.error('Error generating flights from config:', error)
      throw error
    }
  },

  // Booking Mutations
  createBooking: async (bookingData: {
    booking_id: string
    booking_reference: string
    user_id: number
    trip_type: string
    booking_date: string
    status: string
    payment_status: string
    total_price: number
    refund_amount?: number
    amount_paid?: number
    currency?: string
  }) => {
    return db
      .insert(bookings)
      .values({
        ...bookingData,
        refund_amount: bookingData.refund_amount || 0,
        amount_paid:
          bookingData.amount_paid ||
          bookingData.total_price - (bookingData.refund_amount || 0),
        currency: bookingData.currency || 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateBooking: async (
    bookingId: string,
    bookingData: {
      booking_reference?: string
      trip_type?: string
      booking_date?: string
      status?: string
      payment_status?: string
      total_price?: number
      refund_amount?: number
      amount_paid?: number
      currency?: string
    },
  ) => {
    return db
      .update(bookings)
      .set({
        ...bookingData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(bookings.booking_id, bookingId))
      .returning()
      .get()
  },

  // Passenger Mutations
  createPassenger: async (passengerData: {
    passenger_id: string
    booking_id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: string
    passport_number: string
    ticket_number: string
  }) => {
    return db
      .insert(passengers)
      .values({
        ...passengerData,
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updatePassenger: async (
    passengerId: string,
    passengerData: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      date_of_birth?: string
      passport_number?: string
      ticket_number?: string
    },
  ) => {
    return db
      .update(passengers)
      .set(passengerData)
      .where(eq(passengers.passenger_id, passengerId))
      .returning()
      .get()
  },

  deletePassenger: async (passengerId: string) => {
    await db.delete(passengers).where(eq(passengers.passenger_id, passengerId))
    return { success: true }
  },

  // Booking Flight Mutations
  createBookingFlight: async (bookingFlightData: {
    booking_id: string
    flight_id: string
    airline_code: string
    flight_number: string
    origin: string
    destination: string
    departure_time: string
    arrival_time: string
    duration_minutes: number
    fare: number
    segment: string
    status?: string
    cancellation_date?: string
    cancellation_reason?: string
    refund_amount?: number
  }) => {
    return db
      .insert(bookingFlights)
      .values({
        ...bookingFlightData,
        status: bookingFlightData.status || 'confirmed',
        refund_amount: bookingFlightData.refund_amount || 0,
      })
      .returning()
      .get()
  },

  updateBookingFlight: async (
    bookingFlightId: number,
    bookingFlightData: {
      airline_code?: string
      flight_number?: string
      origin?: string
      destination?: string
      departure_time?: string
      arrival_time?: string
      duration_minutes?: number
      fare?: number
      segment?: string
      status?: string
      cancellation_date?: string
      cancellation_reason?: string
      refund_amount?: number
    },
  ) => {
    return db
      .update(bookingFlights)
      .set(bookingFlightData)
      .where(eq(bookingFlights.id, bookingFlightId))
      .returning()
      .get()
  },

  deleteBookingFlight: async (bookingFlightId: number) => {
    await db
      .delete(bookingFlights)
      .where(eq(bookingFlights.id, bookingFlightId))
    return { success: true }
  },

  // Seat Assignment Mutations
  createSeatAssignment: async (seatAssignmentData: {
    passenger_id: string
    flight_id: string
    seat_number: string
  }) => {
    return db
      .insert(seatAssignments)
      .values(seatAssignmentData)
      .returning()
      .get()
  },

  updateSeatAssignment: async (
    seatAssignmentId: number,
    seatAssignmentData: {
      passenger_id?: string
      flight_id?: string
      seat_number?: string
    },
  ) => {
    return db
      .update(seatAssignments)
      .set(seatAssignmentData)
      .where(eq(seatAssignments.id, seatAssignmentId))
      .returning()
      .get()
  },

  deleteSeatAssignment: async (seatAssignmentId: number) => {
    await db
      .delete(seatAssignments)
      .where(eq(seatAssignments.id, seatAssignmentId))
    return { success: true }
  },

  // Utility Mutations
  cancelBooking: async (bookingId: string, reason?: string) => {
    const now = new Date().toISOString()

    // Get booking to calculate refund
    const booking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.booking_id, bookingId))
      .get()

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Update booking status with full refund
    await db
      .update(bookings)
      .set({
        status: 'cancelled',
        payment_status: 'refunded',
        refund_amount: booking.total_price, // Full refund
        updated_at: now,
      })
      .where(eq(bookings.booking_id, bookingId))

    // Update all related booking flights
    await db
      .update(bookingFlights)
      .set({
        status: 'cancelled',
        cancellation_date: now,
        cancellation_reason: reason,
      })
      .where(eq(bookingFlights.booking_id, bookingId))

    return { success: true }
  },

  cancelFlight: async (bookingFlightId: number, reason?: string) => {
    const now = new Date().toISOString()

    // Get the booking flight to find its fare and booking_id
    const bookingFlightData = await db
      .select()
      .from(bookingFlights)
      .where(eq(bookingFlights.id, bookingFlightId))
      .get()

    if (!bookingFlightData) {
      throw new Error('Booking flight not found')
    }

    const flightFare = bookingFlightData.fare || 0

    // Update booking flight status
    await db
      .update(bookingFlights)
      .set({
        status: 'cancelled',
        cancellation_date: now,
        cancellation_reason: reason,
        refund_amount: flightFare,
      })
      .where(eq(bookingFlights.id, bookingFlightId))

    // Get current booking to update refund
    const currentBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.booking_id, bookingFlightData.booking_id))
      .get()

    if (!currentBooking) {
      throw new Error('Booking not found')
    }

    const currentRefund = currentBooking.refund_amount || 0
    const newRefundAmount = currentRefund + flightFare

    // Check if all flights in the booking are cancelled
    const remainingFlights = await db
      .select({ count: sql`count(*)` })
      .from(bookingFlights)
      .where(
        and(
          eq(bookingFlights.booking_id, bookingFlightData.booking_id),
          eq(bookingFlights.status, 'confirmed'),
        ),
      )
      .execute()

    // If no confirmed flights remain, update booking status
    if (remainingFlights[0]?.count === 0) {
      await db
        .update(bookings)
        .set({
          status: 'cancelled',
          payment_status: 'refunded',
          refund_amount: currentBooking.total_price, // Full refund
          updated_at: now,
        })
        .where(eq(bookings.booking_id, bookingFlightData.booking_id))
    } else {
      // Partial cancellation
      await db
        .update(bookings)
        .set({
          status: 'partially_cancelled',
          payment_status: 'partially_refunded',
          refund_amount: newRefundAmount, // Partial refund
          updated_at: now,
        })
        .where(eq(bookings.booking_id, bookingFlightData.booking_id))
    }

    return { success: true }
  },

  // Airline Mutations
  createAirline: async (airlineData: {
    id: string
    name: string
    iata_code: string
    country: string
  }) => {
    return db
      .insert(airlines)
      .values({
        ...airlineData,
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateAirline: async (
    airlineId: string,
    airlineData: {
      name?: string
      iata_code?: string
      country?: string
    },
  ) => {
    return db
      .update(airlines)
      .set(airlineData)
      .where(eq(airlines.id, airlineId))
      .returning()
      .get()
  },

  // Airport Mutations
  createAirport: async (airportData: {
    code: string
    name: string
    city: string
    country: string
    timezone: string
  }) => {
    return db
      .insert(airports)
      .values({
        ...airportData,
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateAirport: async (
    airportCode: string,
    airportData: {
      name?: string
      city?: string
      country?: string
      timezone?: string
    },
  ) => {
    return db
      .update(airports)
      .set(airportData)
      .where(eq(airports.code, airportCode))
      .returning()
      .get()
  },

  // City Pair Mutations
  createCityPair: async (cityPairData: {
    origin: string
    destination: string
    distance_km: number
    avg_duration_minutes: number
  }) => {
    return db
      .insert(cityPairs)
      .values({
        ...cityPairData,
        created_at: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateCityPair: async (
    cityPairId: number,
    cityPairData: {
      origin?: string
      destination?: string
      distance_km?: number
      avg_duration_minutes?: number
    },
  ) => {
    return db
      .update(cityPairs)
      .set(cityPairData)
      .where(eq(cityPairs.id, cityPairId))
      .returning()
      .get()
  },

  deleteCityPair: async (cityPairId: number) => {
    await db.delete(cityPairs).where(eq(cityPairs.id, cityPairId))
    return { success: true }
  },

  // Check-In Mutations
  checkInPassengerForFlight: async (
    passengerId: string,
    flightId: string,
    seatNumber: string,
  ) => {
    const now = new Date().toISOString()

    // Check if seat assignment already exists
    const existing = await db
      .select()
      .from(seatAssignments)
      .where(
        and(
          eq(seatAssignments.passenger_id, passengerId),
          eq(seatAssignments.flight_id, flightId),
        ),
      )
      .get()

    if (existing) {
      // Update existing seat assignment with check-in
      return db
        .update(seatAssignments)
        .set({
          seat_number: seatNumber,
          check_in_status: 'checked_in',
          check_in_time: now,
        })
        .where(eq(seatAssignments.id, existing.id))
        .returning()
        .get()
    } else {
      // Create new seat assignment with check-in
      return db
        .insert(seatAssignments)
        .values({
          passenger_id: passengerId,
          flight_id: flightId,
          seat_number: seatNumber,
          check_in_status: 'checked_in',
          check_in_time: now,
        })
        .returning()
        .get()
    }
  },

  assignSeatToPassenger: async (
    passengerId: string,
    flightId: string,
    seatNumber: string,
  ) => {
    // Check if seat assignment already exists
    const existing = await db
      .select()
      .from(seatAssignments)
      .where(
        and(
          eq(seatAssignments.passenger_id, passengerId),
          eq(seatAssignments.flight_id, flightId),
        ),
      )
      .get()

    if (existing) {
      // Update existing seat assignment
      return db
        .update(seatAssignments)
        .set({ seat_number: seatNumber })
        .where(eq(seatAssignments.id, existing.id))
        .returning()
        .get()
    } else {
      // Create new seat assignment
      return db
        .insert(seatAssignments)
        .values({
          passenger_id: passengerId,
          flight_id: flightId,
          seat_number: seatNumber,
        })
        .returning()
        .get()
    }
  },
}
