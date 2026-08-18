<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Flight Booking Database Schema

## Overview

The flight booking database is a comprehensive system designed to handle airline reservations, passenger management, and booking operations. It supports both one-way and round-trip bookings with full tracking of flight statuses, payments, cancellations, seat assignments, and check-in status.

## Database Summary

### Implemented Tables (9 tables)
| Category | Tables | Count |
|----------|--------|-------|
| **Core Tables** | users, airlines, airports, city_pairs, flights | 5 |
| **Booking Tables** | bookings, booking_flights, passengers, seat_assignments | 4 |
| **Total Implemented** | | **9** |

### Planned Tables (Future Enhancement)
- user_preferences
- notifications
- search_history

### Key Features
- ✅ User authentication and profile management
- ✅ Flight search and booking
- ✅ One-way and round-trip booking support
- ✅ Multi-passenger bookings
- ✅ Seat selection and assignments
- ✅ Check-in tracking with timestamps
- ✅ Payment and refund tracking
- ✅ Individual flight-level cancellations
- ✅ Soft deletes for users

## Database Tables

### Core Tables

#### 1. Users (`users`)
**Purpose**: Stores user account information for authentication and profile management.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier for each user | `1`, `2`, `100` |
| `email` | TEXT | NOT NULL, UNIQUE | User's email address used for login and communication. Must be unique across all users | `john.doe@example.com` |
| `username` | TEXT | NOT NULL, UNIQUE | Display name for the user. Must be unique across the system | `john_doe`, `traveler123` |
| `password` | TEXT | NOT NULL | Hashed password for authentication. Never stored in plain text | `$2b$10$...` |
| `avatar` | TEXT | DEFAULT '' | URL or path to user's profile picture. Empty string if no avatar | `https://...`, `''` |
| `bio` | TEXT | DEFAULT '' | User's biography or description. Empty string if not provided | `Frequent traveler...` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when the account was created | `2024-01-15 10:30:00.000` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of last profile update | `2024-10-24 15:45:30.000` |
| `deleted_at` | TEXT | NULL | Soft delete timestamp. NULL if account is active, set to deletion time when deleted | `NULL` or `2024-12-01...` |

#### 2. Airlines (`airlines`)
**Purpose**: Master reference data for all airline companies operating in the system.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | TEXT | PRIMARY KEY | Internal airline identifier. Generated as "airline_" + number | `airline_15`, `airline_9` |
| `name` | TEXT | NOT NULL | Full official name of the airline company | `American Airlines`, `Hawaiian Airlines` |
| `iata_code` | TEXT | NOT NULL, UNIQUE | Two-letter IATA airline code. Must be unique | `AM`, `HA`, `UA`, `WN` |
| `country` | TEXT | NOT NULL | Country where airline is based/registered | `United States`, `Mexico` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when airline record was added to system | `2024-01-01 00:00:00.000` |

#### 3. Airports (`airports`)
**Purpose**: Master reference data for all airports available for booking in the system.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `code` | TEXT | PRIMARY KEY | Three-letter IATA airport code. Unique identifier | `DCA`, `TPA`, `LAS`, `EWR` |
| `name` | TEXT | NOT NULL | Full official name of the airport | `Ronald Reagan Washington National`, `Tampa International` |
| `city` | TEXT | NOT NULL | City where the airport is located | `Washington`, `Tampa`, `Las Vegas` |
| `country` | TEXT | NOT NULL | Country where the airport is located | `United States`, `Canada`, `Mexico` |
| `timezone` | TEXT | NOT NULL | IANA timezone identifier for the airport location | `America/New_York`, `America/Los_Angeles` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when airport was added to system | `2024-01-01 00:00:00.000` |

#### 4. City Pairs (`city_pairs`)
**Purpose**: Pre-calculated route information between airport pairs, storing distance and average flight duration for quick lookups.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier for the route | `1`, `2`, `100` |
| `origin` | TEXT | NOT NULL, FK → airports.code | Origin airport IATA code. References airports table | `DCA`, `LAX` |
| `destination` | TEXT | NOT NULL, FK → airports.code | Destination airport IATA code. References airports table | `TPA`, `JFK` |
| `distance_km` | INTEGER | NOT NULL | Distance between airports in kilometers (great circle distance) | `1200`, `450`, `3500` |
| `avg_duration_minutes` | INTEGER | NOT NULL | Average flight time in minutes based on historical data | `135`, `240`, `360` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when route was added | `2024-01-01 00:00:00.000` |

