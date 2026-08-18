import { Instance, SnapshotIn, types, flow } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'
import { queries } from '../db/queries'

export const NearbyVehicle = types.model('NearbyVehicle', {
  lineId: types.string,
  vehicleNumber: types.string,
  nextArrival: types.string,
  direction: types.string,
  lineColor: types.optional(types.string, ''),
  lineShortName: types.optional(types.string, ''),
  lineName: types.optional(types.string, ''),
})

export const NearbyLine = types.model('NearbyLine', {
  id: types.string,
  shortName: types.string,
  name: types.string,
  mode: types.string,
  color: types.string,
})

export const NearbyStop = types.model('NearbyStop', {
  id: types.string,
  name: types.string,
  description: types.optional(types.string, ''),
  distance: types.number,
  latitude: types.number,
  longitude: types.number,
  modes: types.array(types.string),
  lines: types.array(NearbyLine),
  upcomingVehicles: types.array(NearbyVehicle),
})

export const NearbyState = types
  .model('NearbyState', {
    selectedMode: types.optional(types.string, 'all'), // Only this persists
  })
  .volatile(() => ({
    // These don't persist - always fresh on load
    nearbyStops: [] as any[],
    isLoading: false,
  }))
  .actions(withSetPropAction)
  .actions(self => ({
    setSelectedMode(mode: string) {
      self.selectedMode = mode
    },
    setIsLoading(loading: boolean) {
      self.isLoading = loading
    },
    setNearbyStops(stops: any[]) {
      self.nearbyStops = stops
    },
    reset() {
      self.selectedMode = 'all'
      self.nearbyStops = []
      self.isLoading = false
    },
  }))
  .actions(self => ({
    loadNearbyStops: flow(function* (userId: number = 1) {
      try {
        self.setIsLoading(true)

        // Get user's home stop or a random stop as current location
        let latitude = 37.7749 // Default San Francisco
        let longitude = -122.4194

        // Try to get user's home stop location
        const preferences = yield queries.getUserPreferences(userId)
        if (preferences?.homeStopId) {
          const homeStop = yield queries.getStopById(preferences.homeStopId)
          if (homeStop) {
            latitude = homeStop.latitude
            longitude = homeStop.longitude
          }
        } else {
          // If no home stop, use a random stop's location
          const allStops = yield queries.getAllStops()
          if (allStops.length > 0) {
            const randomStop =
              allStops[Math.floor(Math.random() * allStops.length)]
            latitude = randomStop.latitude
            longitude = randomStop.longitude
          }
        }

        // Get nearby stops with vehicles
        const stops = yield queries.getNearbyStopsWithVehicles(
          latitude,
          longitude,
          10,
        )

        // Transform data for display with proper filtering and line info
        const transformedStops = yield Promise.all(
          stops.map(async (stop: any) => {
            // Use getVehiclesByStop to get properly filtered vehicles with line info
            const vehiclesAtStop = await queries.getVehiclesByStop(
              stop.id,
              false, // showFullSchedule = false, only future arrivals
            )

            // Transform vehicles to include line info and ensure we have inbound/outbound
            const vehiclesWithLineInfo = vehiclesAtStop.map((vehicle: any) => {
              const line = stop.lines?.find((l: any) => l.id === vehicle.lineId)
              return {
                lineId: vehicle.lineId,
                vehicleNumber: vehicle.vehicleNumber,
                nextArrival: vehicle.nextArrival,
                direction: vehicle.direction || 'out', // 'out' or 'in'
                lineColor: vehicle.lineColor || line?.color || '#FF6B35',
                lineShortName: vehicle.lineShortName || line?.shortName || '',
                lineName: vehicle.lineName || line?.name || '',
              }
            })

            // Sort by arrival time and get next 2-3 vehicles (mix of inbound/outbound)
            const sortedVehicles = vehiclesWithLineInfo.sort((a: any, b: any) =>
              a.nextArrival.localeCompare(b.nextArrival),
            )

            // Get at least 2 vehicles - prefer mix of inbound and outbound
            const outboundVehicles = sortedVehicles.filter(
              (v: any) => v.direction === 'out',
            )
            const inboundVehicles = sortedVehicles.filter(
              (v: any) => v.direction === 'in',
            )

            // Take first outbound, first inbound, then fill with next earliest
            const selectedVehicles: any[] = []
            if (outboundVehicles.length > 0) {
              selectedVehicles.push(outboundVehicles[0])
            }
            if (inboundVehicles.length > 0) {
              selectedVehicles.push(inboundVehicles[0])
            }

            // If we don't have 2 yet, add more from sorted list
            if (selectedVehicles.length < 2) {
              for (const vehicle of sortedVehicles) {
                if (
                  !selectedVehicles.find(
                    (v: any) =>
                      v.lineId === vehicle.lineId &&
                      v.direction === vehicle.direction,
                  )
                ) {
                  selectedVehicles.push(vehicle)
                  if (selectedVehicles.length >= 2) break
                }
              }
            }

            return {
              id: stop.id,
              name: stop.name,
              description: stop.description || '',
              distance: stop.distance || 0,
              latitude: stop.latitude,
              longitude: stop.longitude,
              modes: stop.modesServed || [],
              lines:
                stop.lines?.map((line: any) => ({
                  id: line.id,
                  shortName: line.shortName,
                  name: line.name,
                  mode: line.mode,
                  color: line.color,
                })) || [],
              upcomingVehicles: selectedVehicles,
            }
          }),
        )

        self.setNearbyStops(transformedStops)
      } catch (error) {
        console.error('Error loading nearby stops:', error)
        self.setNearbyStops([])
      } finally {
        self.setIsLoading(false)
      }
    }),
  }))
  .views(self => ({
    get filteredStops() {
      if (self.selectedMode === 'all') {
        return self.nearbyStops.slice()
      }
      return self.nearbyStops.filter(stop => {
        // Filter out stops that don't support the selected mode
        if (!stop.modes || stop.modes.length === 0) {
          return false
        }
        // Check if the stop has the selected mode
        if (!stop.modes.includes(self.selectedMode)) {
          return false
        }
        // Also ensure the stop has at least one line with this mode
        const hasLineWithMode =
          stop.lines && stop.lines.some(line => line.mode === self.selectedMode)
        return hasLineWithMode
      })
    },
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const NearbyStoreModel = types
  .model('NearbyStore')
  .props({
    nearbyState: types.optional(NearbyState, {}),
  })
  .actions(withSetPropAction)
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))
  .actions(self => ({
    reset() {
      self.nearbyState.reset()
    },
    restore(snapshot: any) {
      try {
        // Only restore selectedMode since nearbyStops and isLoading are volatile
        if (snapshot && snapshot.nearbyState) {
          const { selectedMode } = snapshot.nearbyState
          if (selectedMode !== undefined) {
            self.nearbyState.setSelectedMode(selectedMode)
          }
        }
      } catch (error) {
        console.error('Error restoring nearby store:', error)
        this.reset()
      }
    },
  }))

export interface NearbyStore extends Instance<typeof NearbyStoreModel> {}
export interface NearbyStoreSnapshot
  extends SnapshotIn<typeof NearbyStoreModel> {}
