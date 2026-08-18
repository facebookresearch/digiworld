import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FancyAlert } from '@/components/FancyAlert'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const AddContactScreen = observer(() => {
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'add-contact',
    '/nexus-pay/add-contact',
  )

  const nameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'add-contact',
        route: '/nexus-pay/add-contact',
      })
      return () => {
        // Nexus Pay screen unfocused
      }
    }, [trackScreenMount]),
  )

  // Reset form when component mounts
  useEffect(() => {
    return () => {
      // Clean up form when component unmounts
      bankingStore.resetContactForm()
    }
  }, [])

  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = bankingStore.contactForm.currentFocused
      if (focusedElement === 'name') {
        setTimeout(() => {
          nameRef.current?.focus()
          nameRef.current?.setSelection(
            bankingStore.contactForm.name.length,
            bankingStore.contactForm.name.length,
          )
        }, 100)
      } else if (focusedElement === 'email') {
        setTimeout(() => {
          emailRef.current?.focus()
          emailRef.current?.setSelection(
            bankingStore.contactForm.email.length,
            bankingStore.contactForm.email.length,
          )
        }, 100)
      } else if (focusedElement === 'phone') {
        setTimeout(() => {
          phoneRef.current?.focus()
          phoneRef.current?.setSelection(
            bankingStore.contactForm.phone.length,
            bankingStore.contactForm.phone.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp])

  // Helper function to validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Helper function to validate phone number (must be exactly 10 digits)
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    return digits.length === 10
  }

  // Helper function to format phone number as user types
  const formatPhoneNumber = (text: string) => {
    if (!text || typeof text !== 'string') return ''
    // Remove all non-digits
    const digits = text.replace(/\D/g, '')

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10)

    // Format based on length
    if (limitedDigits.length <= 3) {
      return limitedDigits
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    } else {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
    }
  }

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text || '')
    bankingStore.setContactFormPhone(formatted)
  }

  const handleSaveInternal = async () => {
    const trimmedName = (bankingStore.contactForm.name || '').trim()
    const trimmedEmail = (bankingStore.contactForm.email || '').trim()
    const trimmedPhone = (bankingStore.contactForm.phone || '').trim()

    if (!trimmedName) {
      bankingStore.showAlert({
        title: 'Warning',
        message: 'Please enter a contact name',
        preset: 'warning',
      })
      return
    }

    if (!trimmedEmail && !trimmedPhone) {
      bankingStore.showAlert({
        title: 'Warning',
        message: 'Please enter either an email or phone number',
        preset: 'warning',
      })
      return
    }

    // Validate email format if provided
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      bankingStore.showAlert({
        title: 'Invalid Email Format',
        message: 'Please enter a valid email address',
        preset: 'warning',
      })
      return
    }

    // Validate phone format if provided (must be complete 10 digits)
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      bankingStore.showAlert({
        title: 'Invalid Phone Number Format',
        message:
          'Please enter a complete phone number in format (123) 456-7890',
        preset: 'warning',
      })
      return
    }

    bankingStore.setContactFormIsSubmitting(true)
    try {
      // Remove formatting from phone number before saving
      const cleanPhone = trimmedPhone.replace(/\D/g, '')

      console.log('Creating contact with data:', {
        contactName: trimmedName,
        contactEmail: trimmedEmail || null,
        contactPhone: cleanPhone || null,
      })

      const newContact = await bankingStore.createZelleContact({
        contactName: trimmedName,
        contactEmail: trimmedEmail || undefined,
        contactPhone: cleanPhone || undefined,
      })

      console.log('Contact created successfully:', newContact)

      bankingStore.setContactFormHasPendingNavigation(true)

      bankingStore.showAlert({
        title: 'Success',
        message: 'Contact added successfully',
        preset: 'success',
        showConfirm: false,
        cancelText: 'OK',
      })
    } catch (error) {
      console.error('Error adding contact:', error)
      bankingStore.showAlert({
        title: 'Error',
        message: 'Failed to add contact. Please try again.',
        preset: 'error',
      })
    } finally {
      bankingStore.setContactFormIsSubmitting(false)
    }
  }

  // Debounced save function to prevent multiple rapid submissions
  const handleSave = useCallback(debounce(handleSaveInternal, 300), [
    bankingStore,
  ])

  const handleCancel = () => {
    router.back()
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          preset="subheading"
          style={{ color: theme.colors.text as string }}
        >
          Add Contact
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Avatar */}
        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: theme.colors.palette.primary400 + '20' },
            ]}
          >
            <Ionicons
              name="person"
              size={48}
              color={theme.colors.palette.primary400}
            />
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text
              style={{
                ...styles.inputLabel,
                color: theme.colors.text as string,
              }}
            >
              Contact Name *
            </Text>
            <TextInput
              ref={nameRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: (theme.colors as any).surface,
                  borderColor:
                    bankingStore.contactForm.currentFocused === 'name'
                      ? theme.colors.palette.primary500
                      : theme.colors.border,
                  color: theme.colors.text as string,
                },
              ]}
              placeholder="Enter full name"
              placeholderTextColor={theme.colors.textDim}
              value={bankingStore.contactForm.name || ''}
              onChangeText={bankingStore.setContactFormName}
              autoCapitalize="words"
              onFocus={() => bankingStore.setContactFormFocused('name')}
              onBlur={() => bankingStore.setContactFormFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={{
                ...styles.inputLabel,
                color: theme.colors.text as string,
              }}
            >
              Email Address
            </Text>
            <TextInput
              ref={emailRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: (theme.colors as any).surface,
                  borderColor:
                    bankingStore.contactForm.currentFocused === 'email'
                      ? theme.colors.palette.primary500
                      : theme.colors.border,
                  color: theme.colors.text as string,
                },
              ]}
              placeholder="Enter email address"
              placeholderTextColor={theme.colors.textDim}
              value={bankingStore.contactForm.email || ''}
              onChangeText={bankingStore.setContactFormEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => bankingStore.setContactFormFocused('email')}
              onBlur={() => bankingStore.setContactFormFocused(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={{
                ...styles.inputLabel,
                color: theme.colors.text as string,
              }}
            >
              Phone Number
            </Text>
            <TextInput
              ref={phoneRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: (theme.colors as any).surface,
                  borderColor:
                    bankingStore.contactForm.currentFocused === 'phone'
                      ? theme.colors.palette.primary500
                      : theme.colors.border,
                  color: theme.colors.text as string,
                },
              ]}
              placeholder="(123) 456-7890"
              placeholderTextColor={theme.colors.textDim}
              value={bankingStore.contactForm.phone || ''}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              onFocus={() => bankingStore.setContactFormFocused('phone')}
              onBlur={() => bankingStore.setContactFormFocused(null)}
            />
          </View>

          <View style={styles.noteSection}>
            <Text
              style={{
                ...styles.noteText,
                color: theme.colors.textDim as string,
              }}
            >
              * Contact name is required. Please provide either an email address
              or phone number.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.cancelButton,
            { backgroundColor: (theme.colors as any).surface },
          ]}
          onPress={handleCancel}
        >
          <Text
            style={{
              ...styles.cancelButtonText,
              color: theme.colors.text as string,
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.colors.palette.primary400,
              opacity: bankingStore.contactForm.isSubmitting ? 0.6 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={bankingStore.contactForm.isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {bankingStore.contactForm.isSubmitting
              ? 'Adding...'
              : 'Add Contact'}
          </Text>
        </TouchableOpacity>
      </View>

      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title || undefined}
        message={bankingStore.alertState.message}
        preset={
          bankingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => {
          if (bankingStore.contactForm.hasPendingNavigation) {
            bankingStore.hideAlert()
            bankingStore.resetContactForm()
            // Small delay to ensure state is updated before navigation
            setTimeout(() => {
              router.back()
            }, 100)
          } else {
            bankingStore.hideAlert()
          }
        }}
        onConfirm={
          bankingStore.alertState.showConfirm
            ? () => {
                if (bankingStore.contactForm.hasPendingNavigation) {
                  bankingStore.hideAlert()
                  bankingStore.resetContactForm()
                  // Small delay to ensure state is updated before navigation
                  setTimeout(() => {
                    router.back()
                  }, 100)
                } else {
                  bankingStore.hideAlert()
                }
              }
            : undefined
        }
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    backButton: {
      padding: 4,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formSection: {
      paddingBottom: 32,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    noteSection: {
      marginTop: 16,
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral300,
    },
    noteText: {
      fontSize: 14,
      lineHeight: 20,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default AddContactScreen
