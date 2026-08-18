<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Banking App Database Documentation

## Overview
The Banking App uses SQLite with Drizzle ORM for type-safe schema definitions. The document below mirrors the actual `src/db/schema.ts` table definitions (names, columns, types, defaults and references). It focuses on structure and layout; implementation details and usage status live in the codebase.

## Database Schema (as defined in `src/db/schema.ts`)

### Tables

#### account_tier_levels
Stores information about different account tiers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| code | TEXT | NOT NULL | Tier code |
| name | TEXT | NOT NULL | Tier name |
| description | TEXT | | Tier description |
| min_combined_balance | REAL | NOT NULL DEFAULT 0 | Minimum combined balance |
| max_accounts_per_type | INTEGER | NOT NULL DEFAULT 1 | Maximum accounts per type |
| monthly_fee | REAL | DEFAULT 0 | Monthly fee |
| fee_waiver_balance | REAL | | Balance to waive monthly fee |
| has_overdraft_protection | INTEGER | DEFAULT 0 | Overdraft protection flag |
| has_interest_checking | INTEGER | DEFAULT 0 | Interest checking flag |
| interest_rate_bonus | REAL | DEFAULT 0 | Interest rate bonus |
| free_wire_transfers | INTEGER | DEFAULT 0 | Free wire transfers |
| free_cashiers_checks | INTEGER | DEFAULT 0 | Free cashier's checks |
| priority_support | INTEGER | DEFAULT 0 | Priority support flag |
| dedicated_banker | INTEGER | DEFAULT 0 | Dedicated banker flag |
| sort_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

#### account_types
Stores information about different account types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| tier_level_id | INTEGER | REFERENCES account_tier_levels(id) | Associated tier level |
| code | TEXT | NOT NULL | Account type code |
| name | TEXT | NOT NULL | Account type name |
| category | TEXT | NOT NULL | Account category |
| description | TEXT | | Account description |
| min_opening_balance | REAL | DEFAULT 0 | Minimum opening balance |
| max_balance | REAL | DEFAULT 50000 | Maximum balance |
| monthly_fee | REAL | DEFAULT 0 | Monthly fee |
| fee_waiver_min_balance | REAL | | Minimum balance to waive fee |
| fee_waiver_min_direct_deposit | REAL | | Minimum direct deposit to waive fee |
| has_interest | INTEGER | DEFAULT 0 | Interest flag |
| base_interest_rate | REAL | DEFAULT 0 | Base interest rate |
| has_debit_card | INTEGER | DEFAULT 0 | Debit card flag |
| has_checks | INTEGER | DEFAULT 0 | Checks flag |
| allows_overdraft | INTEGER | DEFAULT 0 | Overdraft flag |
| overdraft_fee | REAL | DEFAULT 0 | Overdraft fee |
| overdraft_protection_transfer_fee | REAL | DEFAULT 0 | Overdraft protection transfer fee |
| min_balance_to_avoid_fee | REAL | DEFAULT 0 | Minimum balance to avoid fee |
| monthly_transaction_limit | INTEGER | | Monthly transaction limit |
| withdrawal_penalty_days | INTEGER | | Withdrawal penalty days |
| early_withdrawal_penalty_rate | REAL | | Early withdrawal penalty rate |
| is_active | INTEGER | DEFAULT 1 | Active flag |
| sort_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

#### interest_rate_tiers
Tiered interest rate definitions for savings/accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| account_type_id | INTEGER | REFERENCES account_types(id) NOT NULL | Associated account type |
| min_balance | REAL | NOT NULL | Minimum balance |
| max_balance | REAL | | Maximum balance |
| annual_percentage_yield | REAL | NOT NULL | APY |
| effective_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Effective date |
| end_date | TEXT | | End date |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

#### users
Application users and profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| username | TEXT | UNIQUE NOT NULL | Username |
| password | TEXT | NOT NULL | Password (hashed) |
| full_name | TEXT | | Full name |
| phone_number | TEXT | NOT NULL | Phone number |
| email | TEXT | | Email address |
| account_tier_id | INTEGER | REFERENCES account_tier_levels(id) NOT NULL | Tier level |
| pin | TEXT | | PIN |
| security_question | TEXT | | Security question |
| security_answer | TEXT | | Security answer |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |
| deleted_at | TEXT | | Soft-delete timestamp |

