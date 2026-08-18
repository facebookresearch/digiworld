// Copyright (c) Meta Platforms, Inc. and affiliates.
import assetManager from '@/utils/assetManager'
import {
  AssetConfigType,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management'
import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import RNFS from 'react-native-fs'

export const QWIKSHOP_ASSETS_REFRESHED_EVENT = 'qwikshopAssetsRefreshed'

let latestQwikshopAssetsVersion = Date.now()

export function notifyQwikshopAssetsRefreshed() {
  latestQwikshopAssetsVersion = Date.now()
  DeviceEventEmitter.emit(
    QWIKSHOP_ASSETS_REFRESHED_EVENT,
    latestQwikshopAssetsVersion,
  )
}

export function useQwikshopAssetsVersion() {
  const [assetVersion, setAssetVersion] = useState(latestQwikshopAssetsVersion)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      QWIKSHOP_ASSETS_REFRESHED_EVENT,
      (version: number) => setAssetVersion(version),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return assetVersion
}

export async function getCachedQwikshopAssetImageSource({
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
  const cacheDir = `${RNFS.CachesDirectoryPath}/qwikshop-image-cache`
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
