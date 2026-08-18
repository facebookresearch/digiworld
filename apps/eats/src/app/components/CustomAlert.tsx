// Copyright (c) Meta Platforms, Inc. and affiliates.
import { colors } from '@/theme'
import { Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

interface CustomAlertProps {
  visible: boolean
  title: string
  message: string
  type?: 'default' | 'warning' | 'error' | 'success'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  showCancel?: boolean
}

const CustomAlert = ({
  visible,
  title,
  message,
  type = 'default',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
}: CustomAlertProps) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current
  const opacityAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const getIconName = () => {
    switch (type) {
      case 'warning':
        return 'warning'
      case 'error':
        return 'close-circle'
      case 'success':
        return 'checkmark-circle'
      default:
        return 'information-circle'
    }
  }

  const getGradientColors = () => {
    switch (type) {
      case 'warning':
        return [
          colors.palette.secondary400,
          colors.palette.secondary500,
        ] as const
      case 'error':
        return [colors.palette.angry400, colors.palette.angry500] as const
      case 'success':
        return [colors.palette.success400, colors.palette.success500] as const
      default:
        return [colors.palette.primary400, colors.palette.primary500] as const
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Ionicons
              name={getIconName()}
              size={32}
              color={colors.palette.neutral900}
            />
          </LinearGradient>

          <View style={styles.content}>
            <Text
              text={title}
              size="large"
              weight="bold"
              style={styles.title}
            />
            <Text text={message} size="medium" style={styles.message} />

            <View style={styles.buttonContainer}>
              {showCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text
                    text={cancelText}
                    size="medium"
                    weight="semibold"
                    style={styles.cancelButtonText}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Text
                    text={confirmText}
                    size="medium"
                    weight="semibold"
                    style={styles.confirmButtonText}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.palette.neutral100,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.palette.neutral900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: colors.palette.neutral800,
  },
  message: {
    textAlign: 'center',
    color: colors.palette.neutral600,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: colors.palette.neutral200,
  },
  confirmButton: {
    flex: 1,
  },
  confirmButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.palette.neutral700,
    textAlign: 'center',
    lineHeight: 48,
  },
  confirmButtonText: {
    color: colors.palette.neutral900,
  },
})

export default CustomAlert
