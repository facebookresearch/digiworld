// Copyright (c) Meta Platforms, Inc. and affiliates.
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

import { translate } from '@/i18n/translate'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components'

const SignupScreen = observer(() => {
  const router = useRouter()
  const { theme } = useTheme()
  const { userStore, authStore } = useStores()
  const { signupState } = authStore
  const { trackScreenMount } = useInteractionTracking('Signup', '/signup')
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const handleSignup = async () => {
    try {
      const success = await authStore.signup()
      if (success) {
        setShowSuccessDialog(true)
        // Navigate after dialog closes
        setTimeout(() => {
          router.replace('/(app)/home')
        }, 2000)
      }
    } catch (error) {
      console.error('Signup error:', error)
    }
  }

  useEffect(() => {
    authStore.loginState.reset()
    authStore.setCurrentScreen('signup')
    return () => {
      signupState.reset()
      authStore.reset()
      userStore.clearErrors()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'signup',
        route: '/signup',
      })
    }, []),
  )

  useEffect(() => {
    if (sessionTimeStamp) {
      console.log('Session ID:', sessionId)
      const focusedElement = signupState.currentFocused
      console.log('Focused element:', focusedElement)
      if (focusedElement === 'name') {
        nameRef.current?.focus()
      } else if (focusedElement === 'email') {
        emailRef.current?.focus()
      } else if (focusedElement === 'password') {
        passwordRef.current?.focus()
      }
    }
  }, [sessionTimeStamp])

  const nameError = authStore.getValidationError('name')
  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')

  const hasNameError = !!nameError
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
    signupButton: { shadowColor: theme.colors.palette.primary200 },
    signupButtonText: { color: theme.colors.palette.neutral900 },
    dividerLine: { backgroundColor: theme.colors.palette.neutral600 },
    dividerText: { color: theme.colors.palette.neutral700 },
    loginText: { color: theme.colors.palette.neutral800 },
    loginLink: { color: theme.colors.palette.accent300 },
    footerText: { color: theme.colors.palette.neutral700 },
    footerLink: { color: theme.colors.palette.neutral900 },
    welcomeText: { color: theme.colors.palette.neutral900 },
    subtitleText: { color: theme.colors.palette.neutral800 },
    fieldError: { color: theme.colors.palette.angry100 },
    logo: { shadowColor: theme.colors.palette.primary200 },
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
                  style={[styles.logo, dynamicStyles.logo]}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.titleContainer}>
                <Text style={[styles.welcomeText, dynamicStyles.welcomeText]}>
                  {translate('auth.createAccount')}
                </Text>
                <Text style={[styles.subtitleText, dynamicStyles.subtitleText]}>
                  {translate('auth.signUpToStart')}
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
                      hasNameError && dynamicStyles.inputError,
                      signupState.currentFocused === 'name' &&
                        dynamicStyles.inputFocused,
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={
                          signupState.currentFocused === 'name'
                            ? theme.colors.palette.accent300
                            : theme.colors.palette.neutral700
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder={translate('auth.namePlaceholder')}
                        ref={nameRef}
                        placeholderTextColor={theme.colors.palette.neutral700}
                        style={[styles.input, dynamicStyles.input]}
                        autoCapitalize="words"
                        value={signupState.name}
                        onChangeText={signupState.setName}
                        onFocus={() => signupState.setFocused('name')}
                        onBlur={() => signupState.setFocused(null)}
                        testID="name-input"
                      />
                    </View>
                  </View>
                  {nameError && (
                    <Text style={[styles.fieldError, dynamicStyles.fieldError]}>
                      {nameError}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.inputContainer,
                      dynamicStyles.inputContainer,
                      hasEmailError && dynamicStyles.inputError,
                      signupState.currentFocused === 'email' &&
                        dynamicStyles.inputFocused,
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="mail"
                        size={20}
                        color={
                          signupState.currentFocused === 'email'
                            ? theme.colors.palette.accent300
                            : theme.colors.palette.neutral700
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder={translate('auth.emailPlaceholder')}
                        ref={emailRef}
                        placeholderTextColor={theme.colors.palette.neutral700}
                        style={[styles.input, dynamicStyles.input]}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={signupState.email}
                        onChangeText={signupState.setEmail}
                        onFocus={() => signupState.setFocused('email')}
                        onBlur={() => signupState.setFocused(null)}
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
                      signupState.currentFocused === 'password' &&
                        dynamicStyles.inputFocused,
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="lock-closed"
                        size={20}
                        color={
                          signupState.currentFocused === 'password'
                            ? theme.colors.palette.accent300
                            : theme.colors.palette.neutral700
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder={translate('auth.passwordPlaceholder')}
                        ref={passwordRef}
                        placeholderTextColor={theme.colors.palette.neutral700}
                        style={[styles.input, dynamicStyles.input]}
                        secureTextEntry
                        value={signupState.password}
                        onChangeText={signupState.setPassword}
                        onFocus={() => signupState.setFocused('password')}
                        onBlur={() => signupState.setFocused(null)}
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
                    styles.signupButton,
                    dynamicStyles.signupButton,
                    signupState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={signupState.isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={dynamicStyles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {signupState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral900}
                        size="small"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.signupButtonText,
                          dynamicStyles.signupButtonText,
                        ]}
                      >
                        {translate('auth.signUp')}
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
                  <Text style={[styles.loginText, dynamicStyles.loginText]}>
                    {translate('auth.hasAccount')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      signupState.clearValidationErrors()
                      router.push('/login')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.loginLink, dynamicStyles.loginLink]}>
                      {' '}
                      {translate('auth.logIn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, dynamicStyles.footerText]}>
                {translate('auth.bySigningUpYouAgreeTo') + ' '}
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

      <LoadingOverlay
        visible={signupState.isLoading}
        message="Creating your account..."
      />
      <SuccessDialog
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        isSuccess={true}
        message="Account Created!"
        subMessage="Welcome to the community"
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
    opacity: 0.6,
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
  loginContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '400',
  },
  logo: {
    borderRadius: 16,
    elevation: 8,
    height: 120,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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
  signupButton: {
    borderRadius: 12,
    elevation: 8,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
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

export default SignupScreen
