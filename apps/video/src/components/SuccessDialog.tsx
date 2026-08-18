// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Modal, View, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, spacing, useTheme } from '@andojo/shared-theme'
import { useEffect, useRef } from 'react'

interface SuccessDialogProps {
  visible: boolean
  onClose: () => void
  isSuccess: boolean
  message: string
  subMessage?: string
}

export function SuccessDialog({
  visible,
  onClose,
  isSuccess,
  message,
  subMessage,
}: SuccessDialogProps) {
  const { theme } = useTheme()
  const scaleAnim = useRef(new Animated.Value(0)).current
  const iconAnim = useRef(new Animated.Value(0)).current

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

      // Auto close after 2 seconds
      setTimeout(onClose, 2000)
    } else {
      scaleAnim.setValue(0)
      iconAnim.setValue(0)
    }
  }, [visible])

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialog,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: theme.colors.palette.neutral300,
              shadowColor: theme.colors.palette.primary200,
              borderColor: theme.colors.palette.neutral500,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: theme.colors.palette.neutral400,
                  borderColor: theme.colors.palette.primary200,
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [{ scale: iconAnim }],
                  opacity: iconAnim,
                }}
              >
                <Ionicons
                  name={isSuccess ? 'checkmark' : 'close-outline'}
                  size={48}
                  color={
                    isSuccess
                      ? theme.colors.palette.primary200
                      : theme.colors.palette.angry200
                  }
                />
              </Animated.View>
            </View>
          </View>
          <Text
            text={message}
            preset="heading"
            style={[styles.title, { color: theme.colors.palette.neutral900 }]}
          />
          {subMessage && (
            <Text
              text={subMessage}
              preset="formHelper"
              style={[
                styles.subtitle,
                { color: theme.colors.palette.neutral800 },
              ]}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    borderRadius: 20,
    padding: spacing.lg,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
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
    borderWidth: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
  },
})
