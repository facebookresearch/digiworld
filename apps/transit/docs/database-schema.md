<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Transit App - Database Schema Design

## Schema Overview

This document outlines the complete database schema for the Transit app using Drizzle ORM with SQLite.

## Entity Relationship Diagram

```
Users
  ├── SavedRoutes
  ├── TripPlans
  │   └── TripLegs
  └── UserNotifications

TransitLines
  ├── Routes
  │   ├── RouteStops
  │   │   └── Stops
  │   └── Schedules
  └── ServiceAlerts

RealTimeArrivals
  ├── Routes
  └── Stops

BikeStations
RideshareEstimates
```

## Detailed Schema

### 1. Users Table

Stores user account information and preferences.

```typescript
users {
  user_id: integer PRIMARY KEY
  username: text NOT NULL
  email: text UNIQUE NOT NULL
  phone: text
  password_hash: text NOT NULL
  created_at: text NOT NULL (ISO datetime)
  last_login: text (ISO datetime)
  home_latitude: real
  home_longitude: real
  home_address: text
  work_latitude: real
  work_longitude: real
  work_address: text
  preferred_transit_modes: text (JSON array: ["bus", "subway", "train"])
  notification_enabled: integer (boolean)
  theme_preference: text DEFAULT 'dark'
  language: text DEFAULT 'en'
}

Indexes:
- email (unique)
- username
```

### 2. Transit Lines Table

Represents different transit lines (bus routes, subway lines, etc.).

```typescript
transit_lines {
  line_id: integer PRIMARY KEY
  line_name: text NOT NULL
  line_number: text NOT NULL
  transit_type: text NOT NULL (bus/subway/train/streetcar/light_rail)
  color_code: text (hex color)
  operator_id: integer
  operator_name: text
  status: text DEFAULT 'active' (active/disrupted/maintenance/suspended)
  is_bike_allowed: integer (boolean)
  accessibility_level: text (full/partial/none)
  service_hours_start: text (HH:MM)
  service_hours_end: text (HH:MM)
  frequency_peak_minutes: integer
  frequency_offpeak_minutes: integer
  created_at: text NOT NULL
  updated_at: text
}

Indexes:
- line_number
- transit_type
- status
```

### 3. Stops Table

Physical transit stops/stations.

```typescript
stops {
  stop_id: integer PRIMARY KEY
  stop_name: text NOT NULL
  stop_code: text UNIQUE
  latitude: real NOT NULL
  longitude: real NOT NULL
  stop_type: text (stop/station/platform)
  zone_id: text
  has_shelter: integer (boolean)
  has_bench: integer (boolean)
  has_lighting: integer (boolean)
  is_wheelchair_accessible: integer (boolean)
  has_elevator: integer (boolean)
  has_escalator: integer (boolean)
  has_tactile_paving: integer (boolean)
  parking_available: integer (boolean)
  bike_parking_available: integer (boolean)
  address: text
  nearby_landmarks: text (JSON array)
  created_at: text NOT NULL
}

Indexes:
- stop_code (unique)
- latitude, longitude (for geospatial queries)
- stop_name
```

### 4. Routes Table

Specific directional paths for transit lines.

```typescript
routes {
  route_id: integer PRIMARY KEY
  line_id: integer NOT NULL FOREIGN KEY -> transit_lines
  route_name: text NOT NULL
  route_direction: text (northbound/southbound/eastbound/westbound/inbound/outbound)
  route_variant: text (express/local/limited)
  headsign: text (destination shown on vehicle)
  is_active: integer (boolean)
  operating_days: text (JSON: ["mon","tue","wed","thu","fri","sat","sun"])
  start_date: text
  end_date: text
  created_at: text NOT NULL
}

Indexes:
- line_id
- is_active
```

### 5. Route Stops Table

Junction table linking routes to stops with sequence information.

