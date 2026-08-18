import { eq, and, desc, sql } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

import { db } from '@/db/index'

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

export type User = InferSelectModel<typeof users>
export type Airline = InferSelectModel<typeof airlines>
export type Airport = InferSelectModel<typeof airports>
export type CityPair = InferSelectModel<typeof cityPairs>
export type Flight = InferSelectModel<typeof flights>
export type Booking = InferSelectModel<typeof bookings>
export type BookingFlight = InferSelectModel<typeof bookingFlights>
export type Passenger = InferSelectModel<typeof passengers>
export type SeatAssignment = InferSelectModel<typeof seatAssignments>

const requireAuth = (userId: number | null | undefined): void => {
  if (!userId) {
    throw new Error('Authentication required')
  }
}

// Database Check
export const isDatabaseInitialized = async () => {
  try {
    // Check if tables exist using a simpler query first
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sql`sqlite_master`)
      .where(
        sql`type = 'table' AND name IN ('users', 'airlines', 'airports', 'city_pairs', 'flights', 'flightsconfig', 'bookings', 'booking_flights', 'passengers', 'seat_assignments')`,
      )
      .execute()

    if (!result || !result[0]) {
      console.log('No tables exist in database, needs initialization')
      return false
    }

    // Check if we have all 10 required tables
    const count = result[0].count
    const hasAllTables = count === 10
    console.log(`Database has ${count} of 10 required tables`)

    if (!hasAllTables) {
      return false
    }

    // Check if we have at least one user (basic data check)
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .execute()

    const hasData = userCount[0]?.count > 0
    console.log(`Database has ${hasData ? 'some' : 'no'} user data`)
    return hasData
  } catch (error) {
    console.error('Error checking database initialization:', error)
    return false
  }
}

export const registerUser = async (data: {
  email: string
  username: string
  password: string
  avatar?: string
  bio?: string
}) => {
  try {
    const now = new Date().toISOString()
    const userRes = await db
      .insert(users)
      .values({
        ...data,
        avatar: data.avatar || '',
        bio: data.bio || '',
        created_at: now,
        updated_at: now,
      })
      .returning()
      .execute()
    const user = userRes[0]

    return user
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    const res = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by email:', error)
    throw error
  }
}

export const getUserById = async (id: number) => {
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}
export const fetchUserById = getUserById

const fetchAllUsers = async () => {
  try {
    const res = await db.select().from(users).execute()
    return res
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw error
  }
}

export const checkEmailExists = async (
  email: string,
  excludeUserId?: number,
) => {
  try {
    let query = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))

    if (excludeUserId) {
      query = query.where(sql`${users.id} != ${excludeUserId}`)
    }

    const res = await query.execute()
    return res.length > 0
  } catch (error) {
    console.error('Error checking email existence:', error)
    throw new Error('Failed to check email availability')
  }
}

