import { observer } from 'mobx-react-lite'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components/SuccessDialog'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { MaterialIcons } from '@expo/vector-icons'
import { useAppTheme, Theme } from '@andojo/shared-theme'

export default observer(function RegisterScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { authStore } = useStores()
  const { signupState } = authStore
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const fullNameInputRef = useRef<TextInput>(null)
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)

  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogSubMessage, setDialogSubMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { trackScreenMount } = useInteractionTracking('Register', '/register')

  useEffect(() => {
    authStore.setCurrentScreen('signup')
    authStore.loginState.reset()
    return () => authStore.reset()
  }, [])

  // Restore focus if session exists
  useEffect(() => {
    if (sessionId) {
      if (signupState.currentFocused === 'fullName') {
        fullNameInputRef.current?.focus()
      } else if (signupState.currentFocused === 'email') {
        emailInputRef.current?.focus()
      } else if (signupState.currentFocused === 'password') {
        passwordInputRef.current?.focus()
      }
    }
  }, [sessionId, signupState.currentFocused, timeStamp])

  const handleRegister = async () => {
    const success = await authStore.signup()
    if (success) {
      setDialogMessage('Registration Successful! 🎉')
      setDialogSubMessage('Welcome to the app!')
      setIsSuccess(true)
      setDialogVisible(true)
      setTimeout(() => {
        router.replace('/(app)/(drawer)/(tabs)/home')
      }, 2000)
    } else {
      console.log(success)
      setDialogMessage('Registration Failed')
      setDialogSubMessage('Please try again.')
      setIsSuccess(false)
      setDialogVisible(true)
    }
  }

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Login',
        route: '/login',
      })
    }, []),
  )

  const fullNameError = authStore.getValidationError('fullName')
  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/images/app-icon-all.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Create an Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>
      </View>

      {authStore.authError && (
        <Text style={styles.error}>{authStore.authError.message}</Text>
      )}

      {/* Full Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          ref={fullNameInputRef}
          style={[styles.input, fullNameError && styles.inputError]}
          value={signupState.name}
          onChangeText={signupState.setName}
          onFocus={() => signupState.setFocused('fullName')}
          onBlur={() => signupState.setFocused(null)}
          placeholder="Enter your first and last name"
          placeholderTextColor={theme.colors.text}
          autoCapitalize="words"
          editable={!signupState.isLoading}
          testID="register-fullname-input"
        />
        {fullNameError && <Text style={styles.errorText}>{fullNameError}</Text>}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          ref={emailInputRef}
          style={[styles.input, emailError && styles.inputError]}
          value={signupState.email}
          onChangeText={signupState.setEmail}
          onFocus={() => signupState.setFocused('email')}
          onBlur={() => signupState.setFocused(null)}
          placeholder="Enter your email address"
          placeholderTextColor={theme.colors.text}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!signupState.isLoading}
          testID="register-email-input"
        />
        {emailError && <Text style={styles.errorText}>{emailError}</Text>}
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            ref={passwordInputRef}
            style={[styles.passwordInput, passwordError && styles.inputError]}
            value={signupState.password}
            onChangeText={signupState.setPassword}
            onFocus={() => signupState.setFocused('password')}
            onBlur={() => signupState.setFocused(null)}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.text}
            secureTextEntry={!passwordVisible}
            autoComplete="password"
            editable={!signupState.isLoading}
            testID="register-password-input"
          />
          <TouchableOpacity
            style={styles.visibilityBtn}
            onPress={() => setPasswordVisible(!passwordVisible)}
            testID="register-password-toggle"
          >
            <MaterialIcons
              name={passwordVisible ? 'visibility' : 'visibility-off'}
              size={24}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
        </View>
        {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.signUpButton,
          signupState.isLoading && styles.disabledButton,
        ]}
        onPress={handleRegister}
        disabled={signupState.isLoading}
        testID="register-submit-button"
      >
        {signupState.isLoading ? (
          <ActivityIndicator
            color={theme.colors.text}
            testID="register-loading-indicator"
          />
        ) : (
          <Text style={styles.signUpText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* Redirect to login */}
      <TouchableOpacity
        onPress={() => router.push('/login')}
        testID="register-login-link"
      >
        <Text style={styles.loginRedirect}>
          Already have an account? Sign In
        </Text>
      </TouchableOpacity>

      {/* Dialog */}
      <SuccessDialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        isSuccess={isSuccess}
        message={dialogMessage}
        subMessage={dialogSubMessage}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    logo: {
      width: 200,
      height: 200,
      marginBottom: 10,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textDim,
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 5,
      color: theme.colors.text,
    },
    input: {
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.border,
      borderWidth: 1,
      padding: 12,
      fontSize: 16,
      borderRadius: 5,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 5,
    },
    passwordContainer: {
      position: 'relative',
      width: '100%',
      marginBottom: 16,
    },
    passwordInput: {
      width: '100%',
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingRight: 48,
      fontSize: 16,
      color: theme.colors.text,
    },
    visibilityBtn: {
      position: 'absolute',
      right: 12,
      top: 12,
      padding: 4,
    },
    signUpButton: {
      backgroundColor: theme.colors.tint,
      padding: 15,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    signUpText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    loginRedirect: {
      color: theme.colors.tint,
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
    },
    error: {
      color: theme.colors.error,
      marginBottom: 10,
      textAlign: 'center',
    },
  })
