import { baseTheme } from '../base'

const palette = {
  neutral100: '#FFFFFF',
  neutral200: '#F4F2F1',
  neutral300: '#D7CEC9',
  neutral400: '#B6ACA6',
  neutral500: '#978F8A',
  neutral600: '#564E4A',
  neutral700: '#3C3836',
  neutral800: '#191015',
  neutral900: '#000000',

  primary100: '#E6F0FF',
  primary200: '#B3D1FF',
  primary300: '#80B3FF',
  primary400: '#4D94FF',
  primary500: '#0066FF',
  primary600: '#0047B3',

  secondary100: '#E8F5E9',
  secondary200: '#C8E6C9',
  secondary300: '#A5D6A7',
  secondary400: '#81C784',
  secondary500: '#4CAF50',

  accent100: '#FFEED4',
  accent200: '#FFE1B2',
  accent300: '#FDD495',
  accent400: '#FBC878',
  accent500: '#FFBB50',

  angry100: '#F2D6CD',
  angry200: '#E5AC99',
  angry300: '#D78366',
  angry400: '#C03403',
  angry500: '#C03403',

  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',

  overlay20: 'rgba(25, 16, 21, 0.2)',
  overlay50: 'rgba(25, 16, 21, 0.5)',

  completed: '#4EF037',
  processing: '#FFC73C',
  failed: '#FF1756',
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
