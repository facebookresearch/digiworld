# Flight Booking App Data Model Documentation

## Overview
This document describes the database schema and data relationships for the flight booking application. It explains how each table maps to app features and how entities reference each other, ensuring clarity for development and future maintenance.

---

## Entity Relationships & Table Mapping

### 1. Users
- **Table:** `users`
- **Purpose:** Stores user accounts and profile details.
- **Key Fields:**
  - `id`: Primary key
  - `email`, `username`: Unique identifiers
  - `avatar`, `bio`: Profile info
  - `created_at`, `updated_at`, `deleted_at`: Timestamps for auditing and soft deletion
- **References:**
  - One-to-many with `bookings` (via `bookings.user_id`)

### 2. Airlines
- **Table:** `airlines`
- **Purpose:** Master catalog of airline companies
- **Key Fields:**
  - `id`: Primary key (e.g., "airline_15", "airline_9")
  - `name`: Airline name
  - `iata_code`: IATA airline code (e.g., "AM", "HA", "WN")
  - `country`: Country of origin
  - `created_at`: Record creation timestamp
- **References:**
  - One-to-many with `flights` (via `flights.airline_id`)

### 3. Airports
- **Table:** `airports`
- **Purpose:** Master catalog of airports worldwide
- **Key Fields:**
  - `code`: Primary key (IATA airport code, e.g., "DCA", "TPA")
  - `name`: Airport name
  - `city`: City where airport is located
  - `country`: Country where airport is located
  - `timezone`: Airport timezone
  - `created_at`: Record creation timestamp
- **References:**
  - One-to-many with `flights` (via `flights.origin` and `flights.destination`)
  - One-to-many with `city_pairs` (via `city_pairs.origin` and `city_pairs.destination`)

### 4. City Pairs
- **Table:** `city_pairs`
- **Purpose:** Predefined routes between airports with distance and duration data
- **Key Fields:**
  - `id`: Primary key
  - `origin`: References `airports.code`
  - `destination`: References `airports.code`
  - `distance_km`: Distance in kilometers
  - `avg_duration_minutes`: Average flight duration in minutes
  - `created_at`: Record creation timestamp
- **References:**
  - Many-to-one with `airports` (via `origin` and `destination`)

### 5. Flights
- **Table:** `flights`
- **Purpose:** Individual flight instances with schedules and pricing
- **Key Fields:**
  - `flight_id`: Primary key (e.g., "HA6326_2025-10-09")
  - `airline_id`: References `airlines.id`
  - `airline_code`: Airline IATA code (denormalized)
  - `flight_number`: Flight number
  - `origin`: References `airports.code`
  - `destination`: References `airports.code`
  - `departure_time`, `arrival_time`: Flight times (ISO 8601)
  - `duration_minutes`: Flight duration
  - `fare`: Base fare price
  - `currency`: Currency code (default USD)
  - `seats_available`: Available seats
  - `aircraft_type`: Aircraft model
  - `date`: Flight date (YYYY-MM-DD)
  - `created_at`: Record creation timestamp
- **References:**
  - Many-to-one with `airlines`, `airports`
  - One-to-many with `booking_flights`, `seat_assignments`

### 6. Bookings
- **Table:** `bookings`
- **Purpose:** Main booking records for flight reservations
- **Key Fields:**
  - `booking_id`: Primary key (e.g., "BK001", "BK002")
  - `booking_reference`: Unique booking reference (e.g., "ABC123")
  - `user_id`: References `users.id`
  - `trip_type`: "one_way" or "round_trip"
  - `booking_date`: Booking date (ISO 8601)
  - `status`: "pending", "confirmed", "cancelled", "partially_cancelled", "completed"
  - `payment_status`: "pending", "paid", "refunded", "partially_refunded", "failed"
  - `total_price`: Total booking price
  - `refund_amount`: Amount refunded
  - `amount_paid`: Calculated as total_price - refund_amount
  - `currency`: Currency code (default USD)
  - `created_at`, `updated_at`: Timestamps
- **References:**
  - Many-to-one with `users`
  - One-to-many with `booking_flights`, `passengers`

### 7. Booking Flights
- **Table:** `booking_flights`
- **Purpose:** Junction table linking bookings to flights (supports round trips)
- **Key Fields:**
  - `id`: Primary key
  - `booking_id`: References `bookings.booking_id`
  - `flight_id`: References `flights.flight_id`
  - `airline_code`, `flight_number`: Denormalized flight data
  - `origin`, `destination`: Denormalized airport data
  - `departure_time`, `arrival_time`: Denormalized flight times
  - `duration_minutes`: Denormalized duration
  - `fare`: Denormalized fare
  - `segment`: "outbound" or "return"
  - `status`: Individual flight status
  - `cancellation_date`, `cancellation_reason`: Cancellation details
  - `refund_amount`: Refund amount for this flight
