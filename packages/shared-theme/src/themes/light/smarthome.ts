import { baseTheme } from '../base'

const palette = {
  // Neutral tones based on the color schema
  neutral100: '#ffffff', // Pure white
  neutral200: '#fafafa', // Very light off-white for cards
  neutral300: '#f5f5f5', // Light gray for inactive elements
  neutral400: '#e0e0e0', // Light gray for borders
  neutral500: '#9e9e9e', // Medium gray for secondary text
  neutral600: '#757575', // Darker gray for secondary text
  neutral700: '#616161', // Dark gray for primary text
  neutral800: '#424242', // Very dark gray for headings
  neutral900: '#2d2b2a', // Dark charcoal from color palette

  // Primary – Based on the light blue from color palette
  primary100: '#e8f4f7', // Very light blue
  primary200: '#d1e9ef', // Light blue
  primary300: '#9ecbd5', // Main light blue from palette
  primary400: '#7bb8c5', // Slightly darker blue
  primary500: '#5aa5b5', // Medium blue
  primary600: '#3a8a9a', // Darker blue

  // Secondary – Based on the light beige from color palette
  secondary100: '#fdf8f3', // Very light beige
  secondary200: '#f9ede0', // Light beige
  secondary300: '#f2d4b0', // Main light beige from palette
  secondary400: '#e8c08a', // Slightly darker beige
  secondary500: '#d4a66a', // Medium beige

  // Accent – Warm accent colors
  accent100: '#fff3e0', // Very light warm
  accent200: '#ffe0b2', // Light warm
  accent300: '#ffcc80', // Medium warm
  accent400: '#ffb74d', // Warm orange
  accent500: '#ff9800', // Orange

  // Angry – Error colors
  angry100: '#ffebee', // Very light red
  angry200: '#ffcdd2', // Light red
  angry300: '#ef9a9a', // Medium red
  angry400: '#e57373', // Red
  angry500: '#f44336', // Error red

  // Success – Green colors
  success100: '#e8f5e8', // Very light green
  success200: '#c8e6c9', // Light green
  success300: '#a5d6a7', // Medium green
  success400: '#81c784', // Green
  success500: '#4caf50', // Success green

  overlay20: 'rgba(45, 43, 42, 0.2)',
  overlay50: 'rgba(45, 43, 42, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900, // Dark charcoal for primary text
  textDim: palette.neutral600, // Medium gray for secondary text
  background: palette.neutral100, // White background
  border: palette.neutral400, // Light gray borders
  tint: palette.primary300, // Light blue as primary tint
  tintInactive: palette.neutral300, // Light gray for inactive elements
  separator: palette.neutral300, // Light gray separators
  error: palette.angry500, // Error red
  errorBackground: palette.angry100, // Light red background for errors
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
