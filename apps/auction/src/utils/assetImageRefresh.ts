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

export const AUCTION_ASSETS_REFRESHED_EVENT = 'auctionAssetsRefreshed'

let latestAuctionAssetsVersion = Date.now()

export function notifyAuctionAssetsRefreshed() {
  latestAuctionAssetsVersion = Date.now()
  DeviceEventEmitter.emit(
    AUCTION_ASSETS_REFRESHED_EVENT,
    latestAuctionAssetsVersion,
  )
}

export function useAuctionAssetsVersion() {
  const [assetVersion, setAssetVersion] = useState(latestAuctionAssetsVersion)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      AUCTION_ASSETS_REFRESHED_EVENT,
      (version: number) => setAssetVersion(version),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return assetVersion
}

export async function getCachedAuctionAssetImageSource(
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
  const extension = sourcePath.split('.').pop() || 'jpg'
  const cacheDir = `${RNFS.CachesDirectoryPath}/auction-image-cache`
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