```typescript
route_stops {
  route_stop_id: integer PRIMARY KEY
  route_id: integer NOT NULL FOREIGN KEY -> routes
  stop_id: integer NOT NULL FOREIGN KEY -> stops
  stop_sequence: integer NOT NULL
  arrival_offset_minutes: integer NOT NULL (from route start)
  departure_offset_minutes: integer
  can_pickup: integer (boolean)
  can_dropoff: integer (boolean)
  is_timepoint: integer (boolean)
  distance_from_start_km: real
}

Indexes:
- route_id, stop_sequence (unique composite)
- stop_id
```

### 6. Schedules Table

Scheduled departure times for routes.

```typescript
schedules {
  schedule_id: integer PRIMARY KEY
  route_id: integer NOT NULL FOREIGN KEY -> routes
  schedule_type: text (weekday/weekend/holiday)
  departure_time: text NOT NULL (HH:MM:SS)
  days_of_week: text (JSON: [1,2,3,4,5] for Mon-Fri)
  valid_from: text NOT NULL (date)
  valid_until: text (date)
  is_active: integer (boolean)
  trip_id: text (unique trip identifier)
  vehicle_type: text
  occupancy_limit: integer
  created_at: text NOT NULL
}

Indexes:
- route_id, departure_time
- schedule_type
- is_active
```

### 7. Real-Time Arrivals Table

Live arrival predictions (simulated in offline mode).

```typescript
real_time_arrivals {
  arrival_id: integer PRIMARY KEY
  route_id: integer NOT NULL FOREIGN KEY -> routes
  stop_id: integer NOT NULL FOREIGN KEY -> stops
  schedule_id: integer FOREIGN KEY -> schedules
  scheduled_time: text NOT NULL (ISO datetime)
  estimated_time: text NOT NULL (ISO datetime)
  delay_minutes: integer DEFAULT 0
  vehicle_id: text
  vehicle_latitude: real
  vehicle_longitude: real
  occupancy_status: text (empty/seats_available/standing_room/full)
  occupancy_percentage: integer
  is_cancelled: integer (boolean)
  cancellation_reason: text
  last_updated: text NOT NULL (ISO datetime)
  next_stops: text (JSON array of next 3 stops)
}

Indexes:
- route_id, stop_id, scheduled_time
- estimated_time
- vehicle_id
```

### 8. Trip Plans Table

User-created trip plans and searches.

```typescript
trip_plans {
  trip_plan_id: integer PRIMARY KEY
  user_id: integer NOT NULL FOREIGN KEY -> users
  origin_latitude: real NOT NULL
  origin_longitude: real NOT NULL
  origin_address: text
  origin_stop_id: integer FOREIGN KEY -> stops
  destination_latitude: real NOT NULL
  destination_longitude: real NOT NULL
  destination_address: text
  destination_stop_id: integer FOREIGN KEY -> stops
  requested_departure_time: text (ISO datetime)
  requested_arrival_time: text (ISO datetime)
  actual_departure_time: text (ISO datetime)
  actual_arrival_time: text (ISO datetime)
  total_duration_minutes: integer
  total_walking_distance_km: real
  total_transit_distance_km: real
  number_of_transfers: integer
  fare_price: real
  fare_currency: text DEFAULT 'USD'
  trip_status: text (planned/in_progress/completed/cancelled)
  booking_reference: text UNIQUE
  created_at: text NOT NULL
  started_at: text
  completed_at: text
}

Indexes:
- user_id, created_at
- booking_reference
- trip_status
```

### 9. Trip Legs Table

Individual segments of a trip plan.

```typescript
trip_legs {
  leg_id: integer PRIMARY KEY
  trip_plan_id: integer NOT NULL FOREIGN KEY -> trip_plans
  leg_sequence: integer NOT NULL
  leg_type: text NOT NULL (transit/walking/bike/rideshare/wait)
  route_id: integer FOREIGN KEY -> routes
  from_stop_id: integer FOREIGN KEY -> stops
  to_stop_id: integer FOREIGN KEY -> stops
  from_latitude: real
  from_longitude: real
  to_latitude: real
  to_longitude: real
  departure_time: text (ISO datetime)
  arrival_time: text (ISO datetime)
  duration_minutes: integer
  distance_km: real
  instructions: text
  polyline: text (encoded route geometry)
  stop_count: integer (for transit legs)
  fare_portion: real
  vehicle_number: text
  platform: text
  is_completed: integer (boolean)
}

Indexes:
- trip_plan_id, leg_sequence
- leg_type
```

