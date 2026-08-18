import { Modal, View, StyleSheet, Animated, Easing } from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { spacing } from '@andojo/shared-theme'
import { useEffect, useRef, useMemo } from 'react'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

interface SuccessDialogProps {
  visible: boolean
  onClose: () => void
  isSuccess: boolean
  message: string
  subMessage?: string
}

export const SuccessDialog = observer(function SuccessDialog({
  visible,
  onClose,
  isSuccess,
  message,
  subMessage,
}: SuccessDialogProps) {
  const { theme } = useAppTheme()
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

  const styles = useMemo(() => createStyles(theme), [theme])

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
                      ? theme.colors.palette.success500
                      : theme.colors.palette.angry500
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
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.palette.overlay60,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    dialog: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      padding: spacing.xl,
      width: '90%',
      maxWidth: 320,
      alignItems: 'center',
      elevation: 12,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    iconContainer: {
      marginBottom: spacing.lg,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: spacing.sm,
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 20,
    },
  })
