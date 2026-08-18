# Banking App Database Documentation

## Overview

The Banking App uses SQLite with Drizzle ORM for type-safe schema definitions. This document provides comprehensive details about the database schema, table structures, relationships, indexes, and data integrity constraints.

## Database Architecture

### Configuration

```typescript
// Database instance setup
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

const sqlite = SQLite.openDatabaseSync('banking.db');
export const db = drizzle(sqlite);
```

### Key Features

- **Local-first Architecture:** All data stored locally in SQLite
- **Offline Functionality:** App operates entirely without network
- **Type Safety:** Full TypeScript support with Drizzle ORM
- **Foreign Key Constraints:** Enforced referential integrity
- **Soft Deletes:** Data preservation with `deletedAt` timestamps
- **Indexing:** Optimized indexes on frequently queried columns
- **Migration System:** Schema versioning and migration support

## Database Schema

### Table Overview

The database consists of 18 tables organized into the following categories:

**Core Tables:**
- `users` - User accounts and profiles
- `sessions` - User session tracking
- `account_tier_levels` - Account tier configurations
- `account_types` - Account type definitions
- `accounts` - User account records

**Transaction Tables:**
- `transactions` - All transaction records
- `transaction_types` - Transaction type metadata
- `scheduled_transactions` - Scheduled/recurring transactions

**Payment Tables:**
- `credit_cards` - Credit card records
- `bills` - Bill records
- `billers` - Predefined biller catalog
- `beneficiaries` - External transfer beneficiaries
- `zelle_contacts` - Zelle contact list

**Supporting Tables:**
- `interest_rate_tiers` - Tiered interest rate definitions
- `notifications` - User notifications
- `system_config` - System configuration key-value store
- `error_codes` - Error code catalog

## Detailed Table Schemas

### account_tier_levels

Stores information about different account tiers (Sapphire, Premier, Everyday).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| code | TEXT | NOT NULL | Tier code (sapphire, premier, everyday) |
| name | TEXT | NOT NULL | Tier name |
| description | TEXT | | Tier description |
| min_combined_balance | REAL | NOT NULL DEFAULT 0 | Minimum combined balance required |
| max_accounts_per_type | INTEGER | NOT NULL DEFAULT 1 | Maximum accounts per type allowed |
| monthly_fee | REAL | DEFAULT 0 | Monthly maintenance fee |
| fee_waiver_balance | REAL | | Balance threshold to waive monthly fee |
| has_overdraft_protection | INTEGER | DEFAULT 0 | Overdraft protection included flag |
| has_interest_checking | INTEGER | DEFAULT 0 | Interest checking included flag |
| interest_rate_bonus | REAL | DEFAULT 0 | Additional interest rate bonus |
| free_wire_transfers | INTEGER | DEFAULT 0 | Number of free wire transfers per month |
| free_cashiers_checks | INTEGER | DEFAULT 0 | Number of free cashier's checks per month |
| priority_support | INTEGER | DEFAULT 0 | Priority support access flag |
| dedicated_banker | INTEGER | DEFAULT 0 | Dedicated banker assigned flag |
| sort_order | INTEGER | DEFAULT 0 | Display sort order |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Tier Examples:**
- **Sapphire (ID: 1):** $250,000 min balance, $35/month fee, 3 max accounts per type
- **Premier (ID: 2):** $25,000 min balance, $30/month fee, 3 max accounts per type
- **Everyday (ID: 3):** $0 min balance, $10/month fee, 3 max accounts per type

### account_types

