<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Flight Booking App Documentation

## Overview

The Flight Booking App is an air-gapped, offline MVP application designed to simulate airline booking workflows for Agentic AI research. Inspired by apps like Kayak or Google Flights, this sandboxed React Native app enables AI agents to explore booking scenarios safely with fully mocked data and deterministic behavior.

### Key Features
- **Air-gapped Environment**: No internet, tokens, APIs, or external services
- **Deterministic Behavior**: Reproducible results using fixed SEED
- **Mock Data Generation**: Realistic flight, fare, and airline data
- **Complete Booking Workflow**: Search, book, cancel, reschedule, refund
- **Comprehensive Logging**: All agent actions logged for audit and analysis

---

## Complete Feature List

### **🔐 F1 - Authentication Module**
- **Agent Login System**: Username/password with agent_id tracking
- **Session Management**: 24-hour sessions with automatic expiration
- **Deterministic Authentication**: Reproducible login behavior using seed

### **📊 F2 - Mock Data Generation Module**
- **Flight Data Generation**: Realistic flight schedules with 5-10 flights/day per airline
- **City Pair Generation**: Realistic airport codes (JFK-SFO, ORD-SEA, etc.)
- **Airline Data**: Multiple airlines with unique identifiers and branding
- **Fare Simulation**: Bounded deterministic random walk for price fluctuations
- **Deterministic Output**: Same seed produces identical data files
- **Output Files**: `airlines.json`, `city_pairs.json`, `flights.json`

### **🔍 F3 - Flight Search Module**
- **Search Interface**: Origin, destination, date inputs
- **Search Results**: 3-5 matching flights per search
- **Flight Details**: flight_id, airline, departure, arrival, fare
- **Offline Search**: Fully offline with consistent results per seed
- **Search Logging**: All searches logged to `searches.jsonl`
- **Filter Options**: Price, time, airline filters

### **✈️ F4 - Booking Flow Module**
- **Flight Selection**: Choose from search results
- **Passenger Information**: Name, email input (no real validation)
- **Booking Creation**: Generates unique booking_id
- **Status Tracking**: "booked" status confirmation
- **Booking Storage**: All bookings stored in `bookings.jsonl`
- **Agent Tracking**: All bookings linked to agent_id

### **💳 F5 - Mock Payment Module**
- **Credit Card Input**: Accepts fake card numbers (4111 1111 1111 1111)
- **Payment Processing**: 90% success, 10% failure (deterministic)
- **Success Handling**: Payment logged to `payments.jsonl`
- **Failure Handling**: Status "DECLINED", booking not completed
- **Deterministic Outcomes**: Same card/amount produces same result

### **✅ F6 - Booking Confirmation Module**
- **Confirmation Display**: booking_id, flight info, passenger, fare, status
- **Confirmation Storage**: Stored in `bookings.jsonl`
- **Agent Traceability**: All confirmations linked to agent_id
- **Receipt Generation**: Digital receipt with booking details

### **❌ F7 - Cancellation Module**
- **Cancellation Interface**: Input booking_id to cancel
- **Status Update**: Changes status to "cancelled"
- **Cancellation Logging**: Logged in `cancellations.jsonl`
- **Automatic Refund**: Triggers full refund process
- **Agent Tracking**: All cancellations linked to agent_id

### **💰 F8 - Refund Module**
- **Full Refund Processing**: 100% refund for all cancellations
- **Refund Logging**: Output written to `refunds.jsonl`
- **Refund Details**: agent_id, booking_id, amount, timestamp
- **Immediate Processing**: Refunds are immediate and deterministic
- **Refund Confirmation**: Digital receipt for refund

### **🔄 F9 - Rescheduling Module**
- **Reschedule Interface**: Input booking_id and new_flight_id
- **Date Flexibility**: ±3 days from original booking
- **Process Flow**: Cancels old booking, books new one
- **New Booking ID**: Generates new booking_id
- **Dual Logging**: Logs in both `bookings.jsonl` and `reschedules.jsonl`
- **Agent Tracking**: All reschedules linked to agent_id

### **📝 F10 - Comprehensive Logging Module**
- **Action Logging**: All agent actions logged in JSONL format
- **Log Fields**: timestamp, agent_id, session_id, action, outcome
- **Separate Log Files**: 
  - `searches.jsonl`
  - `bookings.jsonl`
  - `payments.jsonl`
  - `refunds.jsonl`
  - `cancellations.jsonl`
  - `reschedules.jsonl`
  - `auth-logs.jsonl`
- **Traceability**: Supports tracebacks and replay
- **Flat File Storage**: No database required

