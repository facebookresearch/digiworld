// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const AlertsState = types
  .model('AlertsState', {
    selectedSeverity: types.optional(
      types.enumeration('Severity', ['all', 'low', 'medium', 'high']),
      'all',
    ),
    scrollOffset: types.optional(types.number, 0),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setSelectedSeverity(severity: 'all' | 'low' | 'medium' | 'high') {
      self.selectedSeverity = severity
    },
    setScrollOffset(offset: number) {
      self.scrollOffset = offset
    },
    reset() {
      self.selectedSeverity = 'all'
      self.scrollOffset = 0
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const AlertsStore = types
  .model('AlertsStore')
  .props({
    alertsState: types.optional(AlertsState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      alertsState?: {
        selectedSeverity?: 'all' | 'low' | 'medium' | 'high'
        scrollOffset?: number
      }
    }) {
      try {
        if (snapshot && snapshot.alertsState) {
          const as = snapshot.alertsState
          if (as.selectedSeverity !== undefined) {
            self.alertsState.setSelectedSeverity(as.selectedSeverity)
          }
          if (as.scrollOffset !== undefined) {
            self.alertsState.setScrollOffset(as.scrollOffset)
          }
        }
      } catch (error) {
        console.error('Error restoring alerts store:', error)
        this.reset()
      }
    },
    reset() {
      self.alertsState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface AlertsStoreModel extends Instance<typeof AlertsStore> {}
export interface AlertsStoreSnapshot extends SnapshotOut<typeof AlertsStore> {}