#### 5. Flights (`flights`)
**Purpose**: Individual flight instances with specific schedules, pricing, and availability. Each record represents a schedulable flight on a specific date.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `flight_id` | TEXT | PRIMARY KEY | Unique identifier composed of airline code + flight number + date | `HA6326_2025-10-09`, `UA123_2025-11-15` |
| `airline_id` | TEXT | NOT NULL, FK → airlines.id | References the airline operating this flight | `airline_15`, `airline_9` |
| `airline_code` | TEXT | NOT NULL | Two-letter IATA airline code (denormalized for performance) | `HA`, `UA`, `AM` |
| `flight_number` | TEXT | NOT NULL | Flight number assigned by the airline | `6326`, `123`, `4589` |
| `origin` | TEXT | NOT NULL, FK → airports.code | Departure airport code. References airports table | `DCA`, `LAX`, `JFK` |
| `destination` | TEXT | NOT NULL, FK → airports.code | Arrival airport code. References airports table | `TPA`, `EWR`, `LAS` |
| `departure_time` | TEXT | NOT NULL | Scheduled departure time in ISO 8601 format | `2025-10-09T08:30:00.000Z` |
| `arrival_time` | TEXT | NOT NULL | Scheduled arrival time in ISO 8601 format | `2025-10-09T11:45:00.000Z` |
| `duration_minutes` | INTEGER | NOT NULL | Total flight duration in minutes including taxi time | `195`, `360`, `450` |
| `fare` | REAL | NOT NULL | Base ticket price per passenger (before taxes/fees) | `299.99`, `150.00`, `899.50` |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Currency code for fare pricing | `USD`, `EUR`, `CAD` |
| `seats_available` | INTEGER | NOT NULL | Number of seats still available for booking. Decreases with bookings | `50`, `0`, `180` |
| `aircraft_type` | TEXT | NOT NULL | Aircraft model/type operating this flight | `Boeing 737`, `Airbus A320`, `Boeing 777` |
| `date` | TEXT | NOT NULL | Flight date in YYYY-MM-DD format for easy filtering | `2025-10-09`, `2025-11-15` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when flight was added to system | `2024-01-01 00:00:00.000` |

### Booking Tables

#### 6. Bookings (`bookings`)
**Purpose**: Main booking records containing reservation details, payment status, and overall booking state. Each booking can contain one or more flights.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `booking_id` | TEXT | PRIMARY KEY | Internal unique booking identifier | `BK001`, `BK002`, `BK1234` |
| `booking_reference` | TEXT | NOT NULL, UNIQUE | 6-character alphanumeric code shown to customers for easy reference | `ABC123`, `XYZ789`, `MNO456` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | ID of user who created the booking. References users table | `1`, `25`, `100` |
| `trip_type` | TEXT | NOT NULL | Type of journey: "one_way" (single flight) or "round_trip" (outbound + return) | `one_way`, `round_trip` |
| `booking_date` | TEXT | NOT NULL | Date and time when booking was created (ISO 8601 format) | `2024-10-24T14:30:00.000Z` |
| `status` | TEXT | NOT NULL | Current booking status: "pending", "confirmed", "cancelled", "partially_cancelled", "completed" | `confirmed`, `cancelled` |
| `payment_status` | TEXT | NOT NULL | Payment state: "pending", "paid", "refunded", "partially_refunded", "failed" | `paid`, `refunded` |
| `total_price` | REAL | NOT NULL | Total amount for all flights and passengers (including taxes/fees) | `599.99`, `1299.50`, `2450.00` |
| `refund_amount` | REAL | DEFAULT 0 | Total amount refunded to customer. 0 if no refunds issued | `0`, `299.99`, `1299.50` |
| `amount_paid` | REAL | NULL | Net amount paid after refunds (total_price - refund_amount). NULL until calculated | `599.99`, `0`, `1150.01` |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Currency code for all monetary amounts in this booking | `USD`, `EUR`, `CAD` |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp when booking record was created | `2024-10-24 14:30:00.000` |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp of last modification to booking | `2024-10-25 10:15:00.000` |

