import { BookingDetailsStore } from '@/models/BookingDetailsStore'

const createStore = () =>
  BookingDetailsStore.create({
    bookingData: null,
    selectedFlightToCancel: null,
    lastBookingId: null,
  })

describe('BookingDetailsStore', () => {
  it('stores booking information and exposes helpers', () => {
    const store = createStore()

    const booking = {
      booking_id: 'booking-42',
      status: 'confirmed',
      bookingFlights: [{ id: 'bf-1' }],
    }
    const checkInStatus = {
      allCheckedIn: false,
      someCheckedIn: false,
      total: 2,
      checkedInCount: 0,
    }

    store.setBookingData(booking)
    store.setCheckInStatus(checkInStatus)
    store.setLoading(false)

    expect(store.booking).toEqual(booking)
    expect(store.hasBooking).toBe(true)
    expect(store.checkInStatus.allCheckedIn).toBe(false)
    expect(store.canCancelFull).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('manages cancel modal state and resets correctly', () => {
    const store = createStore()

    store.setShowCancelModal(true)
    store.setCancelType('partial')
    store.setCancelReason('Testing')
    store.setSelectedFlightToCancel({ id: 'bf-1' })
    store.setCancelling(true)

    expect(store.showCancelModal).toBe(true)
    expect(store.cancelType).toBe('partial')
    expect(store.cancelReason).toBe('Testing')
    expect(store.selectedFlightToCancel).toEqual({ id: 'bf-1' })
    expect(store.cancelling).toBe(true)

    store.resetCancelState()

    expect(store.showCancelModal).toBe(false)
    expect(store.cancelType).toBe('full')
    expect(store.cancelReason).toBe('')
    expect(store.selectedFlightToCancel).toBeNull()
    expect(store.cancelling).toBe(false)

    store.resetBookingDetails()
    expect(store.booking).toBeNull()
    expect(store.hasBooking).toBe(false)
    expect(store.loading).toBe(true)
  })
})
