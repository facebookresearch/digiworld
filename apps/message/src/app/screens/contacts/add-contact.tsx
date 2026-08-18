import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { Button, Input, Text } from '@andojo/shared-theme/src/components'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from '@gluestack-ui/themed'
import * as Contacts from 'expo-contacts'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { queries } from '@/db/queries'

const { width } = Dimensions.get('window')

// Phone Number Status Component
const PhoneNumberStatus = observer(
  ({
    theme,
    loading,
  }: {
    phoneNumber: string
    theme: any
    userExists: any
    loading: boolean
  }) => {
    const statusStyles = useMemo(() => createStatusStyles(theme), [theme])

    if (loading) {
      return (
        <View style={statusStyles.statusContainer}>
          <Ionicons
            name="time-outline"
            size={16}
            color={theme.colors.palette.neutral400}
          />
          <Text
            text="Checking..."
            size="small"
            style={statusStyles.statusText}
          />
        </View>
      )
    }

    // Don't show status cards for existing users or invite prompts
    return null
  },
)

const AddContactScreen = observer(function AddContactScreen() {
  const { theme, themeContext } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { userStore } = useStores()
  const { trackScreenMount, trackClick, trackTextChange, trackContentChange } =
    useInteractionTracking('AddContact', '/screens/contacts/add-contact')

  // Refs for input fields
  const nameRef = useRef<any>(null)
  const phoneNumberRef = useRef<any>(null)

  // Get contact form from store (all state comes from store)
  const contact = userStore.contactForm
  const currentFocused = contact.currentFocused
  const userExists = contact.userExists
  const checkingUser = contact.checkingUser

  // Reset form when component unmounts (like banking app)
  useEffect(() => {
    return () => {
      // Clean up form when component unmounts
      userStore.resetContactForm()
    }
  }, [userStore])

  // Focus restoration for sessionTimeStamp (like banking app)
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'name') {
        setTimeout(() => {
          nameRef.current?.focus()
          nameRef.current?.setSelection(
            contact.name.length,
            contact.name.length,
          )
        }, 100)
      } else if (focusedElement === 'phoneNumber') {
        setTimeout(() => {
          phoneNumberRef.current?.focus()
          phoneNumberRef.current?.setSelection(
            contact.phoneNumber.length,
            contact.phoneNumber.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp, currentFocused, contact.name, contact.phoneNumber])

  // Check if phone number exists in database
  const checkPhoneNumberExists = useCallback(
    async (phoneNumber: string) => {
      if (!phoneNumber || phoneNumber === '+1' || phoneNumber.length < 12) {
        userStore.setContactFormUserExists(null)
        userStore.setContactFormCheckingUser(false)
        return null
      }

      userStore.setContactFormCheckingUser(true)
      try {
        const existingUser = await queries.getUserByPhoneNumber(phoneNumber)
        userStore.setContactFormUserExists(existingUser)
        return existingUser
      } catch (error) {
        console.error('Error checking phone number:', error)
        userStore.setContactFormUserExists(null)
        return null
      } finally {
        userStore.setContactFormCheckingUser(false)
      }
    },
    [userStore],
  )

  // Check phone number when it changes
  useEffect(() => {
    if (
      contact.phoneNumber &&
      contact.phoneNumber !== '+1' &&
      contact.phoneNumber.length >= 12
    ) {
      checkPhoneNumberExists(contact.phoneNumber)
    } else {
      userStore.setContactFormUserExists(null)
      userStore.setContactFormCheckingUser(false)
    }
  }, [contact.phoneNumber, checkPhoneNumberExists, userStore])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        contact: userStore.contactForm,
        isLoading: contact.isLoading,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height: Dimensions.get('window').height,
        },
      })
      return () => {
        // Add contact screen unfocused
      }
    }, [trackScreenMount, userStore.contactForm, contact.isLoading]),
  )

  const handleContactChange = (field: 'name' | 'phoneNumber', value: any) => {
    userStore.setContactFormField(field, value)
    // Track form changes
    trackContentChange({
      contact: userStore.contactForm,
      [field]: value,
      isLoading: contact.isLoading,
      timestamp: Date.now(),
      currentFocusedElement: field,
    })
    // Track specific field change
    trackTextChange(field, String(value))
  }

  const handleFocus = (field: 'name' | 'phoneNumber') => {
    userStore.setContactFormFocused(field)
  }

  const handleBlur = () => {
    userStore.setContactFormFocused(null)
  }

  const formatPhoneNumber = (text: string) => {
    // If empty or just +, return +1
    if (!text || text === '+' || text === '') {
      return '+1'
    }

    // Remove all non-numeric characters except the + at the start
    let cleaned = text.replace(/[^\d+]/g, '')

    // Always ensure it starts with +1
    if (cleaned.startsWith('+1')) {
      // Keep +1 and only digits after it
      cleaned = '+1' + cleaned.substring(2).replace(/\D/g, '')
    } else if (cleaned.startsWith('+')) {
      // If it starts with + but not +1, replace with +1
      cleaned = '+1' + cleaned.substring(1).replace(/\D/g, '')
    } else {
      // If it doesn't start with +, prepend +1
      cleaned = '+1' + cleaned.replace(/\D/g, '')
    }

    return cleaned
  }

  const handleSaveContact = useCallback(async () => {
    if (!isValid()) return

    userStore.setContactFormLoading(true)
    trackClick('saveContactButton')

    try {
      // Format phone number (already has +1 prefix)
      const cleanedPhone = formatPhoneNumber(contact.phoneNumber)

      // Check if phone number is valid (should be +1 followed by 10 digits)
      if (
        !cleanedPhone ||
        !cleanedPhone.startsWith('+1') ||
        cleanedPhone.length < 12
      ) {
        Alert.alert('Error', 'Please enter a valid phone number.')
        userStore.setContactFormLoading(false)
        return
      }

      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Contacts permission is required to save a contact.',
        )
        userStore.setContactFormLoading(false)
        return
      }

      // Prepare contact data for device (simplified like users-list.tsx)
      const nameParts = contact.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const contactData: any = {
        name: contact.name.trim(),
        firstName,
        lastName,
        phoneNumbers: [
          {
            number: cleanedPhone,
            label: 'mobile',
          },
        ],
      }

      // Save contact to device
      console.log('Saving contact to device:', {
        name: contact.name.trim(),
        phoneNumber: cleanedPhone,
        hasAvatar: !!contact.avatarUrl,
      })

      const contactId = await Contacts.addContactAsync(contactData)
      console.log('Contact saved to device with ID:', contactId)

      trackContentChange({
        action: 'contact_saved',
        contactName: contact.name,
        contactPhone: cleanedPhone,
        timestamp: Date.now(),
      })

      // Show success alert
      Alert.alert(
        'Contact Added!',
        `${contact.name.trim()} (${cleanedPhone}) has been successfully added to your contacts.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form after successful save
              userStore.resetContactForm()

              // Small delay to ensure contact is saved before navigating
              setTimeout(() => {
                // Navigate back to contact list (it will auto-refresh on focus)
                if (router.canGoBack()) {
                  router.back()
                } else {
                  router.replace('/screens/contacts/contact-list')
                }
              }, 200)
            },
          },
        ],
      )
    } catch (error) {
      console.error('Error saving contact:', error)
      trackContentChange({
        action: 'contact_save_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      })
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to save contact. Please try again.',
      )
    } finally {
      userStore.setContactFormLoading(false)
    }
  }, [contact, trackClick, trackContentChange, router, userStore])

  const isValid = () => {
    const nameValid = contact.name && contact.name.trim().length > 0
    const cleanedPhone = formatPhoneNumber(contact.phoneNumber)
    const phoneValid =
      cleanedPhone && cleanedPhone.startsWith('+1') && cleanedPhone.length >= 12

    // Debug logging
    console.log('Validation check:', {
      name: contact.name,
      nameValid,
      phone: contact.phoneNumber,
      cleanedPhone,
      phoneValid,
      isLoading: contact.isLoading,
      checkingUser,
      userExists,
    })

    return nameValid && phoneValid
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        style={themeContext === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
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
            color={theme.colors.palette.neutral800}
          />
        </Pressable>
        <Text preset="heading" text="Add Contact" style={styles.headerTitle} />
        <View style={styles.headerSpacer} />
      </View>

      {/* Keyboard Avoiding Content */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={true}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          scrollEventThrottle={16}
          nestedScrollEnabled={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="person-add"
                size={56}
                color={theme.colors.palette.primary500}
              />
            </View>
            <Text
              text="Add New Contact"
              style={styles.heroTitle}
              size="xl"
              weight="bold"
            />
            <Text
              text="Enter contact details to save to your device"
              style={styles.heroSubtitle}
              size="medium"
            />
          </View>
          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Input */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => nameRef.current?.focus()}
              style={styles.inputGroup}
            >
              <Text style={styles.label}>Full Name</Text>
              <Input
                ref={nameRef}
                placeholder="Enter contact name"
                value={contact.name}
                variant="bordered"
                onChangeText={text => handleContactChange('name', text)}
                onFocus={() => handleFocus('name')}
                onBlur={handleBlur}
                LeftAccessory={() => (
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.palette.primary400}
                  />
                )}
                RightAccessory={() =>
                  contact.name ? (
                    <TouchableOpacity
                      onPress={() => handleContactChange('name', '')}
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
                isDisabled={contact.isLoading}
                accessibilityLabel="Contact Name"
                returnKeyType="next"
                onSubmitEditing={() => phoneNumberRef.current?.focus()}
                numberOfLines={1}
                autoCapitalize="words"
              />
            </TouchableOpacity>

            {/* Phone Number Input */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => phoneNumberRef.current?.focus()}
              style={styles.inputGroup}
            >
              <Text style={styles.label}>Phone Number</Text>
              <Input
                ref={phoneNumberRef}
                placeholder="+1 (123) 456-7890"
                value={contact.phoneNumber}
                variant="bordered"
                onChangeText={text => {
                  const formatted = formatPhoneNumber(text)
                  handleContactChange('phoneNumber', formatted)
                }}
                keyboardType="phone-pad"
                onFocus={() => handleFocus('phoneNumber')}
                onBlur={handleBlur}
                LeftAccessory={() => (
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={theme.colors.palette.primary400}
                  />
                )}
                RightAccessory={() =>
                  contact.phoneNumber && contact.phoneNumber !== '+1' ? (
                    <TouchableOpacity
                      onPress={() => handleContactChange('phoneNumber', '+1')}
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
                isDisabled={contact.isLoading}
                accessibilityLabel="Phone Number"
                returnKeyType="done"
                numberOfLines={1}
              />
            </TouchableOpacity>

            {/* Phone Number Status Info */}
            {contact.phoneNumber &&
              contact.phoneNumber !== '+1' &&
              contact.phoneNumber.length >= 12 && (
                <PhoneNumberStatus
                  phoneNumber={contact.phoneNumber}
                  theme={theme}
                  userExists={userExists}
                  loading={checkingUser}
                />
              )}
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSaveContact}
              disabled={!isValid() || contact.isLoading}
              style={[
                styles.submitButton,
                (!isValid() || contact.isLoading) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {contact.isLoading ? 'Saving...' : 'Save Contact'}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
})

export default AddContactScreen

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    fixedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral200,
      zIndex: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    headerSpacer: {
      width: 40,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 100 : 120,
      minHeight: '100%',
    },
    heroSection: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
      backgroundColor: theme.colors.background,
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
      textAlign: 'center',
    },
    heroSubtitle: {
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 22,
    },
    formCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 20,
      marginTop: 8,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      minHeight: 300,
    },
    inputGroup: {
      marginBottom: 20,
      minHeight: 80,
      justifyContent: 'center',
    },
    label: {
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.palette.neutral800,
      fontSize: 16,
      letterSpacing: 0.2,
    },
    clearButton: {
      padding: 8,
    },
    buttonContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
    },
    submitButton: {
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.5,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    statusExists: {
      backgroundColor: theme.colors.palette.success100,
      borderWidth: 1,
      borderColor: theme.colors.palette.success200,
    },
    statusInvite: {
      backgroundColor: theme.colors.palette.primary100,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary200,
    },
    statusText: {
      marginLeft: 12,
      color: theme.colors.palette.neutral700,
      fontSize: 14,
      fontWeight: '500',
    },
    statusTextSuccess: {
      marginLeft: 12,
      color: theme.colors.palette.success500,
      fontSize: 14,
      fontWeight: '600',
    },
    statusTextPrimary: {
      marginLeft: 12,
      color: theme.colors.palette.primary600,
      fontSize: 14,
      fontWeight: '600',
    },
  })

const createStatusStyles = (theme: Theme) =>
  StyleSheet.create({
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    statusText: {
      marginLeft: 12,
      color: theme.colors.palette.neutral700,
      fontSize: 14,
      fontWeight: '500',
    },
  })
