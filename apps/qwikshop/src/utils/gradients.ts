import { useColorScheme } from 'react-native'
// Light mode gradients
const lightGradients = {
  appBackground: ['#F8F0FF', '#E9D5FF', '#D8B4FE'],
  screenBackground: ['#F8F0FF', '#F1E7FF'],

  headerPrimary: ['#A855F7', '#9333EA'],
  headerSecondary: ['#C084FC', '#A855F7'],
  headerAccent: ['#F43F5E', '#E11D48'],

  cardPrimary: ['#FFFFFF', '#FEFEFE'],
  cardSecondary: ['#F8F9FA', '#F1F3F4'],
  cardHighlight: ['#FFF1F2', '#FFE4E6'],
  cardSuccess: ['#F6FFED', '#ECFDF5'],

  buttonPrimary: ['#A855F7', '#9333EA'],
  buttonSecondary: ['#F43F5E', '#E11D48'],
  buttonSuccess: ['#52C41A', '#389E0D'],
  buttonNeutral: ['#6B7280', '#4B5563'],

  success: ['#ECFDF5', '#D1FAE5'],
  warning: ['#FFFBEB', '#FEF3C7'],
  error: ['#FEF2F2', '#FECACA'],
  info: ['#EFF6FF', '#DBEAFE'],

  avatar: ['#A855F7', '#9333EA'],
  badge: ['#F43F5E', '#E11D48'],
  overlay: ['rgba(168, 85, 247, 0.1)', 'rgba(147, 51, 234, 0.2)'],

  categoryCard: ['#F8F0FF', '#E9D5FF'],
  productCard: ['#FFFFFF', '#FAFAFA'],
  promoCard: ['#FFF1F2', '#FFE4E6'],
} as const

// Dark mode gradients
const darkGradients = {
  appBackground: ['#2E1065', '#3730A3', '#4338CA'],
  screenBackground: ['#2E1065', '#3730A3'],

  headerPrimary: ['#A855F7', '#C084FC'],
  headerSecondary: ['#5B21B6', '#A855F7'],
  headerAccent: ['#F43F5E', '#FDA4AF'],

  cardPrimary: ['#2D2D2D', '#404040'],
  cardSecondary: ['#1A1A1A', '#2D2D2D'],
  cardHighlight: ['#4C0519', '#7F1D1D'],
  cardSuccess: ['#0A2E00', '#0F4000'],

  buttonPrimary: ['#A855F7', '#C084FC'],
  buttonSecondary: ['#F43F5E', '#FDA4AF'],
  buttonSuccess: ['#52C41A', '#6BD043'],
  buttonNeutral: ['#595959', '#737373'],

  success: ['#0A2E00', '#155200'],
  warning: ['#2E1A00', '#472A00'],
  error: ['#2E0A0A', '#470F0F'],
  info: ['#083344', '#0F4C75'],

  avatar: ['#A855F7', '#C084FC'],
  badge: ['#F43F5E', '#FDA4AF'],
  overlay: ['rgba(168, 85, 247, 0.2)', 'rgba(196, 132, 252, 0.3)'],

  categoryCard: ['#2E1065', '#3730A3'],
  productCard: ['#2D2D2D', '#404040'],
  promoCard: ['#4C0519', '#7F1D1D'],
} as const

// Hook to get theme-aware gradients
export const useAppGradients = () => {
  const colorScheme = useColorScheme()
  return colorScheme === 'dark' ? darkGradients : lightGradients
}

// Static gradients for non-hook usage (defaults to light)
export const AppGradients = lightGradients

export type GradientKey = keyof typeof AppGradients

export const getGradient = (key: GradientKey): string[] => {
  return AppGradients[key]
}

export const GradientConfig = {
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  diagonalReverse: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
} as const
