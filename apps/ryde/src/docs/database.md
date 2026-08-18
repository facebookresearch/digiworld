# Ryde Database Documentation

## Overview

This document outlines the SQLite and Drizzle ORM implementation for the Ryde application, describing the schema, field details, and best practices.

## Database Architecture

### Configuration Example

```typescript
// Database instance setup (example)
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('andojoryde.db');
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

| Field      | Type     | Description                                 |
| ---------- | -------- | ------------------------------------------- |
| id         | integer  | Primary key                                 |
| userId     | integer  | References users.id                         |
| address    | text     | Address string                              |
| isDefault  | integer  | Is default address (0/1)                    |
| createdAt  | text     | Creation timestamp                          |
| updatedAt  | text     | Last update timestamp                       |

### Ride Options Table
Available ride types and pricing.

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | integer  | Primary key                                 |
| name         | text     | Ride option name (e.g., 'Standard', 'XL')   |
| base_fare    | real     | Base fare for the ride                      |
| rate_per_km  | real     | Rate per kilometer                          |
| icon         | text     | Icon name or URL (optional)                 |

### Drivers Table
Registered drivers and their vehicles.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| id            | integer  | Primary key                                 |
| name          | text     | Driver's name                               |
| vehicleName   | text     | Vehicle name/model                          |
| vehicleNumber | text     | Vehicle registration number                 |
| vehicleType   | text     | Vehicle type (e.g., 'car', 'bike')          |
| rideOptionId  | integer  | References ride_options.id                  |
| rating        | real     | Driver rating (optional)                    |
| profilePicture| text     | Profile picture URL (optional)              |

### Rides Table
Stores ride information.

| Field            | Type     | Description                                 |
| ---------------- | -------- | ------------------------------------------- |
| id               | integer  | Primary key                                 |
| userId           | integer  | References users.id                         |
| driverId         | integer  | References drivers.id (nullable)            |
| pickupLocation   | text     | Pickup location (string/JSON)               |
| dropLocation     | text     | Drop location (string/JSON)                 |
| status           | text     | Ride status (e.g., 'pending', 'ongoing')    |
| startTime        | text     | Ride start time (optional)                  |
| endTime          | text     | Ride end time (optional)                    |
| distanceKm       | real     | Distance in kilometers (optional)           |
| fareAmount       | real     | Fare amount (optional)                      |
| feedbackSubmitted| integer  | Feedback submitted (0/1, default 0)         |
| paymentMode      | text     | Payment mode (e.g., 'wallet', 'card')       |

### User Payment Methods Table
User's saved payment methods.

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | integer  | Primary key                                 |
| userId       | integer  | References users.id                         |
| type         | text     | Payment type ('digital_wallet', 'credit_card') |
| provider     | text     | Payment provider (optional)                 |
| accountNumber| text     | Account/card number (optional)              |
| isDefault    | integer  | Is default method (0/1, default 0)          |

### Feedback Table
Ratings and comments for rides.

| Field        | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | integer  | Primary key                                 |
| rideId       | integer  | References rides.id                         |
| rating       | integer  | Rating (1-5)                                |
| comment      | text     | Optional comment                            |
| submittedAt  | text     | Timestamp                                   |

## Relationships Overview

- **Users** can have multiple **addresses**, **rides**, and **payment methods**.
- **Drivers** are assigned to **rides**.
- **Rides** are linked to a **user**, **driver**, and have feedback.
- **Feedback** is given per **ride**.

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