import assetManager from '@/utils/assetManager'
import {
  AssetConfigType,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management/src/types/enums'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import RNFS from 'react-native-fs'

export const EATS_ASSETS_REFRESHED_EVENT = 'eatsAssetsRefreshed'

let latestEatsAssetsVersion = Date.now()

export function notifyEatsAssetsRefreshed() {
  latestEatsAssetsVersion = Date.now()
  DeviceEventEmitter.emit(EATS_ASSETS_REFRESHED_EVENT, latestEatsAssetsVersion)
}

export function useEatsAssetsVersion() {
  const [assetVersion, setAssetVersion] = useState(latestEatsAssetsVersion)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      EATS_ASSETS_REFRESHED_EVENT,
      (version: number) => setAssetVersion(version),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return assetVersion
}

export async function getCachedAssetImageSource(
  entityType: EntityType,
  entityId: string | number,
  fallback: any,
  assetVersion = 0,
) {
  const numericEntityId =
    typeof entityId === 'number' ? entityId : Number(entityId)
  const path = await assetManager.getAssetPath({
    entityType,
    entityId: numericEntityId,
    assetType: AssetType.IMAGE,
    assetConfig: { type: AssetConfigType.MAIN },
  })

  if (!path) {
    return fallback
  }

  if (path.startsWith('http')) {
    return { uri: path }
  }

  const sourcePath = path.replace(/^file:\/\//, '')
  const extension = sourcePath.split('.').pop() || 'png'
  const cacheDir = `${RNFS.CachesDirectoryPath}/eats-image-cache`
  const safeEntityId = String(entityId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const cachePath = `${cacheDir}/${entityType}-${safeEntityId}-${assetVersion || 0}.${extension}`

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
