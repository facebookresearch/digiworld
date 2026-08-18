// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  Theme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeStyles,
} from '../types'
import {
  ThemeConfig,
  RuntimeThemeBundle,
  ColorPalette,
  SemanticColors,
} from './themeConfig.types'
import { baseTheme } from '../themes/base'

/**
 * Default color palette fallback
 */
const defaultPalette: ColorPalette = {
  neutral100: '#FFFFFF',
  neutral200: '#F4F2F1',
  neutral300: '#D7CEC9',
  neutral400: '#B6ACA6',
  neutral500: '#978F8A',
  neutral600: '#564E4A',
  neutral700: '#3C3836',
  neutral800: '#191015',
  neutral900: '#000000',
  primary100: '#E6F4EA',
  primary200: '#C6E6D0',
  primary300: '#96D0AD',
  primary400: '#66BA8C',
  primary500: '#2E8B57',
  primary600: '#1B6B3F',
  secondary100: '#DCDDE9',
  secondary200: '#BCC0D6',
  secondary300: '#9196B9',
  secondary400: '#626894',
  secondary500: '#41476E',
  accent100: '#FFEED4',
  accent200: '#FFE1B2',
  accent300: '#FDD495',
  accent400: '#FBC878',
  accent500: '#FFBB50',
  angry100: '#F2D6CD',
  angry200: '#E5AC99',
  angry300: '#D78366',
  angry400: '#C03403',
  angry500: '#C03403',
  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',
  overlay20: 'rgba(25, 16, 21, 0.2)',
  overlay50: 'rgba(25, 16, 21, 0.5)',
}

/**
 * Theme Loader - Converts JSON config to internal Theme format
 */
export class ThemeLoader {
  private static cache: Map<string, Theme> = new Map()

  /**
   * Load theme from JSON configuration
   */
  static loadFromConfig(config: ThemeConfig): Theme {
    const cacheKey = `${config.name}-${config.mode}`

    // Check cache first
    if (ThemeLoader.cache.has(cacheKey)) {
      return ThemeLoader.cache.get(cacheKey)!
    }

    const theme = ThemeLoader.buildTheme(config)
    ThemeLoader.cache.set(cacheKey, theme)
    return theme
  }

  /**
   * Load theme from JSON string
   */
  static loadFromJSON(jsonString: string): Theme {
    try {
      const config: ThemeConfig = JSON.parse(jsonString)
      return ThemeLoader.loadFromConfig(config)
    } catch (error) {
      console.error('Failed to parse theme JSON:', error)
      throw new Error('Invalid theme configuration JSON')
    }
  }

  /**
   * Load theme bundle (multiple themes)
   */
  static loadBundle(bundle: RuntimeThemeBundle): Map<string, Theme> {
    const themes = new Map<string, Theme>()

    Object.entries(bundle.themes).forEach(([name, config]) => {
      themes.set(name, ThemeLoader.loadFromConfig(config))
    })

    return themes
  }

  /**
   * Build complete theme from config
   */
  private static buildTheme(config: ThemeConfig): Theme {
    const palette = { ...defaultPalette, ...config.colors.palette }
    const colors = ThemeLoader.buildColors(palette, config.colors.semantic)
    const typography = ThemeLoader.buildTypography(config.typography)
    const spacing = ThemeLoader.buildSpacing(config.spacing)
    const styles = ThemeLoader.buildStyles(config.borderRadius, config.shadows)

    return {
      colors,
      typography,
      spacing,
      timing: baseTheme.timing,
      styles,
    }
  }

  /**
   * Build color scheme
   */
  private static buildColors(
    palette: ColorPalette,
    semanticOverrides?: Partial<SemanticColors>,
  ): ThemeColors {
    const defaultSemantic: SemanticColors = {
      transparent: 'rgba(0, 0, 0, 0)',
      text: palette.neutral800,
      textDim: palette.neutral600,
      background: palette.neutral200,
      border: palette.neutral400,
      tint: palette.primary500,
      tintInactive: palette.neutral300,
      separator: palette.neutral300,
      error: palette.angry500,
      errorBackground: palette.angry100,
    }

    // Merge default semantic with overrides, ensuring all optional properties are included
    const semantic = {
      ...defaultSemantic,
      ...(semanticOverrides || {}),
    } as SemanticColors

    return {
      palette,
      ...semantic,
    }
  }

  /**
   * Build typography
   */
  private static buildTypography(
    config?: ThemeConfig['typography'],
  ): ThemeTypography {
    if (!config) {
      return baseTheme.typography as ThemeTypography
    }

    const fonts = config.fonts || baseTheme.typography.fonts
    const primary = config.primary || baseTheme.typography.primary
    const secondary = config.secondary || baseTheme.typography.secondary
    const code = config.code || baseTheme.typography.code

    return {
      fonts: fonts as any,
      primary: primary as any,
      secondary: secondary as any,
      code: code as any,
    }
  }

  /**
   * Build spacing
   */
  private static buildSpacing(config?: ThemeConfig['spacing']): ThemeSpacing {
    return {
      xs: config?.xs ?? baseTheme.spacing.xs,
      sm: config?.sm ?? baseTheme.spacing.sm,
      md: config?.md ?? baseTheme.spacing.md,
      lg: config?.lg ?? baseTheme.spacing.lg,
      xl: config?.xl ?? baseTheme.spacing.xl,
      '2xl': config?.['2xl'] ?? baseTheme.spacing['2xl'],
      '3xl': config?.['3xl'] ?? baseTheme.spacing['3xl'],
    }
  }

  /**
   * Build styles
   */
  private static buildStyles(
    borderRadius?: ThemeConfig['borderRadius'],
    shadows?: ThemeConfig['shadows'],
  ): ThemeStyles {
    const smShadow = shadows?.sm || baseTheme.styles.shadow.sm
    const mdShadow = shadows?.md || baseTheme.styles.shadow.md

    return {
      shadow: {
        sm: {
          shadowColor: smShadow.shadowColor || '#000',
          shadowOffset: smShadow.shadowOffset || { width: 0, height: 1 },
          shadowOpacity: smShadow.shadowOpacity ?? 0.18,
          shadowRadius: smShadow.shadowRadius || 1.0,
          elevation: smShadow.elevation ?? 1,
        },
        md: {
          shadowColor: mdShadow.shadowColor || '#000',
          shadowOffset: mdShadow.shadowOffset || { width: 0, height: 2 },
          shadowOpacity: mdShadow.shadowOpacity ?? 0.25,
          shadowRadius: mdShadow.shadowRadius || 3.84,
          elevation: mdShadow.elevation ?? 5,
        },
      },
      borderRadius: {
        sm: borderRadius?.sm ?? baseTheme.styles.borderRadius.sm,
        md: borderRadius?.md ?? baseTheme.styles.borderRadius.md,
        lg: borderRadius?.lg ?? baseTheme.styles.borderRadius.lg,
        xl: borderRadius?.xl ?? baseTheme.styles.borderRadius.xl,
        full: borderRadius?.full ?? baseTheme.styles.borderRadius.full,
      },
    }
  }

  /**
   * Clear theme cache
   */
  static clearCache(): void {
    ThemeLoader.cache.clear()
  }

  /**
   * Validate theme config
   */
  static validate(config: ThemeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.name) {
      errors.push('Theme name is required')
    }

    if (!config.mode || !['light', 'dark'].includes(config.mode)) {
      errors.push('Theme mode must be "light" or "dark"')
    }

    if (!config.colors || !config.colors.palette) {
      errors.push('Colors configuration is required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
