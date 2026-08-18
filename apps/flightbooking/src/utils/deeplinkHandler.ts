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
import { Instance } from 'mobx-state-tree'
import { getLatestInteraction } from '@andojo/shared-interaction-tracking'
import { ThemeLoader } from '@andojo/shared-theme'

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
      rootStoreSnapshot.authStore = rootStore.authStore
      storesProcessed.push('authStore')
    } catch (error) {
      console.error('Failed to backup authStore:', error)
      throw new Error(`AuthStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.flightSearchStore = rootStore.flightSearchStore
      storesProcessed.push('flightSearchStore')
    } catch (error) {
      console.error('Failed to backup flightSearchStore:', error)
      throw new Error(`FlightSearchStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.ticketsStore = rootStore.ticketsStore
      storesProcessed.push('ticketsStore')
    } catch (error) {
      console.error('Failed to backup ticketsStore:', error)
      throw new Error(`TicketsStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.boardingPassStore = rootStore.boardingPassStore
      storesProcessed.push('boardingPassStore')
    } catch (error) {
      console.error('Failed to backup boardingPassStore:', error)
      throw new Error(`BoardingPassStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.profileStore = rootStore.profileStore
      storesProcessed.push('profileStore')
    } catch (error) {
      console.error('Failed to backup profileStore:', error)
      throw new Error(`ProfileStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.bookingFlowStore = rootStore.bookingFlowStore
      storesProcessed.push('bookingFlowStore')
    } catch (error) {
      console.error('Failed to backup bookingFlowStore:', error)
      throw new Error(`BookingFlowStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.checkInStore = rootStore.checkInStore
      storesProcessed.push('checkInStore')
    } catch (error) {
      console.error('Failed to backup checkInStore:', error)
      throw new Error(`CheckInStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.searchResultsStore = rootStore.searchResultsStore
      storesProcessed.push('searchResultsStore')
    } catch (error) {
      console.error('Failed to backup searchResultsStore:', error)
      throw new Error(`SearchResultsStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.boardingPassScreenStore =
        rootStore.boardingPassScreenStore
      storesProcessed.push('boardingPassScreenStore')
    } catch (error) {
      console.error('Failed to backup boardingPassScreenStore:', error)
      throw new Error(`BoardingPassScreenStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.bookingSuccessStore = rootStore.bookingSuccessStore
      storesProcessed.push('bookingSuccessStore')
    } catch (error) {
      console.error('Failed to backup bookingSuccessStore:', error)
      throw new Error(`BookingSuccessStore backup failed: ${error}`)
    }

    try {
      rootStoreSnapshot.bookingDetailsStore = rootStore.bookingDetailsStore
      storesProcessed.push('bookingDetailsStore')
    } catch (error) {
      console.error('Failed to backup bookingDetailsStore:', error)
      throw new Error(`BookingDetailsStore backup failed: ${error}`)
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

    // Backup database file
    await RNFS.copyFile(dbPath, backupPath)

    // Backup root store with reporting
    const { success, report } = await backupRootStore(sessionId, rootStore)

    if (success) {
      // Write success report to app state
      // await writeAppState(true, report)
      pendingSessionReport = report
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

// Improved restoreRootStore with internal self-management approach
async function restoreRootStore(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; report: any }> {
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

    // Phase 1: Synchronous restoration (immediate volatile state)
    runInAction(() => {
      // Restore session store first
      if (rootStoreData.sessionStore) {
        try {
          rootStore.sessionStore.restore(rootStoreData.sessionStore)
          storesProcessed.push('sessionStore')
        } catch (error) {
          console.error('SessionStore restore failed:', error)
          storesFailed.push('sessionStore')
        }
      }

      // User store second (other stores may depend on user data)
      if (rootStoreData.userStore) {
        try {
          rootStore.userStore.restore(rootStoreData.userStore)
          storesProcessed.push('userStore')
        } catch (error) {
          console.error('UserStore restore failed:', error)
          storesFailed.push('userStore')
        }
      }

      // Restore authStore
      if (rootStoreData.authStore) {
        try {
          if (rootStore.authStore?.restore) {
            rootStore.authStore.restore(rootStoreData.authStore)
            storesProcessed.push('authStore')
          }
        } catch (error) {
          console.error('AuthStore restore failed:', error)
          storesFailed.push('authStore')
        }
      }

      // Restore flightSearchStore
      if (rootStoreData.flightSearchStore) {
        try {
          if (rootStore.flightSearchStore?.restore) {
            rootStore.flightSearchStore.restore(rootStoreData.flightSearchStore)
            storesProcessed.push('flightSearchStore')
          }
        } catch (error) {
          console.error('FlightSearchStore restore failed:', error)
          storesFailed.push('flightSearchStore')
        }
      }

      // Restore ticketsStore
      if (rootStoreData.ticketsStore) {
        try {
          if (rootStore.ticketsStore?.restore) {
            rootStore.ticketsStore.restore(rootStoreData.ticketsStore)
            storesProcessed.push('ticketsStore')
          }
        } catch (error) {
          console.error('TicketsStore restore failed:', error)
          storesFailed.push('ticketsStore')
        }
      }

      // Restore boardingPassStore
      if (rootStoreData.boardingPassStore) {
        try {
          if (rootStore.boardingPassStore?.restore) {
            rootStore.boardingPassStore.restore(rootStoreData.boardingPassStore)
            storesProcessed.push('boardingPassStore')
          }
        } catch (error) {
          console.error('BoardingPassStore restore failed:', error)
          storesFailed.push('boardingPassStore')
        }
      }

      // Restore profileStore
      if (rootStoreData.profileStore) {
        try {
          if (rootStore.profileStore?.restore) {
            rootStore.profileStore.restore(rootStoreData.profileStore)
            storesProcessed.push('profileStore')
          }
        } catch (error) {
          console.error('ProfileStore restore failed:', error)
          storesFailed.push('profileStore')
        }
      }

      if (rootStoreData.bookingFlowStore) {
        try {
          if (rootStore.bookingFlowStore?.restore) {
            rootStore.bookingFlowStore.restore(rootStoreData.bookingFlowStore)
            storesProcessed.push('bookingFlowStore')
          }
        } catch (error) {
          console.error('BookingFlowStore restore failed:', error)
          storesFailed.push('bookingFlowStore')
        }
      }

      if (rootStoreData.checkInStore) {
        try {
          if (rootStore.checkInStore?.restore) {
            rootStore.checkInStore.restore(rootStoreData.checkInStore)
            storesProcessed.push('checkInStore')
          }
        } catch (error) {
          console.error('CheckInStore restore failed:', error)
          storesFailed.push('checkInStore')
        }
      }

      if (rootStoreData.searchResultsStore) {
        try {
          if (rootStore.searchResultsStore?.restore) {
            rootStore.searchResultsStore.restore(
              rootStoreData.searchResultsStore,
            )
            storesProcessed.push('searchResultsStore')
          }
        } catch (error) {
          console.error('SearchResultsStore restore failed:', error)
          storesFailed.push('searchResultsStore')
        }
      }

      if (rootStoreData.boardingPassScreenStore) {
        try {
          if (rootStore.boardingPassScreenStore?.restore) {
            rootStore.boardingPassScreenStore.restore(
              rootStoreData.boardingPassScreenStore,
            )
            storesProcessed.push('boardingPassScreenStore')
          }
        } catch (error) {
          console.error('BoardingPassScreenStore restore failed:', error)
          storesFailed.push('boardingPassScreenStore')
        }
      }

      if (rootStoreData.bookingSuccessStore) {
        try {
          if (rootStore.bookingSuccessStore?.restore) {
            rootStore.bookingSuccessStore.restore(
              rootStoreData.bookingSuccessStore,
            )
            storesProcessed.push('bookingSuccessStore')
          }
        } catch (error) {
          console.error('BookingSuccessStore restore failed:', error)
          storesFailed.push('bookingSuccessStore')
        }
      }

      if (rootStoreData.bookingDetailsStore) {
        try {
          if (rootStore.bookingDetailsStore?.restore) {
            rootStore.bookingDetailsStore.restore(
              rootStoreData.bookingDetailsStore,
            )
            storesProcessed.push('bookingDetailsStore')
          }
        } catch (error) {
          console.error('BookingDetailsStore restore failed:', error)
          storesFailed.push('bookingDetailsStore')
        }
      }
    })

    const restorePromises: Promise<void>[] = []

    // Wait for all store restorations to complete
    await Promise.allSettled(restorePromises)

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
        dbOperations: ['rootstore_restore', 'static_data_reload'],
      },
    })

    console.log('RootStore restoration completed:', statusMessage)
    return { success: statusCode !== 'error', report }
  } catch (error) {
    // If anything goes wrong, abort the process and reset to safe state
    console.error('Critical error during restoration, aborting process:', error)

    const report = createSessionReport(
      'restore',
      'aborted',
      'Restoration aborted due to critical error',
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
): Promise<boolean> {
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
    const requiredTables = [
      'users',
      'airlines',
      'airports',
      'city_pairs',
      'flights',
      'flightsconfig',
      'bookings',
      'booking_flights',
      'passengers',
      'seat_assignments',
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
    const { success, report } = await restoreRootStore(sessionId, rootStore)

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
      return true
    } else {
      console.error('Restore failed:', report.statusMessage)
      return false
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
    return false
  }
}

// Helper function to safely reset database
async function safeResetDatabase(rootStore: any) {
  try {
    console.log('Starting safe database reset...')

    // Clear store data first
    await rootStore.userStore.logout()
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

  // if (processing) {
  //   writeAppState(false) // App not ready during processing
  // }
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

  if (!url.startsWith('andojofly://')) {
    console.log('Ignoring URL with incorrect scheme:', url)
    return
  }

  try {
    console.log('Processing deeplink', url)
    isProcessingDeeplink = true
    setDeeplinkProcessing(rootStore, true)

    console.log('Handling deeplink URL:', url)

    const params = parseDeeplinkURL(url)
    if (!params) {
      console.log('Failed to parse URL parameters')
      return
    }

    const { sessionId, action } = params

    // Handle silent reset
    if (action === 'reset') {
      try {
        console.log('Starting silent reset...')
        await safeResetDatabase(rootStore)
        await new Promise(resolve => setTimeout(resolve, 1000))
        router.replace('/login')
      } catch (error) {
        console.error('Silent reset failed:', error)
        RNFS.unlink(RNFS.ExternalDirectoryPath + '/sessions')
        router.replace('/login')
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

      await rootStore.sessionStore.handleDeepLink(appendSessionId)

      await backupDatabase(
        appendSessionId,
        rootStore as Instance<typeof RootStore>,
      )

      // Copy database file and rootstore.json to db-forge folder after backup
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

        // Copy the rootstore.json file to db-forge folder
        const sessionDir = await checkSessionDirectory(appendSessionId)
        const rootstorePath = `${sessionDir}/rootstore.json`
        const rootstoreExists = await RNFS.exists(rootstorePath)

        if (rootstoreExists) {
          const dbForgeRootstoreFile = `${dbForgePath}/current.json`
          await RNFS.copyFile(rootstorePath, dbForgeRootstoreFile)
          console.log(
            `✅ Rootstore copied to db-forge folder: ${dbForgeRootstoreFile}`,
          )
        } else {
          console.warn(
            '⚠️ Rootstore.json not found in session directory, skipping copy',
          )
        }
      } catch (error) {
        console.error(
          '❌ Failed to copy database/rootstore to db-forge folder:',
          error,
        )
      }
    } else if (action === 'set') {
      if (!sessionId) return
      await restoreDatabase(sessionId, rootStore as Instance<typeof RootStore>)
      const timer = setTimeout(resolve => resolve(), 1000)
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

      const currentRoute = getLatestInteraction()?.data?.route ?? '/'
      console.log('currentRoute', currentRoute)

      if (!normalizedRoute) {
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
          pathname: normalizedRoute as any,
          params: {
            sessionId,
            action,
            sessionTimeStamp: sessionId + Date.now(),
          },
        })
      } else if (currentRoute === '/') {
        router.replace({
          pathname: normalizedRoute as any,
          params: {
            sessionId,
            action,
            sessionTimeStamp: sessionId + Date.now(),
          },
        })
      } else {
        router.push({
          pathname: normalizedRoute as any,
          params: {
            sessionId,
            action,
            sessionTimeStamp: sessionId + Date.now(),
          },
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

          console.log('✅ Modified database refreshed successfully')

          // After swapping the SQLite file, invalidate caches that prevent reloads.
          // SearchResults uses `lastSearchKey` to skip reload on same params.
          rootStore?.searchResultsStore?.setLastSearchKey?.(null)

          // Reload current route to reflect refreshed data
          const interaction = getLatestInteraction()
          const currentRoute = interaction?.data?.route

          if (currentRoute) {
            const navigationParams = {
              sessionId,
              sessionTimeStamp: `${sessionId ?? 'dbrefresh'}${Date.now()}`,
              action,
            }

            router.replace({
              pathname: currentRoute as any,
              params: navigationParams,
            })
            console.log(`🔁 Reloaded current route: ${currentRoute}`)
          } else {
            console.warn(
              '[Deeplink] No current route detected after database refresh, skipping reload',
            )
          }
        } else {
          console.log('⚠️ No modified database found to refresh')
        }
      } catch (error) {
        console.error('❌ Failed to refresh modified database:', error)
      }
    } else if (action === 'load-theme') {
      // Verify theme.json exists on device (already pushed by Python API)
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

        // Read and validate theme JSON
        const themeJSON = await RNFS.readFile(themeFile, 'utf8')
        const themeConfig = JSON.parse(themeJSON)
        const validation = ThemeLoader.validate(themeConfig)

        if (!validation.valid) {
          console.error('❌ Invalid theme configuration:', validation.errors)
          Alert.alert(
            'Invalid Theme',
            `Theme configuration is invalid:\n${validation.errors.join('\n')}`,
          )
          return
        }

        console.log(`✅ Theme validated: ${themeConfig.name}`)
        console.log('⚠️  Restart the app to apply the new theme')
      } catch (error) {
        console.error('❌ Failed to verify theme:', error)
        Alert.alert(
          'Theme Error',
          error instanceof Error ? error.message : 'Unknown error occurred',
        )
      }
    } else {
      console.log('Invalid request', action)
    }
  } finally {
    isProcessingDeeplink = false
    setDeeplinkProcessing(rootStore, false)
  }
}

export function parseDeeplinkURL(url: string): DeeplinkParams | null {
  try {
    const httpUrl = url.replace(/^andojofly:\/\//, 'http://')
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
