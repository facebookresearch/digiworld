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
  Animated,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { AddressType } from '@/models/UserStore'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import {
  GradientBackground,
  GradientHeader,
  GradientCard,
} from '@/components/shared'
import { MaterialIcons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'

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
  const [formData, setFormData] = useState<AddressFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [focusedInput, setFocusedInput] = useState('')
  const addressRef = React.useRef<AddressType>(null)
  const toast = useToast()
  const previewAnimation = useRef(new Animated.Value(0)).current
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

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

  const cleanFormData = (data: any) => {
    if (!data) return data

    const formFields: Partial<AddressFormData> = {
      type: data.type || data.formData?.type,
      firstName: data.firstName || data.formData?.firstName,
      lastName: data.lastName || data.formData?.lastName,
      addressLine1: data.addressLine1 || data.formData?.addressLine1,
      addressLine2: data.addressLine2 || data.formData?.addressLine2,
      city: data.city || data.formData?.city,
      state: data.state || data.formData?.state,
      postalCode: data.postalCode || data.formData?.postalCode,
      country: data.country || data.formData?.country,
      phone: data.phone || data.formData?.phone,
      deliveryInstructions:
        data.deliveryInstructions || data.formData?.deliveryInstructions,
    }

    Object.keys(formFields).forEach(key => {
      const k = key as keyof AddressFormData
      if (formFields[k] === undefined || formFields[k] === null) {
        delete formFields[k]
      }
    })

    const { ...otherData } = data

    return {
      ...otherData,
      ...formFields,
    }
  }

  useEffect(() => {
    trackScreenMount({
      addressId: Number(id),
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
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData?.formData) {
          const savedFormData = cleanFormData(sessionData.sessionData.formData)
          trackContentChange({ ...savedFormData })
          setFormData(savedFormData)
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
        deliveryInstructions: address.deliveryInstructions || '',
      }
      setFormData(formattedData)
      trackContentChange({
        addressLoaded: true,
        ...formattedData,
      })
      setIsLoading(false)
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
        ref.current?.setSelection(value.length, value.length)
      }, 100)
    }
  }, [focusedInput, isSessionLoaded, formData])

  const handleChange = (field: keyof AddressFormData, value: string) => {
    if (field === 'phone') {
      const sanitizedValue = value.replace(/\D/g, '')

      if (sanitizedValue.length > 10) {
        return
      }

      if (sanitizedValue.length <= 10) {
        const formattedValue = sanitizedValue.replace(
          /(\d{3})(\d{3})(\d{4})/,
          '($1) $2-$3',
        )
        value = formattedValue
      }

      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
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
      'phone',
    ]
    const missing = required.filter(
      field => !formData[field as keyof AddressFormData],
    )

    if (missing.length > 0) {
      trackContentChange(
        cleanFormData({
          validationFailed: true,
          missingFields: missing,
        }),
      )
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

      toast.show({
        title: 'Address updated successfully',
        preset: 'success',
        placement: 'top',
        duration: 3000,
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
      toast.show({
        title: 'Failed to update address',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate form completion percentage
  const getFormCompletionPercentage = () => {
    const fields = [
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'state',
      'postalCode',
      'country',
      'phone',
    ]
    const filledFields = fields.filter(field =>
      formData[field as keyof AddressFormData]?.trim(),
    ).length
    return Math.round((filledFields / fields.length) * 100)
  }

  // Check if address has meaningful content for preview
  const hasPreviewContent = () => {
    return (
      formData.firstName ||
      formData.lastName ||
      formData.addressLine1 ||
      formData.city ||
      formData.state ||
      formData.postalCode
    )
  }

  if (isLoading) {
    return (
      <GradientBackground variant="background">
        <GradientHeader title="Edit Address" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
        </View>
      </GradientBackground>
    )
  }

  return (
    <GradientBackground variant="background">
      <LoadingOverlay visible={isSaving} message="Saving address..." />

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
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Edit Address</Text>
            <Text style={styles.headerSubtitle}>
              {getFormCompletionPercentage()}% complete
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSaving}
            style={styles.saveButton}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isSaving ? (
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
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Address Preview Card */}
          {hasPreviewContent() && (
            <Animated.View
              style={[
                styles.previewContainer,
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
                colors={[
                  theme.colors.palette.primary500,
                  theme.colors.palette.primary600,
                ]}
                style={styles.previewCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.previewHeader}>
                  <MaterialIcons
                    name="preview"
                    size={20}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.previewTitle}>Address Preview</Text>
                </View>

                <View style={styles.previewContent}>
                  {(formData.firstName || formData.lastName) && (
                    <View style={styles.previewRow}>
                      <MaterialIcons
                        name="person"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={styles.previewIcon}
                      />
                      <Text style={styles.previewText}>
                        {formData.firstName} {formData.lastName}
                      </Text>
                    </View>
                  )}

                  {formData.addressLine1 && (
                    <View style={styles.previewRow}>
                      <MaterialIcons
                        name="home"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={styles.previewIcon}
                      />
                      <Text style={styles.previewText}>
                        {formData.addressLine1}
                        {formData.addressLine2
                          ? `, ${formData.addressLine2}`
                          : ''}
                      </Text>
                    </View>
                  )}

                  {(formData.city || formData.state || formData.postalCode) && (
                    <View style={styles.previewRow}>
                      <MaterialIcons
                        name="location-city"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={styles.previewIcon}
                      />
                      <Text style={styles.previewText}>
                        {[formData.city, formData.state, formData.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  )}

                  {formData.country && (
                    <View style={styles.previewRow}>
                      <MaterialIcons
                        name="public"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={styles.previewIcon}
                      />
                      <Text style={styles.previewText}>{formData.country}</Text>
                    </View>
                  )}

                  {formData.phone && (
                    <View style={styles.previewRow}>
                      <MaterialIcons
                        name="phone"
                        size={16}
                        color={theme.colors.palette.neutral100}
                        style={styles.previewIcon}
                      />
                      <Text style={styles.previewText}>{formData.phone}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Form Card */}
          <GradientCard variant="card" style={styles.formCard}>
            {/* Personal Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

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
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={value => handleChange('phone', value)}
                  placeholder="(123) 456-7890"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textDim}
                  ref={phoneInputRef}
                />
              </View>
            </View>

            {/* Address Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="home"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.sectionTitle}>Address Details</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Street Address *</Text>
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
                <Text style={styles.label}>Apartment, Suite, etc.</Text>
                <TextInput
                  style={styles.input}
                  value={formData.addressLine2}
                  onChangeText={value => handleChange('addressLine2', value)}
                  placeholder="Apt, suite, unit, building, floor"
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
                    placeholder="City"
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
                    placeholder="ST"
                    placeholderTextColor={theme.colors.textDim}
                    ref={stateInputRef}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>ZIP Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.postalCode}
                    onChangeText={value => handleChange('postalCode', value)}
                    placeholder="12345"
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
                    placeholder="Country"
                    placeholderTextColor={theme.colors.textDim}
                    ref={countryInputRef}
                  />
                </View>
              </View>
            </View>

            {/* Delivery Instructions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="local-shipping"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.sectionTitle}>Delivery Instructions</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>

              <View style={styles.field}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={formData.deliveryInstructions}
                  onChangeText={value =>
                    handleChange('deliveryInstructions', value)
                  }
                  placeholder="E.g., Leave at door, ring doorbell, gate code..."
                  placeholderTextColor={theme.colors.textDim}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  ref={deliveryInstructionInputRef}
                />
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    form: {
      flex: 1,
      padding: spacing.md,
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
    previewContainer: {
      marginBottom: spacing.md,
    },
    previewCard: {
      borderRadius: 20,
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    previewTitle: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },
    previewContent: {
      gap: spacing.sm,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    previewIcon: {
      marginTop: 2,
    },
    previewText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
    },
    formCard: {
      padding: spacing.lg,
      margin: 0,
    },
    section: {
      marginBottom: spacing.xl,
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
    optionalBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.palette.neutral500,
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
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
    multilineInput: {
      height: 100,
      paddingTop: spacing.md,
      textAlignVertical: 'top',
    },
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
