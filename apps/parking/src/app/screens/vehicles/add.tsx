import { useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme, type Theme, Text } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
import { FancyAlert, SuccessDialog } from '@/components'
import { debounce } from 'lodash'

const AddVehicleScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const plateNumberRef = useRef<TextInput>(null)
  const nicknameRef = useRef<TextInput>(null)
  const makeRef = useRef<TextInput>(null)
  const modelRef = useRef<TextInput>(null)
  const colorRef = useRef<TextInput>(null)
  const yearRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking(
    'AddVehicle',
    '/screens/vehicles/add',
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'AddVehicle',
        route: '/screens/vehicles/add',
      })
    }, []),
  )

  const vehicleTypes = parkingStore.vehicleTypes
  const form = parkingStore.vehicleForm
  const errors = parkingStore.vehicleFormErrors

  const selectedVehicleType = vehicleTypes.find(
    (vt: any) => vt.id === form.vehicleTypeId,
  )

  // Focus restoration on session restore
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = parkingStore.vehicleForm.currentFocused
      if (focusedElement === 'plateNumber') {
        setTimeout(() => {
          plateNumberRef.current?.focus()
          plateNumberRef.current?.setSelection(
            form.plateNumber.length,
            form.plateNumber.length,
          )
        }, 300)
      } else if (focusedElement === 'nickname') {
        setTimeout(() => {
          nicknameRef.current?.focus()
          nicknameRef.current?.setSelection(
            form.nickname.length,
            form.nickname.length,
          )
        }, 300)
      } else if (focusedElement === 'make') {
        setTimeout(() => {
          makeRef.current?.focus()
          makeRef.current?.setSelection(form.make.length, form.make.length)
        }, 300)
      } else if (focusedElement === 'model') {
        setTimeout(() => {
          modelRef.current?.focus()
          modelRef.current?.setSelection(form.model.length, form.model.length)
        }, 300)
      } else if (focusedElement === 'color') {
        setTimeout(() => {
          colorRef.current?.focus()
          colorRef.current?.setSelection(form.color.length, form.color.length)
        }, 300)
      } else if (focusedElement === 'year') {
        setTimeout(() => {
          yearRef.current?.focus()
          yearRef.current?.setSelection(form.year.length, form.year.length)
        }, 300)
      }
    }
  }, [sessionTimeStamp])

  // Debounced navigation to prevent multiple rapid taps
  const handleBack = useCallback(
    debounce(() => {
      parkingStore.resetVehicleForm()
      parkingStore.hideDialog() // Clear any dialog state
      router.back()
    }, 300),
    [router, parkingStore],
  )

  const validateForm = () => {
    parkingStore.clearVehicleFormErrors()
    let isValid = true

    // Validate plate number (mandatory)
    if (!form.plateNumber.trim()) {
      parkingStore.setVehicleFormError(
        'plateNumber',
        'License plate number is required',
      )
      isValid = false
    }

    // Validate vehicle type (mandatory)
    if (!form.vehicleTypeId) {
      parkingStore.setVehicleFormError(
        'vehicleTypeId',
        'Vehicle type is required',
      )
      isValid = false
    }

    // Validate make (mandatory)
    if (!form.make?.trim()) {
      parkingStore.setVehicleFormError('make', 'Make is required')
      isValid = false
    }

    // Validate model (mandatory)
    if (!form.model?.trim()) {
      parkingStore.setVehicleFormError('model', 'Model is required')
      isValid = false
    }

    // Validate color (mandatory)
    if (!form.color?.trim()) {
      parkingStore.setVehicleFormError('color', 'Color is required')
      isValid = false
    }

    // Validate year (optional, but if provided must be valid)
    if (form.year?.trim()) {
      const yearValue = parseInt(form.year.trim())
      const currentYear = new Date().getFullYear()
      const minYear = 1900 // Reasonable minimum year for vehicles

      if (isNaN(yearValue)) {
        parkingStore.setVehicleFormError('year', 'Year must be a valid number')
        isValid = false
      } else if (yearValue < minYear) {
        parkingStore.setVehicleFormError(
          'year',
          `Year must be ${minYear} or later`,
        )
        isValid = false
      } else if (yearValue > currentYear) {
        parkingStore.setVehicleFormError(
          'year',
          `Year cannot be greater than ${currentYear}`,
        )
        isValid = false
      }
    }

    return isValid
  }

  const handleSave = debounce(async () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    // Check for duplicate plate number
    const plateNumberUpper = form.plateNumber.trim().toUpperCase()
    const existingVehicle = parkingStore.vehicles.find(
      (v: any) => v.plateNumber.toUpperCase() === plateNumberUpper,
    )

    if (existingVehicle) {
      parkingStore.showAlert({
        title: 'Plate Number Already Exists',
        message: `The plate number "${plateNumberUpper}" is already in use. Please enter a different plate number.`,
        preset: 'warning',
      })
      return
    }

    try {
      await parkingStore.addVehicle({
        vehicleTypeId: form.vehicleTypeId!,
        plateNumber: form.plateNumber.trim().toUpperCase(),
        nickname: form.nickname.trim() || undefined,
        make: form.make.trim()!,
        model: form.model.trim()!,
        color: form.color.trim()!,
        year: form.year ? parseInt(form.year) : undefined,
        isDefault: parkingStore.vehicles.length === 0 ? 1 : 0,
      })

      parkingStore.showDialog({
        isSuccess: true,
        message: 'Vehicle Added!',
        subMessage: 'Your vehicle has been added successfully',
      })

      setTimeout(() => {
        parkingStore.resetVehicleForm()
        router.back()
      }, 2000)
    } catch (error: any) {
      console.error('Failed to add vehicle:', error)

      // Check if it's a duplicate plate number error
      const errorMessage = error?.message || error?.toString() || ''
      const isDuplicatePlate =
        errorMessage.includes('UNIQUE constraint failed') ||
        errorMessage.includes('plateNumber') ||
        errorMessage.includes('duplicate')

      if (isDuplicatePlate) {
        parkingStore.showAlert({
          title: 'License Plate Already in Use',
          message: `The license plate number "${form.plateNumber.trim().toUpperCase()}" is already registered. Please use a different plate number.`,
          preset: 'warning',
        })
      } else {
        parkingStore.showAlert({
          title: 'Failed to Add Vehicle',
          message: 'Unable to add vehicle. Please try again.',
          preset: 'error',
        })
      }
    }
  }, 300)

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral100,
        ]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral900}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle} preset="subheading">
              Add Vehicle
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* License Plate Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                License Plate Number <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.plateNumber && styles.inputError,
                  form.currentFocused === 'plateNumber' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={plateNumberRef}
                  style={styles.input}
                  value={form.plateNumber}
                  onChangeText={text =>
                    parkingStore.setVehicleFormField('plateNumber', text)
                  }
                  onFocus={() =>
                    parkingStore.setVehicleFormFocused('plateNumber')
                  }
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="ABC1234"
                  placeholderTextColor={theme.colors.palette.neutral500}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>
              {errors.plateNumber && (
                <Text style={styles.errorText}>{errors.plateNumber}</Text>
              )}
            </View>

            {/* Vehicle Type Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Vehicle Type <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  errors.vehicleTypeId && styles.inputError,
                ]}
                onPress={() => parkingStore.toggleVehicleTypeDropdown()}
              >
                <View style={styles.dropdownContent}>
                  {selectedVehicleType ? (
                    <Text style={styles.dropdownTitle}>
                      {selectedVehicleType.name}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>
                      Select vehicle type
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={
                    form.showVehicleTypeDropdown ? 'chevron-up' : 'chevron-down'
                  }
                  size={20}
                  color={theme.colors.palette.neutral600}
                />
              </TouchableOpacity>
              {errors.vehicleTypeId && (
                <Text style={styles.errorText}>{errors.vehicleTypeId}</Text>
              )}

              {form.showVehicleTypeDropdown && (
                <ScrollView
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {vehicleTypes.map((type: any) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.dropdownItem,
                        form.vehicleTypeId === type.id &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        parkingStore.setVehicleFormField(
                          'vehicleTypeId',
                          type.id,
                        )
                        parkingStore.toggleVehicleTypeDropdown()
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color:
                            form.vehicleTypeId === type.id
                              ? theme.colors.palette.primary500
                              : theme.colors.palette.neutral900,
                          fontWeight:
                            form.vehicleTypeId === type.id ? '600' : '400',
                        }}
                      >
                        {type.name}
                      </Text>
                      {form.vehicleTypeId === type.id && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={theme.colors.palette.primary500}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Nickname */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nickname (Optional)</Text>
              <View
                style={[
                  styles.inputContainer,
                  form.currentFocused === 'nickname' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={nicknameRef}
                  style={styles.input}
                  value={form.nickname}
                  onChangeText={text =>
                    parkingStore.setVehicleFormField('nickname', text)
                  }
                  onFocus={() => parkingStore.setVehicleFormFocused('nickname')}
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="My Car"
                  placeholderTextColor={theme.colors.palette.neutral500}
                />
              </View>
            </View>

            {/* Make */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Make <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.make && styles.inputError,
                  form.currentFocused === 'make' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={makeRef}
                  style={styles.input}
                  value={form.make}
                  onChangeText={text =>
                    parkingStore.setVehicleFormField('make', text)
                  }
                  onFocus={() => parkingStore.setVehicleFormFocused('make')}
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="Toyota"
                  placeholderTextColor={theme.colors.palette.neutral500}
                  autoCapitalize="words"
                />
              </View>
              {errors.make && (
                <Text style={styles.errorText}>{errors.make}</Text>
              )}
            </View>

            {/* Model */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Model <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.model && styles.inputError,
                  form.currentFocused === 'model' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={modelRef}
                  style={styles.input}
                  value={form.model}
                  onChangeText={text =>
                    parkingStore.setVehicleFormField('model', text)
                  }
                  onFocus={() => parkingStore.setVehicleFormFocused('model')}
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="Camry"
                  placeholderTextColor={theme.colors.palette.neutral500}
                  autoCapitalize="words"
                />
              </View>
              {errors.model && (
                <Text style={styles.errorText}>{errors.model}</Text>
              )}
            </View>

            {/* Color */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Color <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.color && styles.inputError,
                  form.currentFocused === 'color' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={colorRef}
                  style={styles.input}
                  value={form.color}
                  onChangeText={text =>
                    parkingStore.setVehicleFormField('color', text)
                  }
                  onFocus={() => parkingStore.setVehicleFormFocused('color')}
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="Blue"
                  placeholderTextColor={theme.colors.palette.neutral500}
                  autoCapitalize="words"
                />
              </View>
              {errors.color && (
                <Text style={styles.errorText}>{errors.color}</Text>
              )}
            </View>

            {/* Year */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year (Optional)</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.year && styles.inputError,
                  form.currentFocused === 'year' && styles.inputFocused,
                ]}
              >
                <TextInput
                  ref={yearRef}
                  style={styles.input}
                  value={form.year || ''}
                  onChangeText={text => {
                    // Remove non-numeric characters
                    const numericText = text.replace(/\D/g, '')
                    parkingStore.setVehicleFormField('year', numericText)
                  }}
                  onFocus={() => parkingStore.setVehicleFormFocused('year')}
                  onBlur={() => parkingStore.setVehicleFormFocused(null)}
                  placeholder="2020"
                  placeholderTextColor={theme.colors.palette.neutral500}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              {errors.year && (
                <Text style={styles.errorText}>{errors.year}</Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Alert Dialog */}
      <FancyAlert
        visible={parkingStore.alertState.visible}
        title={parkingStore.alertState.title}
        message={parkingStore.alertState.message}
        preset={
          parkingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => parkingStore.hideAlert()}
        onConfirm={parkingStore.getAlertOnConfirm() || undefined}
      />

      {/* Success Dialog */}
      <SuccessDialog
        visible={parkingStore.dialogState.visible}
        onClose={() => parkingStore.hideDialog()}
        isSuccess={parkingStore.dialogState.isSuccess}
        message={parkingStore.dialogState.message}
        subMessage={parkingStore.dialogState.subMessage}
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
    keyboardAvoid: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: theme.colors.palette.neutral900,
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 32,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    required: {
      color: theme.colors.palette.angry500,
    },
    inputContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
      overflow: 'hidden',
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.neutral100,
    },
    input: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    inputError: {
      borderColor: theme.colors.palette.angry500,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
      marginTop: 4,
      marginLeft: 4,
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
    },
    dropdownContent: {
      flex: 1,
    },
    dropdownTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    dropdownPlaceholder: {
      fontSize: 16,
      color: theme.colors.palette.neutral500,
    },
    dropdownList: {
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
    },
    dropdownItemSelected: {
      backgroundColor: theme.colors.palette.primary100,
    },
    dropdownItemText: {
      fontSize: 16,
      color: theme.colors.palette.neutral900,
    },
    dropdownItemTextSelected: {
      color: theme.colors.palette.primary500,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default AddVehicleScreen
