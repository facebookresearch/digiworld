import { useCallback, useEffect, useRef, useState } from 'react'
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
import { StatusBar } from 'expo-status-bar'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, LoadingOverlay, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { translate } from '@/i18n'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components'

const LoginScreen = observer(() => {
  const router = useRouter()
  const { theme } = useTheme()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Set current screen on mount
  useEffect(() => {
    authStore.setCurrentScreen('login')
    return () => {
      // Reset state when unmounting
      userStore.clearErrors()
      authStore.reset()
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
    if (sessionTimeStamp) {
      console.log('Session ID:', sessionId)
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

  const dynamicStyles = {
    container: { backgroundColor: theme.colors.palette.neutral100 },
    backgroundGradient: [
      theme.colors.palette.neutral300,
      theme.colors.palette.neutral200,
      theme.colors.palette.neutral100,
    ],
    backgroundTexture: { backgroundColor: theme.colors.transparent },
    formCard: {
      backgroundColor: theme.colors.palette.neutral400,
      borderColor: theme.colors.palette.neutral500,
      shadowColor: theme.colors.palette.primary200,
    },
    errorContainer: {
      backgroundColor: theme.colors.palette.overlay20,
      borderColor: theme.colors.palette.angry200,
    },
    errorText: { color: theme.colors.palette.angry100 },
    inputContainer: {
      backgroundColor: theme.colors.palette.neutral300,
      borderColor: theme.colors.palette.neutral500,
    },
    inputError: {
      backgroundColor: theme.colors.palette.overlay20,
      borderColor: theme.colors.palette.angry100,
    },
    inputFocused: { borderColor: theme.colors.palette.primary200 },
    input: { color: theme.colors.palette.neutral900 },
    buttonGradient: [
      theme.colors.palette.primary200,
      theme.colors.palette.primary300,
    ],
    loginButton: { shadowColor: theme.colors.palette.primary200 },
    loginButtonText: { color: theme.colors.palette.neutral900 },
    dividerLine: { backgroundColor: theme.colors.palette.neutral600 },
    dividerText: { color: theme.colors.palette.neutral700 },
    signupText: { color: theme.colors.palette.neutral800 },
    signupLink: { color: theme.colors.palette.accent300 },
    footerText: { color: theme.colors.palette.neutral700 },
    footerLink: { color: theme.colors.palette.neutral900 },
    welcomeText: { color: theme.colors.palette.neutral900 },
    subtitleText: { color: theme.colors.palette.neutral800 },
    fieldError: { color: theme.colors.palette.angry100 },
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar
        style="light"
        backgroundColor={theme.colors.palette.neutral100}
      />

      <LinearGradient
        colors={dynamicStyles.backgroundGradient}
        locations={[0, 0.6, 1]}
        style={styles.backgroundGradient}
      >
        <View
          style={[styles.backgroundTexture, dynamicStyles.backgroundTexture]}
        />
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
                  source={require('../../../assets/images/app-icon-all.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={[styles.welcomeText, dynamicStyles.welcomeText]}>
                  {translate('auth.welcomeBack')}
                </Text>
                <Text style={[styles.subtitleText, dynamicStyles.subtitleText]}>
                  {translate('auth.signInToContinue')}
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <View style={[styles.formCard, dynamicStyles.formCard]}>
                {userStore.authError && (
                  <View
                    style={[
                      styles.errorContainer,
                      dynamicStyles.errorContainer,
                    ]}
                  >
                    <Ionicons
                      name="warning"
                      size={20}
                      color={theme.colors.palette.angry100}
                    />
                    <Text style={[styles.errorText, dynamicStyles.errorText]}>
                      {userStore.authError.message}
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.inputContainer,
                      dynamicStyles.inputContainer,
                      hasEmailError && dynamicStyles.inputError,
                      loginState.currentFocused === 'email' &&
                        dynamicStyles.inputFocused,
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
                        style={[styles.input, dynamicStyles.input]}
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
                    <Text style={[styles.fieldError, dynamicStyles.fieldError]}>
                      {emailError}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.inputContainer,
                      dynamicStyles.inputContainer,
                      hasPasswordError && dynamicStyles.inputError,
                      loginState.currentFocused === 'password' &&
                        dynamicStyles.inputFocused,
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
                        style={[styles.input, dynamicStyles.input]}
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
                    <Text style={[styles.fieldError, dynamicStyles.fieldError]}>
                      {passwordError}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    dynamicStyles.loginButton,
                    loginState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loginState.isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={dynamicStyles.buttonGradient}
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
                      <Text
                        style={[
                          styles.loginButtonText,
                          dynamicStyles.loginButtonText,
                        ]}
                      >
                        {translate('auth.signIn')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View
                    style={[styles.dividerLine, dynamicStyles.dividerLine]}
                  />
                  <Text style={[styles.dividerText, dynamicStyles.dividerText]}>
                    {translate('auth.or')}
                  </Text>
                  <View
                    style={[styles.dividerLine, dynamicStyles.dividerLine]}
                  />
                </View>

                <View style={styles.loginContainer}>
                  <Text style={[styles.signupText, dynamicStyles.signupText]}>
                    {translate('auth.noAccount')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      loginState.clearValidationErrors()
                      router.push('/signup')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.signupLink, dynamicStyles.signupLink]}>
                      {' '}
                      {translate('auth.signUpForFree')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, dynamicStyles.footerText]}>
                {translate('auth.byContinuingYouAgreeTo') + ' '}
                <TouchableOpacity onPress={() => router.push('/(legal)/terms')}>
                  <Text style={[styles.footerLink, dynamicStyles.footerLink]}>
                    {translate('auth.termsOfService')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.footerText, dynamicStyles.footerText]}>
                  {' ' + translate('auth.and') + ' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(legal)/privacy')}
                >
                  <Text style={[styles.footerLink, dynamicStyles.footerLink]}>
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

const styles = StyleSheet.create({
  backgroundGradient: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backgroundTexture: {
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
  container: {
    flex: 1,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  errorContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
    padding: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  fieldError: {
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
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 10,
    marginHorizontal: 8,
    padding: 32,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputGroup: {
    gap: 20,
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
  loginButton: {
    borderRadius: 12,
    elevation: 8,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  loginButtonText: {
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
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupText: {
    fontSize: 16,
    fontWeight: '400',
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
})

export default LoginScreen
