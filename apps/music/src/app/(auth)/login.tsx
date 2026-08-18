// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Text, LoadingOverlay, useAppTheme } from '@andojo/shared-theme'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import LinearGradient from 'react-native-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n'

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionTimeStamp } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  // Set current screen on mount
  useEffect(() => {
    authStore.setCurrentScreen('login')
    authStore.signupState.reset()
    return () => {
      // Reset state when unmounting
      loginState.reset()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'login',
        route: '/login',
      })
    }, []),
  )

  const handleLogin = async () => {
    try {
      const success = await authStore.login()
      if (success) {
        router.replace('/(app)/home')
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  useEffect(() => {
    if (sessionTimeStamp) {
      console.log('Session ID:', sessionTimeStamp)
      const focusedElement = loginState.currentFocused
      console.log('Focused element:', focusedElement)
      if (focusedElement === 'email') {
        emailRef.current?.focus()
      } else if (focusedElement === 'password') {
        passwordRef.current?.focus()
      }
    }
  }, [sessionTimeStamp])

  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.palette.primary600, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require('../../../assets/images/app-icon-all.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{translate('auth.welcomeBack')}</Text>
              <Text style={styles.subtitle}>
                {translate('auth.signInToContinue')}
              </Text>
            </View>

            <View style={styles.form}>
              {userStore.authError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {userStore.authError.message}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.inputContainer,
                  hasEmailError && styles.inputError,
                  loginState.currentFocused === 'email' && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={theme.colors.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  placeholder={translate('auth.emailPlaceholder')}
                  placeholderTextColor={theme.colors.textDim}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={loginState.email}
                  onChangeText={loginState.setEmail}
                  onFocus={() => loginState.setFocused('email')}
                  onBlur={() => loginState.setFocused(null)}
                  testID="email-input"
                />
              </View>
              {emailError && (
                <Text style={styles.fieldError}>{emailError}</Text>
              )}

              <View
                style={[
                  styles.inputContainer,
                  hasPasswordError && styles.inputError,
                  loginState.currentFocused === 'password' &&
                    styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={theme.colors.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  placeholder={translate('auth.passwordPlaceholder')}
                  placeholderTextColor={theme.colors.textDim}
                  style={styles.input}
                  secureTextEntry
                  value={loginState.password}
                  onChangeText={loginState.setPassword}
                  onFocus={() => loginState.setFocused('password')}
                  onBlur={() => loginState.setFocused(null)}
                  testID="password-input"
                />
              </View>
              {passwordError && (
                <Text style={styles.fieldError}>{passwordError}</Text>
              )}

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPassword}>
                  {translate('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  loginState.isLoading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loginState.isLoading}
              >
                {loginState.isLoading ? (
                  <ActivityIndicator color={theme.colors.palette.neutral100} />
                ) : (
                  <Text style={styles.buttonTextPrimary}>
                    {translate('auth.signIn')}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  {translate('auth.noAccount')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    loginState.clearValidationErrors()
                    router.push('/signup')
                  }}
                >
                  <Text style={styles.signupLink}>
                    {' '}
                    {translate('auth.signUpForFree')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {translate('auth.byContinuingYouAgreeTo') + ' '}
                <Text style={styles.linkContainer}>
                  <Text
                    style={[styles.footerLink, styles.clickable]}
                    onPress={() => router.push('/(legal)/terms')}
                  >
                    {translate('auth.termsOfService')}
                  </Text>
                  <Text style={styles.footerText}>
                    {' ' + translate('auth.and') + ' '}
                  </Text>
                  <Text
                    style={[styles.footerLink, styles.clickable]}
                    onPress={() => router.push('/(legal)/privacy')}
                  >
                    {translate('auth.privacyPolicy')}
                  </Text>
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <LoadingOverlay visible={loginState.isLoading} message="Logging in..." />
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 60,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      marginBottom: 60,
    },
    logo: {
      width: 160,
      height: 160,
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textDim,
    },
    form: {
      gap: 16,
      marginBottom: 40,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral300,
      borderColor: theme.colors.palette.neutral400,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
    },
    inputError: {
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end',
      marginTop: -8,
    },
    forgotPassword: {
      color: theme.colors.tint,
      fontSize: 14,
      fontWeight: '500',
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      borderRadius: 28,
      marginTop: 24,
    },
    buttonPrimary: {
      backgroundColor: theme.colors.tint,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonTextPrimary: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.palette.neutral400,
    },
    dividerText: {
      color: theme.colors.textDim,
      paddingHorizontal: 16,
      fontSize: 14,
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    signupText: {
      color: theme.colors.textDim,
      fontSize: 16,
    },
    signupLink: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    footer: {
      marginTop: 'auto',
      paddingVertical: 20,
      alignItems: 'center',
    },
    footerText: {
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: '60%',
      flexWrap: 'wrap',
    },
    footerLink: {
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
    clickable: {
      color: theme.colors.tint,
    },
    linkContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    errorContainer: {
      backgroundColor: theme.colors.errorBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
    },
    fieldError: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    inputFocused: {
      borderWidth: 1,
      borderColor: theme.colors.tint,
    },
  })

export default LoginScreen
