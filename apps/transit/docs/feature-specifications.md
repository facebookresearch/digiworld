<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Transit App - Feature Specifications

## App Structure

### Technology Stack
- **Framework**: React Native with Expo
- **State Management**: MobX
- **Database**: SQLite with Drizzle ORM
- **Navigation**: Expo Router (file-based routing)
- **UI Components**: @andojo/shared-theme
- **Interaction Tracking**: @andojo/shared-interaction-tracking
- **Mock Data**: Python data generation pipeline

## Main Navigation Tabs

### 1. Plan Tab (`/(tabs)/plan.tsx`)
**Purpose**: Primary trip planning interface

**Features**:
- Location input (origin/destination) with autocomplete
- Swap origin/destination button
- "Use current location" quick action
- Recent searches display
- Departure/arrival time selector
- Transit mode filters (bus, subway, train, bike, rideshare)
- Quick route search button

**UI Components**:
- SearchBar with location icon
- DateTimePicker modal
- Filter chips (multi-select)
- Recent searches list (swipe to delete)

**Interactions**:
- Tap search → Navigate to `/search-results`
- Tap recent search → Auto-fill and search
- Pull to refresh recent searches

### 2. Nearby Tab (`/(tabs)/nearby.tsx`)
**Purpose**: Show transit options near user's location

**Features**:
- Real-time location-based transit stops
- Next arrival times for each stop
- Distance to stops
- Filter by transit type
- Sort by distance or time
- Refresh button for real-time updates

**UI Components**:
- Map view toggle
- Stop cards with next 3 arrivals
- Distance badge
- Transit type icon
- "Get directions" button per stop

**Interactions**:
- Tap stop card → Navigate to `/stop/[stopId]`
- Tap route → Navigate to `/line/[lineId]`
- Pull to refresh arrivals

### 3. Routes Tab (`/(tabs)/routes.tsx`)
**Purpose**: Manage saved and favorite routes

**Features**:
- List of saved routes
- Quick search from saved routes
- Edit/delete saved routes
- Schedule notifications for saved routes
- Usage statistics (most used)

**UI Components**:
- Saved route cards with preview
- Swipe actions (edit, delete, favorite)
- Empty state (prompt to save first route)
- Quick action buttons per route

**Interactions**:
- Tap route → Show current schedule → Start navigation
- Long press → Edit options
- Swipe left → Delete
- Star icon → Toggle favorite

### 4. Profile Tab (`/(tabs)/profile.tsx`)
**Purpose**: User settings and account management

**Features**:
- User information
- Home/work address settings
- Preferred transit modes
- Notification preferences
- Theme selection
- Language settings
- Privacy policy & terms
- Sign out

**UI Components**:
- Profile header with avatar
- Settings sections
- Toggle switches
- Navigation menu items

**Interactions**:
- Tap menu item → Navigate to detail screen
- Toggle settings → Save immediately
- Tap sign out → Confirmation alert

## Key Screens

### Search Results (`/search-results.tsx`)

**Purpose**: Display multiple route options

**Features**:
- Multiple route cards sorted by:
  - Fastest (default)
  - Fewest transfers
  - Earliest arrival
  - Latest departure
- Route comparison (duration, fare, transfers)
- Alternative options (rideshare, bike)
- Filter by max walking distance
- Filter by max transfers

**UI Layout**:
- Sort/filter bar at top
- Route cards with:
  - Total duration badge
  - Fare price
  - Departure/arrival times
  - Transfer count
  - Walking distance
  - Transit mode icons
  - Simplified route visualization

**Interactions**:
- Tap route card → Navigate to `/trip-details`
- Tap compare → Select multiple routes
- Swipe to refresh → Update real-time data

### Trip Details (`/trip-details.tsx`)

**Purpose**: Show comprehensive trip information

**Features**:
- Step-by-step directions
- Each leg breakdown:
  - Transit mode
  - Line number/name
  - Boarding stop
  - Alighting stop
  - Platform/gate info
  - Walking directions
  - Duration
- Fare breakdown
- Real-time updates
- Alternative routes link
- Save route option
- Start navigation button

