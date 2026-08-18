// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  neutral100: '#000000',
  neutral200: '#191015',
  neutral300: '#3C3836',
  neutral400: '#564E4A',
  neutral500: '#978F8A',
  neutral600: '#B6ACA6',
  neutral700: '#D7CEC9',
  neutral800: '#F4F2F1',
  neutral900: '#FFFFFF',

  primary100: '#1B6B3F',
  primary200: '#2E8B57',
  primary300: '#66BA8C',
  primary400: '#96D0AD',
  primary500: '#C6E6D0',
  primary600: '#E6F4EA',

  secondary100: '#41476E',
  secondary200: '#626894',
  secondary300: '#9196B9',
  secondary400: '#BCC0D6',
  secondary500: '#DCDDE9',

  accent100: '#FFBB50',
  accent200: '#FBC878',
  accent300: '#FDD495',
  accent400: '#FFE1B2',
  accent500: '#FFEED4',

  angry100: '#C03403',
  angry200: '#D44D1A',
  angry300: '#E66631',
  angry400: '#F27F48',
  angry500: '#F2D6CD',

  success100: '#E6F4EA',
  success200: '#C6E6D0',
  success300: '#96D0AD',
  success400: '#66BA8C',
  success500: '#2E8B57',

  overlay20: 'rgba(25, 16, 21, 0.2)',
  overlay50: 'rgba(25, 16, 21, 0.5)',
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
