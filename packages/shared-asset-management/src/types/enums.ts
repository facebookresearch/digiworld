// Copyright (c) Meta Platforms, Inc. and affiliates.
export enum AppName {
  EATS = 'eats',
  MUSIC = 'music',
  SHOP = 'shop',
  EMAIL = 'email',
  PAYMENT = 'payment',
  RYDE = 'ryde',
  MESSAGE = 'message',
  VIDEO = 'video',
}

export enum EntityType {
  // Food app entities
  PRODUCTS = 'products',
  AVATARS = 'avatars',
  CATEGORIES = 'categories',
  MENU = 'menu',
  RESTAURANTS = 'restaurants',

  // Music app entities
  ARTISTS = 'artists',
  ALBUMS = 'albums',
  SONGS = 'songs',
  MUSIC_CATEGORIES = 'music_categories',
  PLAYLISTS = 'playlists',

  // Video app entities
  VIDEOS = 'videos',
  CHANNELS = 'channels',
  VIDEO_PLAYLISTS = 'video_playlists',
}

export enum AssetType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum AssetConfigType {
  MAIN = 'main',
  GALLERY = 'gallery',
  THUMBNAIL = 'thumbnail',
}

export interface AssetFolderPattern {
  prefix?: string
  main?: string
  gallery?: string
  suffix?: string
}

export interface AssetFolderConfig {
  name: EntityType
  appName?: AppName
  path?: string
  filePattern: AssetFolderPattern
}

export interface AssetConfig {
  entityType: EntityType
  entityId: number
  assetType: AssetType
  assetConfig?: {
    type: AssetConfigType
    index?: number
  }
}
