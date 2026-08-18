# Video App Technical Implementation & Architecture

## Architecture Overview

### Application Structure
- **Framework:** React Native with Expo for cross-platform mobile development
- **State Management:** MobX State Tree for reactive state management
- **Navigation:** Expo Router for file-based routing and deep linking
- **Database:** SQLite with Drizzle ORM for local data persistence
- **UI Framework:** Custom theme system with shared components

### Project Organization
```
src/
├── app/                    # File-based routing screens
├── components/             # Reusable UI components
├── models/                 # MobX State Tree stores
├── db/                     # Database schema and operations
├── utils/                  # Utility functions and helpers
├── services/               # External service integrations
├── i18n/                   # Internationalization
└── docs/                   # Documentation
```

## State Management Architecture

### MobX State Tree Stores
The application uses a sophisticated store-based architecture where each store manages specific domain functionality:

- **RootStore:** Central store orchestrating all sub-stores and cross-store communication
- **VideoStore:** Video content, categories, recommendations, and playback state
- **UserStore:** User authentication, profile data, and user-specific content
- **PlaylistStore:** Playlist creation, management, and user playlist interactions
- **CommentStore:** Comments, replies, moderation, and comment UI state
- **SearchStore:** Search queries, results, filters, and search history
- **UploadStore:** Video upload process, metadata, and upload progress tracking
- **UIStore:** UI state, modal management, and global UI interactions
- **SessionStore:** Session persistence, app state, and deep link handling
- **AuthStore:** Authentication tokens, login state, and security management

### Store Relationships & Data Flow
```typescript
RootStore
├── userStore (authentication, profile, user content)
│   ├── Manages: login/logout, user profile, authentication state
│   ├── Provides: user data to other stores
│   └── Integrates: with AuthStore for token management
├── videoStore (content, categories, feeds, playback)
│   ├── Manages: video catalog, categories, playback state
│   ├── Depends on: userStore for user-specific content
│   └── Provides: video data to CommentStore and PlaylistStore
├── playlistStore (user playlists, management)
│   ├── Manages: playlist CRUD operations, playlist UI state
│   ├── Depends on: userStore for user context, videoStore for video data
│   └── Integrates: with database for persistence
├── commentStore (comments, replies, moderation)
│   ├── Manages: comment threads, editing state, moderation
│   ├── Depends on: userStore for user context, videoStore for video context
│   └── Handles: real-time comment updates and UI state
├── searchStore (search queries, results, filters)
│   ├── Manages: search functionality across all content types
│   ├── Integrates: with videoStore, userStore for comprehensive search
│   └── Provides: search history and autocomplete functionality
├── uploadStore (upload process, metadata)
│   ├── Manages: video upload pipeline, progress tracking
│   ├── Depends on: userStore for user context
│   └── Integrates: with videoStore for content catalog updates
├── uiStore (modals, alerts, navigation state)
│   ├── Manages: global UI state, modal visibility, loading states
│   ├── Coordinates: cross-store UI interactions
│   └── Provides: centralized UI state management
├── sessionStore (persistence, app lifecycle)
│   ├── Manages: app session state, deep link handling
│   ├── Coordinates: state backup/restore across all stores
│   └── Handles: app lifecycle events and state persistence
└── authStore (authentication tokens, security)
    ├── Manages: JWT tokens, refresh tokens, security state
    ├── Integrates: with userStore for authentication flow
    └── Provides: secure authentication services
```

## Feature Implementation Through Stores

### 1. Video Playback System (VideoStore)

**Core Functionality:**
```typescript
// PlaybackState management within VideoStore
export const PlaybackState = types.model('PlaybackState', {
  isPlaying: types.optional(types.boolean, false),
  progress: types.optional(types.number, 0),
  duration: types.optional(types.number, 0),
  currentVideoId: types.maybeNull(types.number),
  playlistOrder: types.optional(types.array(types.number), []),
  playlistIndex: types.optional(types.number, 0),
  currentPlaylist: types.maybeNull(types.frozen()),
  isFullscreen: types.optional(types.boolean, false),
  isLiked: types.optional(types.boolean, false),
})
```

**Store Actions:**
- `playVideo()` - Initiates video playback with state management
- `pauseVideo()` - Pauses playback and saves progress
- `seekTo(position)` - Updates playback position
- `toggleLike()` - Manages like state and updates database
- `setFullscreen()` - Controls fullscreen mode
- `updateProgress()` - Tracks watch progress for analytics

**Cross-Store Integration:**
- Updates `UserStore` watch history
- Triggers `CommentStore` to load video comments
- Notifies `PlaylistStore` for playlist navigation

### 2. User Authentication System (UserStore + AuthStore)

