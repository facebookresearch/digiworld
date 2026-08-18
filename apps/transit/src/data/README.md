# Transit App Mock Data

This directory contains clean, well-structured mock data for the transit application, designed to match the database schema perfectly.

## 📊 Data Files Overview

All data files use the `mock-` prefix for consistency.

### **Core Data**

#### `mock-areas.json` (6 areas)
Geographic districts covering the entire transit network:
- Harborfront District
- Civic Core
- Market Quarter
- Skyline Heights
- Innovation Corridor
- Seaside Promenade

#### `mock-stops.json` (12 stops)
Transit stops with complete information:
- **stop-1**: Harbor Exchange (bus, train)
- **stop-2**: Civic Center Hub (bus, subway, train) - Main hub
- **stop-3**: Market Street Gateway (bus, subway)
- **stop-4**: Skyline Commons (bus)
- **stop-5**: Innovation Park (bus, train)
- **stop-6**: University Square (bus, subway)
- **stop-7**: Aurora Heights (train, bus)
- **stop-8**: Seaside Terrace (bus, train) - Default home stop
- **stop-9**: Northgate Terminal (subway, bus)
- **stop-10**: Bayside Marina (bus)
- **stop-11**: Tech Plaza (bus, subway)
- **stop-12**: Beachfront Pavilion (bus)

Each stop includes:
- Coordinates (latitude/longitude)
- Area association
- Modes served (bus/subway/train)
- Facilities (shelters, displays, security)
- Amenities (restrooms, shops, food)
- Accessibility features
- Platform details with walking distances

#### `mock-lines.json` (10 lines)
Transit lines covering the network:

**Buses (4 lines):**
- **B1**: Coastal Connector - stop-8 → stop-1 → stop-2 → stop-3
- **B2**: Skyline Loop - stop-4 → stop-2 → stop-6 → stop-3
- **B3**: Harborfront Express - stop-1 → stop-10 → stop-8 → stop-12
- **B4**: Innovation Shuttle - stop-5 → stop-11 → stop-2

**Subways (3 lines):**
- **S1**: Market Subway - stop-2 → stop-3 → stop-6
- **S2**: Northbound Express - stop-3 → stop-2 → stop-6 → stop-9
- **S3**: Tech Line - stop-2 → stop-11 → stop-5

**Trains (3 lines):**
- **T1**: Peninsula Rail - stop-8 → stop-7 → stop-5 → stop-1 → stop-2
- **T2**: Aurora Line - stop-7 → stop-2 → stop-5
- **T3**: Coastal Express - stop-8 → stop-12 → stop-1 → stop-2

Each line includes:
- Operating hours and frequency
- Current status (on-time/delayed)
- Color coding for UI
- Stop sequence

### **User Data**

#### `mock-users.json` (6 users)
Sample user accounts with:
- Secure password hashes
- Avatar URLs (Dicebear API)
- Bio descriptions
- Created/updated timestamps
- Soft delete support

#### `mock-profile-preferences.json`
User preferences for user ID 1:
- Home stop: Seaside Terrace (stop-8)
- Work stop: Civic Center Hub (stop-2)
- Preferred modes: subway, train
- Notification settings
- Language: English

#### `mock-recent-searches.json` (5 searches)
Recent trip searches for user 1:
- Various origin/destination combinations
- Mode filters applied
- Timestamp tracking

#### `mock-saved-routes.json` (4 routes)
Favorite saved routes for user 1:
- Morning Commute (with reminders)
- Evening Return (with reminders)
- Weekend Beach Trip
- Tech Campus Visit

### **Service Information**

#### `mock-service-alerts.json` (5 alerts)
Active service alerts with varying severity:
- **Low**: Morning fog, weekend schedules
- **Medium**: Road construction detours
- **High**: Maintenance work, signal issues

Each alert includes:
- Severity level and icon
- Affected lines and stops
- Recommended alternatives
- Expiration dates
- Active status

#### `mock-trip-options.json` (5 routes)
Pre-calculated trip options with complete step-by-step instructions:

**Example routes:**
1. Seaside Terrace → Civic Center Hub (3 options)
2. Civic Center Hub → Innovation Park
3. University Square → Tech Plaza

Each trip includes:
- Departure/arrival times
- Total duration and fare
- Transfer count
- Walking distance
- Tags (fastest, lowest-cost, fewest-transfers)
- Detailed steps (walk, ride, wait)

#### `mock-constants.json`
Application constants:
- Default home stop
- App version
- API endpoint
- Configuration values

## 🎯 Key Features

### **Data Quality**
- ✅ All IDs properly referenced across files
- ✅ Realistic timestamps (Nov 2024)
- ✅ Valid coordinates (San Francisco area)
- ✅ Proper foreign key relationships
- ✅ Complete accessibility information
- ✅ Consistent naming conventions

### **Schema Alignment**
- ✅ Matches database schema exactly
- ✅ Proper JSON types for arrays
- ✅ Camel case field names
- ✅ ISO 8601 timestamps
- ✅ Boolean values as proper booleans

### **Real-World Scenarios**
- ✅ Morning/evening commute patterns
- ✅ Weekend leisure trips
- ✅ Tech campus connections
- ✅ Coastal/waterfront routes
- ✅ University area service
- ✅ Multiple transfer options

## 🔄 Data Relationships

```
areas (6)
  └── stops (12)
       ├── stopPlatforms (1-3 per stop)
       ├── lineStops (junction with lines)
       └── alertStops (junction with alerts)

lines (10)
  ├── lineStops (junction with stops)
  └── alertLines (junction with alerts)

users (6)
  ├── userPreferences (1 per user)
  ├── recentSearches (many per user)
  └── savedRoutes (many per user)

tripOptions (5)
  └── tripSteps (3-6 per trip)

serviceAlerts (5)
  ├── alertLines (affects specific lines)
  └── alertStops (affects specific stops)
```

## 📝 Usage Notes

### **For Development**
- Use this data to seed the database
- Test UI components with realistic data
- Validate query performance
- Test user flows and navigation

### **For Testing**
- Complete coverage of all transit modes
- Various trip complexity levels
- Multiple user scenarios
- Alert system testing

### **For Demos**
- Realistic city transit network
- Professional-looking data
- Complete user journey examples
- Service disruption scenarios

## 🚀 Next Steps

1. **Load into Database**: Use migration system to populate tables
2. **Add More Users**: Expand user base for social features
3. **Historical Data**: Add past trips and statistics
4. **Real-Time Updates**: Integrate with live transit APIs
5. **Payment Data**: Add fare cards and transaction history

## 📊 Statistics

- **Total Stops**: 12
- **Total Lines**: 10 (4 bus, 3 subway, 3 train)
- **Total Users**: 6
- **Total Alerts**: 5
- **Total Trip Options**: 5
- **Average Trip Duration**: 37-50 minutes
- **Fare Range**: $3.50 - $5.25
- **Network Coverage**: 6 geographic areas

