<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Transit App Database Layer

Complete database implementation for the transit application using Drizzle ORM with expo-sqlite.

## 📁 File Structure

```
src/db/
├── schema.ts           # Database schema definitions
├── migrations/
│   ├── index.ts        # Migration scripts
│   └── execute-statements.ts
├── mutations.ts        # Write operations (INSERT, UPDATE, DELETE)
├── queries.ts          # Read operations (SELECT)
├── client.ts           # Database client
└── index.ts            # Main database exports
```

## 🗄️ Schema Overview

### Core Tables
- **users** - User accounts with authentication
- **areas** - Geographic districts/neighborhoods (6 areas)
- **stops** - Transit stops with coordinates and facilities (12 stops)
- **stopPlatforms** - Physical platforms at each stop
- **lines** - Bus/subway/train lines (10 lines)
- **lineStops** - Junction table for lines ↔ stops with sequence

### Service Management
- **serviceAlerts** - System alerts and notifications
- **alertLines** - Junction table for alerts ↔ lines
- **alertStops** - Junction table for alerts ↔ stops

### User Features
- **userPreferences** - Home/work stops, modes, notifications
- **recentSearches** - Search history for quick access
- **savedRoutes** - Favorite routes with reminders

### Trip Planning
- **tripOptions** - Calculated route options
- **tripSteps** - Step-by-step journey instructions
- **appConstants** - Application configuration

## 🔧 Mutations (mutations.ts)

### Database Initialization
```typescript
mutations.initializeDatabase()
// Loads all mock data, creates indexes, sets up relationships
```

### User Mutations
- `createUser(userData)` - Register new user
- `updateUser(userId, userData)` - Update user profile
- `softDeleteUser(userId)` - Soft delete (sets deletedAt)

### User Preferences
- `createOrUpdateUserPreferences(userId, preferences)` - Set home/work stops, modes, notifications

### Saved Routes
- `createSavedRoute(routeData)` - Save a favorite route
- `updateSavedRoute(routeId, routeData)` - Update route name or settings
- `deleteSavedRoute(routeId)` - Remove saved route

### Recent Searches
- `createRecentSearch(searchData)` - Log a search
- `deleteRecentSearch(searchId)` - Remove search
- `clearRecentSearches(userId)` - Clear all user searches

### Service Alerts (Admin)
- `createServiceAlert(alertData)` - Create new alert with affected lines/stops
- `updateServiceAlert(alertId, alertData)` - Update alert details
- `deactivateServiceAlert(alertId)` - Deactivate without deleting
- `deleteServiceAlert(alertId)` - Permanently remove alert

### Trip Caching
- `cacheTripOption(tripData)` - Cache calculated route with steps
- `clearOldTripOptions(olderThanDays)` - Clean old cached trips (default 7 days)

### App Constants
- `setAppConstant(key, value)` - Set or update configuration value

## 🔍 Queries (queries.ts)

### User Queries
- `getUserById(userId)` - Get user by ID
- `getUserByEmail(email)` - Find user by email
- `getUserByUsername(username)` - Find user by username
- `getAllUsers()` - Get all active users
- `getUserPreferences(userId)` - Get user preferences with parsed JSON

### Area Queries
- `getAllAreas()` - Get all geographic areas
- `getAreaById(areaId)` - Get specific area

### Stop Queries
- `getAllStops()` - Get all stops with parsed JSON
- `getStopById(stopId)` - Get stop details
- `getStopsByArea(areaId)` - Get stops in an area
- `getStopsByMode(mode)` - Filter stops by transit mode
- `getNearbyStops(lat, lon, radiusKm)` - Find stops near coordinates (Haversine)
- `searchStops(searchTerm)` - Search by name or description

### Platform Queries
- `getPlatformsByStop(stopId)` - Get all platforms at a stop
- `getPlatformByStopAndMode(stopId, mode)` - Get specific platform

### Line Queries
- `getAllLines()` - Get all transit lines
- `getLineById(lineId)` - Get line details
- `getLinesByMode(mode)` - Filter by bus/subway/train
- `getLinesByStatus(status)` - Get on-time/delayed lines
- `getLinesByStop(stopId)` - Get lines serving a stop
- `getStopsByLine(lineId)` - Get stops on a line (ordered)
- `getLineStopSequence(lineId, stopId)` - Get stop position on line