**UserStore Responsibilities:**
```typescript
export const UserStoreModel = types.model('UserStore', {
  user: types.maybeNull(UserModel),
  isAuthenticated: types.optional(types.boolean, false),
  authError: types.maybeNull(types.frozen<AuthError>()),
  validationErrors: types.optional(types.array(types.frozen<ValidationError>()), []),
  isLoading: types.optional(types.boolean, false),
})
```

**Authentication Flow:**
1. **Login Process:**
   - `UserStore.login()` validates credentials
   - `AuthStore` manages token storage and refresh
   - Cross-store notification updates UI state
   - Database queries load user-specific content

2. **Session Management:**
   - `AuthStore` handles token refresh automatically
   - `SessionStore` persists authentication state
   - `UserStore` maintains user profile data

3. **Logout Process:**
   - `UserStore.logout()` clears user data
   - `AuthStore` removes tokens
   - All stores reset user-specific state

### 3. Comment System (CommentStore)

**Comment Management:**
```typescript
export const CommentStoreModel = types.model('CommentStore', {
  comments: types.array(CommentModel),
  currentVideoId: types.maybeNull(types.number),
  editingComment: types.maybeNull(EditingCommentModel),
  replyingTo: types.maybeNull(ReplyingToModel),
  newComment: types.optional(types.string, ''),
  showReplies: types.optional(types.map(types.boolean), {}),
})
```

**Feature Implementation:**
- **Threaded Comments:** Hierarchical comment structure with parent-child relationships
- **Real-time Editing:** In-place comment editing with optimistic updates
- **Reply System:** Nested replies with user mention functionality
- **Moderation:** Comment visibility controls and user reporting

**Store Actions:**
- `loadCommentsForVideo()` - Loads comments when video changes
- `addComment()` - Creates new comment with database persistence
- `editComment()` - Enables in-place editing with state management
- `deleteComment()` - Soft delete with UI state updates
- `toggleReplies()` - Manages reply visibility state

### 4. Playlist Management (PlaylistStore)

**Playlist Operations:**
- **Creation:** `createPlaylist()` with metadata and privacy settings
- **Management:** Add/remove videos, reorder playlist items
- **Sharing:** Public/private playlist visibility controls
- **Collaboration:** Multi-user playlist editing (planned)

**Integration Points:**
- `VideoStore` provides video data for playlist population
- `UserStore` provides user context for playlist ownership
- Database persistence with optimistic UI updates

### 5. Search Functionality (SearchStore)

**Search Implementation:**
```typescript
// Basic video search with title and description matching
const searchVideos = flow(function* (query: string) {
  try {
    self.searchQuery = query
    self.isLoading = true
    const results: number[] = yield videoQueries.searchVideos(query)
    self.searchResultVideoIds.replace(results)
  } catch (e) {
    setError(e)
  } finally {
    self.isLoading = false
  }
})

// Enhanced search with filtering
const performSearch = flow(function* (query: string, filter: string) {
  try {
    self.searchState.isSearching = true
    const videos = rootStore.videoStore?.videos || []
    
    // Client-side filtering of videos
    const videoResults = videos
      .filter(video =>
        video.title.toLowerCase().includes(query.toLowerCase()) ||
        video.description?.toLowerCase().includes(query.toLowerCase())
      )
      .map(video => ({ id: `video-${video.id}`, type: 'video', data: video }))
  } catch (error) {
    self.error = error.message
  }
})
```

**Current Features:**
- **Basic Text Search:** LIKE-based search on video titles and descriptions
- **Client-side Filtering:** Category and type-based filtering
- **Search State Management:** Query and result state tracking
- **Search Results Display:** Organized search results with sections

### 6. Video Upload System (UploadStore)

**Upload Process Management:**
```typescript
// Simplified upload process with form state management
export const UploadStore = types.model('UploadStore', {
  title: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
  categoryId: types.maybeNull(types.number),
  base64Thumbnail: types.maybeNull(types.string),
  file: types.frozen<File | DocumentPickerAsset | null>(),
  isUploading: types.optional(types.boolean, false),
  commentsEnabled: types.optional(types.boolean, true),
})

// Upload workflow
startUpload() {
  self.isUploading = true
  setTimeout(() => {
    this.finishUpload() // Simulated upload process
  }, 10000)
}

finishUpload() {
  const videoData = {
    title: self.title || 'Untitled',
    description: self.description,
    categoryId: self.categoryId || 1,
    thumbnailUrl: self.base64Thumbnail,
    isCommentsEnabled: self.commentsEnabled,
  }
  
  // Create video record in VideoStore
  root.videoStore.uploadVideo(videoData)
}
```

**Current Features:**
- **Form State Management:** Title, description, category selection
- **File Handling:** Document picker integration for video files
- **Thumbnail Support:** Base64 thumbnail storage
- **Upload Simulation:** Timed upload process with success feedback
- **Database Integration:** Video record creation through VideoStore

