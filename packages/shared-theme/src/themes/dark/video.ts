import { baseTheme } from '../base'

const palette = {
  // Core brand (from image)
  primary100: '#3e8fff', // Vibrant blue (logo highlight)
  primary200: '#1c62ff', // Cobalt blue (left of gradient)
  primary300: '#5743ca', // Violet blend
  primary400: '#8d3ef6', // Purple end of gradient
  primary500: 'rgba(60, 130, 255, 0.3)', // Transparent overlay
  primary600: 'rgba(60, 130, 255, 0.15)',

  // Background tones (refreshed)
  neutral100: '#000000',
  neutral200: '#0e0a25', // Darker indigo background (closer to `#261a54`)
  neutral300: '#161137',
  neutral400: '#1d1749',
  neutral500: '#302c4d', // kept for compatibility
  neutral600: '#4b4668',
  neutral700: '#7b7a8e',
  neutral800: '#b3b3b3',
  neutral900: '#ffffff',

  // Accent (highlight blue)
  accent100: '#cfe8ff',
  accent200: '#a6d3ff',
  accent300: '#6ebeff',
  accent400: '#3e8fff', // Bright blue from logo
  accent500: '#1c62ff',

  // Other palettes untouched
  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  // Secondary – slightly updated
  secondary100: '#8d3ef6',
  secondary200: '#6c4fad',
  secondary300: '#a489e6',
  secondary400: '#c3b5f7',
  secondary500: '#e0d7ff',

  angry100: '#FF4444',
  angry200: '#FF4F4F',
  angry300: '#ff6b6b',
  angry400: '#ff8585',
  angry500: '#ffa0a0',

  overlay20: 'rgba(14, 10, 37, 0.2)',
  overlay50: 'rgba(14, 10, 37, 0.5)',
  overlay80: 'rgba(14, 10, 37, 0.8)',
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
    surface: ['rgba(38, 26, 84, 0.9)', 'rgba(14, 10, 37, 0.95)'],
    screen: ['#0e0a25', '#1a1540', '#261a54'],
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
