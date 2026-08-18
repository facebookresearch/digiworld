import { baseTheme } from '../base'
const palette = {
  // Neutral tones for dark backgrounds and readable text
  neutral100: '#EDEDED',
  neutral200: '#D1CFCF',
  neutral300: '#B0AAAA',
  neutral400: '#918282',
  neutral500: '#726262',
  neutral600: '#554646',
  neutral700: '#3D2F2F',
  neutral800: '#241818',
  neutral900: '#120B0B',

  // Primary – Spicy Red Theme (Dark-Optimized)
  primary100: '#FFCCCC',
  primary200: '#FF9999',
  primary300: '#FF6666',
  primary400: '#E04545',
  primary500: '#D62828',
  primary600: '#B91D1D',

  // Secondary – Green from chili stem
  secondary100: '#A8D5B6',
  secondary200: '#80C49B',
  secondary300: '#59B37F',
  secondary400: '#3A915F',
  secondary500: '#2B724A',

  // Accent – Flame yellow-orange
  accent100: '#FFEDCC',
  accent200: '#FFD799',
  accent300: '#FFBF66',
  accent400: '#FFA533',
  accent500: '#F77F00',

  // Angry – Red for errors (no major change, works well in dark)
  angry100: '#FFDDD6',
  angry200: '#FFB3A3',
  angry300: '#FF6655',
  angry400: '#E6432F',
  angry500: '#C03403',

  // Success – Dark-compatible green
  success100: '#A4D4B4',
  success200: '#78BD91',
  success300: '#4CA66E',
  success400: '#2D8C52',
  success500: '#1F6E3F',

  overlay20: 'rgba(237, 237, 237, 0.2)',
  overlay50: 'rgba(237, 237, 237, 0.5)',
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