**UI Layout**:
- Timeline visualization
- Expandable leg details
- Map view toggle
- Fare summary card
- Action buttons at bottom

**Interactions**:
- Tap "Start Trip" → Navigate to `/navigate`
- Tap "Save Route" → Open save modal
- Tap stop → View stop details
- Tap line → View line details

### Live Navigation (`/navigate.tsx`)

**Purpose**: Real-time trip guidance

**Features**:
- Current location on route
- Current leg highlighted
- Next action prominently displayed
- Time to next transfer
- "Get off alert" notifications
- Real-time delay updates
- Quick access to alternative routes
- Emergency "I'm lost" button

**UI Layout**:
- Large current instruction
- Progress indicator
- Mini map
- Next stops preview
- Time/distance to destination

**Interactions**:
- Auto-advance through legs
- Manual leg completion
- Notifications for transfers
- Quick cancel/modify trip

### Stop Details (`/stop/[stopId].tsx`)

**Purpose**: Detailed information for a specific stop

**Features**:
- Stop name and code
- Real-time arrivals (all lines)
- Stop facilities (shelter, bench, accessibility)
- Nearby amenities
- Map location
- Service alerts affecting this stop
- Save to favorites
- Get directions to stop
- Report issue

**UI Layout**:
- Header with stop info
- Live arrivals list (auto-refresh)
- Facilities icons
- Map section
- Alert banners

**Interactions**:
- Tap arrival → View route/trip
- Tap "Get Directions" → Start trip planning
- Pull to refresh arrivals
- Tap alert → View full details

### Line Details (`/line/[lineId].tsx`)

**Purpose**: Information about a transit line

**Features**:
- Line name and number
- Route map
- All stops on line
- Service hours
- Frequency information
- Current service status
- Service alerts
- Schedule view (full timetable)

**UI Layout**:
- Header with line branding
- Status indicator
- Route visualization
- Stop list with times
- Alert section

**Interactions**:
- Tap stop → Navigate to stop details
- Tap schedule → View full timetable
- Toggle direction

### Service Alerts (`/alerts.tsx`)

**Purpose**: View all service disruptions and alerts

**Features**:
- Filter by line/severity
- Active alerts
- Planned maintenance
- Past alerts (archived)
- Subscribe to line alerts
- Share alert information

**UI Layout**:
- Filter tabs
- Alert cards with:
  - Severity indicator
  - Title and description
  - Affected lines/stops
  - Time range
  - Alternative service info

**Interactions**:
- Tap alert → Expand full details
- Tap affected line → View line details
- Tap alternative → Plan trip
- Share button

## State Management (MobX Stores)

### 1. UserStore
```typescript
Properties:
- user (User | null)
- isAuthenticated (boolean)
- homeLocation (Location)
- workLocation (Location)
- preferredTransitModes (string[])

Actions:
- login(credentials)
- logout()
- updateProfile(data)
- setHomeLocation(location)
- setWorkLocation(location)
```

### 2. TripPlanningStore
```typescript
Properties:
- origin (Location | null)
- destination (Location | null)
- departureTime (Date | null)
- arrivalTime (Date | null)
- searchResults (TripPlan[])
- selectedTrip (TripPlan | null)
- activeTrip (TripPlan | null)
- currentLeg (TripLeg | null)
- isSearching (boolean)
- recentSearches (SearchHistory[])

Actions:
- setOrigin(location)
- setDestination(location)
- searchTrips()
- selectTrip(tripId)
- startTrip()
- completeCurrentLeg()
- cancelTrip()
- saveRoute(name)
```

### 3. TransitDataStore
```typescript
Properties:
- nearbyStops (Stop[])
- transitLines (TransitLine[])
- realTimeArrivals (Map<stopId, Arrival[]>)
- serviceAlerts (ServiceAlert[])
- userLocation (Location | null)
- isLoading (boolean)

Actions:
- loadNearbyStops(location, radius)
- loadRealTimeArrivals(stopId)
- refreshArrivals()
- loadLineDetails(lineId)
- loadStopDetails(stopId)
- subscribeToAlerts(lineId)
```

