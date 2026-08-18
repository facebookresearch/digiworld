# Authentication Tests

This directory contains unit tests for the authentication functionality in the Flight Booking app.

## Test Files

### 1. AuthStore.test.ts
Tests the main `AuthStore` functionality including:
- Login and Signup state initialization
- Validation error management
- Field updates and error clearing
- Current screen management
- Reset functionality
- Validation logic for login and signup forms

### 2. LoginState.test.ts
Tests the `LoginState` model including:
- Initial state verification
- Email input handling
- Password input handling
- Focus management (email/password fields)
- Validation error handling
- Reset functionality
- State persistence

### 3. SignupState.test.ts
Tests the `SignupState` model including:
- Initial state verification
- Name input handling
- Email input handling
- Password input handling
- Focus management (name/email/password fields)
- Validation error handling
- Reset functionality
- Complete signup flow simulation

### 4. Validation.test.ts
Comprehensive validation tests including:
- **Email Validation**: Empty, invalid format, valid emails
- **Password Validation**: Empty, short passwords, valid passwords
- **Name Validation**: Empty name, whitespace handling, valid names
- **Multiple Field Errors**: Testing multiple validation errors at once
- **Validation State Changes**: Testing error updates when fields change
- **Edge Cases**: Reset behavior, repeated validations, screen switching

## Running Tests

Run all authentication tests:
```bash
npm test -- --testPathPattern="(auth)"
```

Run tests in watch mode:
```bash
npm test:watch -- --testPathPattern="(auth)"
```

Run with coverage:
```bash
npm test -- --testPathPattern="(auth)" --coverage
```

## Test Coverage

- **Total Tests**: 110
- **Test Suites**: 4
- **Coverage Areas**:
  - State management (LoginState, SignupState)
  - Validation logic (email, password, name)
  - Error handling and display
  - Form interactions (focus, blur, input)
  - Reset and cleanup functionality

## Test Philosophy

These tests follow a **simple functional unit test** approach:
- Focus on testing logic and state management
- No complex UI rendering tests
- No integration tests with external services
- Tests are isolated and independent
- Each test has a clear, single purpose

## Validation Rules

### Email
- Required field
- Must match pattern: `\S+@\S+\.\S+`
- Error messages:
  - Empty: "Email is required"
  - Invalid: "Invalid email format"

### Password
- Required field
- Minimum 6 characters
- Error messages:
  - Empty: "Password is required"
  - Too short: "Password must be at least 6 characters"

### Name (Signup Only)
- Required field
- No minimum length (accepts single character)
- Error message:
  - Empty: "Name is required"

## Notes

- Tests use MobX State Tree models directly
- No mocking required for basic state management tests
- Each test file has its own `beforeEach` setup
- Tests verify both success and failure scenarios
- Edge cases and boundary conditions are covered

