// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
} from 'react'
import { Animated, StyleSheet } from 'react-native'
import { Box, Text } from '@gluestack-ui/themed'
import { spacing, useAppTheme } from '@andojo/shared-theme'
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
    <Box
      position="absolute"
      left={0}
      right={0}
      alignItems="center"
      zIndex={9999}
      {...containerStyle}
    >
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
        <Text color="$neutral100" flexShrink={1} numberOfLines={2}>
          {title}
        </Text>
      </Animated.View>
    </Box>
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

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.sm,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    minWidth: 200,
    maxWidth: '90%',
    shadowColor: 'black',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: spacing.xs,
  },
})

export { ToastContext }
