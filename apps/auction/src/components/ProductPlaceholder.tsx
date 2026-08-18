// ProductPlaceholder.tsx
import React, { memo, useState, useEffect, useMemo, useRef } from 'react'
import { View, StyleSheet, Image, ImageStyle } from 'react-native'
import { EntityType } from '@andojo/shared-asset-management'
import {
  getCachedAuctionAssetImageSource,
  useAuctionAssetsVersion,
} from '@/utils/assetImageRefresh'

// Placeholder image from assets
const itemPlaceholder = require('../../assets/images/item_placeholder.jpg')

// COMMENTED OUT: Skia implementation for future use
/*
import {
  Canvas,
  Rect,
  Circle,
  Path,
  LinearGradient,
  vec,
  Skia,
} from '@shopify/react-native-skia'

const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit int
  }
  return Math.abs(hash)
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const GradientPattern = ({ color1, color2, width, height }: any) => (
  <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient
      start={vec(0, 0)}
      end={vec(width, height)}
      colors={[color1, color2]}
    />
  </Rect>
)

const ShapesPattern = ({ seed, color1, color2, width, height }: any) => {
  const elements = Array.from({ length: 6 }, (_, i) => ({
    x: seededRandom(seed + i) * width,
    y: seededRandom(seed * i + 1) * height,
    r: 15 + seededRandom(seed + i * 7) * 30,
    color: i % 2 === 0 ? color1 : color2,
    opacity: 0.5 + seededRandom(seed + i) * 0.5,
  }))

  return (
    <>
      {elements.map((s, i) => (
        <Circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          color={`${s.color}${Math.floor(s.opacity * 255).toString(16)}`}
        />
      ))}
    </>
  )
}

const WavesPattern = ({ seed, color1, color2, width, height }: any) => {
  const path = Skia.Path.Make()
  const amplitude = 15 + seededRandom(seed) * 20
  const freq = 0.02 + seededRandom(seed + 5) * 0.04

  path.moveTo(0, height / 2)
  for (let x = 0; x <= width; x += 10) {
    const y = height / 2 + Math.sin((x * freq + seed) * Math.PI * 2) * amplitude
    path.lineTo(x, y)
  }
  path.lineTo(width, height)
  path.lineTo(0, height)
  path.close()

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} color={color1} />
      <Path path={path} color={color2} />
    </>
  )
}
*/

type Props = {
  seed: string | number
  size?: number
  borderRadius?: number
  themeVariant?: string
  itemId?: number // Optional item ID to load item-specific image
  style?: ImageStyle
  fallbackSource?: any
}

export const ProductPlaceholder = memo(
  ({ size, borderRadius = 12, itemId, style, fallbackSource }: Props) => {
    const fallbackKey = fallbackSource?.uri || 'placeholder'
    const fallbackImage = useMemo(
      () => fallbackSource || itemPlaceholder,
      [fallbackKey, fallbackSource],
    )
    const [imageSource, setImageSource] = useState<any>(fallbackImage)
    const assetVersion = useAuctionAssetsVersion()
    const loadRequestRef = useRef(0)

    useEffect(() => {
      let isCurrent = true
      const requestId = loadRequestRef.current + 1
      loadRequestRef.current = requestId

      const loadImage = async () => {
        // If itemId is provided, try to load item-specific image
        if (itemId) {
          try {
            const source = await getCachedAuctionAssetImageSource(
              EntityType.PRODUCTS,
              itemId,
              fallbackImage,
              assetVersion,
            )
            if (isCurrent && requestId === loadRequestRef.current) {
              setImageSource(source)
            }
            return
          } catch (error) {
            // If asset not found, fall back to placeholder
            console.debug(
              `ProductPlaceholder: Image not found for item ${itemId}, using placeholder`,
            )
          }
        }

        // Fall back to placeholder
        if (isCurrent && requestId === loadRequestRef.current) {
          setImageSource(fallbackImage)
        }
      }

      loadImage()
      return () => {
        isCurrent = false
      }
    }, [itemId, assetVersion, fallbackImage])

    const imageStyle: ImageStyle = {
      width: size || '100%',
      height: size || '100%',
      borderRadius,
      ...style,
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          key={
            imageSource?.uri
              ? String(imageSource.uri)
              : `placeholder-${assetVersion}`
          }
          source={imageSource}
          style={imageStyle}
          resizeMode="cover"
          defaultSource={fallbackImage}
        />
      </View>
    )
  },
)
