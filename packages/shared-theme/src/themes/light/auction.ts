import { baseTheme } from '../base'

const palette = {
  // Neutral tones - clean and modern
  neutral100: '#FFFFFF',
  neutral200: '#F8F9FC',
  neutral300: '#E8EBF0',
  neutral400: '#D1D5DB',
  neutral500: '#9CA3AF',
  neutral600: '#6B7280',
  neutral700: '#4B5563',
  neutral800: '#374151',
  neutral900: '#1F2937',

  // Primary - Soft Blue/Purple gradient (optimized for glassmorphic design)
  primary100: '#F0F4FF',
  primary200: '#E0E9FF',
  primary300: '#C7D7FE',
  primary400: '#A5B8FD',
  primary500: '#6366F1', // Softer indigo - better for glass effects
  primary600: '#4F46E5',

  // Secondary - Soft Purple/Violet (complements primary, glassmorphic-friendly)
  secondary100: '#F5F3FF',
  secondary200: '#EDE9FE',
  secondary300: '#E0D5FE',
  secondary400: '#C4B5FD',
  secondary500: '#8B5CF6', // Soft purple
  secondary600: '#7C3AED',

  // Accent - Coral/Orange (inspired by eBay's energy, but more refined)
  accent100: '#FFF7ED',
  accent200: '#FFEDD5',
  accent300: '#FED7AA',
  accent400: '#FDBA74',
  accent500: '#FB923C', // Vibrant accent for bids/auctions

  // Success - Emerald Green (for successful bids/purchases)
  success100: '#ECFDF5',
  success200: '#D1FAE5',
  success300: '#A7F3D0',
  success400: '#6EE7B7',
  success500: '#10B981',

  // Warning - Amber (for time-sensitive auctions)
  warning100: '#FFFBEB',
  warning200: '#FEF3C7',
  warning300: '#FDE68A',
  warning400: '#FCD34D',
  warning500: '#F59E0B',

  // Error/Angry - Red (for errors, outbid notifications)
  angry100: '#FEF2F2',
  angry200: '#FEE2E2',
  angry300: '#FECACA',
  angry400: '#FCA5A5',
  angry500: '#DC2626', // Darker red for failed transactions

  overlay20: 'rgba(31, 41, 55, 0.2)',
  overlay50: 'rgba(31, 41, 55, 0.5)',
} as const

export const colors = {
  palette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: palette.neutral900,
  textDim: palette.neutral600,
  background: palette.neutral100,
  surface: palette.neutral200,
  surfaceElevated: palette.neutral100,
  border: palette.neutral300,
  tint: palette.primary500,
  tintInactive: palette.neutral400,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,

  // Glassmorphic-specific colors for light mode
  glassBackground: 'rgba(255, 255, 255, 0.15)',
  glassBackgroundStrong: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.5)',
  glassText: palette.neutral900,
  glassTextDim: palette.neutral700,
  glassShadow: 'rgba(99, 102, 241, 0.12)',

  // Gradient colors for backgrounds
  gradientStart: palette.primary100,
  gradientMiddle: palette.primary200,
  gradientEnd: palette.secondary100,

  // Card and component backgrounds
  cardBackground: 'rgba(255, 255, 255, 0.2)',
  cardBackgroundStrong: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.45)',

  // Interactive states
  pressedOverlay: 'rgba(0, 0, 0, 0.05)',
  hoverOverlay: 'rgba(0, 0, 0, 0.03)',
} as const

const theme = {
  colors,
  typography: baseTheme.typography,
  spacing: baseTheme.spacing,
  timing: baseTheme.timing,
  styles: baseTheme.styles,
}
export default theme
