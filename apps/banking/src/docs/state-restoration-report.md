# State Restoration Report: Video App Deep Link Handler

## Overview

This report analyzes the state restoration mechanism implemented in `apps/video/src/utils/deeplinkHandler.ts`, which enables seamless app state backup and restoration through deep link interactions. The system supports automated testing scenarios where app state needs to be preserved and restored across different test sessions.

## Architecture

### Core Components

1. **Deep Link Handler** - Main orchestrator for state operations
2. **Database Backup/Restore** - SQLite database file operations
3. **RootStore Backup/Restore** - MobX state tree serialization
4. **Session Management** - File-based session storage
5. **App State Manager** - Status reporting and monitoring

### State Management Stores

The system manages state across multiple MobX stores:

- **SessionStore** - Session metadata and routing information
- **UserStore** - User authentication and profile data
- **VideoStore** - Video playback state, watch history, subscriptions
- **CommentStore** - Comment editing state and UI interactions
- **PlaylistStore** - Playlist management and UI state
- **UploadStore** - Video upload progress and metadata
- **SearchStore** - Search queries and results
- **AuthStore** - Authentication tokens and state

## Deep Link Protocol

### URL Scheme
```
andojovideo://action?sessionId=<uuid>&action=<operation>
```

### Supported Actions

1. **`get`** - Backup current app state to session
2. **`set`** - Restore app state from session
3. **`reset`** - Perform silent database reset

## State Backup Process

### Database Backup (`backupDatabase`)

1. **Session Directory Setup**
   - Clears existing sessions directory
   - Creates new session-specific directory
   - Path: `${RNFS.ExternalDirectoryPath}/sessions/${sessionId}`

2. **SQLite Database Copy**
   - Copies main database file: `${sessionId}.db`
   - Includes WAL and SHM files if present
   - Source: `sqlite.databasePath`

3. **RootStore Serialization**
   - Selective backup of volatile state only
   - Excludes static data (reloaded from database)
   - Reduces backup size from ~500KB-1MB to ~5-20KB

### Store-Specific Backup Strategy

```typescript
// Optimized backup approach
const rootStoreSnapshot = {
  timestamp: Date.now(),
  sessionStore: rootStore.sessionStore,
  userStore: {
    ...rootStore.userStore,
    currentUser: rootStore.userStore.user?.id ? rootStore.userStore.user : null
  },
  videoStore: {
    playbackState: rootStore.videoStore.playbackState,
    watchHistory: rootStore.videoStore.watchHistory,
    userSubscriptions: rootStore.videoStore.userSubscriptions,
    recommendationFeeds: rootStore.videoStore.recommendationFeeds,
    videoEditForm: rootStore.videoStore.videoEditForm
  },
  // ... other stores
}
```

## State Restoration Process

### Database Restoration (`restoreDatabase`)

1. **Database File Restoration**
   - Closes existing database connection
   - Copies backup database file to active location
   - Handles WAL/SHM files
   - Reopens database connection

2. **Database Validation**
   - Validates required tables exist
   - Uses polling mechanism with timeout
   - Required tables: `videos`, `channels`, `playlists`, `history`, `users`, `comments`
   - Max wait time: 60 seconds, poll interval: 250ms

3. **Store Restoration**
   - Two-phase restoration approach
   - Phase 1: Synchronous volatile state restoration
   - Phase 2: Asynchronous store-specific restoration with self-management

### Restoration Phases

#### Phase 1: Synchronous Restoration
```typescript
runInAction(() => {
  // Restore session store first
  rootStore.sessionStore.restore(rootStoreData.sessionStore)
  
  // User store second (dependency for other stores)
  rootStore.userStore.restore(rootStoreData.userStore)
  
  // Other volatile stores
  ['authStore', 'uploadStore', 'searchStore'].forEach(storeName => {
    rootStore[storeName].restore(rootStoreData[storeName])
  })
})
```

#### Phase 2: Asynchronous Restoration
- Each store manages its own restoration process
- Parallel execution using `Promise.allSettled`
- Internal self-management for data reloading
- Graceful error handling per store

## Error Handling & Recovery

### Backup Error Handling
- Individual store backup with isolated error handling
- Comprehensive error reporting with session details
- Graceful degradation on partial failures

### Restoration Error Handling
- Critical error detection with process abortion
- Safe state reset on restoration failure
- Store-specific reset methods:
  - `videoStore.resetPlayback()`
  - `authStore.reset()`
  - `commentStore.clearComments()`
  - `playlistStore.logOut()`

### Database Safety Measures
- Connection management with proper cleanup
- Database readiness validation
- Timeout mechanisms for operations
- WAL/SHM file handling

## Performance Metrics

### 📊 Function Performance Report

