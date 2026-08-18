# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Auction Data Generator

Generates mock data for the auction app using faker
- Uses @example.com domain for all emails
- Uses simple, easy-to-remember passwords
- Maintains perfect schema mappings with camelCase (matches Drizzle schema)
- Deterministic with seed support
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any
from faker import Faker

# Configuration
SEED = 42  # For deterministic generation
OUTPUT_DIR = Path(__file__).parent

# Counts
NUM_CATEGORIES = 12  # Increased from 5 to 12 categories
NUM_USERS = 35  # Users can be both buyers and sellers
NUM_ITEMS = 250  # Increased from 100 to 250 items
NUM_PAYMENT_METHODS_PER_USER = 2  # Average number of cards per user

# Simple passwords for easy testing - all users use these passwords
SIMPLE_PASSWORDS = [
    'password123',
    'qwerty123',
    'welcome123',
    'letmein123',
    'test123',
    'admin123',
    'user123',
    'demo123',
    'auction123',
    'bid123',
]

# Initialize Faker with seed
fake = Faker()
Faker.seed(SEED)
random.seed(SEED)


def format_datetime(dt: datetime) -> str:
    """Format datetime to SQLite format: YYYY-MM-DD HH:MM:SS.fff"""
    return dt.strftime('%Y-%m-%d %H:%M:%f')


