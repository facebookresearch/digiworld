import { DeviceEventEmitter, Image, ImageStyle, StyleProp } from 'react-native'
import RNFS from 'react-native-fs'
import {
  AssetConfigType,
  AssetType,
  EntityType,
} from '@andojo/shared-asset-management'
import { useEffect, useState } from 'react'
import assetManager from '@/utils/assetManager'

interface VideoThumbnailImageProps {
  entityId: string | number
  style?: StyleProp<ImageStyle>
  defaultSource?: any
  thumbnailUrl?: string
}

const videoPlaceholder = require('../../assets/images/album_placeholder.jpg')
const VIDEO_ASSETS_REFRESHED_EVENT = 'videoAssetsRefreshed'

export function VideoThumbnailImage({
  entityId,
  style,
  defaultSource,
  thumbnailUrl,
}: VideoThumbnailImageProps) {
  const [imageSource, setImageSource] = useState<any>(null)
  const [assetVersion, setAssetVersion] = useState(0)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      VIDEO_ASSETS_REFRESHED_EVENT,
      () => setAssetVersion(Date.now()),
    )

    return () => {
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    const getImageSource = async () => {
      // If thumbnailUrl starts with 'data:', render it directly
      if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
        setImageSource({ uri: thumbnailUrl })
        return
      }

      // Otherwise, use asset manager to check if image exists on path
      const path = await assetManager.getAssetPath({
        entityType: EntityType.VIDEOS,
        entityId: Number(entityId),
        assetType: AssetType.IMAGE,
        assetConfig: {
          type: AssetConfigType.MAIN,
        },
      })

      if (path) {
        const cacheDir = `${RNFS.CachesDirectoryPath}/video-image-cache`
        const safeEntityId = String(entityId).replace(/[^a-zA-Z0-9_-]/g, '_')
        const cachePath = `${cacheDir}/${safeEntityId}-${assetVersion || Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.jpg`

        const cacheDirExists = await RNFS.exists(cacheDir)
        if (!cacheDirExists) {
          await RNFS.mkdir(cacheDir)
        }

        await RNFS.copyFile(path, cachePath)
        setImageSource({ uri: `file://${cachePath}` })
      } else {
        // Fall back to placeholder
        setImageSource(defaultSource || videoPlaceholder)
      }
    }

    getImageSource()
  }, [entityId, thumbnailUrl, defaultSource, assetVersion])

  return (
    <Image
      source={imageSource}
      style={style}
      defaultSource={defaultSource || videoPlaceholder}
    />
  )
}
