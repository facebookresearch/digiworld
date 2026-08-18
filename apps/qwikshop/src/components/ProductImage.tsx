// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Image, ImageStyle, StyleProp } from 'react-native'
import { AssetConfigType } from '@andojo/shared-asset-management'
import { useEffect, useRef, useState } from 'react'
import {
  getCachedQwikshopAssetImageSource,
  useQwikshopAssetsVersion,
} from '@/utils/assetImageRefresh'

interface ProductImageProps {
  productId: string | number
  isGallery?: boolean
  galleryIndex?: number
  style?: StyleProp<ImageStyle>
  defaultSource?: any
}

export function ProductImage({
  productId,
  isGallery,
  galleryIndex,
  style,
  defaultSource,
}: ProductImageProps) {
  const [imageSource, setImageSource] = useState<any>(null)
  const assetVersion = useQwikshopAssetsVersion()
  const loadRequestRef = useRef(0)

  // Get path from asset manager
  useEffect(() => {
    let isCurrent = true
    const requestId = loadRequestRef.current + 1
    loadRequestRef.current = requestId

    const getPath = async () => {
      const source = await getCachedQwikshopAssetImageSource({
        productId,
        fallback: defaultSource || null,
        assetVersion,
        assetConfigType: isGallery
          ? AssetConfigType.GALLERY
          : AssetConfigType.MAIN,
        galleryIndex,
      })

      if (isCurrent && requestId === loadRequestRef.current) {
        setImageSource(source)
      }
    }

    getPath()
    return () => {
      isCurrent = false
    }
  }, [productId, isGallery, galleryIndex, defaultSource, assetVersion])

  return (
    <Image
      key={
        imageSource?.uri
          ? String(imageSource.uri)
          : `placeholder-${assetVersion}`
      }
      source={imageSource || defaultSource}
      style={style}
      defaultSource={defaultSource}
    />
  )
}
