// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useMemo, useRef } from 'react'
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
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'

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
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
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
                name={icon}
                size={48}
                color={theme.colors.palette.primary500}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      marginTop: spacing.lg,
      width: '100%',
    },
    buttonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    confirmButton: {
      backgroundColor: theme.colors.error,
    },
    confirmButtonText: {
      color: theme.colors.palette.neutral100,
    },
    dialog: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      elevation: 5,
      maxWidth: 400,
      padding: spacing.lg,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      width: '80%',
    },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 40,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    iconContainer: {
      marginBottom: spacing.md,
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay50,
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
  })