#### 7. Booking Flights (`booking_flights`)
**Purpose**: Junction table connecting bookings to flights with denormalized flight data for performance. Supports multiple flights per booking (round trips) and individual flight-level status tracking.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique record identifier | `1`, `2`, `500` |
| `booking_id` | TEXT | NOT NULL, FK → bookings.booking_id | References the parent booking | `BK001`, `BK002` |
| `flight_id` | TEXT | NOT NULL, FK → flights.flight_id | References the actual flight | `HA6326_2025-10-09` |
| `airline_code` | TEXT | NOT NULL | Airline IATA code (copied from flight for faster queries) | `HA`, `UA`, `AM` |
| `flight_number` | TEXT | NOT NULL | Flight number (copied from flight for faster queries) | `6326`, `123` |
| `origin` | TEXT | NOT NULL | Origin airport code (copied from flight) | `DCA`, `LAX` |
| `destination` | TEXT | NOT NULL | Destination airport code (copied from flight) | `TPA`, `JFK` |
| `departure_time` | TEXT | NOT NULL | Departure time in ISO 8601 (copied from flight) | `2025-10-09T08:30:00.000Z` |
| `arrival_time` | TEXT | NOT NULL | Arrival time in ISO 8601 (copied from flight) | `2025-10-09T11:45:00.000Z` |
| `duration_minutes` | INTEGER | NOT NULL | Flight duration in minutes (copied from flight) | `195`, `360` |
| `fare` | REAL | NOT NULL | Fare paid for this specific flight (may differ from base fare) | `299.99`, `150.00` |
| `segment` | TEXT | NOT NULL | Flight segment in trip: "outbound" (first flight) or "return" (return flight) | `outbound`, `return` |
| `status` | TEXT | NOT NULL, DEFAULT 'confirmed' | Individual flight status: "pending", "confirmed", "cancelled", "completed" | `confirmed`, `cancelled` |
| `cancellation_date` | TEXT | NULL | ISO 8601 timestamp when flight was cancelled. NULL if not cancelled | `NULL`, `2024-10-20T10:00:00.000Z` |
| `cancellation_reason` | TEXT | NULL | Reason provided for cancellation. NULL if not cancelled | `NULL`, `Customer request` |
| `refund_amount` | REAL | DEFAULT 0 | Amount refunded for this specific flight. 0 if no refund | `0`, `299.99` |

#### 8. Passengers (`passengers`)
**Purpose**: Stores individual passenger information for each booking. One booking can have multiple passengers. Contains travel document and contact details.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `passenger_id` | TEXT | PRIMARY KEY | Unique passenger identifier | `P001`, `P002`, `P1234` |
| `booking_id` | TEXT | NOT NULL, FK → bookings.booking_id | References the booking this passenger belongs to | `BK001`, `BK002` |
| `first_name` | TEXT | NOT NULL | Passenger's first name as on travel document | `John`, `Maria`, `Wei` |
| `last_name` | TEXT | NOT NULL | Passenger's last name as on travel document | `Doe`, `Garcia`, `Chen` |
| `email` | TEXT | NOT NULL | Passenger's email address for communication | `john.doe@example.com` |
| `phone` | TEXT | NOT NULL | Passenger's contact phone number | `+1-555-0123`, `+44-20-7123-4567` |
| `date_of_birth` | TEXT | NOT NULL | Passenger's birth date in YYYY-MM-DD format | `1990-05-15`, `2010-12-01` |
| `passport_number` | TEXT | NOT NULL | Passport or travel document number | `X12345678`, `AB1234567` |
| `ticket_number` | TEXT | NOT NULL, UNIQUE | Unique airline ticket number. Must be unique across all bookings | `TKT-001-ABC123`, `TKT-002-XYZ789` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when passenger record was created | `2024-10-24 14:30:00.000` |

#### 9. Seat Assignments (`seat_assignments`)
**Purpose**: Links passengers to specific seats on specific flights. Tracks check-in status and timing. One passenger needs one seat per flight.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique assignment identifier | `1`, `2`, `500` |
| `passenger_id` | TEXT | NOT NULL, FK → passengers.passenger_id | References the passenger being assigned a seat | `P001`, `P002` |
| `flight_id` | TEXT | NOT NULL, FK → flights.flight_id | References the flight for this seat assignment | `HA6326_2025-10-09` |
| `seat_number` | TEXT | NOT NULL | Seat location on aircraft (row number + letter) | `12A`, `15C`, `1B`, `23F` |
| `check_in_status` | TEXT | DEFAULT 'not_checked_in' | Check-in status: "not_checked_in" or "checked_in" | `not_checked_in`, `checked_in` |
| `check_in_time` | TEXT | NULL | ISO 8601 timestamp when passenger checked in. NULL if not checked in | `NULL`, `2025-10-09T06:00:00.000Z` |

### Supporting Tables (Future Enhancement)

> **Note**: The following tables are documented for future implementation. They are not currently implemented in the schema but represent planned features for enhanced user experience.

