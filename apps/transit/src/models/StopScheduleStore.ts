// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const StopScheduleState = types
  .model('StopScheduleState', {
    stopId: types.optional(types.string, ''),
    stopName: types.optional(types.string, ''),
    lineId: types.optional(types.string, ''),
    selectedDirection: types.optional(
      types.enumeration('Direction', ['all', 'out', 'in']),
      'all',
    ),
    selectedLine: types.optional(types.string, 'all'),
    showFullSchedule: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setStopId(stopId: string) {
      self.stopId = stopId
    },
    setStopName(stopName: string) {
      self.stopName = stopName
    },
    setLineId(lineId: string) {
      self.lineId = lineId
      // Also update selectedLine if it's still 'all'
      if (self.selectedLine === 'all' && lineId) {
        self.selectedLine = lineId
      }
    },
    setSelectedDirection(direction: 'all' | 'out' | 'in') {
      self.selectedDirection = direction
    },
    setSelectedLine(lineId: string) {
      self.selectedLine = lineId
    },
    setShowFullSchedule(show: boolean) {
      self.showFullSchedule = show
    },
    reset() {
      self.stopId = ''
      self.stopName = ''
      self.lineId = ''
      self.selectedDirection = 'all'
      self.selectedLine = 'all'
      self.showFullSchedule = false
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const StopScheduleStore = types
  .model('StopScheduleStore')
  .props({
    stopScheduleState: types.optional(StopScheduleState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      stopScheduleState?: {
        stopId?: string
        stopName?: string
        lineId?: string
        selectedDirection?: 'all' | 'out' | 'in'
        selectedLine?: string
        showFullSchedule?: boolean
      }
    }) {
      try {
        if (snapshot && snapshot.stopScheduleState) {
          const sss = snapshot.stopScheduleState
          if (sss.stopId !== undefined) {
            self.stopScheduleState.setStopId(sss.stopId)
          }
          if (sss.stopName !== undefined) {
            self.stopScheduleState.setStopName(sss.stopName)
          }
          if (sss.lineId !== undefined) {
            self.stopScheduleState.setLineId(sss.lineId)
          }
          if (sss.selectedDirection !== undefined) {
            self.stopScheduleState.setSelectedDirection(sss.selectedDirection)
          }
          if (sss.selectedLine !== undefined) {
            self.stopScheduleState.setSelectedLine(sss.selectedLine)
          }
          if (sss.showFullSchedule !== undefined) {
            self.stopScheduleState.setShowFullSchedule(sss.showFullSchedule)
          }
        }
      } catch (error) {
        console.error('Error restoring stop schedule store:', error)
        this.reset()
      }
    },
    reset() {
      self.stopScheduleState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface StopScheduleStoreModel
  extends Instance<typeof StopScheduleStore> {}
export interface StopScheduleStoreSnapshot
  extends SnapshotOut<typeof StopScheduleStore> {}
