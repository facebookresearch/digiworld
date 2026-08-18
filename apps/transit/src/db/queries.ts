import { sql, eq, and, or, desc, asc, like } from 'drizzle-orm'
import {
  users,
  areas,
  stops,
  stopPlatforms,
  lines,
  lineStops,
  lineSegments,
  vehicles,
  serviceAlerts,
  alertLines,
  alertStops,
  userPreferences,
  recentSearches,
  savedRoutes,
  tripOptions,
  tripSteps,
  appConstants,
} from './schema'
import { db } from './index'

interface ScheduleStop {
  stopId: string
  arrivalTime: string
  sequence: number
}

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmedValue = value.trim()
  if (
    !trimmedValue ||
    trimmedValue.toLowerCase() === 'undefined' ||
    trimmedValue.toLowerCase() === 'null'
  ) {
    return []
  }

  try {
    const parsedValue = JSON.parse(trimmedValue)
    if (Array.isArray(parsedValue)) {
      return parsedValue.filter(
        (item): item is string => typeof item === 'string',
      )
    }
    if (typeof parsedValue === 'string') {
      return [parsedValue]
    }
  } catch {
    return [trimmedValue]
  }

  return []
}

export const queries = {
  // ============================================
  // USER QUERIES
  // ============================================

  getUserById: async (userId: number) => {
    return db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), sql`${users.deleted_at} IS NULL`))
      .get()
  },

  getUserByEmail: async (email: string) => {
    return db
      .select()
      .from(users)
      .where(and(eq(users.email, email), sql`${users.deleted_at} IS NULL`))
      .get()
  },

  getUserByUsername: async (username: string) => {
    return db
      .select()
      .from(users)
      .where(
        and(eq(users.username, username), sql`${users.deleted_at} IS NULL`),
      )
      .get()
  },

  getAllUsers: async () => {
    return db
      .select()
      .from(users)
      .where(eq(users.deleted_at, null))
      .orderBy(asc(users.username))
      .all()
  },

  registerUser: async (userData: {
    email: string
    username: string
    password: string
    avatar?: string
    bio?: string
  }) => {
    // Import mutations here to avoid circular dependency
    const { mutations } = await import('./mutations')
    return mutations.createUser(userData)
  },

  // ============================================
  // USER PREFERENCES QUERIES
  // ============================================

  getUserPreferences: async (userId: number) => {
    const prefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get()

    if (!prefs) return null

    // Parse JSON fields
    return {
      ...prefs,
      preferredModes: Array.isArray(prefs.preferredModes)
        ? prefs.preferredModes
        : prefs.preferredModes
          ? JSON.parse(prefs.preferredModes as string)
          : [],
    }
  },

  // ============================================
  // AREA QUERIES
  // ============================================

  getAllAreas: async () => {
    return db.select().from(areas).orderBy(asc(areas.name)).all()
  },

  getAreaById: async (areaId: number) => {
    return db.select().from(areas).where(eq(areas.id, areaId)).get()
  },

  // ============================================
  // STOP QUERIES
  // ============================================

  getAllStops: async () => {
    const allStops = await db
      .select()
      .from(stops)
      .orderBy(asc(stops.name))
      .all()

    // Parse JSON fields
    return allStops.map((stop: any) => ({
      ...stop,
      modesServed: Array.isArray(stop.modesServed)
        ? stop.modesServed
        : JSON.parse(stop.modesServed as string),
      facilities: Array.isArray(stop.facilities)
        ? stop.facilities
        : JSON.parse(stop.facilities as string),
      amenities: Array.isArray(stop.amenities)
        ? stop.amenities
        : JSON.parse(stop.amenities as string),
      accessibility: Array.isArray(stop.accessibility)
        ? stop.accessibility
        : JSON.parse(stop.accessibility as string),
    }))
  },

  getStopById: async (stopId: string) => {
    const stop = await db.select().from(stops).where(eq(stops.id, stopId)).get()

    if (!stop) return null

    // Parse JSON fields
    return {
      ...stop,
      modesServed: Array.isArray(stop.modesServed)
        ? stop.modesServed
        : JSON.parse(stop.modesServed as string),
      facilities: Array.isArray(stop.facilities)
        ? stop.facilities
        : JSON.parse(stop.facilities as string),
      amenities: Array.isArray(stop.amenities)
        ? stop.amenities
        : JSON.parse(stop.amenities as string),
      accessibility: Array.isArray(stop.accessibility)
        ? stop.accessibility
        : JSON.parse(stop.accessibility as string),
    }
  },

  getStopByName: async (stopName: string) => {
    const stop = await db
      .select()
      .from(stops)
      .where(eq(stops.name, stopName))
      .get()

    if (!stop) return null

    // Parse JSON fields
    return {
      ...stop,
      modesServed: Array.isArray(stop.modesServed)
        ? stop.modesServed
        : JSON.parse(stop.modesServed as string),
      facilities: Array.isArray(stop.facilities)
        ? stop.facilities
        : JSON.parse(stop.facilities as string),
      amenities: Array.isArray(stop.amenities)
        ? stop.amenities
        : JSON.parse(stop.amenities as string),
      accessibility: Array.isArray(stop.accessibility)
        ? stop.accessibility
        : JSON.parse(stop.accessibility as string),
    }
  },

  getStopsByArea: async (areaId: number) => {
    const areaStops = await db
      .select()
      .from(stops)
      .where(eq(stops.areaId, areaId))
      .orderBy(asc(stops.name))
      .all()

    // Parse JSON fields
    return areaStops.map((stop: any) => ({
      ...stop,
      modesServed: Array.isArray(stop.modesServed)
        ? stop.modesServed
        : JSON.parse(stop.modesServed as string),
      facilities: Array.isArray(stop.facilities)
        ? stop.facilities
        : JSON.parse(stop.facilities as string),
      amenities: Array.isArray(stop.amenities)
        ? stop.amenities
        : JSON.parse(stop.amenities as string),
      accessibility: Array.isArray(stop.accessibility)
        ? stop.accessibility
        : JSON.parse(stop.accessibility as string),
    }))
  },

  getStopsByMode: async (mode: string) => {
    const allStops = await queries.getAllStops()
    return allStops.filter((stop: any) => stop.modesServed.includes(mode))
  },

  getNearbyStops: async (
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
  ) => {
    // Haversine formula approximation in SQLite
    // 1 degree latitude ≈ 111 km
    const latRange = radiusKm / 111
    const lonRange = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180))

    const nearbyStops = await db
      .select()
      .from(stops)
      .where(
        and(
          sql`${stops.latitude} BETWEEN ${latitude - latRange} AND ${latitude + latRange}`,
          sql`${stops.longitude} BETWEEN ${longitude - lonRange} AND ${longitude + lonRange}`,
        ),
      )
      .all()

    // Calculate actual distances and sort
    const stopsWithDistance = nearbyStops.map((stop: any) => {
      const lat1 = latitude
      const lon1 = longitude
      const lat2 = stop.latitude
      const lon2 = stop.longitude

      // Haversine formula
      const R = 6371 // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c

      return {
        ...stop,
        distance,
        modesServed: Array.isArray(stop.modesServed)
          ? stop.modesServed
          : JSON.parse(stop.modesServed as string),
        facilities: Array.isArray(stop.facilities)
          ? stop.facilities
          : JSON.parse(stop.facilities as string),
        amenities: Array.isArray(stop.amenities)
          ? stop.amenities
          : JSON.parse(stop.amenities as string),
        accessibility: Array.isArray(stop.accessibility)
          ? stop.accessibility
          : JSON.parse(stop.accessibility as string),
      }
    })

    return stopsWithDistance
      .filter((stop: any) => stop.distance <= radiusKm)
      .sort((a: any, b: any) => a.distance - b.distance)
  },

  searchStops: async (searchTerm: string) => {
    const results = await db
      .select()
      .from(stops)
      .where(
        or(
          like(stops.name, `%${searchTerm}%`),
          like(stops.description, `%${searchTerm}%`),
        ),
      )
      .orderBy(asc(stops.name))
      .all()

    // Parse JSON fields
    return results.map((stop: any) => ({
      ...stop,
      modesServed: Array.isArray(stop.modesServed)
        ? stop.modesServed
        : JSON.parse(stop.modesServed as string),
      facilities: Array.isArray(stop.facilities)
        ? stop.facilities
        : JSON.parse(stop.facilities as string),
      amenities: Array.isArray(stop.amenities)
        ? stop.amenities
        : JSON.parse(stop.amenities as string),
      accessibility: Array.isArray(stop.accessibility)
        ? stop.accessibility
        : JSON.parse(stop.accessibility as string),
    }))
  },

  // ============================================
  // STOP PLATFORM QUERIES
  // ============================================

  getPlatformsByStop: async (stopId: string) => {
    return db
      .select()
      .from(stopPlatforms)
      .where(eq(stopPlatforms.stopId, stopId))
      .orderBy(asc(stopPlatforms.mode))
      .all()
  },

  getPlatformByStopAndMode: async (stopId: string, mode: string) => {
    return db
      .select()
      .from(stopPlatforms)
      .where(
        and(eq(stopPlatforms.stopId, stopId), eq(stopPlatforms.mode, mode)),
      )
      .get()
  },

  // ============================================
  // LINE QUERIES
  // ============================================

  getAllLines: async () => {
    return db.select().from(lines).orderBy(asc(lines.shortName)).all()
  },

  getLineById: async (lineId: string) => {
    return db.select().from(lines).where(eq(lines.id, lineId)).get()
  },

  getLinesByMode: async (mode: string) => {
    return db
      .select()
      .from(lines)
      .where(eq(lines.mode, mode))
      .orderBy(asc(lines.shortName))
      .all()
  },

  getLinesByStatus: async (status: string) => {
    return db
      .select()
      .from(lines)
      .where(eq(lines.status, status))
      .orderBy(asc(lines.shortName))
      .all()
  },

  getLinesByStop: async (stopId: string) => {
    const lineStopsData = await db
      .select({
        line: lines,
        sequence: lineStops.sequence,
      })
      .from(lineStops)
      .innerJoin(lines, eq(lineStops.lineId, lines.id))
      .where(eq(lineStops.stopId, stopId))
      .orderBy(asc(lines.shortName))
      .all()

    return lineStopsData.map(item => item.line)
  },

  // ============================================
  // LINE STOPS QUERIES
  // ============================================

  getStopsByLine: async (lineId: string) => {
    const lineStopsData = await db
      .select({
        stop: stops,
        sequence: lineStops.sequence,
      })
      .from(lineStops)
      .innerJoin(stops, eq(lineStops.stopId, stops.id))
      .where(eq(lineStops.lineId, lineId))
      .orderBy(asc(lineStops.sequence))
      .all()

    // Parse JSON fields
    return lineStopsData.map(item => ({
      ...item.stop,
      sequence: item.sequence,
      modesServed: JSON.parse(item.stop.modesServed as string),
      facilities: JSON.parse(item.stop.facilities as string),
      amenities: JSON.parse(item.stop.amenities as string),
      accessibility: JSON.parse(item.stop.accessibility as string),
    }))
  },

  getLineStopSequence: async (lineId: string, stopId: string) => {
    const result = await db
      .select()
      .from(lineStops)
      .where(and(eq(lineStops.lineId, lineId), eq(lineStops.stopId, stopId)))
      .get()

    return result?.sequence || null
  },

  // ============================================
  // LINE SEGMENTS QUERIES
  // ============================================

  getSegmentsByLine: async (lineId: string) => {
    return db
      .select()
      .from(lineSegments)
      .where(eq(lineSegments.lineId, lineId))
      .all()
  },

  getSegmentBetweenStops: async (
    lineId: string,
    fromStopId: string,
    toStopId: string,
  ) => {
    return db
      .select()
      .from(lineSegments)
      .where(
        and(
          eq(lineSegments.lineId, lineId),
          eq(lineSegments.fromStopId, fromStopId),
          eq(lineSegments.toStopId, toStopId),
        ),
      )
      .get()
  },

  calculateRouteOnLine: async (
    lineId: string,
    fromStopId: string,
    toStopId: string,
  ) => {
    // Get the line to check stop order
    const lineStopsData = await db
      .select()
      .from(lineStops)
      .where(eq(lineStops.lineId, lineId))
      .orderBy(asc(lineStops.sequence))
      .all()

    const stopIds = lineStopsData.map(ls => ls.stopId)
    const fromIndex = stopIds.indexOf(fromStopId)
    const toIndex = stopIds.indexOf(toStopId)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return null
    }

    // Get all segments between origin and destination
    const segments = await db
      .select()
      .from(lineSegments)
      .where(eq(lineSegments.lineId, lineId))
      .all()

    let totalDuration = 0
    let totalFare = 0
    let totalDistance = 0
    let segmentCount = 0

    // Handle both forward and backward directions (bidirectional segments)
    if (fromIndex < toIndex) {
      // Forward direction
      for (let i = fromIndex; i < toIndex; i++) {
        const segment = segments.find(
          s => s.fromStopId === stopIds[i] && s.toStopId === stopIds[i + 1],
        )
        if (segment) {
          totalDuration += segment.durationMinutes
          totalFare += segment.fare
          totalDistance += segment.distanceKm
          segmentCount++
        }
      }
    } else {
      // Backward direction (reverse the segments)
      for (let i = fromIndex; i > toIndex; i--) {
        const segment = segments.find(
          s => s.fromStopId === stopIds[i - 1] && s.toStopId === stopIds[i],
        )
        if (segment) {
          totalDuration += segment.durationMinutes
          totalFare += segment.fare
          totalDistance += segment.distanceKm
          segmentCount++
        }
      }
    }

    if (segmentCount === 0) {
      return null
    }

    return {
      lineId,
      fromStopId,
      toStopId,
      totalDurationMinutes: totalDuration,
      totalFare,
      totalDistanceKm: totalDistance,
      segmentCount,
    }
  },

  // ============================================
  // VEHICLE QUERIES
  // ============================================

  getAllVehicles: async () => {
    const vehiclesData = await db.select().from(vehicles).all()

    return vehiclesData.map(vehicle => ({
      ...vehicle,
      scheduleData: JSON.parse(vehicle.scheduleData as string),
    }))
  },

  getVehiclesByLine: async (lineId: string) => {
    const vehiclesData = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.lineId, lineId))
      .orderBy(asc(vehicles.departureTime))
      .all()

    return vehiclesData.map(vehicle => ({
      ...vehicle,
      scheduleData: JSON.parse(vehicle.scheduleData as string),
    }))
  },

  getVehiclesByStop: async (
    stopId: string,
    showFullSchedule: boolean = false,
  ) => {
    // Get current time in HH:MM format
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const vehiclesData = await db
      .select({
        vehicle: vehicles,
        line: lines,
      })
      .from(vehicles)
      .leftJoin(lines, eq(vehicles.lineId, lines.id))
      .where(eq(vehicles.status, 'active'))
      .all()

    const vehiclesAtStop = vehiclesData
      .map(({ vehicle, line }) => {
        const scheduleData = JSON.parse(
          vehicle.scheduleData as string,
        ) as ScheduleStop[]
        const stopSchedule = scheduleData.find(s => s.stopId === stopId)

        if (stopSchedule) {
          // If showFullSchedule is true, show all vehicles
          // Otherwise, only show vehicles arriving AFTER current time
          if (showFullSchedule || stopSchedule.arrivalTime >= currentTime) {
            return {
              id: vehicle.id,
              vehicleNumber: vehicle.vehicleNumber,
              departureTime: vehicle.departureTime,
              direction: vehicle.direction,
              status: vehicle.status,
              nextArrival: stopSchedule.arrivalTime,
              stopSequence: stopSchedule.sequence,
              lineId: line?.id,
              lineName: line?.name,
              lineShortName: line?.shortName,
              lineColor: line?.color,
              mode: line?.mode,
              isPast: stopSchedule.arrivalTime < currentTime,
            }
          }
        }
        return null
      })
      .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined)
      .sort((a, b) => a.nextArrival.localeCompare(b.nextArrival))

    // Only limit results for upcoming arrivals
    return showFullSchedule ? vehiclesAtStop : vehiclesAtStop.slice(0, 20)
  },

  getActiveVehicles: async () => {
    const vehiclesData = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.status, 'active'))
      .all()

    return vehiclesData.map(vehicle => ({
      ...vehicle,
      scheduleData: JSON.parse(vehicle.scheduleData as string),
    }))
  },

  getNearbyStopsWithVehicles: async (
    userLat: number,
    userLon: number,
    limit: number = 10,
  ) => {
    const nearbyStops = await queries.getNearbyStops(userLat, userLon, limit)
    const allVehiclesData = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.status, 'active'))
      .all()

    const nearbyStopsWithVehicles = await Promise.all(
      nearbyStops.map(async stop => {
        // Get lines serving this stop
        const linesAtStop = await queries.getLinesByStop(stop.id)

        // Get vehicles for this stop
        const vehiclesAtStop = allVehiclesData
          .map(vehicle => {
            const scheduleData = JSON.parse(
              vehicle.scheduleData as string,
            ) as ScheduleStop[]
            const stopSchedule = scheduleData.find(s => s.stopId === stop.id)

            if (stopSchedule) {
              return {
                ...vehicle,
                scheduleData,
                nextArrival: stopSchedule.arrivalTime,
                stopSequence: stopSchedule.sequence,
              }
            }
            return null
          })
          .filter(
            (v): v is NonNullable<typeof v> => v !== null && v !== undefined,
          )
          .sort((a, b) => a.nextArrival.localeCompare(b.nextArrival))
          .slice(0, 3) // Get next 3 vehicles

        return {
          ...stop,
          lines: linesAtStop,
          upcomingVehicles: vehiclesAtStop,
        }
      }),
    )

    return nearbyStopsWithVehicles
  },

  // ============================================
  // SERVICE ALERTS QUERIES
  // ============================================

  getAllActiveAlerts: async () => {
    const alerts = await db
      .select()
      .from(serviceAlerts)
      .where(eq(serviceAlerts.isActive, true))
      .orderBy(
        desc(
          sql`CASE 
            WHEN ${serviceAlerts.severity} = 'high' THEN 3 
            WHEN ${serviceAlerts.severity} = 'medium' THEN 2 
            ELSE 1 
          END`,
        ),
        desc(serviceAlerts.createdAt),
      )
      .all()

    return alerts.map(alert => ({
      ...alert,
      recommendedAlternatives: parseStringArray(alert.recommendedAlternatives),
    }))
  },

  getAlertsBySeverity: async (severity: string) => {
    const alerts = await db
      .select()
      .from(serviceAlerts)
      .where(
        and(
          eq(serviceAlerts.severity, severity),
          eq(serviceAlerts.isActive, true),
        ),
      )
      .orderBy(desc(serviceAlerts.createdAt))
      .all()

    return alerts.map(alert => ({
      ...alert,
      recommendedAlternatives: parseStringArray(alert.recommendedAlternatives),
    }))
  },

  getAlertsByLine: async (lineId: string) => {
    const alertsData = await db
      .select({
        alert: serviceAlerts,
      })
      .from(alertLines)
      .innerJoin(serviceAlerts, eq(alertLines.alertId, serviceAlerts.id))
      .where(
        and(eq(alertLines.lineId, lineId), eq(serviceAlerts.isActive, true)),
      )
      .orderBy(desc(serviceAlerts.createdAt))
      .all()

    return alertsData.map(item => ({
      ...item.alert,
      recommendedAlternatives: parseStringArray(
        item.alert.recommendedAlternatives,
      ),
    }))
  },

  getAlertsByStop: async (stopId: string) => {
    const alertsData = await db
      .select({
        alert: serviceAlerts,
      })
      .from(alertStops)
      .innerJoin(serviceAlerts, eq(alertStops.alertId, serviceAlerts.id))
      .where(
        and(eq(alertStops.stopId, stopId), eq(serviceAlerts.isActive, true)),
      )
      .orderBy(desc(serviceAlerts.createdAt))
      .all()

    return alertsData.map(item => ({
      ...item.alert,
      recommendedAlternatives: parseStringArray(
        item.alert.recommendedAlternatives,
      ),
    }))
  },

  getAlertById: async (alertId: string) => {
    const alert = await db
      .select()
      .from(serviceAlerts)
      .where(eq(serviceAlerts.id, alertId))
      .get()

    if (!alert) return null

    // Get affected lines
    const affectedLines = await db
      .select({ lineId: alertLines.lineId })
      .from(alertLines)
      .where(eq(alertLines.alertId, alertId))
      .all()

    // Get affected stops
    const affectedStops = await db
      .select({ stopId: alertStops.stopId })
      .from(alertStops)
      .where(eq(alertStops.alertId, alertId))
      .all()

    return {
      ...alert,
      recommendedAlternatives: parseStringArray(alert.recommendedAlternatives),
      affectedLines: affectedLines.map(item => item.lineId),
      affectedStops: affectedStops.map(item => item.stopId),
    }
  },

  // ============================================
  // SAVED ROUTES QUERIES
  // ============================================

  getSavedRoutesByUser: async (userId: number) => {
    return db
      .select()
      .from(savedRoutes)
      .where(eq(savedRoutes.userId, userId))
      .orderBy(desc(savedRoutes.updatedAt))
      .all()
  },

  getSavedRouteById: async (routeId: string) => {
    return db
      .select()
      .from(savedRoutes)
      .where(eq(savedRoutes.id, routeId))
      .get()
  },

  getSavedRouteByUserAndStops: async (
    userId: number,
    originStopId: string,
    destinationStopId: string,
  ) => {
    return db
      .select()
      .from(savedRoutes)
      .where(
        and(
          eq(savedRoutes.userId, userId),
          eq(savedRoutes.originStopId, originStopId),
          eq(savedRoutes.destinationStopId, destinationStopId),
        ),
      )
      .get()
  },

  // ============================================
  // RECENT SEARCHES QUERIES
  // ============================================

  getRecentSearchesByUser: async (userId: number, limit: number = 10) => {
    const searches = await db
      .select()
      .from(recentSearches)
      .where(eq(recentSearches.userId, userId))
      .orderBy(desc(recentSearches.searchedAt))
      .limit(limit)
      .all()

    return searches.map((search: any) => ({
      ...search,
      modeFilters:
        typeof search.modeFilters === 'string'
          ? JSON.parse(search.modeFilters)
          : (search.modeFilters ?? []),
    }))
  },

  // ============================================
  // TRIP OPTIONS QUERIES
  // ============================================

  getTripOptionById: async (tripId: string) => {
    const trip = await db
      .select()
      .from(tripOptions)
      .where(eq(tripOptions.id, tripId))
      .get()

    if (!trip) return null

    // Parse JSON fields
    return {
      ...trip,
      tags: JSON.parse(trip.tags as string),
    }
  },

  getTripOptionsByRoute: async (
    originStopId: string,
    destinationStopId: string,
  ) => {
    const trips = await db
      .select()
      .from(tripOptions)
      .where(
        and(
          eq(tripOptions.originStopId, originStopId),
          eq(tripOptions.destinationStopId, destinationStopId),
        ),
      )
      .orderBy(asc(tripOptions.totalDurationMinutes))
      .all()

    // Parse JSON fields
    return trips.map(trip => ({
      ...trip,
      tags: JSON.parse(trip.tags as string),
    }))
  },

  getTripOptionsByTag: async (tag: string) => {
    const trips = await db
      .select()
      .from(tripOptions)
      .where(like(tripOptions.tags, `%${tag}%`))
      .orderBy(asc(tripOptions.totalDurationMinutes))
      .all()

    // Parse JSON fields and filter by actual tag
    return trips
      .map(trip => ({
        ...trip,
        tags: JSON.parse(trip.tags as string),
      }))
      .filter(trip => trip.tags.includes(tag))
  },

  getRecentTripOptions: async (limit: number = 20) => {
    const trips = await db
      .select()
      .from(tripOptions)
      .orderBy(desc(tripOptions.createdAt))
      .limit(limit)
      .all()

    // Parse JSON fields
    return trips.map(trip => ({
      ...trip,
      tags: JSON.parse(trip.tags as string),
    }))
  },

  // ============================================
  // TRIP STEPS QUERIES
  // ============================================

  getStepsByTripOption: async (tripOptionId: string) => {
    return db
      .select()
      .from(tripSteps)
      .where(eq(tripSteps.tripOptionId, tripOptionId))
      .orderBy(asc(tripSteps.sequence))
      .all()
  },

  getTripOptionWithSteps: async (tripOptionId: string) => {
    const trip = await queries.getTripOptionById(tripOptionId)
    if (!trip) return null

    const steps = await queries.getStepsByTripOption(tripOptionId)

    return {
      ...trip,
      steps,
    }
  },

  // ============================================
  // APP CONSTANTS QUERIES
  // ============================================

  getAppConstant: async (key: string) => {
    return db.select().from(appConstants).where(eq(appConstants.key, key)).get()
  },

  getAllAppConstants: async () => {
    const constants = await db.select().from(appConstants).all()

    // Convert to key-value object
    return constants.reduce(
      (acc, item) => {
        acc[item.key] = item.value
        return acc
      },
      {} as Record<string, string>,
    )
  },

  // ============================================
  // COMPLEX QUERIES (Multiple Joins)
  // ============================================

  getStopDetailsWithPlatformsAndLines: async (stopId: string) => {
    const stop = await queries.getStopById(stopId)
    if (!stop) return null

    const platforms = await queries.getPlatformsByStop(stopId)
    const linesAtStop = await queries.getLinesByStop(stopId)
    const alerts = await queries.getAlertsByStop(stopId)
    const area = await queries.getAreaById(stop.areaId)

    return {
      ...stop,
      area,
      platforms,
      lines: linesAtStop,
      alerts,
    }
  },

  getLineDetailsWithStops: async (lineId: string) => {
    const line = await queries.getLineById(lineId)
    if (!line) return null

    const stopsOnLine = await queries.getStopsByLine(lineId)
    const alerts = await queries.getAlertsByLine(lineId)

    return {
      ...line,
      stops: stopsOnLine,
      alerts,
    }
  },

  getUserDashboardData: async (userId: number) => {
    const [
      user,
      preferences,
      savedRoutesList,
      recentSearchesList,
      activeAlerts,
    ] = await Promise.all([
      queries.getUserById(userId),
      queries.getUserPreferences(userId),
      queries.getSavedRoutesByUser(userId),
      queries.getRecentSearchesByUser(userId, 5),
      queries.getAllActiveAlerts(),
    ])

    // Get home and work stop details if set
    let homeStop = null
    let workStop = null

    if (preferences?.homeStopId) {
      homeStop = await queries.getStopById(preferences.homeStopId)
    }

    if (preferences?.workStopId) {
      workStop = await queries.getStopById(preferences.workStopId)
    }

    return {
      user,
      preferences: {
        ...preferences,
        homeStop,
        workStop,
      },
      savedRoutes: savedRoutesList,
      recentSearches: recentSearchesList,
      activeAlerts,
    }
  },

  // ============================================
  // SEARCH & DISCOVERY QUERIES
  // ============================================

  searchTransit: async (searchTerm: string) => {
    const [foundStops, foundLines] = await Promise.all([
      queries.searchStops(searchTerm),
      db
        .select()
        .from(lines)
        .where(
          or(
            like(lines.name, `%${searchTerm}%`),
            like(lines.shortName, `%${searchTerm}%`),
          ),
        )
        .orderBy(asc(lines.shortName))
        .all(),
    ])

    return {
      stops: foundStops,
      lines: foundLines,
    }
  },

  getPopularRoutes: async (limit: number = 10) => {
    // Get most frequently saved route combinations
    const routes = await db
      .select({
        originStopId: savedRoutes.originStopId,
        destinationStopId: savedRoutes.destinationStopId,
        count: sql<number>`count(*)`,
      })
      .from(savedRoutes)
      .groupBy(savedRoutes.originStopId, savedRoutes.destinationStopId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit)
      .all()

    // Fetch stop details for each route
    const routesWithDetails = await Promise.all(
      routes.map(async route => {
        const [origin, destination] = await Promise.all([
          queries.getStopById(route.originStopId),
          queries.getStopById(route.destinationStopId),
        ])

        return {
          origin,
          destination,
          saveCount: route.count,
        }
      }),
    )

    return routesWithDetails
  },

  getSystemStatus: async () => {
    const [
      totalStops,
      totalLines,
      activeAlertCount,
      delayedLines,
      onTimeLines,
    ] = await Promise.all([
      db
        .select({ count: sql`count(*)` })
        .from(stops)
        .execute(),
      db
        .select({ count: sql`count(*)` })
        .from(lines)
        .execute(),
      db
        .select({ count: sql`count(*)` })
        .from(serviceAlerts)
        .where(eq(serviceAlerts.isActive, true))
        .execute(),
      db
        .select({ count: sql`count(*)` })
        .from(lines)
        .where(eq(lines.status, 'delayed'))
        .execute(),
      db
        .select({ count: sql`count(*)` })
        .from(lines)
        .where(eq(lines.status, 'on-time'))
        .execute(),
    ])

    return {
      stops: totalStops[0]?.count || 0,
      lines: totalLines[0]?.count || 0,
      activeAlerts: activeAlertCount[0]?.count || 0,
      delayedLines: delayedLines[0]?.count || 0,
      onTimeLines: onTimeLines[0]?.count || 0,
    }
  },

  // ============================================
  // DATABASE INITIALIZATION QUERIES
  // ============================================

  /**
   * Check if database is initialized with data
   * Returns true if tables exist and have data
   */
  isDatabaseInitialized: async (): Promise<boolean> => {
    try {
      // Check if tables exist by querying them
      const [userCount, areaCount] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(areas)
          .execute(),
      ])

      // Database is considered initialized if it has at least one user and one area
      return (userCount[0]?.count || 0) > 0 && (areaCount[0]?.count || 0) > 0
    } catch {
      // If query fails, tables likely don't exist yet
      return false
    }
  },
}

// Export registerUser separately for backward compatibility
export const registerUser = async (userData: {
  email: string
  username: string
  password: string
  avatar?: string
  bio?: string
}) => {
  return queries.registerUser(userData)
}

export const getUserById = queries.getUserById

export const updateUserProfile = async (
  userId: number,
  userData: {
    username?: string
    email?: string
    password?: string
    currentPassword?: string
  },
) => {
  const { mutations } = await import('./mutations')
  return mutations.updateUser(userId, userData)
}
