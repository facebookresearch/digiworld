import React, { useCallback, useRef, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import LinearGradient from 'react-native-linear-gradient'
import { FancyAlert, SuccessDialog } from '@/components'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { debounce } from 'lodash'

const { width } = Dimensions.get('window')

const PaymentScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { sessionTimeStamp, openAddModal, returnTo } = useLocalSearchParams()
  const nameOnCardRef = useRef<TextInput>(null)
  const cardNumberRef = useRef<TextInput>(null)
  const expiryMonthRef = useRef<TextInput>(null)
  const expiryYearRef = useRef<TextInput>(null)
  const { trackScreenMount } = useInteractionTracking('Payment', '/payment')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Payment',
        route: '/payment',
      })

      // Open add payment method modal if requested via query parameter
      if (openAddModal === 'true') {
        setTimeout(() => {
          parkingStore.showPaymentMethodAddModal()
          // Clear the query parameter
          router.setParams({ openAddModal: undefined })
        }, 300)
      }

      // Load notifications when home screen is focused
      return () => {
        // Home screen unfocused
      }
    }, [trackScreenMount, openAddModal, parkingStore, router]),
  )

  const paymentMethods = parkingStore.paymentMethods
  const form = parkingStore.paymentMethodForm
  const errors = parkingStore.paymentMethodFormErrors
  const ui = parkingStore.paymentMethodUI

  // Focus restoration on session restore
  useEffect(() => {
    if (sessionTimeStamp && ui.showAddModal) {
      const focusedElement = parkingStore.paymentMethodForm.currentFocused
      if (focusedElement === 'nameOnCard') {
        setTimeout(() => {
          nameOnCardRef.current?.focus()
          nameOnCardRef.current?.setSelection(
            form.nameOnCard.length,
            form.nameOnCard.length,
          )
        }, 300)
      } else if (focusedElement === 'cardNumber') {
        setTimeout(() => {
          cardNumberRef.current?.focus()
          cardNumberRef.current?.setSelection(
            form.cardNumber.length,
            form.cardNumber.length,
          )
        }, 300)
      } else if (focusedElement === 'expiryMonth') {
        setTimeout(() => {
          expiryMonthRef.current?.focus()
          expiryMonthRef.current?.setSelection(
            form.expiryMonth.length,
            form.expiryMonth.length,
          )
        }, 300)
      } else if (focusedElement === 'expiryYear') {
        setTimeout(() => {
          expiryYearRef.current?.focus()
          expiryYearRef.current?.setSelection(
            form.expiryYear.length,
            form.expiryYear.length,
          )
        }, 300)
      }
    }
  }, [sessionTimeStamp])

  const validateForm = () => {
    parkingStore.clearPaymentMethodFormErrors()
    let isValid = true

    if (!form.nameOnCard.trim()) {
      parkingStore.setPaymentMethodFormError(
        'nameOnCard',
        'Name on card is required',
      )
      isValid = false
    }

    if (!form.cardNumber || form.cardNumber.length < 16) {
      parkingStore.setPaymentMethodFormError(
        'cardNumber',
        'Valid 16-digit card number is required',
      )
      isValid = false
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
    // Validate month first
    const month = parseInt(form.expiryMonth)
    if (!form.expiryMonth || isNaN(month) || month < 1 || month > 12) {
      parkingStore.setPaymentMethodFormError(
        'expiryMonth',
        'Valid month (1-12) required',
      )
      isValid = false
    }

    // Validate year
    const year2Digit = parseInt(form.expiryYear)
    if (
      !form.expiryYear ||
      isNaN(year2Digit) ||
      year2Digit < 0 ||
      year2Digit > 99
    ) {
      parkingStore.setPaymentMethodFormError(
        'expiryYear',
        'Valid year required',
      )
      isValid = false
    } else {
      // Convert 2-digit year to full year (00-99 maps to 2000-2099 for credit cards)
      const yearFull = 2000 + year2Digit

      // Year must be >= current year
      if (yearFull < currentYear) {
        parkingStore.setPaymentMethodFormError(
          'expiryYear',
          'Year cannot be less than current year',
        )
        isValid = false
      } else if (yearFull === currentYear && !isNaN(month)) {
        // If year is current year, month must be >= current month
        if (month < currentMonth) {
          parkingStore.setPaymentMethodFormError(
            'expiryMonth',
            'Month cannot be less than current month',
          )
          isValid = false
        }
      }
    }

    return isValid
  }

  const handleAddPayment = debounce(async () => {
    if (!validateForm()) return

    try {
      // Alternate between credit_card and debit_card based on existing count
      const creditCardCount = paymentMethods.filter(
        (pm: any) => pm.type === 'credit_card',
      ).length
      const debitCardCount = paymentMethods.filter(
        (pm: any) => pm.type === 'debit_card',
      ).length

      // If equal, add credit_card; otherwise add the one with fewer cards
      const cardType =
        creditCardCount <= debitCardCount ? 'credit_card' : 'debit_card'

      await parkingStore.addPaymentMethod({
        type: cardType,
        cardNumber: form.cardNumber,
        lastFour: form.cardNumber.slice(-4),
        expiryMonth: parseInt(form.expiryMonth),
        expiryYear: parseInt(form.expiryYear),
        displayName: form.nameOnCard,
        isDefault: paymentMethods.length === 0 ? 1 : 0,
      })

      parkingStore.showDialog({
        isSuccess: true,
        message: 'Payment Method Added',
        subMessage: 'Your card has been added successfully',
      })

      parkingStore.hidePaymentMethodAddModal()

      // Navigate back to the screen that requested adding payment method
      if (returnTo) {
        setTimeout(() => {
          router.push(returnTo as any)
        }, 2000) // Wait for dialog to show
      }
    } catch (error) {
      console.error('Failed to add payment method:', error)
      parkingStore.showAlert({
        title: 'Error',
        message: 'Failed to add payment method. Please try again.',
        preset: 'error',
      })
    }
  }, 300)

  const handleDeletePayment = async () => {
    if (!ui.deletePaymentId) return

    try {
      await parkingStore.removePaymentMethod(ui.deletePaymentId)
      parkingStore.showDialog({
        isSuccess: true,
        message: 'Payment Method Deleted',
        subMessage: 'Your card has been removed successfully',
      })
      parkingStore.setDeletePaymentMethodId(null)
    } catch (error) {
      console.error('Failed to delete payment method:', error)
      parkingStore.showAlert({
        title: 'Error',
        message: 'Failed to delete payment method. Please try again.',
        preset: 'error',
      })
      parkingStore.setDeletePaymentMethodId(null)
    }
  }

  const handleSetDefaultPayment = async (paymentId: number) => {
    const payment = paymentMethods.find(p => p.id === paymentId)
    if (payment?.isDefault === 1) return

    try {
      await parkingStore.updatePaymentMethodById(paymentId, { isDefault: 1 })
      parkingStore.showDialog({
        isSuccess: true,
        message: 'Default Payment Updated',
        subMessage: 'Your default payment method has been updated',
      })
    } catch (error) {
      console.error('Failed to set default payment:', error)
      parkingStore.showAlert({
        title: 'Error',
        message: 'Failed to update default payment method.',
        preset: 'error',
      })
    }
  }

  const getCardGradient = useCallback(
    (type: string) => {
      return type === 'credit_card'
        ? [theme.colors.palette.secondary500, theme.colors.palette.primary500]
        : [theme.colors.palette.angry400, theme.colors.palette.angry500]
    },
    [theme],
  )

  const formatCardNumber = (number: string) => {
    if (!number) return '•••• •••• •••• ••••'
    const lastFour = number.slice(-4)
    return `•••• •••• •••• ${lastFour}`
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ]}
          style={styles.emptyIconGradient}
        >
          <Ionicons
            name="card-outline"
            size={64}
            color={theme.colors.palette.primary500}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyText}>No Payment Methods Yet</Text>
      <Text style={styles.emptySubtext}>
        Add a card to make parking payments easier and faster
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => parkingStore.showPaymentMethodAddModal()}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary400,
          ]}
          style={styles.addFirstButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons
            name="add-circle"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.addFirstButtonText}>Add Your First Card</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} preset="subheading">
              Payment Methods
            </Text>
            <Text style={styles.headerSubtitle}>
              Manage your saved payment cards
            </Text>
          </View>
          {paymentMethods.length > 0 && (
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => parkingStore.showPaymentMethodAddModal()}
            >
              <Ionicons
                name="add"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </TouchableOpacity>
          )}
        </View>

        {paymentMethods.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContent}>
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Payment Methods Carousel */}
            <View style={styles.cardsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={width - 48}
                contentContainerStyle={styles.cardsContainer}
              >
                {paymentMethods.map(method => (
                  <LinearGradient
                    key={method.id}
                    colors={getCardGradient(method.type)}
                    style={[styles.paymentCard, styles.cardShadow]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardChip}>
                        <Ionicons
                          name="card"
                          size={20}
                          color={theme.colors.palette.neutral200}
                        />
                      </View>
                      <Text style={styles.cardType}>
                        {method.type === 'credit_card'
                          ? 'Credit Card'
                          : 'Debit Card'}
                      </Text>
                    </View>

                    {/* Card Number */}
                    <Text style={styles.cardNumber}>
                      {formatCardNumber(method.cardNumber)}
                    </Text>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.cardLabel}>CARD HOLDER</Text>
                        <Text style={styles.cardName}>
                          {method.displayName?.toUpperCase() || 'NAME'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cardLabel}>EXPIRES</Text>
                        <Text style={styles.cardExpiry}>
                          {String(method.expiryMonth).padStart(2, '0')}/
                          {method.expiryYear}
                        </Text>
                      </View>
                    </View>

                    {/* Actions Footer */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[
                          styles.defaultBadge,
                          {
                            backgroundColor:
                              method.isDefault === 1
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(255,255,255,0.1)',
                            borderWidth: method.isDefault === 1 ? 0 : 1,
                            borderColor:
                              method.isDefault === 1
                                ? 'transparent'
                                : 'rgba(255,255,255,0.3)',
                          },
                        ]}
                        onPress={() => {
                          if (method.isDefault !== 1) {
                            handleSetDefaultPayment(method.id)
                          }
                        }}
                        activeOpacity={method.isDefault === 1 ? 1 : 0.8}
                        disabled={method.isDefault === 1}
                      >
                        <Text
                          style={{
                            ...styles.defaultText,
                            color:
                              method.isDefault === 1
                                ? theme.colors.palette.neutral100
                                : theme.colors.palette.neutral300,
                          }}
                        >
                          {method.isDefault === 1
                            ? 'Default'
                            : 'Set as Default'}
                        </Text>
                        {method.isDefault === 1 && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={theme.colors.palette.neutral100}
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>

                      {method.isDefault !== 1 && (
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() =>
                            parkingStore.setDeletePaymentMethodId(method.id)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={theme.colors.palette.neutral300}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={theme.colors.palette.primary500}
                />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Secure Payments</Text>
                  <Text style={styles.infoDescription}>
                    Your payment information is encrypted and secure
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons
                  name="time"
                  size={24}
                  color={theme.colors.palette.primary500}
                />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Quick Checkout</Text>
                  <Text style={styles.infoDescription}>
                    Save time with saved payment methods
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Add Payment Modal */}
        <Modal
          visible={ui.showAddModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => parkingStore.hidePaymentMethodAddModal()}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[
                theme.colors.palette.neutral200,
                theme.colors.palette.neutral100,
              ]}
              style={styles.modalBackgroundGradient}
            />
            <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalBackButton}
                  onPress={() => parkingStore.hidePaymentMethodAddModal()}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={theme.colors.palette.neutral900}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle} preset="subheading">
                  Add Payment Method
                </Text>
                <View style={styles.modalSpacer} />
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContent}
              >
                <ScrollView
                  contentContainerStyle={styles.formContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Card Preview */}
                  <LinearGradient
                    colors={getCardGradient(
                      form.cardNumber.charAt(0) === '4'
                        ? 'credit_card'
                        : 'debit_card',
                    )}
                    style={styles.previewCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.previewChip}>
                      <Ionicons
                        name="card"
                        size={16}
                        color={theme.colors.palette.neutral200}
                      />
                    </View>
                    <Text style={styles.previewCardNumber}>
                      {formatCardNumber(form.cardNumber)}
                    </Text>
                    <View style={styles.previewFooter}>
                      <Text style={styles.previewName}>
                        {form.nameOnCard.toUpperCase() || 'YOUR NAME'}
                      </Text>
                      <Text style={styles.previewExpiry}>
                        {form.expiryMonth.padStart(2, '0') || 'MM'}/
                        {form.expiryYear || 'YY'}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Form Fields */}
                  <View style={styles.formCard}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Name on Card *</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          errors.nameOnCard && styles.inputError,
                          form.currentFocused === 'nameOnCard' &&
                            styles.inputFocused,
                        ]}
                      >
                        <TextInput
                          ref={nameOnCardRef}
                          style={styles.input}
                          value={form.nameOnCard}
                          onChangeText={text =>
                            parkingStore.setPaymentMethodFormField(
                              'nameOnCard',
                              text,
                            )
                          }
                          onFocus={() =>
                            parkingStore.setPaymentMethodFormFocused(
                              'nameOnCard',
                            )
                          }
                          onBlur={() =>
                            parkingStore.setPaymentMethodFormFocused(null)
                          }
                          placeholder="Enter cardholder name"
                          placeholderTextColor={theme.colors.palette.neutral400}
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.nameOnCard && (
                        <Text style={styles.errorText}>
                          {errors.nameOnCard}
                        </Text>
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Card Number *</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          errors.cardNumber && styles.inputError,
                          form.currentFocused === 'cardNumber' &&
                            styles.inputFocused,
                        ]}
                      >
                        <TextInput
                          ref={cardNumberRef}
                          style={styles.input}
                          value={form.cardNumber || ''}
                          onChangeText={text =>
                            parkingStore.setPaymentMethodFormField(
                              'cardNumber',
                              text.replace(/\D/g, ''),
                            )
                          }
                          onFocus={() =>
                            parkingStore.setPaymentMethodFormFocused(
                              'cardNumber',
                            )
                          }
                          onBlur={() =>
                            parkingStore.setPaymentMethodFormFocused(null)
                          }
                          placeholder="1234567890123456"
                          placeholderTextColor={theme.colors.palette.neutral400}
                          keyboardType="number-pad"
                          maxLength={16}
                        />
                      </View>
                      {errors.cardNumber && (
                        <Text style={styles.errorText}>
                          {errors.cardNumber}
                        </Text>
                      )}
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Expiry Month *</Text>
                        <View
                          style={[
                            styles.inputContainer,
                            errors.expiryMonth && styles.inputError,
                            form.currentFocused === 'expiryMonth' &&
                              styles.inputFocused,
                          ]}
                        >
                          <TextInput
                            ref={expiryMonthRef}
                            style={styles.input}
                            value={form.expiryMonth || ''}
                            onChangeText={text =>
                              parkingStore.setPaymentMethodFormField(
                                'expiryMonth',
                                text.replace(/\D/g, ''),
                              )
                            }
                            onFocus={() =>
                              parkingStore.setPaymentMethodFormFocused(
                                'expiryMonth',
                              )
                            }
                            onBlur={() =>
                              parkingStore.setPaymentMethodFormFocused(null)
                            }
                            placeholder="MM"
                            placeholderTextColor={
                              theme.colors.palette.neutral400
                            }
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                        </View>
                        {errors.expiryMonth && (
                          <Text style={styles.errorText}>
                            {errors.expiryMonth}
                          </Text>
                        )}
                      </View>

                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Expiry Year *</Text>
                        <View
                          style={[
                            styles.inputContainer,
                            errors.expiryYear && styles.inputError,
                            form.currentFocused === 'expiryYear' &&
                              styles.inputFocused,
                          ]}
                        >
                          <TextInput
                            ref={expiryYearRef}
                            style={styles.input}
                            value={form.expiryYear || ''}
                            onChangeText={text =>
                              parkingStore.setPaymentMethodFormField(
                                'expiryYear',
                                text.replace(/\D/g, ''),
                              )
                            }
                            onFocus={() =>
                              parkingStore.setPaymentMethodFormFocused(
                                'expiryYear',
                              )
                            }
                            onBlur={() =>
                              parkingStore.setPaymentMethodFormFocused(null)
                            }
                            placeholder="YY"
                            placeholderTextColor={
                              theme.colors.palette.neutral400
                            }
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                        </View>
                        {errors.expiryYear && (
                          <Text style={styles.errorText}>
                            {errors.expiryYear}
                          </Text>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleAddPayment}
                    >
                      <LinearGradient
                        colors={[
                          theme.colors.palette.primary500,
                          theme.colors.palette.primary400,
                        ]}
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>Add Card</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Delete Confirmation Alert */}
        <FancyAlert
          visible={ui.deletePaymentId !== null}
          title="Delete Payment Method"
          message="Are you sure you want to delete this payment method?"
          preset="delete"
          confirmText="Delete"
          cancelText="Cancel"
          onClose={() => parkingStore.setDeletePaymentMethodId(null)}
          onConfirm={handleDeletePayment}
        />

        {/* Success Dialog */}
        <SuccessDialog
          visible={parkingStore.dialogState.visible}
          onClose={() => parkingStore.hideDialog()}
          isSuccess={parkingStore.dialogState.isSuccess}
          message={parkingStore.dialogState.message}
          subMessage={parkingStore.dialogState.subMessage}
        />

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
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    headerAddButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 20,
      justifyContent: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    emptyIconContainer: {
      marginBottom: 24,
    },
    emptyIconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 15,
      color: theme.colors.palette.neutral500,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    addFirstButton: {
      borderRadius: 12,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    addFirstButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    addFirstButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    cardsSection: {
      marginTop: 24,
    },
    cardsContainer: {
      paddingHorizontal: 24,
    },
    paymentCard: {
      width: width - 48,
      marginRight: 16,
      borderRadius: 20,
      padding: 24,
      minHeight: 200,
    },
    cardShadow: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    cardChip: {
      width: 40,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardType: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral300,
    },
    cardNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral300,
      letterSpacing: 2,
      fontFamily: 'monospace',
      marginBottom: 24,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    cardLabel: {
      fontSize: 10,
      color: theme.colors.palette.neutral300,
      fontWeight: '600',
      marginBottom: 4,
      letterSpacing: 1,
    },
    cardName: {
      fontSize: 14,
      color: theme.colors.palette.neutral300,
      fontWeight: '600',
    },
    cardExpiry: {
      fontSize: 14,
      color: theme.colors.palette.neutral300,
      fontWeight: '600',
      fontFamily: 'monospace',
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    defaultBadge: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    defaultText: {
      fontSize: 12,
      fontWeight: '600',
    },
    deleteIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,0,0,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoSection: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 16,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    infoText: {
      flex: 1,
      marginLeft: 16,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    infoDescription: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      lineHeight: 20,
    },
    modalContainer: {
      flex: 1,
    },
    modalBackgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalSafeArea: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    modalBackButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      color: theme.colors.palette.neutral900,
      flex: 1,
      textAlign: 'center',
    },
    modalSpacer: {
      width: 40,
    },
    modalContent: {
      flex: 1,
    },
    formContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    previewCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      minHeight: 180,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
    },
    previewChip: {
      width: 35,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    previewCardNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral300,
      letterSpacing: 2,
      fontFamily: 'monospace',
      marginBottom: 20,
    },
    previewFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewName: {
      fontSize: 12,
      color: theme.colors.palette.neutral300,
      fontWeight: '600',
    },
    previewExpiry: {
      fontSize: 12,
      color: theme.colors.palette.neutral300,
      fontWeight: '600',
      fontFamily: 'monospace',
    },
    formCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    field: {
      marginBottom: 16,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: theme.colors.palette.neutral200,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      overflow: 'hidden',
    },
    inputFocused: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.neutral100,
    },
    input: {
      padding: 14,
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
    },
    submitButton: {
      borderRadius: 12,
      marginTop: 8,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    submitButtonGradient: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default PaymentScreen
