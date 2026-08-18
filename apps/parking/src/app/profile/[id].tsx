import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
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
import { useAppTheme, Text } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

interface EditConfig {
  title: string
  icon: string
  placeholder: string
  keyboardType: 'default' | 'email-address'
  autoCapitalize: 'none' | 'words'
  secureTextEntry?: boolean
  showConfirmField?: boolean
  showCurrentPassword?: boolean
}

const EDIT_CONFIGS: Record<string, EditConfig> = {
  name: {
    title: 'Edit Name',
    icon: 'person-outline',
    placeholder: 'Enter your name',
    keyboardType: 'default',
    autoCapitalize: 'words',
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
  },
}

export default observer(function EditProfileScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore } = useStores()
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'profileEdit',
    `/profile/${id}`,
  )

  const [error, setError] = useState('')

  const currentPasswordRef = useRef<TextInput>(null)
  const editValueRef = useRef<TextInput>(null)
  const confirmValueRef = useRef<TextInput>(null)

  const config = EDIT_CONFIGS[id as keyof typeof EDIT_CONFIGS]

  // Initialize values from store
  useEffect(() => {
    if (!config) return
    userStore.initializeEditValues(id as string)
  }, [
    config,
    id,
    userStore,
    userStore.user?.fullName,
    userStore.user?.username,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      userStore.resetProfileEditUI()
    }
  }, [])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timeStamp: Date.now(),
        screen: 'profileEdit',
        route: `/profile/${id}`,
      })
    }, [id, trackScreenMount]),
  )

  const handleSave = debounce(async () => {
    setError('')

    const { editValue, confirmValue, currentPassword } = userStore.profileEditUI

    // Validation
    if (id === 'name') {
      if (!editValue.trim()) {
        setError('Name cannot be empty')
        return
      }
      if (editValue.trim().length < 2) {
        setError('Name must be at least 2 characters')
        return
      }
    }

    if (id === 'password') {
      if (!currentPassword.trim()) {
        setError('Current password is required')
        return
      }
      if (!editValue.trim()) {
        setError('New password cannot be empty')
        return
      }
      if (editValue.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (editValue !== confirmValue) {
        setError('Passwords do not match')
        return
      }
    }

    try {
      const updateData: any = {}

      if (id === 'name') {
        updateData.fullName = editValue
      } else if (id === 'password') {
        updateData.password = editValue
        updateData.currentPassword = currentPassword
      }

      await userStore.updateProfile(updateData)

      // Success - go back
      router.back()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed'
      setError(errorMessage)
    }
  }, 300)

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
        {config?.title || 'Edit Profile'}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  )

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
            {/* Error Message */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

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
                    onChangeText={userStore.setCurrentPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor={theme.colors.palette.neutral700}
                    secureTextEntry={
                      !userStore.profileEditUI.showCurrentPassword
                    }
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
                style={[styles.inputLabel, { color: theme.colors.text }] as any}
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
                  onChangeText={userStore.setEditValue}
                  placeholder={config.placeholder}
                  placeholderTextColor={theme.colors.palette.neutral700}
                  keyboardType={config.keyboardType}
                  autoCapitalize={config.autoCapitalize}
                  secureTextEntry={
                    config.secureTextEntry &&
                    !userStore.profileEditUI.showPassword
                  }
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
                    placeholder="Confirm your new password"
                    placeholderTextColor={theme.colors.palette.neutral700}
                    secureTextEntry={
                      !userStore.profileEditUI.showConfirmPassword
                    }
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
                { backgroundColor: theme.colors.palette.primary400 },
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
})

const createStyles = (theme: any) =>
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
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
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
      textAlign: 'center',
    },
    formSection: {
      margin: 16,
      padding: 20,
      borderRadius: 16,
    },
    errorBanner: {
      backgroundColor: theme.colors.palette.angry100,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: {
      color: theme.colors.palette.angry500,
      fontSize: 14,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
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
      paddingRight: 50,
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
  })
