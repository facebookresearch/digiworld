// Copyright (c) Meta Platforms, Inc. and affiliates.
import { type Theme, type ThemeMode } from '../types'
import { DarkTheme, DefaultTheme } from '@react-navigation/native'
import * as SystemUI from 'expo-system-ui'
import { useCallback, useMemo } from 'react'
import { StyleProp } from 'react-native'
import { useTheme } from '../ThemeContext'

type ThemedStyle<T> = (theme: Theme) => T
type ThemedStyleArray<T> = (ThemedStyle<T> | StyleProp<T>)[]

interface UseAppThemeValue {
  navTheme: typeof DefaultTheme
  theme: Theme
  themeContext: ThemeMode
  themed: <T>(
    styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>,
  ) => T
}

const setImperativeTheming = (theme: Theme) => {
  SystemUI.setBackgroundColorAsync(theme.colors.background)
}

export const useAppTheme = (): UseAppThemeValue => {
  const { theme, mode: themeContext } = useTheme()

  // Set system UI theming
  useMemo(() => {
    setImperativeTheming(theme)
  }, [theme])

  const themed = useCallback(
    <T>(
      styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>,
    ): T => {
      if (Array.isArray(styleOrStyleFn)) {
        const processedStyles = styleOrStyleFn.map(style => {
          if (typeof style === 'function') {
            return (style as ThemedStyle<T>)(theme)
          }
          return style
        })
        return Object.assign({}, ...processedStyles) as T
      }

      if (typeof styleOrStyleFn === 'function') {
        return (styleOrStyleFn as ThemedStyle<T>)(theme)
      }

      return styleOrStyleFn as T
    },
    [theme],
  )

  return {
    navTheme: themeContext === 'dark' ? DarkTheme : DefaultTheme,
    theme,
    themeContext,
    themed,
  }
}
