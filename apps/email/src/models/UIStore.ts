// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, types } from 'mobx-state-tree'
import { DataFilter } from './EmailModel'

// Store dates as ISO strings for serialization
interface SerializableDataFilter {
  date?: {
    from: string | null
    to: string | null
  }
  categories?: string[]
}

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    mockDataAppendTime: types.optional(types.number, 0),
    // Email menu state
    emailDropdownMenuOpen: types.maybeNull(types.string),
    emailMoveCategoriesOpen: types.maybeNull(types.string),
    // Filter state (stored as serializable format)
    filterState: types.optional(
      types.frozen<SerializableDataFilter | null>(),
      null,
    ),
    filterSelectedTab: types.optional(types.string, 'date'),
    filterErrorMsg: types.optional(types.string, ''),
    showFilter: types.optional(types.boolean, false),
  })
  .actions(self => ({
    setDeeplinkLoading(loading: boolean) {
      self.isDeeplinkLoading = loading
    },
    setStoragePermissionUri(uri: string | null) {
      self.storagePermissionUri = uri
    },
    setMockDataAppended() {
      self.mockDataAppendTime = Date.now()
    },
    setEmailDropdownMenuOpen(emailId: string | null) {
      self.emailDropdownMenuOpen = emailId
    },
    setEmailMoveCategoriesOpen(emailId: string | null) {
      self.emailMoveCategoriesOpen = emailId
    },
    // Filter actions
    setFilterState(filter: DataFilter | undefined) {
      if (!filter) {
        self.filterState = null
        return
      }
      // Convert Date objects to ISO strings for storage
      self.filterState = {
        date: filter.date
          ? {
              from: filter.date.from?.toISOString() || null,
              to: filter.date.to?.toISOString() || null,
            }
          : undefined,
        categories: filter.categories,
      }
    },
    getFilterState(): DataFilter | undefined {
      if (!self.filterState) return undefined
      // Convert ISO strings back to Date objects
      return {
        date: self.filterState.date
          ? {
              from: self.filterState.date.from
                ? new Date(self.filterState.date.from)
                : null,
              to: self.filterState.date.to
                ? new Date(self.filterState.date.to)
                : null,
            }
          : undefined,
        categories: self.filterState.categories,
      }
    },
    setFilterSelectedTab(tab: string) {
      self.filterSelectedTab = tab
    },
    setFilterErrorMsg(msg: string) {
      self.filterErrorMsg = msg
    },
    setShowFilter(show: boolean) {
      self.showFilter = show
    },
    clearFilterState() {
      self.filterState = null
      self.filterSelectedTab = 'date'
      self.filterErrorMsg = ''
      self.showFilter = false
    },
    resetState() {
      self.isDeeplinkLoading = false
      self.storagePermissionUri = null
      self.mockDataAppendTime = 0
      self.emailDropdownMenuOpen = null
      self.emailMoveCategoriesOpen = null
      self.filterState = null
      self.filterSelectedTab = 'date'
      self.filterErrorMsg = ''
      self.showFilter = false
    },
    restore(data: any) {
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
  }))

export interface IUIStore extends Instance<typeof UIStore> {}
