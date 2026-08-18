import {
  AppName,
  AssetManager,
  EntityType,
} from '@andojo/shared-asset-management'

// Initialize AssetManager with the folders we want to handle
const assetManager = AssetManager.initialize([
  {
    name: EntityType.MENU,
    appName: AppName.RYDE,
    filePattern: {
      main: '{entityId}.png',
    },
  },
  {
    name: EntityType.RESTAURANTS,
    appName: AppName.RYDE,
    filePattern: {
      main: '{entityId}.png',
    },
  },
  {
    name: EntityType.CATEGORIES,
    appName: AppName.RYDE,
    filePattern: {
      main: '{entityId}.png',
    },
  },
  // { name: "contacts" },
  // We can add more folders as needed, for now only these are used
])

// Make sure this file is imported early in the app initialization
export default assetManager
