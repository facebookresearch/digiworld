import assetManager from '@/utils/assetManager'
import {
  AssetConfigType,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import RNFS from 'react-native-fs'

export const MUSIC_ASSETS_REFRESHED_EVENT = 'musicAssetsRefreshed'

let latestMusicAssetsVersion = Date.now()

export function notifyMusicAssetsRefreshed() {
  latestMusicAssetsVersion = Date.now()
  DeviceEventEmitter.emit(
    MUSIC_ASSETS_REFRESHED_EVENT,
    latestMusicAssetsVersion,
  )
}

export function useMusicAssetsVersion() {
  const [assetVersion, setAssetVersion] = useState(latestMusicAssetsVersion)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      MUSIC_ASSETS_REFRESHED_EVENT,
      (version: number) => setAssetVersion(version),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return assetVersion
}

export async function getCachedMusicAssetImageSource({
  entityType,
  entityId,
  fallback,
  assetVersion,
  assetConfigType,
  galleryIndex,
}: {
  entityType: EntityType
  entityId: string | number
  fallback: any
  assetVersion: number
  assetConfigType: AssetConfigType
  galleryIndex?: number
}) {
  const path = await assetManager.getAssetPath({
    entityType,
    entityId: Number(entityId),
    assetType: AssetType.IMAGE,
    assetConfig: {
      type: assetConfigType,
      index: galleryIndex,
    },
  })

  if (!path) {
    return fallback
  }

  if (path.startsWith('http')) {
    return { uri: path }
  }

  const sourcePath = path.replace(/^file:\/\//, '')
  const extension = sourcePath.split('.').pop() || 'jpg'
  const cacheDir = `${RNFS.CachesDirectoryPath}/music-image-cache`
  const safeEntityId = String(entityId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const cachePath = `${cacheDir}/${entityType}-${safeEntityId}-${assetConfigType}-${galleryIndex ?? 'main'}-${assetVersion || 0}.${extension}`

  const cacheDirExists = await RNFS.exists(cacheDir)
  if (!cacheDirExists) {
    await RNFS.mkdir(cacheDir)
  }

  const cacheFileExists = await RNFS.exists(cachePath)
  if (cacheFileExists) {
    await RNFS.unlink(cachePath)
  }

  await RNFS.copyFile(sourcePath, cachePath)
  return { uri: `file://${cachePath}` }
}
