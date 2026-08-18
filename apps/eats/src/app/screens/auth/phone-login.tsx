// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme } from '@andojo/shared-theme'
import {
  AutoImage,
  Input,
  Screen,
  Text,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
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
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('PhoneLogin', '/screens/auth/phone-login')
  const phoneInputRef = useRef<TextInput>(null)
  const { sessionStore } = useStores()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const { theme } = useTheme()
  const colors = theme.colors

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

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        // Restore phone number from session
        const phoneNumberFromSession = formData.phoneNumber as string

        if (phoneNumberFromSession) {
          setPhoneNumber(phoneNumberFromSession)
        }

        // Focus the phone input
        setTimeout(() => {
          if (formData.currentFocusedElement) {
            phoneInputRef.current?.focus()
            phoneInputRef.current?.setNativeProps({
              selection: { start: phoneNumber.length, end: phoneNumber.length },
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

  const handlePhoneNumberChange = (text: string) => {
    // If clearing the input, reset to empty
    if (!text) {
      setPhoneNumber('')
      trackTextChange('phone_number', '')
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
      formatted = '+' + formatted
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

    // Limit total length to 12 (+1 plus 10 digits)
    if (formatted.length <= 11) {
      setPhoneNumber(formatted)
      trackTextChange('phone_number', formatted)
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
    if (!phoneNumber.trim() || phoneNumber.length < 11) {
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

    // Format phone number to remove any spaces or special characters but keep +1
    const formattedPhone = phoneNumber.replace(/[^\d+]/g, '')

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      ...StyleSheet.absoluteFillObject,
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
    glassEffect: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: 25,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 30,
      padding: 25,
      shadowColor: colors.palette.neutral800,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 5,
    },
    logo: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    textShadow: {
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    welcomeText: {
      color: colors.palette.neutral100,
      marginBottom: 12,
      textAlign: 'center',
      fontSize: 28,
    },
    subtitle: {
      color: colors.palette.neutral100,
      marginBottom: 12,
      textAlign: 'center',
      fontSize: 20,
    },
    descriptionText: {
      color: colors.palette.neutral100,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
      lineHeight: 22,
      fontSize: 16,
    },
    formSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderRadius: 22,
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    inputContainer: {
      marginBottom: 20,
      width: '100%',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral100,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
      height: 60,
      paddingHorizontal: 8,
      width: '100%',
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
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
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 18,
      fontWeight: '500',
      paddingHorizontal: 15,
      paddingVertical: 15,
      letterSpacing: 0.5,
      minHeight: 58,
      lineHeight: 24,
    },
    button: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.palette.neutral100,
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
      color: colors.palette.neutral900,
      fontSize: 16,
      textDecorationLine: 'underline',
      opacity: 0.9,
    },
  })

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.palette.primary400, colors.palette.primary500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />
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
          <View style={[styles.imageContainer, styles.glassEffect]}>
            <AutoImage
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text
            text="Welcome to Andojo Food Delivery"
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
            styles.glassEffect,
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
                      color={colors.palette.primary500}
                    />
                  </View>
                )}
                RightAccessory={() =>
                  phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => handlePhoneNumberChange('')}
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
                placeholderTextColor={colors.palette.neutral500}
                keyboardType="phone-pad"
                autoCapitalize="none"
                numberOfLines={1}
                value={formatPhoneNumber(phoneNumber)}
                onChangeText={handlePhoneNumberChange}
                editable={!isLoading}
                maxLength={15}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.palette.primary400, colors.palette.primary500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
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
                  color={colors.palette.neutral100}
                  style={styles.buttonIcon}
                />
              )}
            </LinearGradient>
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
