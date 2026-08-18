<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Eats Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation for the Eats application, describing the schema, field details, and best practices.

## Database Architecture

### Configuration Example

```typescript
// Database instance setup (example)
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojoeats.db');
export const db = drizzle(sqlite);
```

## Schema Design

### Users Table
Stores user account information.

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | integer  | Primary key                                 |
| email        | text     | Unique email address                        |
| password     | text     | Hashed password                             |
| firstName    | text     | User's first name                           |
| lastName     | text     | User's last name                            |
| phoneNumber  | text     | Unique phone number                         |
| createdAt    | text     | Account creation timestamp                  |
| updatedAt    | text     | Last update timestamp                       |
| settings     | text     | User settings as JSON                       |
| status       | text     | Account status (e.g., 'active', 'inactive') |

### User Addresses Table
Stores multiple addresses per user.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| id            | integer  | Primary key                                 |
| userId        | integer  | References users.id                         |
| label         | text     | Address label (e.g., 'Home', 'Office')      |
| addressLine1  | text     | Address line 1                              |
| addressLine2  | text     | Address line 2 (optional)                   |
| city          | text     | City                                        |
| state         | text     | State                                       |
| postalCode    | text     | Postal code                                 |
| country       | text     | Country                                     |
| latitude      | real     | Latitude (optional)                         |
| longitude     | real     | Longitude (optional)                        |
| isDefault     | boolean  | Is default address (0/1)                    |
| createdAt     | text     | Creation timestamp                          |
| updatedAt     | text     | Last update timestamp                       |

### Restaurants Table
Stores restaurant information.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| id            | integer  | Primary key                                 |
| name          | text     | Restaurant name                             |
| description   | text     | Description (optional)                      |
| address       | text     | Address                                     |
| latitude      | real     | Latitude (optional)                         |
| longitude     | real     | Longitude (optional)                        |
| logo          | text     | Logo image URL (optional)                   |
| rating        | real     | Average rating (optional)                   |
| deliveryFee   | real     | Delivery fee (optional)                     |
| minOrder      | real     | Minimum order amount (optional)             |
| deliveryRadius| integer  | Delivery radius in meters (optional)        |
| createdAt     | text     | Creation timestamp                          |

### Categories Table
Menu categories for each restaurant.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| id            | integer  | Primary key                                 |
| restaurantId  | integer  | References restaurants.id                   |
| name          | text     | Category name                               |
| position      | integer  | Display order (optional)                    |

### Menu Items Table
Food and drink items.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| id            | integer  | Primary key                                 |
| restaurantId  | integer  | References restaurants.id                   |
| categoryId    | integer  | References categories.id                    |
| name          | text     | Item name                                   |
| description   | text     | Description (optional)                      |
| price         | real     | Price                                       |
| image         | text     | Image URL (optional)                        |
| calories      | integer  | Calorie count (optional)                    |
| isPopular     | boolean  | Is popular item (0/1, optional)             |
| isActive      | boolean  | Is active (0/1, optional)                   |
| position      | integer  | Display order (optional)                    |

### Orders Table
Stores order information.

| Field               | Type     | Description                                 |
| ------------------- | -------- | ------------------------------------------- |
| id                  | integer  | Primary key                                 |
| userId              | integer  | References users.id                         |
| restaurantId        | integer  | References restaurants.id                   |
| addressId           | integer  | References user_addresses.id                |
| status              | text     | Order status (e.g., 'pending', 'delivered') |
| total               | real     | Total price                                 |
| deliveryAddress     | text     | Delivery address (string)                   |
| paymentMethod       | text     | Payment method                              |
| specialInstructions | text     | Order-level instructions (optional)         |
| cutlery             | boolean  | Cutlery requested (0/1, optional)           |
| createdAt           | text     | Creation timestamp                          |
| updatedAt           | text     | Last update timestamp                       |

### Order Items Table
Items in each order.

| Field               | Type     | Description                                 |
| ------------------- | -------- | ------------------------------------------- |
| id                  | integer  | Primary key                                 |
| orderId             | integer  | References orders.id                        |
| menuItemId          | integer  | References menu_items.id                    |
| quantity            | integer  | Quantity ordered                            |
| price               | real     | Price per item                              |
| specialInstructions | text     | Item-level instructions (optional)          |

### Drivers Table
Delivery drivers assigned to orders.

| Field      | Type     | Description                                 |
| ---------- | -------- | ------------------------------------------- |
| id         | integer  | Primary key                                 |
| orderId    | integer  | References orders.id                        |
| name       | text     | Driver's name                               |
| phone      | text     | Driver's phone                              |
| vehicle    | text     | Vehicle info (optional)                     |
| assignedAt | text     | Assignment timestamp                        |

### Feedback Table
Ratings and comments for orders.

| Field          | Type     | Description                                 |
| -------------- | -------- | ------------------------------------------- |
| id             | integer  | Primary key                                 |
| orderId        | integer  | References orders.id                        |
| foodRating     | integer  | Food rating (1-5)                           |
| deliveryRating | integer  | Delivery rating (1-5)                       |
| comment        | text     | Optional comment                            |
| createdAt      | text     | Timestamp                                   |

## Relationships Overview

- **Users** can have multiple **addresses** and **orders**.
- **Restaurants** have multiple **categories** and **menu items**.
- **Orders** are linked to a **user**, **restaurant**, **address**, and have multiple **order items**.
- **Drivers** are assigned to **orders**.
- **Feedback** is given per **order**.

## Best Practices

1. **Data Integrity**
   - Use foreign key constraints where possible
   - Validate data before insertion
2. **Performance**
   - Index frequently queried columns
   - Use appropriate data types
3. **Security**
   - Sanitize user inputs
   - Implement proper access controls
4. **Maintenance**
   - Regular backups
   - Schema versioning
   - Data cleanup routines

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/) 