Stores information about different account types (checking, savings, money market, IRA).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| tier_level_id | INTEGER | REFERENCES account_tier_levels(id) | Associated tier level (nullable) |
| code | TEXT | NOT NULL | Account type code (checking, savings, money_market, ira_account) |
| name | TEXT | NOT NULL | Account type name |
| category | TEXT | NOT NULL | Account category (deposit, investment, etc.) |
| description | TEXT | | Account description |
| min_opening_balance | REAL | DEFAULT 0 | Minimum opening balance required |
| max_balance | REAL | DEFAULT 50000 | Maximum balance allowed |
| monthly_fee | REAL | DEFAULT 0 | Monthly maintenance fee |
| fee_waiver_min_balance | REAL | | Minimum balance to waive fee |
| fee_waiver_min_direct_deposit | REAL | | Minimum direct deposit to waive fee |
| has_interest | INTEGER | DEFAULT 0 | Interest-bearing account flag |
| base_interest_rate | REAL | DEFAULT 0 | Base interest rate (APY) |
| has_debit_card | INTEGER | DEFAULT 0 | Debit card available flag |
| has_checks | INTEGER | DEFAULT 0 | Check writing available flag |
| allows_overdraft | INTEGER | DEFAULT 0 | Overdraft allowed flag |
| overdraft_fee | REAL | DEFAULT 0 | Overdraft fee amount |
| overdraft_protection_transfer_fee | REAL | DEFAULT 0 | Overdraft protection transfer fee |
| min_balance_to_avoid_fee | REAL | DEFAULT 0 | Minimum balance to avoid monthly fee |
| monthly_transaction_limit | INTEGER | | Monthly transaction limit (e.g., 6 for savings) |
| withdrawal_penalty_days | INTEGER | | Withdrawal penalty period (days) |
| early_withdrawal_penalty_rate | REAL | | Early withdrawal penalty rate (%) |
| is_active | INTEGER | DEFAULT 1 | Active account type flag |
| sort_order | INTEGER | DEFAULT 0 | Display sort order |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Account Type Examples:**
- **Checking:** $25 min opening, $10/month fee, allows overdraft, has debit card
- **Savings:** $25 min opening, $5/month fee, 0.15% APY, 6 transaction limit
- **Money Market:** $2,500 min opening, $12/month fee, 0.25% APY, 6 transaction limit
- **IRA Account:** $1,000 min opening, $0/month fee, 1.75% APY, 180-day withdrawal penalty

### interest_rate_tiers

Tiered interest rate definitions for savings/accounts with multiple rate tiers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| account_type_id | INTEGER | REFERENCES account_types(id) NOT NULL | Associated account type |
| min_balance | REAL | NOT NULL | Minimum balance for this tier |
| max_balance | REAL | | Maximum balance for this tier (NULL = no max) |
| annual_percentage_yield | REAL | NOT NULL | APY for this balance tier |
| effective_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Effective date |
| end_date | TEXT | | End date (NULL = currently active) |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Usage:** Allows different interest rates based on account balance ranges.

### users

Application users and profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| username | TEXT | UNIQUE NOT NULL | Username (unique) |
| password | TEXT | NOT NULL | Password (currently plain text, should be hashed) |
| full_name | TEXT | | User's full name |
| phone_number | TEXT | NOT NULL | Phone number |
| email | TEXT | | Email address (used for tier determination) |
| account_tier_id | INTEGER | REFERENCES account_tier_levels(id) NOT NULL | User's account tier |
| pin | TEXT | | PIN (currently plain text, should be encrypted) |
| security_question | TEXT | | Security question |
| security_answer | TEXT | | Security answer |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TEXT | | Soft-delete timestamp |

**Tier Determination:** User tier is determined by email domain during registration:
- `blueelite.com`, `luxbank.com`, `sapphiremember.com` → Sapphire (ID: 1)
- `businessfirst.com`, `profinancier.com`, `premierplus.com` → Premier (ID: 2)
- All other domains → Everyday (ID: 3)

### sessions

User sessions and simulation state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Session id |
| session_id | TEXT | UNIQUE NOT NULL | External session identifier |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| seed | INTEGER | | RNG seed for deterministic simulation |
| volatility | REAL | DEFAULT 0 | Volatility setting for simulation |
| enable_interest | INTEGER | DEFAULT 0 | Enable interest accrual flag |
| enable_recurring_bills | INTEGER | DEFAULT 0 | Enable recurring bills flag |
| enable_monthly_fees | INTEGER | DEFAULT 0 | Enable monthly fees flag |
| current_day | INTEGER | DEFAULT 0 | Current day in simulation |
| created_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Session creation date |
| current_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Current simulation date |
| status | TEXT | DEFAULT 'active' | Session status (active, paused, completed) |
| ended_at | TEXT | | Session end timestamp |
| metadata | TEXT | | Free-form metadata (JSON) |

