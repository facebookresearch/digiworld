// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, spacing, type Theme } from '@andojo/shared-theme'
import { useEffect, useRef, useMemo } from 'react'
import { useAppTheme } from '@andojo/shared-theme'

export type DialogType = 'success' | 'error' | 'info' | 'warning'

interface AppDialogProps {
  visible: boolean
  onClose: () => void
  type?: DialogType
  title?: string
  message: string
  subMessage?: string
  autoClose?: boolean
  autoCloseDelay?: number
  showCloseButton?: boolean
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

const getTypeConfig = (theme: Theme) => ({
  success: {
    icon: 'checkmark-circle',
    color: theme.colors.palette.success400,
    bgColor: theme.colors.palette.success400 + '20',
  },
  error: {
    icon: 'close-circle',
    color: theme.colors.palette.angry400,
    bgColor: theme.colors.palette.angry400 + '20',
  },
  info: {
    icon: 'information-circle',
    color: theme.colors.palette.primary400,
    bgColor: theme.colors.palette.primary400 + '20',
  },
  warning: {
    icon: 'warning',
    color: theme.colors.palette.angry300 || theme.colors.palette.warning500,
    bgColor:
      (theme.colors.palette.angry300 || theme.colors.palette.warning500) + '20',
  },
})

export function AppDialog({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  subMessage,
  autoClose = false,
  autoCloseDelay = 2000,
  showCloseButton = true,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
}: AppDialogProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scaleAnim = useRef(new Animated.Value(0)).current
  const iconAnim = useRef(new Animated.Value(0)).current
  const typeConfigs = getTypeConfig(theme)
  const config = typeConfigs[type]

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(iconAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]).start()

      if (autoClose) {
        const timer = setTimeout(onClose, autoCloseDelay)
        return () => clearTimeout(timer)
      }
    } else {
      scaleAnim.setValue(0)
      iconAnim.setValue(0)
    }
    return undefined
  }, [visible, autoClose, autoCloseDelay, onClose])

  if (!visible) {
    return null
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <Animated.View
            style={[
              styles.dialog,
              { transform: [{ scale: scaleAnim }] },
              {
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <View
                style={[styles.iconCircle, { backgroundColor: config.bgColor }]}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: iconAnim }],
                    opacity: iconAnim,
                  }}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={48}
                    color={config.color}
                  />
                </Animated.View>
              </View>
            </View>
            {title && (
              <Text style={{ ...styles.title, color: theme.colors.text }}>
                {title}
              </Text>
            )}
            <Text style={{ ...styles.message, color: theme.colors.text }}>
              {message}
            </Text>
            {subMessage && (
              <Text style={{ ...styles.subtitle, color: theme.colors.textDim }}>
                {subMessage}
              </Text>
            )}
            {(onConfirm || showCloseButton) && (
              <View style={styles.buttonContainer}>
                {onConfirm && (
                  <Pressable
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text
                      style={{
                        ...styles.buttonText,
                        color: theme.colors.textDim,
                      }}
                    >
                      {cancelText}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: config.color },
                  ]}
                  onPress={onConfirm || onClose}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Keep SuccessDialog for backward compatibility
export function SuccessDialog(
  props: Omit<AppDialogProps, 'type'> & { isSuccess: boolean },
) {
  return (
    <AppDialog
      {...props}
      type={props.isSuccess ? 'success' : 'error'}
      autoClose={true}
    />
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay50,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    dialog: {
      borderRadius: 24,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      elevation: 10,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    iconContainer: {
      marginBottom: spacing.md,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: spacing.xs,
      lineHeight: 22,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 14,
      marginTop: spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
      width: '100%',
    },
    button: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    confirmButton: {
      // backgroundColor set inline
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })
