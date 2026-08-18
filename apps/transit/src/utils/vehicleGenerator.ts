/**
 * Vehicle Generator Utility
 * Generates vehicles for transit lines based on operating hours and frequency
 */

interface LineSegment {
  fromStopId: string
  toStopId: string
  durationMinutes: number
  distanceKm: number
  fare: number
}

interface LineData {
  id: string
  name: string
  shortName: string
  mode: string
  operatingHours: {
    start: string // "HH:MM"
    end: string // "HH:MM"
    frequencyMinutes: number
  }
  stops: string[]
  segments: LineSegment[]
}

interface VehicleScheduleStop {
  stopId: string
  arrivalTime: string // "HH:MM"
  sequence: number
}

interface Vehicle {
  id: string // e.g., "B3-0600-out" or "B3-0600-in"
  lineId: string
  vehicleNumber: string // e.g., "0600-out" or "0600-in"
  departureTime: string // "HH:MM"
  currentStopId: string
  currentStopSequence: number
  status: string
  scheduleData: VehicleScheduleStop[]
}

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to "HH:MM" format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Generate schedule for a single vehicle
 */
function generateVehicleSchedule(
  line: LineData,
  departureMinutes: number,
): VehicleScheduleStop[] {
  const schedule: VehicleScheduleStop[] = []
  let currentTime = departureMinutes

  // First stop - departure time
  schedule.push({
    stopId: line.stops[0],
    arrivalTime: minutesToTime(currentTime),
    sequence: 1,
  })

  // Calculate arrival times for subsequent stops
  for (let i = 0; i < line.segments.length; i++) {
    const segment = line.segments[i]
    currentTime += segment.durationMinutes

    schedule.push({
      stopId: segment.toStopId,
      arrivalTime: minutesToTime(currentTime),
      sequence: i + 2,
    })
  }

  return schedule
}

/**
 * Generate schedule for a vehicle in reverse direction
 */
function generateReverseVehicleSchedule(
  line: LineData,
  departureMinutes: number,
): VehicleScheduleStop[] {
  const schedule: VehicleScheduleStop[] = []
  let currentTime = departureMinutes

  // Start from last stop
  const reversedStops = [...line.stops].reverse()
  const reversedSegments = [...line.segments].reverse()

  // First stop - departure time
  schedule.push({
    stopId: reversedStops[0],
    arrivalTime: minutesToTime(currentTime),
    sequence: 1,
  })

  // Calculate arrival times for subsequent stops using reversed segments
  for (let i = 0; i < reversedSegments.length; i++) {
    const segment = reversedSegments[i]
    currentTime += segment.durationMinutes

    schedule.push({
      stopId: segment.fromStopId, // In reverse, we go TO the fromStop
      arrivalTime: minutesToTime(currentTime),
      sequence: i + 2,
    })
  }

  return schedule
}

/**
 * Generate all vehicles for a line based on operating hours and frequency
 * Creates vehicles in both directions (outbound and inbound)
 * Outbound vehicles start 5 minutes after the operating hours start time
 */
export function generateVehiclesForLine(line: LineData): Vehicle[] {
  const vehicles: Vehicle[] = []

  const startMinutes = timeToMinutes(line.operatingHours.start)
  const endMinutes = timeToMinutes(line.operatingHours.end)
  const frequency = line.operatingHours.frequencyMinutes

  // Handle overnight operations (end time is next day)
  const actualEndMinutes =
    endMinutes < startMinutes ? endMinutes + 1440 : endMinutes

  // Start inbound vehicles at operating start time
  // Start outbound vehicles 5 minutes later
  const inboundDepartureMinutes = startMinutes
  const outboundDepartureMinutes = startMinutes + 5

  // Generate inbound and outbound vehicles alternately
  let nextInbound = inboundDepartureMinutes
  let nextOutbound = outboundDepartureMinutes

  while (nextInbound <= actualEndMinutes || nextOutbound <= actualEndMinutes) {
    // Add inbound vehicle if within operating hours
    if (nextInbound <= actualEndMinutes) {
      const departureTime = minutesToTime(nextInbound)
      const vehicleNumber = departureTime.replace(':', '')
      const vehicleId = `${line.shortName}-${vehicleNumber}-in`

      const schedule = generateReverseVehicleSchedule(line, nextInbound)
      const currentStopId = line.stops[line.stops.length - 1]

      vehicles.push({
        id: vehicleId,
        lineId: line.id,
        vehicleNumber: `${vehicleNumber}-in`,
        departureTime,
        currentStopId,
        currentStopSequence: 1,
        status: 'active',
        scheduleData: schedule,
      })

      nextInbound += frequency
    }

    // Add outbound vehicle if within operating hours
    if (nextOutbound <= actualEndMinutes) {
      const departureTime = minutesToTime(nextOutbound)
      const vehicleNumber = departureTime.replace(':', '')
      const vehicleId = `${line.shortName}-${vehicleNumber}-out`

      const schedule = generateVehicleSchedule(line, nextOutbound)
      const currentStopId = line.stops[0]

      vehicles.push({
        id: vehicleId,
        lineId: line.id,
        vehicleNumber: `${vehicleNumber}-out`,
        departureTime,
        currentStopId,
        currentStopSequence: 1,
        status: 'active',
        scheduleData: schedule,
      })

      nextOutbound += frequency
    }
  }

  // Sort vehicles by departure time for better organization
  vehicles.sort((a, b) => {
    const timeA = timeToMinutes(a.departureTime)
    const timeB = timeToMinutes(b.departureTime)
    return timeA - timeB
  })

  return vehicles
}

/**
 * Generate vehicles for all lines
 */
export function generateAllVehicles(lines: LineData[]): Vehicle[] {
  const allVehicles: Vehicle[] = []

  for (const line of lines) {
    const lineVehicles = generateVehiclesForLine(line)
    allVehicles.push(...lineVehicles)
  }

  return allVehicles
}

/**
 * Get current vehicles that should be running at a given time
 */
export function getActiveVehiclesAtTime(
  vehicles: Vehicle[],
  currentTime: string,
): Vehicle[] {
  const currentMinutes = timeToMinutes(currentTime)

  return vehicles.filter(vehicle => {
    const schedule = vehicle.scheduleData
    if (schedule.length === 0) return false

    const firstStopTime = timeToMinutes(schedule[0].arrivalTime)
    const lastStopTime = timeToMinutes(
      schedule[schedule.length - 1].arrivalTime,
    )

    // Handle overnight schedules
    if (lastStopTime < firstStopTime) {
      // Vehicle runs overnight
      return currentMinutes >= firstStopTime || currentMinutes <= lastStopTime
    } else {
      return currentMinutes >= firstStopTime && currentMinutes <= lastStopTime
    }
  })
}

/**
 * Get next arrival time for a vehicle at a specific stop
 */
export function getNextArrivalAtStop(
  vehicle: Vehicle,
  stopId: string,
): string | null {
  const stopSchedule = vehicle.scheduleData.find(s => s.stopId === stopId)
  return stopSchedule ? stopSchedule.arrivalTime : null
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Find nearest stops to a given location
 */
interface StopLocation {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface NearestStop {
  stop: StopLocation
  distance: number
}

export function findNearestStops(
  userLat: number,
  userLon: number,
  stops: StopLocation[],
  limit: number = 10,
): NearestStop[] {
  const stopsWithDistance = stops.map(stop => ({
    stop,
    distance: calculateDistance(
      userLat,
      userLon,
      stop.latitude,
      stop.longitude,
    ),
  }))

  return stopsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}