def generate_categories() -> List[Dict[str, Any]]:
    """Generate Categories - Expanded to 12 categories"""
    categories_data = [
        {'code': 'electronics', 'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
        {'code': 'books', 'name': 'Books', 'description': 'Books, magazines, and reading materials'},
        {'code': 'fashion', 'name': 'Fashion', 'description': 'Clothing, accessories, and fashion items'},
        {'code': 'home', 'name': 'Home', 'description': 'Home decor, furniture, and household items'},
        {'code': 'toys', 'name': 'Toys', 'description': 'Toys, games, and children\'s items'},
        {'code': 'sports', 'name': 'Sports & Outdoors', 'description': 'Sports equipment, outdoor gear, and fitness items'},
        {'code': 'automotive', 'name': 'Automotive', 'description': 'Car parts, accessories, and automotive supplies'},
        {'code': 'collectibles', 'name': 'Collectibles', 'description': 'Rare items, antiques, and collectible memorabilia'},
        {'code': 'art', 'name': 'Art & Crafts', 'description': 'Artwork, craft supplies, and handmade items'},
        {'code': 'jewelry', 'name': 'Jewelry & Watches', 'description': 'Fine jewelry, watches, and accessories'},
        {'code': 'music', 'name': 'Music & Instruments', 'description': 'Musical instruments, records, and audio equipment'},
        {'code': 'health', 'name': 'Health & Beauty', 'description': 'Health products, beauty items, and personal care'},
    ]
    
    categories = []
    for idx, cat in enumerate(categories_data, start=1):
        categories.append({
            'id': idx,
            'code': cat['code'],
            'name': cat['name'],
            'description': cat['description'],
            'createdAt': format_datetime(fake.date_time_between(start_date='-1y', end_date='now')),
        })
    
    return categories


def generate_users() -> List[Dict[str, Any]]:
    """Generate Users - Users can be both buyers and sellers, uses @example.com domain"""
    users = []
    
    for i in range(NUM_USERS):
        first_name = fake.first_name()
        last_name = fake.last_name()
        username = fake.user_name().lower()
        
        # Some users are sellers (have seller stats)
        # ~60% chance of being a seller
        is_seller = fake.boolean(chance_of_getting_true=60)
        
        # Assign a simple password from the list (deterministic based on index)
        password = SIMPLE_PASSWORDS[i % len(SIMPLE_PASSWORDS)]
        
        user = {
            'id': i + 1,  # INTEGER ID
            'username': username,
            'email': f'{username}@example.com',
            'name': f'{first_name} {last_name}',
            'password': password,  # Simple password for easy testing
            'sellerRating': round(random.uniform(3.0, 5.0), 2) if is_seller else 0.0,
            'totalSales': fake.random_int(min=0, max=500) if is_seller else 0,
            'totalItemsListed': fake.random_int(min=0, max=100) if is_seller else 0,
            'createdAt': format_datetime(fake.date_time_between(start_date='-2y', end_date='now')),
            'updatedAt': format_datetime(fake.date_time_between(start_date='-30d', end_date='now')),
        }
        
        users.append(user)
    
    return users


def generate_items(categories: List[Dict], users: List[Dict]) -> List[Dict[str, Any]]:
    """Generate Items - Mix of auction and buy-now items"""
    items = []
    category_names = [
        'Electronics', 'Books', 'Fashion', 'Home', 'Toys',
        'Sports & Outdoors', 'Automotive', 'Collectibles', 'Art & Crafts',
        'Jewelry & Watches', 'Music & Instruments', 'Health & Beauty'
    ]
    
    # Category-specific price ranges
    price_ranges = {
        'Electronics': (29.99, 1299.99),
        'Books': (5.99, 49.99),
        'Fashion': (14.99, 199.99),
        'Home': (19.99, 499.99),
        'Toys': (9.99, 149.99),
        'Sports & Outdoors': (24.99, 599.99),
        'Automotive': (19.99, 799.99),
        'Collectibles': (15.99, 2999.99),
        'Art & Crafts': (9.99, 499.99),
        'Jewelry & Watches': (29.99, 4999.99),
        'Music & Instruments': (49.99, 1999.99),
        'Health & Beauty': (8.99, 199.99),
    }
    
    # Category-specific title generators
    def generate_electronics_title():
        return f'{fake.word().title()} {fake.word().title()} {fake.word().title()}'
    
    def generate_book_title():
        return f'{fake.sentence(nb_words=3).title().rstrip(".")} by {fake.name()}'
    
    def generate_fashion_title():
        return f'{fake.word().title()} {fake.word().title()} - {fake.color_name().title()}'
    
    def generate_home_title():
        return f'{fake.word().title()} {fake.word().title()} for {fake.word().title()}'
    
    def generate_toy_title():
        return f'{fake.word().title()} {fake.word().title()} - {fake.word().title()}'
    
    def generate_sports_title():
        return f'{fake.word().title()} {fake.word().title()} {fake.word().title()}'
    
    def generate_automotive_title():
        return f'{fake.word().title()} {fake.word().title()} for {fake.word().title()}'
    
    def generate_collectibles_title():
        return f'Vintage {fake.word().title()} {fake.word().title()}'
    
    def generate_art_title():
        return f'{fake.word().title()} {fake.word().title()} - {fake.color_name().title()}'
    
    def generate_jewelry_title():
        return f'{fake.word().title()} {fake.word().title()} {fake.word().title()}'
    
    def generate_music_title():
        return f'{fake.word().title()} {fake.word().title()} {fake.word().title()}'
    
    def generate_health_title():
        return f'{fake.word().title()} {fake.word().title()} - {fake.word().title()}'
    
    title_generators = {
        'Electronics': generate_electronics_title,
        'Books': generate_book_title,
        'Fashion': generate_fashion_title,
        'Home': generate_home_title,
        'Toys': generate_toy_title,
        'Sports & Outdoors': generate_sports_title,
        'Automotive': generate_automotive_title,
        'Collectibles': generate_collectibles_title,
        'Art & Crafts': generate_art_title,
        'Jewelry & Watches': generate_jewelry_title,
        'Music & Instruments': generate_music_title,
        'Health & Beauty': generate_health_title,
    }
    
    # Filter users that are sellers (have sellerRating > 0 or totalItemsListed > 0)
    seller_users = [u for u in users if u.get('sellerRating', 0) > 0 or u.get('totalItemsListed', 0) > 0]
    if not seller_users:
        # Fallback: use all users if none are sellers
        seller_users = users
    
    for i in range(NUM_ITEMS):
        category = fake.random_element(elements=categories)
        seller = fake.random_element(elements=seller_users)
        category_name = category_names[category['id'] - 1]
        
        # Generate title and description
        title_generator = title_generators.get(category_name, generate_electronics_title)
        title = title_generator()
        description = fake.text(max_nb_chars=200)
        
        # Generate price based on category
        price_min, price_max = price_ranges.get(category_name, (10.0, 100.0))
        base_price = round(random.uniform(price_min, price_max), 2)
        
        # 40% chance of being an auction
        is_auction = fake.boolean(chance_of_getting_true=40)
        
        # Generate image URL
        image_id = (i + 1) % 100  # Cycle through 100 different images
        image_url = f'https://example.com/images/item-{image_id}.jpg'
        
        item = {
            'id': i + 1,  # INTEGER ID
            'title': title,
            'description': description,
            'categoryId': category['id'],  # INTEGER
            'sellerId': seller['id'],  # INTEGER
            'price': base_price,
            'auctionFlag': 1 if is_auction else 0,
            'status': 'active',
            'quantity': fake.random_int(min=1, max=10),
            'bidCount': 0,  # Will be set after bids are generated
            'imageUrl': image_url,
            'createdAt': format_datetime(fake.date_time_between(start_date='-6m', end_date='now')),
            'updatedAt': format_datetime(fake.date_time_between(start_date='-7d', end_date='now')),
        }
        
        if is_auction:
            # Auction-specific fields
            days_from_now = fake.random_int(min=1, max=14)
            end_time = datetime.now() + timedelta(days=days_from_now)
            
            item['startingBid'] = round(base_price * 0.7, 2)
            item['currentBid'] = round(base_price * 0.7, 2)  # Will be updated after bids are generated
            item['bidIncrement'] = round(random.uniform(1.0, 5.0), 2)
            item['endTime'] = int(end_time.timestamp())  # Unix timestamp
        
        items.append(item)
    
    return items


def generate_user_payment_methods(users: List[Dict]) -> List[Dict[str, Any]]:
    """Generate Payment Methods for Users"""
    payment_methods = []
    pm_id = 1
    
    for user in users:
        # Generate 0-3 cards per user
        num_cards = fake.random_int(min=0, max=3)
        
        for i in range(num_cards):
            is_default = (i == 0) # First card is default
            
            pm = {
                'id': pm_id,
                'userId': user['id'],
                'cardType': fake.credit_card_provider(),
                'cardNumber': fake.credit_card_number(),
                'expiry': fake.credit_card_expire(),
                'cardHolderName': user['name'].upper(),
                'isDefault': is_default,
                'createdAt': format_datetime(fake.date_time_between(start_date='-1y', end_date='now')),
            }
            payment_methods.append(pm)
            pm_id += 1
            
    return payment_methods


def generate_addresses(users: List[Dict]) -> List[Dict[str, Any]]:
    """Generate Addresses for Users"""
    addresses = []
    addr_id = 1
    
    for user in users:
        # Generate 1-2 addresses per user
        num_addrs = fake.random_int(min=1, max=2)
        
        for i in range(num_addrs):
            is_default = (i == 0) # First address is default
            
            addr = {
                'id': addr_id,
                'userId': user['id'],
                'street': fake.street_address(),
                'city': fake.city(),
                'state': fake.state_abbr(),
                'zipCode': fake.zipcode(),
                'country': 'USA', # Keep it simple for now
                'isDefault': is_default,
                'createdAt': format_datetime(fake.date_time_between(start_date='-1y', end_date='now')),
            }
            addresses.append(addr)
            addr_id += 1
            
    return addresses


def generate_bids(items: List[Dict], users: List[Dict]) -> List[Dict[str, Any]]:
    """Generate bids for auction items with proper coverage"""
    bids = []
    bid_id = 1
    base_time = int(datetime.now().timestamp())
    
    # Filter auction items only
    auction_items = [item for item in items if item.get('auctionFlag') == 1]
    
    for item in auction_items:
        item_id = item['id']
        starting_bid = item.get('startingBid', item.get('price', 0))
        current_bid = item.get('currentBid', starting_bid)
        end_time = item.get('endTime', base_time + 604800)
        seller_id = item.get('sellerId')
        bid_increment = item.get('bidIncrement', 1.0)
        
        # Get available bidders (all users except seller)
        available_bidders = [u['id'] for u in users if u['id'] != seller_id]
        
        if not available_bidders:
            continue
        
        # Generate 3-8 bids per auction item
        num_bids = fake.random_int(min=3, max=8)
        
        # Select random bidders (can have duplicates for multiple bids)
        selected_bidders = [fake.random_element(elements=available_bidders) for _ in range(num_bids)]
        
        # Create bids with increasing amounts
        bid_amount = starting_bid
        bid_times = []
        for i in range(num_bids):
            # Bid time progresses from start to end
            time_offset = int((end_time - base_time) * (i / num_bids))
            bid_time = base_time + time_offset
            bid_times.append(bid_time)
        
        # Sort by time to ensure chronological order
        bid_times.sort()
        
        for i, (bidder_id, bid_time) in enumerate(zip(selected_bidders, bid_times)):
            # Increment bid amount
            if i > 0:
                bid_amount = round(bid_amount + bid_increment + random.uniform(0, bid_increment * 2), 2)
            
            # Ensure bid doesn't exceed current_bid if set
            if current_bid and bid_amount > current_bid:
                bid_amount = current_bid
            
            # Determine if this is winning bid (last/highest bid)
            is_winning = (i == num_bids - 1)
            outcome = 'pending' if is_winning else 'outbid'
            
            bid = {
                'id': bid_id,
                'sessionId': None,  # Can be set later
                'itemId': item_id,
                'userId': bidder_id,
                'bidAmount': round(bid_amount, 2),
                'isWinning': 1 if is_winning else 0,
                'outcome': outcome,
                'bidTime': bid_time,
                'deterministicSeed': None,  # Can be set later for deterministic outcomes
                'createdAt': format_datetime(datetime.fromtimestamp(bid_time)),
            }
            
            bids.append(bid)
            bid_id += 1
    
    # Ensure only one winning bid per item
    bids_by_item = {}
    for bid in bids:
        item_id = bid['itemId']
        if item_id not in bids_by_item:
            bids_by_item[item_id] = []
        bids_by_item[item_id].append(bid)
    
    # Fix winning bids - only highest should be winning
    final_bids = []
    for item_id, item_bids in bids_by_item.items():
        # Sort by amount descending, then by time
        sorted_bids = sorted(item_bids, key=lambda b: (-b['bidAmount'], -b['bidTime']))
        
        for i, bid in enumerate(sorted_bids):
            bid['isWinning'] = 1 if i == 0 else 0
            bid['outcome'] = 'pending' if i == 0 else 'outbid'
            final_bids.append(bid)
    
    # Update item bidCount
    for item in items:
        if item.get('auctionFlag') == 1:
            item_bids = [b for b in final_bids if b['itemId'] == item['id']]
            item['bidCount'] = len(item_bids)
            if item_bids:
                # Update currentBid to highest bid
                highest_bid = max(item_bids, key=lambda b: b['bidAmount'])
                item['currentBid'] = highest_bid['bidAmount']
    
    # Sort by ID for consistency
    final_bids.sort(key=lambda b: b['id'])
    
    return final_bids


def generate_transactions(items: List[Dict], users: List[Dict], bids: List[Dict]) -> List[Dict[str, Any]]:
    """Generate transactions with proper dependencies"""
    transactions = []
    transaction_id = 1
    base_time = int(datetime.now().timestamp())
    
    # Separate auction and buy-now items
    auction_items = [item for item in items if item.get('auctionFlag') == 1]
    buy_now_items = [item for item in items if item.get('auctionFlag') == 0]
    
    # Generate purchase transactions for buy-now items
    # ~30% of buy-now items are purchased
    num_purchases = int(len(buy_now_items) * 0.3)
    if num_purchases > 0:
        purchased_items = fake.random_elements(elements=buy_now_items, length=num_purchases, unique=True)
    else:
        purchased_items = []
    
    for item in purchased_items:
        item_id = item['id']
        seller_id = item.get('sellerId')
        
        # Get available buyers (all users except seller)
        available_buyers = [u['id'] for u in users if u['id'] != seller_id]
        if not available_buyers:
            continue
        
        buyer_id = fake.random_element(elements=available_buyers)
        max_quantity = min(item.get('quantity', 1), 3)
        quantity = fake.random_int(min=1, max=max_quantity)
        amount = round(item.get('price', 0) * quantity, 2)
        
        # Transaction date in the past
        transaction_date = fake.date_time_between(start_date='-3m', end_date='now')
        
        transaction = {
            'id': transaction_id,
            'sessionId': None,  # Can be set later
            'transactionType': 'purchase',
            'itemId': item_id,
            'userId': buyer_id,
            'sellerId': seller_id,
            'bidId': None,
            'amount': amount,
            'quantity': quantity,
            'status': 'completed',
            'paymentStatus': 'success',
            'paymentMethod': 'credit_card',
            'paymentCardNumber': fake.credit_card_number()[-4:],  # Last 4 digits
            'failureReason': None,
            'refundAmount': 0,
            'refundedAt': None,
            'transactionDate': format_datetime(transaction_date),
            'createdAt': format_datetime(transaction_date),
            'metadata': None,
        }
        
        transactions.append(transaction)
        transaction_id += 1
        
        # Update item quantity and status if sold out
        item['quantity'] = max(0, item.get('quantity', 1) - quantity)
        if item.get('quantity', 0) == 0:
            item['status'] = 'sold'
    
    # Skip listing transactions - listings are free, no transaction needed
    
    # Generate bid_win transactions for some auction items (items that ended and were won)
    # Get winning bids
    winning_bids = [b for b in bids if b.get('isWinning') == 1]
    
    # ~20% of winning bids result in completed purchases
    num_wins = int(len(winning_bids) * 0.2)
    if num_wins > 0:
        completed_wins = fake.random_elements(elements=winning_bids, length=num_wins, unique=True)
    else:
        completed_wins = []
    
    for bid in completed_wins:
        item_id = bid['itemId']
        item = next((i for i in auction_items if i['id'] == item_id), None)
        if not item:
            continue
        
        seller_id = item.get('sellerId')
        buyer_id = bid.get('userId')
        amount = bid.get('bidAmount', 0)
        
        # Transaction date after bid time
        bid_time = bid.get('bidTime', base_time)
        transaction_date = datetime.fromtimestamp(bid_time) + timedelta(hours=1)
        
        transaction = {
            'id': transaction_id,
            'sessionId': None,
            'transactionType': 'bid_win',
            'itemId': item_id,
            'userId': buyer_id,
            'sellerId': seller_id,
            'bidId': bid['id'],
            'amount': amount,
            'quantity': 1,
            'status': 'completed',
            'paymentStatus': 'success',
            'paymentMethod': 'credit_card',
            'paymentCardNumber': fake.credit_card_number()[-4:],
            'failureReason': None,
            'refundAmount': 0,
            'refundedAt': None,
            'transactionDate': format_datetime(transaction_date),
            'createdAt': format_datetime(transaction_date),
            'metadata': None,
        }
        
        transactions.append(transaction)
        transaction_id += 1
        
        # Update item status
        item['status'] = 'sold'
        item['quantity'] = 0
    
    # Sort by ID for consistency
    transactions.sort(key=lambda t: t['id'])
    
    return transactions


def generate_all_data():
    """Main generation function"""
    print('🚀 Starting auction data generation...')
    print(f'📊 Seed: {SEED}')
    
    # Generate data
    print('📦 Generating categories...')
    categories = generate_categories()
    
    print('🤖 Generating users (includes sellers)...')
    users = generate_users()
    
    print('🛍️  Generating items...')
    items = generate_items(categories, users)
    
    print('💳 Generating user payment methods...')
    payment_methods = generate_user_payment_methods(users)
    
    print('🏠 Generating user addresses...')
    addresses = generate_addresses(users)
    
    print('🎯 Generating bids for auction items...')
    bids = generate_bids(items, users)
    
    print('💰 Generating transactions...')
    transactions = generate_transactions(items, users, bids)
    
    # Write to JSON files
    print('💾 Writing data to files...')
    
    with open(OUTPUT_DIR / 'mock-categories.json', 'w') as f:
        json.dump(categories, f, indent=2)
    
    with open(OUTPUT_DIR / 'mock-users.json', 'w') as f:
        json.dump(users, f, indent=2)
    
    with open(OUTPUT_DIR / 'mock-items.json', 'w') as f:
        json.dump(items, f, indent=2)
    
    with open(OUTPUT_DIR / 'mock-payment_methods.json', 'w') as f:
        json.dump(payment_methods, f, indent=2)
        
    with open(OUTPUT_DIR / 'mock-addresses.json', 'w') as f:
        json.dump(addresses, f, indent=2)
    
    with open(OUTPUT_DIR / 'mock-bids.json', 'w') as f:
        json.dump(bids, f, indent=2)
    
    with open(OUTPUT_DIR / 'mock-transactions.json', 'w') as f:
        json.dump(transactions, f, indent=2)
    
    # Count sellers (users with seller stats)
    sellers_count = len([u for u in users if u.get('sellerRating', 0) > 0 or u.get('totalItemsListed', 0) > 0])
    
    # Generate summary
    summary = {
        'generatedAt': datetime.now().isoformat(),
        'seed': SEED,
        'counts': {
            'categories': len(categories),
            'users': len(users),
            'sellers': sellers_count,  # Users that are sellers
            'items': len(items),
            'auctionItems': len([i for i in items if i['auctionFlag'] == 1]),
            'buyNowItems': len([i for i in items if i['auctionFlag'] == 0]),
            'paymentMethods': len(payment_methods),
            'addresses': len(addresses),
            'bids': len(bids),
            'winningBids': len([b for b in bids if b.get('isWinning') == 1]),
            'transactions': len(transactions),
            'purchases': len([t for t in transactions if t.get('transactionType') == 'purchase']),
            'bidWins': len([t for t in transactions if t.get('transactionType') == 'bid_win']),
        },
        'files': [
            'mock-categories.json',
            'mock-users.json',
            'mock-items.json',
            'mock-payment_methods.json',
            'mock-addresses.json',
            'mock-bids.json',
            'mock-transactions.json',
        ],
    }
    
    with open(OUTPUT_DIR / 'summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print('✅ Data generation complete!')
    print('\n📊 Summary:')
    print(f'   Categories: {summary["counts"]["categories"]}')
    print(f'   Users: {summary["counts"]["users"]} (including {summary["counts"]["sellers"]} sellers)')
    print(f'   Items: {summary["counts"]["items"]}')
    print(f'   - Auction items: {summary["counts"]["auctionItems"]}')
    print(f'   - Buy-now items: {summary["counts"]["buyNowItems"]}')
    print(f'   Payment Methods: {summary["counts"]["paymentMethods"]}')
    print(f'   Addresses: {summary["counts"]["addresses"]}')
    print(f'   Bids: {summary["counts"]["bids"]} (including {summary["counts"]["winningBids"]} winning bids)')
    print(f'   Transactions: {summary["counts"]["transactions"]}')
    print(f'   - Purchases: {summary["counts"]["purchases"]}')
    print(f'   - Bid Wins: {summary["counts"]["bidWins"]}')
    print(f'\n📁 Files saved to: {OUTPUT_DIR}')


if __name__ == '__main__':
    generate_all_data()

