import { mutations } from '@/db/mutations'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import {
  Button,
  Input,
  Screen,
  Text,
} from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from '@gluestack-ui/themed'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

const { width } = Dimensions.get('window')

interface User {
  id: string
  phoneNumber: string
  name?: string | null
  avatarUrl?: string | null
  lastLoggedIn?: number
}

export default function CreateProfileScreen() {
  const { theme, themeContext } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const {
    phoneNumber: urlPhoneNumber,
    sessionId,
    mode,
  } = useLocalSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(
    (urlPhoneNumber as string) || '',
  )
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('CreateProfile', '/screens/auth/create-profile')

  // Determine if this is update mode
  const [isUpdateMode, setIsUpdateMode] = useState(mode === 'update')

  // Refs for input fields
  const nameRef = useRef<any>(null)

  const [profile, setProfile] = useState({
    name: '',
    avatarUrl: null as string | null,
  })

  // Clear form when starting fresh in creation mode
  useEffect(() => {
    if (!sessionId && !isUpdateMode) {
      console.log('Starting fresh in creation mode - clearing form')
      setProfile({
        name: '',
        avatarUrl: null,
      })
    }
  }, [sessionId, isUpdateMode])

  const { userStore, sessionStore } = useStores()

  // Load existing user data if in update mode (only if no session data)
  useEffect(() => {
    if (isUpdateMode && userStore.currentUser && !sessionId) {
      const currentUser = userStore.currentUser
      setProfile({
        name: currentUser.name || '',
        avatarUrl: currentUser.avatarUrl || null,
      })
      setPhoneNumber(currentUser.phoneNumber || '')
    }
  }, [isUpdateMode, userStore.currentUser, sessionId])

  // Load session data if exists
  useEffect(() => {
    console.log('🔄 Session restoration effect triggered:', {
      sessionId,
      hasSessionId: !!sessionId,
      isUpdateMode,
    })

    if (sessionId) {
      const session = sessionStore.getSession()
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('formData', formData)

        // Restore mode from session
        const sessionMode = formData.mode || formData.isUpdateMode
        if (sessionMode !== undefined) {
          setIsUpdateMode(sessionMode === 'update' || sessionMode === true)
        }

        // Restore phone number from session
        const phoneNumberFromSession =
          formData.phoneNumber || formData.phone_number || ''
        if (phoneNumberFromSession) {
          setPhoneNumber(phoneNumberFromSession)
        }

        // Always restore profile data from session if it exists
        const isUpdateModeFromSession =
          sessionMode === 'update' || sessionMode === true
        const hasSessionData =
          formData.name !== undefined || formData.avatarUrl !== undefined

        console.log('Session restoration analysis:', {
          sessionMode,
          isUpdateModeFromSession,
          hasSessionData,
          sessionName: formData.name,
          sessionAvatarUrl: formData.avatarUrl,
        })

        if (hasSessionData) {
          // Restore profile data from session
          console.log('🔄 ROLLBACK: Restoring profile data from session:', {
            sessionName: formData.name,
            sessionAvatarUrl: formData.avatarUrl ? 'Has Image' : 'No Image',
            currentName: profile.name,
            currentAvatarUrl: profile.avatarUrl ? 'Has Image' : 'No Image',
            isUpdateMode: isUpdateModeFromSession,
            mode: isUpdateModeFromSession ? 'update' : 'create',
          })

          // In update mode, use current user data as fallback for missing session data
          const currentUser = userStore.currentUser
          const fallbackName =
            isUpdateModeFromSession && currentUser ? currentUser.name || '' : ''
          const fallbackAvatarUrl =
            isUpdateModeFromSession && currentUser
              ? currentUser.avatarUrl || null
              : null

          setProfile(prev => ({
            ...prev,
            name: (formData.name as string) || fallbackName || prev.name || '',
            avatarUrl:
              (formData.avatarUrl as string) ||
              fallbackAvatarUrl ||
              prev.avatarUrl ||
              null,
          }))
        } else {
          // No session data available, use appropriate defaults
          if (isUpdateModeFromSession && userStore.currentUser) {
            // In update mode, use current user data
            const currentUser = userStore.currentUser
            console.log('Using current user data for update mode')
            setProfile({
              name: currentUser.name || '',
              avatarUrl: currentUser.avatarUrl || null,
            })
          } else {
            // In creation mode with no session data, clear the form
            console.log(
              '🧹 CLEARING: No session data, clearing form for fresh creation mode',
            )
            setProfile({
              name: '',
              avatarUrl: null,
            })
          }
        }

        // Restore focus after a delay to ensure profile data is set
        setTimeout(() => {
          const focusedElement = formData.currentFocusedElement as string

          if (focusedElement === 'name') {
            nameRef.current?.focus()
          }
        }, 500)
      }
    }
  }, [sessionId, sessionStore, userStore])

  // Track screen mount with initial form data
  useEffect(() => {
    trackScreenMount({
      phoneNumber,
      profile,
      isLoading,
      isUpdateMode,
      mode: isUpdateMode ? 'update' : 'create',
      timestamp: Date.now(),
      platform: Platform.OS,
      screenDimensions: {
        width,
        height: Dimensions.get('window').height,
      },
      sessionId,
    })
  }, [isUpdateMode])

  const handleProfileChange = (field: keyof typeof profile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value }
      // Track form changes
      trackContentChange({
        profile: updated,
        [field]: value,
        phoneNumber,
        isLoading,
        isUpdateMode,
        mode: isUpdateMode ? 'update' : 'create',
        timestamp: Date.now(),
        currentFocusedElement: field,
      })
      return updated
    })
    // Track specific field change
    trackTextChange(field, String(value))
  }

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert(
            'Permission needed',
            'Camera permission is required to take a photo.',
          )
          return
        }
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert(
            'Permission needed',
            'Gallery permission is required to select a photo.',
          )
          return
        }
      }

      // Launch image picker with heavy compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3, // Heavy compression - 30% quality
        base64: true,
        allowsMultipleSelection: false,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0]

        if (asset.base64) {
          // Create base64 data URL with compressed image
          const base64DataUrl = `data:image/jpeg;base64,${asset.base64}`

          // Update profile with compressed base64 image
          handleProfileChange('avatarUrl', base64DataUrl)

          trackClick('avatarSelected')
          trackContentChange({
            action: 'avatar_selected',
            source,
            isUpdateMode,
            timestamp: Date.now(),
          })
        }
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    }
  }

  const showImagePickerOptions = () => {
    Alert.alert(
      isUpdateMode ? 'Update Profile Picture' : 'Select Avatar',
      isUpdateMode
        ? 'Choose how you want to update your profile picture'
        : 'Choose how you want to add your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Gallery',
          onPress: () => pickImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    )
  }

  const removeAvatar = () => {
    handleProfileChange('avatarUrl', null)
    trackClick('avatarRemoved')
  }

  const handleCreateProfile = useCallback(async () => {
    if (!isValid()) return

    setIsLoading(true)
    trackClick(isUpdateMode ? 'updateProfileButton' : 'createProfileButton')

    try {
      if (isUpdateMode) {
        // Update existing user
        const currentUser = userStore.currentUser
        if (!currentUser?.id) {
          throw new Error('No user found to update')
        }

        const result = await mutations.updateUser(currentUser.id, {
          name: profile.name || null,
          avatarUrl: profile.avatarUrl,
        })

        if (result.success) {
          // Update store
          userStore.updateUserProfile({
            name: profile.name || null,
            avatarUrl: profile.avatarUrl,
          })

          trackContentChange({
            action: 'profile_updated',
            timestamp: Date.now(),
            userId: currentUser.id,
          })

          router.back()
        } else {
          throw new Error('Failed to update profile')
        }
      } else {
        // Create new user
        await mutations.createUser({
          id: phoneNumber, // Use phone number as ID
          phoneNumber,
          name: profile.name || null,
          avatarUrl: profile.avatarUrl,
          lastLoggedIn: Date.now(),
        })

        // Create user object for the store - matching the actual schema
        const user: User = {
          id: phoneNumber,
          phoneNumber,
          name: profile.name || null,
          avatarUrl: profile.avatarUrl,
          lastLoggedIn: Date.now(),
        }

        // Login and redirect
        userStore.login(user, 'dummy-token-' + phoneNumber)
        router.replace('/')
      }
    } catch (error) {
      console.error(
        isUpdateMode ? 'Profile update error:' : 'Profile creation error:',
        error,
      )
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : `Failed to ${isUpdateMode ? 'update' : 'create'} profile`,
      )
      trackClick(isUpdateMode ? 'updateProfileError' : 'createProfileError')
    } finally {
      setIsLoading(false)
    }
  }, [profile, phoneNumber, userStore, isUpdateMode])

  const isValid = () => {
    if (!profile.name || profile.name.trim().length === 0) {
      return false
    }
    return true
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top']}
      backgroundColor={theme.colors.background}
      contentContainerStyle={styles.screenContent}
    >
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fixed Header Section */}
        <Pressable
          onPress={() => {
            trackClick('backButton')
            router.back()
          }}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral200}
          />
        </Pressable>

        <View style={styles.headerSection}>
          <TouchableOpacity
            onPress={showImagePickerOptions}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {profile.avatarUrl ? (
              <Image
                key={profile.avatarUrl} // Force re-render when avatar URL changes
                source={{ uri: profile.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons
                  name="person-add"
                  size={40}
                  color={theme.colors.palette.neutral100}
                />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons
                name="camera"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            </View>
            {profile.avatarUrl && (
              <TouchableOpacity
                onPress={removeAvatar}
                style={styles.removeAvatarButton}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <Text
            preset="heading"
            text={
              isUpdateMode ? 'Update Your Profile' : 'Complete Your Profile'
            }
            style={styles.title}
          />
          <Text
            text={
              isUpdateMode
                ? 'Update your name and photo'
                : 'Add your name and photo to get started'
            }
            style={styles.subtitle}
            size="medium"
          />
        </View>

        {/* Scrollable Form Section */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            {/* Display Name */}
            <Text style={styles.label}>Display Name</Text>
            <Input
              ref={nameRef}
              placeholder="Enter your display name"
              value={profile.name}
              variant="bordered"
              onChangeText={text => handleProfileChange('name', text)}
              LeftAccessory={() => (
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.palette.primary400}
                />
              )}
              RightAccessory={() =>
                profile.name ? (
                  <TouchableOpacity
                    onPress={() => handleProfileChange('name', '')}
                    style={styles.clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.palette.neutral400}
                    />
                  </TouchableOpacity>
                ) : null
              }
              isDisabled={isLoading}
              accessibilityLabel="Display Name"
              returnKeyType="done"
              numberOfLines={1}
              autoCapitalize="words"
            />

            {/* Phone Number Display (Read-only) */}
            <Text style={styles.label}>Phone Number</Text>
            <Input
              value={phoneNumber}
              variant="bordered"
              isDisabled={true}
              LeftAccessory={() => (
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={theme.colors.palette.neutral400}
                />
              )}
              style={styles.disabledInput}
            />
          </View>

          <Button
            onPress={handleCreateProfile}
            disabled={!isValid() || isLoading}
            style={[
              styles.submitButton,
              (!isValid() || isLoading) && styles.buttonDisabled,
              styles.buttonPadding,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isLoading
                ? isUpdateMode
                  ? 'Updating...'
                  : 'Creating...'
                : isUpdateMode
                  ? 'Update Profile'
                  : 'Complete Profile'}
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screenContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 16,
    },
    backButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: theme.colors.palette.neutral400,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginLeft: 16,
    },
    headerSection: {
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 15,
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    removeAvatarButton: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    title: {
      marginTop: 8,
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.palette.primary500,
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.palette.primary400,
      textAlign: 'center',
    },
    formCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      padding: 28,
      marginHorizontal: 0,
      marginTop: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    label: {
      fontWeight: '700',
      marginBottom: 4,
      marginTop: 16,
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      letterSpacing: 0.1,
    },
    disabledInput: {
      opacity: 0.7,
    },
    clearButton: {
      padding: 8,
    },
    submitButton: {
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 32,
      padding: 16,
      marginHorizontal: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonPadding: {
      paddingHorizontal: 16,
    },
    submitButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral100,
    },
  })
