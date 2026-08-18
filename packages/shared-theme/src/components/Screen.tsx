// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { ReactNode, useRef, useState } from 'react'
import { useScrollToTop } from '@react-navigation/native'
import { StatusBar, StatusBarProps } from 'expo-status-bar'
import {
  Box,
  ScrollView,
  VStack,
  KeyboardAvoidingView,
} from '@gluestack-ui/themed'
import type { ViewProps } from 'react-native'
import {
  KeyboardAvoidingViewProps,
  LayoutChangeEvent,
  Platform,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { ExtendedEdge, useSafeAreaInsetsStyle } from '../useSafeAreaInsetsStyle'
import { useTheme } from '../ThemeContext'

export const DEFAULT_BOTTOM_OFFSET = 50

interface BaseScreenProps extends ViewProps {
  children?: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  safeAreaEdges?: ExtendedEdge[]
  backgroundColor?: string
  statusBarStyle?: 'light' | 'dark'
  keyboardOffset?: number
  keyboardBottomOffset?: number
  StatusBarProps?: StatusBarProps
  KeyboardAvoidingViewProps?: KeyboardAvoidingViewProps
}

interface FixedScreenProps extends BaseScreenProps {
  preset?: 'fixed'
}

interface ScrollScreenProps extends BaseScreenProps {
  preset?: 'scroll'
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never'
  ScrollViewProps?: ScrollViewProps
}

interface AutoScreenProps extends Omit<ScrollScreenProps, 'preset'> {
  preset?: 'auto'
  scrollEnabledToggleThreshold?: { percent?: number; point?: number }
}

export type ScreenProps = FixedScreenProps | ScrollScreenProps | AutoScreenProps

const isIos = Platform.OS === 'ios'

function useAutoPreset(props: AutoScreenProps) {
  const { preset, scrollEnabledToggleThreshold } = props
  const { percent = 0.92, point = 0 } = scrollEnabledToggleThreshold || {}

  const scrollViewHeight = useRef<number | null>(null)
  const scrollViewContentHeight = useRef<number | null>(null)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  function updateScrollState() {
    if (!scrollViewHeight.current || !scrollViewContentHeight.current) return

    const contentFitsScreen = point
      ? scrollViewContentHeight.current < scrollViewHeight.current - point
      : scrollViewContentHeight.current < scrollViewHeight.current * percent

    setScrollEnabled(!contentFitsScreen)
  }

  function onContentSizeChange(w: number, h: number) {
    scrollViewContentHeight.current = h
    updateScrollState()
  }

  function onLayout(e: LayoutChangeEvent) {
    scrollViewHeight.current = e.nativeEvent.layout.height
    updateScrollState()
  }

  if (preset === 'auto') updateScrollState()

  return {
    scrollEnabled: preset === 'auto' ? scrollEnabled : true,
    onContentSizeChange,
    onLayout,
  }
}

function ScreenWithoutScrolling(props: ScreenProps) {
  const { children, preset } = props

  return (
    <Box flex={1} height="100%" width="100%">
      <VStack
        flex={1}
        justifyContent={preset === 'fixed' ? 'flex-end' : 'flex-start'}
        alignItems="stretch"
      >
        {children}
      </VStack>
    </Box>
  )
}

function ScreenWithScrolling(props: ScreenProps) {
  const {
    children,
    keyboardShouldPersistTaps = 'handled',
    ScrollViewProps,
    contentContainerStyle,
  } = props as ScrollScreenProps

  const ref = useRef<any>(null)
  const { scrollEnabled, onContentSizeChange, onLayout } = useAutoPreset(
    props as AutoScreenProps,
  )

  useScrollToTop(ref)

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      scrollEnabled={scrollEnabled}
      {...ScrollViewProps}
      onLayout={e => {
        onLayout(e)
        ScrollViewProps?.onLayout?.(e)
      }}
      onContentSizeChange={(w: number, h: number) => {
        onContentSizeChange(w, h)
        ScrollViewProps?.onContentSizeChange?.(w, h)
      }}
      flex={1}
      height="100%"
      width="100%"
      contentContainerStyle={contentContainerStyle}
    >
      <VStack flex={1} justifyContent="flex-start" alignItems="stretch">
        {children}
      </VStack>
    </ScrollView>
  )
}

export function Screen(props: ScreenProps) {
  const {
    backgroundColor,
    KeyboardAvoidingViewProps,
    keyboardOffset = 0,
    safeAreaEdges,
    StatusBarProps,
    statusBarStyle = 'dark',
    preset = 'fixed',
  } = props

  const { theme, componentStyles } = useTheme()
  const screenConfig = componentStyles.screen || {}
  const $containerInsets = useSafeAreaInsetsStyle(safeAreaEdges)

  const finalBackgroundColor =
    backgroundColor || screenConfig.backgroundColor || theme.colors.background

  return (
    <Box
      flex={1}
      height="100%"
      width="100%"
      backgroundColor={finalBackgroundColor}
      style={$containerInsets}
    >
      <StatusBar style={statusBarStyle} {...StatusBarProps} />

      <KeyboardAvoidingView
        behavior={isIos ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
        {...KeyboardAvoidingViewProps}
        style={[{ flex: 1 }, KeyboardAvoidingViewProps?.style]}
      >
        {!preset || preset === 'fixed' ? (
          <ScreenWithoutScrolling {...props} />
        ) : (
          <ScreenWithScrolling {...props} />
        )}
      </KeyboardAvoidingView>
    </Box>
  )
}
