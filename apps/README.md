<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Mock Applications

16 React Native Android applications spanning multiple domains, each designed for offline-first operation and serving as environments for AI agent evaluation within [DigiWorld](../README.md).

For the benchmark framework (scenarios, CLI, Python API), see the
[root README](../README.md). For running an agent against these apps and scoring
tasks, see the [evaluation harness](../digiworld_eval/README.md).

---

## Applications

### Communication & Social
- **Email**: Modern, secure email client with full offline support
- **Message**: Real-time chat and messaging with contacts and groups

### Financial Services
- **Payment**: Payment processing, methods, and transaction history
- **Banking**: Complete banking solution with accounts, transfers, and bill payments

### E-commerce & Shopping
- **Ecommerce**: Traditional online shopping with cart and checkout
- **Qwikshop**: Discovery-first shopping experience with modern UI
- **Auction**: eBay-like marketplace with bidding and deterministic outcomes

### Entertainment
- **Music**: Music streaming with playlists and recommendations
- **Video**: Video streaming platform with uploads and social features

### On-Demand Services
- **Eats**: Food delivery with restaurant discovery and ordering
- **Ryde**: Ride-sharing and transportation booking platform

### Travel & Transportation
- **Flight Booking**: Flight search, booking, and reservation management
- **Transit**: Public transportation planning and real-time navigation

### Smart Living
- **Smart Home**: Home automation and IoT device control
- **Parking**: Parking space finder with reservations and payments

---

## Shared Packages

- **shared-theme**: Common UI components and theming.
- **shared-interaction-tracking**: Analytics, hooks, and utilities.
- **shared-asset-management**: Asset handling and management.

---

## Installation & Setup

### React Native Setup

