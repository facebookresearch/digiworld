// Copyright (c) Meta Platforms, Inc. and affiliates.
// Import the specific video themes
import videoLightTheme from '../../../../packages/shared-theme/src/themes/light/video'
import videoDarkTheme from '../../../../packages/shared-theme/src/themes/dark/video'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the video themes as the default themes
export const lightTheme = videoLightTheme
export const darkTheme = videoDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
