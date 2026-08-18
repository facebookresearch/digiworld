# UI State Management and Restoration

This document outlines how UI states are captured, managed, and restored across the Andojo application ecosystem using our interaction tracking system and state restoration mechanisms.

## Overview

The UI state management system consists of three main components:

1. **Interaction Tracking** - Captures user interactions and form data
2. **State Persistence** - Stores UI state in sessions and database backups
3. **State Restoration** - Restores UI state when returning to screens

## Interaction Tracking System

### Core Components

The interaction tracking system is implemented in `packages/shared-interaction-tracking/src/index.ts` and provides:

- Global state storage for the latest interaction
- Typed interaction events
- Screen-level tracking hooks
- Form data persistence

### Interaction Types

```typescript
export type InteractionType =
  | 'VIEW_CLICKED'
  | 'VIEW_FOCUSED'
  | 'TEXT_CHANGED'
  | 'SCREEN_MOUNTED'
  | 'SCREEN_UNMOUNTED'
  | 'CONTENT_CHANGED'
  | 'GESTURE_START'
  | 'GESTURE_END'
  | 'NOTIFICATION_CHANGED'
```

### Usage Pattern

```typescript
const { trackScreenMount, trackTextChange, trackContentChange, trackClick } =
  useInteractionTracking('ScreenName', '/path/to/screen')

// Track screen initialization
useEffect(() => {
  trackScreenMount({
    field1: value1,
    field2: value2,
    timestamp: Date.now(),
  })
}, [])

// Track form field changes
const handleFieldChange = (field: string) => (value: string) => {
  trackTextChange(field, value)
  setFieldValue(value)
}

// Track user interactions
const handleButtonPress = () => {
  trackClick('buttonId')
  // Handle button logic
}
```

## State Persistence Architecture

### Session Storage Structure

UI state is persisted in two formats:

1. **Database Backup** - Complete SQLite database snapshot
2. **RootStore Backup** - MobX store state in JSON format

### File Structure

```
RNFS.ExternalDirectoryPath/sessions/
├── {sessionId}/
│   ├── {sessionId}.db          # Database backup
│   └── rootstore.json          # MobX store state
```

### RootStore Backup Format

```json
{
  "sessionStore": {
    "sessions": {
      "sessionId": {
        "id": "sessionId",
        "data": {
          "route": "/screens/compose/mailcompose",
          "sessionData": {
            "formData": {
              "to": "user@example.com",
              "subject": "Draft subject",
              "message": "Draft content",
              "showCc": false,
              "attachments": []
            },
            "currentFocusedElement": "subject",
            "interactionType": "TEXT_CHANGED"
          }
        },
        "timestamp": 1234567890
      }
    }
  },
  "userStore": {
    "currentUser": { /* user data */ },
    "authToken": "token"
  },
  "uiStore": {
    "deeplinkLoading": false
  },
  "timestamp": 1234567890
}
```

## State Restoration Process

### 1. Deeplink Trigger

The Python agent triggers state restoration via deeplink:

```
andojomail://app?action=set&sessionId={sessionId}
```

### 2. Database and Store Restoration

```typescript
// Restore database from backup
await closeConnection()
await RNFS.copyFile(backupPath, dbPath)
await reopenConnection()

// Restore MobX stores
runInAction(() => {
  if (rootStoreData.sessionStore) {
    rootStore.sessionStore.restore(rootStoreData.sessionStore)
  }
  if (rootStoreData.userStore) {
    rootStore.userStore.setCurrentUser(rootStoreData.userStore.currentUser)
    rootStore.userStore.setAuthToken(rootStoreData.userStore.authToken)
  }
})
```

### 3. Screen Navigation and State Application

```typescript
// Navigate to the target screen with session data
router.push({
  pathname: existingSession.data.route,
  params: { 
    sessionId, 
    action, 
    sessionTimeStamp: sessionId + Date.now() 
  },
})
```

## Screen-Level State Restoration

### Email Compose Example

The email compose screen demonstrates comprehensive state restoration:

#### 1. Session Data Loading

```typescript
useEffect(() => {
  const { sessionId } = params
  if (sessionId) {
    const session = sessionStore.getSession(sessionId)
    if (session?.data?.sessionData?.formData) {
      const formData = session.data.sessionData.formData
      
      // Restore form fields
      const fields = ['to', 'cc', 'bcc', 'subject', 'message']
      fields.forEach(field => {
        handleFieldChange(field, true)(formData[field] || '')
      })
      
      // Restore UI state
      setShowCc(formData.showCc || false)
      setAttachments(formData.attachments || [])
      
      // Restore focus
      setTimeout(() => {
        focusField(formData.currentFocusedElement)
      }, 200)
    }
  }
}, [params.sessionId])
```

#### 2. Form Field Tracking

```typescript
const handleFieldChange = (field: string, doTracking = true) => (value: string) => {
  if (doTracking) trackTextChange(field, value)
  
  switch (field) {
    case 'to': setTo(value); break
    case 'cc': setCc(value); break
    case 'subject': setSubject(value); break
    // ... other fields
  }
}
```

#### 3. Complex State Tracking

```typescript
// Track content changes with complex data
trackContentChange({
  interactionType: 'ATTACHMENTS_CHANGED',
  source: 'Compose',
  attachments: [...attachments, ...newAttachments],
})

// Track UI state changes
trackContentChange({
  showCc: !showCc,
})
```

## Best Practices

### 1. Comprehensive State Capture

- Track all form fields and their values
- Capture UI state (modals, expanded sections, etc.)
- Store current focus element for restoration
- Include timestamps for debugging

### 2. Efficient State Updates

- Use `doTracking` parameter to prevent tracking during restoration
- Batch related state changes
- Avoid tracking during initialization

### 3. Focus Management

```typescript
// Register refs for programmatic control
const registerRef = (name: string, ref: any) => {
  if (ref) {
    inputRefs.current[name] = ref
  }
}

// Focus restoration with delay
setTimeout(() => {
  focusField(sessionData.currentFocusedElement)
}, 200)
```

### 4. Error Handling

```typescript
try {
  await restoreDatabase(sessionId, rootStore)
} catch (error) {
  console.error('Restore failed:', error)
  // Fallback to clean state
  router.replace('/screens/auth/login')
}
```

## Integration Points

### 1. Python Agent Integration

The Python agent interacts with the app through:

- File system operations (copying database and JSON files)
- Deeplink triggers for state restoration
- Session directory management

### 2. MobX Store Integration

```typescript
// SessionStore manages session data
class SessionStore {
  sessions = new Map()
  
  handleDeepLink(sessionId: string) {
    // Store current interaction state
    const latestInteraction = getLatestInteraction()
    this.sessions.set(sessionId, {
      id: sessionId,
      data: {
        route: latestInteraction.route,
        sessionData: latestInteraction.data
      }
    })
  }
}
```

### 3. Database Backup Integration

```typescript
// Backup current database state
async function backupDatabase(sessionId: string, rootStore: RootStore) {
  const sessionDir = await ensureSessionDirectory(sessionId)
  const dbPath = sqlite.databasePath
  const backupPath = `${sessionDir}/${sessionId}.db`
  
  await RNFS.copyFile(dbPath, backupPath)
  await backupRootStore(sessionId, rootStore)
}
```

## Debugging and Monitoring

### 1. State Inspection

```typescript
// Log current interaction state
console.log('Latest Interaction:', getLatestInteraction())

// Verify session data
const session = sessionStore.getSession(sessionId)
console.log('Session Data:', session?.data)
```

### 2. File System Verification

```typescript
// Check backup files exist
const backupExists = await RNFS.exists(backupPath)
const rootStoreExists = await RNFS.exists(rootStorePath)
```

### 3. Restoration Validation

```typescript
// Validate restored state matches expected values
useEffect(() => {
  if (params.sessionId) {
    console.log('Restored form state:', { to, cc, subject, message })
  }
}, [params.sessionId, to, cc, subject, message])
```
