// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Header, TextField, Button } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
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

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(app)/(drawer)/payment')
    }
  }

  const handleCurrentFocusedElement = (element: string) => {
    setFocusedInput(element)
    trackClick(element)
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay
        visible={loading}
        message={id === 'new' ? 'Adding...' : 'Updating...'}
      />
      <Header
        title={id === 'new' ? 'Add Payment Method' : 'Edit Payment Method'}
        leftIcon="back"
        onLeftPress={handleBackPress}
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <TextField
          label="Name on Card"
          value={formData.nameOnCard || ''}
          onChangeText={(text: string) => handleChange('nameOnCard', text)}
          containerStyle={styles.input}
          style={styles.textInput}
          LabelTextProps={{ style: { fontSize: 14, color: theme.colors.text } }}
          status={errors.nameOnCard ? 'error' : undefined}
          helper={errors.nameOnCard}
          autoCapitalize="words"
          ref={nameOnCardRef}
          onFocus={() => handleCurrentFocusedElement('nameOnCard')}
        />
        <TextField
          label="Card Number"
          value={formData.cardNumber || ''}
          onChangeText={(text: string) => handleChange('cardNumber', text)}
          containerStyle={styles.input}
          style={styles.textInput}
          keyboardType="numeric"
          LabelTextProps={{ style: { fontSize: 14, color: theme.colors.text } }}
          maxLength={16}
          status={errors.cardNumber ? 'error' : undefined}
          helper={errors.cardNumber}
          ref={cardNumberRef}
          onFocus={() => handleCurrentFocusedElement('cardNumber')}
        />
        <View style={styles.row}>
          <TextField
            label="Expiry Month (MM)"
            value={formData.expiryMonth || ''}
            onChangeText={(text: string) => handleChange('expiryMonth', text)}
            containerStyle={[styles.input, styles.halfInput]}
            style={styles.textInput}
            keyboardType="numeric"
            maxLength={2}
            LabelTextProps={{
              style: { fontSize: 14, color: theme.colors.text },
            }}
            status={errors.expiryMonth ? 'error' : undefined}
            helper={errors.expiryMonth}
            ref={expiryMonthRef}
            onFocus={() => handleCurrentFocusedElement('expiryMonth')}
          />
          <TextField
            label="Expiry Year (YY)"
            value={formData.expiryYear || ''}
            onChangeText={(text: string) => handleChange('expiryYear', text)}
            containerStyle={[styles.input, styles.halfInput]}
            style={styles.textInput}
            LabelTextProps={{
              style: { fontSize: 14, color: theme.colors.text },
            }}
            keyboardType="numeric"
            maxLength={2}
            status={errors.expiryYear ? 'error' : undefined}
            helper={errors.expiryYear}
            ref={expiryYearRef}
            onFocus={() => handleCurrentFocusedElement('expiryYear')}
          />
        </View>
        <Button
          text={id === 'new' ? 'Add Payment Method' : 'Update Payment Method'}
          onPress={handleSubmit}
          style={styles.button}
          textStyle={styles.buttonText}
          disabled={loading}
        >
          {loading && (
            <ActivityIndicator color={theme.colors.palette.neutral100} />
          )}
        </Button>
      </ScrollView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      display: 'flex',
      position: 'relative',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
    },
    input: {
      marginBottom: spacing.lg,
    },
    textInput: {
      backgroundColor: theme.colors.palette.neutral100,
      minHeight: 48,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 5,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    halfInput: {
      flex: 1,
      maxWidth: '45%',
    },
    button: {
      marginTop: spacing.xl,
      backgroundColor: theme.colors.palette.primary500,
    },
    buttonText: {
      color: theme.colors.palette.neutral100,
    },
  })
