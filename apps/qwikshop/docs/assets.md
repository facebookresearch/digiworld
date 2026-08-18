# Asset Management in Qwikshop App

This guide explains how assets (images, avatars) are managed in the Qwikshop application using the shared asset management system.

## Quick Start Guide

### 1. Get the Assets
1. Download the `assets` folder from the following location:
   ```
   https://drive.google.com/drive/folders/1OW4rppv40UoOdQJ5SMEvRygxtJEgOpDZ?usp=drive_link
   ```
   Note: This is a placeholder link. Your team will provide the actual link.

### 2. Place the Assets
The `assets` folder should be placed in the test profile(s) you want to use:

```
digiworld/data/com.andojoqwikshop.sbx/
├── test-profile-1/
│   └── mockdata/assets/  👈 Place the assets folder here
├── test-profile-2/
│   └── mockdata/assets/  👈 Or here
├── test-profile-3/
│   └── mockdata/assets/  👈 Or here
└── ...
```

⚠️ Important Notes:
- The downloaded `assets` folder contains EVERYTHING needed - just place it directly in the `mockdata` directory
- No need to modify the folder structure - it's already organized correctly
- You can place the same assets folder in multiple test profiles if needed
- Make sure you don't rename any folders or files

## Test Profiles

The application supports multiple test profiles, each with its own set of assets. Choose which test profile(s) you want to use based on your testing needs.

### Directory Structure
Each test profile follows this exact structure:
```
test-profile-{i}/
└── mockdata/
    └── assets/
        ├── products/
        │   └── {productId}/
        │       ├── main.jpg
        │       ├── gallery_1.jpg
        │       └── ...
        └── avatars/
            ├── avatar_1.jpg
            └── ...
```

## Asset Types

### Product Images

Each product has:
- One main product image (`main.jpg`)
- Multiple gallery images (`gallery_1.jpg`, `gallery_2.jpg`, etc.)

#### Usage Example
```typescript
// Get main product image
const mainImagePath = await assetManager.getAssetPath({
  appName: "qwikshop",
  entityType: "products",
  entityId: productId,
  assetType: "image",
  imageConfig: { type: "main" }
});
```

### User Avatars

Each user has a single avatar image.

#### Usage Example
```typescript
const avatarPath = await assetManager.getAssetPath({
  appName: "qwikshop",
  entityType: "avatars",
  entityId: userId,
  assetType: "image",
  imageConfig: { type: "main" }
});
```

## Components

### ProductImage Component
```typescript
import { Image } from 'react-native';
import { AssetManager } from '@andojo/shared-asset-management';

interface ProductImageProps {
  productId: string;
  isGallery?: boolean;
  galleryIndex?: number;
  style?: StyleProp<ImageStyle>;
}

export function ProductImage({ productId, isGallery, galleryIndex, style }: ProductImageProps) {
  const [imagePath, setImagePath] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const path = await AssetManager.getInstance().getAssetPath({
        appName: "qwikshop",
        entityType: "products",
        entityId: productId,
        assetType: "image",
        imageConfig: {
          type: isGallery ? "gallery" : "main",
          index: galleryIndex
        }
      });
      setImagePath(path);
    };
    loadImage();
  }, [productId, isGallery, galleryIndex]);

  if (!imagePath) return null;
  return <Image source={{ uri: imagePath }} style={style} />;
}
```

### UserAvatar Component
```typescript
export function UserAvatar({ userId, style }: UserAvatarProps) {
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      const path = await AssetManager.getInstance().getAssetPath({
        appName: "qwikshop",
        entityType: "avatars",
        entityId: userId,
        assetType: "image",
        imageConfig: { type: "main" }
      });
      setAvatarPath(path);
    };
    loadAvatar();
  }, [userId]);

  if (!avatarPath) return null;
  return <Image source={{ uri: avatarPath }} style={style} />;
}
```

## Troubleshooting

### Image Not Showing?

1. Check the Basics:
   - Is the `assets` folder in the correct location?
   - Are you using the right test profile?
   - Did you rename any folders or files?

2. Verify the Path:
   ```
   digiworld/data/com.andojoqwikshop.sbx/test-profile-{i}/mockdata/assets/
   ```
   - Replace `{i}` with your test profile number
   - Make sure all folder names match exactly

3. Common Fixes:
   - Don't modify the folder structure
   - Don't rename any files
   - If in doubt, re-download and replace the entire `assets` folder

### Still Having Issues?

1. Check file permissions
2. Verify the test profile is correctly selected in your app
3. Make sure all image files are valid (not corrupted during download)
4. Try using a different test profile to isolate the issue

## Best Practices

1. **Keep It Simple**:
   - Just download and place the `assets` folder - don't modify it
   - Use the same assets across test profiles if unsure
   - Don't try to reorganize the folder structure

2. **Test Profile Usage**:
   - Document which test profiles you're using
   - Keep track of which profiles have assets
   - Consider versioning test profile assets

3. **Code Usage**:
   - Use the provided components (`ProductImage`, `UserAvatar`)
   - Handle null image paths gracefully
   - Implement loading states
   - Use appropriate error fallbacks

## Common Issues and Solutions

### Missing Images

If an image fails to load:
1. Check if the file exists in the correct test profile directory
2. Verify the entity ID is correct
3. Ensure the image type (main/gallery) is specified correctly
4. Check file permissions
5. Verify the test profile is correctly selected

### Performance Issues

If image loading is slow:
1. Implement image caching
2. Optimize image sizes
3. Use lazy loading for gallery images
4. Consider implementing progressive image loading

## Migration Guide

When migrating from the old asset system:

1. Replace direct file path references with AssetManager calls
2. Update image components to use the new system
3. Verify all image paths are correctly mapped
4. Test thoroughly with different asset types and test profiles
5. Ensure the download script correctly populates all test profiles 