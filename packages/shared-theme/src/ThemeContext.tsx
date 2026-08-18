// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { Theme, ThemeMode, ThemeColors } from './types'
import {
  ThemeConfig,
  RuntimeThemeBundle,
  ComponentStyleConfig,
} from './config/themeConfig.types'
import { ThemeLoader } from './config/themeLoader'
import { ComponentStyleManager } from './config/componentStyles'
import { baseTheme } from './themes/base'

// ---------------------------------------------------------------------------
// Default build-time theme
//
// This is a generic fallback shown only before a runtime theme.json is loaded
// from the device (see themeLoader.ts). In production every profile ships its
// own theme.json that completely overrides this via ThemeLoader.loadFromConfig.
// ---------------------------------------------------------------------------

const defaultPalette = {
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
  accent600: '#E0A030',
  angry100: '#F2D6CD',
  angry200: '#E5AC99',
  angry300: '#D78366',
  angry400: '#C03403',
  angry500: '#C03403',
  warning100: '#FFF7E6',
  warning200: '#FFE7BA',
  warning300: '#FFD591',
  warning400: '#FFC069',
  warning500: '#FA8C16',
  success100: '#E6F2E6',
  success200: '#BFDFBF',
  success300: '#80C080',
  success400: '#4DA64D',
  success500: '#1A8C1A',
  overlay20: 'rgba(25, 16, 21, 0.2)',
  overlay50: 'rgba(25, 16, 21, 0.5)',
} as const

const defaultLightColors: ThemeColors = {
  palette: defaultPalette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: defaultPalette.neutral800,
  textDim: defaultPalette.neutral600,
  background: defaultPalette.neutral200,
  border: defaultPalette.neutral400,
  tint: defaultPalette.primary500,
  tintInactive: defaultPalette.neutral300,
  separator: defaultPalette.neutral300,
  error: defaultPalette.angry500,
  errorBackground: defaultPalette.angry100,
}

const darkPalette = {
  ...defaultPalette,
  neutral100: '#000000',
  neutral200: '#191015',
  neutral300: '#3C3836',
  neutral400: '#564E4A',
  neutral500: '#978F8A',
  neutral600: '#B6ACA6',
  neutral700: '#D7CEC9',
  neutral800: '#F4F2F1',
  neutral900: '#FFFFFF',
} as const

const defaultDarkColors: ThemeColors = {
  palette: darkPalette,
  transparent: 'rgba(0, 0, 0, 0)',
  text: darkPalette.neutral800,
  textDim: darkPalette.neutral600,
  background: darkPalette.neutral200,
  border: darkPalette.neutral400,
  tint: defaultPalette.primary500,
  tintInactive: darkPalette.neutral300,
  separator: darkPalette.neutral300,
  error: defaultPalette.angry500,
  errorBackground: defaultPalette.angry100,
}

const defaultThemes: Record<ThemeMode, Theme> = {
  light: {
    colors: defaultLightColors,
    typography: baseTheme.typography,
    spacing: baseTheme.spacing,
    timing: baseTheme.timing,
    styles: baseTheme.styles,
  },
  dark: {
    colors: defaultDarkColors,
    typography: baseTheme.typography,
    spacing: baseTheme.spacing,
    timing: baseTheme.timing,
    styles: baseTheme.styles,
  },
}

const CURRENT_MODE: ThemeMode = 'dark'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  componentStyles: ComponentStyleConfig
  loadThemeFromConfig: (config: ThemeConfig) => void
  loadThemeFromJSON: (jsonString: string) => void
  loadThemeBundle: (bundle: RuntimeThemeBundle) => void
  setTheme: (themeName: string, mode?: ThemeMode) => void
  updateComponentStyles: (styles: ComponentStyleConfig) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const colors = defaultThemes[CURRENT_MODE].colors
export { colors }

interface ThemeProviderProps {
  children: React.ReactNode
  initialThemeConfig?: ThemeConfig
  initialComponentStyles?: ComponentStyleConfig
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialThemeConfig,
  initialComponentStyles,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (initialThemeConfig) {
      ComponentStyleManager.loadStyles(initialThemeConfig.components)
      return ThemeLoader.loadFromConfig(initialThemeConfig)
    }
    if (initialComponentStyles) {
      ComponentStyleManager.loadStyles(initialComponentStyles)
    }
    return defaultThemes[CURRENT_MODE]
  })

  const [currentMode, setCurrentMode] = useState<ThemeMode>(CURRENT_MODE)
  const [runtimeThemes, setRuntimeThemes] = useState<Map<string, Theme>>(
    new Map(),
  )
  const [componentStyles, setComponentStyles] = useState<ComponentStyleConfig>(
    ComponentStyleManager.getAll(),
  )

  const loadThemeFromConfig = useCallback((config: ThemeConfig) => {
    try {
      const theme = ThemeLoader.loadFromConfig(config)
      if (config.components) {
        ComponentStyleManager.loadStyles(config.components)
        setComponentStyles(ComponentStyleManager.getAll())
      }
      setCurrentTheme(theme)
      setCurrentMode(config.mode)
      console.log(`Theme "${config.name}" loaded successfully`)
    } catch (error) {
      console.error('Failed to load theme from config:', error)
    }
  }, [])

  const loadThemeFromJSON = useCallback(
    (jsonString: string) => {
      try {
        const config: ThemeConfig = JSON.parse(jsonString)
        loadThemeFromConfig(config)
      } catch (error) {
        console.error('Failed to load theme from JSON:', error)
      }
    },
    [loadThemeFromConfig],
  )

  const loadThemeBundle = useCallback((bundle: RuntimeThemeBundle) => {
    try {
      const loadedThemes = ThemeLoader.loadBundle(bundle)
      setRuntimeThemes(loadedThemes)

      if (bundle.defaultTheme && loadedThemes.has(bundle.defaultTheme)) {
        setCurrentTheme(loadedThemes.get(bundle.defaultTheme)!)
      }

      console.log(`Theme bundle loaded with ${loadedThemes.size} themes`)
    } catch (error) {
      console.error('Failed to load theme bundle:', error)
    }
  }, [])

  const setTheme = useCallback(
    (themeName: string, mode?: ThemeMode) => {
      if (runtimeThemes.has(themeName)) {
        setCurrentTheme(runtimeThemes.get(themeName)!)
        return
      }

      const themeMode = mode || currentMode
      if (themeMode in defaultThemes) {
        setCurrentTheme(defaultThemes[themeMode])
        setCurrentMode(themeMode)
      } else {
        console.warn(`Theme "${themeName}" not found`)
      }
    },
    [runtimeThemes, currentMode],
  )

  const updateComponentStyles = useCallback((styles: ComponentStyleConfig) => {
    ComponentStyleManager.loadStyles(styles)
    setComponentStyles(ComponentStyleManager.getAll())
  }, [])

  const value = useMemo(
    () => ({
      theme: currentTheme,
      mode: currentMode,
      componentStyles,
      loadThemeFromConfig,
      loadThemeFromJSON,
      loadThemeBundle,
      setTheme,
      updateComponentStyles,
    }),
    [
      currentTheme,
      currentMode,
      componentStyles,
      loadThemeFromConfig,
      loadThemeFromJSON,
      loadThemeBundle,
      setTheme,
      updateComponentStyles,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return { ...context, colorScheme: context.mode }
}
