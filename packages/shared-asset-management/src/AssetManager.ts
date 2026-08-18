import RNFS from 'react-native-fs'
import {
  AppName,
  EntityType,
  AssetType,
  AssetConfigType,
  AssetFolderPattern,
  AssetFolderConfig,
  AssetConfig,
} from './types/enums'

export default class AssetManager {
  private static instance: AssetManager
  private baseDir: string
  private folderConfigs: Map<
    EntityType,
    { path: string; pattern: AssetFolderPattern; appName?: AppName }
  >

  private constructor(folders: AssetFolderConfig[]) {
    this.baseDir = `${RNFS.ExternalDirectoryPath}/mockdata/assets`
    this.folderConfigs = new Map()

    // Initialize with default patterns for known entity types
    const defaultConfigs: AssetFolderConfig[] = [
      // Food app configs
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
      {
        name: EntityType.CATEGORIES,
        appName: AppName.EATS,
        filePattern: {
          main: '{entityId}.png',
          suffix: '.png',
        },
      },
      {
        name: EntityType.MENU,
        appName: AppName.EATS,
        filePattern: {
          main: '{entityId}.png',
          suffix: '.png',
        },
      },
      {
        name: EntityType.RESTAURANTS,
        appName: AppName.EATS,
        filePattern: {
          main: '{entityId}.png',
          suffix: '.png',
        },
      },
      // Music app configs
      {
        name: EntityType.ARTISTS,
        appName: AppName.MUSIC,
        filePattern: {
          main: '{entityId}/main.jpg',
          suffix: '.jpg',
        },
      },
      {
        name: EntityType.ALBUMS,
        appName: AppName.MUSIC,
        filePattern: {
          main: '{entityId}/main.jpg',
          suffix: '.jpg',
        },
      },
      {
        name: EntityType.SONGS,
        appName: AppName.MUSIC,
        filePattern: {
          main: '{entityId}/main.jpg',
          suffix: '.jpg',
        },
      },
      {
        name: EntityType.MUSIC_CATEGORIES,
        appName: AppName.MUSIC,
        filePattern: {
          main: '{entityId}/main.jpg',
          suffix: '.jpg',
        },
      },
      {
        name: EntityType.PLAYLISTS,
        appName: AppName.MUSIC,
        filePattern: {
          main: '{entityId}/main.jpg',
          suffix: '.jpg',
        },
      },
      ...folders,
    ]

    defaultConfigs.forEach(folder => {
      const folderPath = folder.path || `${this.baseDir}/${folder.name}`
      this.folderConfigs.set(folder.name, {
        path: folderPath,
        pattern: folder.filePattern,
        appName: folder.appName,
      })
    })

    console.log('[AssetManager] initialised:', {
      baseDir: this.baseDir,
      folders: Object.fromEntries(this.folderConfigs),
    })
  }

  public static initialize(folders: AssetFolderConfig[]): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager(folders)
    }
    return AssetManager.instance
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      throw new Error('AssetManager not initialized. Call initialize() first.')
    }
    return AssetManager.instance
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(folderPath)
      if (!exists) {
        await RNFS.mkdir(folderPath)
      }
    } catch (error) {
      console.error(
        `[AssetManager] Error creating folder ${folderPath}:`,
        error,
      )
    }
  }

  private constructFileName(config: AssetConfig): string {
    const folderConfig = this.folderConfigs.get(config.entityType)
    if (!folderConfig) {
      console.warn(
        `[AssetManager] No config for entity type: ${config.entityType}`,
      )
      return `${config.entityId}.jpg`
    }

    const { pattern } = folderConfig

    // Handle specific entity types
    switch (config.entityType) {
      case EntityType.PRODUCTS:
        if (config.assetType === AssetType.IMAGE) {
          if (
            config.assetConfig?.type === AssetConfigType.GALLERY &&
            config.assetConfig.index !== undefined
          ) {
            return `${config.entityId}/gallery_${config.assetConfig.index}.jpg`
          }
          return `${config.entityId}/main.jpg`
        }
        break

      case EntityType.AVATARS:
        if (config.assetType === AssetType.IMAGE) {
          // Always use avatar_ prefix pattern for avatars regardless of app
          return `avatar_${config.entityId}${pattern.suffix || '.jpg'}`
        }
        break

      // Music app specific cases
      case EntityType.ARTISTS:
      case EntityType.ALBUMS:
      case EntityType.SONGS:
      case EntityType.MUSIC_CATEGORIES:
      case EntityType.PLAYLISTS:
      case EntityType.VIDEOS:
        if (config.assetType === AssetType.IMAGE) {
          return `${config.entityId}/main.jpg`
        }
        break

      default:
        // For other types, use the pattern system
        if (config.assetType === AssetType.IMAGE && config.assetConfig) {
          if (
            config.assetConfig.type === AssetConfigType.GALLERY &&
            pattern.gallery
          ) {
            return pattern.gallery
              .replace('{entityId}', config.entityId.toString())
              .replace('{index}', config.assetConfig.index?.toString() || '1')
          }
          if (pattern.main) {
            return pattern.main.replace(
              '{entityId}',
              config.entityId.toString(),
            )
          }
        }
    }

    // Fallback to a basic pattern
    const prefix = pattern.prefix || ''
    const suffix = pattern.suffix || '.jpg'
    return `${prefix}${config.entityId}${suffix}`
  }

  public async getAssetPath(config: AssetConfig): Promise<string | null> {
    const folderConfig = this.folderConfigs.get(config.entityType)
    if (!folderConfig) {
      console.warn(`[AssetManager] Unknown entity type: ${config.entityType}`)
      return null
    }

    // For products, ensure the entity ID subfolder exists
    if (config.entityType === EntityType.PRODUCTS) {
      const productFolder = `${folderConfig.path}/${config.entityId}`
      await this.ensureFolderExists(productFolder)
    }

    const fileName = this.constructFileName(config)
    const filePath = `${folderConfig.path}/${fileName}`
    if (config.entityType === EntityType.MENU) {
      console.log('fileName', fileName, filePath)
    }

    try {
      const exists = await RNFS.exists(filePath)
      return exists ? filePath : null
    } catch (error) {
      console.error(`[AssetManager] Error checking file ${filePath}:`, error)
      return null
    }
  }

  public getFolderPath(entityType: EntityType): string | null {
    return this.folderConfigs.get(entityType)?.path || null
  }
}
