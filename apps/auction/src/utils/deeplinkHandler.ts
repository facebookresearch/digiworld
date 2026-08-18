// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Alert, Linking } from 'react-native'
import { router } from 'expo-router'
import { runInAction } from 'mobx'
import * as RNFS from 'react-native-fs'

import { closeConnection, reopenConnection, resetDatabase, sqlite } from '@/db'
import { mutations } from '@/db/mutations'
import { RootStore } from '@/models/RootStore'

import {
  writeAppState,
  createSessionReport,
  SessionReport,
} from './appStateManager'
import { Instance, applySnapshot } from 'mobx-state-tree'
import { getLatestInteraction } from '@andojo/shared-interaction-tracking'
import * as storage from '@/utils/storage/storage'
import { requestThemeReload } from './themeReloader'
import { notifyAuctionAssetsRefreshed } from '@/utils/assetImageRefresh'

interface DeeplinkParams {
  sessionId?: string
  action: string
}

async function readRootstoreBackRoute(
  sessionsBasePath: string,
  sessionId: string,
): Promise<string | null> {
  try {
    const rootstorePath = `${sessionsBasePath}/${sessionId}/rootstore.json`
    const content = await RNFS.readFile(rootstorePath, 'utf8')
    const data = JSON.parse(content)
    return data.backRoute || null
  } catch {
    return null
  }
}

// Add these state variables at the top level
let isProcessingDeeplink = false
let pendingSessionReport: SessionReport | null = null

// Add helper function to clear sessions
async function clearSessionsDirectory(): Promise<void> {
  try {
    const sessionsDir = `${RNFS.ExternalDirectoryPath}/sessions`
    const exists = await RNFS.exists(sessionsDir)
    if (exists) {
      await RNFS.unlink(sessionsDir)
    }
    await RNFS.mkdir(sessionsDir)
    console.log('Sessions directory cleared')
  } catch (error) {
    console.error('Failed to clear sessions:', error)
  }
}