Follow the official [React Native Environment Setup Guide](https://reactnative.dev/docs/set-up-your-environment).

Additional custom guide (if required):
[Google Doc: Custom Setup Guide](https://docs.google.com/document/d/1g_Nabe_oH2L8csd_OgaLRB7bBY-eoJV8Y6Giwjvv0iU/edit?tab=t.0#heading=h.6swp50tiv4m7)

#### Monorepo Setup

```bash
git clone <repository-url>
cd andojo-monorepo
yarn install
```

#### Python API Setup

See the [Installation and Usage Guide (Google Doc)](https://docs.google.com/document/d/1g_Nabe_oH2L8csd_OgaLRB7bBY-eoJV8Y6Giwjvv0iU/edit?tab=t.d2hszsa9c5f) for details.

Alternatively, you can find the same content in the codebase at:
[digiworld/docs/api/python_api_installation_and_usage.md](../digiworld/docs/api/python_api_installation_and_usage.md)

---

## Running Applications

### Debug Mode

From the repository root:

```bash
yarn android:ecommerce
yarn android:qwikshop
yarn android:bank
yarn android:payment
yarn android:email
yarn android:message
yarn android:music
yarn android:eats
yarn android:ryde
```

### Release Mode

```bash
yarn release:ecommerce
yarn release:qwikshop
yarn release:bank
yarn release:payment
yarn release:email
yarn release:message
yarn release:music
yarn release:eats
yarn release:ryde
```

---

## Common Commands

```bash
yarn lint                # Lint code
yarn format              # Format code
yarn clean:android       # Clean Android build
yarn clean:node_modules  # Clean all node_modules
yarn prebuild:all        # Prebuild all apps for Android
```

---

## CI/CD & Release

- **GitHub Actions** automates builds and releases.
- **Tag-based release**: Push a tag like `v1.2.3` to trigger a release.
- **Branch-based builds**: Branch naming conventions trigger single/multi-app builds.
- See `../.github/workflows/monorepo-release.yml` and `../docs/ci-cd-workflow.md` for details.

---

## Testing

- `yarn test` for JS/TS apps.
- `yarn python:test` for Python API.

---

## Troubleshooting

- **Gradle/Android issues**: Clean builds with `yarn clean:android`.
- **Windows**: Use Yarn 2+, enable long paths.
- **Python**: Ensure ADB is in PATH, use virtualenv.

---

## Application Documentation Index

Below are documentation entry points for each app. Each app's README provides links to its database schema documentation and feature scope (implemented features, user stories, and acceptance criteria).

### Email App
- [Email App Documentation](./email/README.md)
  - [Database Schema](./email/src/docs/database.md)
  - [Technical Implementation](./email/src/docs/technical-implementation.md)
  - [Feature Scope](./email/src/docs/feature-scope.md)
  - [Test Credentials](./email/src/docs/credentials.md)

### Payment App
- [Payment App Documentation](./payment/README.md)
  - [Database Schema](./payment/src/docs/database.md)
  - [Technical Implementation](./payment/src/docs/technical-implementation.md)
  - [Feature Scope](./payment/src/docs/feature-scope.md)
  - [Test Credentials](./payment/src/docs/credentials.md)

### Ecommerce App
- [Ecommerce App Documentation](./ecommerce/README.md)
  - [Database Schema](./ecommerce/docs/database.md)
  - [Feature Scope](./ecommerce/docs/feature_scope_ecommerce.md)
  - [Test Credentials](./ecommerce/docs/credentials.md)

### Music App
- [Music App Documentation](./music/README.md)
  - [Database Schema](./music/docs/database.md)
  - [Technical Implementation](./music/docs/technical-implementation.md)
  - [Feature Scope](./music/docs/music-feature-scope.md)
  - [Test Credentials](./music/docs/credentials.md)

### Eats App
- [Eats App Documentation](./eats/README.md)
  - [Database Schema](./eats/src/docs/database.md)
  - [Technical Implementation](./eats/src/docs/technical-implementation.md)
  - [Feature Scope](./eats/src/docs/feature-scope.md)
  - [Test Credentials](./eats/src/docs/credentials.md)

### Ryde App
- [Ryde App Documentation](./ryde/README.md)
  - [Database Schema](./ryde/src/docs/database.md)
  - [Technical Implementation](./ryde/src/docs/technical-implementation.md)
  - [Feature Scope](./ryde/src/docs/feature-scope.md)
  - [Test Credentials](./ryde/src/docs/credentials.md)

### Video App
- [Video App Documentation](./video/README.md)
  - [Database Schema](./video/src/docs/database.md)
  - [Technical Implementation](./video/src/docs/technical-implementation.md)
  - [Feature Scope](./video/src/docs/feature-scope.md)
  - [Test Credentials](./video/src/docs/credentials.md)

### Message App
- [Message App Documentation](./message/README.md)
  - [Database Schema](./message/src/docs/database.md)
  - [Technical Implementation](./message/src/docs/technical-implementation.md)
  - [Feature Scope](./message/src/docs/feature-scope.md)
  - [Test Credentials](./message/src/docs/credentials.md)

### Smart Home App
- [Smart Home App Documentation](./smarthome/README.md)
  - [Database Schema](./smarthome/src/docs/database.md)
  - [Technical Implementation](./smarthome/src/docs/technical-implementation.md)
  - [Feature Scope](./smarthome/src/docs/feature-scope-smarthome.md)
  - [Data Generation](./smarthome/src/docs/data.md)
  - [Test Credentials](./smarthome/src/docs/credentials.md)

### Flight Booking App
- [Flight Booking App Documentation](./flightbooking/README.md)
  - [Database Schema](./flightbooking/src/docs/database.md)
  - [Technical Implementation](./flightbooking/src/docs/technical-implementation.md)
  - [Feature Scope](./flightbooking/src/docs/feature-scope-airfly.md)
  - [Data Generation](./flightbooking/src/docs/data.md)
  - [Test Credentials](./flightbooking/src/docs/credentials.md)

### Banking App
- [Banking App Documentation](./banking/README.md)
  - [Database Schema](./banking/src/docs/database.md)
  - [Technical Implementation](./banking/src/docs/technical-implementation.md)
  - [Feature Scope](./banking/src/docs/feature-scope.md)
  - [Test Cases Report](./banking/src/docs/test-cases-report.md)
  - [Test Credentials](./banking/src/docs/credentials.md)

### Qwikshop App
- [Qwikshop App Documentation](./qwikshop/README.md)
  - [Database Schema](./qwikshop/docs/database.md)
  - [Feature Scope](./qwikshop/docs/feature_scope_qwikshop.md)
  - [Test Credentials](./qwikshop/docs/credentials.md)

### Auction App
- [Auction App Documentation](./auction/README.md)
  - [Database Schema](./auction/src/docs/database.md)
  - [Technical Implementation](./auction/src/docs/technical-implementation.md)
  - [Data Generation](./auction/src/docs/data.md)
  - [Feature Scope](./auction/src/docs/feature-scope.md)
  - [Test Cases Report](./auction/src/docs/test-cases-report.md)
  - [Test Credentials](./auction/src/docs/credentials.md)

### Parking App
- [Parking App Documentation](./parking/README.md)
  - [Database Schema](./parking/src/docs/database.md)
  - [Technical Implementation](./parking/src/docs/technical-implementation.md)
  - [Feature Scope](./parking/src/docs/feature-scope.md)
  - [Test Cases Report](./parking/src/docs/test-cases-report.md)
  - [Test Credentials](./parking/src/docs/credentials.md)

### Transit App
- [Transit App Documentation](./transit/README.md)
  - [Feature Scope](./transit/src/docs/feature-scope.md)

### Stock Trading App
- [Stock Trading App Documentation](./stocktrading/README.md)
  - [Feature Scope](./stocktrading/docs/feature-scope.md)

---

## Credentials

Direct links to credentials documentation for each app:

- [Email App Credentials](./email/src/docs/credentials.md)
- [Payment App Credentials](./payment/src/docs/credentials.md)
- [Ecommerce App Credentials](./ecommerce/docs/credentials.md)
- [Music App Credentials](./music/docs/credentials.md)
- [Eats App Credentials](./eats/src/docs/credentials.md)
- [Ryde App Credentials](./ryde/src/docs/credentials.md)
- [Video App Credentials](./video/src/docs/credentials.md)
- [Message App Credentials](./message/src/docs/credentials.md)
- [Smart Home App Credentials](./smarthome/src/docs/credentials.md)
- [Flight Booking App Credentials](./flightbooking/src/docs/credentials.md)
- [Banking App Credentials](./banking/src/docs/credentials.md)
- [Qwikshop App Credentials](./qwikshop/docs/credentials.md)
- [Auction App Credentials](./auction/src/docs/credentials.md)
- [Parking App Credentials](./parking/src/docs/credentials.md)

## Data Generation Pipeline

For details on generating mock and test data for the applications, see:

- [Data Generation Pipeline README](../digiworld/digiworld/pipeline/README.md)

---

## Asset Management & Git LFS

**Note:** Always run `yarn lfs:setup` from the repository root directory (where the main `package.json` is), not from within `digiworld`.

This repository uses [Git Large File Storage (LFS)](https://git-lfs.com) to efficiently manage large binary assets (such as media.zip files) in the Python automation layer. See:

- [Git LFS Setup Guide](../digiworld/docs/api/git_lfs_setup.md)
- [LFS Setup Script](../digiworld/setup_lfs.sh)

**To set up LFS and extract assets:**

```bash
yarn lfs:setup
```
