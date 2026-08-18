import { router } from 'expo-router'
import { runInAction } from 'mobx'
import { Alert, Linking } from 'react-native'
import * as RNFS from 'react-native-fs'

import { closeConnection, reopenConnection, resetDatabase, sqlite } from '@/db'
import { mutations } from '@/db/mutations'
import { RootStore } from '@/models/RootStore'

import { Instance } from 'mobx-state-tree'
import {
  createSessionReport,
  SessionReport,
  writeAppState,
} from './appStateManager'
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
  const sessionDir = `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`
  return sessionDir
}

// Helper function to create rootstore snapshot
function createRootStoreSnapshot(rootStore: Instance<typeof RootStore>): {
  snapshot: any
  storesProcessed: string[]
} {
  const storesProcessed: string[] = []
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
    rootStoreSnapshot.profileStore = rootStore.profileStore
    storesProcessed.push('profileStore')
  } catch (error) {
    console.error('Failed to backup profileStore:', error)
    throw new Error(`ProfileStore backup failed: ${error}`)
  }

  try {
    if (rootStore.tripPlannerStore) {
      rootStoreSnapshot.tripPlannerStore = rootStore.tripPlannerStore
      storesProcessed.push('tripPlannerStore')
    }
  } catch (error) {
    console.error('Failed to backup tripPlannerStore:', error)
    throw new Error(`TripPlannerStore backup failed: ${error}`)
  }

  try {
    if (rootStore.nearbyStore) {
      rootStoreSnapshot.nearbyStore = rootStore.nearbyStore
      storesProcessed.push('nearbyStore')
    }
  } catch (error) {
    console.error('Failed to backup nearbyStore:', error)
    throw new Error(`NearbyStore backup failed: ${error}`)
  }

  try {
    if (rootStore.linesStore) {
      rootStoreSnapshot.linesStore = rootStore.linesStore
      storesProcessed.push('linesStore')
    }
  } catch (error) {
    console.error('Failed to backup linesStore:', error)
    throw new Error(`LinesStore backup failed: ${error}`)
  }

  try {
    if (rootStore.routeOptionsStore) {
      rootStoreSnapshot.routeOptionsStore = rootStore.routeOptionsStore
      storesProcessed.push('routeOptionsStore')
    }
  } catch (error) {
    console.error('Failed to backup routeOptionsStore:', error)
    throw new Error(`RouteOptionsStore backup failed: ${error}`)
  }

  try {
    if (rootStore.routeDetailStore) {
      rootStoreSnapshot.routeDetailStore = rootStore.routeDetailStore
      storesProcessed.push('routeDetailStore')
    }
  } catch (error) {
    console.error('Failed to backup routeDetailStore:', error)
    throw new Error(`RouteDetailStore backup failed: ${error}`)
  }

  try {
    if (rootStore.lineDetailStore) {
      rootStoreSnapshot.lineDetailStore = rootStore.lineDetailStore
      storesProcessed.push('lineDetailStore')
    }
  } catch (error) {
    console.error('Failed to backup lineDetailStore:', error)
    throw new Error(`LineDetailStore backup failed: ${error}`)
  }

  try {
    if (rootStore.stopScheduleStore) {
      rootStoreSnapshot.stopScheduleStore = rootStore.stopScheduleStore
      storesProcessed.push('stopScheduleStore')
    }
  } catch (error) {
    console.error('Failed to backup stopScheduleStore:', error)
    throw new Error(`StopScheduleStore backup failed: ${error}`)
  }

  try {
    if (rootStore.alertsStore) {
      rootStoreSnapshot.alertsStore = rootStore.alertsStore
      storesProcessed.push('alertsStore')
    }
  } catch (error) {
    console.error('Failed to backup alertsStore:', error)
    throw new Error(`AlertsStore backup failed: ${error}`)
  }

  return { snapshot: rootStoreSnapshot, storesProcessed }
}

// Improved backupRootStore with comprehensive error handling and reporting
async function backupRootStore(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; report: any }> {
  const startTime = Date.now()
  let storesProcessed: string[] = []

  try {
    const sessionDir = `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`
    const exists = await RNFS.exists(sessionDir)
    if (!exists) {
      console.log('Session directory does not exist, creating it')
    }
    const filePath = `${sessionDir}/rootstore.json`

    // Create rootstore snapshot using helper function
    const snapshotResult = createRootStoreSnapshot(rootStore)
    storesProcessed = snapshotResult.storesProcessed

    const backupContent = JSON.stringify(snapshotResult.snapshot, null, 2)
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

// Enhanced backupDatabase function
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
      pendingSessionReport = report
      return true
    } else {
      pendingSessionReport = report
      console.error('RootStore backup failed')
      return false
    }
  } catch (error) {
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

    pendingSessionReport = report
    console.error('Backup failed:', error)
    return false
  }
}

