import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme, typography } from '@andojo/shared-theme'
import {
  AutoImage,
  Button,
  Icon,
  LoadingOverlay,
  Screen,
  Text,
  useToast,
} from '@andojo/shared-theme/src/components'
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
  const { theme } = useTheme()
  const colors = theme.colors

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
        router.replace({ pathname: '/(tabs)/home' })
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

  const styles = StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    headerBackButton: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontFamily: typography.primary.bold,
    },
    illustrationContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    title: {
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textDim,
      textAlign: 'center',
      marginBottom: 8,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    phoneNumber: {
      color: colors.palette.secondary500,
      fontWeight: 'bold',
      fontSize: 18,
    },
    otpInputRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginVertical: 32,
    },
    otpCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.palette.neutral200,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    otpCircleFilled: {
      backgroundColor: colors.palette.primary400,
    },
    otpDigit: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.palette.neutral100,
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
      backgroundColor: colors.palette.primary400,
      borderRadius: 32,
      paddingVertical: 16,
      marginHorizontal: 16,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 16,
    },
    logo: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    contentContainer: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: colors.palette.neutral100,
    },
    submitButtonText: {
      fontWeight: 'bold',
      color: colors.palette.neutral100,
      fontSize: 18,
    },
    spacer: {
      width: 24,
    },
    buttonPadding: {
      paddingHorizontal: 32,
    },
  })

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={['top']}
      contentContainerStyle={styles.contentContainer}
    >
      <LoadingOverlay visible={isLoading} message="Verifying..." />
      <View style={styles.headerRow}>
        <Icon
          icon="back"
          size={24}
          color={colors.text}
          onPress={() => router.back()}
          containerStyle={styles.headerBackButton}
        />
        <Text text="OTP" preset="heading" style={styles.headerTitle} />
        <View style={styles.spacer} />
      </View>
      <View style={styles.illustrationContainer}>
        <AutoImage
          source={require('../../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text text="Verification code" preset="heading" style={styles.title} />
      <Text
        text="We have sent the code verification to Your Mobile Number"
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
        <Ionicons
          name="close-circle"
          size={20}
          color={colors.palette.neutral400}
          onPress={() => router.back()}
        />
      </View>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.otpInputRow}
        onPress={() => inputRef.current?.focus()}
      >
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.otpCircle, otp[i] && styles.otpCircleFilled]}
          >
            <Text style={styles.otpDigit} text={otp[i] || ''} />
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
          caretHidden
          accessibilityLabel="OTP Input"
        />
      </TouchableOpacity>
      <Button
        onPress={handleVerify}
        disabled={otp.length !== OTP_LENGTH}
        style={[
          styles.submitButton,
          otp.length !== OTP_LENGTH && styles.buttonDisabled,
          styles.buttonPadding,
        ]}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </Button>
    </Screen>
  )
}
