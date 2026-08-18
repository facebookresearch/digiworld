import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useAppTheme, Text, useToast, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

// Define the edit types and their configurations for banking app
interface EditConfig {
  title: string
  icon: string
  placeholder: string
  keyboardType: 'default' | 'email-address' | 'numeric'
  autoCapitalize: 'none' | 'words'
  secureTextEntry?: boolean
  showConfirmField?: boolean
  showCurrentPassword?: boolean
  validation: (
    value: string,
    confirmValue?: string,
    currentPassword?: string,
  ) => string | null
  updateKey: string
}

const EDIT_CONFIGS: Record<string, EditConfig> = {
  name: {
    title: 'Edit Name',
    icon: 'person-outline',
    placeholder: 'Enter your name',
    keyboardType: 'default',
    autoCapitalize: 'words',
    validation: (value: string) => {
      if (!value.trim()) return 'Name cannot be empty'
      if (value.trim().length < 2) return 'Name must be at least 2 characters'
      return null
    },
    updateKey: 'username',
  },
  password: {
    title: 'Change Password',
    icon: 'lock-closed-outline',
    placeholder: 'Enter new password',
    keyboardType: 'default',
    autoCapitalize: 'none',
    secureTextEntry: true,
    showConfirmField: true,
    showCurrentPassword: true,
    validation: (
      value: string,
      confirmValue?: string,
      currentPassword?: string,
    ) => {
      if (currentPassword !== undefined && !currentPassword.trim()) {
        return 'Current password is required'
      }
      if (!value.trim()) return 'New password cannot be empty'
      if (value.length < 6) return 'Password must be at least 6 characters'
      if (confirmValue !== undefined && value !== confirmValue) {
        return 'Passwords do not match'
      }
      return null
    },
    updateKey: 'password',
  },
  changePin: {
    title: 'Change PIN',
    icon: 'key-outline',
    placeholder: 'Enter your new PIN',
    keyboardType: 'numeric',
    autoCapitalize: 'none',
    secureTextEntry: true,
    showConfirmField: true,
    showCurrentPassword: true,
    validation: (
      value: string,
      confirmValue?: string,
      currentPassword?: string,
    ) => {
      if (
        !currentPassword ||
        currentPassword.length !== 4 ||
        !/^\d{4}$/.test(currentPassword)
      ) {
        return 'Current PIN must be exactly 4 digits'
      }
      if (!value.trim()) return 'New PIN cannot be empty'
      if (value.length !== 4 || !/^\d{4}$/.test(value)) {
        return 'PIN must be exactly 4 digits'
      }
      if (confirmValue !== undefined && value !== confirmValue) {
        return 'PINs do not match'
      }
      if (currentPassword === value) {
        return 'New PIN must be different from current PIN'
      }
      return null
    },
    updateKey: 'pin',
  },
}

