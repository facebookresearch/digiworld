# Parking App Test Cases & Testing Report

## Executive Summary

This document summarizes the current testing status of the Parking App based on:

- The **state tracking / restoration test cases** executed via the deeplink-driven state restoration harness
- The **execution / end-to-end flow test cases** executed across all major user journeys
- The existing **automated Jest unit, static, and integration tests** in the parking codebase

**Test Coverage Overview (Manual App-Level Tests):**

- **Total Manual Test Cases Documented:** 120
- **State Tracking / Restoration Tests:** 38
- **Execution / End-to-End Flow Tests:** 82
- **Test Status:** 120 Passed (100%), 0 Failures
- **Coverage Areas:** Authentication, Navigation, State Management, Search, Map, Booking, Vehicles, Payment Methods, History, Profile, Notifications, Legal Screens, Complete Booking Flows

All provided manual test cases (both state tracking and execution flows) have been executed and are currently **passing**.

---

## Test Case Categories

### 1. State Tracking & Restoration Tests (38 test cases)

These tests verify that screen state is correctly persisted and restored when using the Parking App’s state restoration mechanism (deeplink `get`/`set` flows). Each scenario follows this pattern:

- Persist current state using the deeplink handler
- Change UI state (fields, tabs, selections)
- Trigger restoration (rollback)
- Verify that the restored state matches the previously persisted state

#### 1.1 Authentication State Tracking (Test Cases 1–9)

**Login screen (TC-1 – TC-4):**

- Empty login state persisted and restored
- Email-only state persisted, modified, and rolled back to previous email
- Email + password state persisted and restored
- Login → Signup navigation persisted and rolled back to the Login screen with fields preserved

**Signup screen (TC-5 – TC-9):**

- Empty signup state persisted and restored
- Full name-only state persisted, modified, and rolled back
- Full name + email persisted, email changed, and rolled back to previous email
- Full name + email + password persisted and restored
- Full form persisted, Signup pressed, then rollback returns to Signup with all fields filled

All authentication state tracking tests passed ✅.

#### 1.2 Tab Navigation State Tracking (Home / Vehicles / History / Payment / Profile / Notifications) (Test Cases 10–15)

- Home tab persisted, switched to Vehicles, rollback returns to Home
- Vehicles tab persisted, switched to History, rollback returns to Vehicles
- History tab persisted, switched to Payment, rollback returns to History
- Payment tab persisted, switched to Profile, rollback returns to Payment
- Profile tab persisted, switched to Home, rollback returns to Profile
- Notifications screen persisted, switched to Home, rollback returns to Notifications

All tab navigation persistence tests passed ✅.

#### 1.3 Search & Map State Tracking (Test Cases 16–20)

**Search screen (TC-16 – TC-17):**

- Empty Search state persisted, text entered, rollback returns to empty state
- Search with text persisted, text changed, rollback restores previous search text

**Map screen (TC-18 – TC-20):**

- Map screen persisted, navigated to Home, rollback returns to Map
- Map with selected zone persisted, navigated to Home, rollback restores selected zone
- Map with selected zone persisted, zone changed, rollback restores previously selected zone

All search and map state tests passed ✅.

#### 1.4 Book Parking & Confirm Payment State Tracking (Test Cases 21–24)

**Book Parking (TC-21 – TC-22):**

- Empty Book Parking screen persisted, duration entered, rollback restores empty duration input
- Alert on Book Parking (e.g., validation) persisted, alert dismissed, rollback restores alert state

**Confirm Payment (TC-23 – TC-24):**

- Confirm Payment screen persisted and rolled back; user returns to Confirm Payment screen
- Confirm Payment with selected card persisted, card changed and session created, rollback restores previously selected card

All Book Parking and Confirm Payment state tests passed ✅.

#### 1.5 History, Profile, Legal, Vehicles, Payment, and Add Payment Method State Tracking (Test Cases 25–38)

**History filter (TC-25):**

- History with “All” filter persisted, filter changed, rollback restores “All” filter.

**Profile (TC-26 – TC-28):**

- Edit PIN empty state persisted, current PIN entered, rollback returns to empty state
- Name field persisted, name changed, rollback restores previous name
- Password change form persisted and rolled back (current, new, confirm passwords)

**Legal screens (TC-29 – TC-30):**

- Terms screen persisted, tab changed, rollback returns to Terms
- Privacy screen persisted, tab changed, rollback returns to Privacy

**Add Vehicles (TC-31 – TC-33):**

- Empty Add Vehicle screen persisted, fields entered, rollback returns to empty form
- Add Vehicle with plate number + vehicle type persisted, vehicle type changed, rollback restores previous plate + vehicle type
- Add Vehicle with all details persisted, vehicle saved, rollback returns to Add Vehicle with fields still filled

**Vehicles list (TC-34):**

- Vehicles list persisted, a vehicle deleted, rollback restores deleted vehicle back into the list

