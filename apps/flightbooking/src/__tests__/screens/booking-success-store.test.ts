// Copyright (c) Meta Platforms, Inc. and affiliates.
import { BookingSuccessStore } from '@/models/BookingSuccessStore'

describe('BookingSuccessStore', () => {
  const createStore = () => BookingSuccessStore.create({})

  it('stores booking details and exposes formatted values', () => {
    const store = createStore()

    store.setBookingDetails({
      bookingReference: 'ABC123',
      totalPaid: '899.00',
      tripType: 'round_trip',
      passengerCount: '2',
    })

    expect(store.hasBookingDetails).toBe(true)
    expect(store.bookingReference).toBe('ABC123')
    expect(store.totalPaid).toBe('899.00')
    expect(store.formattedTripType).toBe('Round Trip')
    expect(store.passengerCountInt).toBe(2)
    expect(store.passengerLabel).toBe('travelers')

    store.setAnimationCompleted(true)
    expect(store.animationCompleted).toBe(true)
  })

  it('resets and tracks last booking reference', () => {
    const store = createStore()

    store.setLastBookingReference('OLD123')
    expect(store.lastBookingReference).toBe('OLD123')

    store.resetBookingSuccess()
    expect(store.hasBookingDetails).toBe(false)
    expect(store.animationCompleted).toBe(false)
    expect(store.lastBookingReference).toBeNull()
  })
})
