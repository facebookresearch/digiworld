<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Parking App Technical Implementation & Architecture

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [State Management Architecture](#state-management-architecture)
3. [Comprehensive Feature Implementation](#comprehensive-feature-implementation)
4. [Database Implementation](#database-implementation)
5. [Technical Implementation Details](#technical-implementation-details)
6. [Security & Privacy](#security--privacy)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategy](#testing-strategy)
9. [Development Workflow](#development-workflow)
10. [Deployment & Distribution](#deployment--distribution)

## Architecture Overview

### Application Structure

- **Framework:** React Native with Expo for cross-platform mobile development
- **State Management:** MobX State Tree for reactive state management
- **Navigation:** Expo Router for file-based routing and deep linking
- **Database:** SQLite with Drizzle ORM for local data persistence
- **UI Framework:** Custom theme system with shared components
- **Map Library:** MapLibre GL for interactive map display

### Project Organization

```
src/
├── app/                    # File-based routing screens
│   ├── (auth)/            # Authentication screens (login, signup, splash)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── home.tsx       # Home screen with active sessions
│   │   ├── vehicles.tsx   # Vehicle management
│   │   ├── history.tsx    # Parking history
│   │   ├── payment.tsx     # Payment methods
│   │   └── account.tsx    # User profile
│   ├── screens/           # Stack navigation screens
│   │   ├── parking/       # Parking-related screens
│   │   │   ├── map.tsx    # Map view with zones
│   │   │   ├── search.tsx # Zone search
│   │   │   ├── book-parking.tsx # Book parking session
│   │   │   └── payment.tsx # Confirm payment
│   │   └── vehicles/      # Vehicle management screens
│   │       └── add.tsx    # Add vehicle form
│   ├── notifications/     # Notifications screen
│   └── profile/           # Profile screens
├── components/             # Reusable UI components
├── models/                 # MobX State Tree stores
│   ├── ParkingStore.ts    # Core parking operations
│   ├── UserStore.ts       # User authentication & profile
│   ├── AuthStore.ts       # Authentication tokens
│   ├── SessionStore.ts    # Session management
│   ├── NotificationStore.ts # Notifications
│   └── UIStore.ts         # UI state management
├── db/                     # Database schema and operations
│   ├── schema.ts          # Drizzle ORM schema definitions
│   ├── queries.ts         # Database query functions
│   └── migrations/        # Database migrations
├── utils/                  # Utility functions and helpers
└── docs/                   # Documentation
```

## State Management Architecture

### MobX State Tree Stores

The parking application uses a sophisticated store-based architecture where each store manages specific domain functionality:

- **RootStore:** Central store orchestrating all sub-stores and cross-store communication
- **ParkingStore:** Vehicle management, parking zones, parking history, payment methods, and parking operations
- **UserStore:** User authentication, profile data, and user management
- **AuthStore:** Authentication tokens, login state, and security management
- **SessionStore:** Session persistence, app state, and deep link handling
- **NotificationStore:** User notifications and alerts
- **UIStore:** UI state, modal management, map state, and global UI interactions

### Store Relationships & Data Flow

```typescript
RootStore
├── parkingStore (vehicles, zones, history, payment methods)
│   ├── Manages: vehicle CRUD, parking zones, booking history, payment methods
│   ├── Depends on: userStore for user context, sessionStore for session
│   └── Provides: parking data, booking operations
├── userStore (authentication, profile)
│   ├── Manages: login/logout, user profile
│   ├── Provides: user data to other stores
│   └── Integrates: with AuthStore for token management
├── authStore (authentication tokens, security)
│   ├── Manages: JWT tokens, refresh tokens, security state
│   ├── Integrates: with userStore for authentication flow
│   └── Provides: secure authentication services
├── sessionStore (persistence, app lifecycle)
│   ├── Manages: app session state, deep link handling
│   ├── Coordinates: state backup/restore across all stores
│   └── Handles: app lifecycle events and state persistence
├── notificationStore (notifications, alerts)
│   ├── Manages: user notifications, parking alerts
│   ├── Depends on: parkingStore for parking events
│   └── Provides: notification UI state
└── uiStore (modals, alerts, navigation state, map state)
    ├── Manages: global UI state, modal visibility, loading states, map state
    ├── Coordinates: cross-store UI interactions
    └── Provides: centralized UI state management
```

## Comprehensive Feature Implementation

This section provides a detailed breakdown of all implemented features, their extent of coverage, and implementation status based on codebase analysis.

### 1. Authentication Features

#### 1.1 User Login

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Email/Password Authentication:** Complete login flow with email and password validation
- **Session Creation:** Automatic session creation on successful login
- **Error Handling:** Comprehensive error messages for invalid credentials
- **Navigation:** Redirects to home screen after successful login
- **State Persistence:** Login state persists across app restarts

**Key Actions:**

- `login()` - Validates credentials and creates session
- `logout()` - Clears user session and data
- Form validation for email and password fields

**UI Components:**

- Login screen (`/(auth)/login.tsx`)
- Email and password input fields
- Error message display
- Navigation to signup screen

#### 1.2 User Signup

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **User Registration:** Complete signup flow with full name, email, and password
- **Email Validation:** Email format validation
- **Password Requirements:** Password validation
- **Account Creation:** Automatic user account creation
- **Auto-Login:** Automatic login after successful signup

**Key Actions:**

- `signup()` - Creates new user account
- Email uniqueness validation
- Password strength validation

**UI Components:**

- Signup screen (`/(auth)/signup.tsx`)
- Full name, email, and password input fields
- Form validation and error display
- Navigation to login screen

### 2. Home Screen Features

#### 2.1 Home Screen Display

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Active Sessions:** Displays active parking sessions with details
- **Recent History:** Shows recent parking history when no active sessions
- **Empty State:** Displays "No recent history" message for new users
- **Session Actions:** Extend and stop session buttons
- **Navigation:** Quick access to all main tabs

**Key Actions:**

- `loadActiveSessions()` - Loads active parking sessions
- `loadRecentHistory()` - Loads recent parking history
- `extendSession()` - Navigates to extend session flow
- `stopSession()` - Stops active parking session

**UI Components:**

- Home screen (`/(tabs)/home.tsx`)
- Active session cards with zone, vehicle, and time details
- Recent history list
- Empty state with icon and message
- Navigation tabs

#### 2.2 Session Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Extend Session:** Navigate to book parking screen in extend mode
- **Stop Session:** Stop active session with confirmation
- **Session Details:** Display zone, vehicle, start time, and duration
- **Status Tracking:** Track session status (active, completed, expired)

**Key Actions:**

- `extendSession()` - Opens book parking in extend mode
- `stopSession()` - Stops session and moves to history
- Session status updates

### 3. Search Features

#### 3.1 Zone Search

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Search Functionality:** Search parking zones by name or zone code
- **Real-time Filtering:** Filter zones as user types
- **Empty State:** Display "No Zones found" when no results
- **Zone Selection:** Select zone from search results
- **Navigation:** Navigate to book parking with selected zone

**Key Actions:**

- `setSearchQuery()` - Sets search query
- `filterZones()` - Filters zones based on query
- `selectZone()` - Selects zone for booking

**UI Components:**

- Search screen (`/screens/parking/search.tsx`)
- Search input with focus tracking
- Zone list with filtering
- Empty state display

**Search Features:**

- Case-insensitive search
- Matches zone names and codes
- Empty search shows all zones
- Real-time filtering

### 4. Map View Features

#### 4.1 Map Display

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Zone Markers:** Display all parking zones as markers on map
- **User Location:** Display user location marker (mocked from database)
- **Zone Selection:** Click zone markers to select
- **Zone Details:** Show selected zone information
- **Map Controls:** "My Location" button to center map
- **Navigation:** Navigate to book parking with selected zone

**Key Actions:**

- `loadParkingZones()` - Loads all parking zones from database
- `setSelectedZone()` - Sets selected zone
- `centerOnUserLocation()` - Centers map on user location
- `initializeMap()` - Initializes map with zones and location

**UI Components:**

- Map screen (`/screens/parking/map.tsx`)
- MapLibre GL map component
- Zone markers with custom icons
- User location marker
- Zone selection overlay
- Navigation buttons

**Map Features:**

- Interactive map with zoom and pan
- Zone markers with click handlers
- User location display (mocked from database)
- Zone ready state tracking
- Map initialization handling

**Data Source:**

- **Parking Zones:** Zones are loaded from the database, which is seeded from `src/data/static/zones.json`
- **Zone Coordinates:** All zone coordinates (lat/long) are extracted from rendered map tiles and stored in `zones.json`
- **User Location:** User location coordinates come from the database, randomly assigned from `src/data/static/locations.json` during user creation
- **Location Coordinates:** All user location coordinates (lat/long) are extracted from rendered map tiles and stored in `locations.json`
- **Map Tiles:** Map tiles are rendered using the lat/long coordinates stored in the database
- **Coordinate Origin:** All coordinates (zones and user locations) originate from rendered map tile locations, ensuring perfect alignment between markers and map display

### 5. Book Parking Features

#### 5.1 Book Parking Session

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Vehicle Selection:** Select vehicle from dropdown
- **Duration Input:** Enter parking duration (15-180 minutes)
- **Validation:** Duration validation and error messages
- **Empty State:** "No vehicles added" state with Add Vehicle button
- **Navigation:** Continue to payment screen
- **Extend Mode:** Support for extending existing sessions

**Key Actions:**

- `setVehicle()` - Sets selected vehicle
- `setDuration()` - Sets parking duration
- `validateForm()` - Validates booking form
- `navigateToPayment()` - Navigates to payment confirmation

**UI Components:**

- Book parking screen (`/screens/parking/book-parking.tsx`)
- Vehicle dropdown selector
- Duration input with validation
- Empty state for no vehicles
- Continue button (disabled when no vehicle)

**Validation Rules:**

- Vehicle selection required
- Duration must be between 15 and 180 minutes
- Duration field cannot be empty
- Error messages for validation failures

#### 5.2 Extend Parking Session

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Extend Mode:** Book parking screen opens in extend mode
- **Duration Selection:** Select additional duration
- **Payment Flow:** Navigate to payment for extension
- **Session Update:** Extend existing active session

**Key Actions:**

- `extendSession()` - Extends active session
- Duration validation for extension
- Payment processing for extension

### 6. Payment Features

#### 6.1 Payment Method Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Payment Methods List:** Display all saved payment methods
- **Add Payment Method:** Add new credit/debit cards
- **Edit Payment Method:** Edit existing payment methods
- **Delete Payment Method:** Remove payment methods
- **Default Payment:** Set default payment method
- **Card Masking:** Mask/unmask card numbers

**Key Actions:**

- `loadPaymentMethods()` - Loads user payment methods
- `addPaymentMethod()` - Adds new payment method
- `updatePaymentMethod()` - Updates payment method
- `deletePaymentMethod()` - Removes payment method
- `setDefaultPaymentMethod()` - Sets default payment method

**UI Components:**

- Payment methods screen (`/(tabs)/payment.tsx`)
- Payment method cards
- Add payment method modal
- Edit/delete actions
- Empty state for no payment methods

**Payment Method Form:**

- Name on card input
- Card number input (16 digits)
- Expiry month and year inputs
- CVV input
- Validation for expiry dates (not in past)
- Card number formatting

#### 6.2 Payment Confirmation

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Payment Selection:** Select payment method for booking
- **Amount Display:** Show parking cost based on duration and vehicle type
- **Booking Confirmation:** Confirm and create parking session
- **Empty State:** Prompt to add payment method if none exist
- **Navigation:** Navigate to add payment method screen

**Key Actions:**

- `selectPaymentMethod()` - Selects payment method
- `confirmPayment()` - Processes payment and creates session
- `calculateCost()` - Calculates parking cost
- `createParkingSession()` - Creates parking history record

**UI Components:**

- Confirm payment screen (`/screens/parking/payment.tsx`)
- Payment method selector
- Cost breakdown display
- Confirm button
- Empty state for no payment methods

**Payment Flow:**

1. Select payment method
2. Review cost breakdown
3. Confirm payment
4. Create parking session
5. Navigate to home screen

### 7. Vehicle Management Features

#### 7.1 Vehicle List

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Vehicle Display:** List all user vehicles
- **Vehicle Details:** Show plate number, nickname, make, model, color, year
- **Default Vehicle:** Indicate default vehicle
- **Delete Vehicle:** Remove vehicles (with validation)
- **Add Vehicle:** Navigate to add vehicle screen

**Key Actions:**

- `loadVehicles()` - Loads user vehicles
- `deleteVehicle()` - Deletes vehicle (validates no active sessions)
- `setDefaultVehicle()` - Sets default vehicle

**UI Components:**

- Vehicles screen (`/(tabs)/vehicles.tsx`)
- Vehicle list with details
- Delete button with confirmation
- Add vehicle button
- Empty state for no vehicles

#### 7.2 Add Vehicle

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Vehicle Form:** Complete form with all vehicle fields
- **Field Validation:** Validation for all required fields
- **Year Validation:** Year must be <= current year
- **Vehicle Type Selection:** Select vehicle type (car, motorcycle, van, truck, EV)
- **Focus Management:** Input focus tracking and restoration
- **Form Persistence:** Form state persists across app restarts

**Key Actions:**

- `setVehicleFormField()` - Sets form field value
- `validateForm()` - Validates all form fields
- `saveVehicle()` - Creates vehicle record
- `resetVehicleForm()` - Clears form

**UI Components:**

- Add vehicle screen (`/screens/vehicles/add.tsx`)
- Form inputs: plate number, nickname, make, model, color, year
- Vehicle type selector
- Save button with validation
- Error message display

**Form Fields:**

- Plate number (required)
- Vehicle type (required)
- Nickname (optional)
- Make (required)
- Model (required)
- Color (required)
- Year (optional, validated <= current year)

**Validation Rules:**

- Plate number required
- Vehicle type required
- Year must be valid number >= 1900 and <= current year
- Error messages for validation failures

### 8. Parking History Features

#### 8.1 History Display

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **History List:** Display all parking sessions
- **Session Details:** Show zone, vehicle, dates, duration, cost
- **Status Filtering:** Filter by vehicle
- **Date Formatting:** Relative date formatting
- **Navigation:** Navigate to session details

**Key Actions:**

- `loadParkingHistory()` - Loads parking history
- `filterHistory()` - Filters history by
- `selectHistoryItem()` - Selects history item for details

**UI Components:**

- History screen (`/(tabs)/history.tsx`)
- History list with session cards
- vehicles filters
- Session detail navigation
- Empty state

**History Information:**

- Zone name and code
- Vehicle plate number
- Start and end times
- Duration (planned and actual)
- Charged amount
- Status (active, completed, expired)

### 9. Session & User Management Features

#### 9.1 Session Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Session Initialization:** Create and initialize user session
- **Session State:** Track session status (active, paused, completed)
- **Session Persistence:** Session state persistence across app restarts
- **State Restoration:** Restore app state from persisted snapshots
- **Deep Link Handling:** Handle deep links and navigation

**Key Actions:**

- `initializeSession()` - Initialize user session
- `restoreSession()` - Restore session from snapshot
- `saveSnapshot()` - Save current state snapshot
- Session state management

**Session Features:**

- State persistence with MobX snapshots
- Automatic state restoration on app start
- Form state persistence
- Focus state restoration
- Navigation state tracking

#### 9.2 User Authentication

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **User Registration:** Register new users with email/password
- **User Login:** Login with email/password
- **User Profile:** User profile management
- **Session Tracking:** Track user sessions

**Key Actions:**

- User registration with email validation
- Login validation against database
- User profile updates
- Session management

**Authentication Flow:**

1. **Registration Process:**
   - User provides full name, email, password
   - System validates email format and uniqueness
   - User record created in database
   - **User Location Assignment:** A random location is selected from `src/data/static/locations.json` and assigned to the new user
   - Location coordinates (lat/lon) are extracted from rendered map tiles and stored in `user_locations` table
   - These tile-based coordinates ensure the user location marker aligns perfectly with the rendered map
   - Automatic login after registration

2. **Login Process:**
   - `UserStore.login()` validates credentials against database
   - `AuthStore` manages token storage
   - Session created and stored
   - Parking data loaded into ParkingStore
   - Cross-store notification updates UI state

3. **Session Management:**
   - `SessionStore` persists authentication state
   - `AuthStore` handles token storage
   - `UserStore` maintains user profile data
   - Session state restored on app restart

4. **Logout Process:**
   - `UserStore.logout()` clears user data
   - `AuthStore` removes tokens
   - All stores reset user-specific state
   - Session ended in database

### 10. Notification Features

#### 10.1 Notification Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Notification Display:** Display user notifications
- **Notification Types:** Parking session, payment, system notifications
- **Notification Priority:** Priority levels (low, normal, high, urgent)
- **Read/Unread Status:** Mark notifications as read
- **Notification Filtering:** Filter by type, priority, read status

**Key Actions:**

- `loadNotifications()` - Load user notifications
- `markAsRead()` - Mark notification as read
- `deleteNotification()` - Remove notification
- `createNotification()` - Create new notification

**UI Components:**

- Notifications screen (`/notifications/notifications.tsx`)
- Notification list with filtering
- Notification detail views

**Notification Types:**

- Parking session notifications (start, end, expiry)
- Payment notifications (success, failure)
- System notifications (updates, maintenance)

### 11. UI State Management Features

#### 11.1 Form State Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Vehicle Form:** Complete form state management
- **Booking Form:** Parking booking form state
- **Payment Form:** Payment method form state
- **Search Form:** Search form state
- **Focus Management:** Input focus tracking and restoration

**Form States:**

- Vehicle form (plate number, nickname, make, model, color, year, vehicle type)
- Booking form (vehicle, duration, zone)
- Payment method form (name, card number, expiry, CVV)
- Search form (query)

**Focus Management:**

- Input focus tracking with `currentFocused` field
- Focus restoration on screen return
- Cursor position restoration
- Session timestamp for focus restoration

#### 11.2 Alert & Dialog Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Alert System:** Global alert/dialog system
- **Alert Types:** Success, error, warning, delete, default
- **Confirmation Dialogs:** Confirm/cancel dialogs
- **Success Dialogs:** Success message dialogs
- **Error Handling:** Error display and handling

**Key Actions:**

- `showAlert()` - Show alert/dialog
- `hideAlert()` - Hide alert
- Alert state management

**UI Components:**

- `FancyAlert` component
- `SuccessDialog` component
- Toast notifications

#### 11.3 Map State Management

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Map State:** Track map initialization and ready state
- **Zone Loading:** Track zone loading state
- **User Location:** Track user location state
- **Map Controls:** Map control state management

**Key Actions:**

- `setMapInitialized()` - Sets map initialization state
- `setZonesReady()` - Sets zones ready state
- `setUserLocation()` - Sets user location

### 12. Data Loading & Synchronization

#### 12.1 Data Loading

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Lazy Loading:** Load data on demand
- **Refresh Control:** Pull-to-refresh functionality
- **Data Caching:** Store data in MobX State Tree
- **Error Handling:** Error handling for failed loads

**Load Operations:**

- `loadVehicles()` - Load user vehicles
- `loadParkingZones()` - Load parking zones
- `loadParkingHistory()` - Load parking history
- `loadPaymentMethods()` - Load payment methods
- `loadUserLocations()` - Load user locations
- `loadNotifications()` - Load notifications

**Refresh Support:**

- Pull-to-refresh on list screens
- Manual refresh buttons
- Auto-refresh after operations

### 13. Search & Filter Features

#### 13.1 Zone Search

**Status:** ✅ Fully Implemented

**Implementation Extent:**

- **Search by Name/Code:** Search parking zones by name or zone code
- **Real-time Filtering:** Real-time zone filtering as user types
- **Empty State:** Display empty state when no results
- **Search Focus Management:** Search input focus tracking

**Key Actions:**

- `setSearchQuery()` - Set search query
- Real-time zone filtering
- Zone selection from results

**UI Components:**

- Search input on search screen
- Zone list with filtering
- Empty state display

### 14. Feature Implementation Status Summary

| Feature Category    | Feature              | Status      | Implementation Extent                 |
| ------------------- | -------------------- | ----------- | ------------------------------------- |
| **Authentication**  | User Login           | ✅ Complete | Full login flow with validation       |
|                     | User Signup          | ✅ Complete | Complete registration flow            |
| **Home Screen**     | Active Sessions      | ✅ Complete | Display and manage active sessions    |
|                     | Recent History       | ✅ Complete | Show recent parking history           |
|                     | Empty State          | ✅ Complete | Empty state for new users             |
| **Search**          | Zone Search          | ✅ Complete | Search zones by name/code             |
|                     | Real-time Filtering  | ✅ Complete | Real-time search results              |
| **Map View**        | Zone Display         | ✅ Complete | Display zones on map                  |
|                     | User Location        | ✅ Complete | Display user location (mocked)        |
|                     | Zone Selection       | ✅ Complete | Select zones from map                 |
| **Book Parking**    | Vehicle Selection    | ✅ Complete | Select vehicle for booking            |
|                     | Duration Input       | ✅ Complete | Duration validation (15-180 min)      |
|                     | Extend Session       | ✅ Complete | Extend active sessions                |
| **Payment**         | Payment Methods      | ✅ Complete | Add/edit/delete payment methods       |
|                     | Payment Confirmation | ✅ Complete | Confirm payment and create session    |
| **Vehicles**        | Vehicle List         | ✅ Complete | Display and manage vehicles           |
|                     | Add Vehicle          | ✅ Complete | Complete vehicle form with validation |
|                     | Delete Vehicle       | ✅ Complete | Delete with active session validation |
| **History**         | History Display      | ✅ Complete | Display parking history               |
|                     | Status Filtering     | ✅ Complete | Filter by status                      |
| **Session & Auth**  | Session Management   | ✅ Complete | Full session persistence              |
|                     | User Authentication  | ✅ Complete | Registration and login                |
| **Notifications**   | Notification System  | ✅ Complete | Full notification management          |
| **UI State**        | Form Management      | ✅ Complete | All forms with state management       |
|                     | Alert System         | ✅ Complete | Global alert/dialog system            |
|                     | Map State            | ✅ Complete | Map state management                  |
| **Search & Filter** | Zone Search          | ✅ Complete | Search and filtering system           |

## Database Implementation

### SQLite with Drizzle ORM

**Local-first Architecture:**

- All data stored locally in SQLite database
- Offline functionality - app works without network
- Pre-populated with mock data for testing
- Migration system for schema versioning

**Key Database Features:**

- **Relational Schema:** Proper foreign key constraints
- **Indexing:** Optimized indexes on frequently queried columns
- **Transactions:** Atomic operations for data consistency
- **Type Safety:** Full TypeScript support with Drizzle ORM

### Database Schema Overview

**Core Tables:**

- `users` - User accounts and profiles
- `user_locations` - User saved locations (mocked for testing)
- `vehicle_types` - Vehicle type definitions (car, motorcycle, van, truck, EV)
- `vehicles` - User vehicle registrations
- `payment_methods` - User payment methods (credit cards, debit cards)

**Parking Tables:**

- `parking_zones` - Parking zone definitions with location and pricing
- `vehicle_type_rates` - Base rates per vehicle type per hour
- `parking_history` - Parking booking and session history

**Supporting Tables:**

- `notifications` - User notifications

See [database.md](./database.md) for detailed schema documentation.

### Mock Data Seeding

**Static Data Files:**

The app uses static JSON files located in `src/data/static/` as the source of truth for mock data generation. **All coordinates (latitude/longitude) in these files are extracted from the rendered map tiles** used in the app:

- **`locations.json`** - Contains predefined user location coordinates (latitude/longitude pairs) extracted from rendered map tiles:
  - Coordinates are taken from actual map tile locations visible in the app
  - Used for assigning random user locations when creating new users
  - Mocking user location data stored in `user_locations` table
  - All lat/long pairs correspond to locations visible on the rendered map tiles

- **`zones.json`** - Contains predefined parking zone data with coordinates extracted from rendered map tiles:
  - Zone coordinates (latitude/longitude) are taken from rendered map tile locations
  - Zone location data that feeds into `parking_zones` table
  - All zone coordinates correspond to actual locations visible on the map tiles
  - Zone markers are placed at these tile-based coordinates

**Data Flow:**

1. **Rendered Map Tiles** → **Static JSON Files**
   - Coordinates extracted from rendered map tiles
   - Lat/long pairs saved to `src/data/static/locations.json` and `zones.json`
   - All coordinates correspond to locations visible on the map

2. **Static JSON Files** → **Data Generation Scripts**
   - Data generation scripts read from static JSON files
   - Generate mock user data with random location assignment from `locations.json`
   - Generate parking zone records from `zones.json`
   - Create mock data files (`mock-users.json`, `mock-user_locations.json`, etc.)
   - All coordinates maintain their tile-based origin

3. **Data Generation Scripts** → **Database Seeding**
   - Mock data files are loaded into SQLite database
   - User locations randomly assigned from `locations.json` during user creation
   - Parking zones seeded from `zones.json` data
   - Coordinates stored in database match tile-based coordinates

4. **Database** → **App Usage**
   - App reads data from database (not directly from JSON files)
   - Map tiles rendered using lat/long coordinates from database
   - Zone markers displayed at tile-based coordinates from `parking_zones` table
   - User location displayed using tile-based coordinates from `user_locations` table
   - All coordinates align with rendered map tile locations

**User Location Assignment:**

When creating new users:

- A random location is selected from `src/data/static/locations.json`
- The selected location's coordinates (lat/lon) are extracted from rendered map tiles
- These tile-based coordinates are assigned to the user
- This location is stored in the `user_locations` table
- The location corresponds to an actual position visible on the rendered map tiles

**Parking Zone Seeding:**

Parking zones are seeded from `src/data/static/zones.json`:

- All zones defined in the JSON file have coordinates extracted from rendered map tiles
- Zone coordinates (latitude/longitude) correspond to actual tile locations
- Zone markers are placed at these tile-based coordinates on the map
- Zone names and codes are preserved from the JSON structure
- Zones are marked as active and available for booking
- All zone locations are visible and align with the rendered map tiles

### Query Patterns

**Vehicle Queries:**

```typescript
// Get all vehicles for user
export const getVehiclesByUserId = async (userId: number) => {
  return await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .orderBy(desc(vehicles.createdAt))
    .execute()
}

// Delete vehicle (validates no active sessions)
export const deleteVehicle = async (vehicleId: number) => {
  // Delete all parking history for vehicle first
  // Then delete vehicle
}
```

**Parking Zone Queries:**

```typescript
// Get all parking zones
export const getParkingZones = async () => {
  return await db
    .select()
    .from(parkingZones)
    .where(eq(parkingZones.isActive, 1))
    .execute()
}
```

**Parking History Queries:**

```typescript
// Get parking history for user
export const getParkingHistoryByUserId = async (
  userId: number,
  filters?: {
    status?: string
    vehicleId?: number
  },
) => {
  // Complex query with joins and filters
  // Returns parking history records
}
```

**Mutation Patterns:**

```typescript
// Create parking session
export const createParkingHistory = async (
  userId: number,
  vehicleId: number,
  parkingZoneId: number,
  plannedDurationMinutes: number,
) => {
  // 1. Calculate cost based on vehicle type and duration
  // 2. Create parking history record
  // 3. Return parking history record
}
```

## Technical Implementation Details

### Cost Calculation

**Algorithm:**

```typescript
function calculateParkingCost(
  vehicleTypeId: number,
  durationMinutes: number,
  zoneRateMultiplier: number,
): number {
  // Get base rate for vehicle type
  const baseRate = getVehicleTypeRate(vehicleTypeId)

  // Calculate hours (round up)
  const hours = Math.ceil(durationMinutes / 60)

  // Apply zone multiplier
  const cost = baseRate * hours * zoneRateMultiplier

  return cost
}
```

**Cost Factors:**

- Vehicle type base rate (per hour)
- Duration (rounded up to nearest hour)
- Zone rate multiplier
- Currency (USD)

### Validation & Business Rules

#### Vehicle Validation

1. **Plate Number:**
   - Required field
   - Must be unique per user
   - Format validation

2. **Year Validation:**
   - Must be valid number
   - Must be >= 1900
   - Must be <= current year

3. **Vehicle Type:**
   - Required field
   - Must be valid vehicle type ID

#### Booking Validation

1. **Vehicle Selection:**
   - Vehicle must be selected
   - Vehicle must belong to user
   - Vehicle cannot have active session (for new bookings)

2. **Duration Validation:**
   - Duration must be between 15 and 180 minutes
   - Duration field cannot be empty
   - Duration must be a valid number

3. **Zone Selection:**
   - Zone must be selected
   - Zone must be active

#### Payment Method Validation

1. **Card Number:**
   - Must be 16 digits
   - Format validation

2. **Expiry Date:**
   - Year must be >= current year
   - If current year, month must be >= current month
   - Format validation

### Error Handling

**Common Error Codes:**

- `VEHICLE_NOT_FOUND` - Vehicle doesn't exist or doesn't belong to user
- `ZONE_NOT_FOUND` - Zone doesn't exist or is not active
- `INVALID_DURATION` - Duration is outside valid range
- `ACTIVE_SESSION_EXISTS` - Vehicle already has active session
- `PAYMENT_METHOD_REQUIRED` - No payment method selected
- `INVALID_PAYMENT_METHOD` - Payment method validation failed

## Security & Privacy

### Authentication & Authorization

**Current Implementation:**

- **Password Storage:** Plain text (for demo purposes - should be hashed in production)
- **Session Management:** Local session tracking
- **Token Management:** Local token storage

### Data Protection

- **Local Storage:** All data stored locally in SQLite
- **No Network Calls:** App operates entirely offline
- **Data Validation:** Input sanitization and validation
- **Access Control:** User can only access their own data
- **Audit Trail:** All parking sessions logged with timestamps

### Offline Compliance

- **No Internet Permission:** App does not require internet permission
- **Airplane Mode:** App tested and works in airplane mode
- **Local Resources:** All fonts, icons, and configs bundled locally
- **No Telemetry:** No analytics or cloud sync libraries
- **Mock Data:** Parking zones and user locations mocked in database
- **Static Data Files:** All location and zone data sourced from static JSON files (`src/data/static/locations.json` and `zones.json`)
- **Tile-Based Coordinates:** All coordinates (lat/long) in static JSON files are extracted from rendered map tiles
- **Coordinate Alignment:** Zone markers and user location markers align perfectly with map tiles because coordinates originate from the tiles themselves
- **Data Generation:** Mock data generation scripts use static JSON files (with tile-based coordinates) to create database seed data
- **Map Rendering:** Map tiles and markers use coordinates that match rendered tile locations, ensuring accurate visual representation

## Performance Optimization

### Database Performance

**Indexing Strategy:**

- Primary keys on all tables
- Foreign key indexes on relationship columns
- Composite indexes on frequently queried combinations
- Indexes on: `userId`, `vehicleId`, `parkingZoneId`, `status`, `startTime`

**Query Optimization:**

- Limit clauses for pagination
- Efficient joins using foreign keys
- Batch operations for bulk updates
- Transaction batching for multiple operations

### Mobile Performance

- **Lazy Loading:** Components and data loaded on demand
- **List Virtualization:** Efficient rendering of history lists
- **Memory Management:** Proper cleanup of resources
- **Bundle Optimization:** Code splitting and tree shaking
- **Image Optimization:** Cached images and assets
- **Map Optimization:** Efficient map rendering with MapLibre GL

### Debouncing

- **User Interactions:** All button presses and form submissions debounced
- **Search Input:** Search queries debounced to prevent excessive filtering
- **Navigation:** Navigation actions debounced to prevent rapid navigation

## Testing Strategy

### Test Coverage

**Unit Tests:**

- Store actions and computed values
- Database query functions
- Utility functions
- Validation logic

**Integration Tests:**

- Store and database integration
- Parking session creation flows
- Payment processing flows
- Authentication flows

**E2E Tests:**

- Complete user flows
- Parking booking workflows
- Vehicle management flows
- Payment method flows

### Testing Tools

- **Jest:** Unit and integration test framework
- **React Native Testing Library:** Component testing utilities
- **Detox:** End-to-end testing framework
- **Mock Data:** Pre-populated database with test data

## Development Workflow

### Code Quality

- **TypeScript:** Full type safety and IDE support
- **ESLint/Prettier:** Code formatting and linting
- **MobX State Tree:** Type-safe state management
- **Drizzle ORM:** Type-safe database queries

## Resources & References

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [MobX State Tree Guide](https://mobx-state-tree.js.org/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MapLibre GL Documentation](https://maplibre.org/)
- [SQLite Performance Best Practices](https://www.sqlite.org/optoverview.html)
- [React Native Performance Guide](https://reactnative.dev/docs/performance)
- [Mobile App Security Best Practices](https://owasp.org/www-project-mobile-top-10/)

## Related Documentation

- [Database Schema Documentation](./database.md)
- [Feature Scope](./feature-scope.md)
- [Test Credentials](./credentials.md)
