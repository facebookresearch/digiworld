import assetManager from '@/utils/assetManager'
import {
  AssetConfigType,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import RNFS from 'react-native-fs'

export const ECOMMERCE_ASSETS_REFRESHED_EVENT = 'ecommerceAssetsRefreshed'

let latestEcommerceAssetsVersion = Date.now()

export function notifyEcommerceAssetsRefreshed() {
  latestEcommerceAssetsVersion = Date.now()
  DeviceEventEmitter.emit(
    ECOMMERCE_ASSETS_REFRESHED_EVENT,
    latestEcommerceAssetsVersion,
  )
}

export function useEcommerceAssetsVersion() {
  const [assetVersion, setAssetVersion] = useState(latestEcommerceAssetsVersion)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      ECOMMERCE_ASSETS_REFRESHED_EVENT,
      (version: number) => setAssetVersion(version),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return assetVersion
}

export async function getCachedEcommerceAssetImageSource({
  productId,
  fallback,
  assetVersion,
  assetConfigType,
  galleryIndex,
}: {
  productId: string | number
  fallback: any
  assetVersion: number
  assetConfigType: AssetConfigType
  galleryIndex?: number
}) {
  const path = await assetManager.getAssetPath({
    entityType: EntityType.PRODUCTS,
    entityId: Number(productId),
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
  const cacheDir = `${RNFS.CachesDirectoryPath}/ecommerce-image-cache`
  const safeProductId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const cachePath = `${cacheDir}/products-${safeProductId}-${assetConfigType}-${galleryIndex ?? 'main'}-${assetVersion || 0}.${extension}`

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