### 7. UI State Management (UIStore)

**Global UI Coordination:**
```typescript
export const UIStoreModel = types.model('UIStore', {
  // Modal management
  isAddToPlaylistModalVisible: types.optional(types.boolean, false),
  isCreatePlaylistModalVisible: types.optional(types.boolean, false),
  
  // Loading states
  isDeeplinkLoading: types.optional(types.boolean, false),
  isAppInitializing: types.optional(types.boolean, true),
  
  // Navigation state
  currentRoute: types.optional(types.string, '/'),
  previousRoute: types.maybeNull(types.string),
  
  // Alert system
  activeAlert: types.maybeNull(types.frozen()),
})
```

**Centralized UI Features:**
- **Modal Management:** Global modal state with z-index coordination
- **Loading States:** Centralized loading indicators across features
- **Alert System:** Toast notifications and confirmation dialogs
- **Navigation State:** Route tracking for deep linking and analytics

### 8. Session Management (SessionStore)

**State Persistence:**
```typescript
// Cross-store state backup for testing and recovery
backupAppState: flow(function* () {
  const rootStore = getRoot(self)
  
  const stateSnapshot = {
    user: getSnapshot(rootStore.userStore),
    playback: getSnapshot(rootStore.videoStore.playbackState),
    ui: getSnapshot(rootStore.uiStore),
    // ... other store states
  }
  
  yield self.persistStateToFile(stateSnapshot)
})
```

**Deep Link Handling:**
- **URL Parsing:** Deep link URL parsing and validation
- **State Restoration:** App state restoration from deep links
- **Navigation:** Intelligent navigation based on app state
- **Session Recovery:** Crash recovery with state restoration

## Cross-Store Communication Patterns

### 1. Event-Driven Updates
```typescript
// VideoStore notifies other stores of video changes
onVideoChange: (videoId: number) => {
  getRoot(self).commentStore.loadCommentsForVideo(videoId)
  getRoot(self).playlistStore.updateCurrentVideo(videoId)
  getRoot(self).userStore.addToWatchHistory(videoId)
}
```

### 2. Reactive Dependencies
```typescript
// CommentStore reacts to user authentication changes
get canComment(): boolean {
  const rootStore = getRoot(self)
  return rootStore.userStore.isAuthenticated && 
         rootStore.videoStore.currentVideo?.isCommentsEnabled
}
```

### 3. Shared State Access
```typescript
// PlaylistStore accesses video data from VideoStore
get availableVideos(): VideoInstance[] {
  return getRoot(self).videoStore.videos.filter(video => 
    video.visibility === 'public' || 
    video.channelId === getRoot(self).userStore.user?.channelId
  )
}
```

This store-based architecture provides:
- **Separation of Concerns:** Each store manages its specific domain
- **Reactive Updates:** Automatic UI updates when state changes
- **Type Safety:** Full TypeScript support with MST
- **Testability:** Individual store testing and mocking
- **Scalability:** Easy addition of new features and stores
- **State Persistence:** Comprehensive backup/restore capabilities

## Database Implementation

### SQLite with Drizzle ORM
- **Local-first architecture** for offline functionality
- **Relational schema** with proper foreign key constraints
- **Migration system** for schema versioning
- **Query optimization** for mobile performance
- **Data synchronization** with remote services (planned)

### Key Database Features
- **Soft deletes** preserve data integrity
- **Indexing** on frequently queried columns
- **Transactions** for data consistency
- **Batch operations** for performance
- **Schema validation** and type safety

## Video Processing & Playback

### Video Upload Pipeline
1. **File Selection:** Expo document picker for video file selection
2. **Form Input:** Title, description, and category assignment
3. **Thumbnail Support:** Base64 thumbnail encoding and storage
4. **Upload Simulation:** Timed upload process with loading states
5. **Database Entry:** Video record creation with channel association
6. **State Management:** Upload progress and success feedback

### Video Playback System
- **Native Video Player:** Expo AV for optimal performance
- **Adaptive Streaming:** Quality adjustment based on connection
- **Background Playback:** Audio continuation when app backgrounded
- **Playback Controls:** Play, pause, seek, volume, fullscreen
- **Progress Tracking:** Watch time and completion analytics

## Search & Discovery Engine

### Search Implementation
- **Basic Video Search:** LIKE-based search on video titles and descriptions
- **Category Filtering:** Client-side filtering by video categories
- **Search State Management:** Query persistence and result caching

### Content Discovery
- **Subscription Feed:** Videos from subscribed channels ordered by recency
- **Category-based Browsing:** Videos organized by predefined categories
- **View Count Sorting:** Popular content discovery through view metrics
- **Channel-based Discovery:** Content exploration through channel subscriptions