export const updateUserProfile = async (
  userId: number,
  data: {
    username?: string
    email?: string
    password?: string
    currentPassword?: string
  },
) => {
  try {
    requireAuth(userId)
    if (!data || Object.keys(data).length === 0) return null

    // For password updates, verify current password
    if (data.password && data.currentPassword) {
      const currentUser = await getUserById(userId)
      if (!currentUser || currentUser.password !== data.currentPassword) {
        throw new Error('Current password is incorrect')
      }
    }

    const now = new Date().toISOString()
    const updateData = { ...data }
    delete updateData.currentPassword // Don't store currentPassword

    const res = await db
      .update(users)
      .set({ ...updateData, updated_at: now })
      .where(eq(users.id, userId))
      .returning()
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Flight Booking Queries

export const getAllAirlines = async () => {
  try {
    const res = await db
      .select()
      .from(airlines)
      .orderBy(airlines.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all airlines:', error)
    throw error
  }
}

export const getAirlineByCode = async (iataCode: string) => {
  try {
    const res = await db
      .select()
      .from(airlines)
      .where(eq(airlines.iata_code, iataCode))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting airline by code:', error)
    throw error
  }
}

export const getAllAirports = async () => {
  try {
    const res = await db
      .select()
      .from(airports)
      .orderBy(airports.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all airports:', error)
    throw error
  }
}

export const getAirportByCode = async (code: string) => {
  try {
    const res = await db
      .select()
      .from(airports)
      .where(eq(airports.code, code))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting airport by code:', error)
    throw error
  }
}

export const getAirportsByCountry = async (country: string) => {
  try {
    const res = await db
      .select()
      .from(airports)
      .where(eq(airports.country, country))
      .orderBy(airports.name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting airports by country:', error)
    throw error
  }
}

export const getAllCityPairs = async () => {
  try {
    const res = await db
      .select({
        ...cityPairs,
        originAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
        destinationAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
      })
      .from(cityPairs)
      .leftJoin(airports, eq(cityPairs.origin, airports.code))
      .leftJoin(airports, eq(cityPairs.destination, airports.code))
      .orderBy(cityPairs.origin)
      .execute()

    console.log(`Loaded ${res.length} city pairs from database`)
    return res
  } catch (error) {
    console.error('Error getting all city pairs:', error)
    throw error
  }
}

export const getCityPairByRoute = async (
  origin: string,
  destination: string,
) => {
  try {
    const res = await db
      .select({
        ...cityPairs,
        originAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
        destinationAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
      })
      .from(cityPairs)
      .leftJoin(airports, eq(cityPairs.origin, airports.code))
      .leftJoin(airports, eq(cityPairs.destination, airports.code))
      .where(
        and(
          eq(cityPairs.origin, origin),
          eq(cityPairs.destination, destination),
        ),
      )
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting city pair by route:', error)
    throw error
  }
}

// Get flight configs by origin and destination
export const getFlightConfigsByRoute = async (
  origin: string,
  destination: string,
) => {
  try {
    // First check if airports exist in database
    const originExists = await db
      .select()
      .from(airports)
      .where(eq(airports.code, origin))
      .execute()

    const destExists = await db
      .select()
      .from(airports)
      .where(eq(airports.code, destination))
      .execute()

    if (originExists.length === 0) {
      console.warn(
        `[getFlightConfigsByRoute] Airport ${origin} does not exist in database`,
      )
    }
    if (destExists.length === 0) {
      console.warn(
        `[getFlightConfigsByRoute] Airport ${destination} does not exist in database`,
      )
    }

    const res = await db
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
      `[getFlightConfigsByRoute] Query: ${origin} -> ${destination}, Found: ${res.length} configs`,
    )
    if (res.length === 0) {
      // Log total configs in database for debugging
      const totalConfigs = await db
        .select({ count: sql<number>`count(*)` })
        .from(flightsconfig)
        .execute()
      console.log(
        `[getFlightConfigsByRoute] Total flight configs in database: ${totalConfigs[0]?.count || 0}`,
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
        `[getFlightConfigsByRoute] Available destinations from ${origin}: ${destinations || 'NONE'}`,
      )
    }
    return res
  } catch (error) {
    console.error('Error getting flight configs:', error)
    throw error
  }
}

// Check if flight exists by flight_id
export const checkFlightExists = async (flightId: string) => {
  try {
    const res = await db
      .select()
      .from(flights)
      .where(eq(flights.flight_id, flightId))
      .execute()
    return res.length > 0
  } catch (error) {
    console.error('Error checking flight:', error)
    return false
  }
}

export const searchFlights = async (searchParams: {
  origin: string
  destination: string
  date?: string
  passengers?: number
}) => {
  try {
    // Build conditions - filter by date to avoid duplicates across different dates
    const conditions = [
      eq(flights.origin, searchParams.origin),
      eq(flights.destination, searchParams.destination),
      sql`${flights.seats_available} >= ${searchParams.passengers || 1}`,
    ]

    // Add date filter if provided
    if (searchParams.date) {
      conditions.push(eq(flights.date, searchParams.date))
    }

    const res = await db
      .select({
        ...flights,
        airline: {
          id: airlines.id,
          name: airlines.name,
          iata_code: airlines.iata_code,
          country: airlines.country,
        },
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airline_id, airlines.id))
      .where(and(...conditions))
      .orderBy(flights.departure_time)
      .execute()

    return res
  } catch (error) {
    console.error('Error searching flights:', error)
    throw error
  }
}

export const getFlightById = async (flightId: string) => {
  try {
    const res = await db
      .select({
        ...flights,
        airline: {
          id: airlines.id,
          name: airlines.name,
          iata_code: airlines.iata_code,
          country: airlines.country,
        },
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airline_id, airlines.id))
      .where(eq(flights.flight_id, flightId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting flight by ID:', error)
    throw error
  }
}

export const getFlightsByAirline = async (airlineId: string) => {
  try {
    const res = await db
      .select({
        ...flights,
        airline: {
          id: airlines.id,
          name: airlines.name,
          iata_code: airlines.iata_code,
          country: airlines.country,
        },
        originAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
        destinationAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airline_id, airlines.id))
      .leftJoin(airports, eq(flights.origin, airports.code))
      .leftJoin(airports, eq(flights.destination, airports.code))
      .where(eq(flights.airline_id, airlineId))
      .orderBy(flights.departure_time)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting flights by airline:', error)
    throw error
  }
}

export const getAllBookings = async (userId: number) => {
  try {
    const res = await db
      .select({
        ...bookings,
        user: {
          id: users.id,
          email: users.email,
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.user_id, users.id))
      .where(eq(bookings.user_id, userId))
      .orderBy(desc(bookings.created_at))
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all bookings:', error)
    throw error
  }
}

export const getBookingById = async (bookingId: string) => {
  try {
    const res = await db
      .select({
        ...bookings,
        user: {
          id: users.id,
          email: users.email,
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.user_id, users.id))
      .where(eq(bookings.booking_id, bookingId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting booking by ID:', error)
    throw error
  }
}

export const getBookingWithDetails = async (bookingId: string) => {
  try {
    // Get booking details
    const booking = await getBookingById(bookingId)
    if (!booking) return null

    // Get booking flights
    const bookingFlightsData = await db
      .select({
        ...bookingFlights,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          aircraft_type: flights.aircraft_type,
        },
      })
      .from(bookingFlights)
      .leftJoin(flights, eq(bookingFlights.flight_id, flights.flight_id))
      .where(eq(bookingFlights.booking_id, bookingId))
      .orderBy(bookingFlights.segment)
      .execute()

    // Get passengers
    const passengersData = await db
      .select()
      .from(passengers)
      .where(eq(passengers.booking_id, bookingId))
      .execute()

    // Get seat assignments for each passenger
    const passengersWithSeats = await Promise.all(
      passengersData.map(async passenger => {
        const seatAssignmentsData = await db
          .select({
            ...seatAssignments,
            flight: {
              flight_id: flights.flight_id,
              flight_number: flights.flight_number,
              departure_time: flights.departure_time,
              arrival_time: flights.arrival_time,
            },
          })
          .from(seatAssignments)
          .leftJoin(flights, eq(seatAssignments.flight_id, flights.flight_id))
          .where(eq(seatAssignments.passenger_id, passenger.passenger_id))
          .execute()

        return {
          ...passenger,
          seatAssignments: seatAssignmentsData,
        }
      }),
    )

    return {
      ...booking,
      bookingFlights: bookingFlightsData,
      passengers: passengersWithSeats,
    }
  } catch (error) {
    console.error('Error getting booking with details:', error)
    throw error
  }
}

export const getAllPassengers = async (bookingId: string) => {
  try {
    const res = await db
      .select({
        ...passengers,
        booking: {
          booking_id: bookings.booking_id,
          booking_reference: bookings.booking_reference,
          trip_type: bookings.trip_type,
          status: bookings.status,
        },
      })
      .from(passengers)
      .leftJoin(bookings, eq(passengers.booking_id, bookings.booking_id))
      .where(eq(passengers.booking_id, bookingId))
      .orderBy(passengers.first_name)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all passengers:', error)
    throw error
  }
}

export const getPassengerById = async (passengerId: string) => {
  try {
    const res = await db
      .select({
        ...passengers,
        booking: {
          booking_id: bookings.booking_id,
          booking_reference: bookings.booking_reference,
          trip_type: bookings.trip_type,
          status: bookings.status,
        },
      })
      .from(passengers)
      .leftJoin(bookings, eq(passengers.booking_id, bookings.booking_id))
      .where(eq(passengers.passenger_id, passengerId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting passenger by ID:', error)
    throw error
  }
}

export const getPassengerWithSeats = async (passengerId: string) => {
  try {
    const passenger = await getPassengerById(passengerId)
    if (!passenger) return null

    const seatAssignmentsData = await db
      .select({
        ...seatAssignments,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          origin: flights.origin,
          destination: flights.destination,
        },
      })
      .from(seatAssignments)
      .leftJoin(flights, eq(seatAssignments.flight_id, flights.flight_id))
      .where(eq(seatAssignments.passenger_id, passengerId))
      .execute()

    return {
      ...passenger,
      seatAssignments: seatAssignmentsData,
    }
  } catch (error) {
    console.error('Error getting passenger with seats:', error)
    throw error
  }
}

export const getSeatAssignments = async (passengerId: string) => {
  try {
    const res = await db
      .select({
        ...seatAssignments,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          origin: flights.origin,
          destination: flights.destination,
        },
      })
      .from(seatAssignments)
      .leftJoin(flights, eq(seatAssignments.flight_id, flights.flight_id))
      .where(eq(seatAssignments.passenger_id, passengerId))
      .execute()
    return res
  } catch (error) {
    console.error('Error getting seat assignments:', error)
    throw error
  }
}

export const getAllBookingFlights = async (bookingId: string) => {
  try {
    const res = await db
      .select({
        ...bookingFlights,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          aircraft_type: flights.aircraft_type,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          duration_minutes: flights.duration_minutes,
        },
        booking: {
          booking_id: bookings.booking_id,
          booking_reference: bookings.booking_reference,
          trip_type: bookings.trip_type,
          status: bookings.status,
        },
      })
      .from(bookingFlights)
      .leftJoin(flights, eq(bookingFlights.flight_id, flights.flight_id))
      .leftJoin(bookings, eq(bookingFlights.booking_id, bookings.booking_id))
      .where(eq(bookingFlights.booking_id, bookingId))
      .orderBy(bookingFlights.segment)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting all booking flights:', error)
    throw error
  }
}

export const getBookingFlightById = async (bookingFlightId: number) => {
  try {
    const res = await db
      .select({
        ...bookingFlights,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          aircraft_type: flights.aircraft_type,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          duration_minutes: flights.duration_minutes,
        },
        booking: {
          booking_id: bookings.booking_id,
          booking_reference: bookings.booking_reference,
          trip_type: bookings.trip_type,
          status: bookings.status,
        },
      })
      .from(bookingFlights)
      .leftJoin(flights, eq(bookingFlights.flight_id, flights.flight_id))
      .leftJoin(bookings, eq(bookingFlights.booking_id, bookings.booking_id))
      .where(eq(bookingFlights.id, bookingFlightId))
      .execute()
    return res[0] || null
  } catch (error) {
    console.error('Error getting booking flight by ID:', error)
    throw error
  }
}

export const getBookingFlightsBySegment = async (
  bookingId: string,
  segment: string,
) => {
  try {
    const res = await db
      .select({
        ...bookingFlights,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          aircraft_type: flights.aircraft_type,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          duration_minutes: flights.duration_minutes,
        },
      })
      .from(bookingFlights)
      .leftJoin(flights, eq(bookingFlights.flight_id, flights.flight_id))
      .where(
        and(
          eq(bookingFlights.booking_id, bookingId),
          eq(bookingFlights.segment, segment),
        ),
      )
      .orderBy(bookingFlights.departure_time)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting booking flights by segment:', error)
    throw error
  }
}

export const getAvailableSeats = async (flightId: string) => {
  try {
    // Get all seat assignments for this flight
    const assignedSeats = await db
      .select({ seat_number: seatAssignments.seat_number })
      .from(seatAssignments)
      .where(eq(seatAssignments.flight_id, flightId))
      .execute()

    const assignedSeatNumbers = assignedSeats.map(seat => seat.seat_number)
    // This would typically come from aircraft configuration
    // For now, we'll return a simple list of available seats
    const allSeats = [
      '1A',
      '1B',
      '1C',
      '1D',
      '1E',
      '1F',
      '2A',
      '2B',
      '2C',
      '2D',
      '2E',
      '2F',
    ]
    const availableSeats = allSeats.filter(
      seat => !assignedSeatNumbers.includes(seat),
    )
    return availableSeats
  } catch (error) {
    console.error('Error getting available seats:', error)
    throw error
  }
}

export const getFlightAvailability = async (flightId: string) => {
  try {
    const flight = await getFlightById(flightId)
    if (!flight) return null

    const availableSeats = await getAvailableSeats(flightId)
    return {
      ...flight,
      availableSeats: availableSeats.length,
      availableSeatNumbers: availableSeats,
    }
  } catch (error) {
    console.error('Error getting flight availability:', error)
    throw error
  }
}

export const getFlightsByDate = async (date: string) => {
  try {
    const res = await db
      .select({
        ...flights,
        airline: {
          id: airlines.id,
          name: airlines.name,
          iata_code: airlines.iata_code,
          country: airlines.country,
        },
        originAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
        destinationAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airline_id, airlines.id))
      .leftJoin(airports, eq(flights.origin, airports.code))
      .leftJoin(airports, eq(flights.destination, airports.code))
      .where(eq(flights.date, date))
      .orderBy(flights.departure_time)
      .execute()

    return res
  } catch (error) {
    console.error('Error getting flights by date:', error)
    throw error
  }
}

export const getFlightsByRoute = async (
  origin: string,
  destination: string,
) => {
  try {
    const res = await db
      .select({
        ...flights,
        airline: {
          id: airlines.id,
          name: airlines.name,
          iata_code: airlines.iata_code,
          country: airlines.country,
        },
        originAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
        destinationAirport: {
          code: airports.code,
          name: airports.name,
          city: airports.city,
          country: airports.country,
        },
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airline_id, airlines.id))
      .leftJoin(airports, eq(flights.origin, airports.code))
      .leftJoin(airports, eq(flights.destination, airports.code))
      .where(
        and(eq(flights.origin, origin), eq(flights.destination, destination)),
      )
      .orderBy(flights.departure_time)
      .execute()

    return res
  } catch (error) {
    console.error('Error getting flights by route:', error)
    throw error
  }
}

export const getBookingStats = async (userId: number) => {
  try {
    const totalBookings = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.user_id, userId))
      .execute()

    const confirmedBookings = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(eq(bookings.user_id, userId), eq(bookings.status, 'confirmed')),
      )
      .execute()

    const cancelledBookings = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(eq(bookings.user_id, userId), eq(bookings.status, 'cancelled')),
      )
      .execute()

    const totalSpent = await db
      .select({ total: sql<number>`sum(total_price)` })
      .from(bookings)
      .where(
        and(eq(bookings.user_id, userId), eq(bookings.payment_status, 'paid')),
      )
      .execute()

    return {
      totalBookings: totalBookings[0]?.count || 0,
      confirmedBookings: confirmedBookings[0]?.count || 0,
      cancelledBookings: cancelledBookings[0]?.count || 0,
      totalSpent: totalSpent[0]?.total || 0,
    }
  } catch (error) {
    console.error('Error getting booking stats:', error)
    throw error
  }
}

export const getRecentBookings = async (userId: number, limit = 10) => {
  try {
    const res = await db
      .select({
        ...bookings,
        user: {
          id: users.id,
          email: users.email,
          username: users.username,
        },
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.user_id, users.id))
      .where(eq(bookings.user_id, userId))
      .orderBy(desc(bookings.created_at))
      .limit(limit)
      .execute()
    return res
  } catch (error) {
    console.error('Error getting recent bookings:', error)
    throw error
  }
}

export const getUpcomingFlights = async (userId: number) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await db
      .select({
        ...bookingFlights,
        flight: {
          flight_id: flights.flight_id,
          airline_code: flights.airline_code,
          flight_number: flights.flight_number,
          departure_time: flights.departure_time,
          arrival_time: flights.arrival_time,
          origin: flights.origin,
          destination: flights.destination,
          date: flights.date,
        },
        booking: {
          booking_id: bookings.booking_id,
          booking_reference: bookings.booking_reference,
          status: bookings.status,
        },
      })
      .from(bookingFlights)
      .leftJoin(flights, eq(bookingFlights.flight_id, flights.flight_id))
      .leftJoin(bookings, eq(bookingFlights.booking_id, bookings.booking_id))
      .leftJoin(users, eq(bookings.user_id, users.id))
      .where(
        and(
          eq(users.id, userId),
          eq(bookingFlights.status, 'confirmed'),
          sql`${flights.date} >= ${today}`,
        ),
      )
      .orderBy(flights.departure_time)
      .execute()

    return res
  } catch (error) {
    console.error('Error getting upcoming flights:', error)
    throw error
  }
}

