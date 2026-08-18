// Copyright (c) Meta Platforms, Inc. and affiliates.
// Import the specific smarthome themes
import smarthomeLightTheme from '../../../../packages/shared-theme/src/themes/light/smarthome'
import smarthomeDarkTheme from '../../../../packages/shared-theme/src/themes/dark/smarthome'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the smarthome themes as the default themes
export const lightTheme = smarthomeLightTheme
export const darkTheme = smarthomeDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
