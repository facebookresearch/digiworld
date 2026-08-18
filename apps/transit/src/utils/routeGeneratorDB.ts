/**
 * Route Generator Utility (Database-Driven)
 * Clean implementation for generating transit routes using real vehicle schedules
 */

import { queries } from '../db/queries'

// ============================================
// TYPES
// ============================================

export interface TransitMode {
  type: 'bus' | 'train' | 'subway' | 'tram' | 'walk'
  lineNumber?: string
  lineName?: string
  color?: string
}

export interface RouteSegment {
  id: string
  mode: TransitMode
  from: string
  to: string
  departureTime: string
  arrivalTime: string
  duration: number // in minutes
  distance: number // in kilometers
  fare: number
  stops?: string[]
  lineId?: string
  fromStopId?: string
  toStopId?: string
}

export interface Route {
  id: string
  segments: RouteSegment[]
  totalDuration: number // in minutes
  totalFare: number
  totalDistance: number
  transferCount: number
  departureTime: string
  arrivalTime: string
  routeType: 'fastest' | 'cheapest' | 'balanced'
  hasDelay?: boolean
  delayMinutes?: number
}

export interface RouteGenerationOptions {
  origin: string
  destination: string
  departureTime?: string // "HH:MM" format (24-hour)
  timeMode: 'depart' | 'arrive'
  selectedModes: string[] // ['all', 'bus', 'metro', 'tram']
  maxTransfers?: number
}

// ============================================
// TIME UTILITIES
// ============================================

function timeToMinutes(time: string): number {
  // Handle both 24-hour ("15:32") and 12-hour ("3:32 PM") formats
  const trimmed = time.trim().toUpperCase()

  // Check for AM/PM format
  const isPM = trimmed.includes('PM')
  const isAM = trimmed.includes('AM')

  // Remove AM/PM suffix
  const cleanTime = trimmed.replace(/\s*(AM|PM)\s*/gi, '').trim()
  const [hoursStr, minutesStr] = cleanTime.split(':')

  let hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)

  // Convert 12-hour to 24-hour
  if (isPM && hours !== 12) {
    hours += 12
  } else if (isAM && hours === 12) {
    hours = 0
  }

  return hours * 60 + (isNaN(minutes) ? 0 : minutes)
}

function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalizedMinutes / 60)
  const mins = normalizedMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function addMinutes(time: string, minutesToAdd: number): string {
  return minutesToTime(timeToMinutes(time) + minutesToAdd)
}

