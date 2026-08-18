import { baseTheme } from '../base'

const palette = {
  // Neutral tones - dark mode optimized
  neutral100: '#0F172A',
  neutral200: '#1E293B',
  neutral300: '#334155',
  neutral400: '#475569',
  neutral500: '#64748B',
  neutral600: '#94A3B8',
  neutral700: '#CBD5E1',
  neutral800: '#E2E8F0',
  neutral900: '#F8FAFC',

  // Primary - Vibrant Blue/Purple gradient (maintained vibrancy in dark mode)
  primary100: '#1E3A8A',
  primary200: '#1E40AF',
  primary300: '#2563EB',
  primary400: '#3B82F6',
  primary500: '#60A5FA', // Lighter for dark mode visibility
  primary600: '#93C5FD',

  // Secondary - Deep Purple/Indigo
  secondary100: '#4C1D95',
  secondary200: '#5B21B6',
  secondary300: '#6D28D9',
  secondary400: '#7C3AED',
  secondary500: '#A78BFA',

  // Accent - Coral/Orange (vibrant for dark mode)
  accent100: '#7C2D12',
  accent200: '#9A3412',
  accent300: '#C2410C',
  accent400: '#EA580C',
  accent500: '#FB923C', // Maintained vibrancy

  // Success - Emerald Green
  success100: '#064E3B',
  success200: '#065F46',
  success300: '#047857',
  success400: '#059669',
  success500: '#10B981',

  // Warning - Amber
  warning100: '#78350F',
  warning200: '#92400E',
  warning300: '#B45309',
  warning400: '#D97706',
  warning500: '#F59E0B',

  // Error/Angry - Red
  angry100: '#7F1D1D',
  angry200: '#991B1B',
  angry300: '#B91C1C',
  angry400: '#DC2626',
  angry500: '#B91C1C', // Darker red for failed transactions

  overlay20: 'rgba(255, 255, 255, 0.1)',
  overlay50: 'rgba(255, 255, 255, 0.2)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900,
  textDim: palette.neutral600,
  background: palette.neutral100,
  surface: palette.neutral200,
  surfaceElevated: palette.neutral300,
  border: palette.neutral300,
  tint: palette.primary500,
  tintInactive: palette.neutral500,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,

  // Glassmorphic-specific colors for dark mode
  glassBackground: 'rgba(30, 41, 59, 0.6)',
  glassBackgroundStrong: 'rgba(30, 41, 59, 0.9)',
  glassBorder: 'rgba(148, 163, 184, 0.2)',
  glassBorderStrong: 'rgba(148, 163, 184, 0.3)',
  glassText: palette.neutral900,
  glassTextDim: palette.neutral600,
  glassShadow: 'rgba(0, 0, 0, 0.4)',

  // Gradient colors for backgrounds
  gradientStart: palette.neutral100,
  gradientMiddle: palette.neutral200,
  gradientEnd: palette.neutral300,

  // Card and component backgrounds
  cardBackground: 'rgba(30, 41, 59, 0.5)',
  cardBackgroundStrong: 'rgba(30, 41, 59, 0.85)',
  cardBorder: 'rgba(148, 163, 184, 0.15)',

  // Interactive states
  pressedOverlay: 'rgba(255, 255, 255, 0.1)',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: {
    ...baseTheme.styles,
    // Enhanced shadows for liquid glass effect in dark mode
    shadow: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 5,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 32,
        elevation: 8,
      },
      // Glassmorphic-specific soft shadow for dark mode
      glass: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 6,
      },
    },
    // Refined border radius matching light mode
    borderRadius: {
      sm: 8,
      md: 16,
      lg: 22,
      xl: 26,
      full: 9999,
    },
  },
}

export default theme
