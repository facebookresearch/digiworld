# Flight Generation System

## Overview

The AirFly app uses a **dynamic flight generation system** based on flight configuration templates. Instead of storing thousands of flight records with specific dates, we store **reusable flight configurations** that generate flights on-demand for any date.

## Architecture

### Two-Table System

1. **`flightsconfig` Table** - Flight Templates
   - Stores 543 flight configuration templates
   - No dates - only time-of-day information
   - Each config has a unique `flight_id` (FC00001, FC00002, etc.)
   - Times stored in HH:MM format (`"21:15"`, `"02:33"`)

2. **`flights` Table** - Generated Flights
   - Stores actual flight instances with specific dates
   - Generated dynamically when users search
   - Flight IDs format: `{config_flight_id}_{YYYY-MM-DD}`
   - Times stored as full ISO 8601 timestamps

## Data Files

### `mock-flights_config.json` (8,147 lines)
Flight configuration templates without dates:

```json
{
  "flight_id": "FC00001",
  "airline_id": "airline_9",
  "airline_code": "HA",
  "flight_number": "HA6326",
  "origin": "LAS",
  "destination": "TPA",
  "departure_time": "21:15",      // HH:MM only
  "arrival_time": "02:33",        // HH:MM only
  "duration_minutes": 318,
  "fare": 459.88,
  "currency": "USD",
  "seats_available": 169,
  "aircraft_type": "Boeing 787-9 Dreamliner"
}
```

**Key Features:**
- ✅ No `date` field - configs are date-agnostic
- ✅ No `flight_id` with dates - just FC##### format
- ✅ Simple time format - just hours and minutes

### `mock-flights.json` (8,690 lines)
Pre-generated flights for testing (Oct 9-15, 2025):

```json
{
  "flight_id": "HA6326_2025-10-09",        // Config ID + Date
  "airline_id": "airline_9",
  "airline_code": "HA",
  "flight_number": "HA6326",
  "origin": "LAS",
  "destination": "TPA",
  "departure_time": "2025-10-09T21:15:00Z",   // Full ISO timestamp
  "arrival_time": "2025-10-10T02:33:00Z",     // Next day (overnight)
  "duration_minutes": 318,
  "fare": 459.88,
  "currency": "USD",
  "seats_available": 169,
  "aircraft_type": "Boeing 787-9 Dreamliner",
  "date": "2025-10-09"                         // Flight date
}
```

## Flight Generation Flow

### User Search Sequence

```
1. User enters: LAS → TPA, Date: 2025-10-09
   └─> Navigate to /search-results

2. Search Results Screen (search-results.tsx)
   ├─> Query flightsconfig: WHERE origin='LAS' AND destination='TPA'
   │   └─> Found: 48 flight configs
   │
   ├─> Generate Flights (mutations.generateFlightsFromConfig)
   │   ├─> For each config (FC00001, FC00002, ...):
   │   │   ├─> Create flight_id: "FC00001_2025-10-09"
   │   │   ├─> Check if exists in flights table
   │   │   ├─> If not exists:
   │   │   │   ├─> Convert "21:15" → "2025-10-09T21:15:00Z"
   │   │   │   ├─> Convert "02:33" → "2025-10-10T02:33:00Z" (overnight +1 day)
   │   │   │   └─> INSERT into flights table
   │   │   └─> If exists: Skip (no duplicate)
   │   └─> Result: 48 flights generated for 2025-10-09
   │
   └─> Search Flights: Show all LAS→TPA flights (any date)
       └─> Display: All generated flights sorted by time
```

### Overnight Flight Handling

**Logic:** If `arrival_time < departure_time`, add 1 day to arrival date

**Example:**
```
Config: FC00001
  departure_time: "21:15"  (9:15 PM)
  arrival_time: "02:33"    (2:33 AM - next day)

Generated for 2025-10-09:
  departure_time: "2025-10-09T21:15:00Z"  (Oct 9, 9:15 PM)
  arrival_time: "2025-10-10T02:33:00Z"    (Oct 10, 2:33 AM) ✅
```

