import { Modal, View, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, spacing } from '@andojo/shared-theme'
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
          style={[styles.dialog, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
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
                      ? colors.palette.primary500
                      : colors.palette.angry500
                  }
                />
              </Animated.View>
            </View>
          </View>
          <Text text={message} preset="heading" style={styles.title} />
          {subMessage && (
            <Text
              text={subMessage}
              preset="formHelper"
              style={styles.subtitle}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    width: '80%',
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
    fontSize: 16,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  subtitle: {
    color: colors.textDim,
    textAlign: 'center',
  },
})
