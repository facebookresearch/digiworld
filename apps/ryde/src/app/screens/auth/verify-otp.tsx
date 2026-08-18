// Copyright (c) Meta Platforms, Inc. and affiliates.
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
import { useAppTheme, colors } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
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

const { width } = Dimensions.get('window')

const OTP_LENGTH = 4
const LOGO_ASPECT_RATIO = 1.45 // Assuming this is the logo's width/height ratio
const LOGO_WIDTH = width * 0.8 // 80% of screen width
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO
interface User {
  id: number
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  createdAt: string
  updatedAt: string
  settings: string
  status: string
}

export default function VerifyOTPScreen() {
  const { theme, themeContext } = useAppTheme()
  const { phoneNumber, userExists, devOtp, sessionId, sessionTimeStamp } =
    useLocalSearchParams()
  const router = useRouter()
  const { userStore, sessionStore } = useStores()
  const [otp, setOtp] = useState('')
  const [mobileNumber, setMobileNumber] = useState(phoneNumber)
  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(30)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('VerifyOTP', '/screens/auth/verify-otp')
  const inputRef = useRef<TextInput>(null)
  const shakeAnimation = useRef(new Animated.Value(0)).current
  const [error, setError] = useState('')
  const toast = useToast()

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
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
    inputRef.current?.focus()
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
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
      const existingUser = await queries.getUserByPhone(mobileNumber as string)
      if (existingUser && Object.keys(existingUser).length > 0) {
        if (existingUser.status !== 'active') {
          toast.show({
            title: 'Account is inactive. Please contact support.',
            preset: 'error',
          })
          return
        }

        const user: User = {
          id: existingUser.id,
          email: existingUser.email,
          password: existingUser.password,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          phoneNumber: existingUser.phoneNumber,
          settings: existingUser.settings,
          status: existingUser.status,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
        }

        // Login the user
        userStore.login(user, 'dummy-token-' + user.id)
        router.replace('/(tabs)/home')
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
  }, [otp, phoneNumber, devOtp, userStore, sessionId])

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      <Screen
        preset="scroll"
        safeAreaEdges={['top']}
        contentContainerStyle={styles(theme).screenContent}
      >
        <LoadingOverlay visible={isLoading} message="Verifying..." />
        <View style={styles(theme).headerRow}>
          <Icon
            icon="back"
            size={24}
            color={theme.colors.palette.neutral100}
            onPress={() => router.back()}
            containerStyle={styles(theme).headerBackButton}
          />
          <View style={styles(theme).spacer} />
        </View>
        <View style={styles(theme).mainCard}>
          <View style={styles(theme).illustrationContainer}>
            <AutoImage
              source={require('../../../../assets/images/logo.png')}
              style={styles(theme).logo}
              resizeMode="contain"
            />
          </View>
          <Text
            text="Verification code"
            preset="heading"
            style={styles(theme).title}
          />
          <Text
            text="We have sent the code verification to Your Mobile Number"
            preset="formHelper"
            style={styles(theme).subtitle}
          />
          <View style={styles(theme).phoneRow}>
            <Text
              text={String(mobileNumber)}
              size="large"
              weight="bold"
              style={styles(theme).phoneNumber}
            />
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.palette.neutral400}
              onPress={() => router.back()}
            />
          </View>
          <View style={styles(theme).otpCard}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles(theme).otpInputRow}
              onPress={() => inputRef.current?.focus()}
            >
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    styles(theme).otpBox,
                    otp[i] && styles(theme).otpBoxFilled,
                    error && styles(theme).otpBoxError,
                  ]}
                >
                  <Text style={styles(theme).otpDigit} text={otp[i] || ''} />
                </View>
              ))}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={styles(theme).hiddenInput}
                autoFocus
                caretHidden
                accessibilityLabel="OTP Input"
              />
            </TouchableOpacity>
          </View>
          <Button
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH}
            style={[
              styles(theme).submitButton,
              otp.length !== OTP_LENGTH && styles(theme).buttonDisabled,
              styles(theme).buttonPadding,
            ]}
          >
            <Text style={styles(theme).submitButtonText}>Submit</Text>
          </Button>
        </View>
      </Screen>
    </View>
  )
}

const styles = (theme: any) =>
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
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.palette.neutral100,
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
      marginVertical: 16,
    },
    title: {
      color: theme.colors.palette.neutral100,
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: theme.typography.primary.bold,
      fontSize: 22,
    },
    subtitle: {
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
      marginBottom: 8,
      opacity: 0.7,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    phoneNumber: {
      color: theme.colors.palette.secondary200,
      fontWeight: 'bold',
      fontSize: 18,
    },
    otpCard: {
      backgroundColor: theme.colors.palette.neutral700,
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
    },
    otpBox: {
      width: 48,
      height: 56,
      borderRadius: 10,
      backgroundColor: theme.colors.palette.neutral800,
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
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
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
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 32,
      paddingVertical: 16,
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
  })