#### 10. User Preferences (`user_preferences`) - *Planned*
**Purpose**: Store user-specific settings and preferences for a personalized booking experience.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique preference record identifier | `1`, `2`, `100` |
| `user_id` | INTEGER | NOT NULL, UNIQUE, FK → users.id | References user. One preference record per user (1:1 relationship) | `1`, `25` |
| `preferred_airline` | TEXT | NULL | IATA code of user's favorite airline. NULL if no preference | `UA`, `HA`, `NULL` |
| `preferred_seat_type` | TEXT | NULL | Preferred seat location: "window", "aisle", "middle". NULL if no preference | `window`, `aisle` |
| `meal_preference` | TEXT | NULL | Dietary preference: "vegetarian", "vegan", "gluten_free", "halal", "kosher" | `vegetarian`, `vegan` |
| `notifications_enabled` | INTEGER | NOT NULL, DEFAULT 1 | Enable push notifications (0 = disabled, 1 = enabled) | `0`, `1` |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Preferred currency for displaying prices | `USD`, `EUR`, `GBP` |
| `theme` | TEXT | NOT NULL, DEFAULT 'auto' | UI theme preference: "light", "dark", "auto" (system default) | `dark`, `auto` |
| `language` | TEXT | NOT NULL, DEFAULT 'en' | Preferred language ISO code | `en`, `es`, `fr` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when preferences were first created | `2024-01-15 10:30:00.000` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of last preferences update | `2024-10-24 15:00:00.000` |

#### 11. Notifications (`notifications`) - *Planned*
**Purpose**: Store flight-related notifications and alerts for users. Supports different notification types and priorities.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique notification identifier | `1`, `2`, `1000` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | References user who should receive this notification | `1`, `25`, `100` |
| `booking_id` | TEXT | NULL, FK → bookings.booking_id | References related booking. NULL for general notifications | `BK001`, `NULL` |
| `title` | TEXT | NOT NULL | Short notification title (max 100 chars recommended) | `Flight Delayed`, `Booking Confirmed` |
| `message` | TEXT | NOT NULL | Full notification message body | `Your flight HA6326 has been delayed...` |
| `type` | TEXT | NOT NULL | Notification category: "booking_confirmation", "flight_delay", "gate_change", "cancellation", "reminder" | `flight_delay`, `reminder` |
| `is_read` | INTEGER | NOT NULL, DEFAULT 0 | Read status (0 = unread, 1 = read) | `0`, `1` |
| `priority` | TEXT | NOT NULL, DEFAULT 'medium' | Urgency level: "low", "medium", "high", "critical" | `high`, `critical` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when notification was created | `2024-10-24 08:00:00.000` |
| `read_at` | TEXT | NULL | ISO 8601 timestamp when user read the notification. NULL if unread | `NULL`, `2024-10-24 09:15:00.000` |
| `deleted_at` | TEXT | NULL | Soft delete timestamp. NULL if active | `NULL`, `2024-10-25 10:00:00.000` |

#### 12. Search History (`search_history`) - *Planned*
**Purpose**: Track user's flight searches for analytics and quick rebooking. Helps users repeat previous searches quickly.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique search record identifier | `1`, `2`, `500` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | References user who performed the search | `1`, `25`, `100` |
| `origin` | TEXT | NOT NULL | Origin airport IATA code searched | `DCA`, `LAX`, `JFK` |
| `destination` | TEXT | NOT NULL | Destination airport IATA code searched | `TPA`, `EWR`, `LAS` |
| `departure_date` | TEXT | NOT NULL | Departure date searched in YYYY-MM-DD format | `2025-10-09`, `2025-12-15` |
| `return_date` | TEXT | NULL | Return date for round trips. NULL for one-way searches | `NULL`, `2025-10-16` |
| `passengers` | INTEGER | NOT NULL, DEFAULT 1 | Number of passengers in search | `1`, `2`, `4` |
| `trip_type` | TEXT | NOT NULL | Type of trip searched: "one_way" or "round_trip" | `one_way`, `round_trip` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when search was performed | `2024-10-24 10:30:00.000` |

---

## Relationships

### Primary Relationships (Implemented)
| Parent Table | Child Table | Relationship Type | Description |
|-------------|-------------|-------------------|-------------|
| **users** | **bookings** | 1:many | One user can make multiple bookings |
| **bookings** | **booking_flights** | 1:many | One booking can contain multiple flights (round trips) |
| **bookings** | **passengers** | 1:many | One booking can have multiple passengers |
| **flights** | **booking_flights** | 1:many | One flight can be in multiple bookings |
| **passengers** | **seat_assignments** | 1:many | One passenger needs seats on each flight in their booking |
| **flights** | **seat_assignments** | 1:many | One flight has multiple seat assignments |

