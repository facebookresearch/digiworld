// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Core brand (from logo)
  primary100: '#8d3ef6', // Purple (end of gradient)
  primary200: '#5743ca', // Violet mid-tone
  primary300: '#3e8fff', // Bright blue mid-blend
  primary400: '#1c62ff', // Cobalt blue (start of gradient)
  primary500: 'rgba(60, 130, 255, 0.3)',
  primary600: 'rgba(60, 130, 255, 0.15)',

  // Light neutrals
  neutral100: '#ffffff',
  neutral200: '#f4f3fb', // Softest violet-tinted white
  neutral300: '#eceafd',
  neutral400: '#dedaf6',
  neutral500: '#bfb9e0',
  neutral600: '#a699c8',
  neutral700: '#746f90',
  neutral800: '#4e4b6b',
  neutral900: '#13111a',

  // Accent (blue highlight)
  accent100: '#e0f0ff',
  accent200: '#b3d8ff',
  accent300: '#6ebeff',
  accent400: '#3e8fff',
  accent500: '#1c62ff',

  // Secondary
  secondary100: '#c3b5f7',
  secondary200: '#a489e6',
  secondary300: '#8d3ef6',
  secondary400: '#b68fff',
  secondary500: '#e0d7ff',

  // Success (untouched)
  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  // Error/Danger
  angry100: '#FF4444',
  angry200: '#FF4F4F',
  angry300: '#ff6b6b',
  angry400: '#ff8585',
  angry500: '#ffa0a0',

  // Overlays
  overlay20: 'rgba(244, 243, 251, 0.2)',
  overlay50: 'rgba(244, 243, 251, 0.5)',
  overlay80: 'rgba(244, 243, 251, 0.8)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900,
  textDim: palette.neutral800,
  textMuted: palette.neutral700,
  background: palette.neutral200,
  backgroundCard: palette.neutral400,
  border: palette.neutral600,
  primary: palette.primary200,
  primaryDim: palette.primary400,
  accent: palette.accent400,
  secondary: palette.secondary100,
  error: palette.angry200,
  overlay20: palette.overlay20,
  overlay50: palette.overlay50,
  overlay80: palette.overlay80,
  success: palette.primary200,
  successBackground: palette.primary500,
  errorBackground: palette.angry500,
  tint: palette.primary200,
  tintInactive: palette.neutral800,
  separator: palette.neutral300,
  gradients: {
    brand: ['#1c62ff', '#5743ca', '#8d3ef6'],
  },
}

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