### Service Alert Queries
- `getAllActiveAlerts()` - Get active alerts sorted by severity
- `getAlertsBySeverity(severity)` - Filter by low/medium/high
- `getAlertsByLine(lineId)` - Get alerts affecting a line
- `getAlertsByStop(stopId)` - Get alerts affecting a stop
- `getAlertById(alertId)` - Get full alert with affected lines/stops

### Saved Routes Queries
- `getSavedRoutesByUser(userId)` - Get user's saved routes
- `getSavedRouteById(routeId)` - Get specific route
- `getSavedRouteByUserAndStops(userId, origin, dest)` - Check if route exists

### Recent Searches Queries
- `getRecentSearchesByUser(userId, limit)` - Get recent searches (default 10)

### Trip Queries
- `getTripOptionById(tripId)` - Get trip with parsed tags
- `getTripOptionsByRoute(origin, dest)` - Get all options for a route
- `getTripOptionsByTag(tag)` - Filter by fastest/lowest-cost/fewest-transfers
- `getRecentTripOptions(limit)` - Get recently calculated trips
- `getStepsByTripOption(tripId)` - Get steps for a trip
- `getTripOptionWithSteps(tripId)` - Get complete trip with steps

### App Constants Queries
- `getAppConstant(key)` - Get single constant
- `getAllAppConstants()` - Get all as key-value object

### Complex Queries (Multiple Joins)
- `getStopDetailsWithPlatformsAndLines(stopId)` - Complete stop info with platforms, lines, alerts, area
- `getLineDetailsWithStops(lineId)` - Complete line info with stops and alerts
- `getUserDashboardData(userId)` - Full dashboard: user, preferences, saved routes, recent searches, alerts

### Search & Discovery
- `searchTransit(searchTerm)` - Search both stops and lines
- `getPopularRoutes(limit)` - Most frequently saved routes
- `getSystemStatus()` - Overall system stats (stops, lines, alerts, delays)

## 📊 Feature Mapping (from feature-scope.md)

### 1. Plan Trip
```typescript
// Search for trips
const trips = await queries.getTripOptionsByRoute(originId, destId)

// Save search
await mutations.createRecentSearch({
  userId, origin, destination, modeFilters
})
```

### 2. Search Results
```typescript
// Filter by tag
const fastest = await queries.getTripOptionsByTag('fastest')
const cheapest = await queries.getTripOptionsByTag('lowest-cost')
```

### 3. Trip Details
```typescript
// Get full trip with steps
const trip = await queries.getTripOptionWithSteps(tripId)

// Save route
await mutations.createSavedRoute({
  userId, name, originStopId, destinationStopId, preferredMode
})
```

### 4. Nearby
```typescript
// Get nearby stops
const nearby = await queries.getNearbyStops(lat, lon, 1.0) // 1km radius

// Filter by mode
const busStops = await queries.getStopsByMode('bus')
```

### 5. Stop Details
```typescript
// Get complete stop info
const stopDetails = await queries.getStopDetailsWithPlatformsAndLines(stopId)
// Returns: stop, area, platforms, lines, alerts
```

### 6. Saved Routes
```typescript
// Get user's saved routes
const routes = await queries.getSavedRoutesByUser(userId)

// Delete route
await mutations.deleteSavedRoute(routeId)
```

### 7. Profile & Preferences
```typescript
// Get preferences
const prefs = await queries.getUserPreferences(userId)

// Update preferences
await mutations.createOrUpdateUserPreferences(userId, {
  homeStopId: 'stop-8',
  workStopId: 'stop-2',
  preferredModes: ['subway', 'train'],
  notificationServiceAlerts: true
})
```

### 8. Service Alerts
```typescript
// Get all active alerts
const alerts = await queries.getAllActiveAlerts()

// Get alerts by severity
const highAlerts = await queries.getAlertsBySeverity('high')

// Get alerts for a line
const lineAlerts = await queries.getAlertsByLine('line-s1')
```

## 🚀 Usage Examples

