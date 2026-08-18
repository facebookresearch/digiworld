// Copyright (c) Meta Platforms, Inc. and affiliates.
import { BookingFlowStore } from '@/models/BookingFlowStore'

const createStore = () => BookingFlowStore.create({})

describe('BookingFlowStore', () => {
  it('adds, updates, and removes passengers', () => {
    const store = createStore()

    const passenger = {
      id: 'p1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '555-1234',
      dateOfBirth: '1815-12-10',
      passportNumber: 'AL123',
    }

    store.addPassenger(passenger)
    expect(store.passengersCount).toBe(1)
    expect(store.hasPassengers).toBe(true)

    store.updatePassenger('p1', { lastName: 'Byron' })
    expect(store.passengers[0].lastName).toBe('Byron')

    store.removePassenger('p1')
    expect(store.passengersCount).toBe(0)
    expect(store.hasPassengers).toBe(false)
  })

  it('tracks step transitions and card details', () => {
    const store = createStore()

    store.setCurrentStep(2)
    expect(store.currentStep).toBe(2)

    store.updateCardField('cardNumber', '4242 4242 4242 4242')
    store.updateCardField('cardHolderName', 'ADA LOVELACE')
    store.updateCardField('expiryMonth', '12')
    store.updateCardField('expiryYear', '30')
    store.updateCardField('cvv', '123')

    expect(store.isCardValid).toBe(true)

    store.setProcessingPayment(true)
    store.setLoading(false)
    expect(store.processingPayment).toBe(true)
    expect(store.loading).toBe(false)

    store.resetBookingFlow()
    expect(store.currentStep).toBe(1)
    expect(store.passengersCount).toBe(0)
    expect(store.isCardValid).toBe(false)
    expect(store.processingPayment).toBe(false)
    expect(store.loading).toBe(true)
  })

  it('manages passenger form modal flags', () => {
    const store = createStore()

    store.setShowAddPassengerModal(true)
    store.setShowPassengerPickerModal(true)
    store.setEditingPassengerId('temp')

    expect(store.showAddPassengerModal).toBe(true)
    expect(store.showPassengerPickerModal).toBe(true)
    expect(store.editingPassengerId).toBe('temp')

    store.resetNewPassenger()
    expect(store.showAddPassengerModal).toBe(true)
    expect(store.newPassenger.firstName).toBe('')
  })
})
