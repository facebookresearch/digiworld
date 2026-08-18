// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'

interface AppState {
  isAppReady: boolean
  lastUpdated: number
  appVersion: string
  sessionReport?: SessionReport
}

export interface SessionReport {
  sessionId?: string
  operation: 'backup' | 'restore' | 'reset'
  statusCode: 'success' | 'error' | 'partial_success' | 'aborted'
  statusMessage: string
  timestamp: number
  duration?: number
  reasonForFailure?: string
  stackTrace?: string
  details?: {
    storesProcessed?: string[]
    storesFailed?: string[]
    backupSize?: number
    dbOperations?: string[]
  }
}

const APP_STATE_FILENAME = 'app_state.json'

// Use Android data directory path
const BASE_PATH =
  Platform.OS === 'android'
    ? `${RNFS.ExternalDirectoryPath}` // Points to /storage/emulated/0/Android/data/com.andojo.shop/files
    : RNFS.DocumentDirectoryPath

async function ensureDirectoryExists(path: string) {
  try {
    const exists = await RNFS.exists(path)
    if (!exists) {
      await RNFS.mkdir(path)
    }
  } catch (error) {
    console.error('Error creating directory:', error)
    throw error
  }
}

// Write app state to storage
export async function writeAppState(
  isReady: boolean,
  sessionReport?: SessionReport,
): Promise<void> {
  try {
    const appState: AppState = {
      isAppReady: isReady,
      lastUpdated: Date.now(),
      appVersion: '1.1.0',
      // Clear previous session report and set new one (maintain only one state)
      sessionReport: sessionReport || undefined,
    }

    await ensureDirectoryExists(BASE_PATH)
    const filePath = `${BASE_PATH}/${APP_STATE_FILENAME}`

    await RNFS.writeFile(filePath, JSON.stringify(appState, null, 2), 'utf8')
    console.log('App state written successfully:', filePath)

    if (sessionReport) {
      console.log('Session report:', {
        operation: sessionReport.operation,
        statusCode: sessionReport.statusCode,
        statusMessage: sessionReport.statusMessage,
        sessionId: sessionReport.sessionId,
      })
    }
  } catch (error) {
    console.error('Failed to write app state:', error)
  }
}

// Helper function to create session reports
export function createSessionReport(
  operation: 'backup' | 'restore' | 'reset',
  statusCode: 'success' | 'error' | 'partial_success' | 'aborted',
  statusMessage: string,
  options?: {
    sessionId?: string
    startTime?: number
    reasonForFailure?: string
    error?: Error
    details?: SessionReport['details']
  },
): SessionReport {
  const now = Date.now()

  return {
    sessionId: options?.sessionId,
    operation,
    statusCode,
    statusMessage,
    timestamp: now,
    duration: options?.startTime ? now - options.startTime : undefined,
    reasonForFailure: options?.reasonForFailure,
    stackTrace: options?.error?.stack,
    details: options?.details,
  }
}

// Read app state from storage
export async function readAppState(): Promise<AppState | null> {
  try {
    const filePath = `${BASE_PATH}/${APP_STATE_FILENAME}`
    const exists = await RNFS.exists(filePath)

    if (!exists) {
      console.log('App state file not found in storage')
      return null
    }

    const content = await RNFS.readFile(filePath, 'utf8')
    return JSON.parse(content) as AppState
  } catch (error) {
    console.error('Failed to read app state:', error)
    return null
  }
}
