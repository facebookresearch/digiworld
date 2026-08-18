// Copyright (c) Meta Platforms, Inc. and affiliates.
import { AssetConfig } from '../types/enums'
import AssetManager from '../AssetManager'

/**
 * Resolves the local path for an asset based on the provided configuration
 * @param config - Asset configuration including entity type, ID, and optional image configuration
 * @returns Promise resolving to an object containing the local path (null if resolution fails)
 */
export async function resolveAssetPath(
  config: AssetConfig,
): Promise<{ localPath: string | null }> {
  try {
    const assetManager = AssetManager.getInstance()
    const localPath = await assetManager.getAssetPath(config)
    return { localPath }
  } catch (err) {
    console.error('[resolveAssetPath] Error:', err)
    return { localPath: null }
  }
}
