<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Eats App Technical Implementation & Non-Functional Requirements

## Architecture & Data Management
- Modular React Native/Expo codebase, feature-based folder structure.
- SQLite database managed via Drizzle ORM for all persistent data (users, orders, restaurants, addresses).
- Mock payment and order flows for MVP; ready for backend integration.

## Performance & Scalability
- Optimized list rendering for restaurant and menu browsing.
- Local caching for fast access and smooth UI.
- Offline map assets for efficient order tracking.

## Security & Privacy
- User authentication via phone and OTP.
- Secure storage for user credentials.
- Data validation and access controls enforced in app logic.

## Offline Support
- Full offline support via local SQLite and asset storage.
- Order history, browsing, and cart management available offline.
- Sync and backend integration planned for future.

## UI/UX & Accessibility
- Responsive and minimal UI for mobile.
- Accessible navigation and touch targets.
- Animated placeholders for loading states.

## Analytics & Monitoring
- User interaction and error tracking for future analytics.

## Testing & Quality
- Automated unit tests for core flows.
- Manual QA for new features.
- Linting and formatting enforced in CI.

## Deployment & Maintenance
- CI/CD pipeline for Expo builds.
- Database migrations managed via Drizzle ORM.
- Modular codebase for easy feature addition.

## Best Practices & References
- See [`database.md`](database.md) for schema and migration details.
- Follow React Native, Expo, and SQLite best practices for performance and security.
