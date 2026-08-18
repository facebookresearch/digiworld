// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native'
import { Screen, Text } from '@/components'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { mutations } from '@/db/mutations'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const { width, height } = Dimensions.get('window')

export default function ChangePinScreen() {
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const params = useLocalSearchParams()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('ChangePin', '/screens/settings/change-pin')

  // Session parameters
  const sessionId =
    typeof params.sessionId === 'string' ? params.sessionId : null
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current')
  const [error, setError] = useState('')
  const [pinAttempts, setPinAttempts] = useState(0)
  const keypadData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '', 'delete']

  // Load session data if exists
  useEffect(() => {
    if (params.sessionTimeStamp) {
      try {
        const session = sessionStore.getSession(sessionId as string)

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any
          if (savedState) {
            // Only restore non-sensitive data like current step
            // We don't restore PIN values for security reasons
            if (savedState.step) {
              setStep(savedState.step)
            }

            // We might track pin attempts to prevent excessive tries
            if (savedState.pinAttempts !== undefined) {
              setPinAttempts(savedState.pinAttempts)
            }
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error)
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [params.sessionTimeStamp, sessionStore, trackContentChange])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      // Track the screen mount with current state
      trackScreenMount({
        currentStep: step,
        pinAttempts,
        hasError: !!error,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
        sessionId,
      })
    }, [step, pinAttempts, error, sessionId, width, height, trackScreenMount]),
  )

  const handlePinInput = (digit: string) => {
    setError('')
    switch (step) {
      case 'current':
        if (currentPin.length < 4) {
          const updatedPin = currentPin + digit
          setCurrentPin(updatedPin)
          if (updatedPin.length === 4) {
            // Validate current PIN
            if (updatedPin === userStore.userProfile?.pin) {
              setStep('new')
              setPinAttempts(0)
            } else {
              const attempts = pinAttempts + 1
              setPinAttempts(attempts)
              if (attempts >= 3) {
                Alert.alert(
                  'Too Many Attempts',
                  'You have exceeded the maximum number of attempts. Please try again later.',
                  [{ text: 'OK', onPress: () => router.back() }],
                )
              } else {
                setError(`Incorrect PIN. ${3 - attempts} attempts remaining`)
                setCurrentPin('')
              }
            }
          }
        }
        break
      case 'new':
        if (newPin.length < 4) {
          const updatedPin = newPin + digit
          setNewPin(updatedPin)
          if (updatedPin.length === 4) {
            // Validate new PIN complexity
            if (
              updatedPin === '0000' ||
              updatedPin === '1234' ||
              updatedPin === '1111'
            ) {
              setError('Please choose a more secure PIN')
              setNewPin('')
            } else if (updatedPin === currentPin) {
              setError('New PIN must be different from current PIN')
              setNewPin('')
            } else {
              setStep('confirm')
            }
          }
        }
        break
      case 'confirm':
        if (confirmPin.length < 4) {
          const updatedPin = confirmPin + digit
          setConfirmPin(updatedPin)
          if (updatedPin.length === 4) {
            if (updatedPin === newPin) {
              handleUpdatePin(updatedPin)
            } else {
              setError('PINs do not match')
              setNewPin('')
              setConfirmPin('')
              setStep('new')
            }
          }
        }
        break
    }
  }

  const handleDelete = () => {
    trackClick('delete_digit')
    switch (step) {
      case 'current':
        setCurrentPin(currentPin.slice(0, -1))
        break
      case 'new':
        setNewPin(newPin.slice(0, -1))
        break
      case 'confirm':
        setConfirmPin(confirmPin.slice(0, -1))
        break
    }
    setError('')
  }

  const renderItem = ({ item }: { item: number | string }) => {
    const isNumber = typeof item === 'number'
    const isDelete = item === 'delete'
    const isDisabled = item === ''

    return (
      <TouchableOpacity
        style={[
          styles.key,
          isDisabled && styles.keyDisabled,
          !isNumber && styles.keyFunction,
        ]}
        onPress={() => {
          if (isNumber) {
            trackClick?.(`digit_${item}`)
            handlePinInput(item.toString())
          } else if (isDelete) {
            handleDelete()
          }
        }}
        disabled={isDisabled}
      >
        {isNumber ? (
          <Text text={item.toString()} style={styles.keyText} />
        ) : isDelete ? (
          <Ionicons
            name="backspace-outline"
            size={24}
            color={theme.colors.text}
          />
        ) : null}
      </TouchableOpacity>
    )
  }

  const handleUpdatePin = async (pin: string) => {
    if (!userStore.userProfile?.id) return

    trackClick('update_pin')
    try {
      const result = await mutations.updateUser(userStore.userProfile.id, {
        pin,
        pinAttempts: 0,
        pinLockedUntil: null,
      })

      if (result.success) {
        userStore.updateUserPin(pin)
        console.log('result', result, 'Pin change success')
        Alert.alert('Success', 'Your PIN has been updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        setError('Failed to update PIN')
        setNewPin('')
        setConfirmPin('')
        setStep('new')
      }
    } catch (error) {
      console.error('Error updating PIN:', error)
      setError('Failed to update PIN')
      setNewPin('')
      setConfirmPin('')
      setStep('new')
    }
  }

  const renderPinDots = (pin: string) => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View
            key={index}
            style={[styles.dot, pin.length > index && styles.dotFilled]}
          />
        ))}
      </View>
    )
  }

  const getStepDescription = () => {
    switch (step) {
      case 'current':
        return 'Please enter your current PIN to proceed'
      case 'new':
        return 'Choose a new 4-digit PIN. Avoid simple patterns like 1234 or 0000'
      case 'confirm':
        return 'Re-enter your new PIN to confirm'
      default:
        return ''
    }
  }

  const styles = createStyles(theme)

  return (
    <Screen preset="auto" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary400,
            theme.colors.palette.secondary400,
          ]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('back_button')
              router.back()
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text text="Change PIN" preset="heading" style={styles.title} />
            <Text text="Security Settings" size="xs" style={styles.subtitle} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.stepIndicator}>
            {['current', 'new', 'confirm'].map((s, index) => (
              <React.Fragment key={s}>
                <View
                  style={[
                    styles.stepDot,
                    s === step && styles.stepDotActive,
                    index < ['current', 'new', 'confirm'].indexOf(step) &&
                      styles.stepDotCompleted,
                  ]}
                />
                {index < 2 && (
                  <View
                    style={[
                      styles.stepLine,
                      index < ['current', 'new', 'confirm'].indexOf(step) &&
                        styles.stepLineCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          <Text
            text={
              step === 'current'
                ? 'Current PIN'
                : step === 'new'
                  ? 'New PIN'
                  : 'Confirm PIN'
            }
            preset="heading"
            style={styles.stepTitle}
          />

          <Text text={getStepDescription()} style={styles.instruction} />

          {renderPinDots(
            step === 'current'
              ? currentPin
              : step === 'new'
                ? newPin
                : confirmPin,
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={20}
                color={theme.colors.palette.angry500}
              />
              <Text text={error} style={styles.errorText} />
            </View>
          ) : null}

          <View style={styles.keypadContainer}>
            <View style={styles.keypad}>
              <FlatList
                data={keypadData}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                numColumns={3}
                scrollEnabled={false}
                contentContainerStyle={styles.keypad}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl + metrics.medium,
      paddingBottom: metrics.large,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: metrics.medium,
    },
    title: {
      color: theme.colors.palette.neutral100,
      fontSize: 24,
      fontWeight: '600',
    },
    subtitle: {
      color: theme.colors.palette.neutral200,
      marginTop: 2,
    },
    content: {
      flex: 1,
      paddingHorizontal: metrics.xl,
      alignItems: 'center',
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: metrics.xl,
      marginBottom: metrics.xl,
    },
    stepDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.neutral300,
    },
    stepDotActive: {
      backgroundColor: theme.colors.palette.primary500,
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    stepDotCompleted: {
      backgroundColor: theme.colors.palette.secondary500,
    },
    stepLine: {
      width: 40,
      height: 2,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: metrics.tiny,
    },
    stepLineCompleted: {
      backgroundColor: theme.colors.palette.secondary500,
    },
    stepTitle: {
      fontSize: 28,
      marginBottom: metrics.small,
      color: theme.colors.text,
      textAlign: 'center',
    },
    instruction: {
      fontSize: 16,
      marginBottom: metrics.xl,
      color: theme.colors.textDim,
      textAlign: 'center',
      paddingHorizontal: metrics.large,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: metrics.xl,
      gap: metrics.medium,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    dotFilled: {
      backgroundColor: theme.colors.palette.primary500,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.angry500 + '15',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
      marginBottom: metrics.medium,
      gap: metrics.tiny,
    },
    errorText: {
      color: theme.colors.palette.angry500,
      fontSize: 14,
    },
    keypadContainer: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
      paddingBottom: metrics.xl,
    },
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: metrics.medium,
      paddingHorizontal: metrics.small,
    },
    key: {
      width: 75,
      height: 75,
      borderRadius: 38,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      elevation: 2,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      margin: metrics.small,
    },
    keyDisabled: {
      opacity: 0,
    },
    keyFunction: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    keyText: {
      fontSize: 28,
      lineHeight: 32,
      color: theme.colors.text,
      fontWeight: '500',
    },
  })
