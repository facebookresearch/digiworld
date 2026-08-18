<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Ryde App Feature Scope

This document outlines the features implemented in the Andojo Ryde App. Each feature is grouped by functional area for clarity and mapped to actual screens/components where possible.

## 1. User Authentication & Security
- **Phone Number Login:** Enter phone number and receive OTP (`screens/auth/phone-login.tsx`)
- **OTP Verification:** Enter OTP to verify identity (`screens/auth/verify-otp.tsx`)
- **Profile Creation:** Create user profile after verification (`screens/auth/create-profile.tsx`)
- **User Selection (Dev):** Select from test users (`screens/auth/users-list.tsx`)
- **Session Management:** Handles user sessions and logout

## 2. Ride Booking & Management
- **Home Screen:** Set pickup and drop locations, view map, and book rides (`(tabs)/home.tsx`)
- **Ride Options:** Select ride type and view fare estimates (`screens/rides/rideOptions.tsx`)
- **Driver Assignment:** See assigned driver and vehicle details (`screens/rides/DriverAssignment.tsx`)
- **Live Ride Tracking:** Track ride progress and driver location on map (`(tabs)/home.tsx`)
- **Ride Status Updates:** View ride status (pending, ongoing, completed)
- **Cancel Ride:** Option to cancel a ride before pickup

## 3. Ride History & Details
- **View Past Rides:** List of previous rides (`(tabs)/history.tsx`, `screens/rides/ViewRides.tsx`)
- **Ride Details:** View details of a specific ride (`screens/rides/RideDetails.tsx`)

## 4. Payments & Wallet
- **Payment Methods:** Manage payment methods (wallet, credit card, etc.) (`screens/profile/index.tsx`, `screens/rides/rideOptions.tsx`)
- **Fare Calculation:** Automatic fare calculation based on distance and ride type
- **Payment on Completion:** Pay for ride at end (integrated in ride flow)

## 5. User Profile & Settings
- **Profile Information:** View and edit personal information (`screens/profile/index.tsx`)
- **Addresses:** Manage saved addresses (`screens/address/address-list.tsx`)
- **Settings:** Access app settings (`(tabs)/settings.tsx`)

## 6. Feedback & Support
- **Ride Feedback:** Submit rating and comments after ride (`screens/rides/components/FeedbackModal.tsx`)
- **Help & Support:** Access help topics and contact support (`(tabs)/help.tsx`)
- **Terms of Use:** View app terms and conditions (`(tabs)/terms.tsx`)