| Function                     | Calls | Avg (s)   | Min (s)   | Max (s)   | Total (s)   |
|------------------------------|-------|-----------|-----------|-----------|-------------|
| copy_test_data               | 1     | 0.32160   | 0.32160   | 0.32160   | 0.32160     |
| __init__                     | 1     | 0.32199   | 0.32199   | 0.32199   | 0.32199     |
| run_adb_command              | 3665  | 0.01742   | 0.01323   | 0.11522   | 63.82788    |
| is_ready                     | 170   | 0.02064   | 0.01415   | 0.05663   | 3.50818     |
| wait_for_ready               | 170   | 0.02074   | 0.01423   | 0.05673   | 3.52514     |
| dispatch_deeplink_to_android | 85    | 0.05201   | 0.03683   | 0.09830   | 4.42124     |
| set_environment              | 5     | 11.58126  | 11.11016  | 11.88068  | 57.90632    |
| _check_env_set               | 240   | 0.00000   | 0.00000   | 0.00002   | 0.00062     |
| **backup_app_data**          | **60**| **2.12541**| **2.09328**| **2.16824**| **127.52481** |
| **persist_state**            | **60**| **2.22680**| **2.17593**| **2.28157**| **133.60776** |
| restore_app_data             | 60    | 0.05663   | 0.04762   | 0.11586   | 3.39808     |
| rollback_state               | 60    | 0.27313   | 0.23717   | 0.33239   | 16.38781    |
| **TOTAL**                    | **4577** | -      | -         | -         | **414.75143** |

### Key Performance Insights

1. **Backup Operations** (`backup_app_data`):
   - Average: 2.13 seconds per operation
   - Consistent performance (min: 2.09s, max: 2.17s)
   - Total time for 60 operations: 127.52 seconds

2. **State Persistence** (`persist_state`):
   - Average: 2.23 seconds per operation
   - Slightly slower than backup due to file I/O
   - Total time for 60 operations: 133.61 seconds

3. **Restoration Speed** (`restore_app_data`):
   - Significantly faster: 0.057 seconds average
   - 37x faster than backup operations
   - Efficient due to optimized restoration process

4. **ADB Communication Overhead**:
   - 3,665 ADB commands with 1.74ms average
   - Total ADB time: 63.83 seconds (15.4% of total time)

## Session Reporting & Error Handling

### Report Structure
The system uses a comprehensive reporting structure defined in `appStateManager.ts`:

```typescript
interface SessionReport {
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
    dbValidationAttempts?: number
  }
}
```

### Session Report Creation Process

#### 1. Report Factory Function
The `createSessionReport()` function in `appStateManager.ts` serves as the central factory for creating standardized reports:

```typescript
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
```

#### 2. Error Capture Mechanisms

**Backup Error Handling:**
```typescript
// Individual store backup with error isolation
try {
  rootStoreSnapshot.sessionStore = rootStore.sessionStore
  storesProcessed.push('sessionStore')
} catch (error) {
  console.error('Failed to backup sessionStore:', error)
  throw new Error(`SessionStore backup failed: ${error}`)
}

// Comprehensive error report creation
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
```

**Restoration Error Handling:**
```typescript
// Critical error detection with process abortion
try {
  // Restoration logic...
} catch (error) {
  console.error('Critical error during restoration, aborting process:', error)
  
  // Safe state reset
  if (rootStore.videoStore?.resetPlayback) {
    rootStore.videoStore.resetPlayback()
  }
  
  // Create abort report
  const report = createSessionReport(
    'restore',
    'aborted',
    'Restoration aborted due to critical error',
    {
      sessionId,
      startTime,
      reasonForFailure: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : new Error(String(error)),
      details: { storesProcessed, storesFailed },
    },
  )
}
```

#### 3. Report Persistence & Storage

**App State Integration:**
```typescript
// Write report to persistent storage
await writeAppState(success, report)

// Storage structure in app_state.json
interface AppState {
  isAppReady: boolean
  lastUpdated: number
  appVersion: string
  sessionReport?: SessionReport  // Single active report
}
```

**File System Storage:**
- **Location:** `${RNFS.ExternalDirectoryPath}/app_state.json`
- **Format:** JSON with pretty printing for debugging
- **Persistence:** Survives app restarts and system reboots
- **Access:** External storage accessible by testing frameworks

#### 4. Error Classification System

**Status Codes:**
- **`success`** - All operations completed without errors
- **`partial_success`** - Some stores failed but core functionality restored
- **`error`** - Critical failure, operation could not complete
- **`aborted`** - Process terminated due to safety concerns

