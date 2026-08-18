// Import the specific fly themes
import flyLightTheme from '../../../../packages/shared-theme/src/themes/light/fly'
import flyDarkTheme from '../../../../packages/shared-theme/src/themes/dark/fly'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the fly themes as the default themes
export const lightTheme = flyLightTheme
export const darkTheme = flyDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
