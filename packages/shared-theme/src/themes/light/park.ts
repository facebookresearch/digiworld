// Copyright (c) Meta Platforms, Inc. and affiliates.
import { baseTheme } from '../base'

const palette = {
  // Neutral tones – light, clean, and airy
  neutral100: '#ffffff',
  neutral200: '#f9fafb',
  neutral300: '#eceff1',
  neutral400: '#cfd8dc',
  neutral500: '#90a4ae',
  neutral600: '#607d8b',
  neutral700: '#455a64',
  neutral800: '#263238',
  neutral900: '#111827',

  // Primary — deep blue from app icon gradient
  primary100: '#CCE5F5',
  primary200: '#99CCE8',
  primary300: '#4D99CC',
  primary400: '#1A80B8',
  primary500: '#0066AA', // main primary from gradient
  primary600: '#005088',
  primaryGradient: 'linear-gradient(135deg, #00A3CC 0%, #0066AA 100%)',

  // Secondary — teal/cyan from app icon gradient
  secondary100: '#CCF2FF',
  secondary200: '#99E6FF',
  secondary300: '#4DD4FF',
  secondary400: '#1AC4E6',
  secondary500: '#00A3CC', // main secondary from gradient

  // Accent — bright cyan highlights
  accent100: '#E6FAFF',
  accent200: '#B3F0FF',
  accent300: '#80E6FF',
  accent400: '#4DDBFF',
  accent500: '#00E5FF',

  // Error – professional and friendly
  angry100: '#fdecea',
  angry200: '#f8c7c3',
  angry300: '#f1a1a0',
  angry400: '#EB001B',
  angry500: '#d32f2f',

  // Success – calm and financial
  success100: '#e6f4ea',
  success200: '#b7e0c0',
  success300: '#81c995',
  success400: '#4caf50',
  success500: '#2e7d32',

  overlay20: 'rgba(17, 24, 39, 0.02)',
  overlay50: 'rgba(17, 24, 39, 0.05)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0.5)',
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
  gradient: ['#00A3CC', '#0066AA'],
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}

export default theme
