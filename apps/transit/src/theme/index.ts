// Copyright (c) Meta Platforms, Inc. and affiliates.
// Import the specific transit themes
import transitLightTheme from '../../../../packages/shared-theme/src/themes/light/transit'
import transitDarkTheme from '../../../../packages/shared-theme/src/themes/dark/transit'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the transit themes as the default themes
export const lightTheme = transitLightTheme
export const darkTheme = transitDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
