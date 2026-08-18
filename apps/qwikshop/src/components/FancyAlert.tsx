// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, spacing } from '@andojo/shared-theme'

interface FancyAlertProps {
  visible: boolean
  title?: string
  message: string
  icon?: string
  onClose: () => void
  onConfirm?: () => void
  containerStyle?: StyleProp<ViewStyle>
  confirmText?: string
  cancelText?: string
  confirmButtonStyle?: StyleProp<ViewStyle>
  confirmTextStyle?: StyleProp<TextStyle>
  titleStyle?: StyleProp<TextStyle>
  messageStyle?: StyleProp<TextStyle>
  preset?: 'default' | 'success' | 'error' | 'warning'
}

const PRESET_CONFIGS = {
  default: {
    icon: 'alert-circle',
    color: colors.palette.primary500,
  },
  success: {
    icon: 'checkmark-circle',
    color: colors.palette.primary100,
  },
  error: {
    icon: 'close-circle',
    color: colors.error,
  },
  warning: {
    icon: 'warning',
    color: colors.palette.angry500,
  },
}

export function FancyAlert({
  visible,
  title,
  message,
  icon,
  onClose,
  onConfirm,
  containerStyle,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonStyle,
  confirmTextStyle,
  titleStyle,
  messageStyle,
  preset = 'default',
}: FancyAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const presetConfig = PRESET_CONFIGS[preset]
  const iconName = icon || presetConfig.icon
  const iconColor = presetConfig.color

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start()
    } else {
      scaleAnim.setValue(0)
    }
  }, [visible, scaleAnim])

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, containerStyle]}>
        <Animated.View
          style={[
            styles.dialog,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[styles.iconCircle, { backgroundColor: `${iconColor}10` }]}
            >
              <Ionicons name={iconName as any} size={48} color={iconColor} />
            </View>
          </View>

          {title && (
            <Text
              text={title}
              preset="heading"
              style={[styles.title, titleStyle]}
            />
          )}

          <Text text={message} style={[styles.message, messageStyle]} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text text={cancelText} style={styles.buttonText} />
            </TouchableOpacity>
            {onConfirm && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: iconColor },
                  confirmButtonStyle,
                ]}
                onPress={() => {
                  onConfirm()
                  onClose()
                }}
              >
                <Text
                  text={confirmText}
                  style={[
                    styles.buttonText,
                    styles.confirmButtonText,
                    confirmTextStyle,
                  ]}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.textDim,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.palette.neutral200,
  },
  confirmButton: {
    backgroundColor: colors.palette.primary500,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButtonText: {
    color: colors.palette.neutral100,
  },
})
