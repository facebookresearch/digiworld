# Payment App Feature Scope

This document outlines the features that have been implemented in the Andojo Payment App. Each feature is grouped by functional area for clarity, and mapped to actual screens/components where possible.

## 1. User Authentication & Security
- **Phone Number Login:** Enter phone number and receive OTP (`screens/auth/phone-login.tsx`)
- **OTP Verification:** Enter OTP to verify identity (`screens/auth/verify-otp.tsx`)
- **Profile Creation:** Create user profile after verification (`screens/auth/create-profile.tsx`)
- **User Selection (Dev):** Select from test users (`screens/auth/users-list.tsx`)
- **Session Management:** Handles user sessions and logout

## 2. Contacts Management
- **Contacts List & Details:** View and manage contacts (`screens/contact/[id].tsx`)
- **Search Contacts:** Search functionality to find contacts quickly
- **Add Contacts:** Add new contacts to the list
- **Make Payments:** Send payments directly to contacts
- **Note:** Contacts cannot be removed or deleted once added

## 3. Payments & Transactions
- **Send Payments:** Initiate and send payments to contacts (`screens/payment/add-money.tsx`)
- **Withdraw Funds:** Withdraw money from wallet (`screens/payment/withdraw.tsx`)
- **Deposit Success:** Animated confirmation for deposits (`screens/payment/deposit-success.tsx`)
- **Withdrawal Success:** Animated confirmation for withdrawals (`screens/payment/withdrawal-success.tsx`)
- **Transaction History & Details:** View list and details of transactions (`screens/transaction/[id].tsx`)
- **Transaction Limits:** View and manage transaction limits (`screens/settings/TransactionLimits.tsx`)
- **Transaction PIN:** Enter PIN for payment/withdrawal (`screens/payment/_components/PinScreen.tsx`)
- **Transaction Hooks:** Custom hooks for transaction logic

## 4. Home, Scan & App Layout
- **Home Screen:** (in tabs, not shown above, but referenced in navigation)
- **Scan QR Code:** Scan to pay or receive (`screens/scan.tsx`)
- **App Layout:** Consistent navigation and layout across the app

## 5. Settings & Security
- **Change PIN:** Change transaction PIN
- **Transaction Limits:** Set/view transaction limits

---

## Documentation

- **Additional Docs:** See the [`src/docs/`](./) folder for more technical documentation on each feature area.

---

For technical details, see [technical-implementation.md](technical-implementation.md).