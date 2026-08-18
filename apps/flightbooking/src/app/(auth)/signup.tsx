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

import { SuccessDialog } from '@/components'
import { useStores } from '@/models'

const { height: screenHeight } = Dimensions.get('window')

const SignupScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { signupState } = authStore
  const { trackScreenMount } = useInteractionTracking('Signup', '/signup')
  const { sessionId } = useLocalSearchParams()
  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignup = async () => {
    try {
      const success = await authStore.signup()
      if (success) {
        setShowSuccessDialog(true)
        // Navigate after dialog closes
        setTimeout(() => {
          router.replace('/(auth)/login')
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
    return () => {
      signupState.reset()
      authStore.reset()
      userStore.clearErrors()
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
                  <Text style={styles.inputLabel}>Name</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      hasNameError && styles.inputError,
                      signupState.currentFocused === 'name' &&
                        styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      ref={nameRef}
                      placeholder=""
                      placeholderTextColor={theme.colors.palette.neutral500}
                      style={styles.input}
                      autoCapitalize="words"
                      value={signupState.name}
                      onChangeText={signupState.setName}
                      onFocus={() => signupState.setFocused('name')}
                      onBlur={() => signupState.setFocused(null)}
                      testID="name-input"
                    />
                  </View>
                  {nameError && (
                    <Text style={styles.fieldError}>{nameError}</Text>
                  )}

                  <Text style={styles.inputLabel}>Email</Text>

                  <View
                    style={[
                      styles.inputContainer,
                      hasEmailError && styles.inputError,
                      signupState.currentFocused === 'email' &&
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
                      value={signupState.email}
                      onChangeText={signupState.setEmail}
                      onFocus={() => signupState.setFocused('email')}
                      onBlur={() => signupState.setFocused(null)}
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
                      signupState.currentFocused === 'password' &&
                        styles.inputFocused,
                    ]}
                  >
                    <TextInput
                      ref={passwordRef}
                      placeholder=""
                      placeholderTextColor={theme.colors.palette.neutral500}
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      value={signupState.password}
                      onChangeText={signupState.setPassword}
                      onFocus={() => signupState.setFocused('password')}
                      onBlur={() => signupState.setFocused(null)}
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

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    signupState.isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={signupState.isLoading}
                  activeOpacity={0.8}
                >
                  {signupState.isLoading ? (
                    <ActivityIndicator
                      color={theme.colors.palette.neutral100}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.signupButtonText}>Sign Up</Text>
                  )}
                </TouchableOpacity>

                {/* Sign In Link */}
                <TouchableOpacity
                  style={styles.signinLinkButton}
                  onPress={() => {
                    signupState.clearValidationErrors()
                    router.push('/login')
                  }}
                >
                  <Text style={styles.signinLinkText}>Sign In</Text>
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
      height: screenHeight * 0.8,
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
      marginTop: '0%',
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
      paddingTop: 40,
    },
    logoImage: {
      width: 160,
      height: 160,
    },
    logoTitle: {
      marginTop: 16,
      textAlign: 'center',
      fontSize: 32,
      fontWeight: '800',
      fontFamily: 'System',
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
    signupButton: {
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
    signupButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    signinLinkButton: {
      alignItems: 'center',
      marginTop: 4,
    },
    signinLinkText: {
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

export default SignupScreen
