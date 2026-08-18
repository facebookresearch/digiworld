// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  useRef,
  useEffect,
  forwardRef,
  useState,
  useImperativeHandle,
} from 'react'
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import { Text } from '@/components'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export interface PinInputModalRef {
  getPin: () => string
  clearPin: () => void
}

interface PinInputModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  isLoading?: boolean
  isVerifyingPin?: boolean
}

export const PinInputModal = forwardRef<PinInputModalRef, PinInputModalProps>(
  ({ visible, onClose, onSubmit, isLoading, isVerifyingPin }, ref) => {
    const { theme } = useAppTheme()
    const [pin, setPin] = useState('')
    const pinInputRef = useRef<TextInput>(null)

    useImperativeHandle(ref, () => ({
      getPin: () => pin,
      clearPin: () => setPin(''),
    }))

    useEffect(() => {
      if (visible) {
        setTimeout(() => {
          pinInputRef.current?.focus()
        }, 100)
      }
    }, [visible])

    useEffect(() => {
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setTimeout(() => {
            if (visible) {
              pinInputRef.current?.focus()
            }
          }, 100)
        },
      )

      return () => {
        keyboardDidHideListener.remove()
      }
    }, [visible])

    const handlePinChange = (text: string) => {
      if (text.length <= 4 && /^\d*$/.test(text)) {
        setPin(text)
      }
    }

    const handlePinKeyPress = (e: any) => {
      if (e.nativeEvent.key === 'Backspace' && pin.length === 0) {
        onClose()
      }
    }

    const styles = createStyles(theme)

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={onClose}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.pinInputWrapper}>
                  <View style={styles.pinTitleContainer}>
                    <Text
                      text="Enter PIN"
                      preset="heading"
                      style={styles.pinTitle}
                    />
                    <Text
                      text="Please enter your 4-digit PIN"
                      size="sm"
                      style={styles.pinSubtitle}
                    />
                  </View>
                  <View style={styles.pinBoxes}>
                    {[0, 1, 2, 3].map(index => (
                      <View
                        key={index}
                        style={[
                          styles.pinBox,
                          pin.length > index && styles.pinBoxFilled,
                          pin.length === index && styles.pinBoxActive,
                        ]}
                      >
                        {pin.length > index && <View style={styles.pinDot} />}
                      </View>
                    ))}
                  </View>
                  <TextInput
                    ref={pinInputRef}
                    value={pin}
                    onChangeText={handlePinChange}
                    onKeyPress={handlePinKeyPress}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.pinInput}
                    autoFocus
                    returnKeyType="done"
                    blurOnSubmit={false}
                    secureTextEntry
                    onBlur={() => {
                      setTimeout(() => {
                        if (visible) {
                          pinInputRef.current?.focus()
                        }
                      }, 100)
                    }}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                {isLoading || isVerifyingPin ? (
                  <View style={styles.loadingContainer}>
                    <Text
                      text={
                        isVerifyingPin ? 'Verifying PIN...' : 'Processing...'
                      }
                      style={styles.loadingText}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.cancelButton, styles.modalButton]}
                      onPress={onClose}
                    >
                      <Text text="Cancel" style={styles.cancelButtonText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, styles.modalButton]}
                      onPress={onSubmit}
                      disabled={pin.length !== 4}
                    >
                      <View
                        style={[
                          styles.submitButtonGradient,
                          pin.length !== 4 && styles.submitButtonDisabled,
                        ]}
                      >
                        <LinearGradient
                          colors={[
                            theme.colors.palette.primary400,
                            theme.colors.palette.secondary400,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.submitButtonInner}
                        >
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={theme.colors.palette.neutral100}
                          />
                          <Text text="Submit" style={styles.submitButtonText} />
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    )
  },
)

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: metrics.medium,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.large,
    },
    closeButton: {
      padding: metrics.small,
    },
    modalBody: {
      gap: metrics.large,
    },
    pinInputWrapper: {
      alignItems: 'center',
      padding: metrics.large,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    pinTitleContainer: {
      alignItems: 'center',
      marginBottom: metrics.large,
    },
    pinTitle: {
      textAlign: 'center',
      color: theme.colors.text,
      fontSize: 24,
      marginBottom: metrics.tiny,
    },
    pinSubtitle: {
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    pinBoxes: {
      flexDirection: 'row',
      gap: metrics.medium,
      justifyContent: 'center',
      marginBottom: metrics.medium,
    },
    pinBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
    },
    pinBoxFilled: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.primary500,
    },
    pinBoxActive: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.primary100,
    },
    pinDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.palette.neutral100,
    },
    pinInput: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
      padding: 0,
      margin: 0,
      fontSize: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.colors.textDim,
      fontSize: 16,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: metrics.medium,
      marginTop: metrics.large,
      height: 56,
    },
    modalButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
      height: '100%',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 56,
    },
    submitButton: {
      flex: 2,
      borderRadius: 12,
      overflow: 'hidden',
    },
    submitButtonGradient: {
      width: '100%',
      height: '100%',
    },
    submitButtonInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: metrics.small,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })
