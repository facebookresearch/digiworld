// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const RouteOptionsState = types
  .model('RouteOptionsState', {
    activeFilter: types.optional(
      types.enumeration('FilterType', [
        'fastest',
        'cheapest',
        'fewest-transfers',
        'direct',
      ]),
      'fastest',
    ),
    selectedModes: types.optional(types.array(types.string), [
      'bus',
      'train',
      'subway',
    ]),
    showModeMenu: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setActiveFilter(
      filter: 'fastest' | 'cheapest' | 'fewest-transfers' | 'direct',
    ) {
      self.activeFilter = filter
    },
    setSelectedModes(modes: string[]) {
      self.selectedModes.replace(modes)
    },
    toggleMode(modeId: string) {
      const currentModes = self.selectedModes.slice()
      if (currentModes.includes(modeId)) {
        // Don't allow deselecting all modes
        if (currentModes.length === 1) return
        self.selectedModes.replace(currentModes.filter(m => m !== modeId))
      } else {
        self.selectedModes.replace([...currentModes, modeId])
      }
    },
    setShowModeMenu(show: boolean) {
      self.showModeMenu = show
    },
    reset() {
      self.activeFilter = 'fastest'
      self.selectedModes.replace(['bus', 'train', 'subway'])
      self.showModeMenu = false
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const RouteOptionsStore = types
  .model('RouteOptionsStore')
  .props({
    routeOptionsState: types.optional(RouteOptionsState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      routeOptionsState?: {
        activeFilter?: 'fastest' | 'cheapest' | 'fewest-transfers' | 'direct'
        selectedModes?: string[]
        showModeMenu?: boolean
      }
    }) {
      try {
        if (snapshot && snapshot.routeOptionsState) {
          const ros = snapshot.routeOptionsState
          if (ros.activeFilter !== undefined) {
            self.routeOptionsState.setActiveFilter(ros.activeFilter)
          }
          if (ros.selectedModes !== undefined) {
            self.routeOptionsState.setSelectedModes(ros.selectedModes)
          }
          if (ros.showModeMenu !== undefined) {
            self.routeOptionsState.setShowModeMenu(ros.showModeMenu)
          }
        }
      } catch (error) {
        console.error('Error restoring route options store:', error)
        this.reset()
      }
    },
    reset() {
      self.routeOptionsState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface RouteOptionsStoreModel
  extends Instance<typeof RouteOptionsStore> {}
export interface RouteOptionsStoreSnapshot
  extends SnapshotOut<typeof RouteOptionsStore> {}
