// Copyright (c) Meta Platforms, Inc. and affiliates.
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

  // Primary – Orange gradient from logo
  primary100: '#fff7f0', // Very light orange tint
  primary200: '#ffe8d9', // Light orange tint
  primary300: '#ffd1b3', // Medium light orange
  primary400: '#ffb380', // Light orange
  primary500: '#FF9F40', // Primary color - bright orange from logo
  primary600: '#FF8C1A', // Vibrant orange

  // Secondary – Orange-red gradient from logo
  secondary100: '#fff5f2', // Very light red-orange
  secondary200: '#ffe0d6', // Light red-orange
  secondary300: '#ffc4b3', // Medium light red-orange
  secondary400: '#ff9380', // Light red-orange
  secondary500: '#FF6B35', // Secondary color - orange-red from logo

  // Accent – Deep red from logo
  accent100: '#fff2f2', // Very light red
  accent200: '#ffd9d9', // Light red
  accent300: '#ffb3b3', // Medium light red
  accent400: '#ff8080', // Light red
  accent500: '#D64541', // Deep red from logo

  // Angry – Error colors (deeper reds)
  angry100: '#fff5f5', // Very light error
  angry200: '#ffe0e0', // Light error
  angry300: '#ffb3b3', // Medium light error
  angry400: '#ff6666', // Medium error
  angry500: '#B83835', // Dark error red

  // Success – Green colors for confirmations
  success100: '#f0f8f0', // Very light green
  success200: '#d4edd4', // Light green
  success300: '#a8d5a8', // Medium light green
  success400: '#66bb66', // Medium green
  success500: '#4caf50', // Vibrant green

  overlay20: 'rgba(255, 159, 64, 0.2)', // Orange with opacity
  overlay50: 'rgba(255, 159, 64, 0.5)', // Orange with opacity
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900, // Black for primary text (like logo text)
  textDim: palette.neutral600, // Dark gray for secondary text
  background: palette.neutral200, // F6F6F6 background
  border: palette.neutral400, // Light gray borders
  tint: palette.primary500, // Orange as primary tint
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
