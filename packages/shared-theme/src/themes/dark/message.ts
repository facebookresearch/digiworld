import { baseTheme } from '../base'

const palette = {
  // Neutral tones for backgrounds, text, etc.
  neutral100: '#000000',
  neutral200: '#1C1C1E',
  neutral300: '#2C2C2E',
  neutral400: '#3A3A3C',
  neutral500: '#48484A',
  neutral600: '#8E8E93',
  neutral700: '#EBEBF5',
  neutral800: '#FFFFFF',
  neutral900: '#FFFFFF',

  // Primary – Blue Theme (Messaging App)
  primary100: '#0A84FF',
  primary200: '#0056CC',
  primary300: '#004499',
  primary400: '#003366',
  primary500: '#0A84FF',
  primary600: '#0056CC',

  // Secondary – Grey Theme (Incoming Messages)
  secondary100: '#2C2C2E',
  secondary200: '#3A3A3C',
  secondary300: '#48484A',
  secondary400: '#636366',
  secondary500: '#8E8E93',

  // Accent – Light Blue
  accent100: '#0A84FF',
  accent200: '#0056CC',
  accent300: '#004499',
  accent400: '#003366',
  accent500: '#0A84FF',

  // Angry – Red for errors
  angry100: '#FF453A',
  angry200: '#FF6B6B',
  angry300: '#FF8585',
  angry400: '#FFA0A0',
  angry500: '#FFB3B3',

  // Success – Green
  success100: '#30D158',
  success200: '#28A745',
  success300: '#1E7E34',
  success400: '#155724',
  success500: '#30D158',

  // Warning – Orange
  warning100: '#FF9F0A',
  warning200: '#FFB340',
  warning300: '#FFC266',
  warning400: '#FFD18C',
  warning500: '#FF9F0A',

  // Info – Blue
  info100: '#0A84FF',
  info200: '#0056CC',
  info300: '#004499',
  info400: '#003366',
  info500: '#0A84FF',

  // Error – Red
  error100: '#FF453A',
  error200: '#FF6B6B',
  error300: '#FF8585',
  error400: '#FFA0A0',
  error500: '#FF453A',

  black: '#000000',
  darkBg: '#1C1C1E',
  accent: '#0A84FF',

  overlay20: 'rgba(0, 0, 0, 0.2)',
  overlay50: 'rgba(0, 0, 0, 0.5)',
  overlay80: 'rgba(0, 0, 0, 0.8)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral800,
  textDim: palette.neutral600,
  textMuted: palette.neutral700,
  background: palette.neutral100,
  backgroundElevated: palette.neutral200,
  border: palette.neutral300,
  tint: palette.primary500,
  tintInactive: palette.neutral500,
  separator: palette.neutral300,
  error: palette.angry100,
  errorBackground: palette.angry500,
  success: palette.success500,
  successBackground: palette.success100,
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
