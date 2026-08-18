# AirFly Feature Scope (Implemented)

> The bullets below only list behaviour that exists in code today. Each item links back to the React Native screens, stores, or database schema that power it.

## 1. App Shell & Navigation
- Initial splash (`src/app/index.tsx`, `src/app/(auth)/splash.tsx`) auto-routes to login or the tab experience once the stores hydrate.
- Expo Router layouts (`src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`) provide the public auth stack and the `home / tickets / boarding pass / profile` tab bar.

## 2. Authentication
- Login (`src/app/(auth)/login.tsx`): email + password form, validation errors from `authStore`, toggleable password visibility, and post-login user hydration for the search store.
- Signup (`src/app/(auth)/signup.tsx`): name/email/password capture, inline validation feedback, success dialog, and redirect back to login.
- Shared loading overlay and error surfacing via `LoadingOverlay` and MobX stores.

## 3. Home / Flight Search
- Home tab (`src/app/(tabs)/home.tsx`):
  - Airport lookup with search suggestions.
  - Trip type toggle (one-way / round trip).
  - Departure / return date pickers, passenger selector, and travel class chips.
  - Deep-link session restoration handled through MobX session store helpers.
  - Navigates to Search Results with formatted query params.

## 4. Search Results
- Results screen (`src/app/search-results.tsx`):
  - Fetches/generated flights using Drizzle queries/mutations.
  - Sort options (price, departure, arrival, duration).
  - Round-trip tab switcher for outbound/return flights.
  - Maintains selection state and enables “Continue to Booking” once required legs are chosen.

## 5. Booking Flow
- Multi-step flow (`src/app/booking-flow.tsx`):
  - Passenger capture (manual entry or saved passenger reuse).
  - Review page with fare breakdown and passenger list.
  - Card entry UI and validation (expiry, CVV, holder name).
  - Calls mutations to insert bookings, booking flights, passengers, and seat assignments.
  - Resets MobX store and routes to success screen after confirmation.
- Success screen (`src/app/booking-success.tsx`): animated confirmation, booking summary, and quick links back to tickets or home.
- Booking details (`src/app/booking-details.tsx`):
  - Displays itinerary, passengers, payment summary, and action buttons.
  - Supports flight-specific check-in navigation and cancellation (full or partial) with validation from `flightValidation` utilities.

## 6. Tickets & Boarding Passes
- Tickets tab (`src/app/(tabs)/tickets.tsx`): loads bookings with passenger counts, renders status badges, links to booking details, and shows empty / loading states.
- Boarding pass tab (`src/app/(tabs)/boardingpass.tsx`): pulls checked-in flights, groups passengers per flight, and links to the full boarding-pass screen.
- Boarding pass screen (`src/app/boarding-pass.tsx`): fetches booking details, filters seat assignments per flight, and renders the stylised pass with QR code, seat info, and passenger chips.

## 7. Check-in
- Check-in flow (`src/app/check-in.tsx`):
  - Seat map rendering with business/economy sections.
  - Occupied seat prevention, auto-advance across passengers, and validation of check-in windows using `flightValidation`.
  - Writes seat assignments via mutations and prompts boarding-pass navigation once complete.

## 8. Profile & Misc Screens
- Profile tab (`src/app/(tabs)/profile.tsx`): user card, booking stats, legal links, and logout that clears all MobX stores.
- Flight unavailable screen (`src/app/flight-unavailable.tsx`): reused for cancellation / booking / check-in timing restrictions with animated warning visuals.

## 9. State & Data Layer
- MobX stores back each screen (examples: `BookingFlowStore`, `BookingDetailsStore`, `CheckInStore`, `SearchResultsStore`, `BoardingPassScreenStore`, `BookingSuccessStore`).
- Session restoration hooks rehydrate screen state when returning via deep links.

## 10. Database Schema (Drizzle + SQLite)
- Defined in `src/db/schema.ts`:
  - Users, airlines, airports, and city pairs.
  - Flights + flightsconfig templates.
  - Bookings, booking_flights junction table, passengers, and seat_assignments with cascading rules.
  - Enum-like fields tracking trip type, booking status, payment status, flight status, and segments.

## 11. Validation & Utilities
- `flightValidation.ts` confirms cancellation, check-in, and booking windows, formats countdown messaging, and is used in booking details and check-in flows.

## 12. Assets & Theming
- Shared theme (`@andojo/shared-theme`) drives colors/typography across screens.
- Auth and splash screens reuse branded imagery (`assets/images/*`).

---

### Summary
AirFly currently delivers a full end-to-end booking experience: discover flights, manage passengers, confirm and pay, review itineraries, check in, and board. All flows are wired into persistent MobX stores and a Drizzle-backed SQLite schema, providing a cohesive mobile experience across authentication, booking management, and travel-day tools.