**Indexes:**
- `idx_sessions_user` on `user_id`
- `idx_sessions_status` on `status`

### accounts

User accounts (checking, savings, money market, IRA).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Account id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| account_type_id | INTEGER | REFERENCES account_types(id) NOT NULL | Account type |
| account_number | TEXT | UNIQUE NOT NULL | Unique account number |
| account_name | TEXT | | Friendly account name |
| balance | REAL | NOT NULL DEFAULT 0 | Current balance |
| available_balance | REAL | NOT NULL DEFAULT 0 | Available balance (after pending transactions) |
| is_primary | INTEGER | DEFAULT 0 | Is primary account flag |
| status | TEXT | DEFAULT 'active' | Account status (active, frozen, closed) |
| opened_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Account opened date |
| closed_date | TEXT | | Account closed date |
| last_statement_date | TEXT | | Last statement date |
| next_statement_date | TEXT | | Next statement date |
| overdraft_protection_enabled | INTEGER | DEFAULT 0 | Overdraft protection enabled flag |
| overdraft_protection_source_account_id | INTEGER | REFERENCES accounts(id) | Source account for overdraft protection |
| linked_savings_account_id | INTEGER | REFERENCES accounts(id) | Linked savings account |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TEXT | | Soft-delete timestamp |

**Indexes:**
- `idx_accounts_user` on `user_id`
- `idx_accounts_type` on `account_type_id`
- `idx_accounts_status` on `status`

**Account Number Format:** `{prefix}{userPart}{randomPart}`
- Prefix: 1 (checking), 2 (savings), 3 (money market)
- User Part: Last 4 digits of user ID
- Random Part: 7-digit random number

### credit_cards

Credit card records for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Card id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| linked_checking_account_id | INTEGER | REFERENCES accounts(id) | Linked checking account for payments |
| card_number | TEXT | UNIQUE NOT NULL | Full card number (should be encrypted) |
| last_four_digits | TEXT | NOT NULL | Last 4 digits for display |
| cardholder_name | TEXT | NOT NULL | Cardholder name |
| expiry_month | INTEGER | NOT NULL | Expiry month (1-12) |
| expiry_year | INTEGER | NOT NULL | Expiry year |
| cvv | TEXT | NOT NULL | CVV (should be encrypted) |
| credit_limit | REAL | NOT NULL | Credit limit |
| current_balance | REAL | DEFAULT 0 NOT NULL | Current balance |
| available_credit | REAL | NOT NULL | Available credit (limit - balance) |
| apr | REAL | NOT NULL | Annual Percentage Rate |
| annual_fee | REAL | DEFAULT 0 | Annual fee |
| cash_advance_fee_percent | REAL | DEFAULT 5.0 | Cash advance fee percentage |
| late_payment_fee | REAL | DEFAULT 35.0 | Late payment fee |
| payment_due_day | INTEGER | NOT NULL | Day of month payment is due |
| minimum_payment_percent | REAL | DEFAULT 2.0 | Minimum payment percentage |
| statement_closing_day | INTEGER | NOT NULL | Day of month statement closes |
| autopay_enabled | INTEGER | DEFAULT 0 | Autopay enabled flag |
| autopay_amount | TEXT | DEFAULT 'minimum' | Autopay amount type |
| status | TEXT | DEFAULT 'active' | Card status (active, frozen, closed) |
| opened_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Card opened date |
| last_payment_date | TEXT | | Last payment date |
| last_statement_date | TEXT | | Last statement date |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes:**
- `idx_credit_cards_user` on `user_id`

