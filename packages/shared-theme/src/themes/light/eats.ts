import { baseTheme } from '../base'

const palette = {
  // Neutral tones for backgrounds, text, etc.
  neutral100: '#FFFFFF',
  neutral200: '#FDF2F2',
  neutral300: '#F0D3D3',
  neutral400: '#D8B0B0',
  neutral500: '#B88C8C',
  neutral600: '#8F5A5A',
  neutral700: '#703A3A',
  neutral800: '#421C1C',
  neutral900: '#1F0A0A',

  // Primary – Spicy Red Theme
  primary100: '#FFE6E6',
  primary200: '#FFB3B3',
  primary300: '#FF6666',
  primary400: '#E53935', // Google-style red
  primary500: '#D62828', // Main spicy red
  primary600: '#A61B1B',

  // Secondary – Green from chili stem
  secondary100: '#E1F0E5',
  secondary200: '#B9DFC5',
  secondary300: '#89CB9F',
  secondary400: '#55B174',
  secondary500: '#3A913F',

  // Accent – Flame yellow-orange
  accent100: '#FFF3E0',
  accent200: '#FFE0B2',
  accent300: '#FFCC80',
  accent400: '#FFB74D',
  accent500: '#F77F00',

  // Angry – Same red base
  angry100: '#FADBD8',
  angry200: '#F5B7B1',
  angry300: '#EC7063',
  angry400: '#E74C3C',
  angry500: '#C03403',

  // Success – Derived from green palette
  success100: '#E6F4EA',
  success200: '#C6E6D0',
  success300: '#96D0AD',
  success400: '#66BA8C',
  success500: '#2E8B57',

  overlay20: 'rgba(66, 28, 28, 0.2)',
  overlay50: 'rgba(66, 28, 28, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
