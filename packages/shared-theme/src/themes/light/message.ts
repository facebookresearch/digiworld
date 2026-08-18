// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Neutral tones for backgrounds, text, etc.
  neutral100: '#FFFFFF',
  neutral200: '#F5F5F5',
  neutral300: '#E0E0E0',
  neutral400: '#C2C2C2',
  neutral500: '#9E9E9E',
  neutral600: '#707070',
  neutral700: '#4A4A4A',
  neutral800: '#2C2C2C',
  neutral900: '#111111',

  // Primary – Blue Theme (Messaging App)
  primary100: '#E6F0FF',
  primary200: '#B3D9FF',
  primary300: '#80C2FF',
  primary400: '#4DABFF',
  primary500: '#1a79f9',
  primary600: '#0056CC',

  // Secondary – Grey Theme (Incoming Messages)
  secondary100: '#F8F9FA',
  secondary200: '#E9ECEF',
  secondary300: '#DEE2E6',
  secondary400: '#CED4DA',
  secondary500: '#ADB5BD',

  // Accent – Light Blue
  accent100: '#F0F8FF',
  accent200: '#E1F0FF',
  accent300: '#C7E0FF',
  accent400: '#A8C8FF',
  accent500: '#1a79f9',

  // Angry – Red for errors
  angry100: '#FF4444',
  angry200: '#FF4F4F',
  angry300: '#ff6b6b',
  angry400: '#ff8585',
  angry500: '#ffa0a0',

  // Success – Green
  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  // Warning – Orange
  warning100: '#FFF3E0',
  warning200: '#FFE0B2',
  warning300: '#FFCC80',
  warning400: '#FFB74D',
  warning500: '#FF9800',

  // Info – Blue
  info100: '#E3F2FD',
  info200: '#BBDEFB',
  info300: '#90CAF9',
  info400: '#64B5F6',
  info500: '#2196F3',

  // Error – Red
  error100: '#FFEBEE',
  error200: '#FFCDD2',
  error300: '#EF9A9A',
  error400: '#E57373',
  error500: '#F44336',

  black: '#2D343C',
  darkBg: '#22272B',
  accent: '#1a79f9',

  overlay20: 'rgba(255, 255, 255, 0.2)',
  overlay50: 'rgba(255, 255, 255, 0.5)',
  overlay80: 'rgba(255, 255, 255, 0.8)',
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
