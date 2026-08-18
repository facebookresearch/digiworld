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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, spacing } from '@andojo/shared-theme'

interface FancyAlertProps {
  visible: boolean
  message: string
  icon?: string
  onClose: () => void
  onConfirm?: () => void
  containerStyle?: StyleProp<ViewStyle>
}

export function FancyAlert({
  visible,
  message,
  icon = 'alert-circle',
  onClose,
  onConfirm,
  containerStyle,
}: FancyAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current

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
            <View style={styles.iconCircle}>
              <Ionicons
                name={icon as any}
                size={48}
                color={colors.palette.primary500}
              />
            </View>
          </View>
          <Text text={message} preset="heading" style={styles.title} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text text="Cancel" style={styles.buttonText} />
            </TouchableOpacity>
            {onConfirm && (
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={() => {
                  onConfirm()
                  onClose()
                }}
              >
                <Text
                  text="Delete"
                  style={[styles.buttonText, styles.confirmButtonText]}
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
    backgroundColor: colors.palette.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
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
    backgroundColor: colors.error,
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
