// Copyright (c) Meta Platforms, Inc. and affiliates.
import { AssetManager, EntityType } from '@andojo/shared-asset-management'

// Initialize AssetManager with the folders we want to handle
const assetManager = AssetManager.initialize([
  {
    name: EntityType.PRODUCTS,
    filePattern: {
      main: '{entityId}/main.jpg',
      gallery: 'gallery_{index}.jpg',
    },
  },
  {
    name: EntityType.AVATARS,
    filePattern: {
      main: '{entityId}.jpg',
    },
  },
  // { name: "contacts" },
  // We can add more folders as needed, for now only these are used
])

// Make sure this file is imported early in the app initialization
export default assetManager
