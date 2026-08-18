import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { LoadingOverlay, Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SuccessDialog } from '@/components'
import { translate } from '@/i18n'
import { useStores } from '@/models'

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const { theme } = useAppTheme()

  // Set current screen on mount
  useEffect(() => {
    trackScreenMount()
    authStore.setCurrentScreen('login')
    return () => {
      // Reset state when unmounting
      userStore.clearErrors()
      authStore.reset()
    }
  }, [])

  const handleLogin = async () => {
    console.log('Login state:', loginState)
    try {
      const success = await authStore.login()
      if (success) {
        setShowSuccessDialog(true)
        // Navigate after dialog closes
        setTimeout(() => {
          router.replace('/(app)/home')
        }, 2000)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  useEffect(() => {
    if (sessionId) {
      console.log('Session ID:', sessionId)
      const focusedElement = loginState.currentFocused
      console.log('Focused element:', focusedElement)
      if (focusedElement === 'email') {
        emailRef.current?.focus()
      } else if (focusedElement === 'password') {
        passwordRef.current?.focus()
      }
    }
  }, [sessionId])

  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  const styles = useMemo(
    () =>
      StyleSheet.create({
        background: {
          alignItems: 'center',
          backgroundColor: theme.colors.palette.neutral400,
          flex: 1,
          justifyContent: 'center',
          minHeight: '100%',
          paddingBottom: 32,
          paddingTop: 32,
        },
        backgroundGradient: {
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        },
        backgroundTexture: {
          backgroundColor: 'transparent',
          flex: 1,
          opacity: 0.03,
        },
        buttonDisabled: {
          opacity: 0.7,
        },
        buttonGradient: {
          alignItems: 'center',
          borderRadius: 12,
          justifyContent: 'center',
          minHeight: 56,
          paddingHorizontal: 24,
          paddingVertical: 18,
        },
        buttonPrimary: {
          backgroundColor: theme.colors.palette.primary200,
          elevation: 2,
          shadowColor: theme.colors.palette.primary200,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        card: {
          alignItems: 'center',
          backgroundColor: theme.colors.palette.neutral300,
          borderRadius: 8,
          maxWidth: 340,
          padding: 28,
          shadowColor: theme.colors.palette.neutral900,
          width: '100%',
          ...Platform.select({
            ios: {
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 16,
            },
            android: {
              elevation: 7,
            },
          }),
          marginBottom: 24,
        },
        clickable: {
          color: theme.colors.palette.primary200,
          textAlignVertical: 'center',
        },
        container: {
          backgroundColor: theme.colors.palette.neutral100,
          flex: 1,
        },
        divider: {
          alignItems: 'center',
          flexDirection: 'row',
          marginVertical: 24,
        },
        dividerLine: {
          backgroundColor: theme.colors.palette.neutral600,
          flex: 1,
          height: 1,
        },
        dividerText: {
          color: theme.colors.palette.neutral700,
          fontSize: 14,
          fontWeight: '500',
          paddingHorizontal: 16,
        },
        errorContainer: {
          alignItems: 'center',
          backgroundColor: `${theme.colors.palette.neutral900}33`,
          borderColor: theme.colors.palette.angry200,
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: 'row',
          marginBottom: 20,
          padding: 16,
        },
        errorText: {
          color: theme.colors.palette.angry500,
          flex: 1,
          fontSize: 14,
          fontWeight: '500',
          marginLeft: 8,
        },
        fieldError: {
          color: theme.colors.palette.angry500,
          fontSize: 14,
          fontWeight: '500',
          marginLeft: 4,
          marginTop: 4,
        },
        footer: {
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 24,
        },
        footerLink: {
          color: theme.colors.palette.neutral900,
          fontSize: 13,
          fontWeight: '500',
          textDecorationLine: 'underline',
        },
        footerText: {
          color: theme.colors.palette.neutral700,
          fontSize: 13,
          fontWeight: '400',
          lineHeight: 20,
          textAlign: 'center',
        },
        forgotPassword: {
          color: theme.colors.palette.primary200,
          fontSize: 14,
          fontWeight: '500',
        },
        forgotPasswordButton: {
          alignSelf: 'flex-end',
          marginTop: -8,
        },
        formContainer: {
          flex: 1,
          justifyContent: 'center',
          marginBottom: 32,
          paddingHorizontal: 32,
        },
        header: {
          alignItems: 'center',
          marginBottom: 60,
          paddingTop: 40,
        },
        input: {
          color: theme.colors.palette.neutral900,
          flex: 1,
          fontSize: 16,
          fontWeight: '400',
        },
        inputContainer: {
          backgroundColor: theme.colors.palette.neutral300,
          borderColor: theme.colors.palette.neutral500,
          borderRadius: 12,
          borderWidth: 1,
          overflow: 'hidden',
          marginBottom: 16,
          width: '100%',
        },
        inputError: {
          backgroundColor: `${theme.colors.palette.neutral900}33`,
          borderColor: theme.colors.palette.angry500,
        },
        inputFocused: {
          borderColor: theme.colors.palette.primary300,
          borderWidth: 2,
          backgroundColor: theme.colors.palette.neutral200,
        },
        inputGroup: {
          width: '100%',
          marginBottom: 32,
        },
        inputIcon: {
          marginRight: 16,
        },
        inputWrapper: {
          alignItems: 'center',
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingVertical: 16,
        },
        keyboardView: {
          flex: 1,
        },
        linkContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        loginButton: {
          borderRadius: 12,
          elevation: 4,
          marginBottom: 24,
          shadowColor: theme.colors.palette.primary300,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          width: '100%',
        },
        loginButtonText: {
          color: theme.colors.palette.neutral900,
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        loginContainer: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        },
        logo: {
          alignSelf: 'center',
          height: 120,
          width: 120,
        },
        logoContainer: {
          marginBottom: 32,
        },
        safeArea: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          paddingBottom: 32,
          paddingHorizontal: 24,
          paddingTop: 40,
        },
        signupLink: {
          color: theme.colors.palette.accent300,
          fontSize: 16,
          fontWeight: '600',
          textDecorationLine: 'underline',
        },
        signupText: {
          color: theme.colors.palette.neutral800,
          fontSize: 16,
          fontWeight: '400',
        },
        subtitle: {
          color: theme.colors.palette.neutral800,
          fontSize: 16,
          marginBottom: 18,
          textAlign: 'center',
        },
        subtitleText: {
          color: theme.colors.palette.neutral800,
          fontSize: 18,
          fontWeight: '400',
          textAlign: 'center',
        },
        title: {
          color: theme.colors.palette.neutral900,
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 8,
          textAlign: 'center',
        },
        titleContainer: {
          alignItems: 'center',
        },
        welcomeText: {
          color: theme.colors.palette.neutral900,
          fontSize: 32,
          fontWeight: '700',
          letterSpacing: -0.5,
          marginBottom: 8,
          textAlign: 'center',
        },
      }),
    [theme],
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary200,
          theme.colors.palette.secondary200,
          theme.colors.palette.accent200,
          theme.colors.palette.neutral200,
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      >
        <View style={styles.backgroundTexture} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
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
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/images/transperent_logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.welcomeText}>Smart Home Control</Text>
                <Text style={styles.subtitleText}>
                  Access your connected devices
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              {userStore.authError && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="warning"
                    size={20}
                    color={theme.colors.palette.angry500}
                  />
                  <Text style={styles.errorText}>
                    {userStore.authError.message}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputContainer,
                    hasEmailError && styles.inputError,
                    loginState.currentFocused === 'email' &&
                      styles.inputFocused,
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail"
                      size={20}
                      color={
                        loginState.currentFocused === 'email'
                          ? theme.colors.palette.accent300
                          : theme.colors.palette.neutral700
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailRef}
                      placeholder={translate('auth.emailPlaceholder')}
                      placeholderTextColor={theme.colors.palette.neutral700}
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
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={
                        loginState.currentFocused === 'password'
                          ? theme.colors.palette.accent300
                          : theme.colors.palette.neutral700
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordRef}
                      placeholder={translate('auth.passwordPlaceholder')}
                      placeholderTextColor={theme.colors.palette.neutral700}
                      style={styles.input}
                      secureTextEntry
                      value={loginState.password}
                      onChangeText={loginState.setPassword}
                      onFocus={() => loginState.setFocused('password')}
                      onBlur={() => loginState.setFocused(null)}
                      testID="password-input"
                    />
                  </View>
                </View>
                {passwordError && (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loginState.isLoading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loginState.isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary300,
                    theme.colors.palette.primary200,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loginState.isLoading ? (
                    <ActivityIndicator
                      color={theme.colors.palette.neutral900}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {translate('auth.signIn')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{translate('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.signupText}>
                  {translate('auth.noAccount')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    loginState.clearValidationErrors()
                    router.push('/signup')
                  }}
                  activeOpacity={0.7}
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
                <TouchableOpacity onPress={() => router.push('/(legal)/terms')}>
                  <Text style={styles.footerLink}>
                    {translate('auth.termsOfService')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>
                  {' ' + translate('auth.and') + ' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(legal)/privacy')}
                >
                  <Text style={styles.footerLink}>
                    {translate('auth.privacyPolicy')}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LoadingOverlay visible={loginState.isLoading} message="Logging in..." />
      <SuccessDialog
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        isSuccess={true}
        message="Welcome back!"
        subMessage="You have successfully logged in"
      />
    </View>
  )
})

export default LoginScreen
