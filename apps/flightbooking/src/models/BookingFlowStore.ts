import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const PassengerModel = types.model('Passenger').props({
  id: types.string,
  firstName: types.string,
  lastName: types.string,
  email: types.string,
  phone: types.string,
  dateOfBirth: types.string,
  passportNumber: types.string,
})

const CardDetailsModel = types.model('CardDetails').props({
  cardNumber: types.optional(types.string, ''),
  cardHolderName: types.optional(types.string, ''),
  expiryMonth: types.optional(types.string, ''),
  expiryYear: types.optional(types.string, ''),
  cvv: types.optional(types.string, ''),
})

export const BookingFlowStore = types
  .model('BookingFlowStore')
  .props({
    // Booking flow state
    currentStep: types.optional(types.number, 1),
    passengers: types.optional(types.array(PassengerModel), []),
    newPassenger: types.optional(PassengerModel, {
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      passportNumber: '',
    }),
    cardDetails: types.optional(CardDetailsModel, {}),
    // UI state
    showAddPassengerModal: types.optional(types.boolean, false),
    showPassengerPickerModal: types.optional(types.boolean, false),
    editingPassengerId: types.maybeNull(types.string),
    processingPayment: types.optional(types.boolean, false),
    loading: types.optional(types.boolean, true),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setCurrentStep(step: number) {
      store.currentStep = step
    },
    setPassengers(passengers: any[]) {
      store.passengers.replace(passengers.map(p => PassengerModel.create(p)))
    },
    addPassenger(passenger: any) {
      store.passengers.push(PassengerModel.create(passenger))
    },
    updatePassenger(passengerId: string, updates: any) {
      const passenger = store.passengers.find(p => p.id === passengerId)
      if (passenger) {
        Object.assign(passenger, updates)
      }
    },
    removePassenger(passengerId: string) {
      const index = store.passengers.findIndex(p => p.id === passengerId)
      if (index !== -1) {
        store.passengers.splice(index, 1)
      }
    },
    setNewPassenger(passenger: any) {
      store.newPassenger = PassengerModel.create(passenger)
    },
    resetNewPassenger() {
      store.newPassenger = PassengerModel.create({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        passportNumber: '',
      })
    },
    setCardDetails(details: any) {
      store.cardDetails = CardDetailsModel.create(details)
    },
    updateCardField(field: string, value: string) {
      ;(store.cardDetails as any)[field] = value
    },
    setShowAddPassengerModal(show: boolean) {
      store.showAddPassengerModal = show
    },
    setShowPassengerPickerModal(show: boolean) {
      store.showPassengerPickerModal = show
    },
    setEditingPassengerId(id: string | null) {
      store.editingPassengerId = id
    },
    setProcessingPayment(processing: boolean) {
      store.processingPayment = processing
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    resetBookingFlow() {
      store.currentStep = 1
      store.passengers.clear()
      store.resetNewPassenger()
      store.cardDetails = CardDetailsModel.create({})
      store.showAddPassengerModal = false
      store.showPassengerPickerModal = false
      store.editingPassengerId = null
      store.processingPayment = false
      store.loading = true
    },
    restore(data: any) {
      if (data.currentStep !== undefined) {
        store.currentStep = data.currentStep
      }
      if (data.passengers !== undefined) {
        store.passengers.replace(
          data.passengers.map((p: any) => PassengerModel.create(p)),
        )
      }
      if (data.newPassenger !== undefined) {
        store.newPassenger = PassengerModel.create(data.newPassenger)
      }
      if (data.cardDetails !== undefined) {
        store.cardDetails = CardDetailsModel.create(data.cardDetails)
      }
      if (data.showAddPassengerModal !== undefined) {
        store.showAddPassengerModal = data.showAddPassengerModal
      }
      if (data.showPassengerPickerModal !== undefined) {
        store.showPassengerPickerModal = data.showPassengerPickerModal
      }
      if (data.editingPassengerId !== undefined) {
        store.editingPassengerId = data.editingPassengerId
      }
      if (data.processingPayment !== undefined) {
        store.processingPayment = data.processingPayment
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
    },
  }))
  .views(store => ({
    get passengersCount() {
      return store.passengers.length
    },
    get editingPassenger() {
      if (!store.editingPassengerId) return null
      return (
        store.passengers.find(p => p.id === store.editingPassengerId) || null
      )
    },
    get hasPassengers() {
      return store.passengers.length > 0
    },
    get isCardValid() {
      return (
        store.cardDetails.cardNumber.replace(/\s/g, '').length >= 13 &&
        store.cardDetails.cardHolderName.trim().length >= 3 &&
        store.cardDetails.expiryMonth.length === 2 &&
        store.cardDetails.expiryYear.length === 2 &&
        store.cardDetails.cvv.length >= 3
      )
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface BookingFlowStoreModel
  extends Instance<typeof BookingFlowStore> {}
export interface BookingFlowStoreSnapshot
  extends SnapshotOut<typeof BookingFlowStore> {}