### **🔒 F11 - Air-Gapped Security Module**
- **Offline Enforcement**: No internet, tokens, APIs, or external services
- **Deterministic Behavior**: Fixed SEED ensures reproducible results
- **UI Indicators**: "AIR-GAPPED MODE: ON" displayed throughout app
- **Embedded Dependencies**: All dependencies embedded, no runtime fetches
- **Data Isolation**: Complete sandboxed environment

### **🎨 F12 - UI/UX Module**
- **Dark Theme**: Consistent dark theme throughout app
- **Company Gradient**: Creative use of company gradient colors
- **Poppins Font**: Poppins font family for all text
- **Responsive Design**: Works across different screen sizes
- **Loading States**: Proper loading indicators for all actions
- **Error Handling**: User-friendly error messages
- **Navigation**: Intuitive navigation between screens

### **🧪 F13 - Testing & Quality Module**
- **Unit Testing**: Comprehensive unit tests for all modules
- **Integration Testing**: End-to-end workflow testing
- **Deterministic Testing**: Same inputs produce same outputs
- **Mock Data Testing**: Validation of generated mock data
- **Performance Testing**: App performance under various loads
- **Error Scenario Testing**: Testing failure modes and edge cases

### **📱 F14 - Platform Integration Module**
- **React Native**: Cross-platform compatibility
- **Expo Integration**: Expo framework for development
- **MobX State Management**: Reactive state management
- **TypeScript**: Full type safety
- **File System**: Local file storage for logs and data
- **Navigation**: React Navigation for screen management

### **🔧 F15 - Configuration & Settings Module**
- **App Configuration**: Centralized app settings
- **Seed Management**: SEED configuration for deterministic behavior
- **Logging Configuration**: Log level and file management
- **Mock Data Settings**: Parameters for data generation
- **Environment Variables**: Air-gapped mode settings

---

## Implementation Priority

1. **Core Infrastructure** (F1, F11, F14, F15)
2. **Data Generation** (F2)
3. **Search & Booking** (F3, F4, F6)
4. **Payment Processing** (F5)
5. **Modification Features** (F7, F8, F9)
6. **Logging & Analytics** (F10)
7. **UI/UX Enhancement** (F12)
8. **Testing & Quality** (F13)

---

## Technical Architecture

### **Data Models**
- **Flight**: id, airline, origin, destination, departure, arrival, fare, available_seats
- **Booking**: id, flight_id, passenger_name, email, status, agent_id, timestamp
- **Payment**: id, booking_id, amount, status, card_hash, timestamp
- **Refund**: id, booking_id, amount, agent_id, timestamp
- **Search**: query, results, agent_id, timestamp

### **File Structure**
```
apps/flight/
├── src/
│   ├── models/ (Flight, Booking, Payment, etc.)
│   ├── stores/ (FlightStore, BookingStore, etc.)
│   ├── services/ (MockDataService, BookingService, etc.)
│   ├── components/ (FlightCard, BookingForm, etc.)
│   ├── screens/ (Search, Booking, Confirmation, etc.)
│   ├── data/ (mock data files)
│   └── utils/ (random walk, validation, etc.)
├── package.json
├── app.config.ts
└── app.json
```

### **Key Technologies**
- **React Native** with Expo
- **TypeScript** for type safety
- **MobX State Tree** for state management
- **React Navigation** for routing
- **React Native FS** for file operations
- **Jest** for testing

### **Deterministic Behavior**
- **Fixed SEED**: Ensures reproducible results across runs
- **Bounded Random Walk**: Fare fluctuations within defined bounds
- **Mock Data Generation**: Consistent data based on seed
- **Action Logging**: All actions logged with timestamps and agent IDs

### **Air-Gapped Features**
- **No Network Access**: Completely offline operation
- **Embedded Dependencies**: All required libraries bundled
- **Local Storage**: All data stored locally
- **Mock Services**: Simulated external services
- **UI Indicators**: Clear indication of offline mode

---

## Glossary

| Term | Description |
|------|-------------|
| agent_id | Unique identifier for the AI agent running the simulation |
| flight_id | Unique ID of the mock flight |
| booking_id | Unique ID of booking created by an agent |
| jsonl | JSON Lines (newline-delimited JSON), used for traceable logs |
| seed | A fixed integer used to ensure deterministic randomness |
| bounded random walk | Price fluctuation model for fares, prevents extreme drift |
| air-gapped | No network access; 100% offline and sandboxed |
| mock card | Fake payment instrument used for sandbox testing |

Each feature will be implemented with full TypeScript support, comprehensive testing, and deterministic behavior for AI research purposes.
