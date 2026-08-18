// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef, useMemo } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'
import LinearGradient from 'react-native-linear-gradient'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const getPresetConfigs = (theme: Theme) => ({
  default: {
    icon: 'alert-circle',
    color: theme.colors.palette.primary500,
    gradient: theme.colors.palette.primary500,
  },
  success: {
    icon: 'checkmark-circle',
    color: theme.colors.palette.accent400,
    gradient: theme.colors.palette.accent400,
  },
  error: {
    icon: 'close-circle',
    color: theme.colors.palette.angry500,
    gradient: theme.colors.palette.angry500,
  },
  warning: {
    icon: 'warning',
    color: theme.colors.palette.accent500,
    gradient: theme.colors.palette.accent500,
  },
  delete: {
    icon: 'trash',
    color: theme.colors.palette.angry500,
    gradient: theme.colors.palette.angry500,
  },
})

export interface FancyAlertInput {
  key: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
  onFocus?: () => void
  autoFocus?: boolean
  multiline?: boolean
  numberOfLines?: number
}

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
  preset?: 'default' | 'success' | 'error' | 'warning' | 'delete'
  children?: React.ReactNode
  inputs?: FancyAlertInput[]
  focusedInputKey?: string
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
  children,
  inputs,
  focusedInputKey,
}: FancyAlertProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({}).current
  const presetConfigs = useMemo(() => getPresetConfigs(theme), [theme])
  const presetConfig = presetConfigs[preset]
  const iconName = icon || presetConfig.icon
  const iconColor = presetConfig.color

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus the appropriate input after animation completes
        if (focusedInputKey && inputRefs[focusedInputKey]) {
          setTimeout(() => inputRefs[focusedInputKey]?.focus(), 100)
        } else if (inputs && inputs.length > 0) {
          // Default to first input if no specific focus key
          setTimeout(() => inputRefs[inputs[0].key]?.focus(), 100)
        }
      })
    } else {
      slideAnim.setValue(SCREEN_HEIGHT)
      fadeAnim.setValue(0)
    }
  }, [visible, slideAnim, fadeAnim, focusedInputKey])

  if (!visible) return null

  const renderInputs = () => {
    if (!inputs || inputs.length === 0) return null

    return (
      <View style={styles.inputContainer}>
        {inputs.map(input => (
          <TextInput
            key={input.key}
            ref={ref => {
              inputRefs[input.key] = ref
            }}
            style={[
              styles.textInput,
              input.multiline && styles.multilineInput,
              {
                backgroundColor: theme.colors.palette.neutral400,
                color: theme.colors.text,
                borderColor: theme.colors.palette.neutral600,
              },
            ]}
            placeholder={input.placeholder}
            placeholderTextColor={theme.colors.palette.neutral600}
            value={input.value}
            onChangeText={input.onChangeText}
            onFocus={input.onFocus}
            multiline={input.multiline}
            numberOfLines={input.numberOfLines}
            textAlignVertical={input.multiline ? 'top' : 'center'}
          />
        ))}
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.overlay, containerStyle, { opacity: fadeAnim }]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${iconColor}15` },
                ]}
              >
                <Ionicons name={iconName as any} size={40} color={iconColor} />
              </View>
            </View>

            {title && (
              <Text
                style={
                  [
                    styles.title,
                    { color: theme.colors.text },
                    titleStyle,
                  ] as any
                }
              >
                {title}
              </Text>
            )}

            <Text
              style={
                [
                  styles.message,
                  { color: theme.colors.textDim },
                  messageStyle,
                ] as any
              }
            >
              {message}
            </Text>

            {renderInputs()}
            {children}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Pressable
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: theme.colors.palette.neutral200 },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.buttonText, { color: theme.colors.text }] as any}
              >
                {cancelText}
              </Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                style={[
                  styles.button,
                  styles.confirmButton,
                  confirmButtonStyle,
                ]}
                onPress={() => {
                  onConfirm()
                }}
              >
                <LinearGradient
                  colors={[iconColor, iconColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Text
                    style={
                      [
                        styles.buttonText,
                        styles.confirmButtonText,
                        { color: theme.colors.palette.neutral100 },
                        confirmTextStyle,
                      ] as any
                    }
                  >
                    {confirmText}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
    },
    bottomSheet: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.7,
      minHeight: SCREEN_HEIGHT * 0.3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
      paddingBottom: 16,
    },
    iconContainer: {
      marginBottom: 16,
    },
    iconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 22,
    },
    inputContainer: {
      width: '100%',
      marginBottom: 16,
    },
    textInput: {
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      marginBottom: 12,
      width: '100%',
      backgroundColor: theme.colors.palette.neutral200,
    },
    multilineInput: {
      minHeight: 80,
      paddingTop: 12,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 24,
      width: '100%',
    },
    button: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    cancelButton: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButton: {
      // backgroundColor handled by gradient
    },
    confirmButtonGradient: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      paddingVertical: 16,
      paddingHorizontal: 20,
      textAlign: 'center',
    },
    confirmButtonText: {
      // color handled by theme
      color: theme.colors.palette.neutral100,
    },
  })
