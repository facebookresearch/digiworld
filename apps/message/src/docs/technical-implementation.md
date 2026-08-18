<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Message App Technical Implementation & Non-Functional Requirements

## Architecture & Data Management
- **React Native + Expo Router**: Modern navigation with file-based routing system
- **MobX State Tree**: Centralized state management with observable stores (UserStore, SessionStore, UIStore)
- **SQLite Database**: Local database managed via Drizzle ORM for all persistent data
- **Database-Driven Contacts**: Contact discovery and selection use in-app database users instead of device contact syncing
- **Modular Architecture**: Feature-based folder structure with clear separation of concerns

## Database Schema & Data Models
- **Users**: Phone number-based authentication, profile management, avatar support
- **Messages**: Individual and group messaging with delivery/read status tracking
- **Groups**: Multi-user chat groups with member management
- **Attachments**: File sharing support with preview generation
- **Call History**: Voice/video call tracking with duration and status
- **Chat Settings**: User preferences for fonts, wallpapers, notifications
- **App State**: Session persistence and navigation state management

## State Management Architecture
- **RootStore**: Central store orchestrator managing all sub-stores
- **UserStore**: Authentication, user data, contact selection, group-member filtering, chat settings
- **SessionStore**: Session management and persistence
- **UIStore**: UI state and loading indicators
- **MobX Integration**: Reactive state updates with observable patterns

## Performance & Scalability
- **FlashList**: High-performance list rendering for chat conversations
- **React Native Reanimated**: Smooth animations and transitions
- **Lazy Loading**: Efficient message loading with pagination
- **Memory Management**: Proper cleanup of message attachments and media
- **Database Optimization**: Indexed queries and efficient data relationships

## Security & Privacy
- **Phone Number Authentication**: OTP-based verification system
- **Secure Storage**: MMKV for sensitive data encryption
- **Local Data**: All messages stored locally on device
- **Privacy Controls**: User-controlled data sharing and visibility
- **Audit Logging**: User actions tracked for support and debugging

## Offline Support & Data Persistence
- **Local Database**: Full offline functionality for all messaging features
- **Data Migration**: Automated database schema updates via Drizzle
- **State Persistence**: App state maintained across sessions
- **File Management**: Local storage for attachments and media
- **Sync Capabilities**: Ready for future online synchronization

## UI/UX & Accessibility
- **Responsive Design**: Optimized for mobile devices with gesture support
- **Dark Theme Support**: Customizable color schemes and themes
- **Accessibility**: Screen reader support and scalable text
- **Smooth Navigation**: Animated transitions between screens
- **Custom Components**: Tailored message bubbles and attachment handling
- **Unified Contact Picker**: Shared database-backed contact list for direct chat entry and group member selection

## File & Media Handling
- **Document Picker**: Support for various file types
- **Image Processing**: Camera integration with image picker
- **File Compression**: Efficient storage and transfer
- **Preview Generation**: Thumbnail creation for attachments
- **QR Code Support**: Built-in QR code generation and scanning

## Testing & Quality Assurance
- **Jest Testing**: Unit and integration test coverage
- **React Native Testing Library**: Component testing utilities
- **Database Testing**: In-memory database for test isolation
- **Linting & Formatting**: ESLint and Prettier enforcement
- **Type Safety**: Full TypeScript implementation

## Development & Debugging
- **Reactotron**: Advanced debugging and state inspection
- **Drizzle Studio**: Database visualization and management
- **Hot Reloading**: Fast development iteration
- **Error Boundaries**: Graceful error handling and reporting
- **Performance Monitoring**: Built-in performance tracking

## Deployment & Build System
- **Expo Build**: Managed and custom builds supported
- **CI/CD Pipeline**: Automated testing and deployment
- **Environment Management**: Development, staging, and production configs
- **Dependency Management**: Automated updates and security audits
- **Platform Support**: iOS, Android, and Web deployment

## Key Dependencies & Technologies
- **React Native 0.76.9**: Core framework
- **Expo SDK 52**: Development platform
- **Drizzle ORM**: Database management
- **MobX State Tree**: State management
- **React Navigation 7**: Navigation system
- **Expo Router 4**: File-based routing

## Best Practices & References
- See [`database.md`](database.md) for schema and migration details
- See [`performance.md`](performance.md) for performance metrics and optimization
- Follow React Native and Expo best practices for performance and security
- Implement proper error boundaries and loading states
- Use TypeScript for type safety and better developer experience