**Code Implementation** (`mutations.ts`):
```typescript
const [depHour, depMin] = config.departure_time.split(':').map(Number)
const [arrHour, arrMin] = config.arrival_time.split(':').map(Number)

const departureDateTime = new Date(`${date}T${config.departure_time}:00Z`)
const arrivalDateTime = new Date(`${date}T${config.arrival_time}:00Z`)

// If arrival < departure, it's overnight - add 1 day
if (arrHour < depHour || (arrHour === depHour && arrMin < depMin)) {
  arrivalDateTime.setDate(arrivalDateTime.getDate() + 1)
}
```

## Round Trip Support

For round-trip searches, the system generates flights for **both directions**:

```
User Search: LAS ↔ TPA (Round Trip), Date: 2025-10-09

Step 1: Generate Outbound (LAS → TPA)
  └─> Query configs: origin='LAS', destination='TPA'
  └─> Generate flights for 2025-10-09

Step 2: Generate Return (TPA → LAS)
  └─> Query configs: origin='TPA', destination='LAS'  
  └─> Generate flights for 2025-10-09
```

## Duplicate Prevention

**Check Before Insert:**
```typescript
// Generate unique flight_id
const flightId = `${config.flight_id}_${date}`  // e.g., "FC00001_2025-10-09"

// Check if already exists
const exists = await db
  .select()
  .from(flights)
  .where(eq(flights.flight_id, flightId))
  .execute()

if (exists.length > 0) {
  continue  // Skip - already generated
}
```

**Result:** Multiple searches for the same route/date won't create duplicates

## Database Schema

### `flightsconfig` Table
```typescript
export const flightsconfig = sqliteTable('flightsconfig', {
  flight_id: text('flight_id').primaryKey(),        // FC00001, FC00002, ...
  airline_id: text('airline_id').notNull(),
  airline_code: text('airline_code').notNull(),
  flight_number: text('flight_number').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departure_time: text('departure_time').notNull(), // HH:MM format
  arrival_time: text('arrival_time').notNull(),     // HH:MM format
  duration_minutes: integer('duration_minutes').notNull(),
  fare: real('fare').notNull(),
  currency: text('currency').notNull().default('USD'),
  seats_available: integer('seats_available').notNull(),
  aircraft_type: text('aircraft_type').notNull(),
  created_at: text('created_at').notNull(),
})
```

### `flights` Table
```typescript
export const flights = sqliteTable('flights', {
  flight_id: text('flight_id').primaryKey(),        // FC00001_2025-10-09
  airline_id: text('airline_id').notNull(),
  airline_code: text('airline_code').notNull(),
  flight_number: text('flight_number').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departure_time: text('departure_time').notNull(), // ISO 8601 timestamp
  arrival_time: text('arrival_time').notNull(),     // ISO 8601 timestamp
  duration_minutes: integer('duration_minutes').notNull(),
  fare: real('fare').notNull(),
  currency: text('currency').notNull().default('USD'),
  seats_available: integer('seats_available').notNull(),
  aircraft_type: text('aircraft_type').notNull(),
  date: text('date').notNull(),                     // YYYY-MM-DD
  created_at: text('created_at').notNull(),
})
```

## API Functions

### Queries (`queries.ts`)

**1. Get Flight Configs by Route**
```typescript
export const getFlightConfigsByRoute = async (
  origin: string,
  destination: string,
) => {
  const res = await db
    .select()
    .from(flightsconfig)
    .where(
      and(
        eq(flightsconfig.origin, origin),
        eq(flightsconfig.destination, destination),
      ),
    )
    .execute()
  return res
}
```

