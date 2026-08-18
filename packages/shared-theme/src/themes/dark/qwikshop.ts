// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  neutral100: '#1A1A1A',
  neutral200: '#2D2D2D',
  neutral300: '#404040',
  neutral400: '#595959',
  neutral500: '#737373',
  neutral600: '#A3A3A3',
  neutral700: '#D4D4D4',
  neutral800: '#E5E5E5',
  neutral900: '#FFFFFF',

  // QwikShop primary colors (purple/magenta gradient) - adjusted for dark mode
  primary100: '#2E1065',
  primary200: '#3730A3',
  primary300: '#4338CA',
  primary400: '#5B21B6',
  primary500: '#A855F7', // Main brand color (same as light)
  primary600: '#C084FC',
  primary700: '#D8B4FE',
  primary800: '#E9D5FF',
  primary900: '#F8F0FF',

  // Complementary secondary colors (teal/cyan) - adjusted for dark mode
  secondary100: '#083344',
  secondary200: '#0F4C75',
  secondary300: '#155E75',
  secondary400: '#0E7490',
  secondary500: '#06B6D4', // Same as light for consistency
  secondary600: '#67E8F9',
  secondary700: '#A5F3FC',
  secondary800: '#CFFAFE',
  secondary900: '#ECFEFF',

  // Accent colors (coral/pink) - adjusted for dark mode
  accent100: '#4C0519',
  accent200: '#7F1D1D',
  accent300: '#991B1B',
  accent400: '#B91C1C',
  accent500: '#F43F5E', // Same as light for consistency
  accent600: '#FDA4AF',
  accent700: '#FECDD3',
  accent800: '#FFE4E6',
  accent900: '#FFF1F2',

  // Success colors (green) - adjusted for dark mode
  success100: '#0A2E00',
  success200: '#0F4000',
  success300: '#155200',
  success400: '#1A6400',
  success500: '#52C41A', // Same as light for consistency
  success600: '#6BD043',
  success700: '#84DC6C',
  success800: '#9DE895',
  success900: '#B6F4BE',

  // Warning colors (orange) - adjusted for dark mode
  warning100: '#2E1A00',
  warning200: '#472A00',
  warning300: '#613A00',
  warning400: '#7A4A00',
  warning500: '#FA8C16', // Same as light for consistency
  warning600: '#FB9C3F',
  warning700: '#FCAC68',
  warning800: '#FDBC91',
  warning900: '#FECCBA',

  // Error colors (red) - adjusted for dark mode
  error100: '#2E0A0A',
  error200: '#470F0F',
  error300: '#611515',
  error400: '#7A1A1A',
  error500: '#FF4D4F', // Same as light for consistency
  error600: '#FF6D6F',
  error700: '#FF8D8F',
  error800: '#FFADAF',
  error900: '#FFCDCF',

  // Angry colors (red - aligned with error colors)
  angry100: '#2E0A0A',
  angry200: '#470F0F',
  angry300: '#611515',
  angry400: '#7A1A1A',
  angry500: '#FF4D4F',

  overlay20: 'rgba(255, 255, 255, 0.2)',
  overlay50: 'rgba(255, 255, 255, 0.5)',
  overlay80: 'rgba(255, 255, 255, 0.8)',
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
  card: palette.neutral200,
  cardShadow: palette.overlay20,

  // Gradient colors for UI elements
  gradientPrimary: [palette.primary500, palette.primary600] as string[],
  gradientSecondary: [palette.secondary500, palette.secondary600] as string[],
  gradientAccent: [palette.accent500, palette.accent600] as string[],
  gradientBackground: [
    palette.primary500,
    palette.primary600,
    palette.accent500,
  ] as string[],
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