**Payment (TC-35 – TC-36):**

- Payment screen persisted, default card changed, rollback restores previous default card
- Payment screen persisted, card deleted, rollback restores deleted card

**Add Payment Method (TC-37 – TC-38):**

- Empty Add Payment Method screen persisted, fields entered, rollback returns to empty state
- Add Payment Method with all details persisted, rollback returns with all details filled

All state tracking tests for these screens passed ✅.

---

### 2. Execution / End-to-End Flow Tests (82 test cases)

These tests validate complete user flows and screen-level behaviors without focusing on deep state restoration. All flows below have been executed and **passed**.

#### 2.1 Authentication & Entry Flows

- **Successful Login Flow:** Login with valid credentials navigates to Home.
- **Navigate to Signup from Login:** Login → “Sign Up” link navigates to Signup screen.
- **Successful Signup Flow:** Signup with full name, email, password navigates to Home.
- **Navigate to Login from Signup:** Signup → “Login” link navigates back to Login screen.

#### 2.2 Home Tab Flows

- View Home screen with active sessions (shows active sessions or recent history).
- View Home screen as new user (shows “No recent history” empty state).
- Navigate from Home to Search, Map, Vehicles, History, Payment, and Profile tabs.
- Extend an active session from Home (duration selection + payment).
- Stop an active session from Home (confirm stop and move session to History).

#### 2.3 Search Flows

- Search for parking zone by code/text and see matching zones.
- Search with empty text to display all zones.
- Search with no results shows “No Zones found” empty state.
- Select zone from Search results to open Book Parking for that zone.
- Clear Search text to reset field and display all zones.

#### 2.4 Map Flows

- View Map screen showing user location and parking zones.
- Select zone marker on Map to view zone details.
- Navigate from Map to Book Parking with selected zone.
- Change selected zone on Map (zone A → zone B).
- Use “My Location” to recenter map on user location.
- Navigate back from Map to Home.

#### 2.5 Book Parking & Confirm Payment Flows

**Book Parking:**

- Book parking with vehicle selection and duration, then continue to Confirm Payment.
- Handle empty vehicles state with “No vehicles added” and “Add Vehicle” button.
- Validate empty duration (“Duration Required” error).
- Navigate from Book Parking to Add Vehicle.
- Extend existing parking session via Book Parking (extend mode) and continue to Confirm Payment.
- Navigate back from Book Parking to Map.

**Confirm Payment:**

- Confirm payment with selected payment method, creating a parking session.
- Handle empty payment methods (“No payment methods” with Add Payment Method button).
- Change payment method on Confirm Payment and complete booking.
- Navigate from Confirm Payment to Add Payment Method.
- Navigate back from Confirm Payment to Book Parking.

#### 2.6 Vehicles & Add Vehicle Flows

**Vehicles:**

- View Vehicles list (all vehicles).
- View empty Vehicles list for new user (“No vehicles added”).
- Navigate from Vehicles to Add Vehicle.
- Delete vehicle with confirmation; vehicle removed from list.
- Prevent deletion when vehicle has active session (“Active Parking session. Cannot delete vehicle with active session”).

**Add Vehicle:**

- Successful Add Vehicle: plate, type, optional nickname/year, make, model, color; returns to Vehicles list.
- Validation: empty plate number (“License Plate number is required”).
- Validation: missing vehicle type (“Vehicle type is required”).
- Validation: year > current year (“Year cannot be greater than current year”).
- Validation: year < 1900 (“Year must be 1900 or current later”).
- Navigate back from Add Vehicle to Vehicles.

#### 2.7 Payment & Add Payment Method Flows

**Payment:**

- View Payment methods list.
- View empty state for new user (“No payment methods”).
- Set default payment method and verify default marking.
- Delete payment method with confirmation; card removed from list.
- Navigate from Payment to Add Payment Method.

**Add Payment Method:**

- Successful Add Payment Method: name, 16-digit card number, valid expiry; returns to Payment list.
- Validation: missing name (“Name on card is required”).
- Validation: invalid card number (less than 16 digits).
- Validation: expiry month/year in the past (“Year cannot be less than current year”).
- Navigate back from Add Payment Method to Payment.

#### 2.8 History, Profile, Notifications, Legal & Parking Details Flows

**History:**

- View History tab with past parking sessions.
- View empty History for new user (“No history”).
- Filter History by “All Vehicles”.
- Filter History by a specific vehicle.
- Open Parking Details from History item.

**Profile:**

- View Profile screen with user information.
- Edit name successfully.
- Edit name with empty field (“Name cannot be empty”).
- Change password successfully.
- Change password with wrong current password (“Current password is incorrect”).
- Change password with mismatched new/confirm passwords (“Passwords do not match”).
- Navigate from Profile to Terms and Privacy.
- Sign out and navigate back to Login screen.

**Notifications:**

