import { observer } from 'mobx-react-lite'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { useAppTheme, Theme } from '@andojo/shared-theme'

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId, timeStamp } = useLocalSearchParams()
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogSubMessage, setDialogSubMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')

  useEffect(() => {
    authStore.setCurrentScreen('login')
    return () => authStore.reset()
  }, [])

  // restore focus if session data exists
  useEffect(() => {
    if (sessionId) {
      if (loginState.currentFocused === 'email') {
        setTimeout(() => {
          emailInputRef.current?.focus()
          emailInputRef.current?.setSelection(
            loginState.email.length,
            loginState.email.length,
          )
        }, 1000)
      } else if (loginState.currentFocused === 'password') {
        setTimeout(() => {
          passwordInputRef.current?.focus()
          passwordInputRef.current?.setSelection(
            loginState.password.length,
            loginState.password.length,
          )
        }, 1000)
      }
    }
  }, [sessionId, loginState.currentFocused, timeStamp])

  const handleLogin = async () => {
    const success = await authStore.login()
    if (success) {
      setDialogMessage('Login Successful! 🎉')
      setDialogSubMessage('Welcome back!')
      setIsSuccess(true)
      setDialogVisible(true)
      setTimeout(() => {
        router.replace('/(app)/(drawer)/(tabs)/home')
      }, 2000)
    } else {
      setDialogMessage('Login Failed')
      setDialogSubMessage('Please check your credentials.')
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

  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/images/app-icon-all.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      {userStore.authError && (
        <Text style={styles.error}>{userStore.authError.message}</Text>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          ref={emailInputRef}
          style={[styles.input, emailError && styles.inputError]}
          value={loginState.email}
          onChangeText={loginState.setEmail}
          onFocus={() => loginState.setFocused('email')}
          onBlur={() => loginState.setFocused(null)}
          placeholder="Enter your email address"
          placeholderTextColor={theme.colors.text}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!loginState.isLoading}
          testID="login-email-input"
        />
        {emailError && <Text style={styles.errorText}>{emailError}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordInputRef}
          style={[styles.input, passwordError && styles.inputError]}
          value={loginState.password}
          onChangeText={loginState.setPassword}
          onFocus={() => loginState.setFocused('password')}
          onBlur={() => loginState.setFocused(null)}
          placeholder="Enter your password"
          placeholderTextColor={theme.colors.text}
          secureTextEntry
          autoComplete="password"
          editable={!loginState.isLoading}
          testID="login-password-input"
        />
        {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.signInButton,
          loginState.isLoading && styles.disabledButton,
        ]}
        onPress={handleLogin}
        disabled={loginState.isLoading}
        testID="login-submit-button"
      >
        {loginState.isLoading ? (
          <ActivityIndicator
            color={theme.colors.text}
            testID="login-loading-indicator"
          />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/register')}
        testID="login-register-link"
      >
        <Text style={styles.createAccount}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

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

export default LoginScreen

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
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 5,
    },
    passwordInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      backgroundColor: 'transparent',
      color: theme.colors.text,
    },
    visibilityToggle: {
      padding: 10,
    },
    forgotPassword: {
      color: theme.colors.tint,
      textAlign: 'right',
      marginBottom: 20,
    },
    signInButton: {
      backgroundColor: theme.colors.tint,
      padding: 15,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    signInText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
    createAccount: {
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
