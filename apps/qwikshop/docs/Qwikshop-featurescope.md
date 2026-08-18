# Temu/Shein Inspired Qwikshop Feature Scope

---

## Project Overview

This project builds on an **Amazon-inspired e-commerce baseline** with selected **Temu/SHEIN-inspired features** for differentiation.

### Constraints
- **Timeline:** ~15–20 working days  
- **Database:**  
  - Core schema remains intact  
  - Only **extensions on top** (new tables/columns) allowed  
  - No complete schema rewrites  
- **Data:**  
  - Product/offer datasets swapped with new data  
  - Schema structure remains highly similar  
- **UI:**  
  - Full redesign to reflect a **discovery-first, modern shopping experience**  

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
- **Duplicate email IDs:** Display _"Email ID already in use. Please try another."_  
- **Invalid Input:**  
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

## Reviews & Ratings

- Product detail pages show:  
  - Star rating  
  - User comments  
  - Like/Unlike on reviews  

---

## Payment Info

- Users can save up to **2 cards**.  
- Use saved cards to place orders.  

---

## Promo Codes

- Apply conditional promo codes to save at checkout.  

---

## New Features (Temu/SHEIN Inspired)

**2 features to be picked for implementation in this cycle.**  Remaining features are part of the pool for future clones.  

### 1. Daily Check-In Rewards *(Recommended)*
- Users tap a daily check-in button to earn credits or coupons.  
- Encourages repeat visits.  
- **DB Extension:** `rewards_log` (user_id, date, reward_points).  

### 2. Mystery Box Offers *(Recommended)*
- Add a surprise bundle at checkout for a fixed price.  
- Mystery box pulls random items from a product pool.  
- **DB Extension:** `mystery_box` (box_id → product_ids).  

### 3. Social Proof Boosters
- Show **"X people bought this in the last 24h"** on product detail.  
- Builds urgency and trust.  
- **DB Extension:** Aggregation query, no major schema change.  

### 4. Flash Sale / Limited-Time Drops
- Dedicated section for **time-limited deals**.  
- Frontend countdown timer + backend product flag.  
- **DB Extension:** `flash_sales` (product_id, start_time, end_time, discount).  

### 5. Group Purchases
- Users invite friends to join a shared cart and unlock discounts.  
- **Offline Note:** Due to offline nature, the second user must **log out and log in** with their account to modify the shared cart.  
- **DB Extension:** `group_orders` (group_id, user_ids, target_size).  

### 6. Incognito Orders
- Option to mark orders as **hidden** so they don't appear in order history.  
- **DB Extension:** Add `is_incognito` flag to orders.  

### 7. More Payment Options
- Expand beyond stored cards: add **Cash on Delivery** and **Debit Card**.  
- **DB Extension:** Extend `payment_methods` table.  

### 8. Time-Based Stock Expiry
- Items automatically go out of stock after a countdown (urgency simulation).  
- **Implementation:** Background `setInterval` job (runs every X minutes) to update stock status in DB.  
- **DB Extension:** Add `stock_expiry` field per product.  

### 9. Notifications
- Alerts for:  
  - Item back in stock  
  - Order status updates  
  - Flash sale starting  
- **Implementation:** Background `setInterval` job simulates notifications.  
- **DB Extension:**  
  - `notifications` (user_id, type, status)  
  - `stock_subscriptions` (user_id, product_id, completed_flag) for "back in stock" alerts.  

---

## Implementation Timelines (Estimates)

Within ~15–20 working days:  
- Deliver the **baseline Amazon-clone features**  
- Apply a **full UI redesign**  
- Implement **2 new features** from the Temu/SHEIN-inspired list (priority: Daily Check-In Rewards, Mystery Box Offers)  
- Ensure DB changes are **extensions only**, preserving existing schema  

---

## Feature Comparison Table

| Feature Category       | Qwikshop Baseline (Clone) | Temu/SHEIN Inspired Extras (Clone Options) |
|------------------------|--------------------------|--------------------------------------------|
| Account Creation/Login | ✅ Yes                  | –                                          |
| Address Management     | ✅ Yes                  | –                                          |
| Product Catalog/Search | ✅ Yes                  | –                                          |
| Cart Management        | ✅ Yes                  | –                                          |
| Reviews & Ratings      | ✅ Yes                  | –                                          |
| Payment Info           | ✅ Yes (cards)          | **More Payment Options**                   |
| Promo Codes            | ✅ Yes                  | –                                          |
| Discovery/Gamification | Basic recommendations   | **Daily Check-In Rewards**                 |
| Promotions/Offers      | Standard promo codes    | **Mystery Box Offers**                     |
| Social Proof           | Ratings only            | **Recent Buyers Badge**                    |
| Deals/Events           | Standard discounts      | **Flash Sales, Stock Expiry**              |
| Social Shopping        | Not present             | **Group Purchases**                        |
| Privacy                | Not present             | **Incognito Orders**                       |
| Notifications          | Limited email updates   | **Stock Alerts, Order Status, Flash Sales**|