#### sessions
User sessions and simulation state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Session id |
| session_id | TEXT | UNIQUE NOT NULL | External session identifier |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| seed | INTEGER | | RNG seed |
| volatility | REAL | DEFAULT 0 | Volatility setting |
| enable_interest | INTEGER | DEFAULT 0 | Flag |
| enable_recurring_bills | INTEGER | DEFAULT 0 | Flag |
| enable_monthly_fees | INTEGER | DEFAULT 0 | Flag |
| current_day | INTEGER | DEFAULT 0 | Current day (sim) |
| created_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created date |
| current_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Current date |
| status | TEXT | DEFAULT 'active' | Session status |
| ended_at | TEXT | | End timestamp |
| metadata | TEXT | | Free-form metadata |

Indexes: idx_sessions_user (on user_id), idx_sessions_status (on status)

#### accounts
User accounts (checking, savings, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Account id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| account_type_id | INTEGER | REFERENCES account_types(id) NOT NULL | Account type |
| account_number | TEXT | UNIQUE NOT NULL | Account number |
| account_name | TEXT | | Friendly name |
| balance | REAL | NOT NULL DEFAULT 0 | Balance |
| available_balance | REAL | NOT NULL DEFAULT 0 | Available balance |
| is_primary | INTEGER | DEFAULT 0 | Is primary account |
| status | TEXT | DEFAULT 'active' | Status |
| opened_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Opened date |
| closed_date | TEXT | | Closed date |
| last_statement_date | TEXT | | Last statement |
| next_statement_date | TEXT | | Next statement |
| overdraft_protection_enabled | INTEGER | DEFAULT 0 | Flag |
| overdraft_protection_source_account_id | INTEGER | REFERENCES accounts(id) | Source account |
| linked_savings_account_id | INTEGER | REFERENCES accounts(id) | Linked savings account |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |
| deleted_at | TEXT | | Soft-delete timestamp |

Indexes: idx_accounts_user, idx_accounts_type, idx_accounts_status

#### credit_cards
Credit card records for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Card id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| linked_checking_account_id | INTEGER | REFERENCES accounts(id) | Linked checking account |
| card_number | TEXT | UNIQUE NOT NULL | Card number |
| last_four_digits | TEXT | NOT NULL | Last 4 digits |
| cardholder_name | TEXT | NOT NULL | Cardholder name |
| expiry_month | INTEGER | NOT NULL | Expiry month |
| expiry_year | INTEGER | NOT NULL | Expiry year |
| cvv | TEXT | NOT NULL | CVV |
| credit_limit | REAL | NOT NULL | Credit limit |
| current_balance | REAL | DEFAULT 0 NOT NULL | Current balance |
| available_credit | REAL | NOT NULL | Available credit |
| apr | REAL | NOT NULL | APR |
| annual_fee | REAL | DEFAULT 0 | Annual fee |
| cash_advance_fee_percent | REAL | DEFAULT 5.0 | Cash advance fee % |
| late_payment_fee | REAL | DEFAULT 35.0 | Late fee |
| payment_due_day | INTEGER | NOT NULL | Due day |
| minimum_payment_percent | REAL | DEFAULT 2.0 | Minimum payment % |
| statement_closing_day | INTEGER | NOT NULL | Closing day |
| autopay_enabled | INTEGER | DEFAULT 0 | Autopay enabled |
| autopay_amount | TEXT | DEFAULT 'minimum' | Autopay amount |
| status | TEXT | DEFAULT 'active' | Status |
| opened_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Opened date |
| last_payment_date | TEXT | | Last payment |
| last_statement_date | TEXT | | Last statement |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |

Indexes: idx_credit_cards_user

#### beneficiaries
External transfer beneficiaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Beneficiary id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| name | TEXT | NOT NULL | Beneficiary name |
| account_number | TEXT | NOT NULL | Account number |
| account_type | TEXT | NOT NULL | Account type |
| bank_name | TEXT | NOT NULL | Bank name |
| bank_address | TEXT | | Bank address |
| nickname | TEXT | | Nickname |
| email | TEXT | | Email |
| phone | TEXT | | Phone |
| verification_status | TEXT | DEFAULT 'unverified' | Verification status |
| verification_method | TEXT | | Verification method |
| is_favorite | INTEGER | DEFAULT 0 | Favorite flag |
| status | TEXT | DEFAULT 'active' | Status |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |
| deleted_at | TEXT | | Soft-delete timestamp |

Indexes: idx_beneficiaries_user

#### zelle_contacts
Zelle contacts stored per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Contact id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| contact_name | TEXT | NOT NULL | Contact name |
| contact_email | TEXT | | Contact email |
| contact_phone | TEXT | | Contact phone |
| is_enrolled | INTEGER | DEFAULT 0 | Enrollment flag |
| is_favorite | INTEGER | DEFAULT 0 | Favorite flag |
| last_sent_amount | REAL | | Last sent amount |
| last_sent_date | TEXT | | Last sent date |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |

Indexes: idx_zelle_contacts_user

#### billers
Predefined billers/payees.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Biller id |
| code | TEXT | UNIQUE NOT NULL | Code |
| name | TEXT | NOT NULL | Name |
| category | TEXT | NOT NULL | Category |
| subcategory | TEXT | | Subcategory |
| description | TEXT | | Description |
| logo_url | TEXT | | Logo URL |
| website | TEXT | | Website |
| phone | TEXT | | Phone |
| address | TEXT | | Address |
| is_searchable | INTEGER | DEFAULT 1 | Searchable flag |
| search_success_rate | REAL | DEFAULT 1.0 | Search success rate |
| requires_account_number | INTEGER | DEFAULT 1 | Requires account number |
| accepts_credit_card | INTEGER | DEFAULT 1 | Accepts credit card |
| accepts_bank_account | INTEGER | DEFAULT 1 | Accepts bank account |
| min_payment_amount | REAL | DEFAULT 1.0 | Minimum payment |
| average_bill_amount | REAL | | Average bill amount |
| payment_processing_days | INTEGER | DEFAULT 1 | Processing days |
| is_active | INTEGER | DEFAULT 1 | Active flag |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |

#### bills
User bills and payment schedule.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Bill id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| biller_id | INTEGER | REFERENCES billers(id) | Biller |
| account_id | INTEGER | REFERENCES accounts(id) | Account |
| bill_number | TEXT | | Bill number |
| amount | REAL | NOT NULL | Amount |
| due_date | TEXT | NOT NULL | Due date |
| due_day | INTEGER | | Due day |
| is_recurring | INTEGER | DEFAULT 0 | Recurring flag |
| recurrence_interval | INTEGER | DEFAULT 30 | Interval (days) |
| next_due_date | TEXT | | Next due date |
| auto_pay_enabled | INTEGER | DEFAULT 0 | Autopay flag |
| auto_pay_account_id | INTEGER | REFERENCES accounts(id) | Autopay account |
| minimum_payment_amount | REAL | | Minimum payment |
| status | TEXT | DEFAULT 'pending' | Status |
| paid_date | TEXT | | Paid date |
| paid_amount | REAL | | Paid amount |
| late_fee | REAL | DEFAULT 0 | Late fee |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |

#### transaction_types
Types of transactions (metadata).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Type id |
| code | TEXT | UNIQUE NOT NULL | Code |
| name | TEXT | NOT NULL | Name |
| category | TEXT | NOT NULL | Category |
| description | TEXT | | Description |

#### transactions
All transactions; comprehensive set of references and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Transaction id |
| session_id | INTEGER | REFERENCES sessions(id) | Session |
| transaction_type_id | INTEGER | REFERENCES transaction_types(id) NOT NULL | Transaction type |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| from_account_id | INTEGER | REFERENCES accounts(id) | From account |
| to_account_id | INTEGER | REFERENCES accounts(id) | To account |
| biller_id | INTEGER | REFERENCES billers(id) | Biller |
| bill_id | INTEGER | REFERENCES bills(id) | Bill |
| beneficiary_id | INTEGER | REFERENCES beneficiaries(id) | Beneficiary |
| zelle_contact_id | INTEGER | REFERENCES zelle_contacts(id) | Zelle contact |
| credit_card_id | INTEGER | REFERENCES credit_cards(id) | Credit card |
| amount | REAL | NOT NULL | Amount |
| fee | REAL | DEFAULT 0 | Fee |
| balance_before | REAL | | Balance before |
| balance_after | REAL | | Balance after |
| reference_id | TEXT | | External reference |
| confirmation_number | TEXT | | Confirmation number |
| description | TEXT | | Description |
| memo | TEXT | | Memo |
| day | INTEGER | | Day number |
| transaction_date | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Transaction date |
| posted_date | TEXT | | Posted date |
| pending_until | TEXT | | Pending until |
| status | TEXT | DEFAULT 'success' | Status |
| failure_reason | TEXT | | Failure reason |
| error_code | TEXT | | Error code |
| error_message | TEXT | | Error message |
| metadata | TEXT | | Free-form metadata |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |

#### scheduled_transactions
Definitions for transactions scheduled to run later.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Scheduled id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| transaction_type_id | INTEGER | REFERENCES transaction_types(id) NOT NULL | Type |
| from_account_id | INTEGER | REFERENCES accounts(id) | From account |
| to_account_id | INTEGER | REFERENCES accounts(id) | To account |
| biller_id | INTEGER | REFERENCES billers(id) | Biller |
| beneficiary_id | INTEGER | REFERENCES beneficiaries(id) | Beneficiary |
| amount | REAL | NOT NULL | Amount |
| scheduled_date | TEXT | NOT NULL | Scheduled date |
| is_recurring | INTEGER | DEFAULT 0 | Recurring flag |
| recurrence_frequency | TEXT | | Recurrence frequency |
| recurrence_end_date | TEXT | | Recurrence end date |
| description | TEXT | | Description |
| memo | TEXT | | Memo |
| status | TEXT | DEFAULT 'scheduled' | Status |
| processed_transaction_id | INTEGER | REFERENCES transactions(id) | Processed transaction |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |

#### error_codes
Catalog of error codes used by the app.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Error id |
| code | TEXT | UNIQUE NOT NULL | Error code |
| category | TEXT | NOT NULL | Category |
| message | TEXT | NOT NULL | Message |
| user_message | TEXT | | User-facing message |
| description | TEXT | | Description |
| suggested_action | TEXT | | Suggested action |

#### system_config
Key/value system configuration table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Config id |
| key | TEXT | UNIQUE NOT NULL | Config key |
| value | TEXT | | Value |
| data_type | TEXT | | Data type |
| category | TEXT | | Category |
| description | TEXT | | Description |
| is_configurable | INTEGER | DEFAULT 1 | Flag |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Updated at |

#### notifications
User notifications and links to related entities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Notification id |
| user_id | INTEGER | REFERENCES users(id) NOT NULL | Owner user |
| session_id | INTEGER | REFERENCES sessions(id) | Session |
| notification_type | TEXT | NOT NULL | Type |
| title | TEXT | NOT NULL | Title |
| message | TEXT | NOT NULL | Message |
| related_transaction_id | INTEGER | REFERENCES transactions(id) | Related transaction |
| related_bill_id | INTEGER | REFERENCES bills(id) | Related bill |
| related_account_id | INTEGER | REFERENCES accounts(id) | Related account |
| priority | TEXT | DEFAULT 'normal' | Priority |
| is_read | INTEGER | DEFAULT 0 | Read flag |
| read_at | TEXT | | Read timestamp |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Created at |
| expires_at | TEXT | | Expiration |

---

## Notes
- This document was cleaned to reflect `src/db/schema.ts`. Non-existing tables (archive tables, `oauth`, `settings`, `audit_logs`, etc.) were removed because they are not defined in the current schema file.
- If you want a secondary section showing historical/removed tables or suggested archival schemas, I can add that separately.
