import { baseTheme } from '../base'

const palette = {
  // Neutral tones - using primary F6F6F6 as base
  neutral100: '#0f0f0f', // Very dark for backgrounds
  neutral200: '#1a1a1a', // Dark background
  neutral300: '#2a2a2a', // Medium dark
  neutral400: '#3a3a3a', // Lighter dark
  neutral500: '#6a6a6a', // Medium gray
  neutral600: '#9a9a9a', // Light gray
  neutral700: '#c0c0c0', // Lighter gray
  neutral800: '#e0e0e0', // Very light gray
  neutral900: '#F6F6F6', // Primary color - light gray/white

  // Primary – Orange gradient from logo (darker tones for dark mode)
  primary100: '#2a1a0a', // Very dark orange
  primary200: '#3a2414', // Dark orange
  primary300: '#4a2e1e', // Medium dark orange
  primary400: '#cc7f33', // Medium orange
  primary500: '#FF9F40', // Primary color - bright orange from logo
  primary600: '#FFB366', // Lighter orange

  // Secondary – Orange-red gradient from logo
  secondary100: '#2a150f', // Very dark red-orange
  secondary200: '#3a1f14', // Dark red-orange
  secondary300: '#4a2919', // Medium dark red-orange
  secondary400: '#cc562a', // Medium red-orange
  secondary500: '#FF6B35', // Secondary color - orange-red from logo

  // Accent – Deep red from logo
  accent100: '#2a1010', // Very dark red
  accent200: '#3a1414', // Dark red
  accent300: '#4a1e1e', // Medium dark red
  accent400: '#ab3734', // Medium red
  accent500: '#D64541', // Deep red from logo

  // Angry – Error colors (deeper reds)
  angry100: '#3a0000', // Very dark error
  angry200: '#5a0a0a', // Dark error
  angry300: '#7a1414', // Medium dark error
  angry400: '#9a1e1e', // Medium error
  angry500: '#ba2828', // Light error

  // Success – Green colors for confirmations
  success100: '#0a2a0a', // Very dark green
  success200: '#143a14', // Dark green
  success300: '#1e4a1e', // Medium dark green
  success400: '#287a28', // Medium green
  success500: '#32aa32', // Light green

  overlay20: 'rgba(255, 159, 64, 0.2)', // Orange with opacity
  overlay50: 'rgba(255, 159, 64, 0.5)', // Orange with opacity
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900, // Light text for dark mode
  textDim: palette.neutral600, // Light gray for secondary text
  background: palette.neutral100, // Very dark background
  border: palette.neutral400, // Lighter dark borders
  tint: palette.primary500, // Orange as primary tint
  tintInactive: palette.neutral300, // Medium dark for inactive elements
  separator: palette.neutral300, // Medium dark separators
  error: palette.angry400, // Medium error red
  errorBackground: palette.angry100, // Very dark error background
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
