# Shared Asset Management

A robust asset management system for handling file paths and storage across different Andojo applications. This module standardizes how we handle assets (images, documents, etc.) across different entity types while maintaining a consistent and predictable structure.

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Asset Resolution Flow](#asset-resolution-flow)
- [Directory Structure](#directory-structure)
- [Initialization](#initialization)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

```
[Asset Request]
      │
      ▼
[Asset Manager]
      │
      ▼
[Entity Type Check]
      │
      ▼
[Pattern Matching]
      │
      ▼
[Path Resolution]
      │
      ▼
[Return Path]
```

### Key Features
- 🗂 Standardized path resolution across apps
- 📁 Automatic directory structure management
- 🔄 Built-in support for common entity types
- 🎨 Configurable naming patterns
- 🛠 Extensible architecture

## Installation

```bash
# Using yarn
yarn add @andojo/shared-asset-management

# Using npm
npm install @andojo/shared-asset-management
```

## Asset Resolution Flow

### Asset Resolution Flow

```
[Component]
      │
      ▼
[Asset Config]
      │
      ├─────────────┐
      ▼             ▼
[Validate Type]  [Get Pattern]
      │             │
      └─────────────┘
            │
            ▼
[Construct File Name]
            │
            ▼
[Check File Exists]
            │
            ▼
[Return Full Path]
```

### Pattern Resolution

```
[Get Entity Config]
      │
      ▼
[Check Asset Type]
      │
      ├───────────────┐
      ▼               ▼
[Main Image]    [Gallery Image]
      │               │
      │         [Apply Index]
      │               │
      └───────────────┘
            │
            ▼
[Apply File Pattern]
```

## Directory Structure

```
${RNFS.ExternalDirectoryPath}/
└── mockdata/
    └── assets/
        ├── products/              # Product-related assets
        │   ├── product-123/       # Grouped by product ID
        │   │   ├── main.jpg      # Main product image
        │   │   ├── gallery_1.jpg # Additional product images
        │   │   └── gallery_2.jpg
        │   └── product-456/
        │       └── ...
        │
        ├── avatars/              # User avatars
        │   ├── user-789.jpg     # Individual avatar files
        │   └── user-101.jpg
        │
        ├── categories/           # Category assets
        │   ├── category-1/
        │   │   └── main.jpg
        │   └── category-2/
        │       └── main.jpg
        │
        ├── artists/             # Music artist assets
        │   ├── artist-1/
        │   │   └── main.jpg
        │   └── artist-2/
        │       └── main.jpg
        │
        ├── albums/              # Album artwork
        │   ├── album-1/
        │   │   └── main.jpg
        │   └── album-2/
        │       └── main.jpg
        │
        ├── songs/               # Song artwork
        │   ├── song-1/
        │   │   └── main.jpg
        │   └── song-2/
        │       └── main.jpg
        │
        └── playlists/          # Playlist artwork
            ├── playlist-1/
            │   └── main.jpg
            └── playlist-2/
                └── main.jpg
```

## Initialization

### Basic Setup
```typescript
import { AssetManager, AppName, EntityType } from '@andojo/shared-asset-management';

// Initialize early in your app (e.g., App.tsx or index.ts)
AssetManager.initialize([
  // E-commerce app configs
  {
    name: EntityType.PRODUCTS,
    appName: AppName.SHOP,
    filePattern: {
      main: '{entityId}/main.jpg',
      gallery: '{entityId}/gallery_{index}.jpg'
    }
  },
  // Music app configs
  {
    name: EntityType.ARTISTS,
    appName: AppName.MUSIC,
    filePattern: {
      main: '{entityId}/main.jpg'
    }
  },
  {
    name: EntityType.ALBUMS,
    appName: AppName.MUSIC,
    filePattern: {
      main: '{entityId}/main.jpg'
    }
  }
]);
```

### Configuration Parameters Explained

```typescript
interface AssetFolderConfig {
  name: EntityType;        // Enum value matching folder name
  appName?: AppName;      // Optional app name for app-specific configs
  path?: string;          // Optional custom base path
  filePattern: {
    main: string;        // Pattern for main asset (e.g., main.jpg)
    gallery?: string;    // Pattern for gallery assets
    prefix?: string;     // Optional file prefix
    suffix?: string;     // File extension (e.g., .jpg)
  };
}
```

## Usage Examples

### Basic Implementation

```typescript
// Basic Image Component
import { Image } from 'react-native';
import { AssetManager, AssetType, EntityType, AssetConfigType } from '@andojo/shared-asset-management';

function ArtistImage({ artistId, style }) {
  const [imagePath, setImagePath] = useState(null);

  useEffect(() => {
    async function loadImage() {
      const path = await AssetManager.getAssetPath({
        entityType: EntityType.ARTISTS,
        entityId: artistId,
        assetType: AssetType.IMAGE,
        assetConfig: {
          type: AssetConfigType.MAIN
        }
      });
      
      if (path) {
        setImagePath(`file://${path}`);
      }
    }
    
    loadImage();
  }, [artistId]);

  return (
    <Image 
      source={imagePath ? { uri: imagePath } : require('./default-artist.jpg')}
      style={style}
    />
  );
}
```

### Reusable Component Pattern

```typescript
// MusicImage.tsx - A reusable component for music app assets
import { Image, ImageStyle, StyleProp } from 'react-native';
import { AssetManager, AssetType, EntityType, AssetConfigType } from '@andojo/shared-asset-management';

