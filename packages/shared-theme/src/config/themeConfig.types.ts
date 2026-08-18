// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Runtime Theme Configuration Types
 * These types define the structure of JSON configuration files for themes
 */

export interface ColorPalette {
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
}

export interface SemanticColors {
  transparent: string
  text: string
  textDim: string
  background: string
  surface?: string
  surfaceElevated?: string
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

export interface FontFamily {
  light?: string
  normal: string
  medium?: string
  semiBold?: string
  bold?: string
  thin?: string
}

export interface TypographyConfig {
  fonts?: {
    primary?: FontFamily
    secondary?: FontFamily
    code?: { normal: string }
  }
  primary?: FontFamily
  secondary?: FontFamily
  code?: { normal: string }
}

export interface SpacingConfig {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  '2xl'?: number
  '3xl'?: number
}

export interface BorderRadiusConfig {
  sm?: number
  md?: number
  lg?: number
  xl?: number
  full?: number
}

export interface ShadowConfig {
  shadowColor?: string
  shadowOffset?: { width: number; height: number }
  shadowOpacity?: number
  shadowRadius?: number
  elevation?: number
}

export interface ComponentStyleConfig {
  button?: {
    defaultHeight?: number
    defaultBorderRadius?: number
    defaultPaddingHorizontal?: number
    defaultPaddingVertical?: number
    fontSize?: number
    fontWeight?: string
    primaryBackground?: string
    primaryText?: string
    secondaryBackground?: string
    secondaryText?: string
    disabledBackground?: string
    disabledText?: string
  }
  input?: {
    defaultHeight?: number
    defaultBorderRadius?: number
    defaultPaddingHorizontal?: number
    defaultPaddingVertical?: number
    fontSize?: number
    fontWeight?: string
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    placeholderColor?: string
    textColor?: string
    focusBorderColor?: string
  }
  text?: {
    defaultFontSize?: number
    defaultLineHeight?: number
    headingFontSize?: number
    headingLineHeight?: number
    subheadingFontSize?: number
    subheadingLineHeight?: number
  }
  screen?: {
    backgroundColor?: string
    paddingHorizontal?: number
    paddingVertical?: number
  }
}

/**
 * Main Theme Configuration Interface
 */
export interface ThemeConfig {
  name: string
  mode: 'light' | 'dark'
  colors: {
    palette: Partial<ColorPalette>
    semantic?: Partial<SemanticColors>
  }
  typography?: TypographyConfig
  spacing?: SpacingConfig
  borderRadius?: BorderRadiusConfig
  shadows?: {
    sm?: ShadowConfig
    md?: ShadowConfig
    lg?: ShadowConfig
  }
  components?: ComponentStyleConfig
}

/**
 * Runtime Theme Bundle
 * This is what gets loaded and applied at runtime
 */
export interface RuntimeThemeBundle {
  version: string
  themes: {
    [themeName: string]: ThemeConfig
  }
  defaultTheme?: string
}
