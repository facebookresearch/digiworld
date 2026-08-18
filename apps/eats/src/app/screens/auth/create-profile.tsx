import { mutations } from '@/db/mutations'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTheme } from '@andojo/shared-theme'
import {
  Button,
  Input,
  Screen,
  Text,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { Center, Pressable } from '@gluestack-ui/themed'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const { width } = Dimensions.get('window')

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

export default function CreateProfileScreen() {
  const {
    phoneNumber: urlPhoneNumber,
    sessionId,
    sessionTimeStamp,
  } = useLocalSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(
    (urlPhoneNumber as string) || '',
  )
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('CreateProfile', '/screens/auth/create-profile')
  const { theme } = useTheme()
  const colors = theme.colors

  // Refs for input fields
  const firstNameRef = useRef<any>(null)
  const lastNameRef = useRef<any>(null)
  const emailRef = useRef<any>(null)
  const passwordRef = useRef<any>(null)
  const pinRef = useRef<any>(null)

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

  console.log('sessionTimeStamp', sessionTimeStamp, sessionId)

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
    }
  }, [sessionTimeStamp])

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
      // Create user following the schema
      const userResponse = await mutations.createUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber,
        email: profile.email,
        password: profile.password,
        settings: JSON.stringify({
          theme: 'light',
          language: 'en',
          notifications: true,
        }),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Extract the actual userId from the response
      const userId = userResponse.id
      if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid user ID received')
      }

      // Create user object for the store
      const user: User = {
        id: userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber,
        email: profile.email,
        password: profile.password,
        settings: JSON.stringify({
          theme: 'light',
          language: 'en',
          notifications: true,
          pin,
        }),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Login and redirect
      userStore.login(user, 'dummy-token-' + userId)
      router.replace('/(tabs)/home')
    } catch (error) {
      console.error('Profile creation error:', error)
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create profile',
      )
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

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 16,
    },
    backButton: {
      padding: 16,
      alignSelf: 'flex-start',
      marginTop: 8,
      marginLeft: 8,
    },
    headerSection: {
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      marginTop: 8,
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      color: colors.textDim,
      textAlign: 'center',
    },
    formCard: {
      backgroundColor: colors.palette.neutral100,
      borderRadius: 18,
      padding: 24,
      marginHorizontal: 16,
      marginTop: 16,
      shadowColor: colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    button: {
      height: 50,
      borderRadius: 12,
      overflow: 'hidden',
    },
    footerButtonContainer: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral200,
    },
    errorText: {
      color: colors.error,
      marginTop: -8,
      marginBottom: 8,
      fontSize: 13,
    },
    label: {
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 16,
      color: colors.text,
      fontSize: 15,
    },
    datePickerButton: {
      marginBottom: 8,
    },
    clearButton: {
      padding: 8,
    },
    keyboardAvoidingView: {
      flex: 1,
      backgroundColor: colors.background,
    },
  })

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen
        preset="fixed"
        safeAreaEdges={['top']}
        backgroundColor={colors.background}
      >
        {/* Fixed Header Section */}
        <Pressable
          onPress={() => {
            trackClick('backButton')
            router.back()
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Center style={styles.headerSection}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-add"
              size={40}
              color={colors.palette.neutral100}
            />
          </View>
          <Text
            preset="heading"
            text="Create Your Profile"
            style={styles.title}
          />
          <Text
            text="Fill in your details to get started"
            style={styles.subtitle}
            size="medium"
          />
        </Center>

        {/* Scrollable Form Section */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            {/* First Name */}
            <Text style={styles.label}>First Name</Text>
            <Input
              ref={firstNameRef}
              placeholder="Enter your first name"
              value={profile.firstName}
              variant="underlined"
              onChangeText={text => handleProfileChange('firstName', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.palette.primary500}
                />
              )}
              RightAccessory={() =>
                profile.firstName ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('firstName', '')}
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
              isDisabled={isLoading}
              accessibilityLabel="First Name"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              numberOfLines={1}
            />

            {/* Last Name */}
            <Text style={styles.label}>Last Name</Text>
            <Input
              ref={lastNameRef}
              placeholder="Enter your last name"
              value={profile.lastName}
              variant="underlined"
              onChangeText={text => handleProfileChange('lastName', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.palette.primary500}
                />
              )}
              RightAccessory={() =>
                profile.lastName ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('lastName', '')}
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
              isDisabled={isLoading}
              accessibilityLabel="Last Name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              numberOfLines={1}
            />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <Input
              ref={emailRef}
              placeholder="Enter your email"
              value={profile.email}
              variant="underlined"
              onChangeText={text => handleProfileChange('email', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.palette.primary500}
                />
              )}
              RightAccessory={() =>
                profile.email ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('email', '')}
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
              isDisabled={isLoading}
              accessibilityLabel="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <Input
              ref={passwordRef}
              placeholder="Enter your password"
              value={profile.password}
              variant="underlined"
              onChangeText={text => handleProfileChange('password', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.palette.primary500}
                />
              )}
              RightAccessory={() =>
                profile.password ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('password', '')}
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
              isDisabled={isLoading}
              accessibilityLabel="Password"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => pinRef.current?.focus()}
              numberOfLines={1}
            />

            {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth</Text>
            <Pressable
              onPress={handleDatePickerToggle}
              accessibilityLabel="Date of Birth"
              style={styles.datePickerButton}
            >
              <Input
                value={
                  profile.dateOfBirth
                    ? format(profile.dateOfBirth, 'MMM dd, yyyy')
                    : ''
                }
                placeholder="Select your date of birth"
                variant="underlined"
                isDisabled={true}
                LeftAccessory={() => (
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.textDim}
                  />
                )}
                RightAccessory={() => (
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={colors.textDim}
                  />
                )}
                pointerEvents="none"
              />
            </Pressable>
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

            {/* Error Message */}
            {!isAdult(profile.dateOfBirth) && (
              <Text
                text="You must be at least 18 years old"
                size="small"
                style={styles.errorText}
                accessibilityLiveRegion="polite"
              />
            )}
          </View>
        </ScrollView>

        {/* Fixed Footer Button */}
        <View style={styles.footerButtonContainer}>
          <Button
            onPress={handleCreateProfile}
            disabled={isLoading}
            text={isLoading ? 'Creating...' : 'Create Profile'}
            RightAccessory={
              !isLoading
                ? () => (
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  )
                : undefined
            }
            gradientColors={[
              colors.palette.primary400,
              colors.palette.primary500,
            ]}
            style={styles.button}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}
