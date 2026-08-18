# 🎯 Andojo Auction

> A deterministic marketplace sandbox for AI agent research

[![Tests](https://img.shields.io/badge/tests-191%20passing-brightgreen)]() [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]() [![React Native](https://img.shields.io/badge/React%20Native-Expo-purple)]()

## 🎪 What is Andojo Auction?

Andojo Auction is a **fully offline, deterministic eBay-like marketplace** designed to evaluate how AI agents behave in e-commerce scenarios. Think of it as a controlled laboratory for studying agent decision-making in buying, selling, and bidding contexts.

### Why Build This?

We're exploring fundamental questions about AI agent behavior:
- Can agents effectively search and compare prices?
- How do they handle auction bidding strategies?
- Can they successfully list and sell items?
- How do they react to payment failures and refunds?
- What happens when inventory runs out?

All experiments run **completely offline** with **100% reproducible results** using deterministic seeds.

## ✨ Key Features

### 🛍️ Marketplace Fundamentals
- **Browse & Search** - Netflix-style horizontal scrolling with category rows
- **Item Details** - Rich product information with seller ratings
- **Dual Modes** - Both auction bidding and instant "Buy Now" options
- **Categories** - Electronics, Books, Fashion, Home, Toys

### 🎨 Beautiful UI
- **Liquid Glass Theme** - Stunning glassmorphic design with animated backgrounds
- **Smooth Animations** - Spring-based transitions and staggered reveals
- **Dark/Light Modes** - Seamless theme switching
- **Performance Optimized** - Pagination, memoization, and efficient rendering

### 🤖 AI Agent Ready
- **Deterministic Outcomes** - Same seed = same results every time
- **Mock Payments** - Predefined card success/failure scenarios
- **Session Management** - Track agent behavior across experiments
- **Transaction History** - Complete audit trail of all actions

### 🔬 Research Features
- **Offline First** - Zero external API calls, fully air-gapped
- **Seeded Randomness** - Reproducible experiments with seed control
- **Mock Data Generation** - Faker.js-powered realistic datasets
- **Comprehensive Testing** - 191 unit tests covering all scenarios

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Run tests
cd apps/auction
npm test

# Start the app
yarn start

# Build for iOS simulator
yarn build:ios:sim
```

## 📱 Screen Architecture

### Browse Screen
Netflix-style layout with horizontal FlatLists per category:
- Shows 8 items per category row
- "See All" button for categories with more items
- Real-time search with debouncing
- Smooth animations and glassmorphic effects

### Category Detail Screen
Infinite scroll with smart pagination:
- 2-column grid layout
- Loads 10 items per page
- Triggers at 80% scroll threshold
- "That's all Folks! 🎉" end message

### Item Detail Screen
Complete product information:
- High-quality images and descriptions
- Seller ratings and statistics
- Auction countdown timers
- Bid history and current price
- Buy Now or Place Bid actions

### Transaction Screens
- **My Bids** - Active and historical bids
- **Purchase History** - All completed transactions
- **Sell Items** - List new items for sale
- **Payment Cards** - Manage mock payment methods

## 🧪 Feature Scope

| Feature | Status | Description |
|---------|--------|-------------|
| **F1** Mock Data | ✅ | Deterministic item/seller generation |
| **F2** Sessions | ✅ | Reproducible agent experiments |
| **F3** Browse/Search | ✅ | Keyword and category filtering |
| **F4** Item Details | ✅ | Complete product information |
| **F5** Bidding | ✅ | Deterministic auction outcomes |
| **F6** Buy Now | ✅ | Instant purchase flow |
| **F7** Selling | ✅ | List items for sale |
| **F8** Transactions | ✅ | Complete transaction tracking |
| **F9** Payments | ✅ | Mock card processing |
| **F10** Refunds | ✅ | Cancellation and refund flow |
| **F11** Offline | ✅ | Air-gapped, deterministic |

## 🏗️ Technical Architecture

### Database Schema
SQLite with Drizzle ORM:
- **users** - Buyers and sellers with ratings
- **items** - Products with auction/buy-now modes
- **bids** - Auction bid history
- **transactions** - Purchase and sale records
- **payments** - Mock payment processing
- **inventory** - User-owned items
- **sessions** - Deterministic experiment tracking

### State Management
MobX-State-Tree stores:
- **AuctionStore** - Items, categories, bids
- **UserStore** - Authentication and profiles
- **UIStore** - Theme and navigation state

### Mock Data
Faker.js-powered generation:
- 20 sellers with realistic profiles
- 100 items across 5 categories
- 10 mock payment cards
- Deterministic with seed control

## 🧪 Testing

```bash
# Run all tests
npm test

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Suite:**
- 191 tests passing
- Unit tests for all features
- Integration tests for workflows
- Mock data helpers included

## 🎨 UI Components

### Glassmorphic Components
- **Glassmorphic** - Reusable blur container with variants
- **AnimatedBackground** - Gradient orbs with smooth animations
- **ItemCard** - Product cards with hover effects
- **CategoryRow** - Horizontal scrolling item lists

### Theme System
Comprehensive color tokens:
- Primary/secondary gradients
- Glass blur intensities
- Border and shadow styles
- Dark/light mode support

## 📊 Mock Payment Cards

Test different payment scenarios:

| Card Number | Result | Reason |
|-------------|--------|--------|
| 4242 4242 4242 4242 | ✅ Success | Always succeeds |
| 4000 0000 0000 0002 | ❌ Declined | Card declined |
| 4000 0000 0000 9995 | ❌ Failed | Insufficient funds |
| 4000 0000 0000 0069 | ❌ Failed | Expired card |
| 4000 0000 0000 0127 | ❌ Failed | Incorrect CVC |

## 🔬 Research Use Cases

### Agent Behavior Studies
- Price comparison strategies
- Bidding vs. buy-now decisions
- Seller reputation evaluation
- Inventory management
- Payment failure handling

### Experiment Reproducibility
```typescript
// Same seed = same results
const session = await initSession({
  agentId: 'agent-001',
  seed: 42,
})

// All outcomes deterministic
const bid = await placeBid(itemId, amount)
// Result always the same for this seed
```

## 📚 Documentation

### Core Documentation
- [Technical Implementation](src/docs/technical-implementation.md) - Detailed implementation guide for all features
- [Database Schema](src/docs/database.md) - Complete database schema documentation
- [Data Generation](src/docs/data.md) - Mock data generation process and structure
- [Feature Scope](src/docs/feature-scope.md) - Complete feature specifications
- [Test Credentials](src/docs/credentials.md) - Test user accounts and mock payment cards

### Additional Resources
- [Database Schema Code](src/db/schema.ts) - Full schema definitions (TypeScript)
- [Test Helpers](src/__tests__/helpers.ts) - Testing utilities
- [Browse Refactor](BROWSE_REFACTOR_COMPLETE.md) - Architecture details

## 🤝 Contributing

This is a research project for AI agent evaluation. Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

Part of the Andojo monorepo. See root LICENSE file.

## 🙏 Acknowledgments

Built with:
- [Expo](https://expo.dev) - React Native framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [MobX-State-Tree](https://mobx-state-tree.js.org) - State management
- [Faker.js](https://fakerjs.dev) - Mock data generation
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) - Animations

---

**Built for AI agent research** | **100% offline** | **Fully deterministic** | **191 tests passing**