export const getPopularRoutes = async (limit = 10) => {
  try {
    const res = await db
      .select({
        origin: bookingFlights.origin,
        destination: bookingFlights.destination,
        count: sql<number>`count(*)`,
      })
      .from(bookingFlights)
      .where(eq(bookingFlights.status, 'confirmed'))
      .groupBy(bookingFlights.origin, bookingFlights.destination)
      .orderBy(desc(sql`count(*)`))
      .limit(limit)
      .execute()

    return res
  } catch (error) {
    console.error('Error getting popular routes:', error)
    throw error
  }
}

export const getFlightSearchSuggestions = async (query: string) => {
  try {
    const airportsData = await db
      .select({
        code: airports.code,
        name: airports.name,
        city: airports.city,
        country: airports.country,
      })
      .from(airports)
      .where(
        sql`${airports.name} LIKE ${'%' + query + '%'} OR ${airports.city} LIKE ${'%' + query + '%'} OR ${airports.code} LIKE ${'%' + query + '%'}`,
      )
      .limit(10)
      .execute()

    return airportsData
  } catch (error) {
    console.error('Error getting flight search suggestions:', error)
    throw error
  }
}

export const getPassengersByBooking = async (bookingId: string) => {
  try {
    const res = await db
      .select()
      .from(passengers)
      .where(eq(passengers.booking_id, bookingId))
      .execute()
    return res
  } catch (error) {
    console.error('Error getting passengers by booking:', error)
    throw error
  }
}

