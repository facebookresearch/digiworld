// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Theme Loader Utility
 *
 * Handles loading theme configuration from device storage.
 * Theme is always stored as 'theme.json' - single file approach.
 */

import * as RNFS from 'react-native-fs'
import { Platform } from 'react-native'
import { ThemeConfig } from '@andojo/shared-theme'

const THEME_FILE = 'theme.json'
const THEME_DIR = Platform.select({
  android: `${RNFS.ExternalDirectoryPath}/themes`,
  ios: `${RNFS.DocumentDirectoryPath}/themes`,
  default: '',
})

/**
 * Load theme configuration from device storage
 * Always reads from theme.json (single file)
 */
export async function loadActiveTheme(): Promise<ThemeConfig | null> {
  try {
    const themeFile = `${THEME_DIR}/${THEME_FILE}`

    const exists = await RNFS.exists(themeFile)
    if (!exists) {
      console.log('No custom theme found, using default')
      return null
    }

    const content = await RNFS.readFile(themeFile, 'utf8')
    const config = JSON.parse(content) as ThemeConfig

    console.log(`✅ Theme loaded: ${config.name}`)
    return config
  } catch (error) {
    console.error('Failed to load theme:', error)
    return null
  }
}

/**
 * Check if custom theme exists on device
 */
export async function hasCustomTheme(): Promise<boolean> {
  try {
    const themeFile = `${THEME_DIR}/${THEME_FILE}`
    return await RNFS.exists(themeFile)
  } catch (error) {
    return false
  }
}