## Performance Optimization

### Mobile Performance
- **Lazy Loading:** Components and data loaded on demand
- **Image Optimization:** Cached thumbnails and progressive loading
- **List Virtualization:** Efficient rendering of large video lists
- **Memory Management:** Proper cleanup of video players and resources
- **Bundle Optimization:** Code splitting and tree shaking

### Database Performance
- **Basic Indexing:** Primary keys and foreign key constraints
- **Simple Queries:** Direct table queries with basic filtering
- **Limit Clauses:** Result limiting for search and feed queries
- **Soft Deletes:** Logical deletion with deletedAt timestamps
- **Transaction Support:** Atomic operations for data consistency

## Security & Privacy

### Authentication & Authorization
- **Secure Authentication:** Email/password with proper hashing
- **Session Management:** Secure token storage and rotation
- **Access Control:** Role-based permissions for content
- **Data Validation:** Input sanitization and validation
- **Privacy Controls:** User data protection and consent

### Content Security
- **Content Moderation:** Automated and manual content review
- **User Reporting:** Community-driven content flagging
- **Access Controls:** Private/public content visibility
- **Data Encryption:** Sensitive data encryption at rest
- **Secure Communication:** HTTPS for all network requests

## Local Data Storage

### SQLite-based Architecture
- **Local Database:** All data stored locally in SQLite
- **Offline-first:** App functions entirely offline with local data
- **Mock Data:** Pre-populated database with sample content
- **State Persistence:** App state backup and restoration capabilities

## Internationalization & Accessibility

### Multi-language Support
- **Static Translations:** JSON-based translation files for English and Spanish
- **Basic i18n:** Simple key-value translation system
- **Manual Language Selection:** User-controlled language switching

### Accessibility Features
- **Screen Reader Support:** VoiceOver and TalkBack compatibility
- **Keyboard Navigation:** Full keyboard accessibility
- **High Contrast:** Accessibility-friendly color schemes
- **Font Scaling:** Dynamic type size adjustment
- **Focus Management:** Proper focus handling for navigation

## Testing Strategy

### Test Coverage
- **Unit Tests:** Individual component and function testing
- **Integration Tests:** Store and database integration testing
- **E2E Tests:** Complete user flow testing
- **Performance Tests:** Load and stress testing
- **Accessibility Tests:** Automated accessibility validation

### Testing Tools
- **Jest:** Unit and integration test framework
- **React Native Testing Library:** Component testing utilities
- **Detox:** End-to-end testing framework
- **Flipper:** Debugging and performance monitoring
- **Reactotron:** Development debugging tool

## Development Workflow

### Code Quality
- **TypeScript:** Full type safety and IDE support
- **ESLint/Prettier:** Code formatting and linting
- **Husky:** Pre-commit hooks for quality gates
- **CI/CD Pipeline:** Automated testing and deployment
- **Code Reviews:** Peer review process for all changes

### Development Tools
- **Expo Dev Tools:** Development server and debugging
- **Metro Bundler:** JavaScript bundling and hot reload
- **Flipper Integration:** Network, database, and performance debugging
- **Reactotron:** State inspection and API monitoring
- **VS Code Extensions:** Enhanced development experience

## Deployment & Distribution

### Build Process
- **Expo Application Services (EAS):** Cloud-based builds
- **Environment Configuration:** Development, staging, production
- **Code Signing:** Automated certificate management
- **Bundle Optimization:** Production-ready optimizations
- **Asset Management:** Image and video asset optimization

### Distribution Channels
- **App Store:** iOS App Store distribution
- **Google Play:** Android Play Store distribution
- **Internal Distribution:** Enterprise and beta testing
- **Over-the-Air Updates:** Expo Updates for rapid deployment
- **Progressive Rollout:** Gradual feature deployment

## Monitoring & Analytics

### Performance Monitoring
- **Crash Reporting:** Automated crash detection and reporting
- **Performance Metrics:** App startup, navigation, video loading times
- **User Analytics:** Usage patterns and feature adoption
- **Error Tracking:** Runtime error monitoring and alerting
- **Network Monitoring:** API performance and reliability

### Business Intelligence
- **User Engagement:** Video views, likes, comments, shares
- **Content Analytics:** Popular content and trending topics
- **User Retention:** App usage and return patterns
- **Conversion Metrics:** Feature adoption and user journeys
- **A/B Testing:** Feature experimentation and optimization



## Resources & References

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [MobX State Tree Guide](https://mobx-state-tree.js.org/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SQLite Performance Best Practices](https://www.sqlite.org/optoverview.html)
- [React Native Performance Guide](https://reactnative.dev/docs/performance)
- [Mobile App Security Best Practices](https://owasp.org/www-project-mobile-top-10/)