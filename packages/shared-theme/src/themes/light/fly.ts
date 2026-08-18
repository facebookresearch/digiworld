import { baseTheme } from '../base'

const palette = {
  // Neutral tones - using F6F6F6 as light base
  neutral100: '#FFFFFF', // Pure white
  neutral200: '#F6F6F6', // Primary color - light gray
  neutral300: '#E6E6E6', // Slightly darker
  neutral400: '#D0D0D0', // Light gray
  neutral500: '#A0A0A0', // Medium gray
  neutral600: '#707070', // Dark gray
  neutral700: '#505050', // Darker gray
  neutral800: '#303030', // Very dark gray
  neutral900: '#1a1a1a', // Almost black for text

  // Primary – f45baf (vibrant pink/magenta)
  primary100: '#fef7fc', // Very light tint
  primary200: '#fce8f7', // Light tint
  primary300: '#f9d1ef', // Medium light
  primary400: '#f6a3df', // Light pink
  primary500: '#f45baf', // Primary color - vibrant pink/magenta
  primary600: '#e83a9f', // Darker pink

  // Secondary – f0f4ff (light blue)
  secondary100: '#f0f4ff', // Primary secondary color - light blue
  secondary200: '#e6edff', // Slightly darker blue
  secondary300: '#d1dfff', // Medium light blue
  secondary400: '#b8ccff', // Light blue
  secondary500: '#9fb8ff', // Medium blue

  // Accent – f45baf variations
  accent100: '#fef7fc', // Very light accent
  accent200: '#fce8f7', // Light accent
  accent300: '#f9d1ef', // Medium light accent
  accent400: '#f6a3df', // Light pink accent
  accent500: '#f45baf', // Vibrant pink/magenta

  // Angry – Error colors (reds)
  angry100: '#fff5f5', // Very light error
  angry200: '#ffe0e0', // Light error
  angry300: '#ffb3b3', // Medium light error
  angry400: '#ff6666', // Medium error
  angry500: '#d32f2f', // Dark error red

  // Success – Green colors for confirmations
  success100: '#f0f8f0', // Very light green
  success200: '#d4edd4', // Light green
  success300: '#a8d5a8', // Medium light green
  success400: '#66bb66', // Medium green
  success500: '#4caf50', // Vibrant green

  overlay20: 'rgba(244, 91, 175, 0.2)', // f45baf with opacity
  overlay50: 'rgba(244, 91, 175, 0.5)', // f45baf with opacity
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.primary500, // f45baf for primary text
  textDim: palette.neutral600, // Dark gray for secondary text
  background: palette.neutral200, // F6F6F6 background
  border: palette.neutral400, // Light gray borders
  tint: palette.primary500, // f45baf as primary tint
  tintInactive: palette.neutral400, // Light gray for inactive elements
  separator: palette.neutral300, // Light gray separators
  error: palette.angry500, // Error red
  errorBackground: palette.angry100, // Very light error background
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
