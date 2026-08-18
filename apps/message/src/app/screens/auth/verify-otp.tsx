import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  Button,
  Icon,
  LoadingOverlay,
  Screen,
  Text,
  useToast,
  AutoImage,
} from '@andojo/shared-theme/src/components'
import { useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { User } from '@/models/types'

const { width } = Dimensions.get('window')

const OTP_LENGTH = 4
const LOGO_ASPECT_RATIO = 1.45 // Assuming this is the logo's width/height ratio
const LOGO_WIDTH = width * 0.7 // 70% of screen width for better proportion
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO

export default function VerifyOTPScreen() {
  const { theme, themeContext } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { phoneNumber, userExists, devOtp, sessionId, sessionTimeStamp } =
    useLocalSearchParams()
  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const [otp, setOtp] = useState('')
  const [mobileNumber, setMobileNumber] = useState(phoneNumber)
  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('VerifyOTP', '/screens/auth/verify-otp')
  const inputRef = useRef<TextInput>(null)
  const shakeAnimation = useRef(new Animated.Value(0)).current
  const [error, setError] = useState('')
  const toast = useToast()

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any

        // Restore OTP from session
        const otpFromSession = formData.otp as string
        if (otpFromSession) {
          setOtp(otpFromSession)
        }

        const phone = formData.phoneNumber as string

        if (phone) {
          setMobileNumber(phone)
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
    }
  }, [sessionTimeStamp, sessionStore])

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
    // Delay focus to ensure component is fully mounted
    const focusTimer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 300)

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev > 0) {
          return prev - 1
        } else {
          setCanResend(true)
          return 0
        }
      })
    }, 1000)

    return () => {
      clearTimeout(focusTimer)
      clearInterval(interval)
    }
  }, [])

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

  const handleResendCode = useCallback(async () => {
    if (!canResend) return

    setIsLoading(true)
    trackClick('resendCodeButton')

    try {
      // Simulate resend delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setTimer(30)
      setCanResend(false)
      setOtp('')
      setError('')

      toast.show({
        title: 'Code resent successfully',
        preset: 'success',
      })

      trackContentChange({
        action: 'resend_code',
        success: true,
        timestamp: Date.now(),
      })
    } catch (error) {
      toast.show({
        title: 'Failed to resend code',
        preset: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [canResend, trackClick, trackContentChange, toast])

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      shakeError()
      toast.show({ title: 'Please enter complete code', preset: 'error' })
      return
    }
    setIsLoading(true)
    setError('')
    trackClick('verifyCodeButton')
    try {
      const expectedOtp = devOtp || (mobileNumber as string).slice(-4)
      const isValidOtp = otp === expectedOtp
      if (!isValidOtp) {
        shakeError()
        toast.show({ title: 'Invalid verification code', preset: 'error' })
        setOtp('')
        return
      }
      const existingUser = await queries.getUserByPhoneNumber(
        mobileNumber as string,
      )
      if (existingUser && Object.keys(existingUser).length > 0) {
        const user: User = {
          id: existingUser.id.toString(),
          phoneNumber: existingUser.phoneNumber,
          name: existingUser.name,
          avatarUrl: existingUser.avatarUrl,
          lastLoggedIn: Date.now(),
        }

        // Login the user
        await userStore.login(user as any, 'dummy-token-' + user.id)
        await userStore.updateLastLoggedIn()
        router.replace('/')
      } else {
        // Navigate to create profile if user doesn't exist
        router.push({
          pathname: '/screens/auth/create-profile',
          params: {
            phoneNumber: mobileNumber as string,
            sessionId,
          },
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      shakeError()
      toast.show({
        title: 'Verification failed. Please try again.',
        preset: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [otp, mobileNumber, devOtp, userStore, sessionId])

  const handleOtpInputPress = useCallback(() => {
    // Ensure keyboard opens when tapping on OTP input area
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleInputFocus = useCallback(() => {
    // Additional focus handling if needed
    console.log('OTP input focused')
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      <Screen
        preset="scroll"
        safeAreaEdges={['top']}
        contentContainerStyle={styles.screenContent}
      >
        <LoadingOverlay visible={isLoading} message="Verifying..." />
        <View style={styles.headerRow}>
          <Icon
            icon="back"
            size={24}
            color={theme.colors.palette.neutral800}
            onPress={() => router.back()}
            containerStyle={styles.headerBackButton}
          />
          <View style={styles.spacer} />
        </View>
        <View style={styles.mainCard}>
          <View style={styles.illustrationContainer}>
            <AutoImage
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text
            text="Verify Your Number"
            preset="heading"
            style={styles.title}
          />
          <Text
            text="We've sent a verification code to your phone number"
            preset="formHelper"
            style={styles.subtitle}
          />
          <View style={styles.phoneRow}>
            <Text
              text={String(mobileNumber)}
              size="large"
              weight="bold"
              style={styles.phoneNumber}
            />

            <TouchableOpacity
              onPress={() => {
                router.replace('/screens/auth/phone-login')
              }}
              style={styles.editButton}
            >
              <Ionicons
                name={'create-outline'}
                size={20}
                color={theme.colors.palette.primary500}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.otpCard}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.otpInputRow}
              onPress={handleOtpInputPress}
            >
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp[i] && styles.otpBoxFilled,
                    error && styles.otpBoxError,
                  ]}
                >
                  <Text style={styles.otpDigit} text={otp[i] || ''} />
                </View>
              ))}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={handleOtpChange}
                onFocus={handleInputFocus}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={styles.hiddenInput}
                autoFocus={false}
                caretHidden
                accessibilityLabel="OTP Input"
                returnKeyType="done"
                blurOnSubmit={false}
                autoComplete="one-time-code"
              />
            </TouchableOpacity>
          </View>
          <Button
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH}
            style={[
              styles.submitButton,
              otp.length !== OTP_LENGTH && styles.buttonDisabled,
              styles.buttonPadding,
            ]}
          >
            <Text style={styles.submitButtonText}>Verify Code</Text>
          </Button>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={!canResend || isLoading}
              style={styles.resendButton}
            >
              <Text
                style={{
                  ...styles.resendButtonText,
                  color: !canResend
                    ? theme.colors.palette.neutral500
                    : theme.colors.palette.primary500,
                }}
              >
                {canResend ? 'Resend Code' : `Resend in ${timer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screenContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 0,
      backgroundColor: theme.colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
    },
    headerBackButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: theme.colors.transparent,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.palette.neutral800,
      fontFamily: theme.typography.primary.bold,
    },
    mainCard: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      padding: 28,
      marginTop: 16,
      marginBottom: 32,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    illustrationContainer: {
      alignItems: 'center',
    },
    logoContainer: {
      borderRadius: 25,
      backgroundColor: 'transparent',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
    },
    title: {
      color: theme.colors.palette.primary500,
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: theme.typography.primary.bold,
      fontSize: 24,
    },
    subtitle: {
      color: theme.colors.palette.primary600,
      textAlign: 'center',
      marginBottom: 16,
      opacity: 0.8,
      fontSize: 16,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    phoneNumber: {
      color: theme.colors.palette.neutral800,
      fontWeight: 'bold',
      fontSize: 18,
      marginRight: 8,
    },
    phoneInput: {
      color: theme.colors.palette.neutral800,
      fontWeight: 'bold',
      fontSize: 18,
      marginRight: 8,
      flex: 1,
      textAlign: 'center',
    },
    editButton: {
      padding: 4,
    },
    otpCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 12,
      marginBottom: 24,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    otpInputRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      minHeight: 60,
    },
    otpBox: {
      width: 52,
      height: 60,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral300,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    otpBoxFilled: {
      backgroundColor: theme.colors.palette.primary400,
      borderColor: theme.colors.palette.primary200,
    },
    otpBoxError: {
      borderColor: theme.colors.error,
    },
    otpDigit: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral800,
    },
    hiddenInput: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
      left: 0,
      top: 0,
      zIndex: -1,
    },
    submitButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 32,
      padding: 8,
      marginHorizontal: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    logo: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
      fontSize: 18,
    },
    spacer: {
      width: 24,
    },
    buttonPadding: {
      paddingHorizontal: 32,
    },
    resendContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    resendText: {
      color: theme.colors.palette.neutral600,
      fontSize: 14,
      marginBottom: 8,
    },
    resendButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    resendButtonText: {
      color: theme.colors.palette.primary500,
      fontSize: 16,
      fontWeight: '600',
    },
    resendButtonDisabled: {
      color: theme.colors.palette.neutral500,
    },
  })
