import { AppName, EntityType, AssetType, AssetConfigType } from './enums'

export * from './enums'

export interface AssetFolderConfig {
  name: EntityType
  path?: string
  filePattern: {
    main?: string
    prefix?: string
    suffix?: string
    gallery?: string
  }
}

export interface AssetConfig {
  appName: AppName
  entityType: EntityType
  entityId: string
  assetType: AssetType
  assetConfig: {
    type: AssetConfigType
    index?: number
  }
}
