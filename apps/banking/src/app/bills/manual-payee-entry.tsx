import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { SuccessDialog } from '@/components/SuccessDialog'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import DropdownList from '@/components/DropdownList'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const ManualPayeeEntryScreen = observer(() => {
  const { bankingStore, uiStore, userStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'Manual Payee Entry',
    '/bills/manual-payee-entry',
  )

  // Get form state from UIStore
  const {
    billerName,
    billerAccountNumber,
    billerRoutingNumber,
    billerAddress,
    billerPhone,
    nickname,
    category,
    description,
    isLoading,
    showCategoryPicker,
    currentFocused,
  } = uiStore.manualPayeeForm

  // Refs for input fields
  const billerNameRef = useRef<TextInput>(null)
  const billerAccountNumberRef = useRef<TextInput>(null)
  const billerPhoneRef = useRef<TextInput>(null)
  const billerAddressRef = useRef<TextInput>(null)
  const descriptionRef = useRef<TextInput>(null)

  const {
    visible: dialogVisible,
    isSuccess,
    message,
    subMessage,
  } = uiStore.dialogState

  const categories = [
    {
      id: 'utilities',
      name: 'Utilities',
      icon: 'flash',
      color: theme.colors.palette.secondary400,
    },
    {
      id: 'telecom',
      name: 'Telecom',
      icon: 'phone-portrait',
      color: theme.colors.palette.primary200,
    },
    {
      id: 'insurance',
      name: 'Insurance',
      icon: 'shield-checkmark',
      color: theme.colors.palette.success400,
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: 'card',
      color: theme.colors.palette.accent200,
    },
    {
      id: 'subscription',
      name: 'Subscription',
      icon: 'tv',
      color: theme.colors.palette.primary200,
    },
    {
      id: 'others',
      name: 'Others',
      icon: 'ellipsis-horizontal',
      color: theme.colors.palette.neutral400,
    },
  ]

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Manual Payee Entry',
        route: '/bills/manual-payee-entry',
      })
    }, []),
  )

  // Focus restoration for sessionTimeStamp
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'billerName') {
        setTimeout(() => {
          billerNameRef.current?.focus()
          billerNameRef.current?.setSelection(
            billerName.length,
            billerName.length,
          )
        }, 100)
      } else if (focusedElement === 'billerAccountNumber') {
        setTimeout(() => {
          billerAccountNumberRef.current?.focus()
          billerAccountNumberRef.current?.setSelection(
            billerAccountNumber.length,
            billerAccountNumber.length,
          )
        }, 100)
      } else if (focusedElement === 'billerPhone') {
        setTimeout(() => {
          billerPhoneRef.current?.focus()
          billerPhoneRef.current?.setSelection(
            billerPhone.length,
            billerPhone.length,
          )
        }, 100)
      } else if (focusedElement === 'billerAddress') {
        setTimeout(() => {
          billerAddressRef.current?.focus()
          billerAddressRef.current?.setSelection(
            billerAddress.length,
            billerAddress.length,
          )
        }, 100)
      } else if (focusedElement === 'description') {
        setTimeout(() => {
          descriptionRef.current?.focus()
          descriptionRef.current?.setSelection(
            description.length,
            description.length,
          )
        }, 100)
      }
    }
  }, [
    sessionTimeStamp,
    currentFocused,
    billerName,
    billerAccountNumber,
    billerPhone,
    billerAddress,
    description,
  ])

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '').slice(0, 10) // Remove non-numeric characters and limit to 10 digits
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return cleaned
  }

  const formatAccountNumber = (accountNumber: string) => {
    return accountNumber
      .replace(/\D/g, '') // Remove non-numeric characters
      .slice(0, 12) // Limit to 12 digits
      .replace(/(\d{4})(\d{4})(\d{0,4})/, (match, p1, p2, p3) => {
        return p3 ? `${p1}-${p2}-${p3}` : `${p1}-${p2}`
      })
  }

  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text)
    uiStore.setManualPayeePhone(formatted)
  }

  const handleAccountNumberChange = (text: string) => {
    const formatted = formatAccountNumber(text)
    uiStore.setManualPayeeAccountNumber(formatted)
  }

  const handleManualSubmit = debounce(async () => {
    if (!billerName.trim() || !billerAccountNumber.trim()) {
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage:
          'Please fill in required fields (Biller Name and Account Number)',
      })
      return
    }

    uiStore.setManualPayeeLoading(true)
    try {
      await bankingStore.addBiller({
        userId: userStore.user?.id,
        billerName,
        billerAccountNumber,
        billerRoutingNumber,
        billerAddress,
        billerPhone,
        nickname,
        category,
        description,
        name: billerName,
        code: billerName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      })

      uiStore.showDialog({
        isSuccess: true,
        message: 'Success',
        subMessage: 'Payee added successfully!',
      })
      setTimeout(() => {
        router.replace('/(app)/pay-bills')
      }, 1500)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to add payee'
      console.error('Error adding payee:', error)
      uiStore.showDialog({
        isSuccess: false,
        message: 'Error',
        subMessage: errorMessage,
      })
    } finally {
      uiStore.setManualPayeeLoading(false)
    }
  }, 300)

  const renderCategoryItem = (category: any) => (
    <View style={styles.categoryDisplay}>
      <View
        style={[
          styles.categoryIconSmall,
          { backgroundColor: category.color + '15' },
        ]}
      >
        <Ionicons
          name={category.icon as any}
          size={16}
          color={category.color}
        />
      </View>
      <View>
        <Text style={{ ...styles.categoryText, color: theme.colors.text }}>
          {category.name}
        </Text>
      </View>
    </View>
  )

  const renderPlaceholderText = () => (
    <Text style={{ ...styles.placeholderText, color: theme.colors.textDim }}>
      Select a category
    </Text>
  )

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    isRequired = false,
    multiline = false,
    fieldName?: string,
    inputRef?: React.RefObject<TextInput>,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={{ ...styles.label, color: theme.colors.text }}>
        {label} {isRequired && '*'}
      </Text>
      <TextInput
        ref={inputRef}
        style={{
          ...styles.input,
          ...(multiline ? styles.textArea : {}),
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          borderColor: theme.colors.border,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onFocus={() => fieldName && uiStore.setManualPayeeFocused(fieldName)}
        onBlur={() => fieldName && uiStore.setManualPayeeFocused(null)}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{
          ...styles.container,
          backgroundColor: theme.colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={[]}
          renderItem={() => null} // Added a placeholder renderItem to satisfy FlatList requirements
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backButton}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.colors.text }}>
                  Add Payee Manually
                </Text>
                <Text
                  style={{ ...styles.subtitle, color: theme.colors.textDim }}
                >
                  Enter payee details manually
                </Text>
              </View>

              <View style={styles.formContainer}>
                {renderInputField(
                  'Payee Name',
                  billerName,
                  uiStore.setManualPayeeBillerName,
                  'Enter payee name',
                  true,
                  false,
                  'billerName',
                  billerNameRef,
                )}
                {renderInputField(
                  'Account Number',
                  billerAccountNumber,
                  handleAccountNumberChange,
                  'Enter account number',
                  true,
                  false,
                  'billerAccountNumber',
                  billerAccountNumberRef,
                )}
                {renderInputField(
                  'Phone Number',
                  billerPhone,
                  handlePhoneNumberChange,
                  'Enter phone number',
                  false,
                  false,
                  'billerPhone',
                  billerPhoneRef,
                )}

                <View style={styles.inputGroup}>
                  <Text style={{ ...styles.label, color: theme.colors.text }}>
                    Category *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selector,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => uiStore.toggleManualPayeeCategoryPicker()}
                  >
                    <View style={styles.selectorDisplay}>
                      {categories.find(c => c.id === category) ? (
                        <View style={styles.categoryDisplay}>
                          <View
                            style={[
                              styles.categoryIconSmall,
                              {
                                backgroundColor:
                                  categories.find(c => c.id === category)
                                    ?.color + '15',
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                categories.find(c => c.id === category)
                                  ?.icon as any
                              }
                              size={16}
                              color={
                                categories.find(c => c.id === category)?.color
                              }
                            />
                          </View>
                          <Text
                            style={{
                              ...styles.categoryText,
                              color: theme.colors.text,
                            }}
                          >
                            {categories.find(c => c.id === category)?.name}
                          </Text>
                        </View>
                      ) : (
                        renderPlaceholderText()
                      )}
                    </View>
                    <Ionicons
                      name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textDim}
                    />
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <DropdownList
                      data={categories}
                      renderItem={renderCategoryItem}
                      onSelect={category => {
                        uiStore.setManualPayeeCategory(category.id)
                        uiStore.toggleManualPayeeCategoryPicker()
                      }}
                      selectedItem={categories.find(c => c.id === category)}
                      keyExtractor={category => category.id}
                      style={{ borderColor: theme.colors.border }}
                    />
                  )}
                </View>

                {renderInputField(
                  'Address',
                  billerAddress,
                  uiStore.setManualPayeeAddress,
                  'Enter address',
                  false,
                  true,
                  'billerAddress',
                  billerAddressRef,
                )}
                {renderInputField(
                  'Description',
                  description,
                  uiStore.setManualPayeeDescription,
                  'Enter any description for this payee',
                  false,
                  true,
                  'description',
                  descriptionRef,
                )}

                <TouchableOpacity
                  style={{
                    ...styles.submitButton,
                    backgroundColor: theme.colors.palette.primary500, // Universally valid fallback color
                    ...(isLoading ? styles.disabledButton : {}),
                  }}
                  onPress={handleManualSubmit}
                  disabled={isLoading}
                >
                  <Text
                    style={{
                      ...styles.submitButtonText,
                      color: theme.colors.palette.neutral100,
                    }}
                  >
                    {isLoading ? 'Adding Payee...' : 'Add Payee'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          }
          nestedScrollEnabled
        />
        <SuccessDialog
          visible={dialogVisible}
          isSuccess={isSuccess}
          message={message}
          subMessage={subMessage}
          onClose={() => uiStore.hideDialog()}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      // fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
    },
    formContainer: {
      paddingHorizontal: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    submitButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 40,
    },
    disabledButton: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    categorySelector: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIconSmall: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    categoryText: {
      fontSize: 16,
    },
    categoryDropdown: {
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 10,
      maxHeight: 200,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
    },
    categoryOptionText: {
      fontSize: 16,
      flex: 1,
    },
    selector: {
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectorDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 16,
      color: 'gray',
    },
  })

export default ManualPayeeEntryScreen
