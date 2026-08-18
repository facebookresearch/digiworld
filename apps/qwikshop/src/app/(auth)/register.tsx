// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  StatusBar,
  Animated,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { SuccessOverlay } from '@/components/SuccessOverlay'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'react-native-linear-gradient'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

export default observer(function RegisterScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { authStore } = useStores()
  const { signupState } = authStore
  const { theme, mode } = useAppTheme()

  const fullNameInputRef = useRef<TextInput>(null)
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogSubMessage, setDialogSubMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { trackScreenMount } = useInteractionTracking('Register', '/register')

  // Bottom sheet snap points - larger for register form
  const snapPoints = useMemo(() => ['65%', '85%'], [])

  useEffect(() => {
    authStore.setCurrentScreen('signup')
    authStore.loginState.reset()

    // Animate entrance with rotation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start()

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

  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar
          barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Background with animated elements */}
        <View style={styles.backgroundContainer}>
          <LinearGradient
            colors={[
              theme.colors.palette.accent500,
              theme.colors.palette.accent600,
            ]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Header Content */}
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icons/app-icon.png')}
                style={styles.logo}
              />
            </View>
            <Text style={styles.welcomeTitle}>Join QwikShop</Text>
            <Text style={styles.welcomeSubtitle}>
              Start your shopping journey today
            </Text>
          </View>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="local-shipping"
                size={24}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.benefitText}>Free Delivery</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="security"
                size={24}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.benefitText}>Secure Shopping</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="star"
                size={24}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.benefitText}>Best Deals</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <BottomSheetScrollView style={styles.bottomSheetContent}>
            <View style={styles.formWrapper}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>
                  Join thousands of happy shoppers
                </Text>
              </View>

              {authStore.authError && (
                <View style={styles.errorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                  <Text style={styles.errorText}>
                    {authStore.authError.message}
                  </Text>
                </View>
              )}

              <View style={styles.formContainer}>
                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.modernInputWrapper,
                      signupState.currentFocused === 'fullName' &&
                        styles.inputFocused,
                      fullNameError && styles.inputError,
                    ]}
                  >
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color={
                        signupState.currentFocused === 'fullName'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={fullNameInputRef}
                      style={styles.modernInput}
                      value={signupState.name}
                      onChangeText={signupState.setName}
                      onFocus={() => signupState.setFocused('fullName')}
                      onBlur={() => signupState.setFocused(null)}
                      placeholder="Enter your full name"
                      placeholderTextColor={theme.colors.textDim}
                      autoCapitalize="words"
                      editable={!signupState.isLoading}
                      testID="register-fullname-input"
                    />
                  </View>
                  {fullNameError && (
                    <Text style={styles.fieldError}>{fullNameError}</Text>
                  )}
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View
                    style={[
                      styles.modernInputWrapper,
                      signupState.currentFocused === 'email' &&
                        styles.inputFocused,
                      emailError && styles.inputError,
                    ]}
                  >
                    <MaterialIcons
                      name="alternate-email"
                      size={20}
                      color={
                        signupState.currentFocused === 'email'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailInputRef}
                      style={styles.modernInput}
                      value={signupState.email}
                      onChangeText={signupState.setEmail}
                      onFocus={() => signupState.setFocused('email')}
                      onBlur={() => signupState.setFocused(null)}
                      placeholder="your@email.com"
                      placeholderTextColor={theme.colors.textDim}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!signupState.isLoading}
                      testID="register-email-input"
                    />
                  </View>
                  {emailError && (
                    <Text style={styles.fieldError}>{emailError}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.modernInputWrapper,
                      signupState.currentFocused === 'password' &&
                        styles.inputFocused,
                      passwordError && styles.inputError,
                    ]}
                  >
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color={
                        signupState.currentFocused === 'password'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.modernInput}
                      value={signupState.password}
                      onChangeText={signupState.setPassword}
                      onFocus={() => signupState.setFocused('password')}
                      onBlur={() => signupState.setFocused(null)}
                      placeholder="Create a strong password"
                      placeholderTextColor={theme.colors.textDim}
                      secureTextEntry={!passwordVisible}
                      autoComplete="password"
                      editable={!signupState.isLoading}
                      testID="register-password-input"
                    />
                    <TouchableOpacity
                      onPress={() => setPasswordVisible(!passwordVisible)}
                      style={styles.passwordToggle}
                      testID="register-password-toggle"
                    >
                      <MaterialIcons
                        name={passwordVisible ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={theme.colors.palette.neutral500}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError && (
                    <Text style={styles.fieldError}>{passwordError}</Text>
                  )}
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  style={[
                    styles.modernSignUpButton,
                    signupState.isLoading && styles.disabledButton,
                  ]}
                  onPress={handleRegister}
                  disabled={signupState.isLoading}
                  testID="register-submit-button"
                >
                  <LinearGradient
                    colors={
                      signupState.isLoading
                        ? [
                            theme.colors.palette.neutral400,
                            theme.colors.palette.neutral400,
                          ]
                        : [
                            theme.colors.palette.accent500,
                            theme.colors.palette.accent600,
                          ]
                    }
                    style={styles.modernButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {signupState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral900}
                        testID="register-loading-indicator"
                      />
                    ) : (
                      <>
                        <Text style={styles.modernSignUpText}>
                          Create Account
                        </Text>
                        <MaterialIcons
                          name="person-add"
                          size={20}
                          color={theme.colors.palette.neutral900}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginSection}>
                  <TouchableOpacity
                    onPress={() => router.push('/login')}
                    testID="register-login-link"
                    style={styles.loginLinkContainer}
                  >
                    <Text style={styles.loginText}>
                      Already have an account?{' '}
                      <Text style={styles.loginLink}>Sign In</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.termsSection}>
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </View>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </GestureHandlerRootView>

      {/* Success Overlay - positioned inside GestureHandlerRootView to work with BottomSheet */}
      <SuccessOverlay
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        isSuccess={isSuccess}
        message={dialogMessage}
        subMessage={dialogSubMessage}
      />
    </>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    gradientBackground: {
      flex: 1,
    },

    headerContent: {
      flex: 1,
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 40 : 80,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
      paddingBottom: 40,
    },
    logoSection: {
      alignItems: 'center',
      marginTop: 20,
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 100,
      backgroundColor: theme.colors.palette.overlay20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    logo: {
      width: 100,
      height: 100,
    },
    welcomeTitle: {
      fontSize: 34,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
      textAlign: 'center',
      marginBottom: 8,
      textShadowColor: theme.colors.palette.overlay50,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
      fontWeight: '500',
    },
    benefitsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay20,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 12,
      marginHorizontal: 16,
    },
    benefitItem: {
      alignItems: 'center',
      flex: 1,
    },
    benefitText: {
      fontSize: 11,
      color: theme.colors.palette.neutral800,
      fontWeight: '600',
      marginTop: 6,
      textAlign: 'center',
    },
    bottomSheetBackground: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    bottomSheetIndicator: {
      backgroundColor: theme.colors.border,
      width: 40,
    },
    bottomSheetContent: {
      flex: 1,
      paddingHorizontal: 24,
    },
    formWrapper: {
      flex: 1,
    },
    formHeader: {
      alignItems: 'center',
      marginBottom: 28,
      paddingTop: 8,
    },
    formTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 6,
    },
    formSubtitle: {
      fontSize: 15,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 14,
      marginLeft: 12,
      flex: 1,
      fontWeight: '500',
    },
    formContainer: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      marginLeft: 4,
    },
    modernInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      height: 54,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.backgroundSecondary,
      shadowOpacity: 0.1,
    },
    inputError: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorBackground,
    },
    inputIcon: {
      marginRight: 12,
    },
    modernInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    passwordToggle: {
      padding: 8,
    },
    fieldError: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
      fontWeight: '500',
    },
    modernSignUpButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 12,
      marginBottom: 24,
      shadowColor: theme.colors.palette.accent500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    modernButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      height: 56,
    },
    disabledButton: {
      shadowOpacity: 0,
      elevation: 0,
    },
    modernSignUpText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginRight: 8,
    },
    loginSection: {
      alignItems: 'center',
      paddingTop: 16,
      marginBottom: 20,
    },
    loginLinkContainer: {
      paddingVertical: 12,
    },
    loginText: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    loginLink: {
      color: theme.colors.palette.primary500,
      fontWeight: '600',
    },
    termsSection: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    termsText: {
      fontSize: 12,
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 16,
    },
    termsLink: {
      color: theme.colors.palette.primary500,
      fontWeight: '500',
    },
  })
