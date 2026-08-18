import { Modal, View, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useEffect, useMemo, useRef } from 'react'

interface SuccessDialogProps {
  visible: boolean
  onClose: () => void
}

export function SuccessDialog({ visible, onClose }: SuccessDialogProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scaleAnim = useRef(new Animated.Value(0)).current
  const checkmarkAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(checkmarkAnim, {
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
      checkmarkAnim.setValue(0)
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
                  transform: [{ scale: checkmarkAnim }],
                  opacity: checkmarkAnim,
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={48}
                  color={theme.colors.palette.primary500}
                />
              </Animated.View>
            </View>
          </View>
          <Text text="Email Sent! 🎉" preset="heading" style={styles.title} />
          <Text
            text="Your message is on its way"
            preset="formHelper"
            style={styles.subtitle}
          />
        </Animated.View>
      </View>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    dialog: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      elevation: 5,
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
    subtitle: {
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      marginBottom: spacing.xs,
    },
  })