**2. Search Flights (Date-Agnostic)**
```typescript
export const searchFlights = async (searchParams: {
  origin: string
  destination: string
  date?: string      // Optional - ignores date in search
  passengers?: number
}) => {
  // Returns all flights for route, sorted by time
  // No date filtering - shows flights across all dates
}
```

### Mutations (`mutations.ts`)

**Generate Flights from Config**
```typescript
mutations.generateFlightsFromConfig(
  origin: string,      // e.g., "LAS"
  destination: string, // e.g., "TPA"
  date: string,        // e.g., "2025-10-09"
)
```

**Process:**
1. Query `flightsconfig` for matching origin/destination
2. For each config:
   - Generate unique `flight_id`
   - Check if flight already exists
   - If not exists:
     - Convert HH:MM times to ISO timestamps
     - Handle overnight flights (add +1 day if needed)
     - Insert into `flights` table
3. Return count of generated flights

## Benefits

### 1. **Storage Efficiency**
- **Before:** 8,690 flight records (7 days × ~1,241 flights/day)
- **After:** 543 configs + generated flights as needed
- **Savings:** ~95% reduction in base data size

### 2. **Infinite Date Range**
- Generate flights for any future date
- No need to pre-populate months/years of data
- Users can search any date without limitations

### 3. **Easy Maintenance**
- Update one config → affects all future dates
- Change price/schedule → edit template only
- No mass updates to thousands of records

### 4. **Performance**
- Only generate flights when searched
- Reuse generated flights for repeat searches
- Fast lookups with indexed flight_id

## Routes Available

The system has configs for these city pairs:

| Route | Configs | Avg Duration |
|-------|---------|--------------|
| LAS ↔ TPA | 48 each direction | 318 min |
| DCA ↔ TPA | 50 each direction | 188 min |
| LAS ↔ YVR | 30 each direction | 399 min |
| DCA ↔ LAS | 62 each direction | 81 min |
| EWR ↔ DCA | 72 each direction | 390 min |
| EWR ↔ TPA | 55 each direction | 105 min |
| YVR ↔ TPA | 48 each direction | 391 min |
| YVR ↔ DCA | 54 each direction | 116 min |
| YVR ↔ EWR | 58 each direction | 268 min |

**Total:** 543 unique flight configurations

## Example Scenarios

### Scenario 1: First Search
```
User: Search LAS → TPA on 2025-12-25

1. Check flightsconfig: Found 48 configs
2. Generate 48 flights for 2025-12-25
3. Display all 48 flights sorted by departure time
```

### Scenario 2: Repeat Search (Same Route/Date)
```
User: Search LAS → TPA on 2025-12-25 (again)

1. Check flightsconfig: Found 48 configs
2. Generate flights:
   - FC00001_2025-12-25 → Already exists, skip
   - FC00002_2025-12-25 → Already exists, skip
   - ... (all 48 already exist)
   - Generated: 0 new flights
3. Display all 48 existing flights
```

### Scenario 3: Different Date
```
User: Search LAS → TPA on 2025-12-26

1. Check flightsconfig: Found 48 configs
2. Generate 48 NEW flights for 2025-12-26
   - FC00001_2025-12-26 (new)
   - FC00002_2025-12-26 (new)
   - ...
3. Display all 48 flights for Dec 26
```

### Scenario 4: No Route Available
```
User: Search NYC → LAX (no configs exist)

1. Check flightsconfig: Found 0 configs
2. Skip generation
3. Display: "No Flights Found" message
```

## Technical Implementation

### Files Modified

**Schema** (`db/schema.ts`)
- Added `flightsconfig` table definition

**Queries** (`db/queries.ts`)
- `getFlightConfigsByRoute()` - Fetch configs by route
- `checkFlightExists()` - Check if flight already generated
- Modified `searchFlights()` - Date-agnostic search

**Mutations** (`db/mutations.ts`)
- `generateFlightsFromConfig()` - Core generation logic
- `initializeDatabase()` - Loads `fightsconfig.json`