interface MusicImageProps {
  entityType: EntityType;
  entityId: string | number;
  isGallery?: boolean;
  galleryIndex?: number;
  style?: StyleProp<ImageStyle>;
  defaultSource?: any;
}

const defaultImages = {
  [EntityType.ARTISTS]: require('./artist_placeholder.jpg'),
  [EntityType.ALBUMS]: require('./album_placeholder.jpg'),
  // ... other defaults
};

export function MusicImage({
  entityType,
  entityId,
  isGallery,
  galleryIndex,
  style,
  defaultSource
}: MusicImageProps) {
  const [imageSource, setImageSource] = useState(null);

  useEffect(() => {
    async function getPath() {
      const path = await AssetManager.getAssetPath({
        entityType,
        entityId: Number(entityId),
        assetType: AssetType.IMAGE,
        assetConfig: {
          type: isGallery ? AssetConfigType.GALLERY : AssetConfigType.MAIN,
          index: galleryIndex
        }
      });

      if (path) {
        setImageSource({ uri: `file://${path}` });
      } else {
        setImageSource(defaultSource || defaultImages[entityType]);
      }
    }

    getPath();
  }, [entityType, entityId, isGallery, galleryIndex, defaultSource]);

  return (
    <Image
      source={imageSource}
      style={style}
      defaultSource={defaultSource || defaultImages[entityType]}
    />
  );
}

// Convenience wrappers
export function ArtistImage(props: Omit<MusicImageProps, 'entityType'>) {
  return <MusicImage {...props} entityType={EntityType.ARTISTS} />;
}

export function AlbumImage(props: Omit<MusicImageProps, 'entityType'>) {
  return <MusicImage {...props} entityType={EntityType.ALBUMS} />;
}
```

### Real-World Usage

```typescript
// In your screens/components
function ArtistProfile({ artistId }) {
  return (
    <View>
      <ArtistImage 
        entityId={artistId}
        style={styles.artistPhoto}
        defaultSource={require('./default-artist.jpg')}
      />
    </View>
  );
}

function AlbumList({ albums }) {
  return (
    <FlatList
      data={albums}
      renderItem={({ item }) => (
        <AlbumImage
          entityId={item.id}
          style={styles.albumCover}
        />
      )}
    />
  );
}
```

## Configuration

### Available Enums

```