import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const LineDetailState = types
  .model('LineDetailState', {
    lineId: types.optional(types.string, ''),
    lineData: types.maybeNull(types.frozen()),
    lineStopsData: types.optional(types.array(types.frozen()), []),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setLineId(lineId: string) {
      self.lineId = lineId
    },
    setLineData(line: any) {
      self.lineData = line
    },
    setLineStopsData(stops: any[]) {
      self.lineStopsData.replace(stops)
    },
    reset() {
      self.lineId = ''
      self.lineData = null
      self.lineStopsData.clear()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const LineDetailStore = types
  .model('LineDetailStore')
  .props({
    lineDetailState: types.optional(LineDetailState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      lineDetailState?: {
        lineId?: string
        lineData?: any
        lineStopsData?: any[]
      }
    }) {
      try {
        if (snapshot && snapshot.lineDetailState) {
          const lds = snapshot.lineDetailState
          if (lds.lineId !== undefined) {
            self.lineDetailState.setLineId(lds.lineId)
          }
          if (lds.lineData !== undefined) {
            self.lineDetailState.setLineData(lds.lineData)
          }
          if (lds.lineStopsData !== undefined) {
            self.lineDetailState.setLineStopsData(lds.lineStopsData)
          }
        }
      } catch (error) {
        console.error('Error restoring line detail store:', error)
        this.reset()
      }
    },
    reset() {
      self.lineDetailState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface LineDetailStoreModel
  extends Instance<typeof LineDetailStore> {}
export interface LineDetailStoreSnapshot
  extends SnapshotOut<typeof LineDetailStore> {}
