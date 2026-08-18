import { eq, sql } from 'drizzle-orm'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'

import {
  alertLines,
  alertStops,
  appConstants,
  areas,
  lines,
  lineStops,
  lineSegments,
  recentSearches,
  savedRoutes,
  serviceAlerts,
  stopPlatforms,
  stops,
  tripOptions,
  tripSteps,
  userPreferences,
  users,
  vehicles,
} from './schema'

// Import JSON data files
import areasData from '../data/mock-areas.json'
import constantsData from '../data/mock-constants.json'
import linesData from '../data/mock-lines.json'
import profilePreferencesData from '../data/mock-profile_preferences.json'
import recentSearchesData from '../data/mock-recent_searches.json'
import savedRoutesData from '../data/mock-saved_routes.json'
import serviceAlertsData from '../data/mock-service_alerts.json'
import stopsData from '../data/mock-stops.json'
import tripOptionsData from '../data/mock-trip_options.json'
import usersData from '../data/mock-users.json'

import { db } from './index'
import { generateAllVehicles } from '../utils/vehicleGenerator'

// Batch size for bulk insertions to avoid SQLite variable limits
const BATCH_SIZE = 100

/**
 * Helper function to chunk an array into smaller batches
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

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
        case 'mock-areas.json':
          return areasData
        case 'mock-constants.json':
          return constantsData
        case 'mock-lines.json':
          return linesData
        case 'mock-profile_preferences.json':
          return profilePreferencesData
        case 'mock-recent_searches.json':
          return recentSearchesData
        case 'mock-saved_routes.json':
          return savedRoutesData
        case 'mock-service_alerts.json':
          return serviceAlertsData
        case 'mock-stops.json':
          return stopsData
        case 'mock-trip_options.json':
          return tripOptionsData
        case 'mock-users.json':
          return usersData
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
  /**
   * Initialize database with mock data
   */
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      // Check if database already has data
      const [userCount, areaCount, stopCount, lineCount] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(users)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(areas)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(stops)
          .execute(),
        db
          .select({ count: sql`count(*)` })
          .from(lines)
          .execute(),
      ])

      if (
        userCount[0]?.count > 0 &&
        areaCount[0]?.count > 0 &&
        stopCount[0]?.count > 0 &&
        lineCount[0]?.count > 0
      ) {
        console.log('Database already initialized with data')
        return { success: true, skipped: true }
      }

      // Clear tables in reverse dependency order
      const clearTables = [
        'DELETE FROM trip_steps',
        'DELETE FROM trip_options',
        'DELETE FROM saved_routes',
        'DELETE FROM recent_searches',
        'DELETE FROM user_preferences',
        'DELETE FROM alert_stops',
        'DELETE FROM alert_lines',
        'DELETE FROM service_alerts',
        'DELETE FROM vehicles',
        'DELETE FROM line_segments',
        'DELETE FROM line_stops',
        'DELETE FROM lines',
        'DELETE FROM stop_platforms',
        'DELETE FROM stops',
        'DELETE FROM areas',
        'DELETE FROM users',
        'DELETE FROM app_constants',
        'DELETE FROM sqlite_sequence',
      ]
      for (const query of clearTables) {
        await db.run(sql.raw(query))
      }

      // Load data from JSON files
      const [
        loadedUsers,
        loadedAreas,
        loadedStops,
        loadedLines,
        loadedAlerts,
        loadedPreferences,
        loadedSearches,
        loadedRoutes,
        loadedTrips,
        loadedConstants,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-areas.json'),
        readJSONFile('mock-stops.json'),
        readJSONFile('mock-lines.json'),
        readJSONFile('mock-service_alerts.json'),
        readJSONFile('mock-profile_preferences.json'),
        readJSONFile('mock-recent_searches.json'),
        readJSONFile('mock-saved_routes.json'),
        readJSONFile('mock-trip_options.json'),
        readJSONFile('mock-constants.json'),
      ])

      // 1. Load users (batch insertion)
      console.log('Loading users...')
      if (loadedUsers.length > 0) {
        const userValues = loadedUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          password: user.password,
          avatar: user.avatar,
          bio: user.bio,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
        }))
        for (const batch of chunkArray(userValues, BATCH_SIZE)) {
          await db.insert(users).values(batch).run()
        }
      }

      // 2. Load areas (batch insertion)
      console.log('Loading areas...')
      if (loadedAreas.length > 0) {
        const areaValues = loadedAreas.map((area: any) => ({
          id: area.id,
          name: area.name,
          description: area.description,
        }))
        for (const batch of chunkArray(areaValues, BATCH_SIZE)) {
          await db.insert(areas).values(batch).run()
        }
      }

      // 3. Load stops (batch insertion)
      console.log('Loading stops...')
      if (loadedStops.length > 0) {
        const stopValues = loadedStops.map((stop: any) => ({
          id: stop.id,
          name: stop.name,
          areaId: stop.areaId,
          description: stop.description,
          latitude: stop.latitude,
          longitude: stop.longitude,
          modesServed: JSON.stringify(stop.modesServed),
          facilities: JSON.stringify(stop.facilities),
          amenities: JSON.stringify(stop.amenities),
          accessibility: JSON.stringify(stop.accessibility),
        }))
        for (const batch of chunkArray(stopValues, BATCH_SIZE)) {
          await db.insert(stops).values(batch).run()
        }

        // Collect all platforms and batch insert
        const allPlatforms: any[] = []
        for (const stop of loadedStops) {
          if (stop.platforms) {
            for (const platform of stop.platforms) {
              allPlatforms.push({
                stopId: stop.id,
                mode: platform.mode,
                latitude: platform.latitude,
                longitude: platform.longitude,
                walkingDistanceMeters: platform.walkingDistanceMeters,
                description: platform.description,
              })
            }
          }
        }
        if (allPlatforms.length > 0) {
          for (const batch of chunkArray(allPlatforms, BATCH_SIZE)) {
            await db.insert(stopPlatforms).values(batch).run()
          }
        }
      }

      // 4. Load lines (batch insertion)
      console.log('Loading lines...')
      if (loadedLines.length > 0) {
        const lineValues = loadedLines.map((line: any) => ({
          id: line.id,
          name: line.name,
          shortName: line.shortName,
          mode: line.mode,
          color: line.color,
          operatingHoursStart: line.operatingHours.start,
          operatingHoursEnd: line.operatingHours.end,
          frequencyMinutes: line.operatingHours.frequencyMinutes,
          status: line.status,
        }))
        for (const batch of chunkArray(lineValues, BATCH_SIZE)) {
          await db.insert(lines).values(batch).run()
        }

        // Collect all line stops and batch insert
        const allLineStops: any[] = []
        for (const line of loadedLines) {
          if (line.stops) {
            for (let i = 0; i < line.stops.length; i++) {
              allLineStops.push({
                lineId: line.id,
                stopId: line.stops[i],
                sequence: i + 1,
              })
            }
          }
        }
        if (allLineStops.length > 0) {
          for (const batch of chunkArray(allLineStops, BATCH_SIZE)) {
            await db.insert(lineStops).values(batch).run()
          }
        }

        // Collect all line segments and batch insert
        const allLineSegments: any[] = []
        for (const line of loadedLines) {
          if (line.segments) {
            for (const segment of line.segments) {
              allLineSegments.push({
                lineId: line.id,
                fromStopId: segment.fromStopId,
                toStopId: segment.toStopId,
                durationMinutes: segment.durationMinutes,
                distanceKm: segment.distanceKm,
                fare: segment.fare,
              })
            }
          }
        }
        if (allLineSegments.length > 0) {
          for (const batch of chunkArray(allLineSegments, BATCH_SIZE)) {
            await db.insert(lineSegments).values(batch).run()
          }
        }
      }

      // 5. Load service alerts (batch insertion)
      console.log('Loading service alerts...')
      if (loadedAlerts.length > 0) {
        const alertValues = loadedAlerts.map((alert: any) => ({
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          icon: alert.icon,
          recommendedAlternatives: alert.recommendedAlternatives ?? null,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt,
          isActive: alert.isActive,
        }))
        for (const batch of chunkArray(alertValues, BATCH_SIZE)) {
          await db.insert(serviceAlerts).values(batch).run()
        }

        // Collect all alert lines and batch insert
        const allAlertLines: any[] = []
        for (const alert of loadedAlerts) {
          if (alert.affectedLines) {
            for (const lineId of alert.affectedLines) {
              allAlertLines.push({
                alertId: alert.id,
                lineId,
              })
            }
          }
        }
        if (allAlertLines.length > 0) {
          for (const batch of chunkArray(allAlertLines, BATCH_SIZE)) {
            await db.insert(alertLines).values(batch).run()
          }
        }

        // Collect all alert stops and batch insert
        const allAlertStops: any[] = []
        for (const alert of loadedAlerts) {
          if (alert.affectedStops) {
            for (const stopId of alert.affectedStops) {
              allAlertStops.push({
                alertId: alert.id,
                stopId,
              })
            }
          }
        }
        if (allAlertStops.length > 0) {
          for (const batch of chunkArray(allAlertStops, BATCH_SIZE)) {
            await db.insert(alertStops).values(batch).run()
          }
        }
      }

      // 6. Load user preferences
      console.log('Loading user preferences...')
      if (loadedPreferences && loadedPreferences.userId) {
        await db
          .insert(userPreferences)
          .values({
            userId: loadedPreferences.userId,
            homeStopId: loadedPreferences.homeStopId,
            workStopId: loadedPreferences.workStopId,
            preferredModes: JSON.stringify(loadedPreferences.preferredModes),
            language: loadedPreferences.language,
            notificationServiceAlerts:
              loadedPreferences.notificationServiceAlerts,
            notificationDepartureReminders:
              loadedPreferences.notificationDepartureReminders,
            notificationArrivals: loadedPreferences.notificationArrivals,
            updatedAt: loadedPreferences.updatedAt,
          })
          .run()
      }

      // 7. Load recent searches (batch insertion)
      console.log('Loading recent searches...')
      if (loadedSearches.length > 0) {
        const searchValues = loadedSearches.map((search: any) => ({
          id: search.id,
          userId: search.userId,
          origin: search.origin,
          destination: search.destination,
          modeFilters: search.modeFilters,
          searchedAt: search.searchedAt,
        }))
        for (const batch of chunkArray(searchValues, BATCH_SIZE)) {
          await db.insert(recentSearches).values(batch).run()
        }
      }

      // 8. Load saved routes (batch insertion)
      console.log('Loading saved routes...')
      if (loadedRoutes.length > 0) {
        const routeValues = loadedRoutes.map((route: any) => ({
          id: route.id,
          userId: route.userId,
          name: route.name,
          originStopId: route.originStopId,
          destinationStopId: route.destinationStopId,
          preferredMode: route.preferredMode,
          remindersEnabled: route.remindersEnabled,
          departureReminderMinutes: route.departureReminderMinutes,
          createdAt: route.createdAt,
          updatedAt: route.updatedAt,
        }))
        for (const batch of chunkArray(routeValues, BATCH_SIZE)) {
          await db.insert(savedRoutes).values(batch).run()
        }
      }

      // 9. Load trip options and steps (batch insertion)
      console.log('Loading trip options...')
      if (loadedTrips.length > 0) {
        const tripValues = loadedTrips.map((trip: any) => ({
          id: trip.id,
          originStopId: trip.originStopId,
          destinationStopId: trip.destinationStopId,
          summary: trip.summary,
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
          totalDurationMinutes: trip.totalDurationMinutes,
          totalFare: trip.totalFare,
          transfers: trip.transfers,
          walkingDistanceMeters: trip.walkingDistanceMeters,
          tags: JSON.stringify(trip.tags),
          createdAt: trip.createdAt,
        }))
        for (const batch of chunkArray(tripValues, BATCH_SIZE)) {
          await db.insert(tripOptions).values(batch).run()
        }

        // Collect all trip steps and batch insert
        const allTripSteps: any[] = []
        for (const trip of loadedTrips) {
          if (trip.steps) {
            for (const step of trip.steps) {
              allTripSteps.push({
                id: step.id,
                tripOptionId: trip.id,
                sequence: step.sequence,
                type: step.type,
                description: step.description,
                durationMinutes: step.durationMinutes,
                distanceMeters: step.distanceMeters,
                lineId: step.lineId,
                fromStopId: step.fromStopId,
                toStopId: step.toStopId,
              })
            }
          }
        }
        if (allTripSteps.length > 0) {
          for (const batch of chunkArray(allTripSteps, BATCH_SIZE)) {
            await db.insert(tripSteps).values(batch).run()
          }
        }
      }

      // 10. Load app constants (batch insertion)
      console.log('Loading app constants...')
      if (loadedConstants) {
        const constantEntries = Object.entries(loadedConstants)
        if (constantEntries.length > 0) {
          const constantValues = constantEntries.map(([key, value]) => ({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedAt: new Date().toISOString(),
          }))
          for (const batch of chunkArray(constantValues, BATCH_SIZE)) {
            await db.insert(appConstants).values(batch).run()
          }
        }
      }

      // 11. Generate and load vehicles (batch insertion)
      console.log('Generating vehicles...')
      const generatedVehicles = generateAllVehicles(loadedLines)

      if (generatedVehicles.length > 0) {
        const vehicleValues = generatedVehicles.map((vehicle: any) => {
          // Extract direction from vehicle number (e.g., "0600-out" -> "out")
          const direction = vehicle.vehicleNumber.includes('-out')
            ? 'out'
            : vehicle.vehicleNumber.includes('-in')
              ? 'in'
              : 'out'

          return {
            id: vehicle.id,
            lineId: vehicle.lineId,
            vehicleNumber: vehicle.vehicleNumber,
            departureTime: vehicle.departureTime,
            direction,
            currentStopId: vehicle.currentStopId,
            currentStopSequence: vehicle.currentStopSequence,
            status: vehicle.status,
            scheduleData: JSON.stringify(vehicle.scheduleData),
            createdAt: new Date().toISOString(),
          }
        })
        for (const batch of chunkArray(vehicleValues, BATCH_SIZE)) {
          await db.insert(vehicles).values(batch).run()
        }
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },

  // ============================================
  // USER MUTATIONS
  // ============================================

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .get()
  },

  softDeleteUser: async (userId: number) => {
    return db
      .update(users)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .get()
  },

  // ============================================
  // USER PREFERENCES MUTATIONS
  // ============================================

  createOrUpdateUserPreferences: async (
    userId: number,
    preferences: {
      homeStopId?: string
      workStopId?: string
      preferredModes?: string[]
      language?: string
      notificationServiceAlerts?: boolean
      notificationDepartureReminders?: boolean
      notificationArrivals?: boolean
    },
  ) => {
    // Check if preferences exist
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get()

    if (existing) {
      // Update existing
      return db
        .update(userPreferences)
        .set({
          ...preferences,
          preferredModes: preferences.preferredModes
            ? JSON.stringify(preferences.preferredModes)
            : undefined,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning()
        .get()
    } else {
      // Create new
      return db
        .insert(userPreferences)
        .values({
          userId,
          homeStopId: preferences.homeStopId || null,
          workStopId: preferences.workStopId || null,
          preferredModes: preferences.preferredModes
            ? JSON.stringify(preferences.preferredModes)
            : JSON.stringify([]),
          language: preferences.language || 'en',
          notificationServiceAlerts:
            preferences.notificationServiceAlerts ?? true,
          notificationDepartureReminders:
            preferences.notificationDepartureReminders ?? true,
          notificationArrivals: preferences.notificationArrivals ?? false,
          updatedAt: new Date().toISOString(),
        })
        .returning()
        .get()
    }
  },

  // ============================================
  // SAVED ROUTES MUTATIONS
  // ============================================

  createSavedRoute: async (routeData: {
    id: string
    userId: number
    name: string
    originStopId: string
    destinationStopId: string
    preferredMode: string
    remindersEnabled?: boolean
    departureReminderMinutes?: number
  }) => {
    return db
      .insert(savedRoutes)
      .values({
        ...routeData,
        remindersEnabled: routeData.remindersEnabled ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  updateSavedRoute: async (
    routeId: string,
    routeData: {
      name?: string
      originStopId?: string
      destinationStopId?: string
      preferredMode?: string
      remindersEnabled?: boolean
      departureReminderMinutes?: number
    },
  ) => {
    return db
      .update(savedRoutes)
      .set({
        ...routeData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(savedRoutes.id, routeId))
      .returning()
      .get()
  },

  deleteSavedRoute: async (routeId: string) => {
    await db.delete(savedRoutes).where(eq(savedRoutes.id, routeId))
    return { success: true }
  },

  // ============================================
  // RECENT SEARCHES MUTATIONS
  // ============================================

  createRecentSearch: async (searchData: {
    id: string
    userId: number
    origin: string
    destination: string
    modeFilters: string[]
  }) => {
    return db
      .insert(recentSearches)
      .values({
        ...searchData,
        modeFilters: searchData.modeFilters,
        searchedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },

  deleteRecentSearch: async (searchId: string) => {
    await db.delete(recentSearches).where(eq(recentSearches.id, searchId))
    return { success: true }
  },

  clearRecentSearches: async (userId: number) => {
    await db.delete(recentSearches).where(eq(recentSearches.userId, userId))
    return { success: true }
  },

  // ============================================
  // SERVICE ALERTS MUTATIONS (Admin)
  // ============================================

  createServiceAlert: async (alertData: {
    id: string
    severity: string
    title: string
    description: string
    icon: string
    recommendedAlternatives?: string[]
    expiresAt?: string
    affectedLineIds?: string[]
    affectedStopIds?: string[]
  }) => {
    // Insert alert
    const alert = await db
      .insert(serviceAlerts)
      .values({
        id: alertData.id,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        icon: alertData.icon,
        recommendedAlternatives: alertData.recommendedAlternatives ?? null,
        createdAt: new Date().toISOString(),
        expiresAt: alertData.expiresAt || null,
        isActive: true,
      })
      .returning()
      .get()

    // Insert affected lines (batch insertion)
    if (alertData.affectedLineIds && alertData.affectedLineIds.length > 0) {
      const lineValues = alertData.affectedLineIds.map(lineId => ({
        alertId: alertData.id,
        lineId,
      }))
      for (const batch of chunkArray(lineValues, BATCH_SIZE)) {
        await db.insert(alertLines).values(batch).run()
      }
    }

    // Insert affected stops (batch insertion)
    if (alertData.affectedStopIds && alertData.affectedStopIds.length > 0) {
      const stopValues = alertData.affectedStopIds.map(stopId => ({
        alertId: alertData.id,
        stopId,
      }))
      for (const batch of chunkArray(stopValues, BATCH_SIZE)) {
        await db.insert(alertStops).values(batch).run()
      }
    }

    return alert
  },

  updateServiceAlert: async (
    alertId: string,
    alertData: {
      severity?: string
      title?: string
      description?: string
      icon?: string
      recommendedAlternatives?: string[]
      expiresAt?: string
      isActive?: boolean
    },
  ) => {
    return db
      .update(serviceAlerts)
      .set({
        ...alertData,
        recommendedAlternatives: alertData.recommendedAlternatives ?? undefined,
      })
      .where(eq(serviceAlerts.id, alertId))
      .returning()
      .get()
  },

  deactivateServiceAlert: async (alertId: string) => {
    return db
      .update(serviceAlerts)
      .set({ isActive: false })
      .where(eq(serviceAlerts.id, alertId))
      .returning()
      .get()
  },

  deleteServiceAlert: async (alertId: string) => {
    // Delete affected lines and stops first
    await db.delete(alertLines).where(eq(alertLines.alertId, alertId))
    await db.delete(alertStops).where(eq(alertStops.alertId, alertId))
    // Delete alert
    await db.delete(serviceAlerts).where(eq(serviceAlerts.id, alertId))
    return { success: true }
  },

  // ============================================
  // TRIP OPTIONS MUTATIONS
  // ============================================

  cacheTripOption: async (tripData: {
    id: string
    originStopId: string
    destinationStopId: string
    summary: string
    departureTime: string
    arrivalTime: string
    totalDurationMinutes: number
    totalFare: number
    transfers: number
    walkingDistanceMeters: number
    tags: string[]
    steps: {
      id: string
      sequence: number
      type: string
      description: string
      durationMinutes: number
      distanceMeters?: number
      lineId?: string
      fromStopId?: string
      toStopId?: string
    }[]
  }) => {
    // Insert trip option
    const trip = await db
      .insert(tripOptions)
      .values({
        id: tripData.id,
        originStopId: tripData.originStopId,
        destinationStopId: tripData.destinationStopId,
        summary: tripData.summary,
        departureTime: tripData.departureTime,
        arrivalTime: tripData.arrivalTime,
        totalDurationMinutes: tripData.totalDurationMinutes,
        totalFare: tripData.totalFare,
        transfers: tripData.transfers,
        walkingDistanceMeters: tripData.walkingDistanceMeters,
        tags: JSON.stringify(tripData.tags),
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get()

    // Insert steps (batch insertion)
    if (tripData.steps.length > 0) {
      const stepValues = tripData.steps.map(step => ({
        id: step.id,
        tripOptionId: tripData.id,
        sequence: step.sequence,
        type: step.type,
        description: step.description,
        durationMinutes: step.durationMinutes,
        distanceMeters: step.distanceMeters || null,
        lineId: step.lineId || null,
        fromStopId: step.fromStopId || null,
        toStopId: step.toStopId || null,
      }))
      for (const batch of chunkArray(stepValues, BATCH_SIZE)) {
        await db.insert(tripSteps).values(batch).run()
      }
    }

    return trip
  },

  clearOldTripOptions: async (olderThanDays: number = 7) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffISO = cutoffDate.toISOString()

    // Delete old trip steps first
    await db.run(sql`
      DELETE FROM trip_steps
      WHERE trip_option_id IN (
        SELECT id FROM trip_options
        WHERE created_at < ${cutoffISO}
      )
    `)

    // Delete old trip options
    await db.run(sql`
      DELETE FROM trip_options
      WHERE created_at < ${cutoffISO}
    `)

    return { success: true }
  },

  // ============================================
  // APP CONSTANTS MUTATIONS
  // ============================================

  setAppConstant: async (key: string, value: string) => {
    const existing = await db
      .select()
      .from(appConstants)
      .where(eq(appConstants.key, key))
      .get()

    if (existing) {
      return db
        .update(appConstants)
        .set({
          value,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(appConstants.key, key))
        .returning()
        .get()
    } else {
      return db
        .insert(appConstants)
        .values({
          key,
          value,
          updatedAt: new Date().toISOString(),
        })
        .returning()
        .get()
    }
  },

  /**
   * Save a route to user's saved routes
   */
  async saveRoute(data: {
    userId: number
    name: string
    origin: string
    destination: string
    preferredMode: string
  }) {
    // Get stop IDs from queries
    const { queries } = await import('./queries')
    const originStop = await queries.getStopByName(data.origin)
    const destinationStop = await queries.getStopByName(data.destination)

    if (!originStop || !destinationStop) {
      throw new Error('Invalid origin or destination stop')
    }

    const routeId = `saved-${Date.now()}`

    return db
      .insert(savedRoutes)
      .values({
        id: routeId,
        userId: data.userId,
        name: data.name,
        originStopId: originStop.id,
        destinationStopId: destinationStop.id,
        preferredMode: data.preferredMode,
        remindersEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()
  },
}
