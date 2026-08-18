/**
 * This file is where we do "rehydration" of your RootStore from AsyncStorage.
 * This lets you persist your state between app launches.
 *
 * Navigation state persistence is handled in navigationUtilities.tsx.
 *
 * Note that Fast Refresh doesn't play well with this file, so if you edit this,
 * do a full refresh of your app instead.
 *
 * @refresh reset
 */
import { applySnapshot, IDisposer, Instance, onSnapshot } from 'mobx-state-tree'

import * as storage from '@/utils/storage/storage'
import { mutations } from '@/db/mutations'

import { RootStore, RootStoreSnapshot } from '../RootStore'

/**
 * The key we'll be saving our state as within async storage.
 */
const ROOT_STATE_STORAGE_KEY = 'root-v1'

/**
 * Setup the root state.
 */
let _disposer: IDisposer | undefined
export async function setupRootStore(
  rootStore: Instance<typeof RootStore>,
  options?: { preserveState?: boolean },
) {
  let restoredState: RootStoreSnapshot | undefined | null

  try {
    // Initialize database once when app starts
    const initResult = await mutations.initializeDatabase()
    if (!initResult.success) {
      console.error('Failed to initialize database:', initResult.error)
    }

    // load the last known state from AsyncStorage
    restoredState = ((await storage.load(ROOT_STATE_STORAGE_KEY)) ??
      {}) as RootStoreSnapshot

    // Manually preprocess tripPlannerStore snapshot for migration
    if (
      restoredState &&
      restoredState.tripPlannerStore &&
      restoredState.tripPlannerStore.tripState
    ) {
      const tripState = restoredState.tripPlannerStore.tripState
      if (
        tripState.selectedTime !== undefined &&
        typeof tripState.selectedTime === 'number'
      ) {
        restoredState = {
          ...restoredState,
          tripPlannerStore: {
            ...restoredState.tripPlannerStore,
            tripState: {
              ...tripState,
              selectedTime: 'Now',
            },
          },
        }
      }
    }

    applySnapshot(rootStore, restoredState)

    // Hydrate user store from MMKV storage (auth token and user data)
    await rootStore.userStore.loadStoredUser()

    // Reset UI states if not preserving state
    if (!options?.preserveState) {
      rootStore.userStore?.resetProfileEditUI()
    }
  } catch (e) {
    // if there's any problems loading, then inform the dev what happened
    if (__DEV__) {
      if (e instanceof Error) console.error(e.message)
    }
  }

  // stop tracking state changes if we've already setup
  if (_disposer) _disposer()

  // track changes & save to AsyncStorage
  _disposer = onSnapshot(rootStore, snapshot =>
    storage.save(ROOT_STATE_STORAGE_KEY, snapshot),
  )

  const unsubscribe = () => {
    _disposer?.()
    _disposer = undefined
  }

  return { rootStore, restoredState, unsubscribe }
}
