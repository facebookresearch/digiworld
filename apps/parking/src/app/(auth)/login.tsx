import { useEffect, useRef, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  useAppTheme,
  type Theme,
  Text,
  LoadingOverlay,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components'

const LoginScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { loginState } = authStore
  const { sessionTimeStamp } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    trackScreenMount()
    authStore.setCurrentScreen('login')

    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    return () => {
      userStore.clearErrors()
      authStore.reset()
    }
  }, [])

  const handleLogin = async () => {
    const success = await authStore.login()

    if (success) {
      setShowSuccessDialog(true)
      setTimeout(() => {
        router.replace('/(tabs)/home')
      }, 2000)
    }
  }

  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = loginState.currentFocused
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.secondary500,
          theme.colors.palette.primary500,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header Section */}
              <View style={styles.header}>
                {/* App Logo */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../../assets/images/app-icon-all.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>
                  Sign in to find and book parking spots
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {/* Error Message */}
                {userStore.authError && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle"
                      size={20}
                      color={theme.colors.palette.angry500}
                    />
                    <Text style={styles.errorText}>
                      {userStore.authError.message}
                    </Text>
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      emailError && styles.inputError,
                      loginState.currentFocused === 'email' &&
                        styles.inputFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={
                        loginState.currentFocused === 'email'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                    />
                    <TextInput
                      ref={emailRef}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.colors.palette.neutral400}
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={loginState.email}
                      onChangeText={loginState.setEmail}
                      onFocus={() => loginState.setFocused('email')}
                      onBlur={() => loginState.setFocused(null)}
                    />
                  </View>
                  {emailError && (
                    <Text style={styles.fieldError}>{emailError}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      passwordError && styles.inputError,
                      loginState.currentFocused === 'password' &&
                        styles.inputFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        loginState.currentFocused === 'password'
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral500
                      }
                    />
                    <TextInput
                      ref={passwordRef}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.palette.neutral400}
                      style={styles.input}
                      secureTextEntry
                      value={loginState.password}
                      onChangeText={loginState.setPassword}
                      onFocus={() => loginState.setFocused('password')}
                      onBlur={() => loginState.setFocused(null)}
                    />
                  </View>
                  {passwordError && (
                    <Text style={styles.fieldError}>{passwordError}</Text>
                  )}
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
                      theme.colors.palette.secondary500,
                      theme.colors.palette.primary500,
                    ]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loginState.isLoading ? (
                      <ActivityIndicator
                        color={theme.colors.palette.neutral100}
                      />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Sign In</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color={theme.colors.palette.neutral100}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account?</Text>
                  <TouchableOpacity
                    onPress={() => {
                      loginState.clearValidationErrors()
                      router.push('/signup')
                    }}
                  >
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By continuing, you agree to our{' '}
                  <Text
                    style={styles.footerLink}
                    onPress={() => router.push('/(legal)/terms')}
                  >
                    Terms
                  </Text>
                  {' and '}
                  <Text
                    style={styles.footerLink}
                    onPress={() => router.push('/(legal)/privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LoadingOverlay visible={loginState.isLoading} message="Signing in..." />
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
    container: {
      flex: 1,
    },
    backgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    safeArea: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingTop: 60,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoContainer: {
      marginBottom: 24,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: theme.colors.transparent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.overlay50,
      overflow: 'hidden',
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.palette.neutral300,
      textAlign: 'center',
      lineHeight: 22,
    },
    formCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 24,
      padding: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.angry100,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.palette.angry500,
      fontWeight: '500',
    },
    inputWrapper: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral200,
      gap: 12,
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.neutral100,
    },
    inputError: {
      borderColor: theme.colors.palette.angry500,
      backgroundColor: theme.colors.palette.angry500,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    fieldError: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
      marginTop: 4,
      marginLeft: 4,
    },
    loginButton: {
      borderRadius: 12,
      marginTop: 8,
      marginBottom: 20,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    signupText: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    signupLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.secondary500,
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.palette.neutral400,
      textAlign: 'center',
      lineHeight: 18,
    },
    footerLink: {
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })

export default LoginScreen
