// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
} from 'react'
import { Animated, View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface ToastOptions {
  title: string
  preset?: 'success' | 'error' | 'info'
  duration?: number
  placement?: 'top' | 'bottom'
}

interface ToastProps extends ToastOptions {
  onClose?: () => void
}

interface ToastContextType {
  show: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastComponent({
  title,
  preset = 'info',
  duration = 1500,
  placement = 'bottom',
  onClose,
}: ToastProps) {
  const translateY = React.useRef(
    new Animated.Value(placement === 'bottom' ? 100 : -100),
  ).current
  const opacity = React.useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()
  const { theme } = useAppTheme()
  const styles = React.useMemo(() => createStyles(theme), [theme])

  React.useEffect(() => {
    const showAnimation = Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        mass: 1,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ])

    const hideAnimation = Animated.parallel([
      Animated.spring(translateY, {
        toValue: placement === 'bottom' ? 100 : -100,
        useNativeDriver: true,
        damping: 15,
        mass: 1,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ])

    showAnimation.start()

    const timer = setTimeout(() => {
      hideAnimation.start(() => {
        onClose?.()
      })
    }, duration)

    return () => {
      clearTimeout(timer)
      showAnimation.stop()
      hideAnimation.stop()
    }
  }, [duration, onClose, opacity, translateY, placement])

  const icon = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
  }[preset] as keyof typeof Ionicons.glyphMap

  const iconColor = {
    success: theme.colors.palette.primary500,
    error: theme.colors.palette.angry500,
    info: theme.colors.palette.secondary500,
  }[preset]

  const backgroundColor = {
    success: theme.colors.palette.primary500,
    error: theme.colors.palette.angry100,
    info: theme.colors.palette.secondary500,
  }[preset]

  const containerStyle = {
    [placement]: insets[placement] + spacing.xs,
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor },
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons name={icon} size={24} color={iconColor} style={styles.icon} />
        <Text
          text={title}
          style={[styles.text, { color: theme.colors.palette.neutral100 }]}
          numberOfLines={2}
        />
      </Animated.View>
    </View>
  )
}

export function useToastProvider() {
  const [toast, setToast] = useState<ToastProps | null>(null)

  const show = useCallback((options: ToastOptions) => {
    setToast({ ...options, onClose: () => setToast(null) })
  }, [])

  const toastElement = toast ? <ToastComponent {...toast} /> : null

  const toastContext = useMemo(() => ({ show }), [show])

  return {
    ToastComponent: toastElement,
    toastContext,
  } as const
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      zIndex: 9999,
    },
    icon: {
      marginRight: spacing.xs,
    },
    text: {
      flex: 1,
    },
    toast: {
      alignItems: 'center',
      borderRadius: spacing.sm,
      elevation: 5,
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      maxWidth: '90%',
      minWidth: 200,
      padding: spacing.sm,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
  })

export { ToastContext }