**Tier-Based Limits:**
- Sapphire: 3 cards, $75,000 limit, 15.99% APR, $150 annual fee
- Premier: 2 cards, $45,000 limit, 17.99% APR, $50 annual fee
- Everyday: 1 card, $25,000 limit, 19.99% APR, $0 annual fee

### beneficiaries

External transfer beneficiaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Beneficiary id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| name | TEXT | NOT NULL | Beneficiary name |
| account_number | TEXT | NOT NULL | Beneficiary account number |
| account_type | TEXT | NOT NULL | Account type (checking, savings) |
| bank_name | TEXT | NOT NULL | Bank name |
| bank_address | TEXT | | Bank address |
| nickname | TEXT | | Friendly nickname |
| email | TEXT | | Beneficiary email |
| phone | TEXT | | Beneficiary phone |
| verification_status | TEXT | DEFAULT 'unverified' | Verification status |
| verification_method | TEXT | | Verification method used |
| is_favorite | INTEGER | DEFAULT 0 | Favorite flag |
| status | TEXT | DEFAULT 'active' | Beneficiary status |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TEXT | | Soft-delete timestamp |

**Indexes:**
- `idx_beneficiaries_user` on `user_id`

### zelle_contacts

Zelle contacts stored per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Contact id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| contact_name | TEXT | NOT NULL | Contact name |
| contact_email | TEXT | | Contact email |
| contact_phone | TEXT | | Contact phone |
| is_enrolled | INTEGER | DEFAULT 0 | Zelle enrollment flag |
| is_favorite | INTEGER | DEFAULT 0 | Favorite flag |
| last_sent_amount | REAL | | Last sent amount |
| last_sent_date | TEXT | | Last sent date |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:**
- `idx_zelle_contacts_user` on `user_id`

### billers

Predefined billers/payees.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Biller id |
| code | TEXT | UNIQUE NOT NULL | Unique biller code |
| name | TEXT | NOT NULL | Biller name |
| category | TEXT | NOT NULL | Biller category (utilities, internet, etc.) |
| subcategory | TEXT | | Biller subcategory |
| description | TEXT | | Biller description |
| logo_url | TEXT | | Logo URL |
| website | TEXT | | Website URL |
| phone | TEXT | | Phone number |
| address | TEXT | | Address |
| is_searchable | INTEGER | DEFAULT 1 | Searchable flag |
| search_success_rate | REAL | DEFAULT 1.0 | Search success rate (0.0-1.0) |
| requires_account_number | INTEGER | DEFAULT 1 | Requires account number flag |
| accepts_credit_card | INTEGER | DEFAULT 1 | Accepts credit card payments |
| accepts_bank_account | INTEGER | DEFAULT 1 | Accepts bank account payments |
| min_payment_amount | REAL | DEFAULT 1.0 | Minimum payment amount |
| average_bill_amount | REAL | | Average bill amount |
| payment_processing_days | INTEGER | DEFAULT 1 | Payment processing days |
| is_active | INTEGER | DEFAULT 1 | Active biller flag |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

### bills

User bills and payment schedule.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Bill id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| biller_id | INTEGER | REFERENCES billers(id) | Associated biller |
| account_id | INTEGER | REFERENCES accounts(id) | Account number for biller |
| bill_number | TEXT | | Bill number |
| amount | REAL | NOT NULL | Bill amount |
| due_date | TEXT | NOT NULL | Due date |
| due_day | INTEGER | | Day of month bill is due |
| is_recurring | INTEGER | DEFAULT 0 | Recurring bill flag |
| recurrence_interval | INTEGER | DEFAULT 30 | Recurrence interval (days) |
| next_due_date | TEXT | | Next due date for recurring bills |
| auto_pay_enabled | INTEGER | DEFAULT 0 | Autopay enabled flag |
| auto_pay_account_id | INTEGER | REFERENCES accounts(id) | Account for autopay |
| minimum_payment_amount | REAL | | Minimum payment amount |
| status | TEXT | DEFAULT 'pending' | Bill status (pending, paid, overdue, cancelled) |
| paid_date | TEXT | | Payment date |
| paid_amount | REAL | | Amount paid |
| late_fee | REAL | DEFAULT 0 | Late fee charged |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### transaction_types

