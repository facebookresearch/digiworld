// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Image, ImageStyle, StyleProp } from 'react-native'
import { AssetConfigType, EntityType } from '@andojo/shared-asset-management'
import { useEffect, useState, useRef } from 'react'
import {
  getCachedMusicAssetImageSource,
  useMusicAssetsVersion,
} from '@/utils/assetImageRefresh'

interface MusicImageProps {
  entityType: EntityType
  entityId: string | number
  isGallery?: boolean
  galleryIndex?: number
  style?: StyleProp<ImageStyle>
  defaultSource?: any
  assetConfigType?: AssetConfigType
}

const defaultImages: Record<EntityType, any> = {
  [EntityType.ARTISTS]: require('../../assets/images/artist_placeholder.jpg'),
  [EntityType.ALBUMS]: require('../../assets/images/album_placeholder.jpg'),
  [EntityType.SONGS]: require('../../assets/images/album_placeholder.jpg'),
  [EntityType.PLAYLISTS]: require('../../assets/images/album_placeholder.jpg'),
  [EntityType.AVATARS]: require('../../assets/images/album_placeholder.jpg'),
  [EntityType.MUSIC_CATEGORIES]: require('../../assets/images/album_placeholder.jpg'),
  [EntityType.MENU]: null,
  [EntityType.RESTAURANTS]: null,
  [EntityType.PRODUCTS]: null, // Not used in music app
  [EntityType.CATEGORIES]: null,
}

export function MusicImage({
  entityType,
  entityId,
  isGallery,
  galleryIndex,
  style,
  defaultSource,
  assetConfigType = AssetConfigType.MAIN,
}: MusicImageProps) {
  const [imageSource, setImageSource] = useState<any>(null)
  const assetVersion = useMusicAssetsVersion()
  const loadRequestRef = useRef(0)

  useEffect(() => {
    let isCurrent = true
    const requestId = loadRequestRef.current + 1
    loadRequestRef.current = requestId

    const getPath = async () => {
      const source = await getCachedMusicAssetImageSource({
        entityType,
        entityId,
        fallback: defaultSource || defaultImages[entityType],
        assetVersion,
        assetConfigType: isGallery ? AssetConfigType.GALLERY : assetConfigType,
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
  }, [
    entityType,
    entityId,
    isGallery,
    galleryIndex,
    assetConfigType,
    defaultSource,
    assetVersion,
  ])

  return (
    <Image
      key={
        imageSource?.uri
          ? String(imageSource.uri)
          : `placeholder-${assetVersion}`
      }
      source={imageSource}
      style={style}
      defaultSource={defaultSource || defaultImages[entityType]}
    />
  )
}

// Convenience components for specific entity types
export function ArtistImage(props: Omit<MusicImageProps, 'entityType'>) {
  return (
    <MusicImage
      {...props}
      entityType={EntityType.ARTISTS}
      assetConfigType={AssetConfigType.MAIN}
    />
  )
}

export function AlbumImage(props: Omit<MusicImageProps, 'entityType'>) {
  return (
    <MusicImage
      {...props}
      entityType={EntityType.ALBUMS}
      assetConfigType={AssetConfigType.MAIN}
    />
  )
}

export function SongImage(props: Omit<MusicImageProps, 'entityType'>) {
  return (
    <MusicImage
      {...props}
      entityType={EntityType.SONGS}
      assetConfigType={AssetConfigType.MAIN}
    />
  )
}

export function PlaylistImage(props: Omit<MusicImageProps, 'entityType'>) {
  return (
    <MusicImage
      {...props}
      entityType={EntityType.PLAYLISTS}
      assetConfigType={AssetConfigType.MAIN}
    />
  )
}

export function AvatarImage(props: Omit<MusicImageProps, 'entityType'>) {
  console.log('AvatarImage props:', props)
  return (
    <MusicImage
      {...props}
      entityType={EntityType.AVATARS}
      assetConfigType={AssetConfigType.MAIN}
    />
  )
}

export function CategoryImage(props: Omit<MusicImageProps, 'entityType'>) {
  return <MusicImage {...props} entityType={EntityType.MUSIC_CATEGORIES} />
}
