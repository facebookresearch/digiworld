// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Neutral tones for dark theme
  neutral100: '#2d2b2a', // Dark charcoal from color palette
  neutral200: '#3a3837', // Slightly lighter dark
  neutral300: '#4a4847', // Medium dark
  neutral400: '#5a5857', // Lighter dark
  neutral500: '#6a6867', // Medium gray
  neutral600: '#7a7877', // Light gray
  neutral700: '#8a8887', // Lighter gray
  neutral800: '#9a9897', // Very light gray
  neutral900: '#ffffff', // White for contrast

  // Primary – Darker version of light blue
  primary100: '#1a2a2e', // Very dark blue
  primary200: '#2a3a3e', // Dark blue
  primary300: '#3a4a4e', // Medium dark blue
  primary400: '#4a5a5e', // Medium blue
  primary500: '#5a6a6e', // Light blue
  primary600: '#6a7a7e', // Lighter blue

  // Secondary – Darker version of light beige
  secondary100: '#2a1f1a', // Very dark beige
  secondary200: '#3a2f2a', // Dark beige
  secondary300: '#4a3f3a', // Medium dark beige
  secondary400: '#5a4f4a', // Medium beige
  secondary500: '#6a5f5a', // Light beige

  // Accent – Darker warm colors
  accent100: '#2a1f1a', // Very dark warm
  accent200: '#3a2f2a', // Dark warm
  accent300: '#4a3f3a', // Medium dark warm
  accent400: '#5a4f4a', // Medium warm
  accent500: '#6a5f5a', // Light warm

  // Angry – Dark error colors
  angry100: '#2a1a1a', // Very dark red
  angry200: '#3a2a2a', // Dark red
  angry300: '#4a3a3a', // Medium dark red
  angry400: '#5a4a4a', // Medium red
  angry500: '#6a5a5a', // Light red

  // Success – Dark green colors
  success100: '#1a2a1a', // Very dark green
  success200: '#2a3a2a', // Dark green
  success300: '#3a4a3a', // Medium dark green
  success400: '#4a5a4a', // Medium green
  success500: '#5a6a5a', // Light green

  overlay20: 'rgba(255, 255, 255, 0.2)',
  overlay50: 'rgba(255, 255, 255, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900, // White for primary text
  textDim: palette.neutral600, // Light gray for secondary text
  background: palette.neutral100, // Dark charcoal background
  border: palette.neutral400, // Medium dark borders
  tint: palette.primary500, // Light blue as primary tint
  tintInactive: palette.neutral300, // Medium dark for inactive elements
  separator: palette.neutral300, // Medium dark separators
  error: palette.angry500, // Light red for errors
  errorBackground: palette.angry100, // Dark red background for errors
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
