// Copyright (c) Meta Platforms, Inc. and affiliates.
import { closeConnection, reopenConnection, resetDatabase, sqlite } from '@/db'
import { mutations } from '@/db/mutations'
import { RootStore } from '@/models/RootStore'
import { router } from 'expo-router'
import { runInAction } from 'mobx'
import { Alert, Linking } from 'react-native'
import * as RNFS from 'react-native-fs'
import {
  writeAppState,
  createSessionReport,
  SessionReport,
} from './appStateManager'
import { getLatestInteraction } from '@andojo/shared-interaction-tracking'
import { requestThemeReload } from './themeReloader'
import { loadActiveTheme } from './themeLoader'
import { notifyEcommerceAssetsRefreshed } from '@/utils/assetImageRefresh'

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

// Helper function to create rootstore snapshot
function createRootStoreSnapshot(rootStore: RootStore): {
  snapshot: any
  storesProcessed: string[]
} {
  const storesProcessed: string[] = []
  const rootStoreSnapshot: any = {
    timestamp: Date.now(),
  }

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
    rootStoreSnapshot.productStore = rootStore.productStore
    storesProcessed.push('productStore')
  } catch (error) {
    console.error('Failed to backup productStore:', error)
    throw new Error(`ProductStore backup failed: ${error}`)
  }

  try {
    rootStoreSnapshot.cartStore = rootStore.cartStore
    storesProcessed.push('cartStore')
  } catch (error) {
    console.error('Failed to backup cartStore:', error)
    throw new Error(`CartStore backup failed: ${error}`)
  }

  try {
    rootStoreSnapshot.orderStore = rootStore.orderStore
    storesProcessed.push('orderStore')
  } catch (error) {
    console.error('Failed to backup orderStore:', error)
    throw new Error(`OrderStore backup failed: ${error}`)
  }

  try {
    rootStoreSnapshot.reviewStore = rootStore.reviewStore
    storesProcessed.push('reviewStore')
  } catch (error) {
    console.error('Failed to backup reviewStore:', error)
    throw new Error(`ReviewStore backup failed: ${error}`)
  }

  try {
    rootStoreSnapshot.uiStore = rootStore.uiStore
    storesProcessed.push('uiStore')
  } catch (error) {
    console.error('Failed to backup uiStore:', error)
    throw new Error(`UIStore backup failed: ${error}`)
  }

  try {
    rootStoreSnapshot.authStore = rootStore.authStore
    storesProcessed.push('authStore')
  } catch (error) {
    console.error('Failed to backup authStore:', error)
    throw new Error(`AuthStore backup failed: ${error}`)
  }

  return { snapshot: rootStoreSnapshot, storesProcessed }
}

// Helper function to apply rootstore data
function applyRootStoreData(
  rootStoreData: any,
  rootStore: RootStore,
): { storesProcessed: string[]; storesFailed: string[] } {
  const storesProcessed: string[] = []
  const storesFailed: string[] = []

  runInAction(() => {
    if (rootStoreData.sessionStore) {
      try {
        rootStore.sessionStore.restore(rootStoreData.sessionStore)
        storesProcessed.push('sessionStore')
      } catch (error) {
        console.error('SessionStore restore failed:', error)
        storesFailed.push('sessionStore')
      }
    }

    if (rootStoreData.userStore) {
      try {
        rootStore.userStore.restore(rootStoreData.userStore)
        storesProcessed.push('userStore')
      } catch (error) {
        console.error('UserStore restore failed:', error)
        storesFailed.push('userStore')
      }
    }

    if (rootStoreData.productStore) {
      try {
        rootStore.productStore.restore(rootStoreData.productStore)
        storesProcessed.push('productStore')
      } catch (error) {
        console.error('ProductStore restore failed:', error)
        storesFailed.push('productStore')
      }
    }

    if (rootStoreData.cartStore) {
      try {
        rootStore.cartStore.restore(rootStoreData.cartStore)
        storesProcessed.push('cartStore')
      } catch (error) {
        console.error('CartStore restore failed:', error)
        storesFailed.push('cartStore')
      }
    }

    if (rootStoreData.orderStore) {
      try {
        rootStore.orderStore.restore(rootStoreData.orderStore)
        storesProcessed.push('orderStore')
      } catch (error) {
        console.error('OrderStore restore failed:', error)
        storesFailed.push('orderStore')
      }
    }

    if (rootStoreData.reviewStore) {
      try {
        rootStore.reviewStore.restore(rootStoreData.reviewStore)
        storesProcessed.push('reviewStore')
      } catch (error) {
        console.error('ReviewStore restore failed:', error)
        storesFailed.push('reviewStore')
      }
    }

    if (rootStoreData.uiStore) {
      try {
        rootStore.uiStore.restore(rootStoreData.uiStore)
        storesProcessed.push('uiStore')
      } catch (error) {
        console.error('UIStore restore failed:', error)
        storesFailed.push('uiStore')
      }
    }

    if (rootStoreData.authStore) {
      try {
        rootStore.authStore.restore(rootStoreData.authStore)
        storesProcessed.push('authStore')
      } catch (error) {
        console.error('AuthStore restore failed:', error)
        storesFailed.push('authStore')
      }
    }
  })

  return { storesProcessed, storesFailed }
}

