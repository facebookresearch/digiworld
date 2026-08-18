<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Banking App - Account Creation Flow & Tier Configuration

## Overview

The banking application uses a tier-based system to determine which accounts are automatically created for new users during registration and which accounts they can manually create later.

## 1. Tier System Overview

### Tier Determination

User tier is determined by their email domain during registration:

| Tier Name | Tier ID | Email Domains | Description |
|-----------|---------|---------------|-------------|
| Sapphire | 1 | blueelite.com, luxbank.com, sapphiremember.com | Premium tier with highest benefits |
| Premier | 2 | businessfirst.com, profinancier.com, premierplus.com | Mid-tier with business benefits |
| Everyday | 3 | All other domains | Standard tier for general users |

**Examples:**
- User registers with `john@blueelite.com` → Sapphire Tier
- User registers with `jane@businessfirst.com` → Premier Tier
- User registers with `alex@gmail.com` → Everyday Tier

### Tier Configuration Details

#### Sapphire Tier (ID: 1)
- **Minimum Combined Balance:** $250,000
- **Monthly Fee:** $35.00
- **Fee Waiver Balance:** $250,000
- **Overdraft Protection:** ✅ Included
- **Interest Checking:** ✅ Included
- **Interest Rate Bonus:** 0.15%
- **Free Wire Transfers:** 10 per month
- **Free Cashier's Checks:** 5 per month
- **Priority Support:** ✅ Yes
- **Dedicated Banker:** ✅ Yes

#### Premier Tier (ID: 2)
- **Minimum Combined Balance:** $25,000
- **Monthly Fee:** $30.00
- **Fee Waiver Balance:** $25,000
- **Overdraft Protection:** ✅ Included
- **Interest Checking:** ✅ Included
- **Interest Rate Bonus:** 0.05%
- **Free Wire Transfers:** 3 per month
- **Free Cashier's Checks:** 2 per month
- **Priority Support:** ✅ Yes
- **Dedicated Banker:** ❌ No

#### Everyday Tier (ID: 3)
- **Minimum Combined Balance:** $0
- **Monthly Fee:** $10.00
- **Fee Waiver Balance:** $500
- **Overdraft Protection:** ❌ Not included
- **Interest Checking:** ❌ Not included
- **Interest Rate Bonus:** 0%
- **Free Wire Transfers:** 0
- **Free Cashier's Checks:** 0
- **Priority Support:** ❌ No
- **Dedicated Banker:** ❌ No

## 2. Account Types

### Available Account Types in System

| Account Type Code | Name | Description | Can Withdraw? |
|-------------------|------|-------------|---------------|
| checking | Checking Account | Primary transaction account for daily banking | ✅ Yes |
| savings | Savings Account | Interest-bearing savings account | ✅ Yes |
| money_market | Money Market Account | High-yield savings with limited transactions | ✅ Yes |
| ira_account | Retirement Account | Tax-advantaged retirement savings account | ❌ No |

### Account Type Details

#### Checking Account
- **Minimum Opening Balance:** $25.00
- **Maximum Balance:** $50,000.00
- **Monthly Fee:** $10.00
- **Fee Waiver Minimum Balance:** $500.00
- **Has Interest:** No
- **Base Interest Rate:** 0.01%
- **Has Debit Card:** ✅ Yes
- **Has Checks:** ✅ Yes
- **Allows Overdraft:** ✅ Yes
- **Overdraft Fee:** $35.00
- **Overdraft Protection Transfer Fee:** $10.00

#### Savings Account
- **Minimum Opening Balance:** $25.00
- **Maximum Balance:** $100,000.00
- **Monthly Fee:** $5.00
- **Fee Waiver Minimum Balance:** $300.00
- **Has Interest:** ✅ Yes
- **Base Interest Rate:** 0.15%
- **Has Debit Card:** ❌ No
- **Has Checks:** ❌ No
- **Allows Overdraft:** ❌ No
- **Monthly Transaction Limit:** 6 transactions

#### Money Market Account
- **Minimum Opening Balance:** $2,500.00
- **Maximum Balance:** $250,000.00
- **Monthly Fee:** $12.00
- **Fee Waiver Minimum Balance:** $2,500.00
- **Has Interest:** ✅ Yes
- **Base Interest Rate:** 0.25%
- **Has Debit Card:** ✅ Yes
- **Has Checks:** ✅ Yes
- **Allows Overdraft:** ❌ No
- **Monthly Transaction Limit:** 6 transactions

#### IRA Account (Individual Retirement Account)
- **Minimum Opening Balance:** $1,000.00
- **Maximum Balance:** $600,000.00
- **Monthly Fee:** $0.00
- **Has Interest:** ✅ Yes
- **Base Interest Rate:** 1.75%
- **Has Debit Card:** ❌ No
- **Has Checks:** ❌ No
- **Allows Overdraft:** ❌ No
- **Withdrawal Penalty Days:** 180 days
- **Early Withdrawal Penalty Rate:** 10.0%

## 3. Tier-Based Account Creation

### 3.1 Automatic Account Creation During Registration