export const checkIfBookingCheckedIn = async (bookingId: string) => {
  try {
    // Get booking with seat assignments
    const booking = await getBookingWithDetails(bookingId)
    if (!booking) {
      return {
        allCheckedIn: false,
        someCheckedIn: false,
        total: 0,
        checkedInCount: 0,
      }
    }

    const passengers = booking.passengers || []
    const flights = booking.bookingFlights || []

    // Total seat assignments needed (passengers x flights)
    const totalRequired = passengers.length * flights.length

    // Count how many seat assignments are checked in
    let checkedInCount = 0
    passengers.forEach((p: any) => {
      p.seatAssignments?.forEach((sa: any) => {
        if (sa.check_in_status === 'checked_in') {
          checkedInCount++
        }
      })
    })

    return {
      allCheckedIn: checkedInCount === totalRequired && totalRequired > 0,
      someCheckedIn: checkedInCount > 0,
      total: totalRequired,
      checkedInCount,
    }
  } catch (error) {
    console.error('Error checking booking check-in status:', error)
    throw error
  }
}

const wrapQuery = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  name: string,
): F =>
  (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    try {
      // @ts-ignore – preserve original type information
      return await fn(...args)
    } catch (error) {
      console.error(`Error in ${name}:`, error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error'
      throw new Error(`${name}: ${msg}`)
    }
  }) as F