**UI** (`app/search-results.tsx`)
- Pre-search config check
- Automatic flight generation
- Handles both outbound and return flights

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User enters search criteria                                 │
│ (Origin: LAS, Destination: TPA, Date: 2025-10-09)          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Query flightsconfig table                                   │
│ SELECT * FROM flightsconfig                                 │
│ WHERE origin='LAS' AND destination='TPA'                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Found 48 configs?    │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
┌────────────────┐      ┌──────────────────┐
│ Generate       │      │ Show "No Flights │
│ Flights        │      │ Found"           │
└───────┬────────┘      └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ For each config:                                            │
│ 1. Create flight_id = "FC00001_2025-10-09"                 │
│ 2. Check if exists in flights table                        │
│ 3. If not exists:                                           │
│    - Convert times: "21:15" → "2025-10-09T21:15:00Z"      │
│    - Handle overnight: "02:33" → "2025-10-10T02:33:00Z"   │
│    - INSERT INTO flights                                    │
│ 4. If exists: Skip (no duplicate)                          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Search flights table                                        │
│ SELECT * FROM flights                                       │
│ WHERE origin='LAS' AND destination='TPA'                    │
│ ORDER BY departure_time                                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Display flights to user                                     │
│ (All LAS→TPA flights across all dates, sorted by time)     │
└─────────────────────────────────────────────────────────────┘
```

## Overnight Flight Examples

### Example 1: HA6326 (LAS → TPA)
```
Config:
  departure_time: "21:15"  (9:15 PM)
  arrival_time: "02:33"    (2:33 AM)

Generated for 2025-10-09:
  departure_time: "2025-10-09T21:15:00Z"
  arrival_time: "2025-10-10T02:33:00Z"  ✅ Next day
```

### Example 2: AM8650 (LAS → TPA)
```
Config:
  departure_time: "12:00"  (12:00 PM)
  arrival_time: "17:18"    (5:18 PM - same day)

Generated for 2025-10-09:
  departure_time: "2025-10-09T12:00:00Z"
  arrival_time: "2025-10-09T17:18:00Z"  ✅ Same day
```

### Example 3: WN5540 (EWR → DCA)
```
Config:
  departure_time: "23:30"  (11:30 PM)
  arrival_time: "06:00"    (6:00 AM - next day)

Generated for 2025-10-09:
  departure_time: "2025-10-09T23:30:00Z"
  arrival_time: "2025-10-10T06:00:00Z"  ✅ Next day
```

## Code Locations

### Schema Definition
- **File:** `src/db/schema.ts`
- **Lines:** 122-145 (flightsconfig table)
- **Lines:** 96-120 (flights table)

### Generation Logic
- **File:** `src/db/mutations.ts`
- **Function:** `generateFlightsFromConfig()`
- **Lines:** 478-569

### Query Functions
- **File:** `src/db/queries.ts`
- **Function:** `getFlightConfigsByRoute()`
- **Lines:** 343-361

### UI Integration
- **File:** `src/app/search-results.tsx`
- **Function:** `loadFlights()`
- **Lines:** 68-141

## Testing

### Pre-populated Data
The `mock-flights.json` file contains pre-generated flights for Oct 9-15, 2025 to support:
- Initial database seeding
- Testing without generation
- Demo/preview functionality

### Live Generation
Once the app runs, searching any new date will:
1. Generate flights from configs
2. Store them permanently
3. Reuse on subsequent searches

## Summary

**What We Built:**
- ✅ 543 reusable flight configuration templates
- ✅ Dynamic flight generation for any date
- ✅ Automatic overnight flight handling (date math)
- ✅ Duplicate prevention (check before insert)
- ✅ Round-trip support (both directions)
- ✅ Infinite date range capability
- ✅ 95% storage reduction vs pre-generated data

**Result:** Users can search flights for **any future date** without pre-generating data!

