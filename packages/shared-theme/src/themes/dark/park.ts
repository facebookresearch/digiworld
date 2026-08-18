import { baseTheme } from '../base'

const palette = {
  // Neutral tones — deep, confident, high contrast for dark mode
  neutral100: '#0d1117', // Deep background
  neutral200: '#161b22', // Elevated surfaces
  neutral300: '#1f2937', // Cards and modals
  neutral400: '#374151', // Borders / dividers
  neutral500: '#6b7280', // Muted text
  neutral600: '#9ca3af', // Secondary text
  neutral700: '#d1d5db', // Primary light text
  neutral800: '#e5e7eb', // Headings
  neutral900: '#f9fafb', // Highest contrast (almost white)

  // Primary — deep blue from app icon gradient
  primary100: '#1A80B8',
  primary200: '#1A80B8',
  primary300: '#0077B6',
  primary400: '#006FAA',
  primary500: '#0066AA', // main primary from gradient
  primary600: '#005088',
  primaryGradient: 'linear-gradient(135deg, #00A3CC 0%, #0066AA 100%)',

  // Secondary — teal/cyan from app icon gradient
  secondary100: '#4DD4FF',
  secondary200: '#33C9F2',
  secondary300: '#1ABDE6',
  secondary400: '#00B3D9',
  secondary500: '#00A3CC', // main secondary from gradient

  // Accent — bright cyan highlights for dark mode
  accent100: '#00E5FF',
  accent200: '#00D4F5',
  accent300: '#00C4E8',
  accent400: '#00B8DD',
  accent500: '#00A8D0',

  // Error — clear but not jarring
  angry100: '#4b1818',
  angry200: '#8b2020',
  angry300: '#cf4444',
  angry400: '#ef5350',
  angry500: '#ff6b6b',

  // Success — green, muted for dark
  success100: '#0a4222',
  success200: '#155d36',
  success300: '#2e7d32',
  success400: '#4caf50',
  success500: '#81c995',

  overlay20: 'rgba(255, 255, 255, 0.1)',
  overlay50: 'rgba(255, 255, 255, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral800, // near-white headings
  textDim: palette.neutral500, // muted gray text
  background: palette.neutral100, // deep background
  surface: palette.neutral200, // slightly elevated surface
  border: palette.neutral400,
  tint: palette.primary300, // brand tint for icons/buttons
  tintInactive: palette.neutral400, // muted inactive elements
  separator: palette.neutral300,
  error: palette.angry400,
  errorBackground: palette.angry100,
  gradient: ['#00A3CC', '#0066AA'],
} as const

const darkTheme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default darkTheme
