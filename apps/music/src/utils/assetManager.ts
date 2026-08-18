import {
  AssetManager,
  EntityType,
  AppName,
} from '@andojo/shared-asset-management'

// Initialize AssetManager with music-specific folders
// All entities follow the same pattern: $entity_type/$entity_id/main.jpg
// Except avatars which follow: assets/avatars/avatar_${entityId}.jpg
const assetManager = AssetManager.initialize([
  {
    name: EntityType.ARTISTS,
    appName: AppName.MUSIC,
    filePattern: {
      main: 'main.jpg',
      gallery: 'gallery_{index}.jpg',
    },
  },
  {
    name: EntityType.ALBUMS,
    appName: AppName.MUSIC,
    filePattern: {
      main: 'main.jpg',
      gallery: 'gallery_{index}.jpg',
    },
  },
  {
    name: EntityType.SONGS,
    appName: AppName.MUSIC,
    filePattern: {
      main: 'main.jpg',
    },
  },
  {
    name: EntityType.PLAYLISTS,
    appName: AppName.MUSIC,
    filePattern: {
      main: 'main.jpg',
    },
  },
  {
    name: EntityType.AVATARS,
    appName: AppName.MUSIC,
    filePattern: {
      prefix: 'avatar_',
      main: '{entityId}.jpg',
      suffix: '.jpg',
    },
  },
  {
    name: EntityType.MUSIC_CATEGORIES,
    appName: AppName.MUSIC,
    filePattern: {
      main: 'main.jpg',
    },
  },
])

export default assetManager
