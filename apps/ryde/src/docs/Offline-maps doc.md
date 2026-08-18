# Offline Map Rendering Implementation Guide

## Overview
This guide explains how to implement offline maps in a React Native application using MapLibre GL. It covers map tile generation, route data processing, and rendering implementation.

## Table of Contents
1. [Map Tile Generation](#map-tile-generation)
2. [Route Data Generation](#route-data-generation)
3. [Implementation Approaches](#implementation-approaches)
4. [Integration in React Native](#integration-in-react-native)
5. [Best Practices](#best-practices)

## Map Tile Generation

### Prerequisites
- OSM or PBF file of the target region (e.g., kansas-latest.osm.pbf)
- Python environment for tile processing
- MapTiler or similar tool for tile generation
- Node.js and npm/yarn for development environment
- ADB tools for device deployment
- Java + Maven (for GraphHopper)
- osmctools (for data processing)

### Step 1: Data Preparation

#### 1.1 Download OSM Data
```bash
# Download OSM data for your region from Geofabrik
wget https://download.geofabrik.de/north-america/us/kansas-latest.osm.pbf
```

#### 1.2 Install Required Tools
```bash
# On macOS
brew install osmctools
brew install maptiler
brew install graphhopper

# On Linux (Ubuntu/Debian)
sudo apt update
sudo apt install osmctools
```

#### 1.3 Crop OSM Data (Optional but Recommended)
```bash
# Crop to specific bounding box (example for Kansas City)
osmconvert kansas-latest.osm.pbf \
  -b=-94.56014,39.09077,-94.51941,39.10563 \
  --complete-ways \
  -o=kansas-city-cropped.osm.pbf
```

### Step 2: Route Processing Setup

#### 2.1 Setup GraphHopper
```bash
# Clone and build GraphHopper
git clone https://github.com/graphhopper/graphhopper.git
cd graphhopper
git checkout 7.0
./mvnw clean install -DskipTests
```

#### 2.2 Start GraphHopper Server
```bash
java -Ddw.graphhopper.datareader.file=./kansas-city-cropped.osm.pbf \
-jar web/target/graphhopper-web-7.0-SNAPSHOT.jar \
server config-example.yml
```

### Step 3: Generate Map Tiles

#### 3.1 Using MapTiler (Recommended)
```bash
# Generate tiles with custom settings
maptiler generate \
  --output-dir ./output/tiles \
  --min-zoom 15 \
  --max-zoom 17 \
  --format png \
  kansas-city-cropped.osm.pbf
```

#### 3.2 Alternative: Using Tilemaker
```bash
# Install Tilemaker
brew install tilemaker

# Generate tiles
tilemaker \
  --input kansas-city-cropped.osm.pbf \
  --output ./tiles \
  --config config-openmaptiles.json
```

### Step 4: Generate Route Data

#### 4.1 Prepare Location Data
Create a `locations.json` file:
```json
[
  {
    "name": "Location1",
    "lat": 39.09077,
    "lon": -94.56014
  },
  {
    "name": "Location2",
    "lat": 39.10563,
    "lon": -94.51941
  }
]
```

#### 4.2 Generate Routes
Create a Python script `generate_routes.py`:
```python
import json
import requests

with open("locations.json", "r") as f:
    locations = json.load(f)

features = []
for i in range(len(locations)):
    for j in range(len(locations)):
        if i == j:
            continue
        from_point = locations[i]
        to_point = locations[j]
        
        url = f"http://localhost:8989/route?point={from_point['lat']},{from_point['lon']}&point={to_point['lat']},{to_point['lon']}&type=json&profile=car&points_encoded=false"
        
        response = requests.get(url)
        data = response.json()
        
        if "paths" in data and data["paths"]:
            geometry = data["paths"][0]["points"]
            features.append({
                "type": "Feature",
                "properties": {
                    "from": from_point["name"],
                    "to": to_point["name"],
                    "distance_km": round(data["paths"][0]["distance"] / 1000, 2),
                    "time_min": round(data["paths"][0]["time"] / 60000, 2)
                },
                "geometry": geometry
            })

geojson = {"type": "FeatureCollection", "features": features}
with open("routes.json", "w") as f:
    json.dump(geojson, f, indent=2)
```

### Step 5: Organize Assets

#### 5.1 Asset Organization for Testing
```bash
test-profile-1/
└── mockdata/
    └── media.zip  # Contains tiles archive
        └── tiles/
            ├── 15/  # City level zoom - PNG files
            ├── 16/  # Neighborhood level zoom - PNG files
            └── 17/  # Street level zoom - PNG files
```

#### 5.2 Asset Preparation
1. **Prepare Tile Structure**
   - Organize PNG tiles in zoom-level folders (15, 16, 17)
   - Place all zoom-level folders under a single `tiles` directory
   - Remove any system files (like `__MACOSX__` or `.DS_Store`)
   - Archive the `tiles` directory as `media.zip`

2. **Place for Testing**
   ```bash
   # Place media.zip in test profile directory
   cp media.zip /path/to/test-profile-1/mockdata/
   ```

#### 5.3 Asset Deployment
1. **Extract Assets**
   ```bash
   # Run the extraction script
   python python:extract
   ```

2. **Deploy to Device**
   ```bash
   # Set up environment and deploy tiles
   python set_environment
   ```

This will:
- Extract tiles from `media.zip`
- Deploy to device path: `/sdcard/Android/data/com.andojoryde/files/tiles/`
- Set up proper zoom level structure (15/16/17)

> Note: Always maintain the name `media.zip` as it's hardcoded in the extraction process.

### Configuration Details

#### 1. Zoom Levels
- Minimum zoom: 15 (city level)
- Maximum zoom: 17 (street level)
- Balance between detail and storage

#### 2. Tile Format
```json
{
  "format": "png",
  "tileSize": 256,
  "compression": "medium",
  "quality": 85
}
```

#### 3. Style Configuration
```json
{
  "version": 8,
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["file://{path}/tiles/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "maxzoom": 17,
      "minzoom": 15
    }
  },
  "layers": [
    {
      "id": "osm",
      "type": "raster",
      "source": "osm"
    }
  ]
}
```

### Performance Considerations

1. **Tile Size Optimization**:
   - Use PNG format for best quality/size ratio
   - Implement proper compression
   - Consider WebP for modern devices

2. **Storage Management**:
   - Typical tile sizes:
     - Zoom 15: ~500KB per tile
     - Zoom 16: ~1MB per tile
     - Zoom 17: ~2MB per tile
   - Calculate storage requirements:
     ```
     Total Storage = Σ(4^(zoom-15) * avg_tile_size)
     ```

3. **Caching Strategy**:
   - Implement LRU cache for frequently accessed tiles
   - Clear cache when storage threshold reached
   - Preload tiles for common routes

## Route Data Generation

### Process
1. Extract route data from OSM files using the provided Python script
2. Generate a routes.json file containing:
   - Route coordinates
   - Start/end points
   - Distance information
   - City metadata

Example routes.json structure:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[lon1, lat1], [lon2, lat2], ...]
      },
      "properties": {
        "from": "location1",
        "to": "location2",
        "distance": 1234,
        "city": "Kansas City"
      }
    }
  ],
  "metadata": {
    "city": "Kansas City",
    "total_routes": 100,
    "total_locations": 50
  }
}
```

## Implementation Approaches

### 1. ADB Push Method (Recommended)
Push assets directly to the device's external storage.

#### Advantages:
- No server requirement
- Reliable offline access
- Simpler implementation
- Preferred approach

#### Implementation:
```bash
adb push ./tiles /sdcard/Android/data/com.yourapp/files/
adb push ./routes.json /sdcard/Android/data/com.yourapp/files/
```

## Integration in React Native

### Basic Setup
```typescript
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import RNFS from 'react-native-fs';

