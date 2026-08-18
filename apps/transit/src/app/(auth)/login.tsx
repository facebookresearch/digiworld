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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStores } from '@/models'

const { width: screenWidth } = Dimensions.get('window')

const LoginScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionId } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showPassword, setShowPassword] = useState(false)
  const { theme } = useAppTheme()

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(100)).current
  const logoScale = useRef(new Animated.Value(0.3)).current
  const wave1 = useRef(new Animated.Value(0)).current
  const wave2 = useRef(new Animated.Value(0)).current
  const float1 = useRef(new Animated.Value(0)).current

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
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start()

    // Continuous wave animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave1, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(wave1, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(wave2, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(wave2, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [fadeAnim, slideUp, logoScale, float1, wave1, wave2])

  // Set current screen on mount
  useEffect(() => {
    trackScreenMount()
    authStore.setCurrentScreen('login')
    return () => {
      userStore.clearErrors()
      authStore.reset()
    }
  }, [])

  const handleLogin = async () => {
    const success = await authStore.login()
    if (success && userStore.user) {
      // Clear any errors
      userStore.clearErrors()
      router.replace('/(tabs)/plan')
    }
    // Error is displayed in error bubble above the form
  }

  useEffect(() => {
    if (sessionId) {
      const focusedElement = loginState.currentFocused
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

  const wave1TranslateY = wave1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  })

  const wave2TranslateY = wave2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  })

  const floatTranslateY = float1.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
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
            styles.wave1Opacity,
            {
              transform: [{ translateY: wave1TranslateY }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.waveDecoration2,
            styles.wave2Opacity,
            {
              transform: [{ translateY: wave2TranslateY }],
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
              {/* Floating Logo */}
              <Animated.View
                style={[
                  styles.logoSection,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { scale: logoScale },
                      { translateY: floatTranslateY },
                    ],
                  },
                ]}
              >
                <View style={styles.logoGlow}>
                  <View style={styles.logoInnerGlow}>
                    <Image
                      source={require('../../../assets/images/splash-icon.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <View style={styles.welcomeWave} />
              </Animated.View>

              {/* Floating Curvy Form */}
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

                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.curvyInput,
                      loginState.currentFocused === 'email' &&
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
                      placeholder="Enter your email"
                      placeholderTextColor={`${theme.colors.palette.neutral100}80`}
                      style={styles.curvedTextInput}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={loginState.email || ''}
                      onChangeText={text => loginState.setEmail(text)}
                      onFocus={() => loginState.setFocused('email')}
                      onBlur={() => loginState.setFocused(null)}
                      underlineColorAndroid="transparent"
                      testID="email-input"
                    />
                  </View>
                  {emailError && (
                    <Text style={styles.floatingError}>{emailError}</Text>
                  )}
                </View>

                {/* Curvy Password Input */}
                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.curvyInput,
                      loginState.currentFocused === 'password' &&
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
                      placeholder="Enter your password"
                      placeholderTextColor={`${theme.colors.palette.neutral100}80`}
                      style={styles.curvedTextInput}
                      secureTextEntry={!showPassword}
                      value={loginState.password || ''}
                      onChangeText={text => loginState.setPassword(text)}
                      onFocus={() => loginState.setFocused('password')}
                      onBlur={() => loginState.setFocused(null)}
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

                {/* Wavy Signin Button */}
                <TouchableOpacity
                  style={[
                    styles.wavyButton,
                    loginState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loginState.isLoading}
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
                    {loginState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.primary400}
                        size="small"
                      />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.wavyButtonText}>Sign In</Text>
                        <View style={styles.arrowCircle}>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color={theme.colors.palette.neutral100}
                          />
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Wavy Divider */}
                <View style={styles.wavyDivider}>
                  <View style={styles.waveLine} />
                  <View style={styles.orCircle}>
                    <Text style={styles.orText}>OR</Text>
                  </View>
                  <View style={styles.waveLine} />
                </View>

                {/* Signup Bubble */}
                <TouchableOpacity
                  style={styles.signupBubble}
                  onPress={() => router.push('/signup')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signupBubbleText}>
                    New here?{' '}
                    <Text style={styles.signupBold}>Create Account</Text>
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={24}
                    color={`${theme.colors.palette.neutral100}E6`}
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Floating Transport Icons */}
              <Animated.View
                style={[styles.floatingIcons, { opacity: fadeAnim }]}
              >
                <Animated.View
                  style={[
                    styles.iconBubble,
                    { transform: [{ translateY: floatTranslateY }] },
                  ]}
                >
                  <Ionicons
                    name="bus"
                    size={18}
                    color={`${theme.colors.palette.neutral100}B3`}
                  />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.iconBubble,
                    styles.iconBubble2,
                    {
                      transform: [
                        {
                          translateY: float1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, -10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="train"
                    size={18}
                    color={`${theme.colors.palette.neutral100}B3`}
                  />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.iconBubble,
                    styles.iconBubble3,
                    {
                      transform: [
                        {
                          translateY: float1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-5, 5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="bicycle"
                    size={18}
                    color={`${theme.colors.palette.neutral100}B3`}
                  />
                </Animated.View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      <LoadingOverlay visible={loginState.isLoading} message="Logging in..." />
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
      top: -100,
      left: -50,
      width: screenWidth * 1.5,
      height: 300,
      backgroundColor: theme.colors.palette.primary200,
      borderRadius: 500,
      transform: [{ rotate: '-15deg' }],
    },
    waveDecoration2: {
      position: 'absolute',
      bottom: -150,
      right: -100,
      width: screenWidth * 1.5,
      height: 350,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 600,
      transform: [{ rotate: '20deg' }],
    },
    wave1Opacity: {
      opacity: 0.2,
    },
    wave2Opacity: {
      opacity: 0.15,
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
    logoSection: {
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 40,
    },
    logoGlow: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: theme.colors.palette.neutral100,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    logoInnerGlow: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${theme.colors.palette.neutral100}4D`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 70,
      height: 70,
    },
    welcomeText: {
      fontSize: 36,
      color: theme.colors.palette.neutral100,
      textShadowColor: `${theme.colors.palette.neutral900}33`,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
      marginBottom: 8,
    },
    welcomeWave: {
      width: 80,
      height: 4,
      backgroundColor: `${theme.colors.palette.neutral100}80`,
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
      marginBottom: 20,
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
      backgroundColor: `${theme.colors.palette.neutral900}26`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.palette.neutral100}40`,
    },
    curvedTextInput: {
      flex: 1,
      fontSize: 16,
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
      fontSize: 14,
      marginTop: 8,
      marginLeft: 20,
      textShadowColor: `${theme.colors.palette.neutral900}4D`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    wavyButton: {
      marginTop: 10,
      marginBottom: 24,
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
      color: theme.colors.palette.primary400,
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.primary400,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    wavyDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    waveLine: {
      flex: 1,
      height: 2,
      backgroundColor: `${theme.colors.palette.neutral100}4D`,
      borderRadius: 2,
    },
    orCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}66`,
    },
    orText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '800',
    },
    signupBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      borderRadius: 25,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}4D`,
    },
    signupBubbleText: {
      color: `${theme.colors.palette.neutral100}E6`,
      fontSize: 15,
      fontWeight: '500',
    },
    signupBold: {
      fontWeight: '800',
      color: theme.colors.palette.neutral100,
    },
    floatingIcons: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 30,
      gap: 20,
    },
    iconBubble: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: `${theme.colors.palette.neutral100}4D`,
    },
    iconBubble2: {
      marginTop: 20,
    },
    iconBubble3: {
      marginTop: -10,
    },
  })

export default LoginScreen
