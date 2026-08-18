import {
  canCancelFlight,
  canCheckInFlight,
  canProceedWithBooking,
  formatTimeUntilDeparture,
  getValidationErrorMessage,
} from '@/utils/flightValidation'

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

describe('flightValidation utilities', () => {
  it('validates cancellation windows correctly', () => {
    const departed = canCancelFlight(hoursFromNow(-1))
    expect(departed.isValid).toBe(false)
    expect(departed.reason).toBe('DEPARTED')

    const tooClose = canCancelFlight(hoursFromNow(2))
    expect(tooClose.isValid).toBe(false)
    expect(tooClose.reason).toBe('TOO_CLOSE_TO_DEPARTURE')

    const valid = canCancelFlight(hoursFromNow(5))
    expect(valid.isValid).toBe(true)
  })

  it('validates check-in windows correctly', () => {
    const tooEarly = canCheckInFlight(hoursFromNow(30))
    expect(tooEarly.isValid).toBe(false)
    expect(tooEarly.reason).toBe('PAST_CHECK_IN')

    const windowOpen = canCheckInFlight(hoursFromNow(12))
    expect(windowOpen.isValid).toBe(true)
  })

  it('validates booking windows correctly', () => {
    const tooLate = canProceedWithBooking(hoursFromNow(1))
    expect(tooLate.isValid).toBe(false)
    expect(tooLate.reason).toBe('TOO_CLOSE_TO_DEPARTURE')

    const allowed = canProceedWithBooking(hoursFromNow(4))
    expect(allowed.isValid).toBe(true)
  })

  it('formats time until departure and error messages', () => {
    expect(formatTimeUntilDeparture(0.5)).toBe('30 minutes')
    expect(formatTimeUntilDeparture(5)).toBe('5 hours')
    expect(formatTimeUntilDeparture(48)).toBe('2 days')

    const message = getValidationErrorMessage({
      isValid: false,
      reason: 'TOO_CLOSE_TO_DEPARTURE',
    })
    expect(message).toContain('Too close')
  })
})