### 4. SavedRoutesStore
```typescript
Properties:
- savedRoutes (SavedRoute[])
- favorites (SavedRoute[])

Actions:
- saveRoute(route)
- deleteRoute(routeId)
- updateRoute(routeId, data)
- toggleFavorite(routeId)
- incrementUsageCount(routeId)
```

### 5. NotificationStore
```typescript
Properties:
- notifications (Notification[])
- unreadCount (number)
- settings (NotificationSettings)

Actions:
- loadNotifications()
- markAsRead(notificationId)
- scheduleNotification(trip, type)
- updateSettings(settings)
- clearAll()
```

## Interaction Tracking Events

### Screen Views
- screen_view: plan_tab, nearby_tab, routes_tab, profile_tab
- screen_view: search_results, trip_details, navigate, stop_details, line_details
- screen_view: alerts, saved_routes

### User Actions
- search_trip: { origin, destination, time }
- select_trip: { tripId, duration, transfers }
- start_trip: { tripId }
- complete_trip: { tripId, duration }
- save_route: { routeId, name }
- view_stop: { stopId }
- view_line: { lineId }
- toggle_favorite: { routeId, isFavorite }

### Errors
- search_error: { reason }
- navigation_error: { type }

## Notifications

### Types

1. **Departure Reminder**
   - "Time to leave for your trip to [destination]"
   - Scheduled based on user preference (15/30/60 min before)

2. **Get Off Alert**
   - "Approaching [stop name] - Prepare to exit"
   - 1-2 stops before destination

3. **Transfer Alert**
   - "Transfer to [line] at [stop] in 2 stops"
   - Before transfer point

4. **Service Alert**
   - "[Line name] - Service disruption on your saved route"
   - When alert affects user's saved routes

## Offline Functionality

### Data Cached Locally
- User profile and preferences
- Saved routes
- Recent searches (last 30 days)
- Frequently used stops
- Full transit network data
- Schedules (current week + next week)
- Service alerts (last 7 days)

### Simulated Real-Time Features
- Generate arrival predictions based on schedules + random delays
- Simulate vehicle positions
- Mock occupancy levels
- Dynamic service alerts

### Limitations in Offline Mode
- No actual GPS navigation (simulated)
- No payment processing (queued)
- No real-time crowdsourced data
- No multi-city support

## Design System

### Colors
```typescript
primary: '#9E4FE8' (purple)
secondary: '#FF006E' (pink)
success: '#00C853' (green)
warning: '#FFB300' (amber)
error: '#D32F2F' (red)
info: '#0288D1' (blue)

background: '#1A1A1A' (dark)
surface: '#2A2A2A'
text: '#FFFFFF'
textSecondary: '#B0B0B0'
```

### Typography
- Font Family: Poppins
- Headings: 700 weight
- Body: 400-600 weight
- Small text: 500 weight

### Component Patterns
- Cards: Rounded (12-16px), subtle shadows
- Buttons: Rounded (8-12px), gradient on primary
- Inputs: Rounded (10px), light border
- Icons: 20-24px for UI, 16-18px for inline

### Animations
- Route transitions: Slide from right
- Tab changes: Fade
- Card expand: Scale + fade
- Loading: Shimmer effect
- Success: Check mark animation

## Accessibility

### Features
- Screen reader support
- High contrast mode
- Large text support
- Voice navigation option
- Haptic feedback
- Simplified UI mode

### Compliance
- WCAG 2.1 AA standards
- Color contrast ratios
- Touch target sizes (44x44pt min)
- Alternative text for images
- Keyboard navigation

## Performance Targets

- App launch: < 2 seconds
- Search results: < 1 second
- Tab switching: < 200ms
- Real-time updates: Every 30 seconds
- Database queries: < 100ms
- Screen transitions: 60 FPS
- Memory usage: < 200MB

## Testing Strategy

### Unit Tests
- Store actions and computed values
- Utility functions
- Data transformations
- Validation logic

### Integration Tests
- Trip planning flow
- Route saving
- Navigation flow

### E2E Tests
- Complete trip booking
- User registration
- Alert handling

### Mock Data Tests
- Verify data generation
- Check data integrity
- Validate relationships
- Test edge cases


