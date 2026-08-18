// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const RouteDetailState = types
  .model('RouteDetailState', {
    showSaveModal: types.optional(types.boolean, false),
    routeName: types.optional(types.string, ''),
    routeData: types.maybeNull(types.frozen()),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setShowSaveModal(show: boolean) {
      self.showSaveModal = show
    },
    setRouteName(name: string) {
      self.routeName = name
    },
    setRouteData(route: any) {
      self.routeData = route
    },
    reset() {
      self.showSaveModal = false
      self.routeName = ''
      self.routeData = null
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const RouteDetailStore = types
  .model('RouteDetailStore')
  .props({
    routeDetailState: types.optional(RouteDetailState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      routeDetailState?: {
        showSaveModal?: boolean
        routeName?: string
        routeData?: any
      }
    }) {
      try {
        if (snapshot && snapshot.routeDetailState) {
          const rds = snapshot.routeDetailState
          if (rds.showSaveModal !== undefined) {
            self.routeDetailState.setShowSaveModal(rds.showSaveModal)
          }
          if (rds.routeName !== undefined) {
            self.routeDetailState.setRouteName(rds.routeName)
          }
          if (rds.routeData !== undefined) {
            self.routeDetailState.setRouteData(rds.routeData)
          }
        }
      } catch (error) {
        console.error('Error restoring route detail store:', error)
        this.reset()
      }
    },
    reset() {
      self.routeDetailState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface RouteDetailStoreModel
  extends Instance<typeof RouteDetailStore> {}
export interface RouteDetailStoreSnapshot
  extends SnapshotOut<typeof RouteDetailStore> {}