Types of transactions (metadata).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Type id |
| code | TEXT | UNIQUE NOT NULL | Transaction type code |
| name | TEXT | NOT NULL | Transaction type name |
| category | TEXT | NOT NULL | Transaction category |
| description | TEXT | | Transaction description |

**Common Transaction Types:**
- `transfer` - Internal account transfer
- `bill_payment` - Bill payment
- `zelle` - Zelle transfer
- `deposit` - Deposit
- `withdraw` - Withdrawal
- `external_transfer` - External transfer
- `credit_card_payment` - Credit card payment
- `monthly_fee` - Monthly fee
- `interest_charge` - Interest charge

### transactions

All transactions; comprehensive set of references and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Transaction id |
| session_id | INTEGER | REFERENCES sessions(id) | Associated session |
| transaction_type_id | INTEGER | REFERENCES transaction_types(id) NOT NULL | Transaction type |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| from_account_id | INTEGER | REFERENCES accounts(id) | Source account |
| to_account_id | INTEGER | REFERENCES accounts(id) | Destination account |
| biller_id | INTEGER | REFERENCES billers(id) | Biller (for bill payments) |
| bill_id | INTEGER | REFERENCES bills(id) | Bill (for bill payments) |
| beneficiary_id | INTEGER | REFERENCES beneficiaries(id) | Beneficiary (for external transfers) |
| zelle_contact_id | INTEGER | REFERENCES zelle_contacts(id) | Zelle contact (for Zelle transfers) |
| credit_card_id | INTEGER | REFERENCES credit_cards(id) | Credit card (for credit card payments) |
| amount | REAL | NOT NULL | Transaction amount |
| fee | REAL | DEFAULT 0 | Transaction fee |
| balance_before | REAL | | Account balance before transaction |
| balance_after | REAL | | Account balance after transaction |
| reference_id | TEXT | | External reference ID |
| confirmation_number | TEXT | | Confirmation number |
| description | TEXT | | Transaction description |
| memo | TEXT | | Transaction memo |
| day | INTEGER | | Simulation day number |
| transaction_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Transaction date |
| posted_date | TEXT | | Posted date |
| pending_until | TEXT | | Pending until date |
| status | TEXT | DEFAULT 'success' | Transaction status (success, failed, pending) |
| failure_reason | TEXT | | Failure reason |
| error_code | TEXT | | Error code |
| error_message | TEXT | | Error message |
| metadata | TEXT | | Free-form metadata (JSON) |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

### scheduled_transactions

Definitions for transactions scheduled to run later.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Scheduled id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| transaction_type_id | INTEGER | REFERENCES transaction_types(id) NOT NULL | Transaction type |
| from_account_id | INTEGER | REFERENCES accounts(id) | Source account |
| to_account_id | INTEGER | REFERENCES accounts(id) | Destination account |
| biller_id | INTEGER | REFERENCES billers(id) | Biller |
| beneficiary_id | INTEGER | REFERENCES beneficiaries(id) | Beneficiary |
| amount | REAL | NOT NULL | Transaction amount |
| scheduled_date | TEXT | NOT NULL | Scheduled execution date |
| is_recurring | INTEGER | DEFAULT 0 | Recurring transaction flag |
| recurrence_frequency | TEXT | | Recurrence frequency (daily, weekly, monthly) |
| recurrence_end_date | TEXT | | Recurrence end date |
| description | TEXT | | Transaction description |
| memo | TEXT | | Transaction memo |
| status | TEXT | DEFAULT 'scheduled' | Status (scheduled, processed, cancelled) |
| processed_transaction_id | INTEGER | REFERENCES transactions(id) | Processed transaction record |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### error_codes

