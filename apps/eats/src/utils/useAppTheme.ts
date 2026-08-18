// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { StyleProp, useColorScheme } from 'react-native'
import * as SystemUI from 'expo-system-ui'
import {
  DarkTheme,
  DefaultTheme,
  useTheme as useNavTheme,
} from '@react-navigation/native'

import {
  type BaseTheme,
  type ThemeContexts,
  type ThemedStyle,
  type ThemedStyleArray,
  lightTheme,
  darkTheme,
} from '@/theme'

type ThemeContextType = {
  themeScheme: ThemeContexts
  setThemeContextOverride: (newTheme: ThemeContexts) => void
}

// create a React context and provider for the current theme
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
)

export const themeContextToTheme = (themeContext: ThemeContexts): BaseTheme => {
  return themeContext === 'dark' ? darkTheme : lightTheme
}

const setImperativeTheming = (theme: BaseTheme) => {
  SystemUI.setBackgroundColorAsync(theme.colors.background)
}

export const useThemeProvider = (initialTheme: ThemeContexts = undefined) => {
  const colorScheme = useColorScheme()
  const [overrideTheme, setTheme] = useState<ThemeContexts>(initialTheme)

  const setThemeContextOverride = useCallback((newTheme: ThemeContexts) => {
    setTheme(newTheme)
  }, [])

  const themeScheme = overrideTheme || colorScheme || 'light'
  const navigationTheme = themeScheme === 'dark' ? DarkTheme : DefaultTheme

  useEffect(() => {
    setImperativeTheming(themeContextToTheme(themeScheme))
  }, [themeScheme])

  return {
    themeScheme,
    navigationTheme,
    setThemeContextOverride,
    ThemeProvider: ThemeContext.Provider,
  }
}

interface UseAppThemeValue {
  // The theme object from react-navigation
  navTheme: typeof DefaultTheme

  // The theme override setter
  setThemeContextOverride: (newTheme: ThemeContexts) => void

  // The resolved current theme object
  theme: BaseTheme

  // The theme context (light or dark, may be overridden by user setting)
  themeContext: ThemeContexts

  // Helper function to apply themed styles
  themed: <T>(
    styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>,
  ) => T
}

/**
 * Custom hook that provides the app theme and utility functions for theming.
 *
 * @returns {UseAppThemeReturn} An object containing various theming values and utilities.
 * @throws {Error} If used outside of a ThemeProvider.
 */
export const useAppTheme = (): UseAppThemeValue => {
  const navTheme = useNavTheme()
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  const { themeScheme: overrideTheme, setThemeContextOverride } = context

  const themeContext: ThemeContexts = useMemo(
    () => overrideTheme || (navTheme.dark ? 'dark' : 'light'),
    [overrideTheme, navTheme],
  )

  const themeVariant: BaseTheme = useMemo(
    () => themeContextToTheme(themeContext),
    [themeContext],
  )

  const themed = useCallback(
    <T>(
      styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>,
    ) => {
      const flatStyles = [styleOrStyleFn].flat(3)
      const stylesArray = flatStyles.map(f => {
        if (typeof f === 'function') {
          return (f as ThemedStyle<T>)(themeVariant)
        } else {
          return f
        }
      })

      // Flatten the array of styles into a single object
      return Object.assign({}, ...stylesArray) as T
    },
    [themeVariant],
  )

  return {
    navTheme,
    setThemeContextOverride,
    theme: themeVariant,
    themeContext,
    themed,
  }
}