When a user registers, accounts are automatically created based on their tier:

#### Sapphire Tier (ID: 1)

| Account Type | Initial Balance | Auto-Created |
|--------------|------------------|--------------|
| Checking | $20,000 | ✅ Yes |
| Savings | $75,000 | ✅ Yes |
| Money Market | $250,000 | ✅ Yes |
| **Total Initial Balance** | **$345,000** | |

#### Premier Tier (ID: 2)

| Account Type | Initial Balance | Auto-Created |
|--------------|------------------|--------------|
| Checking | $7,500 | ✅ Yes |
| Savings | $30,000 | ✅ Yes |
| **Total Initial Balance** | **$37,500** | |

#### Everyday Tier (ID: 3)

| Account Type | Initial Balance | Auto-Created |
|--------------|------------------|--------------|
| Checking | $500 | ✅ Yes |
| **Total Initial Balance** | **$500** | |

## 4. Manual Account Creation

After registration, users can create additional accounts based on their tier limits.

### 4.1 Tier-Based Account Limits (Manual Creation)

#### Sapphire Tier

| Account Type | Max Accounts | Currently Available for Creation |
|--------------|--------------|----------------------------------|
| Checking | 3 | 2 more (1 created at registration) |
| Savings | 3 | 2 more (1 created at registration) |
| Money Market | 3 | 2 more (1 created at registration) |
| IRA Account | 1 | 1 (none created at registration) |

**Minimum Initial Deposit Required:**
- Checking: $10,000
- Savings: $15,000
- Money Market: $20,000
- IRA Account: $5,000

#### Premier Tier

| Account Type | Max Accounts | Currently Available for Creation |
|--------------|--------------|----------------------------------|
| Checking | 2 | 1 more (1 created at registration) |
| Savings | 2 | 1 more (1 created at registration) |
| Money Market | ❌ Not allowed | - |
| IRA Account | 1 | 1 (none created at registration) |

**Minimum Initial Deposit Required:**
- Checking: $5,000
- Savings: $10,000
- IRA Account: $1,000

#### Everyday Tier

| Account Type | Max Accounts | Currently Available for Creation |
|--------------|--------------|----------------------------------|
| Checking | ❌ Not allowed | Already have max (1 created at registration) |
| Savings | 1 | 1 (none created at registration) |
| IRA Account | 1 | 1 (none created at registration) |
| Money Market | ❌ Not allowed | - |

**Minimum Initial Deposit Required:**
- Savings: $1,000
- IRA Account: $100

## 5. Credit Card Eligibility

Users can apply for credit cards based on their tier.

### Credit Card Limits by Tier

| Tier | Max Credit Cards | Credit Limit | APR | Annual Fee |
|------|------------------|---------------|-----|------------|
| Sapphire | 3 | $75,000 | 15.99% | $150 |
| Premier | 2 | $45,000 | 17.99% | $50 |
| Everyday | 1 | $25,000 | 19.99% | $0 |

### Credit Card Features by Tier

#### Sapphire Tier Benefits
- 3 credit cards allowed
- Highest credit limit ($75,000)
- Lowest APR (15.99%)
- Premium rewards program
- Annual fee: $150/card

#### Premier Tier Benefits
- 2 credit cards allowed
- Mid-range credit limit ($45,000)
- Competitive APR (17.99%)
- Business rewards program
- Annual fee: $50/card

#### Everyday Tier Benefits
- 1 credit card allowed
- Standard credit limit ($25,000)
- Standard APR (19.99%)
- Basic rewards program
- No annual fee

## 6. Complete User Journey Examples

### Example 1: Sapphire Tier User (john@blueelite.com)

**Registration:**
- Signs up with email `john@blueelite.com`
- System creates Sapphire tier account
- Automatically receives:
  - Checking Account: $20,000
  - Savings Account: $75,000
  - Money Market Account: $250,000
  - Total starting balance: $345,000

**After Registration (Manual Creation):**
- Can create 2 more Checking accounts (min deposit: $10,000 each)
- Can create 2 more Savings accounts (min deposit: $15,000 each)
- Can create 2 more Money Market accounts (min deposit: $20,000 each)
- Can create 1 IRA account (min deposit: $5,000)
- Can apply for 3 credit cards ($75,000 limit each)

### Example 2: Premier Tier User (jane@businessfirst.com)

**Registration:**
- Signs up with email `jane@businessfirst.com`
- System creates Premier tier account
- Automatically receives:
  - Checking Account: $7,500
  - Savings Account: $30,000
  - Total starting balance: $37,500

**After Registration (Manual Creation):**
- Can create 1 more Checking account (min deposit: $5,000)
- Can create 1 more Savings account (min deposit: $10,000)
- Can create 1 IRA account (min deposit: $1,000)
- Cannot create Money Market accounts
- Can apply for 2 credit cards ($45,000 limit each)

### Example 3: Everyday Tier User (alex@gmail.com)

**Registration:**
- Signs up with email `alex@gmail.com`
- System creates Everyday tier account
- Automatically receives:
  - Checking Account: $500
  - Total starting balance: $500

