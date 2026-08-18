import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Screen, Text } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { mutations } from '@/db/mutations'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { useStores } from '@/models/helpers/useStores'
import { translate } from '@/i18n'

const { width } = Dimensions.get('window')

export default function CreateProfileScreen() {
  const { phoneNumber: urlPhoneNumber, sessionId } = useLocalSearchParams()
  const router = useRouter()
  const { theme } = useAppTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(
    (urlPhoneNumber as string) || '',
  )
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('CreateProfile', '/screens/auth/create-profile')

  // Refs for input fields
  const firstNameRef = useRef<TextInput>(null)
  const lastNameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const pinRef = useRef<TextInput>(null)

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: null as Date | null,
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pin, setPin] = useState('')
  const { userStore, sessionStore } = useStores()

  // Load session data if exists
  useEffect(() => {
    if (sessionId && !isSessionLoaded) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        // Restore phone number from session
        const phoneNumberFromSession = formData.phoneNumber as string
        if (phoneNumberFromSession) {
          setPhoneNumber(phoneNumberFromSession)
        }

        setProfile(prev => ({
          ...prev,
          firstName: (formData.firstName as string) || '',
          lastName: (formData.lastName as string) || '',
          email: (formData.email as string) || '',
          password: (formData.password as string) || '',
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth as string)
            : null,
        }))

        const pinFromSession = formData.pin as string
        setPin(pinFromSession || '')

        // Restore showDatePicker state if exists
        if (formData.showDatePicker) {
          setShowDatePicker(true)
        }

        // Focus the last focused element
        setTimeout(() => {
          const focusedElement = formData.currentFocusedElement as string
          switch (focusedElement) {
            case 'firstName':
              firstNameRef.current?.focus()
              break
            case 'lastName':
              lastNameRef.current?.focus()
              break
            case 'email':
              emailRef.current?.focus()
              break
            case 'password':
              passwordRef.current?.focus()
              break
            case 'pin':
              pinRef.current?.focus()
              break
            case 'dateOfBirth':
              setShowDatePicker(true)
              break
          }
        }, 500)
      }
      setIsSessionLoaded(true)
    }
  }, [sessionId, isSessionLoaded, sessionStore])

  // Track screen mount with initial form data including phone number
  useEffect(() => {
    trackScreenMount({
      phoneNumber,
      profile,
      isLoading,
      showDatePicker,
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width,
        height: Dimensions.get('window').height,
      },
      sessionId,
    })
  }, [])

  const handleProfileChange = (field: keyof typeof profile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value }
      // Track form changes with current focused element and phone number
      trackContentChange({
        profile: updated,
        phoneNumber,
        isLoading,
        showDatePicker,
        timestamp: Date.now(),
        currentFocusedElement: field,
      })
      return updated
    })
    // Track specific field change
    trackTextChange(field, String(value))
  }

  const handlePinChange = (value: string) => {
    setPin(value)
    trackTextChange('pin', value)
    trackContentChange({
      pin: value,
      phoneNumber,
      isLoading,
      showDatePicker,
      timestamp: Date.now(),
      currentFocusedElement: 'pin',
    })
  }

  const handleDatePickerToggle = () => {
    trackClick('datePickerButton')
    setShowDatePicker(prev => {
      const newValue = !prev
      // Track date picker toggle
      trackContentChange({
        profile,
        phoneNumber,
        isLoading,
        showDatePicker: newValue,
        timestamp: Date.now(),
        currentFocusedElement: 'dateOfBirth',
      })
      return newValue
    })
  }

  const handleCreateProfile = useCallback(async () => {
    if (!isValid()) return

    setIsLoading(true)
    trackClick('createProfileButton')

    try {
      // Create user and handle the response properly
      const userResponse = await mutations.createUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber,
        email: profile.email,
        password: profile.password,
        pin: pin as string,
        pinAttempts: 0,
        pinLockedUntil: null,
        status: 'active',
        kycVerified: 0,
        dailyLimit: 1000,
        monthlyLimit: 20000,
        settings: JSON.stringify({
          theme: 'light' as const,
          language: 'en',
          notifications: true,
        }),
      })

      // Extract the actual userId from the response
      const userId = userResponse.id
      if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid user ID received')
      }

      // Create default wallet with the correct userId
      await mutations.createWallet({
        userId, // Use the extracted userId
        balance: 0,
        currency: 'USD',
        type: 'personal',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Use the same userId for the user object
      const user = {
        id: userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: `${profile.firstName} ${profile.lastName}`,
        phoneNumber,
        email: profile.email,
        password: profile.password,
        pin,
        pinAttempts: 0,
        pinLockedUntil: null,
        role: 'user' as const,
        status: 'active' as const,
        kycVerified: 0,
        dailyLimit: 1000,
        monthlyLimit: 20000,
        settings: {
          theme: 'light' as const,
          language: 'en',
          notifications: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Login and redirect
      userStore.login(user, 'dummy-token-' + userId)
      router.replace('/(tabs)/home')
    } catch (error) {
      console.error('Profile creation error:', error)
      Alert.alert(translate('common:error'), translate(error.message))
      trackClick('createProfileError')
    } finally {
      setIsLoading(false)
    }
  }, [profile, phoneNumber, pin, userStore])

  const isAdult = (birthDate: Date | null) => {
    if (!birthDate) return false

    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      return age - 1 >= 18
    }
    return age >= 18
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setProfile(p => {
        const updated = { ...p, dateOfBirth: selectedDate }
        // Track date change
        trackContentChange({
          profile: updated,
          phoneNumber,
          isLoading,
          showDatePicker: false,
          timestamp: Date.now(),
          currentFocusedElement: 'dateOfBirth',
        })
        return updated
      })
      trackTextChange('dateOfBirth', selectedDate.toISOString())
    }
  }

  const isValid = () => {
    if (
      !profile.firstName ||
      !profile.lastName ||
      !profile.email ||
      !profile.password
    ) {
      // Show error
      return false
    }
    return true
  }

  const styles = createStyles(theme)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen preset="scroll" contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              trackClick('backButton')
              router.back()
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.topSection}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="person-add"
              size={40}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text
            tx="auth:createProfile.title"
            size="xxl"
            weight="bold"
            style={styles.title}
          />
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <TextInput
              ref={firstNameRef}
              style={styles.input}
              placeholder={translate('auth:createProfile.firstName')}
              placeholderTextColor={theme.colors.textDim}
              value={profile.firstName}
              onChangeText={text => handleProfileChange('firstName', text)}
              onFocus={() => trackTextChange('firstName', profile.firstName)}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <TextInput
              ref={lastNameRef}
              style={styles.input}
              placeholder={translate('auth:createProfile:lastName')}
              placeholderTextColor={theme.colors.textDim}
              value={profile.lastName}
              onChangeText={text => handleProfileChange('lastName', text)}
              onFocus={() => trackTextChange('lastName', profile.lastName)}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={handleDatePickerToggle}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <Text
              text={
                profile.dateOfBirth
                  ? format(profile.dateOfBirth, 'MMM dd, yyyy')
                  : ''
              }
              style={[
                styles.input,
                !isAdult(profile.dateOfBirth) && styles.invalidDate,
              ]}
            />
            <Ionicons
              name="chevron-down-outline"
              size={20}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
          {!isAdult(profile.dateOfBirth) && (
            <Text
              text="You must be at least 18 years old"
              size="xs"
              style={styles.errorText}
            />
          )}

          {showDatePicker && (
            <DateTimePicker
              value={profile.dateOfBirth || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder={translate('auth:createProfile:email')}
              placeholderTextColor={theme.colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              value={profile.email}
              onChangeText={text => handleProfileChange('email', text)}
              onFocus={() => trackTextChange('email', profile.email)}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder={translate('auth:createProfile:password')}
              placeholderTextColor={theme.colors.textDim}
              secureTextEntry
              value={profile.password}
              onChangeText={text => handleProfileChange('password', text)}
              onFocus={() => trackTextChange('password', profile.password)}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textDim}
            />
            <TextInput
              ref={pinRef}
              style={styles.input}
              placeholder={translate('auth:createProfile:pin')}
              placeholderTextColor={theme.colors.textDim}
              secureTextEntry
              value={pin}
              onChangeText={handlePinChange}
              onFocus={() => trackTextChange('pin', pin)}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleCreateProfile}
            disabled={isLoading}
          >
            <Text
              tx={
                isLoading
                  ? 'auth:createProfile:creatingButton'
                  : 'auth:createProfile:createButton'
              }
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
    contentContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
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
      backgroundColor: theme.colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    title: {
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
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
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      marginLeft: 12,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.tint,
      borderRadius: 14,
      height: 56,
      marginTop: 24,
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
    invalidDate: {
      color: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: -12,
      marginBottom: 16,
      marginLeft: 16,
    },
  })