Catalog of error codes used by the app.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Error id |
| code | TEXT | UNIQUE NOT NULL | Error code |
| category | TEXT | NOT NULL | Error category |
| message | TEXT | NOT NULL | Error message |
| user_message | TEXT | | User-facing message |
| description | TEXT | | Error description |
| suggested_action | TEXT | | Suggested action |

**Common Error Codes:**
- `ACCOUNT_LIMIT_REACHED` - Maximum accounts reached
- `INSUFFICIENT_FUNDS` - Insufficient balance
- `INSUFFICIENT_MINIMUM_DEPOSIT` - Below minimum deposit
- `ACCOUNT_TYPE_NOT_AVAILABLE` - Account type not available for tier
- `WITHDRAWAL_NOT_ALLOWED` - Account type doesn't allow withdrawals

### system_config

Key/value system configuration table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Config id |
| key | TEXT | UNIQUE NOT NULL | Config key |
| value | TEXT | | Config value |
| data_type | TEXT | | Data type (string, number, boolean) |
| category | TEXT | | Config category |
| description | TEXT | | Config description |
| is_configurable | INTEGER | DEFAULT 1 | Configurable flag |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Common Config Keys:**
- `isPINValidationRequired` - Require PIN validation for sensitive actions

### notifications

User notifications and links to related entities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Notification id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| session_id | INTEGER | REFERENCES sessions(id) | Associated session |
| notification_type | TEXT | NOT NULL | Notification type |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification message |
| related_transaction_id | INTEGER | REFERENCES transactions(id) | Related transaction |
| related_bill_id | INTEGER | REFERENCES bills(id) | Related bill |
| related_account_id | INTEGER | REFERENCES accounts(id) | Related account |
| priority | TEXT | DEFAULT 'normal' | Priority (low, normal, high, urgent) |
| is_read | INTEGER | DEFAULT 0 | Read flag |
| read_at | TEXT | | Read timestamp |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| expires_at | TEXT | | Expiration timestamp |

## Relationships Overview

### Entity Relationships

```
users
├── account_tier_levels (many-to-one via account_tier_id)
├── sessions (one-to-many)
├── accounts (one-to-many)
├── credit_cards (one-to-many)
├── beneficiaries (one-to-many)
├── zelle_contacts (one-to-many)
├── bills (one-to-many)
├── transactions (one-to-many)
├── scheduled_transactions (one-to-many)
└── notifications (one-to-many)

accounts
├── account_types (many-to-one via account_type_id)
├── accounts (self-reference for overdraft protection)
├── credit_cards (one-to-many via linked_checking_account_id)
├── bills (one-to-many via account_id and auto_pay_account_id)
├── transactions (one-to-many via from_account_id and to_account_id)
└── scheduled_transactions (one-to-many via from_account_id and to_account_id)

transactions
├── transaction_types (many-to-one via transaction_type_id)
├── sessions (many-to-one via session_id)
├── accounts (many-to-one via from_account_id and to_account_id)
├── billers (many-to-one via biller_id)
├── bills (many-to-one via bill_id)
├── beneficiaries (many-to-one via beneficiary_id)
├── zelle_contacts (many-to-one via zelle_contact_id)
└── credit_cards (many-to-one via credit_card_id)

bills
├── billers (many-to-one via biller_id)
├── accounts (many-to-one via account_id and auto_pay_account_id)
└── transactions (one-to-many via bill_id)
```

## Indexes

### Primary Indexes
All tables have primary key indexes on `id` column.

### Foreign Key Indexes
- `idx_sessions_user` on `sessions.user_id`
- `idx_sessions_status` on `sessions.status`
- `idx_accounts_user` on `accounts.user_id`
- `idx_accounts_type` on `accounts.account_type_id`
- `idx_accounts_status` on `accounts.status`
- `idx_credit_cards_user` on `credit_cards.user_id`
- `idx_beneficiaries_user` on `beneficiaries.user_id`
- `idx_zelle_contacts_user` on `zelle_contacts.user_id`

