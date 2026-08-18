// Import the specific eats themes
import eatsLightTheme, {
  colors as eatsColors,
} from '../../../../packages/shared-theme/src/themes/light/eats'
import eatsDarkTheme from '../../../../packages/shared-theme/src/themes/dark/eats'

// Re-export from shared theme (excluding colors to avoid duplicate)
export {
  ThemeProvider,
  useTheme,
  Screen,
  Text,
  Button,
  AutoImage,
  LoadingOverlay,
  ToastContext,
  useToastProvider,
  GluestackProvider,
  customFontsToLoad,
  spacing,
  metrics,
} from '@andojo/shared-theme'

// Export the eats themes as the default themes
export const lightTheme = eatsLightTheme
export const darkTheme = eatsDarkTheme

// Export colors directly from the eats light theme for static usage
export const colors = eatsColors

// Re-export types
export type { Theme as BaseTheme, ThemeConfig } from '@andojo/shared-theme'
export type ThemeContexts = 'light' | 'dark'
