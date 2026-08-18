// Copyright (c) Meta Platforms, Inc. and affiliates.
export const MAX_BUNDLED_AVATARS = 15 // Number of bundled avatar images

export type AssetType = 'image' | 'avatar'

export type ImageType = 'main' | 'gallery'

export type AvatarSource = 'bundled' | 'dynamic'

export interface AssetConfig {
  appName: string
  entityType: string
  entityId: string | number
  assetType: AssetType
  imageConfig?: ImageConfig
  avatarConfig?: AvatarConfig
}

export interface AvatarConfig {
  source: 'dynamic' | 'bundled'
  path?: string
}

export interface ImageConfig {
  type: ImageType
  galleryIndex?: number
}

export class UnsupportedAssetTypeError extends Error {
  constructor(assetType: string) {
    super(`Unsupported asset type: ${assetType}`)
    this.name = 'UnsupportedAssetTypeError'
  }
}
