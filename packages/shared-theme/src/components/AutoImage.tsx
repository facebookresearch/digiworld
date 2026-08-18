import { useLayoutEffect, useState } from 'react'
import { Image as GlueImage } from '@gluestack-ui/themed'
import { Image, ImageProps, Platform } from 'react-native'

export interface AutoImageProps extends Omit<ImageProps, 'source'> {
  /**
   * The source URI for the image
   */
  source: string | { uri: string; headers?: { [key: string]: string } }
  /**
   * How wide should the image be?
   */
  maxWidth?: number
  /**
   * How tall should the image be?
   */
  maxHeight?: number
}

/**
 * A hook that will return the scaled dimensions of an image based on the
 * provided dimensions' aspect ratio.
 */
export function useAutoImage(
  source: string | { uri: string; headers?: { [key: string]: string } },
  dimensions?: [maxWidth?: number, maxHeight?: number],
): [width: number, height: number] {
  const [[width, height], setImageDimensions] = useState([0, 0])
  const uri = typeof source === 'string' ? source : source.uri
  const headers = typeof source === 'object' ? source.headers : undefined

  useLayoutEffect(() => {
    if (!uri) return

    if (Platform.OS === 'web') {
      ;(Image as any).getSize(uri, (w: number, h: number) =>
        setImageDimensions([w, h]),
      )
    } else {
      const getSize = headers
        ? (callback: (w: number, h: number) => void) =>
            (Image as any).getSizeWithHeaders(uri, headers, callback)
        : (callback: (w: number, h: number) => void) =>
            (Image as any).getSize(uri, callback)

      getSize((w: number, h: number) => setImageDimensions([w, h]))
    }
  }, [uri, headers])

  const aspectRatio = width / height

  if (Number.isNaN(aspectRatio)) return [0, 0]

  const [maxWidth, maxHeight] = dimensions ?? []

  if (maxWidth && maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height)
    return [width * scale, height * scale]
  } else if (maxWidth) {
    return [maxWidth, maxWidth / aspectRatio]
  } else if (maxHeight) {
    return [maxHeight * aspectRatio, maxHeight]
  }

  return [width, height]
}

/**
 * An Image component that automatically sizes a remote or data-uri image.
 */
export function AutoImage({
  source,
  maxWidth,
  maxHeight,
  ...props
}: AutoImageProps) {
  const uri = typeof source === 'string' ? source : source.uri
  const [width, height] = useAutoImage(
    Platform.select({
      web: uri,
      default: source,
    }),
    [maxWidth, maxHeight],
  )

  return (
    <GlueImage
      {...props}
      source={typeof source === 'string' ? { uri: source } : source}
      alt={props.alt || 'image'}
      style={[{ width, height }, props.style]}
    />
  )
}