- View Notifications list.
- View empty Notifications state (“No notifications”).
- Mark notification as read.

**Legal & Details:**

- Navigate back from Terms to Profile.
- Navigate back from Privacy to Profile.
- View Parking Details screen from History (parking session detail view).

#### 2.9 Complete Booking & Extended Flows

- **Complete Booking Flow:** Login → Map → select zone → Book Parking → select vehicle → enter duration → Confirm Payment → create session.
- **Complete Booking with New Vehicle:** Login → Map → Book Parking → Add Vehicle → save → select new vehicle → duration → Confirm Payment → create session.
- **Complete Booking with New Payment Method:** Login → Map → Book Parking → duration → Confirm Payment → Add Payment Method → save → select new method → Confirm Payment.
- **Search and Book Flow:** Login → Search → search zone → select zone → Book Parking → duration → Confirm Payment → create session.
- **Extend Active Session Flow:** Login → Home → extend active session → select duration → Confirm Payment → extended session created.

All execution / end-to-end flows passed ✅.

---

## Automated Unit, Static & Integration Tests (Jest)

In addition to manual app-level tests, the Parking App has a comprehensive Jest-based automated test suite under `src/__tests__`, `src/utils`, `src/services`, and `test/`.

### 3.1 Test Structure

Key locations (from `src/__tests__/README.md` and the codebase):

- `src/__tests__/unit/`
  - `queries.test.ts` – database queries
  - `mutations.test.ts` – database initialization and seeding
  - `parking-store.test.ts` – `ParkingStore` MobX store behavior
- `src/__tests__/integration/`
  - `parking-booking-flow.test.ts` – complete parking booking workflow
  - `parking-cost-calculation.test.ts` – cost calculation scenarios
- `src/__tests__/static/`
  - `static-parking-tests.test.ts` – validations against a pre-built static database
  - `static-test-setup.ts`, `ABC.db` – static DB harness and fixtures
- `src/__tests__/userStore.integration.test.ts` – user store integration tests
- `src/utils/storage/storage.test.ts` – MMKV storage utilities
- `src/services/api/apiProblem.test.ts` – API error mapping
- `test/i18n.test.ts` – i18n key coverage for translations

### 3.2 Automated Test Coverage Summary

- **Database Queries (`queries.test.ts`):**
  - Users, user locations, vehicle types, vehicle type rates
  - Vehicles, parking zones, parking history, payment methods, notifications
- **Database Mutations (`mutations.test.ts`):**
  - Seeding with mock data
  - Idempotent initialization (skip on already-seeded DB)
  - Referential integrity and error handling
- **Parking Store (`parking-store.test.ts`):**
  - Vehicle CRUD
  - Parking zone and history loading
  - Payment methods and user locations
  - Form state and computed views (defaults, active sessions, cost)
- **Integration Flows:**
  - `parking-booking-flow.test.ts`: end-to-end booking, history, end session flow
  - `parking-cost-calculation.test.ts`: durations, zone multipliers, vehicle type rates
- **Static DB Tests (`static-parking-tests.test.ts`):**
  - Valid seeded users, vehicle types, rates, and relationships
  - Email formats and uniqueness constraints where applicable
- **Utility Tests:**
  - Storage: load/save/remove/clear MMKV-backed storage
  - API problem mapping: maps Apisauce error shapes to domain error kinds
  - i18n: ensures translation keys used in code are present in `en` namespace

Overall, the automated suite provides strong coverage of **database**, **business logic**, **store behavior**, and **core workflows**, complementing the manual state tracking and execution tests.

---

## Test Case Statistics

### Manual App-Level Tests

- **Total Manual Test Cases:** 120
- **State Tracking / Restoration Tests:** 38
- **Execution / End-to-End Flow Tests:** 82
- **Passed:** 120 (100%)
- **Failed:** 0 (0%)
- **Not Implemented:** 0 (0%)

### Automated Jest Tests (High-Level)

- Unit tests for queries, mutations, parking store, storage, API error mapping, and i18n.
- Static tests validating seeded data consistency.
- Integration tests for booking flows and cost calculation.

All currently committed Jest tests are passing.

---

## Recommendations

1. **Maintain Manual Test Coverage:**
   - Keep state tracking and execution flow test lists in sync with new features.
   - Add new test cases for any new screens or flows introduced.
2. **Expand Negative and Edge-Case Coverage:**
   - Add more tests for invalid input combinations (durations, vehicle types, payment methods).
   - Extend History, Notifications, and Profile tests with more error and boundary scenarios.
3. **Strengthen Automation:**
   - Gradually convert high-value manual flows (e.g., complete booking, extend session) into automated integration tests where feasible.
   - Monitor Jest coverage reports to ensure critical paths remain covered as the app evolves.

This report reflects the current state of testing for the Parking App: **all documented manual state tracking and execution test cases are passing**, and a robust automated Jest suite validates the underlying data, logic, and key workflows.
