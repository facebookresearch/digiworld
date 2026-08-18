// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Screen, Text, Input, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { observer } from 'mobx-react-lite'
import { UserAddress } from '@/models/types'
import { WebView } from 'react-native-webview'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const LABELS = [
  { label: 'Home', value: 'Home' },
  { label: 'Office', value: 'Office' },
  { label: 'Other', value: 'Other' },
]

const AddAddressScreen = observer(() => {
  const { userStore, sessionStore } = useStores()
  const params = useLocalSearchParams()
  const [isEditMode, setIsEditMode] = useState(!!params.address)
  const existingAddress = params.address
    ? (JSON.parse(params.address as string) as UserAddress)
    : null
  const webViewRef = useRef<WebView>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('AddAddress', '/screens/address/add-address')
  const { theme } = useTheme()
  const colors = theme.colors

  const [formData, setFormData] = useState<Partial<UserAddress>>({
    addressLine1: existingAddress?.addressLine1 || '',
    addressLine2: existingAddress?.addressLine2 || '',
    city: existingAddress?.city || '',
    state: existingAddress?.state || '',
    postalCode: existingAddress?.postalCode || '',
    country: existingAddress?.country || '',
    label: existingAddress?.label || 'Home',
    isDefault: existingAddress?.isDefault || 0,
    latitude: existingAddress?.latitude || 0,
    longitude: existingAddress?.longitude || 0,
  })

  const [saving, setSaving] = useState(false)

  // Load session data if exists
  useEffect(() => {
    if (params.sessionTimeStamp) {
      const session = sessionStore.getSession(params.sessionId as string)
      if (session?.data?.sessionData) {
        const sessionFormData = session.data.sessionData.formData as any
        if (sessionFormData) {
          if (sessionFormData.formData) {
            setFormData(sessionFormData.formData)
          }
          if (typeof sessionFormData.isEditMode === 'boolean') {
            setIsEditMode(sessionFormData.isEditMode)
          }
          if (sessionFormData.saving) {
            setSaving(sessionFormData.saving)
          }
        }
      }
      setIsSessionLoaded(true)
    }
  }, [params.sessionId, isSessionLoaded, sessionStore])

  // Track screen mount with initial form data
  useEffect(() => {
    trackScreenMount({
      isEditMode,
      existingAddressId: existingAddress?.id,
      formData,
      timestamp: Date.now(),
    })
  }, [])

  const updateFormField = useCallback(
    (field: keyof UserAddress, value: string | number) => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value }
        trackContentChange({
          action: 'update_field',
          field,
          value,
          formData: updated,
          timestamp: Date.now(),
          sessionData: {
            formData: updated,
            isEditMode,
            saving,
          },
        })
        return updated
      })
      trackTextChange(field, String(value))
    },
    [isEditMode, saving],
  )

  const handleLocationSelected = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data)
        if (data.type === 'locationSelected') {
          trackClick('selectLocation')
          trackContentChange({
            action: 'location_selected',
            latitude: data.lat,
            longitude: data.lng,
            timestamp: Date.now(),
            sessionData: {
              formData: {
                ...formData,
                latitude: data.lat,
                longitude: data.lng,
              },
              isEditMode,
              saving,
            },
          })
          updateFormField('latitude', data.lat)
          updateFormField('longitude', data.lng)
        }
      } catch (error) {
        console.error('Error handling location selection:', error)
        trackContentChange({
          action: 'location_selection_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          sessionData: {
            formData,
            isEditMode,
            saving,
          },
        })
      }
    },
    [updateFormField, formData, isEditMode, saving],
  )

  const isFormValid =
    formData.addressLine1?.trim() &&
    formData.city?.trim() &&
    formData.state?.trim() &&
    formData.postalCode?.trim() &&
    formData.country?.trim() &&
    formData.label

  const handleSave = useCallback(async () => {
    if (!isFormValid) return
    setSaving(true)
    trackClick('saveAddress')
    trackContentChange({
      action: 'save_started',
      timestamp: Date.now(),
      sessionData: {
        formData,
        isEditMode,
        saving: true,
      },
    })

    try {
      // Validate coordinates
      if (!formData.latitude || !formData.longitude) {
        trackContentChange({
          action: 'save_error',
          error: 'Location not selected',
          timestamp: Date.now(),
          sessionData: {
            formData,
            isEditMode,
            saving: false,
          },
        })
        console.error('Location not selected')
        return
      }

      const addressData = {
        label: formData.label!,
        addressLine1: formData.addressLine1!,
        addressLine2: formData.addressLine2 || '',
        city: formData.city!,
        state: formData.state!,
        postalCode: formData.postalCode!,
        country: formData.country!,
        isDefault: formData.isDefault || 0,
        latitude: formData.latitude,
        longitude: formData.longitude,
      }

      if (isEditMode && existingAddress) {
        await userStore.updateAddress(existingAddress.id, addressData)
        trackContentChange({
          action: 'address_updated',
          addressId: existingAddress.id,
          addressData,
          timestamp: Date.now(),
          sessionData: {
            formData,
            isEditMode,
            saving: false,
          },
        })
        router.replace('/screens/address/address-list')
      } else {
        const newAddress = await userStore.createAddress(addressData)
        trackContentChange({
          action: 'address_created',
          addressId: newAddress?.id,
          addressData,
          timestamp: Date.now(),
          sessionData: {
            formData,
            isEditMode,
            saving: false,
          },
        })
        // After creating first address, navigate to address list
        if (!userStore.addresses.length) {
          router.replace('/(tabs)/home')
        } else {
          router.replace('/screens/address/address-list')
        }
      }
    } catch (error) {
      console.error('Failed to save address:', error)
      trackContentChange({
        action: 'save_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        sessionData: {
          formData,
          isEditMode,
          saving: false,
        },
      })
    } finally {
      setSaving(false)
    }
  }, [formData, isEditMode, existingAddress, userStore, isFormValid])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    mapContainer: {
      height: '35%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    map: {
      flex: 1,
      backgroundColor: colors.palette.neutral300,
    },
    backBtn: {
      position: 'absolute',
      top: 36,
      left: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.palette.primary600,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      elevation: 2,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    formContainer: {
      flex: 1,
      position: 'relative',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 50,
    },
    form: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    inputContainer: {
      marginBottom: 8,
    },
    rowContainer: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    labelTitle: {
      marginBottom: 16,
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    inputLabel: {
      color: colors.text,
      marginBottom: 4,
      fontSize: 15,
      fontWeight: '600',
    },
    labelRow: {
      flexDirection: 'row',
      marginTop: 8,
    },
    labelPill: {
      backgroundColor: colors.palette.neutral100,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 8,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.palette.neutral300,
    },
    labelPillActive: {
      backgroundColor: colors.palette.primary600,
      borderColor: colors.palette.primary600,
    },
    labelPillText: {
      color: colors.textDim,
      fontSize: 15,
    },
    labelPillTextActive: {
      color: colors.palette.neutral100,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.palette.primary600,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: colors.palette.primary600,
    },
    checkboxLabel: {
      fontSize: 15,
      color: colors.text,
    },
    saveBtnContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    saveBtn: {
      backgroundColor: colors.palette.primary600,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    saveBtnText: {
      color: colors.palette.neutral100,
      fontWeight: 'bold',
      fontSize: 16,
      letterSpacing: 1,
    },
    saveBtnDisabled: {
      backgroundColor: colors.palette.neutral300,
    },
    flexInputContainer: {
      flex: 1,
      marginRight: 8,
    },
    flexOnlyContainer: {
      flex: 1,
    },
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <Screen style={styles.container}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'file:///android_asset/web/address-map.html' }}
            style={styles.map}
            onMessage={handleLocationSelected}
            injectedJavaScript={`
              initMap({
                lat: ${isEditMode ? formData.latitude : 40.725227},
                lng: ${isEditMode ? formData.longitude : -73.993033}
              });
              true;
            `}
          />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={router.back}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.palette.neutral100}
            />
          </TouchableOpacity>
        </View>

        {/* Scrollable Form Section */}
        <View style={styles.formContainer}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollViewContent}
          >
            <View style={styles.form}>
              <Text weight="bold" size="medium" style={styles.labelTitle}>
                {isEditMode ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}
              </Text>

              {/* Address Line 1 */}
              <View style={styles.inputContainer}>
                <Text size="small" style={styles.inputLabel}>
                  ADDRESS LINE 1 *
                </Text>
                <Input
                  placeholder="Enter address line 1"
                  value={formData.addressLine1}
                  onChangeText={value => updateFormField('addressLine1', value)}
                  LeftAccessory={() => (
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.palette.primary600}
                    />
                  )}
                  variant="bordered"
                />
              </View>

              {/* Address Line 2 */}
              <View style={styles.inputContainer}>
                <Text size="small" style={styles.inputLabel}>
                  ADDRESS LINE 2
                </Text>
                <Input
                  placeholder="Enter address line 2 (Optional)"
                  value={formData.addressLine2}
                  onChangeText={value => updateFormField('addressLine2', value)}
                  variant="bordered"
                />
              </View>

              {/* City and State Row */}
              <View style={styles.rowContainer}>
                <View
                  style={[styles.inputContainer, styles.flexInputContainer]}
                >
                  <Text size="small" style={styles.inputLabel}>
                    CITY *
                  </Text>
                  <Input
                    placeholder="Enter city"
                    value={formData.city}
                    onChangeText={value => updateFormField('city', value)}
                    variant="bordered"
                  />
                </View>
                <View
                  style={[styles.inputContainer, styles.flexInputContainer]}
                >
                  <Text size="small" style={styles.inputLabel}>
                    STATE *
                  </Text>
                  <Input
                    placeholder="Enter state"
                    value={formData.state}
                    onChangeText={value => updateFormField('state', value)}
                    variant="bordered"
                  />
                </View>
              </View>

              {/* Postcode and Country Row */}
              <View style={styles.rowContainer}>
                <View
                  style={[styles.inputContainer, styles.flexInputContainer]}
                >
                  <Text size="small" style={styles.inputLabel}>
                    POSTCODE *
                  </Text>
                  <Input
                    placeholder="Enter postcode"
                    value={formData.postalCode}
                    onChangeText={value => updateFormField('postalCode', value)}
                    variant="bordered"
                    maxLength={6}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputContainer, styles.flexOnlyContainer]}>
                  <Text size="small" style={styles.inputLabel}>
                    COUNTRY *
                  </Text>
                  <Input
                    placeholder="Enter country"
                    value={formData.country}
                    onChangeText={value => updateFormField('country', value)}
                    variant="bordered"
                  />
                </View>
              </View>

              {/* Label Selection */}
              <View style={styles.inputContainer}>
                <Text size="small" style={styles.inputLabel}>
                  LABEL AS *
                </Text>
                <View style={styles.labelRow}>
                  {LABELS.map(l => (
                    <TouchableOpacity
                      key={l.value}
                      style={[
                        styles.labelPill,
                        formData.label === l.value && styles.labelPillActive,
                      ]}
                      onPress={() => updateFormField('label', l.value)}
                    >
                      <Text
                        weight="bold"
                        style={StyleSheet.flatten([
                          styles.labelPillText,
                          formData.label === l.value
                            ? styles.labelPillTextActive
                            : undefined,
                        ])}
                      >
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Default Address Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  updateFormField('isDefault', formData.isDefault === 1 ? 0 : 1)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    formData.isDefault === 1 && styles.checkboxActive,
                  ]}
                >
                  {formData.isDefault === 1 && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.palette.neutral100}
                    />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Save Button Container with Background */}
          <View style={styles.saveBtnContainer}>
            <TouchableOpacity
              style={[styles.saveBtn, !isFormValid && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving || !isFormValid}
            >
              <Text weight="bold" size="large" style={styles.saveBtnText}>
                {saving
                  ? isEditMode
                    ? 'UPDATING...'
                    : 'SAVING...'
                  : isEditMode
                    ? 'UPDATE ADDRESS'
                    : 'SAVE ADDRESS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
})

export default AddAddressScreen
