/**
 * Flight validation utilities for checking departure times and cancellation eligibility
 */

export interface FlightValidationResult {
  isValid: boolean
  reason?: 'DEPARTED' | 'TOO_CLOSE_TO_DEPARTURE' | 'PAST_CHECK_IN'
  timeUntilDeparture?: number // in hours
  departureTime?: string
}

/**
 * Check if a flight's departure time has passed
 */
export function hasFlightDeparted(departureTime: string): boolean {
  const departure = new Date(departureTime)
  const now = new Date()
  return now > departure
}

/**
 * Get hours until departure
 */
export function getHoursUntilDeparture(departureTime: string): number {
  const departure = new Date(departureTime)
  const now = new Date()
  const diffMs = departure.getTime() - now.getTime()
  return diffMs / (1000 * 60 * 60) // Convert to hours
}

/**
 * Check if flight can be cancelled (must be at least 3 hours before departure)
 */
export function canCancelFlight(departureTime: string): FlightValidationResult {
  const hoursUntil = getHoursUntilDeparture(departureTime)

  if (hoursUntil < 0) {
    return {
      isValid: false,
      reason: 'DEPARTED',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  if (hoursUntil < 3) {
    return {
      isValid: false,
      reason: 'TOO_CLOSE_TO_DEPARTURE',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  return {
    isValid: true,
    timeUntilDeparture: hoursUntil,
    departureTime,
  }
}

/**
 * Check if flight can be checked in (typically 24 hours before, but not after departure)
 */
export function canCheckInFlight(
  departureTime: string,
): FlightValidationResult {
  const hoursUntil = getHoursUntilDeparture(departureTime)

  if (hoursUntil < 0) {
    return {
      isValid: false,
      reason: 'DEPARTED',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  if (hoursUntil > 24) {
    return {
      isValid: false,
      reason: 'PAST_CHECK_IN',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  return {
    isValid: true,
    timeUntilDeparture: hoursUntil,
    departureTime,
  }
}

/**
 * Check if booking can proceed (flight must not have departed)
 */
export function canProceedWithBooking(
  departureTime: string,
): FlightValidationResult {
  const hoursUntil = getHoursUntilDeparture(departureTime)

  if (hoursUntil < 0) {
    return {
      isValid: false,
      reason: 'DEPARTED',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  // Prevent booking if less than 2 hours before departure
  if (hoursUntil < 2) {
    return {
      isValid: false,
      reason: 'TOO_CLOSE_TO_DEPARTURE',
      timeUntilDeparture: hoursUntil,
      departureTime,
    }
  }

  return {
    isValid: true,
    timeUntilDeparture: hoursUntil,
    departureTime,
  }
}

/**
 * Format time until departure as human-readable string
 */
export function formatTimeUntilDeparture(hours: number): string {
  const absHours = Math.abs(hours)

  if (absHours < 1) {
    const minutes = Math.round(absHours * 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  if (absHours < 24) {
    const roundedHours = Math.round(absHours)
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`
  }

  const days = Math.round(absHours / 24)
  return `${days} day${days !== 1 ? 's' : ''}`
}

/**
 * Get user-friendly message for validation failure
 */
export function getValidationErrorMessage(
  result: FlightValidationResult,
): string {
  if (!result.reason) return 'Unable to proceed'

  switch (result.reason) {
    case 'DEPARTED':
      return 'This flight has already departed'
    case 'TOO_CLOSE_TO_DEPARTURE':
      return 'Too close to departure time'
    case 'PAST_CHECK_IN':
      return 'Check-in opens 24 hours before departure'
    default:
      return 'Unable to proceed with this flight'
  }
}

/**
 * Parse date string as local date (not UTC) to avoid timezone issues
 * Takes YYYY-MM-DD format and returns Date object in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in JS
}

/**
 * Format date as YYYY-MM-DD in local timezone
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
