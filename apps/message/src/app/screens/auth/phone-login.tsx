// Copyright (c) Meta Platforms, Inc. and affiliates.
import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import {
  AutoImage,
  Screen,
  Text,
  Input,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
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
const LOGO_WIDTH = width * 0.7 // 70% of screen width for better proportion
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO

export default function PhoneLoginScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionId, reset, prefillPhone, sessionTimeStamp } =
    useLocalSearchParams()

  // Handle prefillPhone with country code removal
  const processPrefillPhone = (phone: string) => {
    if (!phone) return ''

    // Remove all non-numeric characters first
    const cleaned = phone.replace(/\D/g, '')

    // If it starts with 1 and has 11 digits, remove the country code
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.substring(1)
    }

    // If it's exactly 10 digits, return as is
    if (cleaned.length === 10) {
      return cleaned
    }

    // For any other case, return the cleaned string (will be validated later)
    return cleaned
  }

  const [phoneNumber, setPhoneNumber] = useState(
    processPrefillPhone(prefillPhone as string),
  )

  const [isLoading, setIsLoading] = useState(false)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('PhoneLogin', '/screens/auth/phone-login')
  const phoneInputRef = useRef<TextInput>(null)
  const { sessionStore } = useStores()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('formData', formData)

        // Restore phone number from session - check both field names
        const phoneNumberFromSession =
          formData.phoneNumber || formData.phone_number || ''

        if (phoneNumberFromSession) {
          setPhoneNumber(processPrefillPhone(phoneNumberFromSession))
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
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '')
    // Format as: (XXX) XXX-XXXX for 10 digits
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const validatePhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.length === 10
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

    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '')

    // Limit to 10 digits
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned)
      trackTextChange('phoneNumber', cleaned)
      trackContentChange({
        phoneNumber: cleaned,
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
        action: 'input',
        isValid: validatePhoneNumber(cleaned),
      })
    }
  }

  const handleSendCode = useCallback(async () => {
    // Format phone number to remove any spaces or special characters
    let formattedPhone = phoneNumber.replace(/\D/g, '')

    // Handle phone numbers that might include country code
    // If it starts with 1 and has 11 digits, remove the country code
    if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = formattedPhone.substring(1)
    }

    console.log('Phone validation debug:', {
      originalPhone: phoneNumber,
      formattedPhone,
      length: formattedPhone.length,
      isEmpty: !formattedPhone.trim(),
      isValid: formattedPhone.length === 10,
    })

    if (!formattedPhone.trim() || formattedPhone.length !== 10) {
      trackClick('sendCodeButton')
      trackContentChange({
        action: 'send_code_attempt',
        success: false,
        reason: 'invalid_number',
        timestamp: Date.now(),
      })
      Alert.alert('Error', 'Please enter a valid 10-digit phone number')
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
      const existingUser = await queries.getUserByPhoneNumber(
        '+1' + formattedPhone,
      )
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
          phoneNumber: '+1' + formattedPhone,
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
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
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
            text="Ready to Connect?"
            size="xxl"
            weight="bold"
            style={{ ...styles.welcomeText, ...styles.textShadow }}
          />
          <Text
            text="Join the conversation"
            size="large"
            weight="medium"
            style={{ ...styles.subtitle, ...styles.textShadow }}
          />
          <Text
            text="Enter your phone number to get started"
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
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCode}>+1</Text>
              </View>
              <Input
                ref={phoneInputRef}
                style={styles.input}
                placeholder="(XXX) XXX-XXXX"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="phone-pad"
                autoCapitalize="none"
                numberOfLines={1}
                value={formatPhoneNumber(phoneNumber)}
                onChangeText={handlePhoneNumberChange}
                editable={!isLoading}
                maxLength={14}
              />
              {phoneNumber ? (
                <TouchableOpacity
                  onPress={() => setPhoneNumber('')}
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.palette.neutral600}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonGradient}>
              <Text
                text={isLoading ? 'Sending...' : 'Get Started'}
                style={styles.buttonText}
                weight="bold"
              />
              {!isLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={theme.colors.palette.neutral100}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.palette.neutral100,
    },
    contentContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: 24,
    },
    topSection: {
      alignItems: 'center',
      marginTop: height * 0.08,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoContainer: {
      padding: 30,
      borderRadius: 25,
      backgroundColor: 'transparent',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 12,
    },
    logo: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    textShadow: {
      textShadowColor: theme.colors.palette.neutral300,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    welcomeText: {
      color: theme.colors.palette.primary400,
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 32,
      letterSpacing: 0.5,
    },
    subtitle: {
      color: theme.colors.palette.primary400,
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 22,
      letterSpacing: 0.3,
    },
    descriptionText: {
      color: theme.colors.palette.accent500,
      textAlign: 'center',
      marginBottom: 30,
      paddingHorizontal: 20,
      lineHeight: 24,
      fontSize: 17,
      opacity: 0.9,
    },
    formSection: {
      paddingVertical: 40,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
    },
    inputContainer: {
      marginBottom: 30,
      width: '100%',
      alignItems: 'center',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral200,
      height: 65,
      width: 380,
      shadowColor: theme.colors.palette.neutral400,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
      paddingHorizontal: 20,
    },
    countryCodeContainer: {
      marginRight: 12,
      paddingRight: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.palette.neutral300,
    },
    countryCode: {
      color: theme.colors.palette.primary500,
      fontWeight: 'bold',
      fontSize: 18,
    },
    input: {
      flex: 1,
      color: theme.colors.palette.neutral800,
      fontSize: 18,
      fontWeight: '500',
      paddingVertical: 0,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    button: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 12,
      marginBottom: 20,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 32,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary500,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 18,
      marginRight: 8,
      fontWeight: 'bold',
    },
    buttonIcon: {
      marginLeft: 4,
    },
    termsButton: {
      marginTop: 25,
      alignItems: 'center',
    },
    termsButtonText: {
      color: theme.colors.palette.primary500,
      fontSize: 16,
      textDecorationLine: 'underline',
      opacity: 0.9,
    },
    clearButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
  })