export const queries = {
  /* setup */ isDatabaseInitialized,

  /* user */ registerUser: wrapQuery(registerUser, 'registerUser'),
  fetchUserById: wrapQuery(fetchUserById, 'fetchUserById'),
  updateUserProfile: wrapQuery(updateUserProfile, 'updateUserProfile'),
  checkEmailExists: wrapQuery(checkEmailExists, 'checkEmailExists'),
  getUserByEmail: wrapQuery(getUserByEmail, 'getUserByEmail'),
  getUserById: wrapQuery(getUserById, 'getUserById'),
  fetchAllUsers: wrapQuery(fetchAllUsers, 'fetchAllUsers'),

  /* airlines */ getAllAirlines: wrapQuery(getAllAirlines, 'getAllAirlines'),
  getAirlineByCode: wrapQuery(getAirlineByCode, 'getAirlineByCode'),

  /* airports */ getAllAirports: wrapQuery(getAllAirports, 'getAllAirports'),
  getAirportByCode: wrapQuery(getAirportByCode, 'getAirportByCode'),
  getAirportsByCountry: wrapQuery(getAirportsByCountry, 'getAirportsByCountry'),

  /* city pairs */ getAllCityPairs: wrapQuery(
    getAllCityPairs,
    'getAllCityPairs',
  ),
  getCityPairByRoute: wrapQuery(getCityPairByRoute, 'getCityPairByRoute'),

  /* flights */ searchFlights: wrapQuery(searchFlights, 'searchFlights'),
  getFlightById: wrapQuery(getFlightById, 'getFlightById'),
  getFlightsByAirline: wrapQuery(getFlightsByAirline, 'getFlightsByAirline'),
  getFlightsByDate: wrapQuery(getFlightsByDate, 'getFlightsByDate'),
  getFlightsByRoute: wrapQuery(getFlightsByRoute, 'getFlightsByRoute'),
  getAvailableSeats: wrapQuery(getAvailableSeats, 'getAvailableSeats'),
  getFlightAvailability: wrapQuery(
    getFlightAvailability,
    'getFlightAvailability',
  ),
  getFlightSearchSuggestions: wrapQuery(
    getFlightSearchSuggestions,
    'getFlightSearchSuggestions',
  ),

  /* bookings */ getAllBookings: wrapQuery(getAllBookings, 'getAllBookings'),
  getBookingById: wrapQuery(getBookingById, 'getBookingById'),
  getBookingWithDetails: wrapQuery(
    getBookingWithDetails,
    'getBookingWithDetails',
  ),
  getRecentBookings: wrapQuery(getRecentBookings, 'getRecentBookings'),
  getBookingStats: wrapQuery(getBookingStats, 'getBookingStats'),
  getUpcomingFlights: wrapQuery(getUpcomingFlights, 'getUpcomingFlights'),

  /* booking flights */ getAllBookingFlights: wrapQuery(
    getAllBookingFlights,
    'getAllBookingFlights',
  ),
  getBookingFlightById: wrapQuery(getBookingFlightById, 'getBookingFlightById'),
  getBookingFlightsBySegment: wrapQuery(
    getBookingFlightsBySegment,
    'getBookingFlightsBySegment',
  ),

  /* passengers */ getAllPassengers: wrapQuery(
    getAllPassengers,
    'getAllPassengers',
  ),
  getPassengerById: wrapQuery(getPassengerById, 'getPassengerById'),
  getPassengerWithSeats: wrapQuery(
    getPassengerWithSeats,
    'getPassengerWithSeats',
  ),

  /* seat assignments */ getSeatAssignments: wrapQuery(
    getSeatAssignments,
    'getSeatAssignments',
  ),

  /* analytics */ getPopularRoutes: wrapQuery(
    getPopularRoutes,
    'getPopularRoutes',
  ),
}
