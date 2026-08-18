---

## **Feature Group 1: Authentication**

### **Feature Function:**

Provide secure user authentication with login and signup capabilities.

### **User Story 1.1 – User Login**

As a user, I want to log in to my account so I can access parking services.

**Acceptance Criteria:**

* User can enter email and password
* Valid credentials authenticate successfully
* User is navigated to Home screen after successful login
* Invalid credentials show appropriate error messages
* User can navigate to Signup screen from Login screen

**Assumptions:**

* Email format validation is required
* Password is required for authentication
* Session persists after successful login

---

### **User Story 1.2 – User Signup**

As a new user, I want to create an account so I can use the parking app.

**Acceptance Criteria:**

- User can enter full name, email, and password
- Valid signup data creates account successfully
- User is navigated to Home screen after successful signup
- Invalid data shows appropriate error messages
- User can navigate to Login screen from Signup screen

**Assumptions:**

- Full name, email, and password are required fields
- Email must be unique
- Password must meet minimum requirements

---

## **Feature Group 2: Home Screen**

### **Feature Function:**

Display active parking sessions and recent history to users.

### **User Story 2.1 – View Home Screen**

As a user, I want to see my active sessions and recent parking history on the home screen.

**Acceptance Criteria:**

- Home screen displays active sessions if available
- If no active sessions, displays recent history
- If no active sessions and no history, displays empty state: "No recent history"
- User can navigate to Search, Map, Vehicles, History, Payment, and Profile tabs
- User can extend or stop active sessions from home screen

**Assumptions:**

- Active sessions take priority over history
- Empty state is shown for new users with no data
- Navigation tabs are always accessible

---

### **User Story 2.2 – Manage Active Sessions**

As a user, I want to extend or stop my active parking sessions from the home screen.

**Acceptance Criteria:**

- User can click "Extend" on active session
- Extension flow navigates to Book Parking screen (extend mode)
- User can select duration and confirm payment
- Session extended successfully
- User can click "Stop" on active session
- Stop action requires confirmation
- Stopped session moves to history

**Assumptions:**

- Only one active session can exist at a time for each vehicle
- Extension requires payment confirmation
- Stop action is irreversible

---

## **Feature Group 3: Search**

### **Feature Function:**

Allow users to search for parking zones by name or zone code.

### **User Story 3.1 – Search Parking Zones**

As a user, I want to search for parking zones so I can find available parking quickly.

**Acceptance Criteria:**

- User can enter search text (e.g., 'HBRPOI')
- Search results display matching parking zones
- If search field is empty, all zones are displayed
- If no results found, empty state displayed: "No Zones found"
- User can clear search text to show all zones
- User can select a zone from search results
- Selecting a zone navigates to Book Parking screen with selected zone

**Assumptions:**

- Search is case-insensitive
- Search matches zone names and codes
- Empty search shows all available zones

---

## **Feature Group 4: Map View**

### **Feature Function:**

Display parking zones and user location on an interactive map.

### **User Story 4.1 – View Map with Zones**

As a user, I want to see seeded db parking zones and my location on a map so I can choose nearby parking.

**Acceptance Criteria:**

- Map displays all parking zones as markers
- User location is displayed on map
- User can click on zone markers to select them
- Selected zone shows details
- User can change selected zone (selecting new zone deselects previous)
- User can click "My Location" button to center map on current location
- User can navigate to Book Parking screen with selected zone
- User can navigate back to Home screen

**Assumptions:**

- Map requires location permissions
- Zones are loaded from database
- User location updates in real-time

---

## **Feature Group 5: Book Parking**

### **Feature Function:**

Allow users to book parking sessions by selecting vehicle and duration.

### **User Story 5.1 – Book Parking Session**

As a user, I want to book a parking session by selecting my vehicle and duration.

**Acceptance Criteria:**

- User must select a vehicle from dropdown
- If no vehicles available, empty state displayed: "No vehicles added" with Add Vehicle button
- User must enter duration less than 180 minutes and greater than 15 minutes (e.g., 120 min)
- Duration field cannot be empty
- Error message shown if duration is empty: "Duration Required"
- User can click "Continue to Payment" to proceed
- User can navigate to Add Vehicle screen if no vehicles exist
- User can navigate back to Map screen

**Assumptions:**

- At least one vehicle must be added before booking
- Duration is required for booking
- Zone is pre-selected from Map or Search screen

---

### **User Story 5.2 – Extend Parking Session**

As a user, I want to extend my active parking session.

**Acceptance Criteria:**

- Book Parking screen opens in extend mode
- User can select duration for extension
- User clicks "Continue to Payment" to proceed
- Navigates to Confirm Payment screen for extension

**Assumptions:**

- Extension requires payment confirmation
- Extension duration adds to existing session

---

## **Feature Group 6: Confirm Payment**

### **Feature Function:**

Process payment for parking bookings and session extensions.