// Helper function to apply rootstore data
function applyRootStoreData(
  rootStoreData: any,
  rootStore: Instance<typeof RootStore>,
): { storesProcessed: string[]; storesFailed: string[] } {
  const storesProcessed: string[] = []
  const storesFailed: string[] = []

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

    // User store second
    if (rootStoreData.userStore) {
      try {
        rootStore.userStore.restore(rootStoreData.userStore)
        storesProcessed.push('userStore')
      } catch (error) {
        console.error('UserStore restore failed:', error)
        storesFailed.push('userStore')
      }
    }

    // Restore tripPlannerStore specifically
    if (rootStoreData.tripPlannerStore) {
      try {
        if (rootStore.tripPlannerStore?.restore) {
          rootStore.tripPlannerStore.restore(rootStoreData.tripPlannerStore)
          storesProcessed.push('tripPlannerStore')
        }
      } catch (error) {
        console.error('TripPlannerStore restore failed:', error)
        storesFailed.push('tripPlannerStore')
      }
    }

    // Restore nearbyStore (note: only selectedMode persists, stops are volatile)
    if (rootStoreData.nearbyStore) {
      try {
        if (rootStore.nearbyStore?.restore) {
          rootStore.nearbyStore.restore(rootStoreData.nearbyStore)
          storesProcessed.push('nearbyStore')
        }
      } catch (error) {
        console.error('NearbyStore restore failed:', error)
        storesFailed.push('nearbyStore')
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

    // Restore uiStore
    if (rootStoreData.uiStore) {
      try {
        if (rootStore.uiStore?.restore) {
          rootStore.uiStore.restore(rootStoreData.uiStore)
          storesProcessed.push('uiStore')
        }
      } catch (error) {
        console.error('UIStore restore failed:', error)
        storesFailed.push('uiStore')
      }
    }

    // Restore linesStore
    if (rootStoreData.linesStore) {
      try {
        if (rootStore.linesStore?.restore) {
          rootStore.linesStore.restore(rootStoreData.linesStore)
          storesProcessed.push('linesStore')
        }
      } catch (error) {
        console.error('LinesStore restore failed:', error)
        storesFailed.push('linesStore')
      }
    }

    // Restore routeOptionsStore
    if (rootStoreData.routeOptionsStore) {
      try {
        if (rootStore.routeOptionsStore?.restore) {
          rootStore.routeOptionsStore.restore(rootStoreData.routeOptionsStore)
          storesProcessed.push('routeOptionsStore')
        }
      } catch (error) {
        console.error('RouteOptionsStore restore failed:', error)
        storesFailed.push('routeOptionsStore')
      }
    }

    // Restore routeDetailStore
    if (rootStoreData.routeDetailStore) {
      try {
        if (rootStore.routeDetailStore?.restore) {
          rootStore.routeDetailStore.restore(rootStoreData.routeDetailStore)
          storesProcessed.push('routeDetailStore')
        }
      } catch (error) {
        console.error('RouteDetailStore restore failed:', error)
        storesFailed.push('routeDetailStore')
      }
    }

    // Restore lineDetailStore
    if (rootStoreData.lineDetailStore) {
      try {
        if (rootStore.lineDetailStore?.restore) {
          rootStore.lineDetailStore.restore(rootStoreData.lineDetailStore)
          storesProcessed.push('lineDetailStore')
        }
      } catch (error) {
        console.error('LineDetailStore restore failed:', error)
        storesFailed.push('lineDetailStore')
      }
    }

    // Restore stopScheduleStore
    if (rootStoreData.stopScheduleStore) {
      try {
        if (rootStore.stopScheduleStore?.restore) {
          rootStore.stopScheduleStore.restore(rootStoreData.stopScheduleStore)
          storesProcessed.push('stopScheduleStore')
        }
      } catch (error) {
        console.error('StopScheduleStore restore failed:', error)
        storesFailed.push('stopScheduleStore')
      }
    }

    // Restore alertsStore
    if (rootStoreData.alertsStore) {
      try {
        if (rootStore.alertsStore?.restore) {
          rootStore.alertsStore.restore(rootStoreData.alertsStore)
          storesProcessed.push('alertsStore')
        }
      } catch (error) {
        console.error('AlertsStore restore failed:', error)
        storesFailed.push('alertsStore')
      }
    }
  })

  return { storesProcessed, storesFailed }
}

