// app/profile/[id].tsx
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
import { Text, useAppTheme, useToast, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

// Define the edit types and their configurations
const EDIT_CONFIGS = {
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
    updateKey: 'username', // Key used in API call
  },
  home: {
    title: 'Edit home Name',
    icon: 'tv-outline',
    placeholder: 'Enter your home name',
    keyboardType: 'default',
    autoCapitalize: 'words',
    validation: (value: string) => {
      if (!value.trim()) return 'Home name cannot be empty'
      if (value.trim().length < 2) {
        return 'Home name must be at least 2 characters'
      }
      if (value.trim().length > 50) {
        return 'Home name must be less than 50 characters'
      }
      return null
    },
    updateKey: 'homeName', // Key used in API call
  },
  email: {
    title: 'Edit Email',
    icon: 'mail-outline',
    placeholder: 'Enter your email',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    validation: (value: string) => {
      if (!value.trim()) return 'Email cannot be empty'
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) return 'Please enter a valid email'
      return null
    },
    updateKey: 'email',
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
}

export default observer(function EditProfileScreen() {
  const { theme } = useAppTheme()
  const { userStore } = useStores()
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const toast = useToast()
  const { trackScreenMount } = useInteractionTracking(
    'profileEdit',
    `/profile/${id}`,
  )

  // State for channel information
  const [userHome] = React.useState<any>(null)

  // Refs for input fields
  const currentPasswordRef = useRef<TextInput>(null)
  const editValueRef = useRef<TextInput>(null)
  const confirmValueRef = useRef<TextInput>(null)

  // Get the configuration for this edit type
  const config = EDIT_CONFIGS[id as keyof typeof EDIT_CONFIGS]

  const styles = useMemo(() => createStyles(theme), [theme])

  // Initialize values based on edit type
  useEffect(() => {
    if (!config) return

    const initializeValues = async () => {
      if (
        !userStore.profileEditUI.editValue.length &&
        !userStore.profileEditUI.currentPassword.length &&
        !userStore.profileEditUI.confirmValue.length
      ) {
        if (id === 'home') {
          // Load channel data for channel editing
          try {
            // const channels = await userStore.getUserChannels()
            // if (channels && channels.length > 0) {
            //   setUserChannel(channels[0])
            //   userStore.setEditValue(channels[0].name || '')
            // }
          } catch (error) {
            console.error('Failed to load home:', error)
          }
        } else {
          userStore.initializeEditValues(id as string)
        }
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

      // If we have a last focused field from restore, focus on that
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
          default:
            // Fall through to default logic
            break
        }
        return
      }

      // Default focus logic for first render
      if (id === 'name' || id === 'email' || id === 'home') {
        editValueRef.current?.focus()
      }

      if (id === 'password') {
        if (!currentPassword.trim()) {
          currentPasswordRef.current?.focus()
        } else if (!editValue.trim()) {
          editValueRef.current?.focus()
        } else {
          confirmValueRef.current?.focus()
        }
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
    }, []),
  )

  // Handle validation and save
  const handleSave = async () => {
    if (!config) return

    // Validate input
    const validationError = config.validation(
      userStore.profileEditUI.editValue,
      config.showConfirmField
        ? userStore.profileEditUI.confirmValue
        : undefined,
      config.showCurrentPassword
        ? userStore.profileEditUI.currentPassword
        : undefined,
    )
    if (validationError) {
      toast.show({
        title: validationError,
        preset: 'error',
        duration: 3,
        placement: 'top',
      })
      return
    }

    try {
      if (id === 'home') {
        // Handle channel name update
        if (!userHome) {
          throw new Error('Channel not found')
        }

        // await userStore.updateHomeName(
        //   userChannel.id,
        //   userStore.profileEditUI.editValue,
        // )
      } else {
        // Handle user profile updates
        const updateData = {
          [config.updateKey]: userStore.profileEditUI.editValue,
        }

        // Add current password for password changes
        if (config.showCurrentPassword) {
          updateData.currentPassword = userStore.profileEditUI.currentPassword
        }

        // Call the update method
        await userStore.updateProfile(updateData)
      }

      toast.show({
        title: `${config.title.replace('Edit ', '').replace('Change ', '')} updated successfully!`,
        preset: 'success',
      })

      // Navigate back after a short delay to let the toast show
      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'

      // Handle specific error cases
      if (errorMessage.includes('Email already exists')) {
        toast.show({
          title: 'This email is already registered to another account',
          preset: 'error',
          duration: 3,
          placement: 'top',
        })
      } else if (errorMessage.includes('Current password is incorrect')) {
        toast.show({
          title: 'Current password is incorrect',
          preset: 'error',
          duration: 3,
          placement: 'top',
        })
      } else {
        toast.show({
          title: `Failed to update ${config.title.toLowerCase()}. Please try again.`,
          preset: 'error',
          duration: 3,
          placement: 'top',
        })
      }
    }
  }

  // Simple header component
  const SimpleHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={theme.colors.palette.neutral900}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{config.title}</Text>
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
            <Text style={styles.errorText}>Invalid edit type</Text>
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
          {/* Form Section */}
          <View
            style={[
              styles.formSection,
              { backgroundColor: theme.colors.palette.neutral300 },
            ]}
          >
            {/* Current Password Field (only for password change) */}
            {config.showCurrentPassword && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel} text="Current Password" />
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={currentPasswordRef}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.colors.palette.neutral400,
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
                style={styles.inputLabel}
                text={config.title.replace('Edit ', '').replace('Change ', '')}
              />
              <View style={styles.inputContainer}>
                <TextInput
                  ref={editValueRef}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.palette.neutral400,
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
                <Text style={styles.inputLabel} text="Confirm New Password" />
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={confirmValueRef}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.colors.palette.neutral400,
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

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.colors.palette.primary200,
                  opacity:
                    userStore.isLoading ||
                    (id === 'email' &&
                      userStore.profileEditUI.editValue ===
                        userStore.user?.email)
                      ? 0.6
                      : 1,
                },
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={
                userStore.isLoading ||
                (id === 'email' &&
                  userStore.profileEditUI.editValue === userStore.user?.email)
              }
            >
              <Text
                style={styles.buttonText}
                text={userStore.isLoading ? 'Saving...' : 'Save Changes'}
              />
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
      backgroundColor: theme.colors.palette.neutral400,
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
      color: theme.colors.palette.neutral900,
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary200,
      borderWidth: 1,
    },
  })
