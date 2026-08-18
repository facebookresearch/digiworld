// Copyright (c) Meta Platforms, Inc. and affiliates.
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

  // Primary – 662fff (purple) gradient
  primary100: '#1a0a2a', // Very dark purple
  primary200: '#2a143a', // Dark purple
  primary300: '#3a1e4a', // Medium dark purple
  primary400: '#4a285a', // Medium purple
  primary500: '#662fff', // Primary color - vibrant purple
  primary600: '#5a26e6', // Lighter purple

  // Secondary – f0f4ff (light blue) dark variations
  secondary100: '#0a0f1a', // Very dark blue
  secondary200: '#1a1f2a', // Dark blue
  secondary300: '#2a2f3a', // Medium dark blue
  secondary400: '#4a4f5a', // Medium blue
  secondary500: '#6a6f7a', // Light blue

  // Accent – Using 662fff variations
  accent100: '#2a0f3a', // Very dark accent
  accent200: '#3a1f4a', // Dark accent
  accent300: '#4a2f5a', // Medium dark accent
  accent400: '#5a3f6a', // Medium accent
  accent500: '#662fff', // Vibrant purple

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

  overlay20: 'rgba(102, 47, 255, 0.2)', // 662fff with opacity
  overlay50: 'rgba(102, 47, 255, 0.5)', // 662fff with opacity
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.primary500, // 662fff for primary text
  textDim: palette.neutral600, // Light gray for secondary text
  background: palette.neutral100, // Very dark background
  border: palette.neutral400, // Lighter dark borders
  tint: palette.primary500, // 662fff as primary tint
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
