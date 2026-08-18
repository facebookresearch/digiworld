# Andojo Payment App

## Overview
This is the payment application for the Andojo platform, built with React Native and Expo. It uses Drizzle ORM and SQLite for local data management, providing a secure and user-friendly experience for sending, receiving, and managing payments on mobile devices.

## Features
- User authentication (phone number + OTP)
- Profile creation and session management
- Contacts management (add, edit, favorite)
- Send and receive payments
- Withdraw and deposit funds
- Transaction history and details
- Transaction PIN and security controls
- Transaction limits and KYC verification
- Scan QR codes to pay or receive
- Local database with Drizzle ORM and SQLite
- Offline support for core features
- Animated success screens for transactions
- Responsive, mobile-optimized UI/UX

## Documentation
- **Database Schema & Operations:** See [`src/docs/database.md`](src/docs/database.md) for detailed information on the database structure and usage.
- **Feature Scope:** See [`src/docs/feature-scope.md`](src/docs/feature-scope.md) for a full list of implemented features.
- **Additional Docs:** See the [`src/docs/`](src/docs/) folder for more technical documentation.

## Scripts
See [`package.json`](package.json) for available scripts:

- `start`: Start the Expo development server
- `android`: Run the app on Android device/emulator
- `build`: Build the Android release APK
- `test`: Run tests with Jest
- `format`: Auto-format code with ESLint
- `lint`: Lint and fix code with ESLint

## License
This project is private and intended for internal use within the Andojo platform.
