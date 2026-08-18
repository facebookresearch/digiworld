import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  LoadingOverlay,
  Text,
  useAppTheme,
  type Theme,
} from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStores } from '@/models'

const { height: screenHeight } = Dimensions.get('window')

const LoginScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { userStore, authStore, flightSearchStore } = useStores()
  const { loginState } = authStore
  const { sessionId } = useLocalSearchParams()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Login', '/login')
  const [showPassword, setShowPassword] = useState(false)

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
    try {
      const success = await authStore.login()
      if (success && userStore.user) {
        // Update flightSearchStore with logged-in user data
        flightSearchStore.setUser({
          id: userStore.user.id,
          name: userStore.user.username || 'User',
          email: userStore.user.email,
          avatar: userStore.user.avatar || '',
        })
        // Reset form to clear any previous user's search data
        flightSearchStore.resetForm()
        router.replace('/')
      }
    } catch (error) {
      // Handle login error
    }
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Background Image */}
        <View style={styles.backgroundContainer}>
          <Image
            source={require('../../../assets/images/placeholder.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.backgroundOverlay} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../../assets/images/andojo-flight-icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoTitle}>
                <Text style={styles.andojoText}>Andojo</Text>
                <Text style={styles.flyText}> Fly</Text>
              </Text>
            </View>

            {/* Main Form Section */}
            <View style={styles.formSection}>
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
                  <Text style={styles.inputLabel}>Email</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      hasEmailError && styles.inputError,
                      loginState.currentFocused === 'email' &&
                        styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      ref={emailRef}
                      placeholder=""
                      placeholderTextColor={theme.colors.palette.neutral500}
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
                  {emailError && (
                    <Text style={styles.fieldError}>{emailError}</Text>
                  )}

                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      hasPasswordError && styles.inputError,
                      loginState.currentFocused === 'password' &&
                        styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      ref={passwordRef}
                      placeholder=""
                      placeholderTextColor={theme.colors.palette.neutral500}
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      value={loginState.password}
                      onChangeText={loginState.setPassword}
                      onFocus={() => loginState.setFocused('password')}
                      onBlur={() => loginState.setFocused(null)}
                      editable={true}
                      testID="password-input"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
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
                    styles.signinButton,
                    loginState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loginState.isLoading}
                  activeOpacity={0.8}
                >
                  {loginState.isLoading ? (
                    <ActivityIndicator
                      color={theme.colors.palette.neutral100}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.signinButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Sign Up Link */}
                <TouchableOpacity
                  style={styles.signupLinkButton}
                  onPress={() => router.push('/signup')}
                >
                  <Text style={styles.signupLinkText}>Sign Up</Text>
                </TouchableOpacity>

                {/* Terms and Conditions */}
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    By continuing, you agree to our{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => router.push('/(legal)/terms')}
                    >
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => router.push('/(legal)/privacy')}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LoadingOverlay visible={loginState.isLoading} message="Logging in..." />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    safeArea: {
      flex: 1,
    },
    backgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: screenHeight * 0.6,
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
    },
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay20,
    },
    keyboardView: {
      flex: 1,
      marginTop: '7%',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    logoSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      paddingTop: 50,
    },
    logoImage: {
      width: 160,
      height: 160,
    },
    logoTitle: {
      textAlign: 'center',
      fontSize: 48,
      textShadowColor: theme.colors.palette.overlay50,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    andojoText: {
      color: theme.colors.palette.neutral100,
      fontSize: 48,
      textShadowColor: theme.colors.palette.overlay50,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    flyText: {
      color: theme.colors.palette.neutral100,
      fontSize: 48,
      textShadowColor: theme.colors.palette.overlay50,
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    formSection: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    formContainer: {
      paddingHorizontal: 32,
      paddingTop: 20,
    },
    formTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
      marginBottom: 40,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral800,
    },
    eyeIcon: {
      padding: 4,
    },
    inputError: {
      borderColor: theme.colors.palette.angry500,
      borderWidth: 2,
    },
    inputFocused: {
      borderColor: theme.colors.tint,
      borderWidth: 2,
    },
    fieldError: {
      color: theme.colors.palette.angry500,
      fontSize: 14,
      marginTop: -16,
      marginBottom: 16,
    },
    ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 30,
    },
    signinButton: {
      backgroundColor: theme.colors.tint,
      borderRadius: 12,
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.tint,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    signinButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    socialContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 20,
    },
    socialIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral800,
      justifyContent: 'center',
      alignItems: 'center',
    },
    socialIconPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
    },
    signupLinkButton: {
      alignItems: 'center',
      marginTop: 10,
    },
    signupLinkText: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    termsContainer: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    termsText: {
      color: theme.colors.palette.neutral600,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 16,
      flexWrap: 'wrap',
    },
    termsLink: {
      color: theme.colors.tint,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.angry100,
      borderColor: theme.colors.palette.angry500,
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      marginBottom: 20,
    },
    errorText: {
      color: theme.colors.palette.angry500,
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
  })

export default LoginScreen