### **User Story 6.1 – Confirm Payment for Booking**

As a user, I want to confirm payment to complete my parking booking.

**Acceptance Criteria:**

- User can review booking details (zone, vehicle, duration, cost)
- User must select a payment method
- If no payment methods available, empty state displayed: "No payment methods" with Add Payment Method button
- User can change selected payment method
- User can click "Confirm Payment" to process payment
- Payment processed successfully and parking session created
- User can navigate to Add Payment Method screen if needed
- User can navigate back to Book Parking screen

**Assumptions:**

- At least one payment method must be added before booking
- Payment is processed immediately
- Session starts after successful payment

---

## **Feature Group 7: Vehicle Management**

### **Feature Function:**

Allow users to view, add, and delete their vehicles.

### **User Story 7.1 – View Vehicles List**

As a user, I want to see all my registered vehicles.

**Acceptance Criteria:**

- Vehicles tab displays list of all vehicles
- If no vehicles exist, empty state displayed: "No vehicles added"
- User can navigate to Add Vehicle screen
- User can delete vehicles from list
- Deletion requires confirmation
- Vehicle deleted and removed from list

**Assumptions:**

- Users can have multiple vehicles
- Vehicles are required for booking parking

---

### **User Story 7.2 – Delete Vehicle**

As a user, I want to delete vehicles I no longer use.

**Acceptance Criteria:**

- User can click delete on a vehicle
- Deletion requires confirmation
- If vehicle has active session, error shown: "Active Parking session. Cannot delete vehicle with active session"
- Vehicle deleted and removed from list if no active session

**Assumptions:**

- Vehicles with active sessions cannot be deleted
- Deletion is permanent

---

## **Feature Group 8: Add Vehicle**

### **Feature Function:**

Allow users to register new vehicles for parking bookings.

### **User Story 8.1 – Add Vehicle**

As a user, I want to add my vehicle so I can book parking.

**Acceptance Criteria:**

- User can enter plate number (required)
- User can select vehicle type (required)
- User can enter nickname (optional)
- User can enter make (required)
- User can enter model (required)
- User can enter color (required)
- User can enter year (optional, must be >= 1900 and <= current year)
- User can click Save to add vehicle
- Vehicle added and navigated back to Vehicles list
- Error messages shown for invalid inputs:
  - "License Plate number is required" if plate number empty
  - "Vehicle type is required" if vehicle type not selected
  - "Year cannot be greater than current year" if year invalid
  - "Year must be 1900 or later" if year < 1900
- User can navigate back to Vehicles list

**Assumptions:**

- Nick name and year type are optional fields
- Year validation ensures realistic vehicle years
- Vehicle is immediately available for booking after addition

---

## **Feature Group 9: Payment Methods Management**

### **Feature Function:**

Allow users to view, add, set default, and delete payment methods.

### **User Story 9.1 – View Payment Methods**

As a user, I want to see all my saved payment methods.

**Acceptance Criteria:**

- Payment tab displays list of all payment methods
- If no payment methods exist, empty state displayed: "No payment methods"
- User can set a payment method as default
- Default payment method is marked accordingly
- User can delete payment methods
- Deletion requires confirmation
- Payment method deleted and removed from list
- User can navigate to Add Payment Method screen

**Assumptions:**

- Users can have multiple payment methods
- At least one payment method is required for bookings
- Default payment method is pre-selected during booking

---

## **Feature Group 10: Add Payment Method**

### **Feature Function:**

Allow users to add new payment methods (credit/debit cards).

### **User Story 10.1 – Add Payment Method**

As a user, I want to add a payment method so I can pay for parking.

**Acceptance Criteria:**

- User can enter name on card (required)
- User can enter card number (16 digits, required)
- User can enter expiry month (01-12, required)
- User can enter expiry year (current or future, required)
- User can click Save to add payment method
- Payment method added and navigated back to Payment list
- Error messages shown for invalid inputs:
  - "Name on card is required" if name empty
  - "Valid 16 digit card number is required" if card number invalid
  - "Year cannot be less than current year" if expiry date in past
- User can navigate back to Payment list

**Assumptions:**

- Card number must be exactly 16 digits
- Expiry date cannot be in the past
- Payment method is immediately available for use

---

## **Feature Group 11: History**

### **Feature Function:**

Display past parking sessions with filtering capabilities.

### **User Story 11.1 – View Parking History**

As a user, I want to see my past parking sessions.

**Acceptance Criteria:**

- History tab displays list of past parking sessions
- If no history exists, empty state displayed: "No history"
- User can filter history by "All Vehicles"
- User can filter history by specific vehicle
- Filtering shows only sessions for selected vehicle
- User can click on history item to view details
- Clicking history item navigates to Parking Details screen

**Assumptions:**

- History includes completed and expired sessions
- History is sorted by most recent first
- Filtering is optional, defaults to "All Vehicles"

