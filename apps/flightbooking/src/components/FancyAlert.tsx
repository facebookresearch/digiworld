// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef } from 'react'
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'

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

const getPresetConfig = (preset: string, theme: Theme) => {
  const configs = {
    default: {
      icon: 'alert-circle',
      color: theme.colors.palette.primary500,
    },
    success: {
      icon: 'checkmark-circle',
      color: theme.colors.palette.primary400,
    },
    error: {
      icon: 'close-circle',
      color: theme.colors.palette.angry500,
    },
    warning: {
      icon: 'warning',
      color: theme.colors.palette.secondary500,
    },
    delete: {
      icon: 'trash',
      color: theme.colors.palette.angry500,
    },
  }
  return configs[preset as keyof typeof configs] || configs.default
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
  const scaleAnim = useRef(new Animated.Value(0)).current
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({}).current
  const presetConfig = getPresetConfig(preset, theme)
  const iconName = icon || presetConfig.icon
  const iconColor = presetConfig.color

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start(() => {
        // Focus the appropriate input after animation completes
        if (focusedInputKey && inputRefs[focusedInputKey]) {
          setTimeout(() => inputRefs[focusedInputKey]?.focus(), 100)
        } else if (inputs && inputs.length > 0) {
          // Default to first input if no specific focus key
          setTimeout(() => inputRefs[inputs[0].key]?.focus(), 100)
        }
      })
    } else {
      scaleAnim.setValue(0)
    }
  }, [visible, scaleAnim, focusedInputKey])

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
      <View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.palette.overlay50 },
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.palette.neutral300,
              shadowColor: theme.colors.palette.primary500,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${iconColor}20` },
                ]}
              >
                <Ionicons name={iconName as any} size={48} color={iconColor} />
              </View>
            </View>

            {title && (
              <Text
                style={[styles.title, { color: theme.colors.text }, titleStyle]}
              >
                {title}
              </Text>
            )}

            <Text
              style={[
                styles.message,
                { color: theme.colors.palette.neutral700 },
                messageStyle,
              ]}
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
                { backgroundColor: theme.colors.palette.neutral400 },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                {cancelText}
              </Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: iconColor },
                  confirmButtonStyle,
                ]}
                onPress={() => {
                  onConfirm()
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    styles.confirmButtonText,
                    { color: theme.colors.palette.neutral100 },
                    confirmTextStyle,
                  ]}
                >
                  {confirmText}
                </Text>
              </Pressable>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    width: '100%',
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    // backgroundColor handled by theme
  },
  confirmButton: {
    // backgroundColor handled by preset
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    // color handled by theme
  },
})