### Unique Constraints
- `users.username` - Unique username
- `users.email` - Unique email (if provided)
- `accounts.account_number` - Unique account number
- `credit_cards.card_number` - Unique card number
- `billers.code` - Unique biller code
- `transaction_types.code` - Unique transaction type code
- `error_codes.code` - Unique error code
- `system_config.key` - Unique config key
- `sessions.session_id` - Unique session identifier

## Data Integrity

### Foreign Key Constraints
All foreign key relationships are enforced:
- Cascade deletes are NOT implemented (soft deletes used instead)
- Referential integrity maintained through application logic
- Foreign keys prevent orphaned records

### Soft Deletes
The following tables support soft deletes via `deleted_at`:
- `users`
- `accounts`
- `beneficiaries`
- `zelle_contacts`

Soft-deleted records are excluded from queries but preserved for audit purposes.

### Data Validation

**Account Balance Constraints:**
- Balance cannot be negative (unless overdraft protection enabled)
- Available balance ≤ balance
- Balance updates are atomic within transactions

**Transaction Constraints:**
- Amount must be positive
- Status must be one of: success, failed, pending
- Balance before/after must match account state

**Account Creation Constraints:**
- Account number must be unique
- User must exist
- Account type must exist
- Tier limits enforced (maxAccountsPerType)

## Query Patterns

### Common Queries

**Get User Accounts:**
```sql
SELECT * FROM accounts 
WHERE user_id = ? AND deleted_at IS NULL 
ORDER BY created_at DESC
```

**Get Transaction History:**
```sql
SELECT t.*, tt.name as transaction_type_name
FROM transactions t
JOIN transaction_types tt ON t.transaction_type_id = tt.id
WHERE t.user_id = ? 
  AND t.transaction_date >= ? 
  AND t.transaction_date <= ?
ORDER BY t.transaction_date DESC
LIMIT ? OFFSET ?
```

**Get Available Account Types:**
```sql
SELECT at.* 
FROM account_types at
WHERE at.is_active = 1
  AND at.id NOT IN (
    SELECT account_type_id 
    FROM accounts 
    WHERE user_id = ? 
      AND status = 'active' 
      AND deleted_at IS NULL
    GROUP BY account_type_id
    HAVING COUNT(*) >= (
      SELECT max_accounts_per_type 
      FROM account_tier_levels 
      WHERE id = (SELECT account_tier_id FROM users WHERE id = ?)
    )
  )
```

## Best Practices

### Data Integrity
1. **Foreign Key Constraints:** Ensure referential integrity
2. **Unique Constraints:** Prevent duplicate entries
3. **Soft Deletes:** Preserve data relationships
4. **Transaction Atomicity:** Use database transactions for multi-step operations

### Performance
1. **Indexing:** Index frequently queried columns
2. **Query Optimization:** Use appropriate WHERE clauses and LIMITs
3. **Pagination:** Implement pagination for large result sets
4. **Batch Operations:** Use batch inserts/updates when possible

### Security
1. **Input Validation:** Validate all user inputs
2. **SQL Injection Prevention:** Use parameterized queries (Drizzle ORM handles this)
3. **Data Encryption:** Encrypt sensitive data (passwords, PINs, card numbers)
4. **Access Control:** Verify user ownership before data access

### Maintenance
1. **Migrations:** Use migration system for schema changes
2. **Backup:** Regular database backups
3. **Cleanup:** Periodic cleanup of old soft-deleted records
4. **Monitoring:** Monitor query performance and optimize as needed

## Migration System

Database migrations are managed through the `src/db/migrations/` directory. Migrations are executed in order to apply schema changes.

**Migration Files:**
- `index.ts` - Migration execution logic
- `execute-statements.ts` - Statement execution utilities

**Migration Process:**
1. Create migration file with schema changes
2. Add migration to migration list
3. Execute migrations on app initialization
4. Verify migration success

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite Performance Best Practices](https://www.sqlite.org/optoverview.html)

## Related Documentation

- [Technical Implementation](./technical-implementation.md)
- [Account Creation Flow & Tier Configuration](./account-creation-flow-tier-configuration.md)