---

## **Feature Group 12: Profile**

### **Feature Function:**

Allow users to view and edit their profile information.

### **User Story 12.1 – View and Edit Profile**

As a user, I want to view and edit my profile information.

**Acceptance Criteria:**

- Profile tab displays user information
- User can edit name
- Name update requires non-empty value
- Error message: "Name cannot be empty" if name is empty
- Name updated successfully after save
- User can change password
- Password change requires current password, new password, and confirm password
- Error messages shown:
  - "Current password is incorrect" if current password wrong
  - "Passwords do not match" if new and confirm passwords don't match
- Password changed successfully
- User can navigate to Terms and Conditions
- User can navigate to Privacy Policy
- User can sign out
- Sign out requires confirmation
- User logged out and navigated to Login screen

**Assumptions:**

- Profile information is editable
- Password changes require verification
- Sign out clears session

---

## **Feature Group 13: Notifications**

### **Feature Function:**

Display app notifications to users.

### **User Story 13.1 – View Notifications**

As a user, I want to see my app notifications.

**Acceptance Criteria:**

- Notifications screen displays list of notifications
- If no notifications exist, empty state displayed: "No notifications"
- User can click on notification to mark as read
- Notification marked as read after click

**Assumptions:**

- Notifications are sorted by most recent first
- Read status persists

---

## **Feature Group 14: Parking Details**

### **Feature Function:**

Display detailed information about a parking session.

### **User Story 14.1 – View Parking Details**

As a user, I want to see detailed information about my parking session.

**Acceptance Criteria:**

- Parking Details screen displays session information
- User can navigate to details from History screen
- Details include zone, vehicle, duration, cost, start time, end time
- User can navigate back to previous screen

**Assumptions:**

- Details are read-only
- Details available for both active and completed sessions

---

## **Feature Group 15: Offline Compliance**

### **Feature Function:**

Ensure the app operates entirely without network access or external services.

### **User Story 15.1 – Enforce Offline Execution**

As a security auditor, I want to verify this app can run fully offline to meet FAIR lab air-gapped compliance.

**Acceptance Criteria:**

- `INTERNET` permission not declared in manifest
- App tested in airplane mode across full session
- All resources (fonts, icons, configs) bundled locally
- No telemetry, analytics, or cloud sync libraries used
- All data stored locally in SQLite database
- No external API calls or network requests
- App functions completely without internet connectivity

**Assumptions:**

- All parking zones are seeded in the local database
- User locations are mocked/simulated in the database
- No real-time location services or GPS dependencies
- All map data and zone coordinates are pre-loaded in database
- User location is simulated for testing purposes

---

## **Feature Group 16: Mock Data and Database**

### **Feature Function:**

Provide seeded data and mock services for offline operation.

### **User Story 16.1 – Mock Parking Zones**

As a developer, I want parking zones to be pre-seeded in the database so the app works offline.

**Acceptance Criteria:**

- Parking zones are seeded in SQLite database
- Zones include zone code, name, coordinates, and availability
- Zones are loaded from database on app initialization
- No external API calls required to fetch zones
- Zones display correctly on map screen

**Assumptions:**

- Zones are pre-populated during database migration/seeding
- Zone data is static and does not require real-time updates
- All zone information is stored locally
- Zone coordinates are mock data stored in database

---

### **User Story 16.2 – Mock User Location**

As a developer, I want user location to be simulated so the app works without GPS dependencies.

**Acceptance Criteria:**

- User location is mocked/simulated in the database
- Location coordinates are stored locally
- Map displays user location marker based on mocked coordinates
- No real GPS or location services required
- Location can be updated programmatically for testing

**Assumptions:**

- User location is simulated for testing and offline compliance
- Location data is stored in local database
- Map can display mocked location without device GPS
- Location updates are controlled programmatically
- Mocked location coordinates are pre-defined in database

---

# **Glossary of Key Terms**

| Term                       | Meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| **Parking Zone**           | A designated area where parking is available             |
| **Vehicle Type**           | Category of vehicle (e.g., Car, Motorcycle, Truck)       |
| **Active Session**         | Currently ongoing parking session                        |
| **Duration**               | Length of parking time (e.g., 120 minutes)               |
| **Payment Method**         | Saved credit/debit card for payments                     |
| **Default Payment Method** | Pre-selected payment method for bookings                 |
| **Parking History**        | Record of past parking sessions                          |
| **Session Extension**      | Adding time to an active parking session                 |
| **Empty State**            | UI shown when no data is available                       |
| **Offline Compliance**     | App operates without network access or external services |
| **Air-Gapped**             | Completely offline, no network access allowed            |
| **Mock Data**              | Pre-seeded data in database for offline operation        |
| **Seeded Zones**           | Parking zones pre-populated in local database            |
| **Mocked Location**        | Simulated user location stored in database               |

---
