# Feature Scope Outlines for Air-Gapped Sandbox Qwikshop App

---

## Account Creation Workflow

### Enter User Details
- Users provide a username, password, and address.
- Validate input fields:
  - Username uniqueness
  - Password strength

### Address Setup
- Users can:
  - Enter an address manually
  - Use **"Get my location"** to autofill


### Store User Data
- Save user details securely.
- Encrypt sensitive information (e.g., passwords).

### Confirmation
- Display **"Account created successfully"** message.
- Redirect users to the login screen.

### Edge Cases
- **Duplicate email IDs**: Display _"Email ID already in use. Please try another."_
- **Invalid Input**: 
  - Name cannot be empty
  - PIN code must be numeric

---

## User Login Workflow

### Input Credentials
- Users enter a username and password.
- Validate credentials against stored data.

### Session Persistence
- Keep users logged in unless they manually log out.

### Retrieve Address
- Retrieve saved addresses.
- Use the first address from the saved list.

### Edge Case
- If users exit the app after adding items to the cart but before logging in, the **cart should persist**.

---

## Address Management

### Add/Edit Addresses
- Users can manage up to **3 saved addresses**.
- Set a default address for orders.

### Validation
- Prevent **duplicate addresses** from being stored.

### Offline Considerations
- Notify users if **location services fail** due to offline mode.
- Allow manual address entry.

---

## Product Catalog Feature

### Browse Products
- Display:
  - Images
  - Descriptions
  - Prices
  - Stock status


### Search & Filtering
- Search products by name.
- Filter/sort by:
  - Category
  - Price
  - Name


---

## Cart Management

- Allow users to:
  - Add items to cart
  - Remove items from cart
  - Update item quantities
- Persist cart data across app launches.

---

## Trending Offers

### Fake Offer Carousel
- Display rotating promotional offers.


### Edge Case


---

