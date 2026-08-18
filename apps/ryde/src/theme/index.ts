// Import the specific ryde themes
import rydeLightTheme from '../../../../packages/shared-theme/src/themes/light/ryde'
import rydeDarkTheme from '../../../../packages/shared-theme/src/themes/dark/ryde'

// Re-export from shared theme
export * from '@andojo/shared-theme'

// Export the ryde themes as the default themes
export const lightTheme = rydeLightTheme
export const darkTheme = rydeDarkTheme

// Re-export types (these are already included in the wildcard export above)
export type { Theme as BaseTheme } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
