// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Neutral tones – sleek, confident, and minimal
  neutral100: '#ffffff', // Pure white background
  neutral200: '#f9fafb', // Subtle gray for cards and surfaces
  neutral300: '#eceff1', // Divider gray
  neutral400: '#cfd8dc', // Border gray
  neutral500: '#90a4ae', // Secondary text
  neutral600: '#607d8b', // Muted text
  neutral700: '#455a64', // Primary dark text
  neutral800: '#263238', // Headings and strong contrast
  neutral900: '#111827', // Deep slate for dark mode or highlights

  // Primary – fintech-inspired blue → purple gradient
  primary100: '#e6f0ff',
  primary200: '#b3d1ff',
  primary300: '#80b3ff',
  primary400: '#4d94ff',
  primary500: '#1a75ff', // Core fintech blue
  primary600: '#4d8dff', // Darker, for emphasis
  primaryGradient: 'linear-gradient(135deg, #1a75ff 0%, #7b61ff 100%)',

  // Secondary – trusted financial warmth (royal gold)
  secondary100: '#fff7e6',
  secondary200: '#ffe6b3',
  secondary300: '#ffd580',
  secondary400: '#F59E0B',
  secondary500: '#ffb300', // Accent gold
  secondary600: '#e09e00', // Stronger golden tone

  // Accent – fresh violet to balance the blue
  accent100: '#f3e8ff',
  accent200: '#e0c3fc',
  accent300: '#c49bff',
  accent400: '#a271ff',
  accent500: '#7b61ff', // Matches primary gradient end

  // Error – professional, not alarming
  angry100: '#fdecea',
  angry200: '#f8c7c3',
  angry300: '#f1a1a0',
  angry400: '#e57373',
  angry500: '#d32f2f',

  // Success – calm and financial
  success100: '#e6f4ea',
  success200: '#b7e0c0',
  success300: '#81c995',
  success400: '#4caf50',
  success500: '#2e7d32',

  overlay20: 'rgba(17, 24, 39, 0.2)',
  overlay50: 'rgba(17, 24, 39, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral100,
  surface: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
  gradient: ['#1a75ff', '#7b61ff'],
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
