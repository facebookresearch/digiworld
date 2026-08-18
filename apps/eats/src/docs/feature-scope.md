# Eats App Feature Scope

## Overview
This document outlines the feature scope for the Eats app, inspired by DoorDash/UberEats-style local food delivery. It summarizes both the MVP feature set and the features/screens implemented in the codebase as of now.

---

## MVP Features (as specified)

1. **Browse Restaurants & Menus**
   - List restaurants and their menus
   - Data loaded from local DB/JSON
   - Minimal UI

2. **Add Items to Cart**
   - Add/remove menu items to/from cart
   - Cart displays item details and subtotal

3. **Select Delivery Address**
   - Add, edit, or select delivery address

4. **Choose Payment Method**
   - Select payment method (mocked)

5. **Place Order**
   - Place order with selected items, address, and payment
   - Order saved locally
   - Cart cleared after order

6. **Order Tracking**
   - View order status and track delivery on offline map
   - Status updates and simulated driver position

7. **Search Functionality**
   - Search for restaurants, menu items, or categories

8. **Authentication**
   - Login/signup with phone number and OTP
   - Local user profile

---

## Implemented Features & Screens

### 1. Restaurant & Menu Browsing
- **Screen:** `screens/restaurant/[id].tsx` (restaurant details & menu)
- **Screen:** `screens/category/[id].tsx` (category details)
- **Screen:** `screens/food/[foodId].tsx` (food item details)
- **Screen:** `screens/search.tsx` (search for restaurants, menu items, categories)

### 2. Cart Functionality
- **Screen:** `screens/cart/cart-screen.tsx` (add/remove items, view cart)

### 3. Address Management
- **Screen:** `screens/address/address-list.tsx` (list/select addresses)
- **Screen:** `screens/address/add-address.tsx` (add/edit address)

### 4. Payment Method Selection
- **Screen:** `screens/payment/payment-screen.tsx` (select payment method)

### 5. Placing Orders
- **Screen:** `screens/cart/cart-screen.tsx` (place order from cart)
- Order data is saved (user can view order history after placing an order)

### 6. Order Tracking
- **Screen:** `screens/order/order-tracking.tsx` (track order status, offline map)
- **Map:** Uses local HTML/asset for offline map rendering

### 7. Search
- **Screen:** `screens/search.tsx` (search bar, results for restaurants, menu items, categories)

### 8. Authentication & User Profile
- **Screen:** `screens/auth/phone-login.tsx` (phone number login)
- **Screen:** `screens/auth/verify-otp.tsx` (OTP verification)
- **Screen:** `screens/auth/create-profile.tsx` (create user profile)
- **Screen:** `screens/profile/index.tsx` (view/edit profile)
- **Screen:** `screens/auth/users-list.tsx` (user selection)

### 9. Other Notable Features
- **AnimatedPlaceholder.tsx**: UI/UX enhancement for loading states
- **Custom hooks:** `useUserProfile.ts` (user profile logic)
- **Utilities:** Various helpers in `utils/` (date formatting, navigation, etc.)

---

## Planned/Unimplemented (as of this review)
- All MVP features appear to have corresponding screens/components in the codebase.
- Any additional features or modules should be added to this document as they are implemented.

---

## References
- [FEATURE_SCOPE.md](../../FEATURE_SCOPE.md) (original MVP spec)
- [database.md](./database.md) (database schema and relationships)

---

## Detailed MVP Acceptance Criteria & User Stories

### 1. Browse Restaurants & Menus
**Feature Function**
Display a list of available restaurants and their menus.

**User Story**
As a user, I want to browse restaurants and their menus so I can choose what to order.

**Acceptance Criteria**
- App loads restaurants and menu items from a local JSON file or DB
- Each restaurant entry includes: name, cuisine, delivery fee, etc.
- Menu items include: name, price, description, image
- List is displayed in a scrollable UI

---

### 2. Add Items to Cart
**Feature Function**
Allow users to add menu items to a shopping cart.

**User Story**
As a user, I want to add menu items to my cart so I can place an order.

**Acceptance Criteria**
- User can add/remove items to/from cart
- Cart displays item name, quantity, price, and subtotal
- Cart is stored in memory or local DB

---

### 3. Select Delivery Address
**Feature Function**
User can select or add a delivery address.

**User Story**
As a user, I want to select a delivery address so my order can be delivered.

**Acceptance Criteria**
- User can add, edit, or select an address
- Address includes: label, address lines, city, state, postal code
- Selected address is shown on payment screen

---

### 4. Choose Payment Method
**Feature Function**
User can select a payment method (mocked).

**User Story**
As a user, I want to choose a payment method so I can complete my order.

**Acceptance Criteria**
- User can select from: Card, Cash, Apple Pay (all mocked)
- Selected method is shown on payment screen

---

### 5. Place Order
**Feature Function**
User can place an order with the selected items, address, and payment method.

**User Story**
As a user, I want to place my order so the restaurant can prepare my food.

**Acceptance Criteria**
- Order is saved to local DB with all details
- Cart is cleared after order is placed
- Success/failure alert is shown
- User is navigated to order tracking or home

---

### 6. Order Tracking
**Feature Function**
User can view the status of their order and track the delivery progress on an offline map.

**User Story**
As a user, I want to track my order and see the delivery progress on a map so I know when it will arrive.

**Acceptance Criteria**
- Order status is displayed (Pending, Preparing, Out for Delivery, Delivered)
- Status is updated locally (mocked transitions)
- User can view order details
- User can see a map showing the delivery route and driver/bike position
- Map is rendered using a local HTML file (e.g., file:///android_asset/web/map.html) for offline support
- Driver/bike position is animated locally (no live GPS required for MVP)
- No dependency on live map APIs or internet connection for map display in MVP

**Offline Map Implementation**
- The map is displayed using a WebView that loads a local HTML file bundled with the app
- Delivery route and driver/bike position are simulated and animated using local data/state
- All map assets and logic are available offline; no external map API calls are made
- The map updates visually as the order status changes (e.g., driver en route, delivered)
- This approach ensures the order tracking experience works even without an internet connection

---

### 7. Search Functionality
**Feature Function**
Allow users to search for restaurants, menu items, or categories using a keyword.

**User Story**
As a user, I want to search for restaurants, menu items, or categories so I can quickly find what I want to order.

**Acceptance Criteria**
- User enters a search term in the search bar
- App returns matching categories, restaurants, and menu items
- Results are displayed in a list with relevant details (name, description, image)
- Tapping a result navigates to the appropriate detail screen (category, restaurant, or menu item)
- If no results are found, an appropriate message is shown
- Search is performed locally (no backend required for MVP)

---

### 8. Authentication Functionality
**Feature Function**
Allow users to log in or sign up using their phone number and OTP, and create a user profile.

**User Story**
As a user, I want to log in or sign up with my phone number so I can securely access my account and place orders.

**Acceptance Criteria**
- User can enter their phone number to receive an OTP
- User can enter the OTP to verify their identity
- If new, user is prompted to create a profile (name, etc.)
- User profile is stored locally (no backend required for MVP)
- User can log out and log back in
- Error handling for invalid phone numbers or OTPs
- Minimal UI; logs or Toasts acceptable for errors/success

---

## Safeguards
- Use fixed-size menu and restaurant list (e.g., 5–10 restaurants, 10–20 menu items each)
- Stick to 1–2 main screens for MVP
- No real payment or backend integration in MVP
- Build with intent to extend, not over-engineer 