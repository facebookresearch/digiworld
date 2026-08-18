@ -0,0 +1,160 @@
# Auction App Test Credentials

## Test User Accounts

| Username | Email | Password | Name | Seller Rating | Total Sales | Total Items Listed |
|----------|-------|----------|------|---------------|-------------|-------------------|
| `auction_master` | auction_master@example.com | `auction123` | Evelyn Lee | 4.2 | 210 | 43 |
| `lucky_bidder` | lucky_bidder@example.com | `auction123` | Lucky Bidder | 4.23 | 210 | 43 |
| `jane_doe_auctioner` | jane_doe@example.com | `welcome123` | Jane Doe | 4.2 | 210 | 43 |
| `emily_auctioner` | emily_auctioner@example.com | `welcome123` | Emily Chen | 4.2 | 210 | 43 |
| `alexandra_trader` | alexandra_trader@example.com | `welcome123` | Alexandra Brooks | 4.23 | 210 | 43 |
| `rose_bloom` | rose_bloom@example.com | `welcome123` | Rose Bloom | 4.2 | 210 | 43 |
| `victoria_trader` | victoria_trader@example.com | `welcome123` | Victoria Lee | 4.23 | 210 | 43 |
| `emily_jackson` | emily_jackson@example.com | `welcome123` | Emily Jackson | 4.23 | 210 | 43 |
| `hannah_trader` | hannah_trader@example.com | `welcome123` | Hannah Lee | 4.2 | 210 | 43 |
| `kate_williams` | kate_williams@example.com | `welcome123` | Kate Williams | 4.23 | 210 | 43 |
| `gabriel_harrison` | gabriel_harrison@example.com | `welcome123` | Gabriel Harrison | 4.23 | 210 | 43 |
| `emily_coleman` | emily_coleman@example.com | `welcome123` | Emily Coleman | 4.23 | 210 | 43 |
| `ava_morris` | ava_morris@example.com | `welcome123` | Ava Morris | 4.23 | 210 | 43 |
| `lucas_broker` | lucas_broker@example.com | `welcome123` | Lucas Brooks | 4.23 | 210 | 43 |
| `emily_harris` | emily_harris@example.com | `welcome123` | Emily Harris | 4.23 | 210 | 43 |
| `emily_parker` | emily_parker@example.com | `welcome123` | Emily Parker | 4.23 | 210 | 43 |
| `emily_wilson` | emily_wilson@example.com | `welcome123` | Emily Wilson | 4.23 | 210 | 43 |
| `emily_turner` | emily_turner@example.com | `welcome123` | Emily Turner | 4.23 | 210 | 43 |
| `emily_mitchell` | emily_mitchell@example.com | `welcome123` | Emily Mitchell | 4.23 | 210 | 43 |
| `emily_roberts` | emily_roberts@example.com | `welcome123` | Emily Roberts | 4.23 | 210 | 43 |
| `emily_sanders` | emily_sanders@example.com | `welcome123` | Emily Sanders | 4.23 | 210 | 43 |
| `emily_collins` | emily_collins@example.com | `welcome123` | Emily Collins | 4.23 | 210 | 43 |
| `emily_thompson` | emily_thompson@example.com | `welcome123` | Emily Thompson | 4.23 | 210 | 43 |
| `emily_watson` | emily_watson@example.com | `welcome123` | Emily Watson | 4.23 | 210 | 43 |
| `emily_hall` | emily_hall@example.com | `welcome123` | Emily Hall | 4.23 | 210 | 43 |
| `emily_martin` | emily_martin@example.com | `welcome123` | Emily Martin | 4.23 | 210 | 43 |
| `emily_white` | emily_white@example.com | `welcome123` | Emily White | 4.23 | 210 | 43 |
| `emily_brown` | emily_brown@example.com | `welcome123` | Emily Brown | 4.23 | 210 | 43 |
| `emily_jones` | emily_jones@example.com | `welcome123` | Emily Jones | 4.23 | 210 | 43 |
| `emily_adams` | emily_adams@example.com | `welcome123` | Emily Adams | 4.23 | 210 | 43 |
| `emily_smith` | emily_smith@example.com | `welcome123` | Emily Smith | 4.23 | 210 | 43 |
| `emily_davis` | emily_davis@example.com | `welcome123` | Emily Davis | 4.23 | 210 | 43 |
| `emily_walker` | emily_walker@example.com | `welcome123` | Emily Walker | 4.23 | 210 | 43 |
| `emily_wilson_trader` | emily_wilson_trader@example.com | `welcome123` | Emily Wilson | 4.23 | 210 | 43 |

