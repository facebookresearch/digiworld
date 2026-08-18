// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  accent100: '#FFEED4',
  accent200: '#FFE1B2',
  accent300: '#FDD495',
  accent400: '#FBC878',
  accent500: '#FFBB50',

  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  // Core neutrals (inverted from dark theme)
  neutral100: '#FFFFFF',
  neutral200: '#F4F4F4', // Main background
  neutral300: '#E8E8E8',
  neutral400: '#D4D4D4', // Card backgrounds
  neutral500: '#B3B3B3',
  neutral600: '#8C8C8C',
  neutral700: '#666666',
  neutral800: '#404040', // Secondary text
  neutral900: '#121719', // Primary text

  // Primary (Spotify Green - same as dark theme)
  primary100: '#18a449',
  primary200: '#1DB954', // Main brand color
  primary300: '#66BA8C',
  primary400: '#96D0AD',
  primary500: 'rgba(29, 185, 84, 0.3)', // Transparent overlay
  primary600: 'rgba(29, 185, 84, 0.15)',

  // Secondary (same as dark theme)
  secondary100: '#4FC3F7', // Home icon
  secondary200: '#BA68C8', // Office icon
  secondary300: '#9196B9',
  secondary400: '#BCC0D6',
  secondary500: '#DCDDE9',

  // Error/Danger (same as dark theme)
  angry100: '#FF4444',
  angry200: '#FF4F4F',
  angry300: '#ff6b6b',
  angry400: '#ff8585',
  angry500: '#ffa0a0',

  // Overlay
  overlay20: 'rgba(244, 244, 244, 0.2)',
  overlay50: 'rgba(244, 244, 244, 0.5)',
  overlay80: 'rgba(244, 244, 244, 0.8)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900,
  textDim: palette.neutral800,
  textMuted: palette.neutral700,
  background: palette.neutral200,
  backgroundElevated: palette.neutral400,
  border: palette.neutral600,
  tint: palette.primary200,
  tintInactive: palette.neutral800,
  separator: palette.neutral300,
  error: palette.angry100,
  errorBackground: palette.angry500,
  success: palette.primary200,
  successBackground: palette.primary500,
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