**After Registration (Manual Creation):**
- Cannot create more Checking accounts (limit reached)
- Can create 1 Savings account (min deposit: $1,000)
- Can create 1 IRA account (min deposit: $100)
- Cannot create Money Market accounts
- Can apply for 1 credit card ($25,000 limit)

## 7. Summary Tables

### Complete Tier Comparison

| Feature | Sapphire | Premier | Everyday |
|---------|----------|---------|----------|
| Email Domains | blueelite.com, luxbank.com, sapphiremember.com | businessfirst.com, profinancier.com, premierplus.com | All others |
| Auto Checking | ✅ $20,000 | ✅ $7,500 | ✅ $500 |
| Auto Savings | ✅ $75,000 | ✅ $30,000 | ❌ |
| Auto Money Market | ✅ $250,000 | ❌ | ❌ |
| Total Auto Balance | $345,000 | $37,500 | $500 |
| Max Checking | 3 | 2 | 1 |
| Max Savings | 3 | 2 | 1 |
| IRA Account | 1 | 1 | 1 |
| Max Money Market | 3 | 0 | 0 |
| Max Credit Cards | 3 | 2 | 1 |
| Credit Card Limit | $75,000 | $45,000 | $25,000 |
| Credit Card APR | 15.99% | 17.99% | 19.99% |
| Annual Fee | $150 | $50 | $0 |
| Monthly Fee | $35.00 | $30.00 | $10.00 |
| Fee Waiver Balance | $250,000 | $25,000 | $500 |
| Overdraft Protection | ✅ | ✅ | ❌ |
| Interest Checking | ✅ | ✅ | ❌ |
| Priority Support | ✅ | ✅ | ❌ |
| Dedicated Banker | ✅ | ❌ | ❌ |

## 8. Technical Implementation

### Account Creation Flow

1. **User Registration:**
   - User provides email, username, and password
   - System extracts email domain
   - Tier is determined based on domain matching
   - User record is created with `accountTierId` set

2. **Automatic Account Creation:**
   - System retrieves tier configuration from `TIER_CONFIG` constant
   - For each account type in tier's `accountTypes` array:
     - Generate unique account number using `generateAccountNumber()` helper
     - Create account record with initial balance from `initialBalances` mapping
     - Set account as primary if it's the first account of that type

3. **Manual Account Creation:**
   - User selects account type from available options
   - System checks tier limits:
     - Verifies user hasn't exceeded `maxAccountsPerType` for selected type
     - Validates minimum initial deposit requirement
   - If validation passes:
     - Generate account number
     - Create account with specified initial deposit
     - Update account counts

### Account Number Generation

Account numbers are generated using the following pattern:
- **Prefix:** Based on account type code (checking: '1', savings: '2', money_market: '3')
- **User Part:** Last 4 digits of user ID, zero-padded
- **Random Part:** 7-digit random number, zero-padded
- **Format:** `{prefix}{userPart}{randomPart}` (e.g., "1001234567890")

### Database Schema

Account creation involves the following tables:
- `users` - Stores user information and tier assignment
- `account_tier_levels` - Defines tier configurations
- `account_types` - Defines available account types
- `accounts` - Stores created accounts

See [database.md](./database.md) for detailed schema information.

## 9. Validation Rules

### Account Creation Validation

1. **Tier-Based Limits:**
   - Check current account count for account type
   - Verify against `maxAccountsPerType` for user's tier
   - Reject if limit exceeded

2. **Minimum Deposit:**
   - Verify initial deposit meets tier-specific minimum
   - Reject if below minimum threshold

3. **Account Type Availability:**
   - Verify account type is allowed for user's tier
   - Check `allowedTypes` array in tier configuration

4. **Account Status:**
   - Only active accounts count toward limits
   - Closed/frozen accounts don't affect limits

## 10. Error Handling

### Common Error Scenarios

1. **ACCOUNT_LIMIT_REACHED:**
   - User has reached maximum accounts for selected type
   - Solution: Inform user of limit and suggest alternative account types

2. **INSUFFICIENT_MINIMUM_DEPOSIT:**
   - Initial deposit below tier-specific minimum
   - Solution: Display required minimum and allow user to adjust

3. **ACCOUNT_TYPE_NOT_AVAILABLE:**
   - Account type not allowed for user's tier
   - Solution: Show only available account types for tier

4. **TIER_NOT_FOUND:**
   - User's tier ID doesn't exist in system
   - Solution: Default to Everyday tier or show error

## 11. Future Enhancements

Potential improvements to the tier and account creation system:

1. **Dynamic Tier Upgrades:**
   - Automatic tier upgrade when combined balance exceeds threshold
   - Notification system for tier changes

2. **Account Type Customization:**
   - Allow admins to configure account types per tier
   - Dynamic account type availability

3. **Enhanced Validation:**
   - Credit checks for credit card applications
   - Income verification for certain account types

4. **Account Bundling:**
   - Package deals for multiple account types
   - Discounted fees for bundled accounts

