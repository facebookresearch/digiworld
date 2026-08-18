# Qwikshop App

## Overview
This is the Qwikshop application for the Andojo platform, designed for Android-based shopping in air-gapped environments. It provides a complete offline shopping experience with robust local data management, product catalog browsing, cart management, and order tracking. The app uses SQLite with Drizzle ORM for local data and MobX-State-Tree for state management.

## Features
- Product management: Browse catalogs, search products, view product details
- Shopping experience: Cart, wishlists, order tracking
- User management: Profiles, addresses, order history
- Streamlined checkout with multiple payment options
- Offline-first architecture
- Local data persistence
- Image caching and optimization
- Memory-efficient list handling
- Virtualized lists for large datasets
- Progressive image loading
- Background data syncing
- Robust error handling and optimistic UI updates

## Documentation
- **Feature Scope:** See [`docs/feature_scope_qwikshop.md`](docs/feature_scope_qwikshop.md) for detailed feature specifications and roadmap.
- **Database Schema & Data Flows:** See [`docs/database.md`](docs/database.md) for schema and data architecture.
- **Asset Management:** See [`docs/asset-management.md`](docs/asset-management.md) and [`docs/assets.md`](docs/assets.md) for asset guidelines.
- **Testing:** See [`docs/testing.md`](docs/testing.md) for testing documentation.

## Scripts
See [`package.json`](package.json) for available scripts for building, testing, and running the app. Common scripts include:


## Project Structure
```
qwikshop/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and business logic
│   ├── stores/         # MobX state stores
│   ├── theme/          # Styling and theming
│   └── utils/          # Helper functions
├── docs/               # Documentation
│   ├── setup_guide.md
│   ├── feature_scope_qwikshop.md
│   ├── database.md
│   ├── asset-management.md
│   └── assets.md
├── assets/
│   ├── icons/          # App icons
│   └── images/         # App images
└── test/               # Test files
```

## License
This project is private and intended for internal use within the Andojo platform.
