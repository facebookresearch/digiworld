import { Instance, SnapshotOut, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'
import { getRootStore } from './helpers/getRootStore'

export const LinesState = types
  .model('LinesState', {
    selectedMode: types.optional(types.string, 'all'), // Persists filter selection
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setSelectedMode(mode: string) {
      self.selectedMode = mode
    },
    reset() {
      self.selectedMode = 'all'
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export const LinesStore = types
  .model('LinesStore')
  .props({
    linesState: types.optional(LinesState, {}),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    restore(snapshot: {
      linesState?: {
        selectedMode?: string
      }
    }) {
      try {
        if (snapshot && snapshot.linesState) {
          const ls = snapshot.linesState
          if (ls.selectedMode !== undefined) {
            self.linesState.setSelectedMode(ls.selectedMode)
          }
        }
      } catch (error) {
        console.error('Error restoring lines store:', error)
        this.reset()
      }
    },
    reset() {
      self.linesState.reset()
    },
  }))
  .views(self => ({
    getRootStore() {
      return getRootStore(self)
    },
  }))

export interface LinesStoreModel extends Instance<typeof LinesStore> {}
export interface LinesStoreSnapshot extends SnapshotOut<typeof LinesStore> {}
