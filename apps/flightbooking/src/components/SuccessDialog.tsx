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
      <View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.palette.overlay50 },
        ]}
      >
        <Animated.View
          style={[
            styles.dialog,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: theme.colors.palette.neutral100,
              borderColor: theme.colors.palette.neutral400,
              shadowColor: theme.colors.palette.neutral800,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isSuccess
                    ? theme.colors.palette.success200
                    : theme.colors.palette.angry200,
                  borderColor: isSuccess
                    ? theme.colors.palette.success400
                    : theme.colors.palette.angry400,
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
                      ? theme.colors.palette.success500
                      : theme.colors.palette.angry500
                  }
                />
              </Animated.View>
            </View>
          </View>
          <Text
            text={message}
            preset="heading"
            style={[styles.title, { color: theme.colors.text }] as any}
          />
          {subMessage && (
            <Text
              text={subMessage}
              preset="formHelper"
              style={[styles.subtitle, { color: theme.colors.textDim }] as any}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    borderRadius: 24,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    borderWidth: 1,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    lineHeight: 26,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
})
