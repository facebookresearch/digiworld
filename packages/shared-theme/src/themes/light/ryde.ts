// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  accent100: '#FFF4E0',
  accent200: '#FFE0B3',
  accent300: '#FFC766',
  accent400: '#FFA733',
  accent500: '#FF8800',

  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  neutral100: '#FFFFFF',
  neutral200: '#F5F5F5',
  neutral300: '#E0E0E0',
  neutral400: '#C2C2C2',
  neutral500: '#9E9E9E',
  neutral600: '#707070',
  neutral700: '#4A4A4A',
  neutral800: '#2C2C2C',
  neutral900: '#111111',

  primary100: '#FFE6CC',
  primary200: '#FFB84D',
  primary300: '#FF9900',
  primary400: '#CC7A00',
  primary500: 'rgba(255, 153, 0, 0.3)',
  primary600: 'rgba(255, 153, 0, 0.15)',

  secondary100: '#FFD699',
  secondary200: '#FFCC66',
  secondary300: '#FFB84D',
  secondary400: '#E69900',
  secondary500: '#CC8800',

  angry100: '#FF4444',
  angry200: '#FF4F4F',
  angry300: '#ff6b6b',
  angry400: '#ff8585',
  angry500: '#ffa0a0',

  black: '#2D343C',
  darkBg: '#22272B',
  accent: '#FFBC07',

  overlay20: 'rgba(255, 255, 255, 0.2)',
  overlay50: 'rgba(255, 255, 255, 0.5)',
  overlay80: 'rgba(255, 255, 255, 0.8)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900,
  textDim: palette.neutral800,
  textMuted: palette.neutral700,
  background: palette.darkBg,
  backgroundElevated: palette.black,
  border: palette.neutral600,
  tint: palette.accent,
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
