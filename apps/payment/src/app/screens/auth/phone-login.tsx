// Copyright (c) Meta Platforms, Inc. and affiliates.
import { AutoImage, Screen, Text } from '@/components'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
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
const LOGO_WIDTH = width * 0.9 // 70% of screen width
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO

export default function PhoneLoginScreen() {
  const router = useRouter()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const { theme } = useAppTheme()
  const [phoneNumber, setPhoneNumber] = useState('+1')
  const [isLoading, setIsLoading] = useState(false)
  // const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('PhoneLogin', '/screens/auth/phone-login')
  const phoneInputRef = useRef<TextInput>(null)
  const { sessionStore } = useStores()

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

  const handlePhoneNumberChange = (text: string) => {
    // Always keep the +1 prefix
    if (!text.startsWith('+1')) {
      text = '+1' + text.replace(/[^\d]/g, '')
    }

    // Remove any non-digit characters except the + sign
    const cleaned = text.replace(/[^\d+]/g, '')

    // Limit total length to 12 (+1 plus 10 digits)
    if (cleaned.length <= 12) {
      setPhoneNumber(cleaned)
      // Track text change
      trackTextChange('phoneInput', cleaned)
      // Track content change with updated form data
      trackContentChange({
        phoneNumber: cleaned,
        isLoading,
        timestamp: Date.now(),
        currentFocusedElement: 'phoneInput',
      })
    }
  }

  const handleSendCode = useCallback(async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 12) {
      Alert.alert(translate('common:error'), translate('errors:invalidPhone'))
      return
    }

    // Format phone number to remove any spaces or special characters but keep +1
    const formattedPhone = phoneNumber.replace(/[^\d+]/g, '')

    setIsLoading(true)
    trackClick('sendCodeButton')

    try {
      // Use the formatted phone number with +1
      const existingUser = await queries.getUserByPhone(formattedPhone)

      // Generate OTP (last 4 digits of phone for demo)
      const otp = formattedPhone.slice(-4)

      // Store user existence status to handle flow in verify-otp screen
      const userExists = !!existingUser

      // In production, you would send this OTP via SMS

      // Navigate to OTP screen with additional params
      router.push({
        pathname: '/screens/auth/verify-otp',
        params: {
          phoneNumber: formattedPhone,
          userExists: userExists ? '1' : '0',
          // In production, don't pass OTP in params
          // This is just for demo purposes
          devOtp: __DEV__ ? otp : undefined,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      Alert.alert('Error', 'Failed to process login request')
    } finally {
      setIsLoading(false)
    }
  }, [phoneNumber])

  const handleLegalTextPress = useCallback(() => {
    // Add console.log for debugging
    // Use the correct route path that matches the screen name in _layout.tsx
    router.push({
      pathname: '/screens/auth/users-list',
    })
  }, [router])

  const styles = createStyles(theme)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen preset="scroll" contentContainerStyle={styles.contentContainer}>
        <View style={styles.topSection}>
          <View style={styles.imageContainer}>
            <AutoImage
              source={require('../../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text
            tx="auth:login.title"
            size="xxl"
            weight="bold"
            style={styles.welcomeText}
          />
          <Text
            tx="auth:login.subtitle"
            size="md"
            weight="medium"
            style={styles.subtitle}
          />
          <Text
            tx="auth:login.description"
            size="sm"
            style={styles.descriptionText}
          />
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="call-outline"
              size={24}
              color={theme.colors.textDim}
              style={styles.inputIcon}
            />
            <TextInput
              ref={phoneInputRef}
              style={styles.input}
              placeholder={translate('auth:login.phoneLabel')}
              placeholderTextColor={theme.colors.textDim}
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              editable={!isLoading}
            />
          </View>
          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading}
          >
            <Text
              text={isLoading ? 'Sending...' : 'Continue'}
              size="md"
              weight="medium"
              style={styles.buttonText}
            />
            {!isLoading && (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.palette.neutral100}
                style={styles.buttonIcon}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLegalTextPress}
            style={styles.legalTextContainer}
          >
            <Text
              tx="auth:login.terms"
              size="xs"
              style={{ ...styles.legalText, ...styles.textDecoration }}
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
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 5,
    },
    logo: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    welcomeText: {
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.palette.neutral200,
      marginBottom: 12,
      textAlign: 'center',
    },
    descriptionText: {
      color: theme.colors.textDim,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    formSection: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 18,
      paddingVertical: 12,
      letterSpacing: 1,
    },
    divider: {
      backgroundColor: theme.colors.separator,
      height: 1,
      marginTop: 5,
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.tint,
      borderRadius: 14,
      flexDirection: 'row',
      height: 56,
      justifyContent: 'center',
      marginTop: 30,
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: theme.colors.palette.neutral100,
      marginRight: 8,
    },
    buttonIcon: {
      marginLeft: 4,
    },
    legalTextContainer: {
      padding: 8,
      marginTop: 12,
    },
    legalText: {
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 18,
      textDecorationColor: theme.colors.textDim,
    },
    textDecoration: {
      textDecorationLine: 'underline',
    },
  })