export default observer(function EditProfileScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore } = useStores()
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const toast = useToast()
  const { trackScreenMount } = useInteractionTracking(
    'profileEdit',
    `/profile/${id}`,
  )

  // Refs for input fields
  const currentPasswordRef = useRef<TextInput>(null)
  const editValueRef = useRef<TextInput>(null)
  const confirmValueRef = useRef<TextInput>(null)
  // OTP PIN field refs
  const currentPinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ]
  const newPinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ]
  const confirmPinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ]

  // Get the configuration for this edit type
  const config = EDIT_CONFIGS[id as keyof typeof EDIT_CONFIGS]

  // Initialize values based on edit type
  useEffect(() => {
    if (!config) return

    const initializeValues = () => {
      if (
        !userStore.profileEditUI.editValue.length &&
        !userStore.profileEditUI.currentPassword.length &&
        !userStore.profileEditUI.confirmValue.length
      ) {
        userStore.initializeEditValues(id as string)
      }
    }

    initializeValues()
  }, [id, userStore.user])

  // Handle autofocus logic
  useEffect(() => {
    if (!config) return

    const focusTimeout = setTimeout(() => {
      const { lastFocusedField, currentPassword, editValue } =
        userStore.profileEditUI
      // Deeplink focus for PIN fields
      if (lastFocusedField && id === 'changePin') {
        if (lastFocusedField.startsWith('currentPin')) {
          const idx = parseInt(lastFocusedField.replace('currentPin', ''))
          if (!isNaN(idx) && currentPinRefs[idx]) {
            currentPinRefs[idx].current?.focus()
          }
          return
        }
        if (lastFocusedField.startsWith('newPin')) {
          const idx = parseInt(lastFocusedField.replace('newPin', ''))
          if (!isNaN(idx) && newPinRefs[idx]) newPinRefs[idx].current?.focus()
          return
        }
        if (lastFocusedField.startsWith('confirmPin')) {
          const idx = parseInt(lastFocusedField.replace('confirmPin', ''))
          if (!isNaN(idx) && confirmPinRefs[idx]) {
            confirmPinRefs[idx].current?.focus()
          }
          return
        }
      }
      // Fallback to legacy fields
      if (lastFocusedField) {
        switch (lastFocusedField) {
          case 'currentPassword':
            setTimeout(() => {
              currentPasswordRef.current?.focus()
            }, 500)
            break
          case 'editValue':
            setTimeout(() => {
              editValueRef.current?.focus()
            }, 500)
            break
          case 'confirmValue':
            setTimeout(() => {
              confirmValueRef.current?.focus()
            }, 500)
            break
        }
        return
      }
      // Default focus logic for first render
      if (id === 'name') editValueRef.current?.focus()
      if (id === 'password') {
        if (!currentPassword.trim()) currentPasswordRef.current?.focus()
        else if (!editValue.trim()) editValueRef.current?.focus()
        else confirmValueRef.current?.focus()
      }
    }, 100)
    return () => clearTimeout(focusTimeout)
  }, [id, config, userStore.profileEditUI.lastFocusedField])

  useEffect(() => {
    return () => {
      userStore.resetProfileEditUI()
    }
  }, [])

  // Reset UI state when screen goes out of focus
  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        timeStamp: Date.now(),
        screen: 'profileEdit',
        route: `/profile/${id}`,
      })
    }, [id, trackScreenMount]),
  )

  // Handle validation and save
  const handleSave = debounce(async () => {
    if (!config) return

    // Validate input
    const validationParams = {
      editValue: userStore.profileEditUI.editValue,
      confirmValue: config.showConfirmField
        ? userStore.profileEditUI.confirmValue
        : undefined,
      currentPassword: config.showCurrentPassword
        ? userStore.profileEditUI.currentPassword
        : undefined,
    }

    const validationError = config.validation(
      validationParams.editValue,
      validationParams.confirmValue,
      validationParams.currentPassword,
    )
    if (validationError) {
      console.log('Validation error:', validationError)
      toast.show({
        title: validationError,
        preset: 'error',
        // duration is in milliseconds for the shared Toast implementation
        duration: 3000,
        placement: 'top',
      })
      return
    }

    try {
      // Handle user profile updates
      const updateData = {
        [config.updateKey]: userStore.profileEditUI.editValue,
      }

      // Add current password for password changes
      if (config.showCurrentPassword) {
        updateData.currentPassword = userStore.profileEditUI.currentPassword
      }

      console.log('Update data:', updateData)

      // Call the update method
      console.log('Calling updateProfile with:', updateData)
      await userStore.updateProfile(updateData)
      console.log('updateProfile completed successfully')

      toast.show({
        title: `${config.title.replace('Edit ', '').replace('Change ', '')} updated successfully!`,
        preset: 'success',
        // show for 5 seconds
        duration: 3000,
        placement: 'top',
      })

      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error('Error in handleSave:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'

      if (
        errorMessage.includes('Current password is incorrect') ||
        errorMessage.includes('Current PIN is incorrect')
      ) {
        toast.show({
          title: errorMessage.includes('PIN')
            ? 'Current PIN is incorrect'
            : 'Current password is incorrect',
          preset: 'error',
          duration: 3000,
          placement: 'top',
        })
      } else {
        toast.show({
          title: `Failed to update ${config.title.toLowerCase()}. Please try again.`,
          preset: 'error',
          duration: 3000,
          placement: 'top',
        })
      }
    }
  }, 300)

  // Simple header component
  const SimpleHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-back-outline"
          size={24}
          color={theme.colors.text as string}
        />
      </TouchableOpacity>
      <Text
        style={
          [styles.headerTitle, { color: theme.colors.text as string }] as any
        }
      >
        {config.title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  )

  // If invalid edit type, show error
  if (!config) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <SimpleHeader />
          <View style={styles.errorContainer}>
            <Text
              style={
                [
                  styles.errorText,
                  { color: theme.colors.palette.angry500 as string },
                ] as any
              }
            >
              Invalid edit type
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <SimpleHeader />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.formSection,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            {/* Conditional rendering based on edit type */}
            {id === 'changePin' ? (
              <>
                {/* Current PIN OTP */}
                <View style={styles.inputGroup}>
                  <Text
                    style={
                      [styles.inputLabel, { color: theme.colors.text }] as any
                    }
                  >
                    Current PIN
                  </Text>
                  <View style={styles.otpContainer}>
                    {[0, 1, 2, 3].map(idx => (
                      <TextInput
                        key={idx}
                        ref={currentPinRefs[idx]}
                        style={[
                          styles.otpInput,
                          {
                            backgroundColor: theme.colors.palette.neutral200,
                            color: theme.colors.text,
                            borderColor: theme.colors.palette.neutral500,
                          },
                        ]}
                        value={
                          userStore.profileEditUI.currentPassword[idx] || ''
                        }
                        onChangeText={val => {
                          const pinArr =
                            userStore.profileEditUI.currentPassword.split('')
                          pinArr[idx] = val.replace(/[^0-9]/g, '')
                          userStore.setCurrentPassword(
                            pinArr.join('').slice(0, 4),
                          )
                          userStore.setLastFocusedField(`currentPin${idx}`)
                          if (val && idx < 3) {
                            currentPinRefs[idx + 1].current?.focus()
                          }
                        }}
                        maxLength={1}
                        keyboardType="number-pad"
                        secureTextEntry
                        returnKeyType="next"
                        onFocus={() =>
                          userStore.setLastFocusedField(`currentPin${idx}`)
                        }
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace') {
                            const currentPin =
                              userStore.profileEditUI.currentPassword
                            if (currentPin[idx]) {
                              // If current field has a value, clear it and move to previous field
                              const pinArr = currentPin.split('')
                              pinArr[idx] = ''
                              userStore.setCurrentPassword(pinArr.join(''))
                              if (idx > 0) {
                                currentPinRefs[idx - 1].current?.focus()
                                userStore.setLastFocusedField(
                                  `currentPin${idx - 1}`,
                                )
                              }
                            } else if (idx > 0) {
                              // If current field is empty, move to previous field and clear it
                              const pinArr = currentPin.split('')
                              pinArr[idx - 1] = ''
                              userStore.setCurrentPassword(pinArr.join(''))
                              currentPinRefs[idx - 1].current?.focus()
                              userStore.setLastFocusedField(
                                `currentPin${idx - 1}`,
                              )
                            }
                          }
                        }}
                      />
                    ))}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={
                        [styles.inputLabel, { color: theme.colors.text }] as any
                      }
                    >
                      New PIN
                    </Text>
                    <View style={styles.otpContainer}>
                      {[0, 1, 2, 3].map(idx => (
                        <TextInput
                          key={idx}
                          ref={newPinRefs[idx]}
                          style={[
                            styles.otpInput,
                            {
                              backgroundColor: theme.colors.palette.neutral200,
                              color: theme.colors.text,
                              borderColor: theme.colors.palette.neutral500,
                            },
                          ]}
                          value={userStore.profileEditUI.editValue[idx] || ''}
                          onChangeText={val => {
                            const pinArr =
                              userStore.profileEditUI.editValue.split('')
                            pinArr[idx] = val.replace(/[^0-9]/g, '')
                            userStore.setEditValue(pinArr.join('').slice(0, 4))
                            userStore.setLastFocusedField(`newPin${idx}`)
                            if (val && idx < 3) {
                              newPinRefs[idx + 1].current?.focus()
                            }
                          }}
                          maxLength={1}
                          keyboardType="number-pad"
                          secureTextEntry
                          returnKeyType={idx === 3 ? 'done' : 'next'}
                          onFocus={() =>
                            userStore.setLastFocusedField(`newPin${idx}`)
                          }
                          onKeyPress={({ nativeEvent }) => {
                            if (nativeEvent.key === 'Backspace') {
                              const newPin = userStore.profileEditUI.editValue
                              if (newPin[idx]) {
                                // If current field has a value, clear it and move to previous field
                                const pinArr = newPin.split('')
                                pinArr[idx] = ''
                                userStore.setEditValue(pinArr.join(''))
                                if (idx > 0) {
                                  newPinRefs[idx - 1].current?.focus()
                                  userStore.setLastFocusedField(
                                    `newPin${idx - 1}`,
                                  )
                                }
                              } else if (idx > 0) {
                                // If current field is empty, move to previous field and clear it
                                const pinArr = newPin.split('')
                                pinArr[idx - 1] = ''
                                userStore.setEditValue(pinArr.join(''))
                                newPinRefs[idx - 1].current?.focus()
                                userStore.setLastFocusedField(
                                  `newPin${idx - 1}`,
                                )
                              }
                            }
                          }}
                          onSubmitEditing={idx === 3 ? handleSave : undefined}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Confirm New PIN OTP */}
                  <View style={styles.inputGroup}>
                    <Text
                      style={
                        [styles.inputLabel, { color: theme.colors.text }] as any
                      }
                    >
                      Confirm New PIN
                    </Text>
                    <View style={styles.otpContainer}>
                      {[0, 1, 2, 3].map(idx => (
                        <TextInput
                          key={idx}
                          ref={confirmPinRefs[idx]}
                          style={[
                            styles.otpInput,
                            {
                              backgroundColor: theme.colors.palette.neutral200,
                              color: theme.colors.text,
                              borderColor: theme.colors.palette.neutral500,
                            },
                          ]}
                          value={
                            userStore.profileEditUI.confirmValue[idx] || ''
                          }
                          onChangeText={val => {
                            const pinArr =
                              userStore.profileEditUI.confirmValue.split('')
                            pinArr[idx] = val.replace(/[^0-9]/g, '')
                            userStore.setConfirmValue(
                              pinArr.join('').slice(0, 4),
                            )
                            if (val && idx < 3) {
                              confirmPinRefs[idx + 1].current?.focus()
                            }
                          }}
                          maxLength={1}
                          keyboardType="number-pad"
                          secureTextEntry
                          returnKeyType={idx === 3 ? 'done' : 'next'}
                          onSubmitEditing={idx === 3 ? handleSave : undefined}
                          onKeyPress={({ nativeEvent }) => {
                            if (nativeEvent.key === 'Backspace') {
                              const confirmPin =
                                userStore.profileEditUI.confirmValue
                              if (confirmPin[idx]) {
                                // If current field has a value, clear it and move to previous field
                                const pinArr = confirmPin.split('')
                                pinArr[idx] = ''
                                userStore.setConfirmValue(pinArr.join(''))
                                if (idx > 0) {
                                  confirmPinRefs[idx - 1].current?.focus()
                                }
                              } else if (idx > 0) {
                                // If current field is empty, move to previous field and clear it
                                const pinArr = confirmPin.split('')
                                pinArr[idx - 1] = ''
                                userStore.setConfirmValue(pinArr.join(''))
                                confirmPinRefs[idx - 1].current?.focus()
                              }
                            }
                          }}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Current Password Field (only for password change) */}
                {config.showCurrentPassword && (
                  <View style={styles.inputGroup}>
                    <Text
                      style={
                        [styles.inputLabel, { color: theme.colors.text }] as any
                      }
                    >
                      Current Password
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        ref={currentPasswordRef}
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.colors.palette.neutral200,
                            color: theme.colors.text,
                            borderColor: theme.colors.palette.neutral500,
                          },
                        ]}
                        value={userStore.profileEditUI.currentPassword}
                        onChangeText={text => {
                          userStore.setCurrentPassword(text)
                        }}
                        onFocus={() =>
                          userStore.setLastFocusedField('currentPassword')
                        }
                        placeholder="Enter your current password"
                        placeholderTextColor={theme.colors.palette.neutral700}
                        secureTextEntry={
                          !userStore.profileEditUI.showCurrentPassword
                        }
                        editable={!userStore.isLoading}
                        returnKeyType="next"
                        onSubmitEditing={() => editValueRef.current?.focus()}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => userStore.toggleShowCurrentPassword()}
                      >
                        <Ionicons
                          name={
                            userStore.profileEditUI.showCurrentPassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
                          }
                          size={20}
                          color={theme.colors.palette.neutral700}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Main Input Field */}
                <View style={styles.inputGroup}>
                  <Text
                    style={
                      [styles.inputLabel, { color: theme.colors.text }] as any
                    }
                  >
                    {config.title.replace('Edit ', '').replace('Change ', '')}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      ref={editValueRef}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.colors.palette.neutral200,
                          color: theme.colors.text,
                          borderColor: theme.colors.palette.neutral500,
                        },
                      ]}
                      value={userStore.profileEditUI.editValue}
                      onChangeText={text => {
                        userStore.setEditValue(text)
                      }}
                      onFocus={() => userStore.setLastFocusedField('editValue')}
                      placeholder={config.placeholder}
                      placeholderTextColor={theme.colors.palette.neutral700}
                      keyboardType={config.keyboardType}
                      autoCapitalize={config.autoCapitalize}
                      secureTextEntry={
                        config.secureTextEntry &&
                        !userStore.profileEditUI.showPassword
                      }
                      editable={!userStore.isLoading}
                      returnKeyType={config.showConfirmField ? 'next' : 'done'}
                      onSubmitEditing={() => {
                        if (config.showConfirmField) {
                          confirmValueRef.current?.focus()
                        } else {
                          handleSave()
                        }
                      }}
                    />
                    {config.secureTextEntry && (
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => userStore.toggleShowPassword()}
                      >
                        <Ionicons
                          name={
                            userStore.profileEditUI.showPassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
                          }
                          size={20}
                          color={theme.colors.palette.neutral700}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Confirm Password Field (only for password) */}
                {config.showConfirmField && (
                  <View style={styles.inputGroup}>
                    <Text
                      style={
                        [styles.inputLabel, { color: theme.colors.text }] as any
                      }
                    >
                      Confirm New Password
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        ref={confirmValueRef}
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.colors.palette.neutral200,
                            color: theme.colors.text,
                            borderColor: theme.colors.palette.neutral500,
                          },
                        ]}
                        value={userStore.profileEditUI.confirmValue}
                        onChangeText={userStore.setConfirmValue}
                        onFocus={() =>
                          userStore.setLastFocusedField('confirmValue')
                        }
                        placeholder="Confirm your new password"
                        placeholderTextColor={theme.colors.palette.neutral700}
                        secureTextEntry={
                          !userStore.profileEditUI.showConfirmPassword
                        }
                        editable={!userStore.isLoading}
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => userStore.toggleShowConfirmPassword()}
                      >
                        <Ionicons
                          name={
                            userStore.profileEditUI.showConfirmPassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
                          }
                          size={20}
                          color={theme.colors.palette.neutral700}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.colors.palette.primary400,
                  opacity: userStore.isLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={userStore.isLoading}
            >
              <Text style={styles.buttonText}>
                {userStore.isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
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
      paddingBottom: 32,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    errorText: {
      fontSize: 18,
      color: theme.colors.palette.angry300,
      textAlign: 'center',
    },
    formSection: {
      margin: 16,
      padding: 20,
      borderRadius: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.palette.neutral800,
    },
    inputContainer: {
      position: 'relative',
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      paddingRight: 50, // Space for eye button
    },
    eyeButton: {
      position: 'absolute',
      right: 16,
      top: 12,
      padding: 4,
    },
    saveButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral200,
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary200,
      borderWidth: 1,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 12,
      gap: 12,
    },
    otpInput: {
      width: 56,
      height: 56,
      borderWidth: 2,
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      backgroundColor: theme.colors.palette.neutral200,
      color: theme.colors.text,
      borderColor: theme.colors.palette.neutral500,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
  })