### 10. Saved Routes Table

User's frequently used routes.

```typescript
saved_routes {
  saved_route_id: integer PRIMARY KEY
  user_id: integer NOT NULL FOREIGN KEY -> users
  route_name: text NOT NULL
  origin_latitude: real NOT NULL
  origin_longitude: real NOT NULL
  origin_address: text
  origin_stop_id: integer FOREIGN KEY -> stops
  destination_latitude: real NOT NULL
  destination_longitude: real NOT NULL
  destination_address: text
  destination_stop_id: integer FOREIGN KEY -> stops
  preferred_departure_time: text (HH:MM)
  preferred_arrival_time: text (HH:MM)
  preferred_transit_modes: text (JSON array)
  notify_before_minutes: integer
  is_favorite: integer (boolean)
  use_count: integer DEFAULT 0
  last_used: text (ISO datetime)
  created_at: text NOT NULL
}

Indexes:
- user_id, is_favorite
- user_id, last_used
```

### 11. Service Alerts Table

Service disruptions and notifications.

```typescript
service_alerts {
  alert_id: integer PRIMARY KEY
  line_id: integer FOREIGN KEY -> transit_lines
  alert_type: text NOT NULL (delay/disruption/maintenance/closure/info/weather)
  severity: text NOT NULL (low/medium/high/critical)
  title: text NOT NULL
  description: text NOT NULL
  long_description: text
  affected_routes: text (JSON array of route_ids)
  affected_stops: text (JSON array of stop_ids)
  alternative_service: text
  start_time: text NOT NULL (ISO datetime)
  end_time: text (ISO datetime)
  is_active: integer (boolean)
  priority: integer DEFAULT 0
  url: text
  contact_info: text
  created_at: text NOT NULL
  updated_at: text
}

Indexes:
- is_active, severity
- line_id, start_time
- alert_type
```

### 12. User Notifications Table

User-specific notifications and reminders.

```typescript
user_notifications {
  notification_id: integer PRIMARY KEY
  user_id: integer NOT NULL FOREIGN KEY -> users
  notification_type: text NOT NULL (departure/arrival/transfer/alert/reminder/promotion)
  title: text NOT NULL
  message: text NOT NULL
  related_trip_id: integer FOREIGN KEY -> trip_plans
  related_alert_id: integer FOREIGN KEY -> service_alerts
  related_route_id: integer FOREIGN KEY -> routes
  scheduled_time: text (ISO datetime)
  sent_at: text (ISO datetime)
  read_at: text (ISO datetime)
  is_read: integer (boolean) DEFAULT 0
  priority: text DEFAULT 'normal' (low/normal/high/urgent)
  action_url: text
  action_label: text
  created_at: text NOT NULL
}

Indexes:
- user_id, is_read, created_at
- notification_type
- scheduled_time
```

### 13. Bike Stations Table

Bike share station information.

```typescript
bike_stations {
  station_id: integer PRIMARY KEY
  station_name: text NOT NULL
  latitude: real NOT NULL
  longitude: real NOT NULL
  station_code: text UNIQUE
  operator_name: text
  address: text
  total_docks: integer NOT NULL
  available_bikes: integer DEFAULT 0
  available_ebikes: integer DEFAULT 0
  available_docks: integer DEFAULT 0
  is_active: integer (boolean)
  is_renting: integer (boolean)
  is_returning: integer (boolean)
  last_reported: text (ISO datetime)
  has_kiosk: integer (boolean)
  payment_methods: text (JSON array)
  nearby_transit_stops: text (JSON array of stop_ids)
  created_at: text NOT NULL
  updated_at: text
}

Indexes:
- latitude, longitude
- is_active
- station_code
```

### 14. Rideshare Estimates Table

Cached rideshare pricing and availability.