// Simplified restore for transit app
async function restoreRootStore(
  sessionId: string,
  rootStore: Instance<typeof RootStore>,
): Promise<{ success: boolean; report: any }> {
  const startTime = Date.now()
  let storesProcessed: string[] = []
  let storesFailed: string[] = []

  try {
    const sessionDir = await checkSessionDirectory(sessionId)
    const filePath = `${sessionDir}/rootstore.json`

    const exists = await RNFS.exists(filePath)
    if (!exists) {
      throw new Error('RootStore backup not found')
    }

    const content = await RNFS.readFile(filePath, 'utf8')
    const rootStoreData = JSON.parse(content)

    console.log('Starting store restoration with internal self-management...')

    // Apply rootstore data using helper function
    const result = applyRootStoreData(rootStoreData, rootStore)
    storesProcessed = result.storesProcessed
    storesFailed = result.storesFailed

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
    return { success: statusCode !== 'error', report }
  } catch (error) {
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

// Database restore function
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

    // Restore stores
    const { success, report } = await restoreRootStore(sessionId, rootStore)

    pendingSessionReport = report

    if (success || report.statusCode === 'partial_success') {
      console.log('Database and RootStore restored:', report.statusMessage)
      return true
    } else {
      console.error('Restore failed:', report.statusMessage)
      return false
    }
  } catch (error) {
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

    pendingSessionReport = report
    console.error('Restore failed:', error)
    return false
  }
}