## Common Passwords

All test users use simple passwords for easy testing. Common passwords include:

- `auction123` - Used by 2 users (auction_master, lucky_bidder)
- `welcome123` - Used by 33 users (all others)

**Note:** Passwords are assigned deterministically based on user index. See `src/data/auction_data-generator.py` for the full password list.

## User Payment Methods

**57 payment methods** are available for **28 users** in `src/data/mock-payment_methods.json`. Average of **2.0 cards per user**.

### Sample User Payment Methods

| Username | Card Number | Card Type | Expiry | Default |
|----------|-------------|-----------|--------|---------|
| `auction_master` | 7126 3646 9837 9689 | mastercard | 01/28 | ⭐ |
| `auction_master` | 1319 2832 6947 6038 | discover | 04/24 | |
| `emily_auctioner` | 5342 9645 7932 4470 | mastercard | 09/30 | ⭐ |
| `emily_auctioner` | 6107 7537 7118 8177 | mastercard | 09/27 | |
| `emily_auctioner` | 4681 2049 6539 1344 | mastercard | 10/28 | |
| `sophia_bidder` | 4510 9834 3167 8744 | discover | 04/30 | ⭐ |
| `alexandra_trader` | 7596 6559 2790 5073 | visa | 04/25 | ⭐ |
| `alexandra_trader` | 3296 7912 4006 5563 | discover | 08/25 | |
| `alexandra_trader` | 2604 1828 9856 1241 | discover | 02/30 | |
| `rose_bloom` | 7209 1035 7396 5345 | mastercard | 08/26 | ⭐ |
| `victoria_trader` | 9320 2312 4044 2122 | visa | 10/24 | ⭐ |
| `victoria_trader` | 7615 2964 5033 1651 | mastercard | 10/24 | |
| `victoria_trader` | 5272 4346 6147 4910 | amex | 05/27 | |

**Note:** Each user has at least one payment method. The default payment method (⭐) is used automatically when making purchases or placing bids if no specific card is selected.

**Card Types Available:**
- Visa
- Mastercard
- Discover
- Amex

See `src/data/mock-payment_methods.json` for the complete list of all 57 payment methods.

## Additional Test Users

- **Total of 35 test users** available in `src/data/mock-users.json`
- All users can bid on auctions and purchase buy-now items
- **28 users have payment methods** (57 total payment methods)

## Test Data

### Sample Items
- **100 items** available in `src/data/mock-items.json`
- **~40% are auctions** (have `auction_flag = 1`)
- **~60% are buy-now** (have `auction_flag = 0`)
- Items span 5 categories: Electronics, Books, Fashion, Home, Toys

### Sample Categories
- Electronics
- Books
- Fashion
- Home
- Toys

## Development Notes

- All test accounts have pre-populated data for testing
- Authentication uses username/password (plain text for demo)
- Users can be both buyers and sellers (dual role)
- Payment methods are pre-configured for all users in `src/data/mock-payment_methods.json`
- Mock cards provide deterministic payment success/failure scenarios
- Mock cards may need to be seeded into the database separately (check `src/db/mutations.ts`)

## Related Documentation

- [Database Schema](./database.md)
- [Technical Implementation](./technical-implementation.md)
- [Data Generation](./data.md)
- [Feature Scope](./feature-scope.md)