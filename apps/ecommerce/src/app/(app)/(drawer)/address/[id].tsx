// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Header, Screen, Text } from '@/components'
import { useAppTheme, Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { AddressType } from '@/models/UserStore'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

interface AddressFormData {
  type: string
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  isDefault: boolean
  deliveryInstructions: string
}

const initialFormData: AddressFormData = {
  type: 'shipping',
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
  country: 'United States',
  deliveryInstructions: '',
  isDefault: false,
}

export default observer(function EditAddressScreen() {
  const router = useRouter()
  const { id, sessionId, timeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [formData, setFormData] = useState<AddressFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [focusedInput, setFocusedInput] = useState('')
  const addressRef = React.useRef<AddressType>(null)
  const toast = useToast()

  // Add refs for inputs
  const firstNameInputRef = useRef<TextInput>(null)
  const lastNameInputRef = useRef<TextInput>(null)
  const addressLine1InputRef = useRef<TextInput>(null)
  const addressLine2InputRef = useRef<TextInput>(null)
  const deliveryInstructionInputRef = useRef<TextInput>(null)
  const cityInputRef = useRef<TextInput>(null)
  const stateInputRef = useRef<TextInput>(null)
  const postalCodeInputRef = useRef<TextInput>(null)
  const countryInputRef = useRef<TextInput>(null)
  const phoneInputRef = useRef<TextInput>(null)
  const { trackScreenMount, trackTextChange, trackClick, trackContentChange } =
    useInteractionTracking('EditAddress', `/(app)/(drawer)/address/${id}`)
  useEffect(() => {
    trackScreenMount({
      addressId: Number(id),
      timestamp: Date.now(),
    })

    // If we have a sessionId, restore from session
    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData?.formData) {
          const savedFormData = sessionData.sessionData.formData
          const restoredFormData = {
            type: savedFormData.type || 'shipping',
            firstName: savedFormData.firstName || '',
            lastName: savedFormData.lastName || '',
            addressLine1: savedFormData.addressLine1 || '',
            addressLine2: savedFormData.addressLine2 || '',
            city: savedFormData.city || '',
            state: savedFormData.state || '',
            phone: savedFormData.phone || '',
            postalCode: savedFormData.postalCode || '',
            country: savedFormData.country || 'United States',
            isDefault: savedFormData.isDefault || false,
            deliveryInstructions: savedFormData.deliveryInstructions || '',
          }
          trackContentChange({ ...restoredFormData })
          // @ts-ignore
          setFormData(restoredFormData)
          setIsLoading(false)
          setIsSessionLoaded(true)
        }

        if (sessionData.sessionData.currentFocusedElement) {
          setFocusedInput(sessionData.sessionData.currentFocusedElement)
        }
      }
      return
    }

    // Otherwise load from runtime store using id
    const address = userStore.getAddressById(Number(id))
    console.log('Got address', JSON.stringify(address, null, 2))
    if (address) {
      const formattedData = {
        type: 'shipping',
        firstName: address.fullName.split(' ')[0] || '',
        lastName: address.fullName.split(' ').slice(1).join(' ') || '',
        addressLine1: address.street.split(' ')[0] || '',
        addressLine2: address.street.split(' ').slice(1).join(' ') || '',
        city: address.city,
        state: address.state,
        postalCode: address.pincode,
        phone: address.phone || '',
        isDefault: address.isDefault,
        country: 'United States', // Default for now
        deliveryInstructions: address.deliveryInstructions,
      }
      // @ts-ignore
      setFormData(formattedData)
      trackContentChange({
        addressLoaded: true,
        ...formattedData,
      })
      setIsLoading(false)
      // @ts-ignore
      addressRef.current = address
    } else {
      trackContentChange({ addressLoaded: false, addressId: Number(id) })
      Alert.alert('Error', 'Address not found')
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/(app)/(drawer)/address')
      }
    }
  }, [id, sessionId, timeStamp])

  // Handle focus restoration
  useEffect(() => {
    if (!isSessionLoaded) return

    const inputRefs = {
      firstName: firstNameInputRef,
      lastName: lastNameInputRef,
      addressLine1: addressLine1InputRef,
      addressLine2: addressLine2InputRef,
      city: cityInputRef,
      state: stateInputRef,
      postalCode: postalCodeInputRef,
      country: countryInputRef,
      deliveryInstructions: deliveryInstructionInputRef,
    }

    const ref = inputRefs[focusedInput as keyof typeof inputRefs]
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.focus()
        const value = formData[focusedInput as keyof AddressFormData] || ''
        // @ts-ignore
        ref.current?.setSelection(value.length, value.length)
      }, 100)
    }
  }, [focusedInput, isSessionLoaded, formData])

  const handleChange = (field: keyof AddressFormData, value: string) => {
    // Only apply logic to 'phone' field
    if (field === 'phone') {
      // Remove all non-numeric characters
      const sanitizedValue = value.replace(/\D/g, '')

      // Limit the input to 10 digits for a US phone number
      if (sanitizedValue.length > 10) {
        return // Don't allow more than 10 digits
      }

      // Format the phone number if we have 10 valid digits
      if (sanitizedValue.length <= 10) {
        // Format as (XXX) XXX-XXXX
        const formattedValue = sanitizedValue.replace(
          /(\d{3})(\d{3})(\d{4})/,
          '($1) $2-$3',
        )

        value = formattedValue
      }

      // Set the value without re-triggering unnecessary updates
      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
      // For other fields, simply set the value without phone-specific logic
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    trackTextChange(field, value)
    setFocusedInput(field)
  }

  const validateForm = () => {
    const required = [
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'state',
      'postalCode',
      'country',
    ]
    const missing = required.filter(
      field => !formData[field as keyof AddressFormData],
    )

    if (missing.length > 0) {
      trackContentChange({ validationFailed: true, missingFields: missing })
      Alert.alert('Error', 'Please fill in all required fields')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    trackClick('submitEditAddress')
    if (!validateForm()) return
    try {
      console.log('Saving address', Number(id))
      setIsSaving(true)
      const addressData = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        street: `${formData.addressLine1} ${formData.addressLine2}`,
        city: formData.city,
        state: formData.state,
        pincode: formData.postalCode,
        phone: formData.phone,
        isDefault: formData.isDefault,
        country: formData.country,
        deliveryInstructions: formData.deliveryInstructions,
      }
      console.log('Updating address', addressData)
      await userStore.updateAddress(Number(id), addressData)
      trackContentChange({ updateSuccess: true, addressId: Number(id) })
      setIsSaving(false)
      toast.show({
        title: 'Address updated successfully',
        preset: 'success',
        placement: 'top',
      })
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/(app)/(drawer)/address')
      }
    } catch (error) {
      trackContentChange({
        updateSuccess: false,
        addressId: Number(id),
        error: String(error),
      })
      Alert.alert('Error', 'Failed to update address')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(app)/(drawer)/address')
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
        />
      </Screen>
    )
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isSaving} message="Saving address..." />

      <Header
        title="Edit Address"
        leftIcon="back"
        onLeftPress={handleBackPress}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={value => handleChange('firstName', value)}
                placeholder="Enter first name"
                placeholderTextColor={theme.colors.textDim}
                ref={firstNameInputRef}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={value => handleChange('lastName', value)}
                placeholder="Enter last name"
                placeholderTextColor={theme.colors.textDim}
                ref={lastNameInputRef}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address Line 1 *</Text>
            <TextInput
              style={styles.input}
              value={formData.addressLine1}
              onChangeText={value => handleChange('addressLine1', value)}
              placeholder="Street address, P.O. box"
              placeholderTextColor={theme.colors.textDim}
              ref={addressLine1InputRef}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={formData.addressLine2}
              onChangeText={value => handleChange('addressLine2', value)}
              placeholder="Apartment, suite, unit, building, floor, etc."
              placeholderTextColor={theme.colors.textDim}
              ref={addressLine2InputRef}
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={value => handleChange('city', value)}
                placeholder="Enter city"
                placeholderTextColor={theme.colors.textDim}
                ref={cityInputRef}
              />
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={value => handleChange('state', value)}
                placeholder="Enter state"
                placeholderTextColor={theme.colors.textDim}
                ref={stateInputRef}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Postal Code *</Text>
              <TextInput
                style={styles.input}
                value={formData.postalCode}
                onChangeText={value => handleChange('postalCode', value)}
                placeholder="Enter postal code"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textDim}
                ref={postalCodeInputRef}
              />
            </View>

            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>Country *</Text>
              <TextInput
                style={styles.input}
                value={formData.country}
                onChangeText={value => handleChange('country', value)}
                placeholder="Enter country"
                placeholderTextColor={theme.colors.textDim}
                ref={countryInputRef}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={value => handleChange('phone', value)}
              placeholder="Enter phone number"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textDim}
              ref={phoneInputRef}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Delivery Instructions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.deliveryInstructions}
              onChangeText={value =>
                handleChange('deliveryInstructions', value)
              }
              placeholder="Leave at the door, ring doorbell, etc."
              placeholderTextColor={theme.colors.textDim}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSaving && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            <Text style={styles.submitButtonText}>
              {isSaving ? 'Saving...' : 'Update Address'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    form: {
      flex: 1,
      padding: spacing.lg,
    },
    fieldGroup: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    field: {
      flex: 1,
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 8,
      padding: spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
      height: 48,
    },
    footer: {
      padding: spacing.md,
      paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
      backgroundColor: theme.colors.background,
    },
    submitButton: {
      backgroundColor: theme.colors.palette.primary500,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    multilineInput: {
      height: 100,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
  })
