// Copyright (c) Meta Platforms, Inc. and affiliates.
import { ImageSourcePropType } from 'react-native'

export type EntityType = 'products' | 'avatars'

export function resolveImageSource(
  localPath: string | undefined,
  entityType: 'product' | 'avatar',
): { source: ImageSourcePropType | null; loading?: boolean } {
  // If we have a local path from asset manager, use it directly
  if (localPath) {
    return {
      source: { uri: `file://${localPath}` },
      loading: false,
    }
  }

  // Otherwise check the lookup map for bundled assets
  try {
    if (entityType === 'product') {
      return {
        source: require('../assets/images/placeholder_product.jpg'),
        loading: false,
      }
    } else if (entityType === 'avatar') {
      // If specific avatar not found, use a default
      return {
        source: require('../assets/images/placeholder_avatar.jpg'),
        loading: false,
      }
    } else {
      return {
        source: require('../assets/images/placeholder_product.jpg'),
        loading: false,
      }
    }
  } catch (error) {
    console.error('Error loading bundled image:', error)
  }

  return { source: null, loading: false }
}