// Update ensureSessionDirectory function
async function ensureSessionDirectory(sessionId: string): Promise<string> {
  // Clear all sessions first
  await clearSessionsDirectory()

  const sessionDir = `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`
  const exists = await RNFS.exists(sessionDir)
  if (!exists) {
    await RNFS.mkdir(sessionDir)
  }
  return sessionDir
}
async function checkSessionDirectory(sessionId: string): Promise<string> {
  // Clear all sessions first

  const sessionDir = `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`

  return sessionDir
}
// Improved backupRootStore with comprehensive error handling and reporting
async function backupRootStore(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; report: any }> {
  const startTime = Date.now()
  const storesProcessed: string[] = []

  try {
    const sessionDir = `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`
    const exists = await RNFS.exists(sessionDir)
    if (!exists) {
      console.log('Session directory does not exist, creating it')
    }
    const filePath = `${sessionDir}/rootstore.json`

    // Optimized backup: Only volatile/user state - static data will be reloaded from DB
    // This reduces backup size from ~500KB-1MB to ~5-20KB
    const rootStoreSnapshot: any = {
      timestamp: Date.now(),
    }

    // Backup each store with individual error handling
    try {
      rootStoreSnapshot.sessionStore = rootStore.sessionStore
      storesProcessed.push('sessionStore')
    } catch (error) {
      console.error('Failed to backup sessionStore:', error)
      throw new Error(`SessionStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.userStore = {
        ...rootStore.userStore,
        currentUser:
          rootStore.userStore.user && rootStore.userStore.user.id
            ? rootStore.userStore.user
            : null,
      }
      storesProcessed.push('userStore')
    } catch (error) {
      console.error('Failed to backup userStore:', error)
      throw new Error(`UserStore backup failed: ${error}`)
    }

    try {
      // Only backup volatile UI state, not database-backed data arrays
      // Database data will be reloaded from DB on restore
      rootStoreSnapshot.auctionStore = {
        // DO NOT backup: categories, users, items, bids, transactions, payments,
        // mockCards, inventory, listings, sessions, userPaymentMethods
        // These will be reloaded from database

        // Only backup volatile UI state and references
        currentSession: rootStore.auctionStore.currentSession
          ? { id: rootStore.auctionStore.currentSession.id }
          : null,
        currentUser: rootStore.auctionStore.currentUser
          ? { id: rootStore.auctionStore.currentUser.id }
          : null,
        selectedItem: rootStore.auctionStore.selectedItem
          ? { id: rootStore.auctionStore.selectedItem.id }
          : null,
        selectedCategory: rootStore.auctionStore.selectedCategory
          ? { id: rootStore.auctionStore.selectedCategory.id }
          : null,
        searchQuery: rootStore.auctionStore.searchQuery,
        searchCategoryId: rootStore.auctionStore.searchCategoryId,
        // Don't backup searchResults - they're references that will be invalid
      }
      storesProcessed.push('auctionStore')
    } catch (error) {
      console.error('Failed to backup auctionStore:', error)
      throw new Error(`AuctionStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.uiStore = { ...rootStore.uiStore }
      storesProcessed.push('uiStore')
    } catch (error) {
      console.error('Failed to backup uiStore:', error)
      throw new Error(`UIStore backup failed: ${error}`)
    }

    /** Commenting out as this isn't ideally in scope and we can implement it later */
    // try {
    //   rootStoreSnapshot.notificationStore = { ...rootStore.notificationStore }
    //   storesProcessed.push('notificationStore')
    // } catch (error) {
    //   console.error('Failed to backup notificationStore:', error)
    //   throw new Error(`NotificationStore backup failed: ${error}`)
    // }

    try {
      rootStoreSnapshot.authStore = rootStore.authStore
      storesProcessed.push('authStore')
    } catch (error) {
      console.error('Failed to backup authStore:', error)
      throw new Error(`AuthStore backup failed: ${error}`)
    }

    const backupContent = JSON.stringify(rootStoreSnapshot, null, 2)
    await RNFS.writeFile(filePath, backupContent, 'utf8')

    const report = createSessionReport(
      'backup',
      'success',
      'Backup completed successfully',
      {
        sessionId,
        startTime,
        details: {
          storesProcessed,
          backupSize: backupContent.length,
          dbOperations: ['rootstore_backup'],
        },
      },
    )

    console.log('RootStore backed up successfully:', filePath)
    return { success: true, report }
  } catch (error) {
    const report = createSessionReport('backup', 'error', 'Backup failed', {
      sessionId,
      startTime,
      reasonForFailure: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : new Error(String(error)),
      details: {
        storesProcessed,
        storesFailed: ['unknown'],
      },
    })

    console.error('RootStore backup failed:', error)
    return { success: false, report }
  }
}

// Enhanced backupDatabase function with comprehensive reporting
export async function backupDatabase(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<boolean> {
  const startTime = Date.now()

  try {
    const sessionDir = await ensureSessionDirectory(sessionId)
    const dbPath = sqlite.databasePath
    const backupPath = `${sessionDir}/${sessionId}.db`

    console.log('Backing up database from:', dbPath)
    console.log('to:', backupPath)

    // Backup database file
    await RNFS.copyFile(dbPath, backupPath)

    // Backup root store with reporting
    const { success, report } = await backupRootStore(sessionId, rootStore)

    if (success) {
      // Write success report to app state
      // await writeAppState(true, report)
      pendingSessionReport = report
      console.log('Database and RootStore backed up successfully')
      return true
    } else {
      // Write failure report to app state
      // await writeAppState(false, report)
      pendingSessionReport = report
      console.error('RootStore backup failed')
      return false
    }
  } catch (error) {
    // Create and write error report
    const report = createSessionReport(
      'backup',
      'error',
      'Database backup failed',
      {
        sessionId,
        startTime,
        reasonForFailure:
          error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error)),
        details: {
          dbOperations: ['database_copy_failed'],
        },
      },
    )

    // await writeAppState(false, report)
    pendingSessionReport = report
    console.error('Backup failed:', error)
    return false
  }
}