function getCurrentTime(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// ============================================
// MODE MAPPING
// ============================================

function mapDbModeToType(
  dbMode: string,
): 'bus' | 'train' | 'subway' | 'tram' | 'walk' {
  const mode = dbMode.toLowerCase()
  if (mode === 'train') return 'train'
  if (mode === 'subway') return 'subway'
  if (mode === 'bus') return 'bus'
  if (mode === 'tram') return 'tram'
  return 'bus'
}

function isModeAllowed(lineMode: string, selectedModes: string[]): boolean {
  if (selectedModes.includes('all')) return true

  const mappedLineMode = mapDbModeToType(lineMode)

  // Direct comparison - train, subway, bus, tram are all separate modes
  return selectedModes.map(m => m.toLowerCase()).includes(mappedLineMode)
}

// ============================================
// STOP FINDER
// ============================================

async function findStopsByName(name: string): Promise<any[]> {
  try {
    const result = await queries.searchTransit(name)
    return result?.stops || []
  } catch (error) {
    // Silent error handling for stop search
    return []
  }
}

// ============================================
// LINE FINDER - Find lines connecting two stops
// ============================================

interface LineConnection {
  line: any
  originStopId: string
  destStopId: string
  originSequence: number
  destSequence: number
  direction: 'forward' | 'backward'
}

async function findLinesConnectingStops(
  originStops: any[],
  destStops: any[],
  selectedModes: string[],
): Promise<LineConnection[]> {
  const connections: LineConnection[] = []

  try {
    const allLines = await queries.getAllLines()

    for (const line of allLines) {
      // Filter by mode
      if (!isModeAllowed(line.mode, selectedModes)) continue

      // Get all stops on this line
      const lineStops = await queries.getStopsByLine(line.id)
      const stopIdToSequence = new Map(
        lineStops.map((s: any) => [s.id, s.sequence]),
      )

      // Check if any origin stop and any destination stop are on this line
      for (const originStop of originStops) {
        const originSeq = stopIdToSequence.get(originStop.id)
        if (originSeq === undefined || originSeq === null) continue

        for (const destStop of destStops) {
          const destSeq = stopIdToSequence.get(destStop.id)
          if (destSeq === undefined || destSeq === null) continue

          // Skip if same stop
          if (originStop.id === destStop.id) continue

          // Determine direction
          const direction =
            (destSeq as number) > (originSeq as number) ? 'forward' : 'backward'

          connections.push({
            line,
            originStopId: originStop.id,
            destStopId: destStop.id,
            originSequence: originSeq as number,
            destSequence: destSeq as number,
            direction,
          })
        }
      }
    }
  } catch (error) {
    // Silent error handling for line connections
  }

  return connections
}

// ============================================
// VEHICLE FINDER - Find vehicles on a line at a time
// ============================================

interface VehicleOption {
  vehicle: any
  departureFromOrigin: string
  arrivalAtDest: string
  waitTime: number
  travelTime: number
}

async function findVehiclesOnLine(
  lineId: string,
  originStopId: string,
  destStopId: string,
  requestedTime: string,
  direction: 'forward' | 'backward',
  limit: number = 5,
): Promise<VehicleOption[]> {
  const options: VehicleOption[] = []
  const requestedMinutes = timeToMinutes(requestedTime)

  try {
    const vehicles = await queries.getVehiclesByLine(lineId)

    // Map direction to vehicle direction field
    const vehicleDirection = direction === 'forward' ? 'out' : 'in'

    for (const vehicle of vehicles) {
      // Filter by direction
      if (vehicle.direction !== vehicleDirection) continue

      const schedule = vehicle.scheduleData as {
        stopId: string
        arrivalTime: string
        sequence: number
      }[]

      // Find origin and destination in schedule
      const originSchedule = schedule.find(s => s.stopId === originStopId)
      const destSchedule = schedule.find(s => s.stopId === destStopId)

      if (!originSchedule || !destSchedule) continue

      // Check sequence order (must go from origin to destination)
      if (destSchedule.sequence <= originSchedule.sequence) continue

      // Check if vehicle departs from origin at or after requested time
      const departureMinutes = timeToMinutes(originSchedule.arrivalTime)

      // Consider vehicles departing within the next 2 hours
      if (
        departureMinutes >= requestedMinutes &&
        departureMinutes < requestedMinutes + 120
      ) {
        const waitTime = departureMinutes - requestedMinutes
        const travelTime =
          timeToMinutes(destSchedule.arrivalTime) - departureMinutes

        options.push({
          vehicle,
          departureFromOrigin: originSchedule.arrivalTime,
          arrivalAtDest: destSchedule.arrivalTime,
          waitTime,
          travelTime,
        })
      }
    }

    // Sort by departure time
    options.sort(
      (a, b) =>
        timeToMinutes(a.departureFromOrigin) -
        timeToMinutes(b.departureFromOrigin),
    )
  } catch (error) {
    // Silent error handling for vehicle search
  }

  return options.slice(0, limit)
}

// ============================================
// ROUTE BUILDER - Create route from vehicle
// ============================================

function createWalkingSegment(
  from: string,
  to: string,
  startTime: string,
  duration: number,
  fromStopId?: string,
  toStopId?: string,
): RouteSegment {
  return {
    id: `walk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    mode: { type: 'walk' },
    from,
    to,
    departureTime: startTime,
    arrivalTime: addMinutes(startTime, duration),
    duration,
    distance: (duration / 60) * 5, // 5 km/h walking speed
    fare: 0,
    fromStopId,
    toStopId,
  }
}

async function buildDirectRoute(
  connection: LineConnection,
  vehicleOption: VehicleOption,
  originStopName: string,
  destStopName: string,
  requestedTime: string,
): Promise<Route | null> {
  try {
    // Get fare and distance info
    const routeInfo = await queries.calculateRouteOnLine(
      connection.line.id,
      connection.originStopId,
      connection.destStopId,
    )

    const segments: RouteSegment[] = []
    let currentTime = requestedTime

    // 1. Walk to origin stop (3 min default)
    const walkToOrigin = createWalkingSegment(
      'Starting Point',
      originStopName,
      currentTime,
      3,
      undefined,
      connection.originStopId,
    )
    segments.push(walkToOrigin)
    currentTime = walkToOrigin.arrivalTime

    // 2. Transit segment
    const transitSegment: RouteSegment = {
      id: `transit-${connection.line.id}-${vehicleOption.vehicle.id}`,
      mode: {
        type: mapDbModeToType(connection.line.mode),
        lineNumber: connection.line.shortName,
        lineName: connection.line.name,
        color: connection.line.color,
      },
      from: originStopName,
      to: destStopName,
      departureTime: vehicleOption.departureFromOrigin,
      arrivalTime: vehicleOption.arrivalAtDest,
      duration: vehicleOption.travelTime,
      distance: routeInfo?.totalDistanceKm || 5,
      fare: routeInfo?.totalFare || 2.5,
      lineId: connection.line.id,
      fromStopId: connection.originStopId,
      toStopId: connection.destStopId,
    }
    segments.push(transitSegment)
    currentTime = vehicleOption.arrivalAtDest

    // 3. Walk to destination (3 min default)
    const walkToDest = createWalkingSegment(
      destStopName,
      'Destination',
      currentTime,
      3,
      connection.destStopId,
      undefined,
    )
    segments.push(walkToDest)

    // Calculate totals
    const departureTime = segments[0].departureTime
    const arrivalTime = segments[segments.length - 1].arrivalTime
    const totalDuration =
      timeToMinutes(arrivalTime) - timeToMinutes(departureTime)
    const totalFare = segments.reduce((sum, s) => sum + s.fare, 0)
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0)

    return {
      id: `route-${connection.line.id}-${vehicleOption.vehicle.id}-${Date.now()}`,
      segments,
      totalDuration,
      totalFare: Math.round(totalFare * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      transferCount: 0,
      departureTime,
      arrivalTime,
      routeType: 'balanced',
      hasDelay: connection.line.status === 'delayed',
      delayMinutes:
        connection.line.status === 'delayed'
          ? Math.floor(Math.random() * 10) + 3
          : 0,
    }
  } catch (error) {
    // Silent error handling for route building
    return null
  }
}

// ============================================
// TRANSFER ROUTE FINDER - Find Bus → Train, etc.
// ============================================

async function findTransferRoutes(
  originStops: any[],
  destStops: any[],
  requestedTime: string,
  selectedModes: string[],
  maxRoutes: number = 8,
): Promise<Route[]> {
  const routes: Route[] = []
  const checkedCombinations = new Set<string>()

  try {
    // STEP 1: Find all lines that pass through ANY origin stop
    const linesFromOrigin: {
      line: any
      originStopId: string
      originStopName: string
      allStops: any[]
    }[] = []

    for (const originStop of originStops) {
      const linesAtOrigin = await queries.getLinesByStop(originStop.id)
      for (const line of linesAtOrigin) {
        if (!isModeAllowed(line.mode, selectedModes)) {
          continue
        }
        const allStops = await queries.getStopsByLine(line.id)
        linesFromOrigin.push({
          line,
          originStopId: originStop.id,
          originStopName: originStop.name,
          allStops,
        })
      }
    }

    // STEP 2: Find all lines that pass through ANY destination stop
    const linesToDest: {
      line: any
      destStopId: string
      destStopName: string
      allStops: any[]
    }[] = []

    for (const destStop of destStops) {
      const linesAtDest = await queries.getLinesByStop(destStop.id)
      for (const line of linesAtDest) {
        if (!isModeAllowed(line.mode, selectedModes)) {
          continue
        }
        const allStops = await queries.getStopsByLine(line.id)
        linesToDest.push({
          line,
          destStopId: destStop.id,
          destStopName: destStop.name,
          allStops,
        })
      }
    }

    // STEP 3: For each pair of lines, find transfer points
    for (const fromLine of linesFromOrigin) {
      if (routes.length >= maxRoutes) break

      for (const toLine of linesToDest) {
        if (routes.length >= maxRoutes) break

        // Skip if same line (that's a direct route)
        if (fromLine.line.id === toLine.line.id) continue

        // Skip if already checked this combination
        const comboKey = `${fromLine.line.id}-${toLine.line.id}`
        if (checkedCombinations.has(comboKey)) continue
        checkedCombinations.add(comboKey)

        // Find common stops between the two lines (transfer points)
        const transferPoints = fromLine.allStops.filter((s1: any) =>
          toLine.allStops.some((s2: any) => s2.id === s1.id),
        )

        if (transferPoints.length === 0) {
          // No direct transfer points - could add walking transfer here later
          continue
        }

        // Try each transfer point
        for (const transferStop of transferPoints.slice(0, 3)) {
          if (routes.length >= maxRoutes) break

          // Get sequence numbers
          const originSeq = fromLine.allStops.find(
            (s: any) => s.id === fromLine.originStopId,
          )?.sequence
          const transferSeq1 = fromLine.allStops.find(
            (s: any) => s.id === transferStop.id,
          )?.sequence
          const transferSeq2 = toLine.allStops.find(
            (s: any) => s.id === transferStop.id,
          )?.sequence
          const destSeq = toLine.allStops.find(
            (s: any) => s.id === toLine.destStopId,
          )?.sequence

          if (
            originSeq === undefined ||
            transferSeq1 === undefined ||
            transferSeq2 === undefined ||
            destSeq === undefined
          ) {
            continue
          }

          // Skip if origin and transfer are same or dest and transfer are same
          if (fromLine.originStopId === transferStop.id) continue
          if (toLine.destStopId === transferStop.id) continue

          // Determine directions
          const direction1 = transferSeq1 > originSeq ? 'forward' : 'backward'
          const direction2 = destSeq > transferSeq2 ? 'forward' : 'backward'

          // Find vehicles for first leg
          const vehicles1 = await findVehiclesOnLine(
            fromLine.line.id,
            fromLine.originStopId,
            transferStop.id,
            requestedTime,
            direction1,
            3,
          )

          if (vehicles1.length === 0) {
            continue
          }

          // Try each vehicle for first leg
          for (const firstVehicle of vehicles1.slice(0, 2)) {
            if (routes.length >= maxRoutes) break

            const transferTime = addMinutes(firstVehicle.arrivalAtDest, 5)

            // Find vehicles for second leg
            const vehicles2 = await findVehiclesOnLine(
              toLine.line.id,
              transferStop.id,
              toLine.destStopId,
              transferTime,
              direction2,
              3,
            )

            if (vehicles2.length === 0) {
              continue
            }

            const secondVehicle = vehicles2[0]

            // Build the route
            const route = await buildTransferRoute(
              fromLine.line,
              toLine.line,
              fromLine.originStopId,
              transferStop,
              toLine.destStopId,
              firstVehicle,
              secondVehicle,
              requestedTime,
              fromLine.originStopName,
              toLine.destStopName,
            )

            if (route) {
              routes.push(route)
            }
          }
        }
      }
    }

    // STEP 4: Alternative search - find transfers via ANY hub
    // This finds Bus → Train when bus doesn't directly serve origin/dest
    if (routes.length < maxRoutes) {
      // For each line from origin, get ALL its stops as potential transfer points
      for (const fromLine of linesFromOrigin) {
        if (routes.length >= maxRoutes) break

        // Look at each stop on this line as a potential transfer point
        for (const intermediateStop of fromLine.allStops) {
          if (routes.length >= maxRoutes) break

          // Skip if it's the origin stop
          if (intermediateStop.id === fromLine.originStopId) continue

          // Get all lines at this intermediate stop
          const linesAtIntermediate = await queries.getLinesByStop(
            intermediateStop.id,
          )

          // Check if any of these lines can reach the destination
          for (const intermediateLine of linesAtIntermediate) {
            if (routes.length >= maxRoutes) break

            // Skip same line
            if (intermediateLine.id === fromLine.line.id) continue
            if (!isModeAllowed(intermediateLine.mode, selectedModes)) continue

            // Already checked this combo?
            const comboKey = `${fromLine.line.id}-${intermediateLine.id}-${intermediateStop.id}`
            if (checkedCombinations.has(comboKey)) continue
            checkedCombinations.add(comboKey)

            // Check if this line reaches any destination stop
            const intermediateLineStops = await queries.getStopsByLine(
              intermediateLine.id,
            )

            for (const destStop of destStops) {
              if (routes.length >= maxRoutes) break

              const reachesDest = intermediateLineStops.some(
                (s: any) => s.id === destStop.id,
              )
              if (!reachesDest) continue

              // Found a path: origin → intermediate → dest via different line
              // Check sequences for validity
              const originSeq = fromLine.allStops.find(
                (s: any) => s.id === fromLine.originStopId,
              )?.sequence
              const transferSeq1 = fromLine.allStops.find(
                (s: any) => s.id === intermediateStop.id,
              )?.sequence
              const transferSeq2 = intermediateLineStops.find(
                (s: any) => s.id === intermediateStop.id,
              )?.sequence
              const destSeq = intermediateLineStops.find(
                (s: any) => s.id === destStop.id,
              )?.sequence

              if (
                originSeq === undefined ||
                transferSeq1 === undefined ||
                transferSeq2 === undefined ||
                destSeq === undefined
              ) {
                continue
              }
              if (intermediateStop.id === destStop.id) continue

              const direction1 =
                transferSeq1 > originSeq ? 'forward' : 'backward'
              const direction2 = destSeq > transferSeq2 ? 'forward' : 'backward'

              // Find vehicles
              const vehicles1 = await findVehiclesOnLine(
                fromLine.line.id,
                fromLine.originStopId,
                intermediateStop.id,
                requestedTime,
                direction1,
                2,
              )
              if (vehicles1.length === 0) continue

              const firstVehicle = vehicles1[0]
              const transferTime = addMinutes(firstVehicle.arrivalAtDest, 5)

              const vehicles2 = await findVehiclesOnLine(
                intermediateLine.id,
                intermediateStop.id,
                destStop.id,
                transferTime,
                direction2,
                2,
              )
              if (vehicles2.length === 0) continue

              const route = await buildTransferRoute(
                fromLine.line,
                intermediateLine,
                fromLine.originStopId,
                intermediateStop,
                destStop.id,
                firstVehicle,
                vehicles2[0],
                requestedTime,
                fromLine.originStopName,
                destStop.name,
              )

              if (route) {
                routes.push(route)
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Silent error handling for transfer routes
  }

  return routes
}

async function buildTransferRoute(
  line1: any,
  line2: any,
  originStopId: string,
  transferStop: any,
  destStopId: string,
  vehicle1: VehicleOption,
  vehicle2: VehicleOption,
  requestedTime: string,
  originName: string,
  destName: string,
): Promise<Route | null> {
  try {
    const segments: RouteSegment[] = []
    const currentTime = requestedTime

    // Get route info for both legs
    const leg1Info = await queries.calculateRouteOnLine(
      line1.id,
      originStopId,
      transferStop.id,
    )
    const leg2Info = await queries.calculateRouteOnLine(
      line2.id,
      transferStop.id,
      destStopId,
    )

    // 1. Walk to origin
    const walkToOrigin = createWalkingSegment(
      'Starting Point',
      originName,
      currentTime,
      3,
    )
    segments.push(walkToOrigin)

    // 2. First transit leg
    const transit1: RouteSegment = {
      id: `transit-${line1.id}-${vehicle1.vehicle.id}`,
      mode: {
        type: mapDbModeToType(line1.mode),
        lineNumber: line1.shortName,
        lineName: line1.name,
        color: line1.color,
      },
      from: originName,
      to: transferStop.name,
      departureTime: vehicle1.departureFromOrigin,
      arrivalTime: vehicle1.arrivalAtDest,
      duration: vehicle1.travelTime,
      distance: leg1Info?.totalDistanceKm || 3,
      fare: leg1Info?.totalFare || 2,
      lineId: line1.id,
      fromStopId: originStopId,
      toStopId: transferStop.id,
    }
    segments.push(transit1)

    // 3. Transfer walk
    const transferWalk = createWalkingSegment(
      transferStop.name,
      transferStop.name,
      vehicle1.arrivalAtDest,
      5,
      transferStop.id,
      transferStop.id,
    )
    segments.push(transferWalk)

    // 4. Second transit leg
    const transit2: RouteSegment = {
      id: `transit-${line2.id}-${vehicle2.vehicle.id}`,
      mode: {
        type: mapDbModeToType(line2.mode),
        lineNumber: line2.shortName,
        lineName: line2.name,
        color: line2.color,
      },
      from: transferStop.name,
      to: destName,
      departureTime: vehicle2.departureFromOrigin,
      arrivalTime: vehicle2.arrivalAtDest,
      duration: vehicle2.travelTime,
      distance: leg2Info?.totalDistanceKm || 3,
      fare: leg2Info?.totalFare || 2,
      lineId: line2.id,
      fromStopId: transferStop.id,
      toStopId: destStopId,
    }
    segments.push(transit2)

    // 5. Walk to destination
    const walkToDest = createWalkingSegment(
      destName,
      'Destination',
      vehicle2.arrivalAtDest,
      3,
    )
    segments.push(walkToDest)

    // Calculate totals
    const departureTime = segments[0].departureTime
    const arrivalTime = segments[segments.length - 1].arrivalTime
    const totalDuration =
      timeToMinutes(arrivalTime) - timeToMinutes(departureTime)
    const totalFare = segments.reduce((sum, s) => sum + s.fare, 0)
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0)

    return {
      id: `route-transfer-${line1.id}-${line2.id}-${Date.now()}`,
      segments,
      totalDuration,
      totalFare: Math.round(totalFare * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      transferCount: 1,
      departureTime,
      arrivalTime,
      routeType: 'balanced',
    }
  } catch (error) {
    // Silent error handling for transfer route building
    return null
  }
}

// ============================================
// MAIN ROUTE GENERATOR
// ============================================

export async function generateRouteOptions(
  options: RouteGenerationOptions,
): Promise<Route[]> {
  const routes: Route[] = []
  const requestedTime = options.departureTime || getCurrentTime()

  try {
    // Step 1: Find origin and destination stops
    const originStops = await findStopsByName(options.origin)
    const destStops = await findStopsByName(options.destination)

    if (originStops.length === 0 || destStops.length === 0) {
      return []
    }

    // Step 2: Find all lines connecting origin to destination (direct routes)
    const connections = await findLinesConnectingStops(
      originStops,
      destStops,
      options.selectedModes,
    )

    // Step 3: For each connection, find available vehicles
    for (const connection of connections) {
      const vehicles = await findVehiclesOnLine(
        connection.line.id,
        connection.originStopId,
        connection.destStopId,
        requestedTime,
        connection.direction === 'forward' ? 'forward' : 'backward',
        3, // Get up to 3 vehicles per line
      )

      const originStop = originStops.find(s => s.id === connection.originStopId)
      const destStop = destStops.find(s => s.id === connection.destStopId)

      // Step 4: Build routes for each vehicle
      for (const vehicleOption of vehicles) {
        const route = await buildDirectRoute(
          connection,
          vehicleOption,
          originStop?.name || connection.originStopId,
          destStop?.name || connection.destStopId,
          requestedTime,
        )

        if (route) {
          routes.push(route)
        }
      }
    }

    // Step 5: ALWAYS find transfer routes to show all options (Bus → Train, etc.)
    const transferRoutes = await findTransferRoutes(
      originStops,
      destStops,
      requestedTime,
      options.selectedModes,
      10, // Get up to 10 transfer routes
    )
    routes.push(...transferRoutes)

    // Step 6: Sort and categorize routes
    routes.sort((a, b) => {
      // Primary sort: departure time
      const timeDiff =
        timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime)
      if (timeDiff !== 0) return timeDiff
      // Secondary sort: duration
      return a.totalDuration - b.totalDuration
    })

    // Categorize routes
    if (routes.length > 0) {
      const fastestDuration = Math.min(...routes.map(r => r.totalDuration))
      const cheapestFare = Math.min(...routes.map(r => r.totalFare))

      routes.forEach(route => {
        if (route.totalDuration === fastestDuration) {
          route.routeType = 'fastest'
        } else if (route.totalFare === cheapestFare) {
          route.routeType = 'cheapest'
        } else {
          route.routeType = 'balanced'
        }
      })
    }

    // Remove duplicates (same line, similar departure time)
    const uniqueRoutes = routes.filter((route, index, self) => {
      return !self.slice(0, index).some(other => {
        const sameLines =
          route.segments
            .filter(s => s.mode.type !== 'walk')
            .map(s => s.lineId)
            .join('-') ===
          other.segments
            .filter(s => s.mode.type !== 'walk')
            .map(s => s.lineId)
            .join('-')
        const similarTime =
          Math.abs(
            timeToMinutes(route.departureTime) -
              timeToMinutes(other.departureTime),
          ) < 5
        return sameLines && similarTime
      })
    })

    return uniqueRoutes.slice(0, 10)
  } catch (error) {
    return []
  }
}

// ============================================
// FILTER AND SUMMARY UTILITIES
// ============================================

export function filterRoutes(
  routes: Route[],
  filterType: 'fastest' | 'cheapest' | 'fewest-transfers' | 'direct',
): Route[] {
  const sorted = [...routes]

  switch (filterType) {
    case 'fastest':
      return sorted.sort((a, b) => a.totalDuration - b.totalDuration)
    case 'cheapest':
      return sorted.sort((a, b) => a.totalFare - b.totalFare)
    case 'fewest-transfers':
      // Sort by transfer count (ascending), then by duration
      return sorted.sort((a, b) => {
        if (a.transferCount !== b.transferCount) {
          return a.transferCount - b.transferCount
        }
        return a.totalDuration - b.totalDuration
      })
    case 'direct':
      // Filter to only show direct routes (0 transfers), sorted by duration
      return sorted
        .filter(route => route.transferCount === 0)
        .sort((a, b) => a.totalDuration - b.totalDuration)
    default:
      return sorted
  }
}

export function getRouteSummary(route: Route): {
  timeRange: string
  duration: string
  fare: string
  transfers: string
  modes: TransitMode[]
} {
  const modes = route.segments
    .filter(seg => seg.mode.type !== 'walk')
    .map(seg => seg.mode)

  const hours = Math.floor(route.totalDuration / 60)
  const mins = route.totalDuration % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`

  const transferStr =
    route.transferCount === 0
      ? 'Direct'
      : route.transferCount === 1
        ? '1 Transfer'
        : `${route.transferCount} Transfers`

  return {
    timeRange: `${route.departureTime} - ${route.arrivalTime}`,
    duration: durationStr,
    fare: `$${route.totalFare.toFixed(2)}`,
    transfers: transferStr,
    modes,
  }
}

// Legacy function for backward compatibility
export async function generateRoutes(
  originStopId: string,
  destinationStopId: string,
  departureTime: string,
  selectedModes: string[],
): Promise<Route[]> {
  try {
    const originStop = await queries.getStopById(originStopId)
    const destStop = await queries.getStopById(destinationStopId)

    if (!originStop || !destStop) {
      // Could not find stops by ID
      return []
    }

    return generateRouteOptions({
      origin: originStop.name,
      destination: destStop.name,
      departureTime,
      timeMode: 'depart',
      selectedModes,
    })
  } catch (error) {
    // Silent error handling for route generation
    return []
  }
}
