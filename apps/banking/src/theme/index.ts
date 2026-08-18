// Copyright (c) Meta Platforms, Inc. and affiliates.
// Import the specific bank themes
import bankLightTheme from '../../../../packages/shared-theme/src/themes/light/bank'
import bankDarkTheme from '../../../../packages/shared-theme/src/themes/dark/bank'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the bank themes as the default themes
export const lightTheme = bankLightTheme
export const darkTheme = bankDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
