import { mutations } from '@/db/mutations'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, colors } from '@andojo/shared-theme'
import {
  Button,
  Input,
  Screen,
  Text,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from '@gluestack-ui/themed'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
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
  const { theme, themeContext } = useAppTheme()
  const { phoneNumber: urlPhoneNumber, sessionId } = useLocalSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(
    (urlPhoneNumber as string) || '',
  )
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('CreateProfile', '/screens/auth/create-profile')

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
  const { userStore, sessionStore, uiStore } = useStores()

  // Load session data if exists
  useEffect(() => {
    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('formData', formData)

        // Restore phone number from session - check both field names
        const phoneNumberFromSession =
          formData.phoneNumber || formData.phone_number || ''
        if (phoneNumberFromSession) {
          setPhoneNumber(phoneNumberFromSession)
        }

        // Restore profile data
        setProfile(prev => ({
          ...prev,
          firstName:
            (formData.firstName as string) ||
            (formData.profile?.firstName as string) ||
            '',
          lastName:
            (formData.lastName as string) ||
            (formData.profile?.lastName as string) ||
            '',
          email:
            (formData.email as string) ||
            (formData.profile?.email as string) ||
            '',
          password:
            (formData.password as string) ||
            (formData.profile?.password as string) ||
            '',
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth as string)
            : formData.profile?.dateOfBirth
              ? new Date(formData.profile.dateOfBirth as string)
              : null,
        }))

        // Restore PIN
        const pinFromSession = formData.pin as string
        setPin(pinFromSession || '')

        // Restore focus and date picker state after a delay to ensure profile data is set
        setTimeout(() => {
          const focusedElement = formData.currentFocusedElement as string

          // Handle date picker state first
          if (focusedElement === 'dateOfBirth' || formData.showDatePicker) {
            setShowDatePicker(true)
          }

          // Then handle other field focus
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
            // dateOfBirth case is handled above
          }
        }, 500)
      }
    } else {
      console.log('no sessionId')
    }
  }, [sessionId, uiStore.currentSessionId])

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
        [field]: value,
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
      // Track date picker toggle with all current field values
      trackContentChange({
        profile,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        password: profile.password,
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

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      backgroundColor={theme.colors.background}
      contentContainerStyle={styles(theme).screenContent}
    >
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      <KeyboardAvoidingView
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fixed Header Section */}
        <Pressable
          onPress={() => {
            trackClick('backButton')
            router.back()
          }}
          style={styles(theme).backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral200}
          />
        </Pressable>

        <View style={styles(theme).headerSection}>
          <View style={styles(theme).avatar}>
            <Ionicons
              name="person-add"
              size={40}
              color={theme.colors.palette.neutral100}
            />
          </View>
          <Text
            preset="heading"
            text="Create Your Profile"
            style={styles(theme).title}
          />
          <Text
            text="Fill in your details to get started"
            style={styles(theme).subtitle}
            size="medium"
          />
        </View>

        {/* Scrollable Form Section */}
        <ScrollView
          style={styles(theme).scrollView}
          contentContainerStyle={styles(theme).scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles(theme).formCard}>
            {/* First Name */}
            <Text style={styles(theme).label}>First Name</Text>
            <Input
              ref={firstNameRef}
              placeholder="Enter your first name"
              value={profile.firstName}
              variant="bordered"
              onChangeText={text => handleProfileChange('firstName', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              )}
              RightAccessory={() =>
                profile.firstName ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('firstName', '')}
                    style={styles(theme).clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.palette.neutral400}
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
            <Text style={styles(theme).label}>Last Name</Text>
            <Input
              ref={lastNameRef}
              placeholder="Enter your last name"
              value={profile.lastName}
              variant="bordered"
              onChangeText={text => handleProfileChange('lastName', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              )}
              RightAccessory={() =>
                profile.lastName ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('lastName', '')}
                    style={styles(theme).clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.palette.neutral400}
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
            <Text style={styles(theme).label}>Email</Text>
            <Input
              ref={emailRef}
              placeholder="Enter your email"
              value={profile.email}
              variant="bordered"
              onChangeText={text => handleProfileChange('email', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              )}
              RightAccessory={() =>
                profile.email ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('email', '')}
                    style={styles(theme).clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.palette.neutral400}
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
            <Text style={styles(theme).label}>Password</Text>
            <Input
              ref={passwordRef}
              placeholder="Enter your password"
              value={profile.password}
              variant="bordered"
              onChangeText={text => handleProfileChange('password', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              )}
              RightAccessory={() =>
                profile.password ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('password', '')}
                    style={styles(theme).clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.palette.neutral400}
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
            <Text style={styles(theme).label}>Date of Birth</Text>
            <Pressable
              onPress={handleDatePickerToggle}
              accessibilityLabel="Date of Birth"
              style={styles(theme).datePickerButton}
            >
              <Input
                value={
                  profile.dateOfBirth
                    ? format(profile.dateOfBirth, 'MMM dd, yyyy')
                    : ''
                }
                placeholder="Select your date of birth"
                variant="bordered"
                isDisabled={true}
                LeftAccessory={() => (
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.palette.primary400}
                  />
                )}
                RightAccessory={() => (
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={theme.colors.textDim}
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
                style={styles(theme).errorText}
                accessibilityLiveRegion="polite"
              />
            )}
          </View>
          <Button
            onPress={handleCreateProfile}
            disabled={!isValid() || isLoading}
            style={[
              styles(theme).submitButton,
              (!isValid() || isLoading) && styles(theme).buttonDisabled,
              styles(theme).buttonPadding,
            ]}
          >
            <Text style={styles(theme).submitButtonText}>
              {isLoading ? 'Creating...' : 'Create Profile'}
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = (theme: any) =>
  StyleSheet.create({
    screenContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 16,
    },
    backButton: {
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
      marginTop: 16,
      marginLeft: 16,
    },
    headerSection: {
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      marginTop: 8,
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.palette.primary400,
      textAlign: 'center',
    },
    formCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      padding: 28,
      marginHorizontal: 0,
      marginTop: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    input: {
      backgroundColor: theme.colors.palette.neutral700,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 18,
      color: theme.colors.palette.neutral100,
      borderWidth: 0,
      marginBottom: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    footerButtonContainer: {
      backgroundColor: theme.colors.palette.neutral900,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral800,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: -8,
      marginBottom: 8,
      fontSize: 13,
    },
    label: {
      fontWeight: '700',
      marginBottom: 4,
      marginTop: 16,
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      letterSpacing: 0.1,
    },
    datePickerButton: {
      marginBottom: 8,
    },
    clearButton: {
      padding: 8,
    },
    submitButton: {
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 32,
      paddingVertical: 16,
      marginHorizontal: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonPadding: {
      paddingHorizontal: 16,
    },
    submitButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
  })
