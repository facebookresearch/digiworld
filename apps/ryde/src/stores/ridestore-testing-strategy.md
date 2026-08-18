# RideStore Testing Strategy

## What is tested?
- The core business logic of the ride booking and ride lifecycle in `rideStore.ts`.
- All explicit state transitions: `booked`, `driver-assigned`, `started`, `ongoing`, `complete`, `cancelled`.
- Driver assignment logic (random driver from mock-drivers.json, optionally filtered by ride type).
- Cancellation logic (allowed only before `started`/`ongoing`/`complete`).
- Error handling for driver assignment and edge cases.

## How is it evaluated?
- Using Jest unit tests in `rideStore.test.ts`.
- All DB/driver data is mocked for deterministic, fast tests.
- No UI/component rendering—only business logic is tested.
- Each test calls store actions in the order a real app/backend would (no timers or background simulation).
- State is asserted after each action to ensure correctness.

## What are the assertions for each test?
- **Book and full flow:**
  - After booking, ride is in `booked` state.
  - After assigning driver, ride is in `driver-assigned` state and has a driver.
  - After starting, ride is in `started` state.
  - After updating to ongoing, ride is in `ongoing` state.
  - After completing, ride is removed from `currentRide` and added to `rideHistory` as `complete`.
- **Cancellation:**
  - Cancelling before driver assignment: ride is removed from `currentRide`, not added to history.
  - Cancelling after driver assignment but before start: ride is removed from `currentRide`, added to history as `cancelled`.
  - Cancelling after start/ongoing/complete: throws error, ride remains in current state.
- **Error handling:**
  - If no drivers available, ride remains in `booked` state, no driver assigned.
  - If driver fetch fails, ride remains in `booked` state.

## How did we confirm the logic is correct?
- All state transitions are explicit and only happen via actions.
- Each test asserts the state after every action, ensuring no unexpected transitions.
- Cancellation and error handling are tested at every possible state.
- No race conditions or background simulation: all logic is synchronous and test-driven.
- All tests pass, confirming the logic matches the intended business rules.

## Potential edge cases not yet covered
- Multiple rides in parallel (concurrent bookings and completions).
- Submitting a review after ride completion.
- Attempting to assign a driver when no ride is booked.
- Attempting to start/complete/cancel a ride with an invalid or missing ride ID.
- Handling of malformed or incomplete driver/ride data from the backend.
- Re-booking after a cancellation or completion (store reset/cleanup).

---

**For any new business logic or edge case, add a corresponding test to ensure coverage!** 