// Update backupRootStore function with comprehensive error handling and reporting
async function backupRootStore(
  sessionId: string,
  rootStore: RootStore,
): Promise<{ success: boolean; report: any }> {
  const startTime = Date.now()
  let storesProcessed: string[] = []

  try {
    // Snapshot whatever is already in memory — do NOT eagerly load from DB.
    // Eager loading (addresses, payments, cart, orders, reviews) was removed
    // because under I/O contention the heavy async work kept the deep link
    // processing flag locked for too long, causing the app to appear
    // unresponsive and subsequent deep links to be silently dropped.
    // The data will be reloaded from the backed-up DB file on restore.

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
  rootStore: RootStore,
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

// Improved restoreRootStore with comprehensive error handling and reporting
async function restoreRootStore(
  sessionId: string,
  rootStore: RootStore,
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

    console.log('Starting store restoration with internal self-management...')

    // Apply rootstore data using helper function
    const result = applyRootStoreData(rootStoreData, rootStore)
    storesProcessed.push(...result.storesProcessed)
    storesFailed.push(...result.storesFailed)

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

    try {
      // Reset stores to safe state
      if (rootStore.userStore?.logout) {
        await rootStore.userStore.logout()
      }
      if (rootStore.cartStore?.items) {
        rootStore.cartStore.items.clear()
      }
      if (rootStore.orderStore?.orders) {
        rootStore.orderStore.orders.clear()
      }
      if (rootStore.uiStore?.setDeeplinkLoading) {
        rootStore.uiStore.setDeeplinkLoading(false)
      }
    } catch (resetError) {
      console.error('Failed to reset stores to safe state:', resetError)
    }

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

// Enhanced restoreDatabase function with comprehensive reporting
async function restoreDatabase(
  sessionId: string,
  rootStore: RootStore,
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
    await reopenConnection()
    await new Promise(resolve => setTimeout(resolve, 500))

    // Step 3: Now restore stores (DB is guaranteed to be ready)
    const { success, report } = await restoreRootStore(sessionId, rootStore)

    // Write report to app state (clean up previous session report)
    // await writeAppState(success, report)
    pendingSessionReport = report

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

// async function appendMockData(rootStore: any) {
//   try {
//     await mutations.initializeDatabase(false)
//     rootStore.uiStore.setMockDataAppended()
//   } catch (error) {
//     console.error('Append mock data failed:', error)
//   }
// }
// Update handleDeeplink function to handle cleanup action
async function handleDeeplink(url: string, rootStore: any) {
  if (!url) return

  if (isProcessingDeeplink) {
    console.log('Already processing a deeplink, ignoring:', url)
    return
  }

  if (!url.startsWith('andojoshop://')) {
    console.log('Ignoring URL with incorrect scheme:', url)
    return
  }

  try {
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
    } else if (action === 'append-data-to-db') {
      // This action is handled the same way as 'append' - reload stores and signal
      console.log('Appending data to database...')
      try {
        // Reload all stores from database
        await Promise.all([
          rootStore.productStore.loadProducts(),
          rootStore.categoryStore.loadCategories(),
        ])

        if (
          rootStore.userStore.isAuthenticated &&
          rootStore.userStore.user?.id
        ) {
          const userId = rootStore.userStore.user.id
          await Promise.all([
            rootStore.cartStore.loadCart(userId),
            rootStore.orderStore.loadOrders(userId),
          ])
        }

        // Signal that mock data was appended
        rootStore.uiStore.mockDataAppended()
        console.log('✅ Data appended and stores reloaded')
      } catch (error) {
        console.error('Append mock data failed:', error)
        // Still fire the signal even if some stores failed to reload
        rootStore.uiStore.mockDataAppended()
      }
    }

    // Handle regular session-based deeplinks
    if (action === 'get') {
      if (!sessionId) return
      await rootStore.sessionStore.handleDeepLink(sessionId)
      await backupDatabase(sessionId, rootStore as RootStore)
    }
    if (action === 'append') {
      console.log('Appending database', sessionId || 'no-session-id')
      // Generate sessionId if not provided
      const appendSessionId = sessionId || `append_${Date.now()}`
      await rootStore.sessionStore.handleDeepLink(appendSessionId)

      await backupDatabase(appendSessionId, rootStore as RootStore)

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
      await restoreDatabase(sessionId, rootStore as RootStore)
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
      console.log('Navigating to normalized route:', normalizedRoute)

      const timeStamp = Date.now()
      const currentRoute = getLatestInteraction()?.data?.route

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
          params: { sessionId, action, timeStamp },
        })
      } else {
        router.push({
          pathname: normalizedRoute as any,
          params: { sessionId, action, timeStamp },
        })
      }
    } else if (action === 'dbrefresh') {
      if (!sessionId) return
      console.log('🔄 Refreshing modified database...')
      try {
        // Load the modified database from db-forge/modified/modified.db
        const modifiedDbPath = `${RNFS.ExternalDirectoryPath}/db-forge/modified/modified.db`
        const modifiedJsonPath = `${RNFS.ExternalDirectoryPath}/db-forge/modified/current.json`

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

          // Restore rootstore from current.json if it exists (for volatile state)
          let rootStoreData: any = null
          const jsonExists = await RNFS.exists(modifiedJsonPath)
          if (jsonExists) {
            const rootStoreContent = await RNFS.readFile(
              modifiedJsonPath,
              'utf8',
            )
            rootStoreData = JSON.parse(rootStoreContent)

            const result = applyRootStoreData(rootStoreData, rootStore)
            console.log(
              `✅ RootStore restored. Processed: ${result.storesProcessed.join(', ')}`,
            )
            if (result.storesFailed.length > 0) {
              console.warn(
                `⚠️ Some stores failed: ${result.storesFailed.join(', ')}`,
              )
            }
          } else {
            console.log('⚠️ No modified rootstore JSON found to refresh')
          }

          // Signal that mock data was refreshed — stores will reload
          // on demand when screens render. Eager reloading was removed
          // because the heavy async work (loading products, reviews, etc.)
          // kept the isProcessingDeeplink flag locked for too long,
          // causing subsequent deeplinks to be silently dropped.
          rootStore.uiStore.mockDataAppended()
          notifyEcommerceAssetsRefreshed()
          console.log('✅ mockDataAppended signal fired')
        } else {
          console.log('⚠️ No modified database found to refresh')
        }
      } catch (error) {
        console.error('❌ Failed to refresh modified database:', error)
      }
    } else if (action === 'load-theme') {
      // Hot reload theme from device storage
      try {
        console.log('🎨 Loading theme...')

        const themeConfig = await loadActiveTheme()

        if (!themeConfig) {
          console.error('❌ No theme file found on device')
          Alert.alert('Theme Not Found', 'No theme file was found on device.')
          return
        }

        console.log(`✅ Theme loaded: ${themeConfig.name}`)

        // Request immediate hot reload
        requestThemeReload(themeConfig)

        console.log('✅ Theme reloaded successfully (no app restart needed)')
      } catch (error) {
        console.error('❌ Failed to load theme:', error)
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
    const httpUrl = url.replace(/^andojoshop:\/\//, 'http://')
    const fullUrl = new URL(httpUrl)
    const searchParams = new URLSearchParams(fullUrl.search)

    const action = searchParams.get('action')
    if (!action) {
      console.log('Missing required action parameter')
      return null
    }

    // Only require sessionId for get/set/dbrefresh actions, append can work without sessionId
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
