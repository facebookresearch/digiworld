import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Text } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { GradientBackground, GradientCard } from '@/components/shared'
import { MaterialIcons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

const { width } = Dimensions.get('window')

type PaymentMethodFormData = {
  type: string
  cardType: string | undefined
  nameOnCard: string | undefined
  cardNumber: string | undefined
  expiryMonth: string | undefined
  expiryYear: string | undefined
  billingAddressId: string | undefined
  createdAt: Date
  updatedAt: Date
}

interface FormErrors {
  nameOnCard?: string
  cardNumber?: string
  expiryMonth?: string
  expiryYear?: string
}

export default observer(function PaymentMethodScreen() {
  const router = useRouter()
  const { id, sessionId, timeStamp } = useLocalSearchParams<{
    id: string
    sessionId?: string
    timeStamp?: string
  }>()
  const { userStore, sessionStore } = useStores()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [focusedInput, setFocusedInput] = useState('')
  const toast = useToast()
  const previewAnimation = useRef(new Animated.Value(0)).current
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  // Add refs for inputs
  const nameOnCardRef = useRef<TextInput>(null)
  const cardNumberRef = useRef<TextInput>(null)
  const expiryMonthRef = useRef<TextInput>(null)
  const expiryYearRef = useRef<TextInput>(null)

  const [formData, setFormData] = useState<PaymentMethodFormData>({
    type: 'card',
    cardType: 'visa',
    nameOnCard: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    billingAddressId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const { trackScreenMount, trackTextChange, trackClick, trackContentChange } =
    useInteractionTracking('PaymentMethod', `/(app)/(drawer)/payment/${id}`)

  useEffect(() => {
    trackScreenMount({
      paymentMethodId: id === 'new' ? undefined : id,
      timestamp: Date.now(),
    })

    // Animate preview card on mount
    Animated.spring(previewAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start()

    // If we have a sessionId, restore from session
    if (sessionId) {
      const session = sessionStore.getSession(sessionId)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData.formData) {
          const savedFormData = sessionData.sessionData.formData
          trackContentChange({ ...savedFormData })
          setFormData(savedFormData)
        }

        if (sessionData.sessionData.currentFocusedElement) {
          setFocusedInput(sessionData.sessionData.currentFocusedElement)
          autoFocusInput(sessionData.sessionData.currentFocusedElement)
        }

        setIsSessionLoaded(true)
      }
      return
    }

    // Otherwise load from runtime store if editing
    if (id && id !== 'new') {
      const method = userStore.getPaymentMethodById(Number(id))
      if (method) {
        const loadedData = {
          type: method.type,
          cardType: method.cardType || 'visa',
          nameOnCard: method.nameOnCard || '',
          cardNumber: method.cardNumber || '',
          expiryMonth: method.expiryMonth || '',
          expiryYear: method.expiryYear || '',
          billingAddressId:
            method.billingAddressId === null
              ? undefined
              : String(method.billingAddressId),
          createdAt: method.createdAt || new Date(),
          updatedAt: method.updatedAt || new Date(),
        }
        setFormData(loadedData)
        trackContentChange({
          paymentMethodLoaded: true,
          methodData: loadedData,
        })
      } else {
        trackContentChange({ paymentMethodLoaded: false, methodId: id })
        Alert.alert('Error', 'Payment method not found')
        if (router.canGoBack()) {
          router.back()
        } else {
          router.replace('/(app)/(drawer)/payment')
        }
      }
    }
  }, [id, sessionId, timeStamp])

  // Handle focus restoration
  useEffect(() => {
    if (!isSessionLoaded) return

    const inputRefs = {
      nameOnCard: nameOnCardRef,
      cardNumber: cardNumberRef,
      expiryMonth: expiryMonthRef,
      expiryYear: expiryYearRef,
    }

    const ref = inputRefs[focusedInput as keyof typeof inputRefs]
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.focus()
        const value =
          formData[focusedInput as keyof PaymentMethodFormData]?.toString() ||
          ''
        ref.current?.setSelection(value.length, value.length)
      }, 100)
    }
  }, [focusedInput, isSessionLoaded, formData])

  const handleChange = (field: keyof PaymentMethodFormData, value: string) => {
    trackTextChange(field, value)
    setFormData(prev => ({ ...prev, [field]: value }))
    setFocusedInput(field)
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }))
    }
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}
    let isValid = true

    if (!formData.nameOnCard?.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
      isValid = false
    }

    if (!formData.cardNumber || formData.cardNumber.length < 16) {
      newErrors.cardNumber = 'Valid card number is required'
      isValid = false
    }

    if (
      !formData.expiryMonth ||
      parseInt(formData.expiryMonth) < 1 ||
      parseInt(formData.expiryMonth) > 12
    ) {
      newErrors.expiryMonth = 'Valid month (1-12) required'
      isValid = false
    }

    const currentYear = new Date().getFullYear() % 100
    if (!formData.expiryYear || parseInt(formData.expiryYear) < currentYear) {
      newErrors.expiryYear = 'Valid future year required'
      isValid = false
    }

    setErrors(newErrors)
    if (!isValid) {
      trackContentChange({ validationFailed: true, errors: newErrors })
    }
    return isValid
  }

  const autoFocusInput = (element: string) => {
    if (!element || !focusedInput.length) {
      return
    }
    if (element === 'nameOnCard') {
      nameOnCardRef.current?.focus()
    } else if (element === 'cardNumber') {
      cardNumberRef.current?.focus()
    } else if (element === 'expiryMonth') {
      expiryMonthRef.current?.focus()
    } else if (element === 'expiryYear') {
      expiryYearRef.current?.focus()
    }
  }

  const handleSubmit = async () => {
    trackClick('submitPaymentMethod')
    if (!validateForm()) return

    try {
      setLoading(true)

      // Check if we're at the maximum limit for new payment methods
      if (id === 'new' && userStore.paymentMethods.length >= 2) {
        trackContentChange({ maxLimitReached: true })
        toast.show({
          title: 'Maximum 2 payment methods allowed',
          preset: 'error',
          placement: 'top',
          duration: 3000,
        })
        return
      }

      const submitData = {
        ...formData,
        billingAddressId: formData.billingAddressId
          ? Number(formData.billingAddressId)
          : undefined,
      }

      if (id === 'new') {
        await userStore.addPaymentMethod(submitData)
        trackContentChange({ addSuccess: true })
        toast.show({
          title: 'Payment method added successfully',
          preset: 'success',
          placement: 'top',
          duration: 3000,
        })
      } else {
        await userStore.updatePaymentMethod(Number(id), submitData)
        trackContentChange({ updateSuccess: true, paymentMethodId: id })
        toast.show({
          title: 'Payment method updated successfully',
          preset: 'success',
          placement: 'top',
          duration: 3000,
        })
      }

      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/(app)/(drawer)/payment')
      }
    } catch (error) {
      console.log('Failed to save payment method:', error)
      trackContentChange({
        [id === 'new' ? 'addFailed' : 'updateFailed']: true,
        error: String(error),
        paymentMethodId: id === 'new' ? undefined : id,
      })
      toast.show({
        title: 'Failed to save payment method',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCurrentFocusedElement = (element: string) => {
    setFocusedInput(element)
    trackClick(element)
  }

  const getCardGradient = (cardNumber: string) => {
    const firstDigit = cardNumber?.charAt(0)
    switch (firstDigit) {
      case '4':
        return ['#1A1F71', '#0F4C75'] // Visa
      case '5':
        return ['#EB001B', '#FF5F00'] // Mastercard
      case '3':
        return ['#006FCF', '#0099CC'] // Amex
      default:
        return ['#2196F3', '#1976D2'] // Default blue to match list
    }
  }

  const getCardType = (cardNumber: string) => {
    const firstDigit = cardNumber?.charAt(0)
    switch (firstDigit) {
      case '4':
        return 'Visa'
      case '5':
        return 'Mastercard'
      case '3':
        return 'American Express'
      default:
        return 'Credit Card'
    }
  }

  const formatCardNumber = (number: string) => {
    if (!number) return '•••• •••• •••• ••••'
    const cleaned = number.replace(/\s/g, '')
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim()
    const padded = formatted.padEnd(19, '•')
    return padded
  }

  // Calculate form completion percentage
  const getFormCompletionPercentage = () => {
    const fields = ['nameOnCard', 'cardNumber', 'expiryMonth', 'expiryYear']
    const filledFields = fields.filter(field =>
      formData[field as keyof PaymentMethodFormData]?.toString().trim(),
    ).length
    return Math.round((filledFields / fields.length) * 100)
  }

  return (
    <GradientBackground variant="background">
      <LoadingOverlay
        visible={loading}
        message={
          id === 'new'
            ? 'Adding payment method...'
            : 'Updating payment method...'
        }
      />

      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.headerContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {id === 'new' ? 'Add Payment Method' : 'Edit Payment Method'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {getFormCompletionPercentage()}% complete
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={styles.saveButton}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <MaterialIcons
                  name="hourglass-empty"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              ) : (
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Live Card Preview */}
          <Animated.View
            style={[
              styles.cardPreviewSection,
              {
                opacity: previewAnimation,
                transform: [
                  {
                    translateY: previewAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={getCardGradient(formData.cardNumber || '')}
              style={styles.previewCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Card Header */}
              <View style={styles.previewCardHeader}>
                <View style={styles.previewChip}>
                  <MaterialIcons
                    name="memory"
                    size={20}
                    color={`${theme.colors.palette.neutral100}CC`}
                  />
                </View>
                <Text style={styles.previewCardType}>
                  {getCardType(formData.cardNumber || '')}
                </Text>
              </View>

              {/* Card Number */}
              <Text style={styles.previewCardNumber}>
                {formatCardNumber(formData.cardNumber || '')}
              </Text>

              {/* Card Footer */}
              <View style={styles.previewCardFooter}>
                <View>
                  <Text style={styles.previewLabel}>CARD HOLDER</Text>
                  <Text style={styles.previewName}>
                    {formData.nameOnCard?.toUpperCase() || 'YOUR NAME'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.previewLabel}>EXPIRES</Text>
                  <Text style={styles.previewExpiry}>
                    {formData.expiryMonth?.padStart(2, '0') || 'MM'}/
                    {formData.expiryYear || 'YY'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Form Card */}
          <GradientCard variant="card" style={styles.formCard}>
            {/* Card Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="credit-card"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.sectionTitle}>Card Information</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Name on Card *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.nameOnCard || ''}
                  onChangeText={(text: string) =>
                    handleChange('nameOnCard', text)
                  }
                  placeholder="Enter cardholder name"
                  placeholderTextColor={theme.colors.textDim}
                  autoCapitalize="words"
                  ref={nameOnCardRef}
                  onFocus={() => handleCurrentFocusedElement('nameOnCard')}
                />
                {errors.nameOnCard && (
                  <Text style={styles.errorText}>{errors.nameOnCard}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Card Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cardNumber || ''}
                  onChangeText={(text: string) =>
                    handleChange('cardNumber', text)
                  }
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="numeric"
                  maxLength={16}
                  ref={cardNumberRef}
                  onFocus={() => handleCurrentFocusedElement('cardNumber')}
                />
                {errors.cardNumber && (
                  <Text style={styles.errorText}>{errors.cardNumber}</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Expiry Month *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.expiryMonth || ''}
                    onChangeText={(text: string) =>
                      handleChange('expiryMonth', text)
                    }
                    placeholder="MM"
                    placeholderTextColor={theme.colors.textDim}
                    keyboardType="numeric"
                    maxLength={2}
                    ref={expiryMonthRef}
                    onFocus={() => handleCurrentFocusedElement('expiryMonth')}
                  />
                  {errors.expiryMonth && (
                    <Text style={styles.errorText}>{errors.expiryMonth}</Text>
                  )}
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Expiry Year *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.expiryYear || ''}
                    onChangeText={(text: string) =>
                      handleChange('expiryYear', text)
                    }
                    placeholder="YY"
                    placeholderTextColor={theme.colors.textDim}
                    keyboardType="numeric"
                    maxLength={2}
                    ref={expiryYearRef}
                    onFocus={() => handleCurrentFocusedElement('expiryYear')}
                  />
                  {errors.expiryYear && (
                    <Text style={styles.errorText}>{errors.expiryYear}</Text>
                  )}
                </View>
              </View>
            </View>
          </GradientCard>

          {/* Security Notice */}
          <GradientCard variant="card" style={styles.securityCard}>
            <View style={styles.securityContent}>
              <MaterialIcons
                name="security"
                size={24}
                color={theme.colors.palette.success500}
              />
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Your data is secure</Text>
                <Text style={styles.securitySubtitle}>
                  All payment information is encrypted and stored securely
                </Text>
              </View>
            </View>
          </GradientCard>

          {/* Completion Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getFormCompletionPercentage()}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Form {getFormCompletionPercentage()}% Complete
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
    },

    // Header Styles
    headerContainer: {
      paddingTop: 50,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    backButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: spacing.md,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral200,
      fontWeight: '500',
      marginTop: 2,
    },
    saveButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    saveButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },

    // Card Preview
    cardPreviewSection: {
      marginBottom: spacing.xl,
    },
    previewCard: {
      width: width - 32,
      height: 200,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    previewCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    previewChip: {
      width: 35,
      height: 25,
      backgroundColor: `${theme.colors.palette.neutral100}33`,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCardType: {
      fontSize: 14,
      color: `${theme.colors.palette.neutral100}E6`,
      fontWeight: '600',
    },
    previewCardNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: `${theme.colors.palette.neutral100}F2`,
      letterSpacing: 2,
      fontFamily: 'monospace',
      marginBottom: 20,
    },
    previewCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewLabel: {
      fontSize: 9,
      color: `${theme.colors.palette.neutral100}B3`,
      fontWeight: '600',
      marginBottom: 4,
      letterSpacing: 1,
    },
    previewName: {
      fontSize: 12,
      color: `${theme.colors.palette.neutral100}F2`,
      fontWeight: '600',
    },
    previewExpiry: {
      fontSize: 12,
      color: `${theme.colors.palette.neutral100}F2`,
      fontWeight: '600',
      fontFamily: 'monospace',
    },

    // Form
    formCard: {
      padding: spacing.lg,
      margin: 0,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    fieldGroup: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    field: {
      flex: 1,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: spacing.xs,
      letterSpacing: 0.3,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: theme.colors.text,
      height: 52,
      fontWeight: '500',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
      marginTop: spacing.xs,
    },

    // Security Card
    securityCard: {
      padding: spacing.md,
      margin: 0,
      marginBottom: spacing.md,
    },
    securityContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    securityText: {
      flex: 1,
    },
    securityTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.success600,
      marginBottom: 4,
    },
    securitySubtitle: {
      fontSize: 14,
      color: theme.colors.palette.success500,
      lineHeight: 20,
    },

    // Progress
    progressContainer: {
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 10,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
  })
