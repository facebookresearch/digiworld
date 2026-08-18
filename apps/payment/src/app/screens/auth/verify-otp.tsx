// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Screen, Text } from '@/components'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { shared } from '@/styles'

const OTP_LENGTH = 4

export default function VerifyOTPScreen() {
  const { phoneNumber, userExists, devOtp, sessionId } = useLocalSearchParams()
  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [timer, setTimer] = useState(30)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('VerifyOTP', '/screens/auth/verify-otp')
  const inputRef = useRef<TextInput>(null)
  const shakeAnimation = useRef(new Animated.Value(0)).current
  const [error, setError] = useState('')

  // Load session data if exists
  useEffect(() => {
    if (sessionId && !isSessionLoaded) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any

        // Restore OTP from session
        const otpFromSession = formData.otp as string
        if (otpFromSession) {
          setOtp(otpFromSession)
        }

        // Restore error state if exists
        const errorFromSession = formData.error as string
        if (errorFromSession) {
          setError(errorFromSession)
        }

        // Focus the OTP input
        setTimeout(() => {
          inputRef.current?.focus()
        }, 500)
      }
      setIsSessionLoaded(true)
    }
  }, [sessionId, isSessionLoaded, sessionStore])

  // Track screen mount with initial data
  useEffect(() => {
    trackScreenMount({
      phoneNumber,
      userExists,
      otp,
      isLoading,
      timer,
      error,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      },
      sessionId,
    })
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleResendCode = () => {
    if (timer === 0) {
      setTimer(30)
      trackClick('resendCodeButton')
      // Implement resend logic here
      Alert.alert('Code Resent', 'A new verification code has been sent.')
    }
  }

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleOtpChange = useCallback(
    (text: string) => {
      // Only allow numbers and limit length
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH)
      setOtp(cleaned)

      // Track text change
      trackTextChange('otpInput', cleaned)

      // Track content change with updated form data
      trackContentChange({
        otp: cleaned,
        phoneNumber,
        isLoading,
        error,
        timestamp: Date.now(),
        currentFocusedElement: 'otpInput',
      })
    },
    [phoneNumber, isLoading, error],
  )

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      shakeError()
      setError('Please enter complete code')
      return
    }

    setIsLoading(true)
    setError('')
    trackClick('verifyCodeButton')

    try {
      const expectedOtp = devOtp || (phoneNumber as string).slice(-4)
      const isValidOtp = otp === expectedOtp

      if (!isValidOtp) {
        shakeError()
        setError('Invalid verification code')
        setOtp('')
        return
      }

      const existingUser = await queries.getUserByPhone(phoneNumber as string)

      if (existingUser && Object.keys(existingUser).length > 0) {
        if (existingUser.status !== 'active') {
          setError('Account is inactive. Please contact support.')
          return
        }

        if (existingUser.pinLockedUntil) {
          const lockUntil = new Date(existingUser.pinLockedUntil)
          if (lockUntil > new Date()) {
            setError(`Account locked until ${format(lockUntil, 'hh:mm a')}`)
            return
          }
        }

        const user = {
          ...existingUser,
          displayName: `${existingUser.firstName} ${existingUser.lastName}`,
          role: 'user' as const,
          settings: existingUser.settings
            ? JSON.parse(existingUser.settings)
            : {},
        }

        userStore.login(user, 'dummy-token-' + user.id)

        if (existingUser.pinAttempts > 0) {
          await mutations.updateUser(existingUser.id, {
            pinAttempts: 0,
            pinLockedUntil: null,
          })
        }

        router.replace('/(tabs)/home')
      } else {
        router.push({
          pathname: '/screens/auth/create-profile',
          params: {
            phoneNumber: phoneNumber as string,
            sessionId,
          },
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      shakeError()
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [otp, phoneNumber, devOtp, userStore, sessionId])

  const renderOtpBoxes = () => {
    const boxes = []
    for (let i = 0; i < OTP_LENGTH; i++) {
      boxes.push(
        <View key={i} style={styles.otpBox}>
          <Text
            text={otp[i] || ''}
            style={[styles.otpText, !otp[i] && styles.otpTextEmpty]}
          />
          <View
            style={[styles.otpUnderline, otp[i] && styles.otpUnderlineFilled]}
          />
        </View>,
      )
    }
    return boxes
  }

  const styles = createStyles(theme)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[
          theme.colors.palette.primary600,
          theme.colors.palette.primary400,
        ]}
        style={styles.gradientBackground}
      />

      <Screen preset="scroll" contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.topSection}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="shield-checkmark"
              size={40}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text
            tx="auth:otp.title"
            size="xxl"
            weight="bold"
            style={styles.title}
          />
          <Text
            tx="auth:otp.subtitle"
            txOptions={{ phoneNumber }}
            size="md"
            style={styles.subtitle}
          />
          <Text
            tx="auth:otp.description"
            size="sm"
            style={styles.descriptionText}
          />
        </View>

        <View style={styles.formSection}>
          <TouchableOpacity
            activeOpacity={1}
            style={{ ...styles.otpContainer, ...styles.minHeight }}
            onPress={() => inputRef.current?.focus()}
          >
            {renderOtpBoxes()}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
              caretHidden={true}
              selectTextOnFocus={true}
            />
          </TouchableOpacity>

          {error ? (
            <Text text={error} size="sm" style={styles.errorText} />
          ) : null}

          <View style={styles.resendContainer}>
            <Text tx="auth:otp.noCode" size="sm" style={styles.resendText} />
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={timer > 0}
              style={styles.resendButton}
            >
              <Text
                tx={
                  timer > 0 ? 'auth:otp.resendTimer' : 'auth:otp.resendButton'
                }
                txOptions={{ seconds: timer }}
                size="sm"
                style={[
                  styles.resendButtonText,
                  timer > 0 && styles.resendButtonTextDisabled,
                ]}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              shared.button,
              shared.buttonPrimary,
              otp.length !== OTP_LENGTH && styles.buttonDisabled,
            ]}
            disabled={otp.length !== OTP_LENGTH}
            onPress={handleVerify}
          >
            <Text
              tx={isLoading ? 'auth:otp.verifying' : 'auth:otp.verify'}
              size="md"
              weight="medium"
              style={styles.buttonText}
            />
          </TouchableOpacity>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradientBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 40,
    },
    backButton: {
      padding: 8,
    },
    topSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.palette.overlay50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.palette.overlay20,
    },
    title: {
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.palette.neutral200,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 12,
    },
    descriptionText: {
      color: theme.colors.textDim,
      textAlign: 'center',
      paddingHorizontal: 32,
      lineHeight: 20,
    },
    formSection: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: metrics.medium,
      width: '100%',
      marginBottom: metrics.xl,
      position: 'relative',
    },
    otpBox: {
      alignItems: 'center',
      width: metrics.buttonHeight,
    },
    otpText: {
      fontSize: metrics.text.xxxl,
      color: theme.colors.text,
      height: metrics.buttonHeight,
      lineHeight: metrics.buttonHeight,
      fontWeight: 'bold',
    },
    otpTextEmpty: {
      color: theme.colors.textDim,
    },
    otpUnderline: {
      width: '100%',
      height: 2,
      backgroundColor: theme.colors.separator,
      borderRadius: metrics.borderRadiusTiny,
    },
    otpUnderlineFilled: {
      backgroundColor: theme.colors.tint,
    },
    hiddenInput: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0,
      left: 0,
      top: 0,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: theme.colors.palette.neutral100,
    },
    resendContainer: {
      alignItems: 'center',
      marginTop: 24,
    },
    resendText: {
      color: theme.colors.textDim,
      marginBottom: 8,
    },
    resendButton: {
      padding: 8,
    },
    resendButtonText: {
      color: theme.colors.tint,
      fontWeight: '600',
    },
    resendButtonTextDisabled: {
      opacity: 0.5,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: -metrics.medium,
      marginBottom: metrics.medium,
    },
    minHeight: {
      minHeight: 60,
    },
  })