MapLibreGL.setAccessToken(null);
```

### Map Component Implementation
```typescript
// Map component with offline tiles
<MapLibreGL.MapView style={styles.map} mapStyle="">
  <MapLibreGL.Camera
    zoomLevel={15}
    minZoomLevel={15}
    maxZoomLevel={17}
    centerCoordinate={defaultCenter}
  />

  {/* Option 1: ADB Push Method */}
  <MapLibreGL.RasterSource
    id="offlineMap"
    tileUrlTemplates={[
      "file://" + RNFS.ExternalDirectoryPath + "/tiles/{z}/{x}/{y}.png"
    ]}
    tileSize={256}
  >
    <MapLibreGL.RasterLayer id="offlineLayer" />
  </MapLibreGL.RasterSource>

  {/* Option 2: Local Server Method */}
  <MapLibreGL.RasterSource
    id="offlineMap"
    tileUrlTemplates={[
      `http://10.0.2.2:8080/${mapId}/tiles/{z}/{x}/{y}.png`
    ]}
    tileSize={256}
  >
    <MapLibreGL.RasterLayer id="offlineLayer" />
  </MapLibreGL.RasterSource>
</MapLibreGL.MapView>
```

### Route Rendering
```typescript
// Route line rendering
<MapLibreGL.ShapeSource
  id="routeSource"
  shape={{
    type: "Feature",
    geometry: { 
      type: "LineString", 
      coordinates: routeCoordinates 
    }
  }}
>
  <MapLibreGL.LineLayer
    id="routeLine"
    style={{ lineColor: "blue", lineWidth: 4 }}
  />
</MapLibreGL.ShapeSource>
```