// Updated restoreRootStore to restore all stores in the RootStore
async function restoreRootStore(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; report: any; rootStoreData?: any }> {
  const startTime = Date.now()
  const storesProcessed: string[] = []
  const storesFailed: string[] = []

  try {
    const sessionDir = await checkSessionDirectory(sessionId)
    const filePath = `${sessionDir}/rootstore.json`

    const exists = await RNFS.exists(filePath)
    if (!exists) {
      throw new Error('RootStore backup not found')
    }

    const content = await RNFS.readFile(filePath, 'utf8')
    const rootStoreData = JSON.parse(content)

    console.log('Starting store restoration...')

    // Restore all stores in the RootStore
    const storeNames = [
      'authStore',
      'uiStore',
      'auctionStore',
      'sessionStore',
      // 'notificationStore',
      'userStore',
    ]

    runInAction(() => {
      storeNames.forEach(storeName => {
        if (rootStoreData[storeName]) {
          try {
            const store = (rootStore as any)[storeName]
            if (store?.restore) {
              store.restore(rootStoreData[storeName])
              storesProcessed.push(storeName)
            }
          } catch (error) {
            console.error(`${storeName} restore failed:`, error)
            storesFailed.push(storeName)
          }
        }
        rootStore.auctionStore.loadAllData(true).catch(console.error)
      })
      // Note: Don't deduplicate sessions here - data will be loaded fresh from DB
    })

    const statusCode =
      storesFailed.length === 0
        ? 'success'
        : storesProcessed.length > 0
          ? 'partial_success'
          : 'error'

    const statusMessage =
      storesFailed.length === 0
        ? 'All stores restored successfully'
        : `${storesProcessed.length} stores restored, ${storesFailed.length} failed`

    const report = createSessionReport('restore', statusCode, statusMessage, {
      sessionId,
      startTime,
      details: {
        storesProcessed,
        storesFailed,
        dbOperations: ['rootstore_restore'],
      },
    })

    console.log('RootStore restoration completed:', statusMessage)
    return { success: statusCode !== 'error', report, rootStoreData }
  } catch (error) {
    console.error('Critical error during restoration:', error)

    const report = createSessionReport(
      'restore',
      'error',
      'Restoration failed due to critical error',
      {
        sessionId,
        startTime,
        reasonForFailure:
          error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error)),
        details: {
          storesProcessed,
          storesFailed,
        },
      },
    )

    return { success: false, report }
  }
}

// --- Database Readiness Helper ---
async function waitUntilDatabaseReady(
  requiredTables: string[],
  timeoutMs = 60_000, // max wait 1 min
  intervalMs = 250, // poll every 250ms
): Promise<{ ready: boolean; attempts: number }> {
  const start = Date.now()
  let attempts = 0

  async function isReady(): Promise<boolean> {
    try {
      // Force schema load
      await sqlite.execAsync('PRAGMA schema_version;')

      for (const table of requiredTables) {
        const res = await sqlite.getFirstAsync<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table],
        )
        if (!res) return false
      }
      return true
    } catch {
      return false
    }
  }

  while (Date.now() - start < timeoutMs) {
    attempts++
    if (await isReady()) {
      return { ready: true, attempts }
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  return { ready: false, attempts }
}

// --- Main Restore Function ---
async function restoreDatabase(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; rootStoreData?: any }> {
  const startTime = Date.now()

  try {
    const sessionDir = await checkSessionDirectory(sessionId)
    const dbPath = sqlite.databasePath
    const backupPath = `${sessionDir}/${sessionId}.db`

    const exists = await RNFS.exists(backupPath)
    if (!exists) {
      throw new Error('Backup not found at: ' + backupPath)
    }

    console.log('Restoring database file...')
    await closeConnection()
    await RNFS.copyFile(backupPath, dbPath)

    for (const ext of ['-wal', '-shm']) {
      const walPath = `${backupPath}${ext}`
      if (await RNFS.exists(walPath)) {
        await RNFS.copyFile(walPath, `${dbPath}${ext}`)
      }
    }

    await reopenConnection()

    console.log('Validating database readiness...')
    // Auction app core tables - ensure these exist after restore
    const requiredTables = [
      'users',
      'sessions',
      'categories',
      'items',
      'bids',
      'transactions',
      'listings',
      'payments',
      'user_payment_methods',
      'system_config',
    ]

    const { ready: dbReady, attempts } = await waitUntilDatabaseReady(
      requiredTables,
      60_000, // 1 minute max
      250, // poll every 250ms
    )

    if (!dbReady) {
      throw new Error(
        `Database not ready after ${attempts} attempts - tables may not exist`,
      )
    }

    console.log(
      `Database validated successfully after ${attempts} attempts, proceeding with store restoration...`,
    )

    // Step 3: Now restore stores (DB is guaranteed to be ready)
    const { success, report, rootStoreData } = await restoreRootStore(
      sessionId,
      rootStore,
    )

    // Enhance report with database validation info
    const enhancedReport = {
      ...report,
      details: {
        ...report.details,
        dbValidationAttempts: attempts,
        dbOperations: [
          'database_restore',
          'table_validation',
          'store_restoration',
        ],
      },
    }

    // Write report to app state (clean up previous session report)
    // await writeAppState(success, enhancedReport)
    pendingSessionReport = enhancedReport

    if (success || report.statusCode === 'partial_success') {
      console.log('Database and RootStore restored:', report.statusMessage)
      return { success: true, rootStoreData }
    } else {
      console.error('Restore failed:', report.statusMessage)
      return { success: false }
    }
  } catch (error) {
    // Create and write error report
    const report = createSessionReport(
      'restore',
      'error',
      'Database restore failed',
      {
        sessionId,
        startTime,
        reasonForFailure:
          error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error)),
        details: {
          dbOperations: ['database_restore_failed'],
        },
      },
    )

    // await writeAppState(true, report)
    pendingSessionReport = report
    console.error('Restore failed:', error)
    return { success: false }
  }
}

