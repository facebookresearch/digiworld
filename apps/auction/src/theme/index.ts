// Copyright (c) Meta Platforms, Inc. and affiliates.
// Import the specific auction themes
import auctionLightTheme from '../../../../packages/shared-theme/src/themes/light/auction'
import auctionDarkTheme from '../../../../packages/shared-theme/src/themes/dark/auction'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the auction themes as the default themes
export const lightTheme = auctionLightTheme
export const darkTheme = auctionDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
