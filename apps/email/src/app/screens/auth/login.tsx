import { AutoImage, Screen, Text } from '@/components'
import { translate } from '@/i18n/translate'
import { useStores } from '@/models/helpers/useStores'
import { loginUser } from '@/services/api/auth'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default observer(function LoginScreen() {
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { sessionStore, userStore } = useStores()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { trackScreenMount, trackTextChange, trackClick, trackContentChange } =
    useInteractionTracking('Login', '/screens/auth/login')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const [focusedInput, setFocusedInput] = useState('')
  const [isCreateAccount, setIsCreateAccount] = useState(false)
  const { theme } = useAppTheme()
  const { colors } = theme
  const styles = createStyles(theme)

  // Load session data if it exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession()
      if (session?.data) {
        const sessionData = session.data as any

        if (sessionData.sessionData.formData) {
          const { email: savedEmail, password: savedPassword } =
            sessionData.sessionData.formData
          trackContentChange(sessionData.sessionData.formData)
          if (savedEmail) setEmail(savedEmail)
          if (savedPassword) setPassword(savedPassword)
        }

        setTimeout(() => {
          setFocusedInput(sessionData.sessionData.currentFocusedElement)
        }, 500)
      }
    }
  }, [sessionTimeStamp])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        screen: 'login',
        route: '/screens/auth/login',
      })
    }, [trackScreenMount]),
  )

  useEffect(() => {
    trackScreenMount({
      formData: {
        email,
        password,
        timestamp: Date.now(),
      },
    })
  }, []) // Empty dependency array to run only on mount

  // Modify the focus effect to handle both inputs
  useEffect(() => {
    if (focusedInput === 'email' && emailInputRef.current) {
      emailInputRef.current.focus()
      emailInputRef.current.setSelection(email.length, email.length)
    } else if (focusedInput === 'password' && passwordInputRef.current) {
      passwordInputRef.current.focus()
      passwordInputRef.current.setSelection(password.length, password.length)
    }
  }, [focusedInput])

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

  function IsValidations() {
    const reg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w\w+)+$/
    if (!email && !password) {
      Alert.alert(
        'Error',
        translate('authScreen:login.emailPasswordValidationMsg'),
      )
      return true
    } else if (!email) {
      Alert.alert('Error', translate('authScreen:login.enterEmail'))
      return true
    } else if (reg.test(email) === false) {
      Alert.alert('Error', translate('authScreen:login.validEmail'))
      return true
    } else if (!password) {
      Alert.alert('Error', translate('authScreen:login.enterPswd'))
      return true
    } else {
      return false
    }
  }

  const handleLogin = useCallback(async () => {
    try {
      if (IsValidations() === false) {
        setIsLoggingIn(true)
        trackClick('loginButton')
        const response = await loginUser(email, password)
        if (response.success && response.user && response.token) {
          userStore.login(response.user, response.token)
        }
        if (response.success) {
          router.replace('/(tabs)/inbox' as any)
        } else {
          Alert.alert('Error', response.error || 'Invalid credentials')
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login')
    } finally {
      setIsLoggingIn(false)
    }
  }, [
    email,
    password,
    sessionTimeStamp,
    sessionStore,
    userStore,
    router,
    trackClick,
  ])

  const handleCreateAccount = () => {
    setIsCreateAccount(true)
    trackClick('createAccountButton')
    router.push('/screens/auth/signup' as any) // Navigate to the signup screen
    setTimeout(() => {
      setIsCreateAccount(false)
    }, 2000)
  }

  return (
    <Screen preset="fixed" contentContainerStyle={styles.container}>
      {/* Login Image */}
      <View style={styles.imageContainer}>
        <View style={styles.image} />
        <AutoImage
          source={require('../../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="center"
        />
      </View>

      {/* Login Text */}
      <Text
        tx="authScreen:login.title"
        size="xl"
        weight="medium"
        style={styles.title}
      />
      <Text tx="authScreen:login.subtitle" size="sm" style={styles.subtitle} />

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={emailInputRef}
          style={styles.input}
          placeholder={translate('authScreen:login.emailPlaceholder')}
          placeholderTextColor={colors.textDim}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={handleEmailChange}
          onFocus={() => setFocusedInput('email')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: email.length, end: email.length }}
          editable={!isLoggingIn}
        />
      </View>
      <View style={styles.divider} />

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder={translate('authScreen:login.passwordPlaceholder')}
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={handlePasswordChange}
          onFocus={() => setFocusedInput('password')}
          onBlur={() => setFocusedInput('')}
          selection={{ start: password.length, end: password.length }}
          editable={!isLoggingIn}
        />
      </View>
      <View style={styles.divider} />

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, isLoggingIn && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoggingIn}
      >
        <Text
          tx={
            isLoggingIn
              ? 'authScreen:login.loggingIn'
              : 'authScreen:login.signInButton'
          }
          size="md"
          weight="medium"
          style={styles.buttonText}
        />
      </TouchableOpacity>

      {/* Create Account */}
      <View style={styles.createAccountContainer}>
        <Text
          tx="authScreen:login.createAccountPrompt"
          size="sm"
          style={styles.helpText}
        />
        <TouchableOpacity
          onPress={handleCreateAccount}
          disabled={isCreateAccount}
        >
          <Text
            tx="authScreen:login.createAccount"
            size="sm"
            style={styles.createAccountText}
          />
        </TouchableOpacity>
      </View>
    </Screen>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.tint,
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      marginTop: 40,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: theme.colors.palette.neutral100,
    },
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      padding: 20,
    },
    createAccountContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 40,
    },
    createAccountText: {
      color: theme.colors.textDim,
      textDecorationLine: 'underline',
    },
    divider: {
      backgroundColor: theme.colors.separator,
      height: 1,
      marginTop: 5,
    },
    helpText: {
      color: theme.colors.textDim,
    },
    helpTextContainer: {
      alignItems: 'flex-end',
      marginTop: 15,
    },
    image: {
      height: 200,
      width: '100%',
    },
    imageContainer: {
      alignItems: 'center',
      marginVertical: 40,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontSize: 18,
    },
    inputContainer: {
      flexDirection: 'row',
      marginTop: 20,
    },
    logo: {
      height: 200,
      width: '100%',
    },
    subtitle: {
      color: theme.colors.textDim,
      marginBottom: 20,
    },
    title: {
      marginBottom: 15,
    },
  })
