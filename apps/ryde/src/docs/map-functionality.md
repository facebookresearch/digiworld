# Map Functionality Documentation

## Overview
The map functionality in the Andojo Eats app is implemented using a WebView-based approach with Leaflet.js for map rendering and interactions. This document explains the step-by-step process of how the map functionality works, from asset management to runtime execution.

## Table of Contents
1. [Required Packages](#required-packages)
2. [Asset Management](#asset-management)
3. [WebView Implementation](#webview-implementation)
4. [Integration Points](#integration-points)

## Required Packages

### Core Dependencies
```json
{
  "react-native-webview": "^13.13.5",
  "expo-file-system": "~18.0.7",
  "expo-build-properties": "~0.13.1"
}
```

### Web Dependencies (in map.html)
- Leaflet.js (v1.9.4)
- Leaflet.css
- Custom map tiles

## Asset Management

### Asset Structure
```
assets/
└── images/
    └── web/
        ├── map.html
        ├── leaflet.js
        ├── leaflet.css
        ├── leaflet.js.map
        └── images/
            └── tiles/
```

### Asset Copy Process
The map functionality requires web assets to be available in the Android app's assets directory. This is handled by the `copy-web-assets.ts` script.

#### 1. Script Location and Purpose
- **Location**: `scripts/copy-web-assets.ts`
- **Execution**: Runs during `postinstall` via npm script
- **Purpose**: Ensures web assets are properly copied to Android's assets directory for WebView access

#### 2. Why Asset Copying is Necessary
1. **WebView Access**:
   - Android WebView can only access files from the app's assets directory
   - Direct access to development assets is not possible in production
   - Ensures consistent file paths across development and production

2. **Asset Organization**:
   - Keeps web assets separate from app code
   - Maintains clean project structure
   - Allows for easier asset updates and management

3. **Build Process Integration**:
   - Automates asset copying during build
   - Ensures assets are always up to date
   - Prevents missing asset issues in production

#### 3. Asset Copy Process Details
1. **Source Directory**:
   ```
   apps/eats/assets/images/web/
   ```

2. **Destination Directory**:
   ```
   android/app/src/main/assets/web/
   ```

3. **Copied Assets**:
   - `map.html`: Main map interface
   - `leaflet.js`: Map library
   - `leaflet.css`: Map styles
   - `leaflet.js.map`: Source maps
   - `images/`: All map-related images
     - `tiles/`: Map tile images
     - `markers/`: Custom marker icons
     - `layers/`: Map layer controls

#### 4. Implementation Details
1. **Script Execution**:
   - Triggered by `postinstall` npm script
   - Uses Node.js file system operations
   - Handles both development and production builds

2. **Error Handling**:
   - Validates source directory existence
   - Ensures destination directory creation
   - Handles file copy errors gracefully

3. **Build Integration**:
   ```json
   {
     "scripts": {
       "postinstall": "ts-node scripts/copy-web-assets.ts"
     }
   }
   ```

#### 5. Why This Approach
1. **Reliability**:
   - Ensures assets are always available
   - Prevents runtime asset loading issues
   - Maintains consistent file paths

2. **Performance**:
   - Assets are bundled with the app
   - No runtime asset downloading needed
   - Faster map loading times

3. **Maintenance**:
   - Centralized asset management
   - Easy to update assets
   - Clear separation of concerns

4. **Security**:
   - Assets are packaged with the app
   - No external asset loading required
   - Controlled asset distribution

#### 6. Best Practices
1. **Asset Organization**:
   - Keep web assets in dedicated directory
   - Use clear file naming conventions
   - Maintain proper directory structure

2. **Build Process**:
   - Include asset copying in build pipeline
   - Verify assets after copying
   - Handle errors appropriately

3. **Version Control**:
   - Track web assets in version control
   - Document asset changes
   - Maintain asset history

## WebView Implementation

### Web Folder Structure and Files
```
web/
├── map.html              # Main map interface
├── leaflet.js           # Leaflet library core
├── leaflet.css          # Leaflet styles
├── leaflet.js.map       # Source map for debugging
└── images/
    ├── tiles/           # Custom map tiles
    ├── markers/         # Custom marker icons
    │   ├── restaurant.png    # Restaurant marker
    │   ├── home.png         # Delivery address marker
    │   └── bike.png         # Delivery bike marker
    └── layers/          # Map layer controls
```

### Map HTML Implementation

#### 1. Map Structure and Initialization
The map.html file implements a full-screen map interface with the following key components:

- **Viewport Configuration**: Optimized for mobile devices with proper scaling
- **Map Container**: Full-screen div element for map rendering
- **Base Map Layer**: Custom tile layer with Andojo branding
- **Zoom Controls**: Positioned at bottom-right for better UX
- **Cleanup Mechanism**: Proper resource management for map reinitialization

#### 2. Marker System
The map implements three distinct marker types:

1. **Restaurant Marker**:
   - Custom icon for order pickup location
   - Size: 36x36 pixels
   - Anchor point at bottom center
   - Includes popup with "Restaurant" label

2. **Home Marker**:
   - Custom icon for delivery destination
   - Size: 36x36 pixels
   - Anchor point at bottom center
   - Includes popup with "Home" label

3. **Bike Marker**:
   - Animated delivery vehicle icon
   - Size: 32x32 pixels
   - Centered anchor point for smooth rotation
   - Dynamic positioning during animations

#### 3. Status-Based Visualization
The map adapts its visualization based on order status:

1. **Pending/Preparing State**:
   - Shows dashed line between restaurant and delivery address
   - Orange color (#FF6B00) with 10px dash pattern
   - No bike marker visible
   - Auto-fits bounds to show entire route

2. **Assigned State**:
   - Displays bike marker at initial position
   - Shows dashed line for planned route
   - Animates bike from initial position to restaurant
   - 10-second animation duration
   - Sends arrival notification to React Native

3. **Out for Delivery State**:
   - Implements complex route animation
   - Shows traveled path in gray
   - Shows remaining path in orange
   - Segmented animation with 10-second per segment
   - Displays arrival popup at destination
   - Sends completion notification to React Native

#### 4. Animation System
The map implements sophisticated animations:

1. **Bike to Restaurant Animation**:
   - Linear interpolation between points
   - Smooth position updates
   - Progress tracking based on timestamp
   - Completion callback to React Native

2. **Delivery Route Animation**:
   - Segmented path animation
   - Progress tracking per segment
   - Dynamic path coloring
   - Smooth transitions between segments
   - Completion state handling

#### 5. React Native Integration
The map implements bidirectional communication:

1. **Message Types**:
   - `bikeArrivedAtStart`: When bike reaches restaurant
   - `bikeArrivedAtEnd`: When delivery is complete

2. **State Management**:
   - Timestamp-based animation control
   - Progress tracking
   - Cleanup on unmount
   - Resource management

#### 6. Performance Optimizations
The implementation includes several optimizations:

1. **Resource Management**:
   - Proper cleanup of map instances
   - Animation frame cancellation
   - Marker and layer cleanup
   - Memory leak prevention

2. **Rendering Optimizations**:
   - Efficient marker updates
   - Optimized path rendering
   - Smooth animation frames
   - Proper bounds fitting

3. **Mobile Considerations**:
   - Touch-friendly controls
   - Responsive design
   - Battery-efficient animations
   - Memory-efficient asset loading

### Leaflet.js and CSS Files

#### 1. leaflet.js
- Core mapping library
- Handles map rendering, interactions, and animations
- Provides APIs for markers, polylines, and map controls
- Version: 1.9.4 (as specified in package.json)

#### 2. leaflet.css
- Default styles for map elements
- Marker styles
- Control styles
- Popup styles
- Custom overrides for our implementation

### Custom Map Tiles
- Stored in `images/tiles/` directory
- Organized by zoom level (z), x, and y coordinates
- Custom styling for Andojo brand
- Optimized for mobile performance

### Marker Icons
- Custom designed markers for:
  - Start point (restaurant)
  - End point (delivery address)
  - Delivery bike
- Optimized for different screen densities
- Animated bike marker for delivery status


## Integration Points

### 1. Order Status Changes
- Status transitions trigger map updates
- Bike position updates based on status
- Animation timestamps manage animation state

### 2. Navigation Handling
- Screen focus effects reset WebView state
- Animation timestamps persist across navigation
- WebView reloads ensure proper state

### 3. Error Handling
- Rollback mechanisms for failed status changes
- Animation retry logic
- WebView state recovery

## Best Practices

1. **Performance**:
   - Use `useCallback` for event handlers
   - Memoize components to prevent unnecessary re-renders
   - Implement proper cleanup in useEffect

2. **State Management**:
   - Centralize animation state in uiStore
   - Use timestamps for animation synchronization
   - Implement proper WebView ready state handling

3. **Error Recovery**:
   - Implement rollback mechanisms
   - Add retry logic for failed animations
   - Maintain WebView state consistency

## Troubleshooting

### Common Issues
1. **Animation Not Triggering**:
   - Check WebView ready state
   - Verify animation timestamp
   - Ensure proper status transitions

2. **WebView Not Loading**:
   - Verify asset copy process
   - Check file paths
   - Validate HTML structure

3. **State Synchronization**:
   - Monitor WebView ready state
   - Check animation timestamps
   - Verify status transitions

