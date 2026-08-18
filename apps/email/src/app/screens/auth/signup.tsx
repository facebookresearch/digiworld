// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'

import { Button, FancyAlert, Screen, Text, TextField } from '@/components'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models/helpers/useStores'
import { Theme, useAppTheme } from '@andojo/shared-theme'

export default function SignupScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  const [alertIcon, setAlertIcon] = useState('alert-circle')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertVisible, setAlertVisible] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState(new Date())
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Add refs for all inputs
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const firstNameInputRef = useRef<TextInput>(null)
  const lastNameInputRef = useRef<TextInput>(null)
  const dobInputRef = useRef<TextInput>(null)

  const { sessionTimeStamp } = useLocalSearchParams()
  const { sessionStore } = useStores()
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [focusedInput, setFocusedInput] = useState('')
  const { trackScreenMount, trackTextChange, trackContentChange, trackClick } =
    useInteractionTracking('Signup', '/screens/auth/signup')

  // Load session data if it exists
  useEffect(() => {
    if (sessionTimeStamp && !isSessionLoaded) {
      const session = sessionStore.getSession()
      if (session?.data) {
        const sessionData = session.data as any

        if (sessionData.sessionData.formData) {
          const {
            email: savedEmail,
            password: savedPassword,
            firstName: savedFirstName,
            lastName: savedLastName,
            dateOfBirth: savedDob,
          } = sessionData.sessionData.formData

          if (savedEmail) setEmail(savedEmail)
          if (savedPassword) setPassword(savedPassword)
          if (savedFirstName) setFirstName(savedFirstName)
          if (savedLastName) setLastName(savedLastName)
          if (savedDob) setDateOfBirth(savedDob)
        }

        setIsSessionLoaded(true)
        setTimeout(() => {
          setFocusedInput(sessionData.sessionData.currentFocusedElement)
        }, 500)
      }
    }
  }, [sessionTimeStamp])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'signup',
        route: '/screens/auth/signup',
      })
    }, [trackScreenMount]),
  )

  // Handle input focus effects
  useEffect(() => {
    const inputRefs = {
      email: emailInputRef,
      password: passwordInputRef,
      firstName: firstNameInputRef,
      lastName: lastNameInputRef,
      dateOfBirth: dobInputRef,
    }

    const currentRef =
      inputRefs[focusedInput as keyof typeof inputRefs]?.current
    if (currentRef) {
      currentRef.focus()
      // Get the current value for the focused input
      const values = { email, password, firstName, lastName, dateOfBirth }
      const currentValue = values[focusedInput as keyof typeof values] || ''
      currentRef.setSelection(
        currentValue.toLocaleString().length,
        currentValue.toLocaleString().length,
      )
    }
  }, [focusedInput])

  // Track mount with form data
  useEffect(() => {
    trackScreenMount({
      formData: {
        email,
        password,
        firstName,
        lastName,
        dateOfBirth,
        timestamp: Date.now(),
      },
    })
  }, [])

  function DateFormat(_date: any) {
    const a = new Date(_date)
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(a)
    return formattedDate
  }
  // Input change handlers
  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value)
      trackTextChange('email', value)
    },
    [trackTextChange],
  )

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value)
      trackTextChange('password', value)
    },
    [trackTextChange],
  )

  const handleFirstNameChange = useCallback(
    (value: string) => {
      setFirstName(value)
      trackTextChange('firstName', value)
    },
    [trackTextChange],
  )

  const handleLastNameChange = useCallback(
    (value: string) => {
      setLastName(value)
      trackTextChange('lastName', value)
    },
    [trackTextChange],
  )

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (event.type === 'set' && selectedDate) {
      // User selected a date and confirmed
      trackContentChange({ showDatePicker: false, dateOfBirth: selectedDate })
      setShowDatePicker(false)
      setDateOfBirth(selectedDate)
    }
  }

  function isValidations() {
    const reg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w\w+)+$/
    const digReg = /[0-9]/
    const specialChar = /[^A-Za-z0-9]/
    if (!email && !password && !firstName && !lastName) {
      Alert.alert('Error', 'Please enter the all details')
      return true
    } else if (!email) {
      Alert.alert('Error', 'Please enter email')
      return true
    } else if (reg.test(email) === false) {
      Alert.alert('Error', 'Please enter a valid email address')
      return true
    } else if (!password) {
      Alert.alert('Error', 'Please enter the password')
      return true
    } else if (
      password.length < 8 &&
      !specialChar.test(password) &&
      !digReg.test(password)
    ) {
      Alert.alert(
        'Error',
        'Your password must be at least 8 characters long and contain at least one number or special character',
      )
      return true
    } else if (!firstName) {
      Alert.alert('Error', 'Please enter the firstname')
      return true
    } else if (!dateOfBirth) {
      Alert.alert('Error', 'Please enter the DOB')
      return true
    } else {
      return false
    }
  }

  const handleSignup = async () => {
    try {
      if (isValidations() === false) {
        const existingUser = await queries.getUserByEmail(email)
        if (existingUser) {
          setAlertMessage('Email already exists.')
          setAlertIcon('alert-circle')
          setAlertVisible(true)
          return
        }
        const avatarUrl = `https://i.pravatar.cc/150?u=${Math.floor(Math.random() * 1000)}`
        const settings = JSON.stringify({
          theme: 'light',
          language: 'en',
          notifications: true,
          twoFactorEnabled: false,
        })

        const emailSettings = JSON.stringify({
          signature: '',
          emailsPerPage: 25,
          autoReadReceipts: true,
          defaultReplyTo: email,
          vacationAutoReplyEnabled: false,
        })

        const result = await mutations.addUser({
          email,
          password,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          dateOfBirth,
          avatar: avatarUrl,
          createdAt: new Date().toISOString(),
          settings,
          emailSettings,
        })

        if (result.success) {
          setAlertMessage('User registered successfully!')
          setAlertIcon('checkmark-circle')
          setAlertVisible(true)
        } else {
          setAlertMessage('Signup failed. Please try again.')
          setAlertIcon('alert-circle')
          setAlertVisible(true)
        }
      }
    } catch (error) {
      setAlertMessage('An error occurred during signup.' + error)
      setAlertIcon('alert-circle')
      setAlertVisible(true)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Button
          text="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text text="Sign Up" style={styles.title} size="xl" />
      </View>
      <Screen preset="scroll" contentContainerStyle={styles.container}>
        <TextField
          ref={emailInputRef}
          label="Email *"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          onFocus={() => setFocusedInput('email')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: email.length, end: email.length }}
        />
        <TextField
          ref={passwordInputRef}
          label="Password *"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          style={styles.input}
          onFocus={() => setFocusedInput('password')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: password.length, end: password.length }}
        />
        <TextField
          ref={firstNameInputRef}
          label="First Name *"
          value={firstName}
          onChangeText={handleFirstNameChange}
          style={styles.input}
          onFocus={() => setFocusedInput('firstName')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: firstName.length, end: firstName.length }}
        />
        <TextField
          ref={lastNameInputRef}
          label="Last Name"
          value={lastName}
          onChangeText={handleLastNameChange}
          style={styles.input}
          onFocus={() => setFocusedInput('lastName')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: lastName.length, end: lastName.length }}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <TextField
            numberOfLines={1}
            editable={false}
            value={dateOfBirth ? DateFormat(dateOfBirth) : ''}
            style={styles.input}
            placeholder="Date of Birth"
            label="Date of Birth (MM/DD/YYYY)"
            RightAccessory={() => (
              <Ionicons
                name="calendar"
                size={20}
                color="gray"
                style={styles.centerIcon}
              />
            )}
          />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        <Button
          text="Sign Up"
          onPress={handleSignup}
          style={styles.signupButton}
          onPressIn={() => trackClick('signupButton')}
        />
      </Screen>
      <View>
        <FancyAlert
          visible={alertVisible}
          message={alertMessage}
          icon={alertIcon}
          onClose={() => {
            setAlertVisible(false)
            if (alertIcon === 'checkmark-circle') {
              router.replace('/screens/auth/login')
            }
          }}
          containerStyle={styles.alertContainer}
        />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    alertContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay50,
      bottom: 0,
      flex: 1,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    backButton: {
      padding: 8,
    },
    centerIcon: {
      alignSelf: 'center',
      marginHorizontal: 10,
    },
    container: {
      gap: 16,
      padding: 16,
    },
    header: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.separator,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    input: {
      marginBottom: 16,
    },
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    signupButton: {
      backgroundColor: theme.colors.tint,
      borderRadius: 8,
      marginTop: 24,
      paddingVertical: 12,
    },
    title: {
      color: theme.colors.text,
      flex: 1,
      fontWeight: 'bold',
      marginRight: 40,
      textAlign: 'center',
    },
  })