// Helper function to map tracked routes to actual app routes
function mapRouteToActualPath(trackedRoute: string): string {
  // Handle static tab routes
  const routeMap: { [key: string]: string } = {
    '/plan': '/(tabs)/plan',
    '/nearby': '/(tabs)/nearby',
    '/lines': '/(tabs)/lines',
    '/saved': '/(tabs)/saved',
    '/profile': '/(tabs)/profile',
  }

  // Check if it's a static route that needs mapping
  if (routeMap[trackedRoute]) {
    return routeMap[trackedRoute]
  }

  // Check if it's already a correct tab route
  if (trackedRoute.startsWith('/(tabs)/')) {
    return trackedRoute
  }

  // Handle dynamic and static routes that don't need mapping
  // - /lines/[lineId] - line details
  // - /lines/[lineId]/stops/[stopId] - stop details
  // - /routes/route-options, /routes/route-detail - route screens
  // - /help, /about - info screens
  if (
    trackedRoute.startsWith('/lines/') ||
    trackedRoute.startsWith('/routes/') ||
    trackedRoute.startsWith('/route-options') ||
    trackedRoute.startsWith('/route-detail') ||
    trackedRoute === '/help' ||
    trackedRoute === '/about'
  ) {
    return trackedRoute
  }

  // For any other route, return as-is (fallback)
  console.warn('Unknown route format, using as-is:', trackedRoute)
  return trackedRoute
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

function setDeeplinkProcessing(rootStore: any, processing: boolean) {
  runInAction(() => {
    rootStore.uiStore.setDeeplinkLoading(processing)
  })
  writeAppState(!processing, pendingSessionReport as SessionReport).then(() => {
    pendingSessionReport = null
  })
}

// Simplified deeplink handler for transit app
async function handleDeeplink(url: string, rootStore: any) {
  if (!url) return

  if (isProcessingDeeplink) {
    console.log('Already processing a deeplink, ignoring:', url)
    return
  }

  if (!url.startsWith('andojotransit://')) {
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
        router.replace('/(auth)/login')
      } catch (error) {
        console.error('Silent reset failed:', error)
        RNFS.unlink(RNFS.ExternalDirectoryPath + '/sessions')
        router.replace('/(auth)/login')
      }
      return
    }

    // Handle regular session-based deeplinks
    if (action === 'get') {
      if (!sessionId) return
      await rootStore.sessionStore.handleDeepLink(sessionId)
      await backupDatabase(sessionId, rootStore as Instance<typeof RootStore>)
    } else if (action === 'append') {
      console.log('Appending database', sessionId || 'no-session-id')
      // Generate sessionId if not provided
      const appendSessionId = sessionId || `append_${Date.now()}`
      await rootStore.sessionStore.handleDeepLink(appendSessionId)
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

        // Create rootstore snapshot using helper function
        const { snapshot: rootStoreSnapshot } =
          createRootStoreSnapshot(rootStore)

        const rootstoreContent = JSON.stringify(rootStoreSnapshot, null, 2)
        const rootstoreFile = `${dbForgePath}/current.json`
        await RNFS.writeFile(rootstoreFile, rootstoreContent, 'utf8')

        console.log(`✅ RootStore saved to db-forge folder: ${rootstoreFile}`)
      } catch (error) {
        console.error('❌ Failed to copy files to db-forge folder:', error)
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

      const targetRoute = existingSession.data.route as string
      console.log('Target route:', targetRoute)

      // Map the tracked route to actual app route
      let normalizedRoute = mapRouteToActualPath(targetRoute)
      console.log('Mapped to actual route:', normalizedRoute)

      // Replace template placeholders with actual values from stores
      if (normalizedRoute.includes('[lineId]')) {
        // Get lineId from lineDetailStore or stopScheduleStore
        const lineId =
          rootStore.lineDetailStore?.lineDetailState?.lineId ||
          rootStore.stopScheduleStore?.stopScheduleState?.lineId
        if (lineId) {
          normalizedRoute = normalizedRoute.replace('[lineId]', lineId)
          console.log('Replaced [lineId] with:', lineId)
        }
      }

      if (normalizedRoute.includes('[stopId]')) {
        // Get stopId from stopScheduleStore
        const stopId = rootStore.stopScheduleStore?.stopScheduleState?.stopId
        if (stopId) {
          normalizedRoute = normalizedRoute.replace('[stopId]', stopId)
          console.log('Replaced [stopId] with:', stopId)
        }
      }

      const currentRoute = getLatestInteraction()?.data?.route
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
    } else if (action === 'dbrefresh') {
      if (!sessionId) {
        console.error('❌ SessionId required for dbrefresh action')
        return
      }

      console.log('🔄 Refreshing modified database and rootstore...')
      try {
        // Load the modified database from db-forge/modified/modified.db
        const modifiedDbPath = `${RNFS.ExternalDirectoryPath}/db-forge/modified/modified.db`
        const dbPath = sqlite.databasePath

        // Check if modified database exists
        const dbExists = await RNFS.exists(modifiedDbPath)
        if (dbExists) {
          // Close current database connection
          await closeConnection()

          // Copy modified database to replace current database
          await RNFS.copyFile(modifiedDbPath, dbPath)

          // Reopen database connection
          await reopenConnection()

          console.log('✅ Modified database refreshed successfully')

          // Refresh stores from the refreshed database
          if (rootStore.tripPlannerStore?.refreshData) {
            await rootStore.tripPlannerStore.refreshData()
          }
        } else {
          console.log('⚠️ No modified database found to refresh')
        }

        // Wait for state to settle
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Navigate to the session route
        const existingSession = rootStore.sessionStore.getSession(sessionId)
        if (!existingSession) {
          Alert.alert('Session not found', 'Please try again')
          return
        }

        const targetRoute = existingSession.data.route as string
        console.log('Target route:', targetRoute)

        // Map the tracked route to actual app route
        const actualRoute = mapRouteToActualPath(targetRoute)

        // Get current route from interaction tracking
        const interaction = getLatestInteraction()
        const currentRoute = interaction?.data?.route
        const mappedCurrentRoute = currentRoute
          ? mapRouteToActualPath(currentRoute)
          : null

        if (!actualRoute) {
          console.warn(
            '[Deeplink] No target route resolved, skipping navigation',
          )
          return
        }

        // Navigate to target route (reload if same route)
        const isReload = mappedCurrentRoute === actualRoute
        if (!isReload) {
          router.push({
            pathname: actualRoute as any,
            params: {
              sessionId,
              sessionTimeStamp: sessionId + Date.now(),
              action,
            },
          })
        }

        console.log(
          `✅ Navigated to session route: ${existingSession.data.route}`,
        )
      } catch (error) {
        console.error(
          '❌ Failed to refresh modified database and rootstore:',
          error,
        )
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
    const httpUrl = url.replace(/^andojotransit:\/\//, 'http://')
    const fullUrl = new URL(httpUrl)
    const searchParams = new URLSearchParams(fullUrl.search)

    const action = searchParams.get('action')
    if (!action) {
      console.log('Missing required action parameter')
      return null
    }

    // Require sessionId for get/set/dbrefresh actions, append can work without sessionId
    const sessionId = searchParams.get('sessionId')
    if (['get', 'set', 'dbrefresh'].includes(action) && !sessionId) {
      console.log('SessionId required for get/set/dbrefresh actions')
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
