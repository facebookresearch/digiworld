// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Asset } from 'expo-asset'
import * as RNFS from 'react-native-fs'
import { unzip } from 'react-native-zip-archive'
import { externalPaths } from './constants'

export const ensureTilesReady = async () => {
  // First check if tiles exist at the expected location
  const tilesExist = await RNFS.exists(externalPaths.defaultTiles)
  console.log(
    'Checking tiles directory at:',
    externalPaths.defaultTiles,
    'exists:',
    tilesExist,
  )

  if (tilesExist) {
    console.log('Using existing tiles from:', externalPaths.defaultTiles)
    return
  }

  // Ensure required directories exist
  const mockDataExists = await RNFS.exists(externalPaths.mockData)
  if (!mockDataExists) {
    console.log('Creating required directory:', externalPaths.mockData)
    await RNFS.mkdir(externalPaths.mockData)
  }

  const assetsExists = await RNFS.exists(externalPaths.defaultTiles)
  if (!assetsExists) {
    console.log('Creating required directory:', externalPaths.defaultTiles)
    await RNFS.mkdir(externalPaths.assets)
  }

  // Download and extract tiles
  console.log(
    'Loading tiles from bundled asset:',
    '../../assets/maps/default/tiles.zip',
  )
  const zipAsset = Asset.fromModule(
    require('../../assets/maps/default/tiles.zip'),
  )
  await zipAsset.downloadAsync()

  try {
    // Create tiles directory if it doesn't exist
    await RNFS.mkdir(externalPaths.assets)
    console.log('Created directory for extraction:', externalPaths.defaultTiles)

    // Extract to the correct location
    console.log('Starting tiles extraction to:', externalPaths.defaultTiles)
    const result = await unzip(zipAsset.localUri!, externalPaths.defaultTiles)
    console.log('Successfully extracted tiles to:', result)
  } catch (err) {
    console.error(
      'Failed to extract tiles to',
      externalPaths.assets,
      'Error:',
      err,
    )
    // Try to clean up failed extraction
    try {
      if (await RNFS.exists(externalPaths.assets)) {
        console.log('Cleaning up failed extraction at:', externalPaths.assets)
        await RNFS.unlink(externalPaths.assets)
      }
    } catch (cleanupErr) {
      console.error(
        'Failed to clean up extraction at',
        externalPaths.assets,
        'Error:',
        cleanupErr,
      )
    }
  }
}
