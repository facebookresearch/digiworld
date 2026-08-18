import React, { useCallback, useEffect, useRef } from 'react'
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
import { Text, LoadingOverlay, useAppTheme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import LinearGradient from 'react-native-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'

const SignupScreen = observer(() => {
  const router = useRouter()
  const { userStore, authStore } = useStores()
  const { signupState } = authStore
  const { trackScreenMount } = useInteractionTracking('Signup', '/signup')
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  // const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const handleSignup = async () => {
    try {
      const success = await authStore.signup()
      if (success) {
        router.replace('/(app)/home')
      }
    } catch (error) {
      console.error('Signup error:', error)
    }
  }

  useEffect(() => {
    authStore.setCurrentScreen('signup')
    return () => {
      authStore.reset()
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

  const nameError = authStore.getValidationError('name')
  const emailError = authStore.getValidationError('email')
  const passwordError = authStore.getValidationError('password')

  const hasNameError = !!nameError
  const hasEmailError = !!emailError
  const hasPasswordError = !!passwordError

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.palette.primary600, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={styles.gradient}
      >
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
              <Image
                source={require('../../../assets/images/app-icon-all.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.welcomeText}>
                {translate('auth.createAccount')}
              </Text>
              <Text style={styles.subtitleText}>
                {translate('auth.signUpToStart')}
              </Text>
            </View>

            <View style={styles.form}>
              {userStore.authError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {userStore.authError.message}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.inputContainer,
                  hasNameError && styles.inputError,
                  signupState.currentFocused === 'name' && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={theme.colors.palette.neutral900}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={translate('auth.namePlaceholder')}
                  ref={nameRef}
                  placeholderTextColor={theme.colors.palette.neutral800}
                  style={styles.input}
                  autoCapitalize="words"
                  value={signupState.name}
                  onChangeText={signupState.setName}
                  onFocus={() => signupState.setFocused('name')}
                  onBlur={() => signupState.setFocused(null)}
                  testID="name-input"
                />
              </View>
              {nameError && <Text style={styles.fieldError}>{nameError}</Text>}

              <View
                style={[
                  styles.inputContainer,
                  hasEmailError && styles.inputError,
                  signupState.currentFocused === 'email' && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={theme.colors.palette.neutral900}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={translate('auth.emailPlaceholder')}
                  ref={emailRef}
                  placeholderTextColor={theme.colors.palette.neutral800}
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

              <View
                style={[
                  styles.inputContainer,
                  hasPasswordError && styles.inputError,
                  signupState.currentFocused === 'password' &&
                    styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={theme.colors.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={translate('auth.passwordPlaceholder')}
                  ref={passwordRef}
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
              {passwordError && (
                <Text style={styles.fieldError}>{passwordError}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  signupState.isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSignup}
                disabled={signupState.isLoading}
              >
                {signupState.isLoading ? (
                  <ActivityIndicator color={theme.colors.palette.neutral100} />
                ) : (
                  <Text style={styles.buttonTextPrimary}>
                    {translate('auth.signUp')}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{translate('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  {translate('auth.hasAccount')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    signupState.clearValidationErrors()
                    router.push('/login')
                  }}
                >
                  <Text style={styles.loginLink}>
                    {' '}
                    {translate('auth.logIn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {translate('auth.bySigningUpYouAgreeTo') + ' '}
                <Text style={styles.linkContainer}>
                  <Text
                    style={[styles.footerLink, styles.clickable]}
                    onPress={() => router.push('/(legal)/terms')}
                  >
                    {translate('auth.termsOfService')}
                  </Text>
                  <Text style={styles.footerText}>
                    {' ' + translate('auth.and') + ' '}
                  </Text>
                  <Text
                    style={[styles.footerLink, styles.clickable]}
                    onPress={() => router.push('/(legal)/privacy')}
                  >
                    {translate('auth.privacyPolicy')}
                  </Text>
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <LoadingOverlay
        visible={signupState.isLoading}
        message="Creating your account..."
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 60,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      marginBottom: 60,
    },
    logo: {
      width: 160,
      height: 160,
      marginBottom: 32,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitleText: {
      fontSize: 16,
      color: theme.colors.textDim,
    },
    form: {
      gap: 16,
      marginBottom: 40,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral300,
      borderColor: theme.colors.palette.neutral400,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
    },
    inputError: {
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      borderRadius: 28,
      marginTop: 24,
    },
    buttonPrimary: {
      backgroundColor: theme.colors.tint,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonTextPrimary: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.palette.neutral400,
    },
    dividerText: {
      color: theme.colors.textDim,
      paddingHorizontal: 16,
      fontSize: 14,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginText: {
      color: theme.colors.textDim,
      fontSize: 16,
    },
    loginLink: {
      color: theme.colors.tint,
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      marginTop: 'auto',
      paddingVertical: 20,
      alignItems: 'center',
    },
    footerText: {
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: '60%',
      flexWrap: 'wrap',
    },
    footerLink: {
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
    clickable: {
      color: theme.colors.tint,
    },
    linkContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    errorContainer: {
      backgroundColor: theme.colors.errorBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
    },
    fieldError: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    inputFocused: {
      borderWidth: 1,
      borderColor: theme.colors.tint,
    },
  })

export default SignupScreen
