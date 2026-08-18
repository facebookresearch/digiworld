// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme, colors } from '@andojo/shared-theme'
import {
  AutoImage,
  Screen,
  Text,
  Input,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
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

const { width, height } = Dimensions.get('window')
const LOGO_ASPECT_RATIO = 1.45 // Assuming this is the logo's width/height ratio
const LOGO_WIDTH = width * 0.8 // 80% of screen width
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO

export default function PhoneLoginScreen() {
  const router = useRouter()
  const { sessionId, reset, prefillPhone, sessionTimeStamp } =
    useLocalSearchParams()
  const [phoneNumber, setPhoneNumber] = useState((prefillPhone as string) || '')

  const [isLoading, setIsLoading] = useState(false)
  const { theme } = useTheme()
  const colors = theme.colors
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('PhoneLogin', '/screens/auth/phone-login')
  const phoneInputRef = useRef<TextInput>(null)
  const { sessionStore } = useStores()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  console.log('sessionTimeStamp', sessionTimeStamp, sessionId)

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('formData', formData)

        // Restore phone number from session - check both field names
        const phoneNumberFromSession =
          formData.phoneNumber || formData.phone_number || ''
        console.log('phoneNumberFromSession', phoneNumberFromSession)

        if (phoneNumberFromSession) {
          setPhoneNumber(phoneNumberFromSession)
        }

        // Focus the phone input
        setTimeout(() => {
          if (formData.currentFocusedElement) {
            phoneInputRef.current?.focus()
            phoneInputRef.current?.setNativeProps({
              selection: {
                start: phoneNumberFromSession.length,
                end: phoneNumberFromSession.length,
              },
            })
          }
        }, 500)
      }
    }
  }, [sessionTimeStamp, sessionStore])

  // Track screen mount with initial form data
  useEffect(() => {
    trackScreenMount({
      phoneNumber,
      isLoading,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width,
        height,
      },
      sessionId,
    })
  }, []) // Empty dependency array to run only on mount

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '')
    // Format as: +X XXX XXX XXXX
    const match = cleaned.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,4})$/)
    if (match) {
      const parts = [match[1], match[2], match[3], match[4]].filter(Boolean)
      return parts.length > 0 ? '+' + parts.join(' ') : ''
    }
    return text
  }

  const validatePhoneNumber = (number: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(number.replace(/\D/g, ''))
  }

  const handlePhoneNumberChange = (text: string) => {
    // If clearing the input, reset to empty
    if (!text) {
      setPhoneNumber('')
      trackTextChange('phoneNumber', '')
      trackContentChange({
        phoneNumber: '',
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
        action: 'clear',
      })
      return
    }

    // Remove all non-numeric characters except '+'
    const cleaned = text.replace(/[^\d+]/g, '')

    // Ensure the number starts with +1
    let formatted = cleaned
    if (!formatted.startsWith('+')) {
      formatted = '+1' + formatted
      trackContentChange({
        phoneNumber: formatted,
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
        action: 'add_plus',
      })
    }
    if (!formatted.startsWith('+1') && formatted.length > 1) {
      formatted = '+1' + formatted.slice(1)
      trackContentChange({
        phoneNumber: formatted,
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
        action: 'add_country_code',
      })
    }

    if (formatted.length <= 15) {
      setPhoneNumber(formatted)
      trackTextChange('phoneNumber', formatted)
      trackContentChange({
        phoneNumber: formatted,
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
        action: 'input',
        isValid: validatePhoneNumber(formatted),
      })
    }
  }

  const handleSendCode = useCallback(async () => {
    // Format phone number to remove any spaces or special characters but keep +1
    const formattedPhone = phoneNumber.replace(/[^\d+]/g, '')
    if (!formattedPhone.trim() || formattedPhone.length < 11) {
      trackClick('sendCodeButton')
      trackContentChange({
        action: 'send_code_attempt',
        success: false,
        reason: 'invalid_number',
        timestamp: Date.now(),
      })
      Alert.alert('Error', 'Invalid phone number')
      return
    }

    setIsLoading(true)
    trackClick('sendCodeButton')
    trackContentChange({
      action: 'send_code_attempt',
      success: true,
      phoneNumber: formattedPhone,
      timestamp: Date.now(),
    })

    try {
      // Use the formatted phone number with +1
      const existingUser = await queries.getUserByPhone(formattedPhone)
      trackContentChange({
        action: 'user_check',
        userExists: !!existingUser,
        timestamp: Date.now(),
      })

      // Generate OTP (last 4 digits of phone for demo)
      const otp = formattedPhone.slice(-4)

      // Store user existence status to handle flow in verify-otp screen
      const userExists = !!existingUser

      // Navigate to OTP screen with additional params
      router.push({
        pathname: '/screens/auth/verify-otp',
        params: {
          phoneNumber: formattedPhone,
          userExists: userExists ? '1' : '0',
          devOtp: __DEV__ ? otp : undefined,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      trackContentChange({
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
      Alert.alert('Error', 'Failed to process login request')
    } finally {
      setIsLoading(false)
    }
  }, [phoneNumber, trackClick, trackContentChange])

  const handleLegalTextPress = useCallback(() => {
    trackClick('termsAndConditions')
    router.push({
      pathname: '/screens/auth/users-list',
    })
  }, [router, trackClick])

  // Handle reset parameter to clear navigation stack
  useEffect(() => {
    if (reset === 'true') {
      // Clear any existing navigation state
      router.setParams({})
    }
  }, [reset, router])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.background} />
      <Screen preset="scroll" contentContainerStyle={styles.contentContainer}>
        <Animated.View
          style={[
            styles.topSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.imageContainer}>
            <AutoImage
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text
            text="Welcome Back!"
            size="xxl"
            weight="medium"
            style={{ ...styles.welcomeText, ...styles.textShadow }}
          />
          <Text
            text="Sign in to your account"
            size="large"
            weight="medium"
            style={{ ...styles.subtitle, ...styles.textShadow }}
          />
          <Text
            text="Enter your phone number to continue"
            size="medium"
            style={{ ...styles.descriptionText, ...styles.textShadow }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.formSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Input
                ref={phoneInputRef}
                LeftAccessory={() => (
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name="call-outline"
                      size={22}
                      color={colors.palette.primary400}
                    />
                  </View>
                )}
                RightAccessory={() =>
                  phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => setPhoneNumber('')}
                      style={styles.clearButton}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.palette.neutral400}
                      />
                    </TouchableOpacity>
                  ) : null
                }
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.palette.neutral400}
                keyboardType="phone-pad"
                autoCapitalize="none"
                numberOfLines={1}
                value={formatPhoneNumber(phoneNumber)}
                onChangeText={handlePhoneNumberChange}
                editable={!isLoading}
                maxLength={16}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.buttonGradient,
                { backgroundColor: colors.palette.primary300 },
              ]}
            >
              <Text
                text={isLoading ? 'Sending...' : 'Continue'}
                style={styles.buttonText}
                weight="bold"
              />
              {!isLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={colors.palette.neutral900}
                  style={styles.buttonIcon}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.termsButton}
            onPress={handleLegalTextPress}
            activeOpacity={0.7}
          >
            <Text
              text="Terms and Conditions"
              style={styles.termsButtonText}
              weight="medium"
            />
          </TouchableOpacity>
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.palette.neutral800,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: height * 0.05,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 25,
  },
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_WIDTH,
  },
  textShadow: {
    textShadowColor: colors.palette.overlay20,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeText: {
    color: colors.palette.primary300,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    color: colors.palette.primary200,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 20,
  },
  descriptionText: {
    color: colors.palette.accent200,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
    fontSize: 16,
  },
  formSection: {
    paddingVertical: 32,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral800,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.palette.neutral800, // black with 60% opacity
    height: 60,
    width: 365,
    shadowColor: colors.palette.neutral600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 7.5,
    elevation: 8,
  },
  countryCode: {
    color: colors.palette.neutral100,
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 17,
    marginRight: 10,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    color: colors.palette.neutral400,
    fontSize: 18,
    fontWeight: '500',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  button: {
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: colors.palette.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 13,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.palette.neutral900,
    fontSize: 18,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  termsButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  termsButtonText: {
    color: colors.palette.primary300,
    fontSize: 16,
    textDecorationLine: 'underline',
    opacity: 0.9,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  clearButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
})
