import {
  AssetManager,
  EntityType,
  AppName,
} from '@andojo/shared-asset-management'

// Initialize AssetManager with auction-specific folders
// Items follow the shared products pattern: products/{itemId}/main.jpg
const assetManager = AssetManager.initialize([
  {
    name: EntityType.PRODUCTS,
    appName: AppName.SHOP,
    filePattern: {
      main: '{entityId}/main.jpg',
      gallery: '{entityId}/gallery_{index}.jpg',
      suffix: '.jpg',
    },
  },
  {
    name: EntityType.AVATARS,
    appName: AppName.SHOP,
    filePattern: {
      prefix: 'avatar_',
      main: '{entityId}.jpg',
      suffix: '.jpg',
    },
  },
])

export default assetManager
