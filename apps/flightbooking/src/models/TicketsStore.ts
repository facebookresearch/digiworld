import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const BookingModel = types.model('Booking').props({
  booking_id: types.string,
  booking_reference: types.string,
  trip_type: types.string,
  booking_date: types.string,
  status: types.string,
  payment_status: types.string,
  total_price: types.number,
  passengerCount: types.optional(types.number, 0),
})

export const TicketsStore = types
  .model('TicketsStore')
  .props({
    bookings: types.optional(types.array(BookingModel), []),
    loading: types.optional(types.boolean, true),
    lastRefreshTime: types.maybeNull(types.number),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setBookings(
      bookings: {
        booking_id: string
        booking_reference: string
        trip_type: string
        booking_date: string
        status: string
        payment_status: string
        total_price: number
        passengerCount?: number
      }[],
    ) {
      store.bookings.replace(
        bookings.map(b =>
          BookingModel.create({ ...b, passengerCount: b.passengerCount || 0 }),
        ),
      )
      store.lastRefreshTime = Date.now()
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    clearBookings() {
      store.bookings.clear()
      store.loading = true
      store.lastRefreshTime = null
    },
    restore(data: any) {
      if (data.bookings !== undefined) {
        store.bookings.replace(
          data.bookings.map((b: any) => BookingModel.create(b)),
        )
      }
      if (data.loading !== undefined) {
        store.loading = data.loading
      }
      if (data.lastRefreshTime !== undefined) {
        store.lastRefreshTime = data.lastRefreshTime
      }
    },
  }))
  .views(store => ({
    get bookingsCount() {
      return store.bookings.length
    },
    get hasBookings() {
      return store.bookings.length > 0
    },
    get confirmedBookings() {
      return store.bookings.filter(b => b.status === 'confirmed')
    },
    get pendingBookings() {
      return store.bookings.filter(b => b.status === 'pending')
    },
    get cancelledBookings() {
      return store.bookings.filter(b => b.status === 'cancelled')
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface TicketsStoreModel extends Instance<typeof TicketsStore> {}
export interface TicketsStoreSnapshot
  extends SnapshotOut<typeof TicketsStore> {}
