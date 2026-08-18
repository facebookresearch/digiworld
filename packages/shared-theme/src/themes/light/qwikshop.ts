// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  neutral100: '#FFFFFF',
  neutral200: '#F8F9FA',
  neutral300: '#E9ECEF',
  neutral400: '#CED4DA',
  neutral500: '#ADB5BD',
  neutral600: '#6C757D',
  neutral700: '#495057',
  neutral800: '#343A40',
  neutral900: '#212529',

  // QwikShop primary colors (purple/magenta gradient - inspired by modern e-commerce)
  primary50: '#FAF5FF',
  primary100: '#F8F0FF',
  primary200: '#E9D5FF',
  primary300: '#D8B4FE',
  primary400: '#C084FC',
  primary500: '#A855F7', // Main brand color - vibrant purple
  primary600: '#9333EA',
  primary700: '#7C3AED',
  primary800: '#6B21A8',
  primary900: '#581C87',

  // Complementary secondary colors (teal/cyan)
  secondary100: '#ECFEFF',
  secondary200: '#CFFAFE',
  secondary300: '#A5F3FC',
  secondary400: '#67E8F9',
  secondary500: '#06B6D4',
  secondary600: '#0891B2',
  secondary700: '#0E7490',
  secondary800: '#155E75',
  secondary900: '#164E63',

  // Accent colors (coral/pink)
  accent100: '#FFF1F2',
  accent200: '#FFE4E6',
  accent300: '#FECDD3',
  accent400: '#FDA4AF',
  accent500: '#F43F5E',
  accent600: '#E11D48',
  accent700: '#BE185D',
  accent800: '#9F1239',
  accent900: '#881337',

  // Success colors (green)
  success100: '#F6FFED',
  success200: '#D9F7BE',
  success300: '#B7EB8F',
  success400: '#95DE64',
  success500: '#52C41A',
  success600: '#389E0D',
  success700: '#237804',
  success800: '#135200',
  success900: '#092B00',

  // Warning colors (orange)
  warning100: '#FFF7E6',
  warning200: '#FFE7BA',
  warning300: '#FFD591',
  warning400: '#FFC069',
  warning500: '#FA8C16',
  warning600: '#D46B08',
  warning700: '#AD4E00',
  warning800: '#873800',
  warning900: '#612500',

  // Error colors (red)
  error100: '#FFF2F0',
  error200: '#FFCCC7',
  error300: '#FFA39E',
  error400: '#FF7875',
  error500: '#FF4D4F',
  error600: '#F5222D',
  error700: '#CF1322',
  error800: '#A8071A',
  error900: '#820014',

  // Angry colors (red - aligned with error colors)
  angry100: '#FFF2F0',
  angry200: '#FFCCC7',
  angry300: '#FFA39E',
  angry400: '#FF7875',
  angry500: '#FF4D4F',

  overlay20: 'rgba(33, 37, 41, 0.2)',
  overlay50: 'rgba(33, 37, 41, 0.5)',
  overlay80: 'rgba(33, 37, 41, 0.8)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral800,
  textDim: palette.neutral600,
  textLight: palette.neutral500,
  background: palette.neutral100,
  backgroundSecondary: palette.neutral200,
  border: palette.neutral300,
  borderLight: palette.neutral200,
  tint: palette.primary500,
  tintInactive: palette.neutral400,
  separator: palette.neutral300,
  error: palette.error500,
  errorBackground: palette.error100,
  success: palette.success500,
  successBackground: palette.success100,
  warning: palette.warning500,
  warningBackground: palette.warning100,
  card: palette.neutral100,
  cardShadow: palette.overlay20,

  // Unified gradient system - cohesive and elegant
  gradientPrimary: [palette.primary500, palette.primary600] as string[],
  gradientSecondary: [palette.secondary500, palette.secondary600] as string[],
  gradientAccent: [palette.accent500, palette.accent600] as string[],

  // Main app gradients - soft and consistent
  gradientBackground: [palette.primary100, palette.primary200] as string[],
  gradientHeader: [palette.primary500, palette.primary600] as string[],
  gradientHeaderLight: [palette.primary400, palette.primary500] as string[],

  // Surface gradients
  gradientCard: [palette.neutral100, '#FEFEFE'] as string[],
  gradientCardHighlight: [palette.primary50, palette.primary100] as string[],
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
