<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Andojo Music App

## Overview
This is the music application for the Andojo platform, designed for Android-based offline music playback in air-gapped environments. It provides a complete local music playback experience with playlist management and metadata support. The app uses SQLite with Drizzle ORM for robust local data management and MobX-State-Tree for state management.

## Features
- Library management: Browse and organize local music collection
- Search songs by title or artist
- Playlist creation and management
- Basic playback controls (play, pause, skip)
- Local audio file management
- Metadata extraction and album art handling
- Playback history and play count tracking
- Offline-first architecture
- Memory-efficient playlist handling
- Audio buffer and cache management
- Background task optimization

## Documentation
- **Feature Scope:** See [`music-feature-scope.md`](docs/music-feature-scope.md) for detailed feature specifications.
- **Database Schema & Data Flows:** See [`docs/database.md`](docs/database.md) for schema and data architecture.
- **Testing:** See [`src/__tests__/README.md`](src/__tests__/README.md) for testing documentation.

## Scripts
See [`package.json`](package.json) for available scripts for building, testing, and running the app. Common scripts include:

## Project Structure
```
music/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── services/       # Audio and business logic
│   ├── db/             # Database implementation
│   ├── stores/         # MobX state stores
│   └── utils/          # Helper functions
├── docs/               # Documentation
│   ├── setup_guide.md
│   ├── database.md
│   └── technical_implementation.md
├── assets/
│   ├── audio/          # Audio files
│   └── images/         # App images
└── test/               # Test files
```

## License
This project is private and intended for internal use within the Andojo platform.
