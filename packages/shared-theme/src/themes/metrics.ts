import { Dimensions } from 'react-native'

const { width, height } = Dimensions.get('window')

export const metrics = {
  screenWidth: width,
  screenHeight: height,

  // Spacing
  zero: 0,
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
  xxl: 48,

  // Border Radius
  borderRadiusTiny: 4,
  borderRadiusSmall: 8,
  borderRadiusMedium: 12,
  borderRadiusLarge: 16,
  borderRadiusXL: 24,
  borderRadiusXXL: 32,

  // Font Sizes
  text: {
    tiny: 10,
    small: 12,
    medium: 14,
    large: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
  },

  // Icon Sizes
  icons: {
    tiny: 12,
    small: 16,
    medium: 24,
    large: 32,
    xl: 48,
  },

  // Component Specific
  buttonHeight: 56,
  inputHeight: 56,
  avatarSizeSmall: 32,
  avatarSizeMedium: 48,
  avatarSizeLarge: 64,
} as const
