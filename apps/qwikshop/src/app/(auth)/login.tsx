import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  Keyboard,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { SuccessOverlay } from '@/components/SuccessOverlay'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { LinearGradient } from 'react-native-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { theme, mode } = useAppTheme()
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogSubMessage, setDialogSubMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')

  // Dynamic bottom sheet snap points based on keyboard state
  const snapPoints = useMemo(() => {
    if (keyboardVisible) {
      return ['85%', '90%'] // Expand when keyboard is visible
    }
    return ['70%', '75%'] // Default size
  }, [keyboardVisible])

  useEffect(() => {
    authStore.setCurrentScreen('login')

    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Keyboard event listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true)
        // Expand bottom sheet when keyboard appears
        bottomSheetRef.current?.snapToIndex(1)
      },
    )

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false)
        // Contract bottom sheet when keyboard disappears
        bottomSheetRef.current?.snapToIndex(0)
      },
    )

    return () => {
      authStore.reset()
      keyboardWillShow.remove()
      keyboardWillHide.remove()
    }
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
              theme.colors.palette.primary500,
              theme.colors.palette.primary600,
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
            <Text style={styles.welcomeTitle}>QwikShop</Text>
            <Text style={styles.welcomeSubtitle}>Your shopping companion</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Support</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>Fast</Text>
              <Text style={styles.statLabel}>Delivery</Text>
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
          <BottomSheetView style={styles.bottomSheetContent}>
            <View style={styles.formWrapper}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>
                  Sign in to continue shopping
                </Text>
              </View>

              {userStore.authError && (
                <View style={styles.errorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                  <Text style={styles.errorText}>
                    {userStore.authError.message}
                  </Text>
                </View>
              )}

              <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View
                    style={[
                      styles.modernInputWrapper,
                      loginState.currentFocused === 'email' &&
                        styles.inputFocused,
                      emailError && styles.inputError,
                    ]}
                  >
                    <MaterialIcons
                      name="alternate-email"
                      size={20}
                      color={
                        loginState.currentFocused === 'email'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailInputRef}
                      style={styles.modernInput}
                      value={loginState.email}
                      onChangeText={loginState.setEmail}
                      onFocus={() => {
                        loginState.setFocused('email')
                        // Ensure bottom sheet is expanded when focusing
                        if (!keyboardVisible) {
                          bottomSheetRef.current?.snapToIndex(1)
                        }
                      }}
                      onBlur={() => loginState.setFocused(null)}
                      placeholder="your@email.com"
                      placeholderTextColor={theme.colors.textDim}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loginState.isLoading}
                      testID="login-email-input"
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
                      loginState.currentFocused === 'password' &&
                        styles.inputFocused,
                      passwordError && styles.inputError,
                    ]}
                  >
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color={
                        loginState.currentFocused === 'password'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.modernInput}
                      value={loginState.password}
                      onChangeText={loginState.setPassword}
                      onFocus={() => {
                        loginState.setFocused('password')
                        // Ensure bottom sheet is expanded when focusing
                        if (!keyboardVisible) {
                          bottomSheetRef.current?.snapToIndex(1)
                        }
                      }}
                      onBlur={() => loginState.setFocused(null)}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.textDim}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      editable={!loginState.isLoading}
                      testID="login-password-input"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={theme.colors.palette.neutral500}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError && (
                    <Text style={styles.fieldError}>{passwordError}</Text>
                  )}
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.modernSignInButton,
                    loginState.isLoading && styles.disabledButton,
                  ]}
                  onPress={handleLogin}
                  disabled={loginState.isLoading}
                  testID="login-submit-button"
                >
                  <LinearGradient
                    colors={
                      loginState.isLoading
                        ? [
                            theme.colors.palette.neutral400,
                            theme.colors.palette.neutral400,
                          ]
                        : [
                            theme.colors.palette.primary500,
                            theme.colors.palette.primary600,
                          ]
                    }
                    style={styles.modernButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loginState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral900}
                        testID="login-loading-indicator"
                      />
                    ) : (
                      <>
                        <Text style={styles.modernSignInText}>Sign In</Text>
                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color={theme.colors.palette.neutral900}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Register Link */}
                <View style={styles.registerSection}>
                  <TouchableOpacity
                    onPress={() => router.push('/register')}
                    testID="login-register-link"
                    style={styles.registerLinkContainer}
                  >
                    <Text style={styles.registerText}>
                      New to QwikShop?{' '}
                      <Text style={styles.registerLink}>Create Account</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.termsSection}>
                  <Text style={styles.termsText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </View>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheet>
        {/* Success Overlay - positioned inside GestureHandlerRootView to work with BottomSheet */}
        <SuccessOverlay
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          isSuccess={isSuccess}
          message={dialogMessage}
          subMessage={dialogSubMessage}
        />
      </GestureHandlerRootView>
    </>
  )
})

export default LoginScreen

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
      marginTop: 40,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.overlay20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    logo: {
      width: 100,
      height: 100,
    },
    welcomeTitle: {
      fontSize: 36,
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
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.overlay20,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginHorizontal: 20,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.palette.neutral800,
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.colors.palette.overlay20,
      marginHorizontal: 16,
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
      marginBottom: 32,
      paddingTop: 8,
    },
    formTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    formSubtitle: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
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
      marginBottom: 24,
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
      height: 56,
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
    modernSignInButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 24,
      shadowColor: theme.colors.palette.primary500,
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
    modernSignInText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginRight: 8,
    },
    registerSection: {
      alignItems: 'center',
      paddingTop: 16,
      marginBottom: 20,
    },
    registerLinkContainer: {
      paddingVertical: 12,
    },
    registerText: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    registerLink: {
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
