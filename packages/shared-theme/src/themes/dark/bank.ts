// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Neutral tones — dark, sophisticated, and high contrast
  neutral100: '#0d1117', // Deep background
  neutral200: '#161b22', // Elevated surfaces
  neutral300: '#1f2937', // Cards and modals
  neutral400: '#374151', // Borders / dividers
  neutral500: '#6b7280', // Muted text
  neutral600: '#9ca3af', // Secondary text
  neutral700: '#d1d5db', // Primary light text
  neutral800: '#e5e7eb', // Headings
  neutral900: '#f9fafb', // Highest contrast (almost white)

  // Primary — bright fintech blue → purple gradient for accents
  primary100: '#1a75ff',
  primary200: '#4d8dff',
  primary300: '#7ba4ff',
  primary400: '#a2baff',
  primary500: '#7b61ff', // Gradient end tone
  primary600: '#0052cc',
  primaryGradient: 'linear-gradient(135deg, #1a75ff 0%, #7b61ff 100%)',

  // Secondary — golden highlights (trust + prestige)
  secondary100: '#8b6f00',
  secondary200: '#a88000',
  secondary300: '#d1a300',
  secondary400: '#ffca28',
  secondary500: '#ffe082',

  // Accent — bright violet & blue hues
  accent100: '#9f86ff',
  accent200: '#b39fff',
  accent300: '#cbbcff',
  accent400: '#ddd6fe',
  accent500: '#ede9fe',

  // Error — clear but not jarring
  angry100: '#4b1818',
  angry200: '#8b2020',
  angry300: '#cf4444',
  angry400: '#ef5350',
  angry500: '#ff6b6b',

  // Success — green, but muted for dark mode
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
  text: palette.neutral800, // High contrast white text
  textDim: palette.neutral500, // Muted gray text
  background: palette.neutral100, // Deep background
  surface: palette.neutral200, // Slightly elevated surface
  border: palette.neutral400,
  tint: palette.primary200, // Vibrant blue tint for icons/buttons
  tintInactive: palette.neutral400, // Muted inactive elements
  separator: palette.neutral300,
  error: palette.angry400,
  errorBackground: palette.angry100,
  gradient: ['#7b61ff', '#1a75ff'],
} as const

const darkTheme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default darkTheme