### Master Data Relationships (Implemented)
| Parent Table | Child Table | Relationship Type | Description |
|-------------|-------------|-------------------|-------------|
| **airlines** | **flights** | 1:many | One airline operates multiple flights |
| **airports** | **flights** (origin) | 1:many | One airport is the origin for many flights |
| **airports** | **flights** (destination) | 1:many | One airport is the destination for many flights |
| **airports** | **city_pairs** (origin) | 1:many | One airport is the origin in many city pairs |
| **airports** | **city_pairs** (destination) | 1:many | One airport is the destination in many city pairs |

### Planned Relationships (Future)
| Parent Table | Child Table | Relationship Type | Description |
|-------------|-------------|-------------------|-------------|
| **users** | **user_preferences** | 1:1 | One user has one set of preferences |
| **users** | **notifications** | 1:many | One user receives multiple notifications |
| **users** | **search_history** | 1:many | One user has multiple search records |
| **bookings** | **notifications** | 1:many | One booking can trigger multiple notifications |

## Business Rules

### Booking Management
1. **Round Trip Bookings**: A single booking can contain multiple flights (outbound and return)
2. **Partial Cancellations**: Individual flights within a booking can be cancelled while keeping the booking active
3. **Payment Tracking**: Total price, refund amount, and amount paid are tracked separately
4. **Status Management**: Both booking-level and flight-level statuses are maintained

### Data Integrity
1. **Cascade Deletes**: User deletion cascades to all related records
2. **Unique Constraints**: Email, username, booking references, and ticket numbers must be unique
3. **Foreign Key Constraints**: All relationships are enforced at the database level
4. **Soft Deletes**: Users and notifications support soft deletion

### Performance Considerations
1. **Denormalization**: Booking flights table includes denormalized flight data for faster queries
2. **Indexes**: Primary keys and foreign keys are automatically indexed
3. **Timestamp Defaults**: All tables include creation and update timestamps

## Enums and Constants

### Trip Types
| Value | Description | Use Case |
|-------|-------------|----------|
| `one_way` | Single flight booking | Customer traveling one direction only |
| `round_trip` | Multiple flights (outbound and return) | Customer traveling to destination and back |

### Booking Status
| Value | Description | When Used |
|-------|-------------|-----------|
| `pending` | Booking created but not confirmed | Payment not completed or processing |
| `confirmed` | Booking confirmed and active | Payment successful, ready to travel |
| `cancelled` | Entire booking cancelled | All flights cancelled, full refund may apply |
| `partially_cancelled` | Some flights cancelled | One or more flights cancelled in round trip |
| `completed` | All flights completed | All travel dates have passed |

### Payment Status
| Value | Description | When Applied |
|-------|-------------|--------------|
| `pending` | Payment not yet processed | Initial booking state before payment |
| `paid` | Payment completed successfully | Full payment received |
| `refunded` | Full refund issued | Entire booking amount returned to customer |
| `partially_refunded` | Partial refund issued | Some flights refunded, others kept |
| `failed` | Payment processing failed | Payment declined or error occurred |

### Flight Status (for booking_flights table)
| Value | Description | Use Case |
|-------|-------------|----------|
| `pending` | Flight not yet confirmed | Awaiting confirmation or payment |
| `confirmed` | Flight confirmed and ticketed | Normal active state |
| `cancelled` | Individual flight cancelled | Flight removed from booking |
| `completed` | Flight has departed/completed | Past travel date |

### Flight Segments
| Value | Description | Example |
|-------|-------------|---------|
| `outbound` | First flight in trip | DCA → TPA (going to destination) |
| `return` | Return flight in trip | TPA → DCA (returning home) |

### Check-in Status (for seat_assignments table)
| Value | Description | When Set |
|-------|-------------|----------|
| `not_checked_in` | Passenger has not checked in | Default state after seat selection |
| `checked_in` | Passenger has completed check-in | After check-in process, boarding pass issued |

### Notification Types (*Planned*)
| Value | Description | Trigger Event |
|-------|-------------|---------------|
| `booking_confirmation` | Booking successfully created | After successful payment |
| `flight_delay` | Flight has been delayed | Airline updates schedule |
| `gate_change` | Gate assignment changed | Day of travel updates |
| `cancellation` | Flight/booking cancelled | Cancellation processed |
| `reminder` | Upcoming flight reminder | 24 hours before departure |

### Notification Priority (*Planned*)
| Value | Description | Example Use |
|-------|-------------|-------------|
| `low` | Low priority, informational | Search history, recommendations |
| `medium` | Standard priority | Booking confirmations, general updates |
| `high` | High priority, requires attention | Gate changes, delays |
| `critical` | Critical, immediate action needed | Flight cancellations, emergency changes |