### Initialize Database
```typescript
import { mutations } from '@/db/mutations'

const result = await mutations.initializeDatabase()
if (result.success) {
  console.log('Database ready!')
}
```

### Search and Plan Trip
```typescript
import { queries } from '@/db/queries'

// Find stops
const stops = await queries.searchStops('civic')

// Get trip options
const trips = await queries.getTripOptionsByRoute('stop-8', 'stop-2')

// Get fastest option
const fastest = trips.find(t => t.tags.includes('fastest'))

// Get steps
const tripWithSteps = await queries.getTripOptionWithSteps(fastest.id)
```

### Get Nearby Transit
```typescript
// User's current location
const { latitude, longitude } = await getCurrentLocation()

// Find nearby stops (1km radius)
const nearbyStops = await queries.getNearbyStops(latitude, longitude, 1.0)

// For each stop, get lines
for (const stop of nearbyStops) {
  const lines = await queries.getLinesByStop(stop.id)
  console.log(`${stop.name}: ${lines.map(l => l.shortName).join(', ')}`)
}
```

### Check Service Alerts
```typescript
// Get all active alerts
const alerts = await queries.getAllActiveAlerts()

// Check specific line
const lineAlerts = await queries.getAlertsByLine('line-b1')

// Check specific stop
const stopAlerts = await queries.getAlertsByStop('stop-2')
```

### User Dashboard
```typescript
// Get everything for dashboard
const dashboard = await queries.getUserDashboardData(userId)

console.log('User:', dashboard.user.username)
console.log('Home Stop:', dashboard.preferences.homeStop?.name)
console.log('Saved Routes:', dashboard.savedRoutes.length)
console.log('Recent Searches:', dashboard.recentSearches.length)
console.log('Active Alerts:', dashboard.activeAlerts.length)
```

## 🔐 Data Integrity

### Foreign Keys
All relationships enforce referential integrity:
- CASCADE: Delete children when parent deleted
- SET NULL: Nullify reference when parent deleted

### Indexes
Optimized queries with indexes on:
- User email, username (unique)
- Stop name, area, location (lat/lon)
- Line mode, status
- Alert severity, active status
- Timestamps for sorting

### JSON Fields
Arrays stored as JSON strings:
- `modesServed`, `facilities`, `amenities`, `accessibility` (stops)
- `preferredModes` (userPreferences)
- `modeFilters` (recentSearches)
- `tags` (tripOptions)
- `recommendedAlternatives` (serviceAlerts)

All queries automatically parse JSON to native arrays.

## 📈 Performance Considerations

### Caching Strategy
```typescript
// Cache trip options for reuse
await mutations.cacheTripOption(calculatedTrip)

// Clean old cache weekly
await mutations.clearOldTripOptions(7) // 7 days
```

### Nearby Search
Haversine formula implementation for accurate distance calculation:
- Pre-filters by bounding box (fast)
- Calculates exact distances (accurate)
- Sorts by proximity

### Batch Operations
Use Promise.all for parallel queries:
```typescript
const [stops, lines, alerts] = await Promise.all([
  queries.getAllStops(),
  queries.getAllLines(),
  queries.getAllActiveAlerts()
])
```

## 🧪 Testing Queries

All queries return parsed data ready for UI:
```typescript
// Stop with parsed arrays
const stop = await queries.getStopById('stop-1')
console.log(stop.modesServed) // ['bus', 'train'] (not JSON string)

// Trip with parsed tags
const trip = await queries.getTripOptionById('route-1')
console.log(trip.tags) // ['fastest', 'fewest-transfers']

// Alert with parsed alternatives
const alert = await queries.getAlertById('alert-1')
console.log(alert.recommendedAlternatives) // Array of strings
```

## 📝 Migration Notes

Run migrations on app startup:
```typescript
import { runMigrations } from '@/db/migrations'

await runMigrations()
```

Creates all tables, indexes, and loads initial data.

## 🔄 Future Enhancements

- Real-time arrival predictions
- Route optimization algorithms
- Historical trip data analytics
- Offline-first sync strategy
- Push notification triggers
- Multi-city support

---

**Last Updated**: November 2024  
**Schema Version**: 1.0  
**Database**: SQLite (expo-sqlite)  
**ORM**: Drizzle ORM

