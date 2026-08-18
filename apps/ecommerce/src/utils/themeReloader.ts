// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Theme Reloader Utility
 *
 * Provides a bridge between the deeplink handler (which runs outside React context)
 * and the ThemeProvider context for hot theme reloading.
 */

import { ThemeConfig } from '@andojo/shared-theme'

// Simple event emitter using callbacks (React Native compatible)
type ThemeReloadCallback = (themeConfig: ThemeConfig) => void
const listeners: Set<ThemeReloadCallback> = new Set()

/**
 * Request a theme reload with the given configuration
 * This can be called from anywhere (including deeplink handler)
 */
export function requestThemeReload(themeConfig: ThemeConfig): void {
  if (__DEV__) {
    console.log(`🔄 Theme reload requested: ${themeConfig.name}`)
  }
  // Notify all listeners
  listeners.forEach(callback => {
    try {
      callback(themeConfig)
    } catch (error) {
      console.error('Error in theme reload callback:', error)
    }
  })
}

/**
 * Subscribe to theme reload events
 * Returns an unsubscribe function
 */
export function subscribeToThemeReload(
  callback: ThemeReloadCallback,
): () => void {
  listeners.add(callback)

  // Return unsubscribe function
  return () => {
    listeners.delete(callback)
  }
}
