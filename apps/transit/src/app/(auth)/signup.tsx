import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  LoadingOverlay,
  Text,
  useAppTheme,
  type Theme,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStores } from '@/models'

const { width: screenWidth } = Dimensions.get('window')

const SignupScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { signupState } = authStore
  const { trackScreenMount } = useInteractionTracking('Signup', '/signup')
  const { sessionId } = useLocalSearchParams()
  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const { theme } = useAppTheme()

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(120)).current
  const logoRotate = useRef(new Animated.Value(0)).current
  const wave1 = useRef(new Animated.Value(0)).current
  const wave2 = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start()

    // Wave animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave1, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(wave1, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(wave2, {
          toValue: 1,
          duration: 4500,
          useNativeDriver: true,
        }),
        Animated.timing(wave2, {
          toValue: 0,
          duration: 4500,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [fadeAnim, slideUp, logoRotate, pulse, wave1, wave2])

  const handleSignup = async () => {
    const success = await authStore.signup()

    if (__DEV__) {
      console.log('Signup result:', {
        success,
        hasError: !!userStore.authError,
        errorMessage: userStore.authError?.message,
      })
    }

    if (success) {
      // Clear any errors
      userStore.clearErrors()
      // Show success confirmation
      setShowSuccessModal(true)
      // Navigate to tabs after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false)
        router.replace('/(tabs)/plan')
      }, 2000)
    }
    // Error is automatically displayed in error bubble above the form
  }

  useEffect(() => {
    trackScreenMount()
    authStore.loginState.reset()
    authStore.setCurrentScreen('signup')
    // Clear any previous errors when screen mounts
    userStore.clearErrors()

    return () => {
      signupState.reset()
      authStore.reset()
      // Don't clear errors here - let them persist for user to see
    }
  }, [])

  useEffect(() => {
    if (sessionId) {
      const focusedElement = signupState.currentFocused
      if (focusedElement === 'name') {
        nameRef.current?.focus()
      } else if (focusedElement === 'email') {
        emailRef.current?.focus()
      } else if (focusedElement === 'password') {
        passwordRef.current?.focus()
      }
    }
  }, [sessionId])

  const nameError = authStore.getValidationError('name')
  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')
  const hasNameError = !!nameError
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  const wave1TranslateX = wave1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  })

  const wave2TranslateX = wave2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  })

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const styles = useMemo(() => createStyles(theme), [theme])

  const gradientColors = [
    theme.colors.palette.primary500,
    theme.colors.palette.secondary500,
    theme.colors.palette.accent500,
  ]

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Animated wave decorations */}
        <Animated.View
          style={[
            styles.waveDecoration1,
            {
              transform: [{ translateX: wave1TranslateX }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.waveDecoration2,
            {
              transform: [{ translateX: wave2TranslateX }],
            },
          ]}
        />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Compact Header with Spinning Logo */}
              <Animated.View
                style={[
                  styles.headerSection,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.miniLogoContainer,
                    {
                      transform: [
                        { rotate: logoRotateInterpolate },
                        { scale: pulse },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={require('../../../assets/images/splash-icon.png')}
                    style={styles.miniLogo}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Text style={styles.createAccountText}>Create Account</Text>
                <View style={styles.accentBar} />
              </Animated.View>

              {/* Floating Form */}
              <Animated.View
                style={[
                  styles.floatingForm,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUp }],
                  },
                ]}
              >
                {/* Error Message */}
                {userStore.authError && (
                  <View style={styles.errorBubble}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={20}
                      color={theme.colors.palette.neutral100}
                    />
                    <Text style={styles.errorText}>
                      {userStore.authError.message}
                    </Text>
                  </View>
                )}

                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.curvyInput,
                      signupState.currentFocused === 'name' &&
                        styles.inputActive,
                      hasNameError && styles.inputErrorState,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="person"
                        size={18}
                        color={theme.colors.palette.primary200}
                      />
                    </View>
                    <TextInput
                      ref={nameRef}
                      placeholder="Enter UserName"
                      placeholderTextColor={`${theme.colors.palette.neutral100}80`}
                      style={styles.curvedTextInput}
                      autoCapitalize="words"
                      value={signupState.name || ''}
                      onChangeText={text => signupState.setName(text)}
                      onFocus={() => signupState.setFocused('name')}
                      onBlur={() => signupState.setFocused(null)}
                      underlineColorAndroid="transparent"
                      testID="name-input"
                    />
                  </View>
                  {nameError && (
                    <Text style={styles.floatingError}>{nameError}</Text>
                  )}
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.curvyInput,
                      signupState.currentFocused === 'email' &&
                        styles.inputActive,
                      hasEmailError && styles.inputErrorState,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="mail"
                        size={18}
                        color={theme.colors.palette.primary200}
                      />
                    </View>
                    <TextInput
                      ref={emailRef}
                      placeholder="Your email address"
                      placeholderTextColor={`${theme.colors.palette.neutral100}80`}
                      style={styles.curvedTextInput}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={signupState.email || ''}
                      onChangeText={text => signupState.setEmail(text)}
                      onFocus={() => signupState.setFocused('email')}
                      onBlur={() => signupState.setFocused(null)}
                      underlineColorAndroid="transparent"
                      testID="email-input"
                    />
                  </View>
                  {emailError && (
                    <Text style={styles.floatingError}>{emailError}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.curvyInput,
                      signupState.currentFocused === 'password' &&
                        styles.inputActive,
                      hasPasswordError && styles.inputErrorState,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color={theme.colors.palette.primary200}
                      />
                    </View>
                    <TextInput
                      ref={passwordRef}
                      placeholder="Create a password"
                      placeholderTextColor={`${theme.colors.palette.neutral100}80`}
                      style={styles.curvedTextInput}
                      secureTextEntry={!showPassword}
                      value={signupState.password || ''}
                      onChangeText={text => signupState.setPassword(text)}
                      onFocus={() => signupState.setFocused('password')}
                      onBlur={() => signupState.setFocused(null)}
                      underlineColorAndroid="transparent"
                      testID="password-input"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={`${theme.colors.palette.neutral100}CC`}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError && (
                    <Text style={styles.floatingError}>{passwordError}</Text>
                  )}
                </View>

                {/* Wavy Signup Button */}
                <TouchableOpacity
                  style={[
                    styles.wavyButton,
                    signupState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={signupState.isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.palette.neutral100,
                      `${theme.colors.palette.neutral100}F2`,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.wavyButtonGradient}
                  >
                    {signupState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.primary500}
                        size="small"
                      />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.wavyButtonText}>
                          Create Account
                        </Text>
                        <View style={styles.arrowCircle}>
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={theme.colors.palette.neutral100}
                          />
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Terms Bubble */}
                <View style={styles.termsBubble}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={`${theme.colors.palette.neutral100}CC`}
                  />
                  <Text style={styles.termsText}>
                    By signing up, you agree to our Terms & Privacy Policy
                  </Text>
                </View>

                {/* Signin Link Bubble */}
                <TouchableOpacity
                  style={styles.signinBubble}
                  onPress={() => {
                    signupState.clearValidationErrors()
                    router.push('/login')
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-back-circle-outline"
                    size={24}
                    color={`${theme.colors.palette.neutral100}E6`}
                  />
                  <Text style={styles.signinBubbleText}>
                    Already have an account?{' '}
                    <Text style={styles.signinBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Floating Dots */}
              <Animated.View
                style={[styles.floatingDots, { opacity: fadeAnim }]}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      transform: [
                        {
                          translateY: wave1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-5, 5],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    styles.dot2,
                    {
                      transform: [
                        {
                          translateY: wave2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [5, -5],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    styles.dot3,
                    {
                      transform: [
                        {
                          translateY: wave1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -8],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      <LoadingOverlay
        visible={signupState.isLoading}
        message="Creating your account..."
      />

      {/* Success Confirmation Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View
            style={[
              styles.successModalContent,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                theme.colors.palette.primary400,
                theme.colors.palette.primary500,
              ]}
              style={styles.successIconContainer}
            >
              <Ionicons
                name="checkmark"
                size={48}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
            <Text style={styles.successTitle}>Account Created!</Text>
            <Text style={styles.successMessage}>
              Welcome to Transit! You're all set to start planning your trips.
            </Text>
            <View style={styles.successSpinner}>
              <ActivityIndicator
                size="small"
                color={theme.colors.palette.primary400}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      flex: 1,
    },
    waveDecoration1: {
      position: 'absolute',
      top: -80,
      right: -100,
      width: screenWidth * 1.2,
      height: 250,
      backgroundColor: `${theme.colors.palette.primary300}33`,
      borderRadius: 400,
      transform: [{ rotate: '25deg' }],
    },
    waveDecoration2: {
      position: 'absolute',
      bottom: -100,
      left: -80,
      width: screenWidth * 1.3,
      height: 300,
      backgroundColor: `${theme.colors.palette.primary500}26`,
      borderRadius: 500,
      transform: [{ rotate: '-20deg' }],
    },
    safeArea: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    headerSection: {
      alignItems: 'center',
      marginTop: 30,
      marginBottom: 30,
    },
    miniLogoContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${theme.colors.palette.neutral100}40`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: `${theme.colors.palette.neutral100}66`,
    },
    miniLogo: {
      width: 75,
      height: 75,
    },
    createAccountText: {
      fontSize: 32,
      color: theme.colors.palette.neutral100,
      textShadowColor: `${theme.colors.palette.neutral900}33`,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
      marginBottom: 8,
    },
    accentBar: {
      width: 60,
      height: 4,
      backgroundColor: `${theme.colors.palette.neutral100}99`,
      borderRadius: 10,
      marginTop: 8,
    },
    floatingForm: {
      flex: 1,
    },
    errorBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.colors.palette.angry500}E6`,
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    errorText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 10,
      flex: 1,
    },
    inputGroup: {
      marginBottom: 18,
    },
    curvyInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backdropFilter: 'blur(10px)',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderColor: `${theme.colors.palette.neutral100}40`,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    inputActive: {
      backgroundColor: `${theme.colors.palette.neutral900}A6`,
      borderColor: `${theme.colors.palette.neutral100}66`,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      transform: [{ scale: 1.01 }],
    },
    inputErrorState: {
      borderColor: `${theme.colors.palette.angry400}CC`,
      backgroundColor: `${theme.colors.palette.angry200}33`,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${theme.colors.palette.neutral900}4D`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.palette.neutral100}40`,
    },
    curvedTextInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.palette.neutral100,
      backgroundColor: 'transparent',
      paddingVertical: 0,
      paddingHorizontal: 0,
      margin: 0,
    },
    eyeButton: {
      padding: 8,
    },
    floatingError: {
      color: theme.colors.palette.neutral100,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
      marginLeft: 20,
      textShadowColor: `${theme.colors.palette.neutral900}4D`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    wavyButton: {
      marginTop: 8,
      marginBottom: 20,
      borderRadius: 30,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 10,
    },
    wavyButtonGradient: {
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    wavyButtonText: {
      fontSize: 18,
      color: theme.colors.palette.primary500,
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    termsBubble: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: `${theme.colors.palette.neutral100}26`,
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: `${theme.colors.palette.neutral100}40`,
    },
    termsText: {
      flex: 1,
      color: `${theme.colors.palette.neutral100}D9`,
      fontSize: 12,
      marginLeft: 10,
      lineHeight: 18,
    },
    termsLink: {
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
      textDecorationLine: 'underline',
    },
    signinBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      borderRadius: 25,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}4D`,
      gap: 12,
    },
    signinBubbleText: {
      color: `${theme.colors.palette.neutral100}E6`,
      fontSize: 14,
      fontWeight: '500',
    },
    signinBold: {
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
    },
    floatingDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      gap: 16,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: `${theme.colors.palette.neutral100}66`,
    },
    dot2: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: `${theme.colors.palette.neutral100}4D`,
    },
    dot3: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: `${theme.colors.palette.neutral100}59`,
    },
    successModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${theme.colors.palette.neutral900}B3`,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    successModalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 32,
      padding: 32,
      alignItems: 'center',
      maxWidth: '85%',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12,
    },
    successIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
      textAlign: 'center',
    },
    successMessage: {
      fontSize: 16,
      color: theme.colors.palette.neutral500,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    successSpinner: {
      marginTop: 8,
    },
  })

export default SignupScreen