// Helper function to safely reset database
async function safeResetDatabase(rootStore: any) {
  try {
    console.log('Starting safe database reset...')

    // Clear MobX stores and AsyncStorage first
    console.log('Clearing MobX stores and AsyncStorage...')
    const ROOT_STATE_STORAGE_KEY = 'root-v1'

    // Remove root store from AsyncStorage
    storage.remove(ROOT_STATE_STORAGE_KEY)

    // Reset MobX store to empty initial state
    // Preserve isDeeplinkLoading to keep overlay visible during reset
    const preserveLoadingState = rootStore.uiStore.isDeeplinkLoading
    runInAction(() => {
      applySnapshot(rootStore, {
        userStore: {
          user: null,
          isAuthenticated: false,
          authError: null,
          validationErrors: [],
        },
        uiStore: {
          isDeeplinkLoading: preserveLoadingState, // Preserve loading state
          storagePermissionUri: null,
          isDrawerOpen: false,
          currentFocusedElement: null,
          itemDetailForm: {},
          sellForm: {},
          searchState: {},
          browseState: {},
          transactionFilter: {},
          transactionDetails: {},
          addPaymentMethodForm: {},
          bidForm: {},
          paymentForm: {},
          dialogState: {},
        },
        sessionStore: {},
        authStore: {},
        auctionStore: {},
        notificationStore: {},
      })
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    // Reset database
    console.log('Resetting database...')
    const resetResult = await resetDatabase()
    if (!resetResult) {
      throw new Error('Database reset failed')
    }
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reinitialize with fresh data
    console.log('Reinitializing database with fresh data...')
    // writeAppState(true)
    const result = await mutations.initializeDatabase()
    if (!result.success) {
      throw new Error('Failed to reinitialize database')
    }

    console.log('Safe database reset completed successfully')
    return true
  } catch (error) {
    console.error('Safe reset failed:', error)
    try {
      await closeConnection()
      await new Promise(resolve => setTimeout(resolve, 500))
      reopenConnection()
    } catch (reopenError) {
      console.error('Failed to recover database state:', reopenError)
    }
    throw error
  }
}

// Update setDeeplinkProcessing function with session reporting
function setDeeplinkProcessing(rootStore: any, processing: boolean) {
  runInAction(() => {
    rootStore.uiStore.setDeeplinkLoading(processing)
  })
  writeAppState(!processing, pendingSessionReport as SessionReport).then(() => {
    pendingSessionReport = null
  })
}

// Helper function to normalize route paths
function normalizeRoutePath(route: string): string {
  if (!route) return '/'

  // Log the original route for debugging
  console.log('Normalizing route:', route)

  // Remove any leading slashes
  let normalizedPath = route.replace(/^\/+/, '')

  if (
    !normalizedPath.includes('category/') &&
    !normalizedPath.includes('product/')
  ) {
    normalizedPath = normalizedPath.replace(/^screens\//, '')
  }

  // Handle group routing format
  if (!normalizedPath.startsWith('(')) {
    // Remove 'screens/' prefix if present

    // Remove 'auth/' prefix if present
    normalizedPath = normalizedPath.replace(/^auth\//, '')

    // If the path doesn't have group notation but should
    if (normalizedPath.includes('address/')) {
      normalizedPath = `(app)/(drawer)/${normalizedPath}`
    } else if (normalizedPath.includes('orders/')) {
      normalizedPath = `screens/${normalizedPath}`
    } else if (normalizedPath === 'orders') {
      normalizedPath = 'screens/orders'
    } else if (normalizedPath.includes('checkout')) {
      normalizedPath = `screens/${normalizedPath}`
    }
  }

  // Ensure single leading slash
  normalizedPath = '/' + normalizedPath

  // Log the normalized route for debugging
  console.log('Normalized to:', normalizedPath)

  return normalizedPath
}

// Update handleDeeplink function to handle cleanup action
async function handleDeeplink(url: string, rootStore: any) {
  if (!url) return

  if (isProcessingDeeplink) {
    console.log('Already processing a deeplink, ignoring:', url)
    return
  }

  if (!url.startsWith('andojoauction://')) {
    console.log('Ignoring URL with incorrect scheme:', url)
    return
  }

  // Parse params outside try block so it's accessible in finally
  const params = parseDeeplinkURL(url)
  if (!params) {
    console.log('Failed to parse URL parameters')
    return
  }

  try {
    console.log('Processing deeplink', url)
    isProcessingDeeplink = true
    setDeeplinkProcessing(rootStore, true)

    console.log('Handling deeplink URL:', url)

    const { sessionId, action } = params

    // Handle silent reset
    if (action === 'reset') {
      try {
        console.log('Starting silent reset...')
        await safeResetDatabase(rootStore)
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Clear loading state after reset completes and before navigation
        setDeeplinkProcessing(rootStore, false)
        router.replace('/login')
      } catch (error) {
        console.error('Silent reset failed:', error)
        // Clear loading state on error too
        setDeeplinkProcessing(rootStore, false)
        RNFS.unlink(RNFS.ExternalDirectoryPath + '/sessions')
        router.replace('/login')
      }
      // Don't execute finally block for reset - we've already cleared loading state
      return
    }

    // Handle theme reload
    if (action === 'load-theme') {
      try {
        console.log('🎨 Verifying theme file...')

        const themeDir = `${RNFS.ExternalDirectoryPath}/themes`
        const themeFile = `${themeDir}/theme.json`

        // Check if theme file exists
        const exists = await RNFS.exists(themeFile)
        if (!exists) {
          console.error(`❌ Theme file not found: ${themeFile}`)
          Alert.alert('Theme Not Found', 'Theme file was not found on device.')
          return
        }

        // Read and parse theme JSON
        const themeJSON = await RNFS.readFile(themeFile, 'utf8')
        const themeConfig = JSON.parse(themeJSON)

        console.log(`✅ Theme loaded: ${themeConfig.name}`)

        // Trigger theme reload immediately
        requestThemeReload(themeConfig)
        console.log('🔄 Theme reload requested')
      } catch (error) {
        console.error('❌ Failed to verify theme:', error)
        Alert.alert(
          'Theme Error',
          error instanceof Error ? error.message : 'Unknown error occurred',
        )
      }
      return
    }

    // Handle regular session-based deeplinks
    if (action === 'get') {
      if (!sessionId) return
      await rootStore.sessionStore.handleDeepLink(sessionId)
      await backupDatabase(sessionId, rootStore as Instance<typeof RootStore>)
    }
    if (action === 'append') {
      console.log('Appending database', sessionId || 'no-session-id')
      // Generate sessionId if not provided
      const appendSessionId = sessionId || `append_${Date.now()}`
      await backupDatabase(
        appendSessionId,
        rootStore as Instance<typeof RootStore>,
      )

      // Copy database file and rootstore to db-forge folder after backup
      try {
        const dbForgePath = `${RNFS.ExternalDirectoryPath}/db-forge`

        // Create db-forge directory if it doesn't exist
        const dirExists = await RNFS.exists(dbForgePath)
        if (!dirExists) {
          await RNFS.mkdir(dbForgePath)
        }

        // Clear any existing files in db-forge folder when new db comes
        const files = await RNFS.readDir(dbForgePath)
        for (const file of files) {
          if (file.isFile()) {
            await RNFS.unlink(file.path)
          }
        }

        // Copy the database file to db-forge folder
        const dbPath = sqlite.databasePath
        const dbForgeFile = `${dbForgePath}/current.db`
        await RNFS.copyFile(dbPath, dbForgeFile)

        console.log(`✅ Database copied to db-forge folder: ${dbForgeFile}`)

        // Create and save rootstore snapshot to db-forge folder
        const rootStoreSnapshot: any = { timestamp: Date.now() }
        const storeNames = [
          'sessionStore',
          'userStore',
          'auctionStore',
          'uiStore',
          'authStore',
        ]
        storeNames.forEach(storeName => {
          try {
            rootStoreSnapshot[storeName] = (rootStore as any)[storeName]
          } catch (error) {
            console.error(`Failed to snapshot ${storeName}:`, error)
          }
        })
        const rootstoreContent = JSON.stringify(rootStoreSnapshot, null, 2)
        const rootstoreFile = `${dbForgePath}/current.json`
        await RNFS.writeFile(rootstoreFile, rootstoreContent, 'utf8')

        console.log(`✅ RootStore saved to db-forge folder: ${rootstoreFile}`)
      } catch (error) {
        console.error('❌ Failed to copy files to db-forge folder:', error)
      }
    } else if (action === 'set') {
      if (!sessionId) return

      // Step 1: Restore database and volatile store state
      const { success: restoreSuccess, rootStoreData } = await restoreDatabase(
        sessionId,
        rootStore as Instance<typeof RootStore>,
      )

      if (!restoreSuccess) {
        Alert.alert('Restore failed', 'Could not restore session')
        return
      }

      // Step 2: Load all data from the restored database
      // This populates the store arrays (items, bids, transactions, etc.) from DB
      console.log('Loading all data from restored database...')
      await rootStore.auctionStore.loadAllData(true) // force=true to bypass cache

      // Step 3: Restore references now that arrays are populated
      if (rootStoreData?.auctionStore) {
        console.log('Restoring AuctionStore references...')
        rootStore.auctionStore.restoreReferences(rootStoreData.auctionStore)
      }

      // CRITICAL: Wait for MobX reactions to propagate before navigation
      // This ensures computed values (like getItemsByCategory) are updated
      console.log('Waiting for MobX reactions to propagate...')
      await new Promise(resolve => setTimeout(resolve, 500))

      const timer = setTimeout(resolve => resolve(), 500)
      await new Promise(resolve => {
        const cleanup = () => clearTimeout(timer)
        resolve(cleanup())
      })
      const existingSession = rootStore.sessionStore.getSession(sessionId)
      if (!existingSession) {
        Alert.alert('Session not found', 'Please try again')
        return
      }

      // Normalize the route path before navigation
      const normalizedRoute = normalizeRoutePath(
        existingSession.data.route as string,
      )
      console.log('Target route:', normalizedRoute)

      // Navigate to the normalized route
      console.log('Navigating to normalized route:', normalizedRoute)
      const interaction = getLatestInteraction()
      const currentRoute = interaction?.data?.route
      const targetRoute = normalizedRoute

      if (!targetRoute) {
        console.warn('[Deeplink] No target route resolved, skipping navigation')
        return
      }

      // Read back route from rootstore for proper back-button behavior
      const backRoute = await readRootstoreBackRoute(
        `${RNFS.ExternalDirectoryPath}/sessions`,
        sessionId,
      )

      if (backRoute) {
        console.log(
          `[Deeplink] Stack screen - setting back route: ${backRoute}`,
        )
        router.replace({
          pathname: backRoute as any,
          params: {
            sessionId,
            action,
            sessionTimeStamp: sessionId + Date.now(),
          },
        })
        await new Promise(resolve => setTimeout(resolve, 300))
        router.push({
          pathname: targetRoute as any,
          params: {
            sessionId,
            action,
            sessionTimeStamp: sessionId + Date.now(),
          },
        })
      } else if (currentRoute === targetRoute) {
        // If already on target route → reload
        console.log(`[Deeplink] Reloading current route: ${currentRoute}`)
        router.setParams({ sessionTimeStamp: Date.now() })
        router.reload()
      } else if (currentRoute === '/') {
        // Else → navigate to new route
        console.log(
          `[Deeplink] Navigating from ${currentRoute ?? 'unknown'} → ${targetRoute}`,
        )
        router.replace({
          pathname: targetRoute as any,
          params: { sessionId, action, sessionTimeStamp: Date.now() },
        })
      } else {
        console.log(
          `[Deeplink] Navigating from ${currentRoute ?? 'unknown'} → ${targetRoute}`,
        )
        router.push({
          pathname: targetRoute as any,
          params: { sessionId, action, sessionTimeStamp: Date.now() },
        })
      }
    } else if (action === 'dbrefresh') {
      console.log('🔄 Refreshing modified database...')
      try {
        // Load the modified database from db-forge/modified/modified.db
        const modifiedDbPath = `${RNFS.ExternalDirectoryPath}/db-forge/modified/modified.db`

        const dbPath = sqlite.databasePath

        // Check if modified database exists
        const exists = await RNFS.exists(modifiedDbPath)
        if (exists) {
          // Close current database connection
          await closeConnection()

          // Copy modified database to replace current database
          await RNFS.copyFile(modifiedDbPath, dbPath)

          // Reopen database connection
          await reopenConnection()

          await rootStore.auctionStore.loadAllData(true)
          notifyAuctionAssetsRefreshed()

          console.log('✅ Modified database refreshed successfully')
        } else {
          console.log('⚠️ No modified database found to refresh')
        }
      } catch (error) {
        console.error('❌ Failed to refresh modified database:', error)
      }
    } else {
      console.log('Invalid request', action)
    }
  } finally {
    // Only clear loading state if not a reset action (reset handles it separately)
    if (params?.action !== 'reset') {
      isProcessingDeeplink = false
      setDeeplinkProcessing(rootStore, false)
    } else {
      // For reset, just clear the processing flag
      isProcessingDeeplink = false
    }
  }
}

export function parseDeeplinkURL(url: string): DeeplinkParams | null {
  try {
    const httpUrl = url.replace(/^andojoauction:\/\//, 'http://')
    const fullUrl = new URL(httpUrl)
    const searchParams = new URLSearchParams(fullUrl.search)

    const action = searchParams.get('action')
    if (!action) {
      console.log('Missing required action parameter')
      return null
    }

    // Only require sessionId for get/set actions, append can work without sessionId
    const sessionId = searchParams.get('sessionId')
    if (['get', 'set'].includes(action) && !sessionId) {
      console.log('SessionId required for get/set actions')
      return null
    }

    return { action, ...(sessionId && { sessionId }) }
  } catch (error) {
    console.error('Error parsing deeplink URL:', error)
    return null
  }
}

export function setupDeeplinkHandler(rootStore: any) {
  // Remove any existing listeners first
  Linking.removeAllListeners('url')

  // Handle deeplinks when app is already running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeeplink(url, rootStore)
  })

  console.log('Deeplink handler setup')

  // Handle deeplinks when app is not running (cold start)
  Linking.getInitialURL().then(url => {
    if (url) {
      handleDeeplink(url, rootStore)
    }
  })

  // Return cleanup function
  return () => {
    subscription.remove()
  }
}
