// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  Text,
  LoadingOverlay,
  type Theme,
  useAppTheme,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { translate } from '@/i18n'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components'
import { Glassmorphic } from '@/components/Glassmorphic'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  // Animation values
  const slideAnim = useRef(new Animated.Value(50)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'login',
        route: '/login',
      })
    }, []),
  )

  // Set current screen on mount
  useEffect(() => {
    authStore.setCurrentScreen('login')

    // Animate in the bottom sheet
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()

    // // Animate in the bottom sheet
    // Animated.parallel([
    //   Animated.timing(slideAnim, {
    //     toValue: 0,
    //     duration: 500,
    //     easing: Easing.out(Easing.cubic),
    //     useNativeDriver: true,
    //   }),
    //   Animated.timing(fadeAnim, {
    //     toValue: 1,
    //     duration: 300,
    //     useNativeDriver: true,
    //   }),
    // ]).start()
    // setAnimationComplete(true)

    return () => {
      // Reset state when unmounting
      userStore.clearErrors()
      authStore.reset()
    }
  }, [])
  // Handle input focus with animation check
  const handleInputFocus = (
    ref: React.RefObject<TextInput>,
    fieldName: string,
  ) => {
    ref.current?.focus()
    loginState.setFocused(fieldName)
  }
  const handleLogin = async () => {
    console.log('Login state:', loginState)
    try {
      const success = await authStore.login()
      if (success) {
        // // Initialize banking session after successful login
        // try {
        //   await bankingStore.initializeSession({
        //     userId: userStore.user?.id || 1,
        //     seed: Math.floor(Math.random() * 100000),
        //   })
        //   console.log('Banking session initialized successfully')
        // } catch (error) {
        //   console.error('Failed to initialize banking session:', error)
        // }

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
        setTimeout(() => {
          emailRef.current?.focus()
          emailRef.current?.setSelection(
            loginState.email.length,
            loginState.email.length,
          )
        }, 100)
      } else if (focusedElement === 'password') {
        setTimeout(() => {
          passwordRef.current?.focus()
          passwordRef.current?.setSelection(
            loginState.password.length,
            loginState.password.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp])

  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />

      {/* Background with gradient */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.secondary500,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background orbs for depth */}
        <View style={styles.backgroundOrbs}>
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
        </View>
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        {/* Header with logo */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Glassmorphic
            borderRadius={24}
            padding={5}
            intensity={50}
            backgroundColor={theme.colors.palette.overlay20}
            borderColor={theme.colors.palette.overlay50}
            style={styles.logoContainer}
          >
            <Image
              source={require('../../../assets/images/app-icon-all.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Glassmorphic>
          <Text style={styles.welcomeText}>
            {translate('auth.welcomeBack')}
          </Text>
          <Text style={styles.subtitleText}>
            {translate('auth.signInToContinue')}
          </Text>
        </Animated.View>

        {/* Glassmorphic Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Glassmorphic
            borderRadius={32}
            intensity={Platform.OS === 'ios' ? 90 : 95}
            backgroundColor={
              Platform.OS === 'ios'
                ? theme.colors.palette.angry100
                : theme.colors.palette.neutral100
            }
            borderColor={theme.colors.palette.neutral200}
            style={styles.glassSheet}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              {/* Handle bar */}
              <View style={styles.handleBar} />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Error Message */}
                {userStore.authError && (
                  <Glassmorphic
                    borderRadius={12}
                    padding={12}
                    intensity={60}
                    backgroundColor={theme.colors.palette.angry200}
                    borderColor={theme.colors.palette.angry200}
                    style={styles.errorContainer}
                  >
                    <View style={styles.errorContent}>
                      <Ionicons
                        name="warning"
                        size={20}
                        color={theme.colors.error}
                      />
                      <Text style={styles.errorText}>
                        {userStore.authError.message}
                      </Text>
                    </View>
                  </Glassmorphic>
                )}

                {/* Input Fields */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <TouchableWithoutFeedback
                      onPress={() => handleInputFocus(emailRef, 'email')}
                    >
                      <Glassmorphic
                        borderRadius={16}
                        padding={0}
                        intensity={70}
                        backgroundColor={
                          loginState.currentFocused === 'email'
                            ? Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                            : Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                        }
                        borderColor={
                          hasEmailError
                            ? theme.colors.palette.angry400
                            : loginState.currentFocused === 'email'
                              ? theme.colors.palette.primary400
                              : theme.colors.palette.neutral200
                        }
                        borderWidth={hasEmailError ? 2 : 1.5}
                        style={[
                          styles.inputContainer,
                          hasEmailError && styles.inputError,
                          loginState.currentFocused === 'email' &&
                            styles.inputFocused,
                        ]}
                      >
                        <View style={styles.inputInner}>
                          <Ionicons
                            name="mail-outline"
                            size={20}
                            color={
                              loginState.currentFocused === 'email'
                                ? theme.colors.tint
                                : theme.colors.textDim
                            }
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
                      </Glassmorphic>
                    </TouchableWithoutFeedback>
                    {emailError && (
                      <Text style={styles.fieldError}>{emailError}</Text>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <TouchableWithoutFeedback
                      onPress={() => handleInputFocus(passwordRef, 'password')}
                    >
                      <Glassmorphic
                        borderRadius={16}
                        padding={0}
                        intensity={70}
                        backgroundColor={
                          loginState.currentFocused === 'password'
                            ? Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                            : Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                        }
                        borderColor={
                          hasPasswordError
                            ? theme.colors.palette.angry400
                            : loginState.currentFocused === 'password'
                              ? theme.colors.palette.primary400
                              : theme.colors.palette.neutral200
                        }
                        borderWidth={hasPasswordError ? 2 : 1.5}
                        style={[
                          styles.inputContainer,
                          hasPasswordError && styles.inputError,
                          loginState.currentFocused === 'password' &&
                            styles.inputFocused,
                        ]}
                      >
                        <View style={styles.inputInner}>
                          <Ionicons
                            name="lock-closed-outline"
                            size={20}
                            color={
                              loginState.currentFocused === 'password'
                                ? theme.colors.tint
                                : theme.colors.textDim
                            }
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
                      </Glassmorphic>
                    </TouchableWithoutFeedback>
                    {passwordError && (
                      <Text style={styles.fieldError}>{passwordError}</Text>
                    )}
                  </View>
                </View>

                {/* Login Button */}
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
                      theme.colors.palette.primary500,
                      theme.colors.palette.secondary500,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {loginState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral100}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.loginButtonText}>
                        {translate('auth.signIn')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
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
                      {translate('auth.signUpForFree')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    {translate('auth.byContinuingYouAgreeTo') + ' '}
                    <TouchableOpacity
                      onPress={() => router.push('/(legal)/terms')}
                    >
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
          </Glassmorphic>
        </Animated.View>
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Main container
    container: {
      flex: 1,
    },

    // Background gradient
    backgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    // Background orbs
    backgroundOrbs: {
      ...StyleSheet.absoluteFillObject,
    },
    orb: {
      position: 'absolute',
      borderRadius: 200,
      opacity: 0.08,
    },
    orb1: {
      width: 400,
      height: 400,
      backgroundColor: theme.colors.palette.neutral100,
      top: -150,
      right: -150,
    },
    orb2: {
      width: 300,
      height: 300,
      backgroundColor: theme.colors.palette.neutral100,
      bottom: -100,
      left: -100,
    },

    // Safe area
    safeArea: {
      flex: 1,
    },

    // Header section
    header: {
      alignItems: 'center',
      zIndex: 1,
      height: SCREEN_HEIGHT * 0.35,
      justifyContent: 'center',
      paddingTop: 20,
      paddingHorizontal: 24,
    },

    // Logo container
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },

    // Logo image
    logo: {
      width: 100,
      height: 100,
    },

    // Welcome text
    welcomeText: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.5,
    },

    // Subtitle text
    subtitleText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.palette.neutral200,
      textAlign: 'center',
      opacity: 0.9,
    },

    // Bottom sheet
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT * 0.65,
      paddingHorizontal: 0,
    },
    glassSheet: {
      flex: 1,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },

    // Handle bar
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.palette.neutral300,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },

    // Keyboard view
    keyboardView: {
      flex: 1,
    },

    // Scroll content
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 40,
      flexGrow: 1,
    },

    // Error container
    errorContainer: {
      marginBottom: 16,
    },
    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Error text
    errorText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.angry500,
      marginLeft: 8,
    },

    // Input group
    inputGroup: {
      marginBottom: 32,
    },

    // Input wrapper
    inputWrapper: {
      marginBottom: 16,
    },

    // Input container
    inputContainer: {
      minHeight: 56,
    },
    inputInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },

    // Input focused state
    inputFocused: {
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },

    // Input error state
    inputError: {
      shadowColor: theme.colors.palette.angry500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // Input icon
    inputIcon: {
      marginRight: 12,
    },

    // Input field
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.palette.neutral800,
    },

    // Field error
    fieldError: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.angry500,
      marginTop: 6,
      marginLeft: 4,
      opacity: 0.8,
    },

    // Login button
    loginButton: {
      borderRadius: 16,
      marginBottom: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },

    // Button gradient
    buttonGradient: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      minHeight: 56,
    },

    // Button disabled
    buttonDisabled: {
      opacity: 0.6,
    },

    // Login button text
    loginButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },

    // Signup container
    signupContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 24,
    },

    // Signup text
    signupText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.palette.neutral600,
    },

    // Signup link
    signupLink: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      textDecorationLine: 'underline',
      marginLeft: 4,
    },

    // Footer
    footer: {
      alignItems: 'center',
      paddingHorizontal: 16,
    },

    // Footer text
    footerText: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Footer link
    footerLink: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.primary500,
      textDecorationLine: 'underline',
    },
  })

export default LoginScreen
