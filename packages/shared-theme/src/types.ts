import type { StyleProp } from 'react-native'

export type AppTheme = string
export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  palette: {
    neutral100: string
    neutral200: string
    neutral300: string
    neutral400: string
    neutral500: string
    neutral600: string
    neutral700: string
    neutral800: string
    neutral900: string
    primary100: string
    primary200: string
    primary300: string
    primary400: string
    primary500: string
    primary600: string
    secondary100: string
    secondary200: string
    secondary300: string
    secondary400: string
    secondary500: string
    accent100: string
    accent200: string
    accent300: string
    accent400: string
    accent500: string
    accent600?: string
    angry100: string
    angry200: string
    angry300: string
    angry400: string
    angry500: string
    success100: string
    success200: string
    success300: string
    success400: string
    success500: string
    overlay20: string
    overlay50: string
    warning100?: string
    warning200?: string
    warning300?: string
    warning400?: string
    warning500?: string
  }
  transparent: string
  text: string
  textDim: string
  background: string
  border: string
  tint: string
  tintInactive: string
  separator: string
  error: string
  errorBackground: string
  // Glassmorphic-specific colors (optional)
  glassBackground?: string
  glassBackgroundStrong?: string
  glassBorder?: string
  glassBorderStrong?: string
  glassText?: string
  glassTextDim?: string
  glassShadow?: string
  // Gradient colors for backgrounds (optional)
  gradientStart?: string
  gradientMiddle?: string
  gradientEnd?: string
  // Card and component backgrounds (optional)
  cardBackground?: string
  cardBackgroundStrong?: string
  cardBorder?: string
  // Interactive states (optional)
  pressedOverlay?: string
  hoverOverlay?: string
}

export interface ThemeTypography {
  fonts: {
    spaceGrotesk: {
      light: string
      normal: string
      medium: string
      semiBold: string
      bold: string
    }
    helveticaNeue: {
      thin: string
      light: string
      normal: string
      medium: string
    }
    courier: {
      normal: string
    }
    sansSerif: {
      thin: string
      light: string
      normal: string
      medium: string
    }
    monospace: {
      normal: string
    }
  }
  primary: {
    light: string
    normal: string
    medium: string
    semiBold: string
    bold: string
  }
  secondary: {
    thin: string
    light: string
    normal: string
    medium: string
  }
  code: {
    normal: string
  }
}

export interface ThemeSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
  '3xl': number
}

export interface ThemeTiming {
  fast: number
  normal: number
  slow: number
}

export interface ThemeStyles {
  shadow: {
    sm: {
      shadowColor: string
      shadowOffset: {
        width: number
        height: number
      }
      shadowOpacity: number
      shadowRadius: number
      elevation: number
    }
    md: {
      shadowColor: string
      shadowOffset: {
        width: number
        height: number
      }
      shadowOpacity: number
      shadowRadius: number
      elevation: number
    }
  }
  borderRadius: {
    sm: number
    md: number
    lg: number
    xl: number
    full: number
  }
}

export interface Theme {
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  timing: ThemeTiming
  styles: ThemeStyles
}

export type ThemedStyle<T> = (theme: Theme) => T
export type ThemedStyleArray<T> = (
  | ThemedStyle<T>
  | StyleProp<T>
  | (StyleProp<T> | ThemedStyle<T>)[]
)[]