**Error Context Capture:**
```typescript
// Stack trace preservation
stackTrace: options?.error?.stack

// Failure reason categorization
reasonForFailure: options?.reasonForFailure

// Operational context
details: {
  storesProcessed: ['sessionStore', 'userStore'],
  storesFailed: ['videoStore'],
  dbOperations: ['database_restore', 'table_validation'],
  dbValidationAttempts: 15,
  backupSize: 15420
}
```

### Real-time Monitoring Integration

#### 1. Console Logging
```typescript
// Operation start logging
console.log('Starting store restoration with internal self-management...')

// Progress tracking
console.log(`Database validated successfully after ${attempts} attempts`)

// Error logging with context
console.error('SessionStore restore failed:', error)
```

#### 2. Performance Tracking
```typescript
// Duration calculation
const startTime = Date.now()
// ... operations ...
duration: options?.startTime ? now - options.startTime : undefined
```

#### 3. UI State Updates
```typescript
// Loading state management
function setDeeplinkProcessing(rootStore: any, processing: boolean) {
  runInAction(() => {
    rootStore.uiStore.setDeeplinkLoading(processing)
  })
  
  if (processing) {
    writeAppState(false) // App not ready during processing
  }
}
```

### Error Recovery Strategies

#### 1. Store-Level Recovery
```typescript
// Individual store reset methods
if (rootStore.videoStore?.resetPlayback) {
  rootStore.videoStore.resetPlayback()
}
if (rootStore.authStore?.reset) {
  rootStore.authStore.reset()
}
```

#### 2. Database Recovery
```typescript
// Connection recovery
try {
  await closeConnection()
  await new Promise(resolve => setTimeout(resolve, 500))
  reopenConnection()
} catch (reopenError) {
  console.error('Failed to recover database state:', reopenError)
}
```

#### 3. Safe State Fallbacks
```typescript
// Navigation fallback
router.replace('/login')

// Session cleanup
RNFS.unlink(RNFS.ExternalDirectoryPath + '/sessions')
```

### Testing & Debugging Support

#### 1. Report Accessibility
- External storage location for test framework access
- JSON format for easy parsing and validation
- Comprehensive error context for debugging

#### 2. Performance Metrics Integration
- Operation timing for performance regression detection
- Store-level success/failure tracking
- Database validation attempt monitoring

#### 3. Automated Error Analysis
- Structured error categorization
- Stack trace preservation for debugging
- Operational context for root cause analysis

## Route Normalization

### Path Processing
The system includes sophisticated route normalization for navigation:

```typescript
function normalizeRoutePath(route: string): string {
  // Remove leading slashes
  let normalizedPath = route.replace(/^\/+/, '')
  
  // Handle group routing format
  if (normalizedPath.includes('address/')) {
    normalizedPath = `(app)/(drawer)/${normalizedPath}`
  } else if (normalizedPath.includes('orders/')) {
    normalizedPath = `screens/${normalizedPath}`
  }
  
  return '/' + normalizedPath
}
```

## Concurrency & Safety

### Processing Lock
- Global `isProcessingDeeplink` flag prevents concurrent operations
- UI loading state management via `setDeeplinkProcessing()`
- Graceful handling of duplicate requests

### Database Connection Management
- Proper connection lifecycle management
- Connection pooling considerations
- WAL mode compatibility

## Testing Integration

### Automated Test Support
- Session-based state isolation
- Deterministic state restoration
- Test data persistence across app restarts
- Performance monitoring integration

### Test Scenarios
1. **State Backup**: Capture app state at specific test points
2. **State Restoration**: Resume from saved state for continued testing
3. **Reset Operations**: Clean slate for new test scenarios
4. **Performance Validation**: Monitor operation timing

## Recommendations

### Performance Optimizations
1. **Parallel Store Operations**: Already implemented for restoration
2. **Selective Backup**: Focus on volatile state only
3. **Compression**: Consider gzip for large state objects
4. **Caching**: Database validation results caching

### Reliability Improvements
1. **Retry Mechanisms**: For failed operations
2. **Checksum Validation**: Verify backup integrity
3. **Incremental Backups**: Only changed state
4. **Rollback Capabilities**: Enhanced error recovery

### Monitoring Enhancements
1. **Real-time Metrics**: Operation timing dashboards
2. **Error Analytics**: Failure pattern analysis
3. **Performance Alerts**: Threshold-based notifications
4. **Usage Statistics**: Operation frequency tracking

## Conclusion

The state restoration system provides a robust foundation for automated testing scenarios with comprehensive backup/restore capabilities. The performance metrics show consistent operation timing with efficient restoration processes. The modular architecture allows for future enhancements while maintaining reliability and safety through comprehensive error handling and validation mechanisms.

The system successfully balances performance (sub-3-second operations) with reliability (comprehensive error handling) while providing detailed reporting for monitoring and debugging purposes.