```typescript
rideshare_estimates {
  estimate_id: integer PRIMARY KEY
  from_latitude: real NOT NULL
  from_longitude: real NOT NULL
  to_latitude: real NOT NULL
  to_longitude: real NOT NULL
  service_provider: text (uber/lyft/local)
  service_type: text (economy/premium/shared/xl)
  estimated_fare_min: real
  estimated_fare_max: real
  currency: text DEFAULT 'USD'
  estimated_duration_minutes: integer
  estimated_distance_km: real
  surge_multiplier: real DEFAULT 1.0
  available_vehicles_count: integer
  eta_minutes: integer
  created_at: text NOT NULL (ISO datetime)
  expires_at: text (ISO datetime)
}

Indexes:
- created_at
- service_provider, service_type
```

## Data Relationships

### One-to-Many Relationships

1. Users → SavedRoutes
2. Users → TripPlans
3. Users → UserNotifications
4. TransitLines → Routes
5. TransitLines → ServiceAlerts
6. Routes → RouteStops
7. Routes → Schedules
8. Routes → RealTimeArrivals
9. Stops → RouteStops
10. Stops → RealTimeArrivals
11. TripPlans → TripLegs

### Many-to-Many Relationships

1. Routes ↔ Stops (through RouteStops)
2. TransitLines ↔ Stops (through Routes and RouteStops)

## Mock Data Requirements

### Minimum Data Set

- **Users**: 50-100 test users
- **Transit Lines**: 10-15 lines (mix of bus, subway, train)
- **Stops**: 100-200 stops across the city
- **Routes**: 30-50 routes (2-4 per line)
- **Route Stops**: 15-30 stops per route
- **Schedules**: 20-100 trips per route per day
- **Real-Time Arrivals**: Generate dynamically based on current time
- **Trip Plans**: 100-500 historical trips
- **Service Alerts**: 3-10 active alerts
- **Bike Stations**: 20-50 stations

### Data Generation Rules

1. **Geographic Distribution**
   - Stops clustered in realistic patterns
   - Routes follow logical paths
   - Bike stations near transit hubs

2. **Temporal Patterns**
   - Peak hour frequency: 5-10 minutes
   - Off-peak frequency: 15-30 minutes
   - Late night: 30-60 minutes
   - No service: 1-4 AM

3. **Real-Time Simulation**
   - 80% on-time arrivals
   - 15% minor delays (1-5 minutes)
   - 5% major delays (6-15 minutes)
   - Random occupancy levels

4. **User Behavior**
   - 70% users have saved routes
   - Average 2-3 trips per user per week
   - Peak usage: 7-9 AM, 5-7 PM

## Query Optimization

### Common Queries

1. **Find Nearby Stops**
```sql
SELECT * FROM stops 
WHERE latitude BETWEEN ? AND ? 
  AND longitude BETWEEN ? AND ?
ORDER BY distance ASC
LIMIT 10
```

2. **Get Next Arrivals for Stop**
```sql
SELECT rta.*, r.route_name, tl.line_name, tl.line_number
FROM real_time_arrivals rta
JOIN routes r ON rta.route_id = r.route_id
JOIN transit_lines tl ON r.line_id = tl.line_id
WHERE rta.stop_id = ? 
  AND rta.estimated_time > datetime('now')
ORDER BY rta.estimated_time ASC
LIMIT 20
```

3. **Search Trip Plans**
```sql
SELECT tp.*, COUNT(tl.leg_id) as leg_count
FROM trip_plans tp
LEFT JOIN trip_legs tl ON tp.trip_plan_id = tl.trip_plan_id
WHERE tp.user_id = ?
  AND tp.trip_status = 'completed'
GROUP BY tp.trip_plan_id
ORDER BY tp.completed_at DESC
LIMIT 50
```

### Performance Indexes

Critical indexes for fast queries:
- Geospatial lookups (lat/long)
- Time-based queries (scheduled_time, estimated_time)
- User-related queries (user_id)
- Status filters (is_active, status)

## Migration Strategy

### Version 1.0 - Initial Schema
- All core tables
- Basic indexes
- Mock data generation scripts

### Version 1.1 - Enhanced Features
- Add trip sharing tables
- Carbon footprint tracking
- Social features

### Version 1.2 - Analytics
- User behavior tracking
- Popular routes
- Performance metrics


