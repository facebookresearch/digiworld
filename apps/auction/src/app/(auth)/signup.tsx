import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
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
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, LoadingOverlay, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { translate } from '@/i18n/translate'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components'
import { Glassmorphic } from '@/components/Glassmorphic'
import { useAppTheme } from '@andojo/shared-theme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const SignupScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { signupState } = authStore
  const { trackScreenMount } = useInteractionTracking('Signup', '/signup')
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
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
        screen: 'signup',
        route: '/signup',
      })
    }, []),
  )

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
    trackScreenMount()
    authStore.loginState.reset()
    authStore.setCurrentScreen('signup')

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

    return () => {
      signupState.reset()
      authStore.reset()
      userStore.clearErrors()
    }
  }, [])

  useEffect(() => {
    if (sessionTimeStamp) {
      console.log('Session ID:', sessionId)
      const focusedElement = signupState.currentFocused
      console.log('Focused element:', focusedElement)
      if (focusedElement === 'name') {
        setTimeout(() => {
          nameRef.current?.focus()
          nameRef.current?.setSelection(
            signupState.name.length,
            signupState.name.length,
          )
        }, 100)
      } else if (focusedElement === 'email') {
        setTimeout(() => {
          emailRef.current?.focus()
          emailRef.current?.setSelection(
            signupState.email.length,
            signupState.email.length,
          )
        }, 100)
      } else if (focusedElement === 'password') {
        setTimeout(() => {
          passwordRef.current?.focus()
          passwordRef.current?.setSelection(
            signupState.password.length,
            signupState.password.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp])

  const nameError = authStore.getValidationError('name')
  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')

  const hasNameError = !!nameError
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  // Handle input focus
  const handleInputFocus = (
    ref: React.RefObject<TextInput>,
    fieldName: string,
  ) => {
    ref.current?.focus()
    signupState.setFocused(fieldName)
  }

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
            padding={20}
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
            {translate('auth.createAccount')}
          </Text>
          <Text style={styles.subtitleText}>
            {translate('auth.signUpToStart')}
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
                keyboardShouldPersistTaps="handled" // Important for fixing double-tap issue
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
                  {/* Name Input */}
                  <View style={styles.inputWrapper}>
                    <TouchableWithoutFeedback
                      onPress={() => handleInputFocus(nameRef, 'name')}
                    >
                      <Glassmorphic
                        borderRadius={16}
                        padding={0}
                        intensity={70}
                        backgroundColor={
                          signupState.currentFocused === 'name'
                            ? Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                            : Platform.OS === 'ios'
                              ? theme.colors.palette.secondary100
                              : theme.colors.palette.neutral100
                        }
                        borderColor={
                          hasNameError
                            ? theme.colors.palette.angry400
                            : signupState.currentFocused === 'name'
                              ? theme.colors.palette.primary400
                              : theme.colors.palette.neutral200
                        }
                        borderWidth={hasNameError ? 2 : 1.5}
                        style={[
                          styles.inputContainer,
                          hasNameError && styles.inputError,
                          signupState.currentFocused === 'name' &&
                            styles.inputFocused,
                        ]}
                      >
                        <View style={styles.inputInner}>
                          <Ionicons
                            name="person-outline"
                            size={20}
                            color={
                              signupState.currentFocused === 'name'
                                ? theme.colors.tint
                                : theme.colors.textDim
                            }
                            style={styles.inputIcon}
                          />
                          <TextInput
                            ref={nameRef}
                            placeholder={translate('auth.namePlaceholder')}
                            placeholderTextColor={theme.colors.textDim}
                            style={styles.input}
                            autoCapitalize="words"
                            value={signupState.name}
                            onChangeText={signupState.setName}
                            onFocus={() => signupState.setFocused('name')}
                            onBlur={() => signupState.setFocused(null)}
                            testID="name-input"
                          />
                        </View>
                      </Glassmorphic>
                    </TouchableWithoutFeedback>
                    {nameError && (
                      <Text style={styles.fieldError}>{nameError}</Text>
                    )}
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    <TouchableWithoutFeedback
                      onPress={() => handleInputFocus(emailRef, 'email')}
                    >
                      <Glassmorphic
                        borderRadius={16}
                        padding={0}
                        intensity={70}
                        backgroundColor={
                          signupState.currentFocused === 'email'
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
                            : signupState.currentFocused === 'email'
                              ? theme.colors.palette.primary400
                              : theme.colors.palette.neutral200
                        }
                        borderWidth={hasEmailError ? 2 : 1.5}
                        style={[
                          styles.inputContainer,
                          hasEmailError && styles.inputError,
                          signupState.currentFocused === 'email' &&
                            styles.inputFocused,
                        ]}
                      >
                        <View style={styles.inputInner}>
                          <Ionicons
                            name="mail-outline"
                            size={20}
                            color={
                              signupState.currentFocused === 'email'
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
                            value={signupState.email}
                            onChangeText={signupState.setEmail}
                            onFocus={() => signupState.setFocused('email')}
                            onBlur={() => signupState.setFocused(null)}
                            testID="email-input"
                          />
                        </View>
                      </Glassmorphic>
                    </TouchableWithoutFeedback>
                    {emailError && (
                      <Text style={styles.fieldError}>{emailError}</Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputWrapper}>
                    <TouchableWithoutFeedback
                      onPress={() => handleInputFocus(passwordRef, 'password')}
                    >
                      <Glassmorphic
                        borderRadius={16}
                        padding={0}
                        intensity={70}
                        backgroundColor={
                          signupState.currentFocused === 'password'
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
                            : signupState.currentFocused === 'password'
                              ? theme.colors.palette.primary400
                              : theme.colors.palette.neutral200
                        }
                        borderWidth={hasPasswordError ? 2 : 1.5}
                        style={[
                          styles.inputContainer,
                          hasPasswordError && styles.inputError,
                          signupState.currentFocused === 'password' &&
                            styles.inputFocused,
                        ]}
                      >
                        <View style={styles.inputInner}>
                          <Ionicons
                            name="lock-closed-outline"
                            size={20}
                            color={
                              signupState.currentFocused === 'password'
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
                            value={signupState.password}
                            onChangeText={signupState.setPassword}
                            onFocus={() => signupState.setFocused('password')}
                            onBlur={() => signupState.setFocused(null)}
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

                {/* Signup Button */}
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    signupState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={signupState.isLoading}
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
                    {signupState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral100}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.signupButtonText}>
                        {translate('auth.signUp')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    {translate('auth.hasAccount')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      signupState.clearValidationErrors()
                      router.push('/login')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loginLink}>
                      {translate('auth.logIn')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    {translate('auth.bySigningUpYouAgreeTo') + ' '}
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
      width: 80,
      height: 80,
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

    // Signup button
    signupButton: {
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

    // Signup button text
    signupButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },

    // Login container
    loginContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 24,
    },

    // Login text
    loginText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.palette.neutral600,
    },

    // Login link
    loginLink: {
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
      paddingTop: 16,
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

export default SignupScreen