- **References:**
  - Many-to-one with `bookings`, `flights`

### 8. Passengers
- **Table:** `passengers`
- **Purpose:** Passenger information for each booking
- **Key Fields:**
  - `passenger_id`: Primary key (e.g., "P001", "P002")
  - `booking_id`: References `bookings.booking_id`
  - `first_name`, `last_name`: Passenger name
  - `email`, `phone`: Contact information
  - `date_of_birth`: Date of birth (YYYY-MM-DD)
  - `passport_number`: Passport number
  - `ticket_number`: Unique ticket number
  - `created_at`: Record creation timestamp
- **References:**
  - Many-to-one with `bookings`
  - One-to-many with `seat_assignments`

### 9. Seat Assignments
- **Table:** `seat_assignments`
- **Purpose:** Seat assignments for passengers on specific flights
- **Key Fields:**
  - `id`: Primary key
  - `passenger_id`: References `passengers.passenger_id`
  - `flight_id`: References `flights.flight_id`
  - `seat_number`: Seat number (e.g., "12A", "15C")
- **References:**
  - Many-to-one with `passengers`, `flights`

---

## Data Integrity & Reference Notes
- All major relationships use foreign keys for referential integrity.
- Many-to-many relationships (bookings-flights) use mapping tables with denormalized data for performance.
- Soft deletion (`deleted_at`) is used for users to allow for recovery and audit.
- Flight data is denormalized in `booking_flights` for faster queries and historical accuracy.
- All timestamps use UTC via `strftime` for consistency.
- Unique constraints ensure data integrity for emails, usernames, booking references, and ticket numbers.

---

## Example Data Mapping Scenarios

- **A user searches for flights:**
  - Query `flights` table with origin, destination, and date filters.
  - Join with `airlines` and `airports` for display information.

- **A user creates a one-way booking:**
  - Insert into `bookings` with trip_type "one_way".
  - Insert into `booking_flights` with segment "outbound".
  - Insert into `passengers` with passenger details.
  - Insert into `seat_assignments` for each passenger.

- **A user creates a round-trip booking:**
  - Insert into `bookings` with trip_type "round_trip".
  - Insert into `booking_flights` with segments "outbound" and "return".
  - Insert into `passengers` with passenger details.
  - Insert into `seat_assignments` for each passenger on each flight.

- **A user cancels one flight in a round trip:**
  - Update `booking_flights.status` to "cancelled" for the specific flight.
  - Update `booking_flights.cancellation_date` and `cancellation_reason`.
  - Update `booking_flights.refund_amount` for the cancelled flight.
  - Update `bookings.status` to "partially_cancelled".
  - Update `bookings.payment_status` to "partially_refunded".

- **A user cancels entire booking:**
  - Update `bookings.status` to "cancelled".
  - Update `bookings.payment_status` to "refunded".
  - Update all related `booking_flights.status` to "cancelled".

- **A flight is completed:**
  - Update `booking_flights.status` to "completed".
  - Update `bookings.status` to "completed" if all flights are completed.

---

## Business Rules & Constraints

### Booking Management
1. **Round Trip Bookings**: A single booking can contain multiple flights (outbound and return)
2. **Partial Cancellations**: Individual flights within a booking can be cancelled while keeping the booking active
3. **Payment Tracking**: Total price, refund amount, and amount paid are tracked separately
4. **Status Management**: Both booking-level and flight-level statuses are maintained

### Data Integrity
1. **Cascade Deletes**: User deletion cascades to all related records
2. **Unique Constraints**: Email, username, booking references, and ticket numbers must be unique
3. **Foreign Key Constraints**: All relationships are enforced at the database level
4. **Soft Deletes**: Users support soft deletion for audit trails

### Performance Considerations
1. **Denormalization**: Booking flights table includes denormalized flight data for faster queries
2. **Indexes**: Primary keys and foreign keys are automatically indexed
3. **Timestamp Defaults**: All tables include creation and update timestamps

---

## Extensibility & Future Considerations
- Additional airline partnerships can be added to `airlines` table.
- New airport codes can be added to `airports` table.
- Additional trip types (multi-city) can be supported via `trip_type` field.
- Loyalty programs can be added with additional user tables.
- Payment methods can be tracked with additional payment tables.
- Flight status updates can be tracked with additional status history tables.

---

## Summary
This schema is designed for extensibility, robust referential integrity, and clarity. All major flight booking features are mapped, and the relationships are documented for both backend and frontend development. The schema supports complex booking scenarios (round trips, partial cancellations) while maintaining data consistency and providing comprehensive audit trails.