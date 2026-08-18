// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types, getRoot } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

const PassengerAssignmentModel = types.model('PassengerAssignment').props({
  passenger: types.frozen(),
  seatAssignment: types.frozen(),
})

const CheckedInFlightModel = types.model('CheckedInFlight').props({
  id: types.string,
  booking: types.frozen(),
  bookingFlight: types.frozen(),
  flight: types.frozen(),
  flightId: types.string,
  passengers: types.array(PassengerAssignmentModel),
})

export const BoardingPassStore = types
  .model('BoardingPassStore')
  .props({
    checkedInFlights: types.optional(types.array(CheckedInFlightModel), []),
    loading: types.optional(types.boolean, true),
    lastRefreshTime: types.maybeNull(types.number),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setCheckedInFlights(flights: any[]) {
      store.checkedInFlights.replace(
        flights.map(f =>
          CheckedInFlightModel.create({
            id: f.id,
            booking: f.booking,
            bookingFlight: f.bookingFlight,
            flight: f.flight,
            flightId: f.flightId,
            passengers: f.passengers.map((p: any) =>
              PassengerAssignmentModel.create(p),
            ),
          }),
        ),
      )
      store.lastRefreshTime = Date.now()
    },
    setLoading(loading: boolean) {
      store.loading = loading
    },
    clearCheckedInFlights() {
      store.checkedInFlights.clear()
      store.loading = true
      store.lastRefreshTime = null
    },
    restore(data: any) {
      if (data.checkedInFlights !== undefined) {
        store.checkedInFlights.replace(
          data.checkedInFlights.map((f: any) => CheckedInFlightModel.create(f)),
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
    get flightsCount() {
      return store.checkedInFlights.length
    },
    get hasFlights() {
      return store.checkedInFlights.length > 0
    },
    get upcomingFlights() {
      const now = Date.now()
      return store.checkedInFlights.filter(f => {
        const departureTime = new Date(
          f.bookingFlight.departure_time || f.flight?.departure_time,
        ).getTime()
        return departureTime > now
      })
    },
    getRootStore() {
      return getRoot(store)
    },
  }))

export interface BoardingPassStoreModel
  extends Instance<typeof BoardingPassStore> {}
export interface BoardingPassStoreSnapshot
  extends SnapshotOut<typeof BoardingPassStore> {}
