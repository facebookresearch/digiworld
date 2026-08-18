// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models'
import { useRouter, Stack, useFocusEffect } from 'expo-router'
import { AnimatedBackground, Glassmorphic, AppDialog } from '@/components'
import { useInputRefs } from '@/hooks/useInputRefs'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'

export default observer(function AddPaymentMethodScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, auctionStore, uiStore } = useStores()
  const { registerRef, focusFieldAtEnd } = useInputRefs()
  const { trackScreenMount } = useInteractionTracking(
    'add-payment-method',
    '/payments/add',
  )

  // Create refs for each input field
  const cardNumberRef = useRef<TextInput>(null)
  const expiryRef = useRef<TextInput>(null)
  const cvvRef = useRef<TextInput>(null)
  const cardHolderNameRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'add-payment-method',
        route: '/payments/add',
      })
    }, [trackScreenMount]),
  )

  useFocusEffect(
    useCallback(() => {
      // Register refs when screen comes into focus
      registerRef('cardNumber', cardNumberRef.current)
      registerRef('expiry', expiryRef.current)
      registerRef('cvv', cvvRef.current)
      registerRef('cardHolderName', cardHolderNameRef.current)

      // Cleanup: Reset form when screen is unmounted/popped
      return () => {
        uiStore.resetAddPaymentMethodForm()
      }
    }, [registerRef, uiStore]),
  )

  // Handle focus restoration from deeplink/session
  useEffect(() => {
    const focusedField = uiStore.addPaymentMethodForm.currentFocused
    if (focusedField) {
      const form = uiStore.addPaymentMethodForm
      const value =
        focusedField === 'cardNumber'
          ? form.cardNumber
          : focusedField === 'expiry'
            ? form.expiry
            : focusedField === 'cvv'
              ? form.cvv
              : focusedField === 'cardHolderName'
                ? form.cardHolderName
                : ''
      setTimeout(() => {
        focusFieldAtEnd(focusedField, value)
      }, 300)
    }
  }, [uiStore.addPaymentMethodForm.currentFocused, focusFieldAtEnd])

  const handleAddCard = async () => {
    const { cardNumber, expiry, cvv, cardHolderName, isDefault } =
      uiStore.addPaymentMethodForm
    if (!cardNumber || !expiry || !cvv || !cardHolderName) {
      uiStore.setAddPaymentMethodDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please fill in all fields',
      })
      return
    }

    if (!userStore.user) return

    uiStore.setAddPaymentMethodLoading(true)
    try {
      let cardType = 'Unknown'
      if (cardNumber.startsWith('4')) cardType = 'Visa'
      else if (cardNumber.startsWith('5')) cardType = 'Mastercard'
      else if (cardNumber.startsWith('3')) cardType = 'Amex'
      else cardType = 'Visa' // Default for mock

      await auctionStore.addUserPaymentMethod({
        userId: userStore.user.id,
        cardType,
        cardNumber,
        expiry,
        cardHolderName,
        isDefault,
      })

      router.back()
    } catch (error: any) {
      uiStore.setAddPaymentMethodDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add card',
      })
    } finally {
      uiStore.setAddPaymentMethodLoading(false)
    }
  }

  // Format card number with spaces
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    if (formatted.length <= 19) {
      uiStore.setCardNumber(formatted)
    }
  }

  // Format expiry date MM/YY
  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      uiStore.setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`)
    } else {
      uiStore.setExpiry(cleaned)
    }
  }

  return (
    <AnimatedBackground>
      <Stack.Screen
        options={{ title: 'Add Card', headerBackTitle: 'Payments' }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
              Add Payment Method
            </Text>
            <Text
              style={{ ...styles.headerSubtitle, color: theme.colors.textDim }}
            >
              Enter your card details
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Glassmorphic
            borderRadius={20}
            padding={24}
            variant="strong"
            style={styles.formContainer}
          >
            <View style={styles.inputGroup}>
              <Text style={{ ...styles.label, color: theme.colors.textDim }}>
                Card Number
              </Text>
              <TextInput
                ref={cardNumberRef}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="numeric"
                value={uiStore.addPaymentMethodForm.cardNumber}
                onChangeText={handleCardNumberChange}
                onFocus={() => uiStore.setAddPaymentMethodFocused('cardNumber')}
                onBlur={() => uiStore.setAddPaymentMethodFocused(null)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={{ ...styles.label, color: theme.colors.textDim }}>
                  Expiry Date
                </Text>
                <TextInput
                  ref={expiryRef}
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="numeric"
                  value={uiStore.addPaymentMethodForm.expiry}
                  onChangeText={handleExpiryChange}
                  onFocus={() => uiStore.setAddPaymentMethodFocused('expiry')}
                  onBlur={() => uiStore.setAddPaymentMethodFocused(null)}
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={{ ...styles.label, color: theme.colors.textDim }}>
                  CVV
                </Text>
                <TextInput
                  ref={cvvRef}
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="123"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="numeric"
                  value={uiStore.addPaymentMethodForm.cvv}
                  onChangeText={uiStore.setCvv}
                  onFocus={() => uiStore.setAddPaymentMethodFocused('cvv')}
                  onBlur={() => uiStore.setAddPaymentMethodFocused(null)}
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={{ ...styles.label, color: theme.colors.textDim }}>
                Card Holder Name
              </Text>
              <TextInput
                ref={cardHolderNameRef}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="John Doe"
                placeholderTextColor={theme.colors.textDim}
                value={uiStore.addPaymentMethodForm.cardHolderName}
                onChangeText={uiStore.setCardHolderName}
                onFocus={() =>
                  uiStore.setAddPaymentMethodFocused('cardHolderName')
                }
                onBlur={() => uiStore.setAddPaymentMethodFocused(null)}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                uiStore.setIsDefault(!uiStore.addPaymentMethodForm.isDefault)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: theme.colors.tint,
                    backgroundColor: uiStore.addPaymentMethodForm.isDefault
                      ? theme.colors.tint
                      : 'transparent',
                  },
                ]}
              >
                {uiStore.addPaymentMethodForm.isDefault && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.colors.palette.neutral100}
                  />
                )}
              </View>
              <Text
                style={{ ...styles.checkboxLabel, color: theme.colors.text }}
              >
                Set as default payment method
              </Text>
            </TouchableOpacity>
          </Glassmorphic>
          {/*
                    <View style={styles.mockCardsInfo}>
                        <Text style={[styles.mockTitle, { color: theme.colors.textDim }]}>Mock Cards for Testing:</Text>
                        {auctionStore.mockCards.map(card => (
                            <TouchableOpacity
                                key={card.id}
                                onPress={() => {
                                    setCardNumber(card.cardNumber)
                                    setExpiry('12/25')
                                    setCvv('123')
                                    setCardHolderName('Test User')
                                }}
                                style={styles.mockCardItem}
                            >
                                <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>
                                    {card.cardNumber} ({card.alwaysSucceeds ? 'Success' : 'Fail'})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View> */}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleAddCard}
            activeOpacity={0.8}
            disabled={uiStore.addPaymentMethodForm.isLoading}
            style={styles.buttonWrapper}
          >
            <Glassmorphic
              borderRadius={16}
              padding={16}
              backgroundColor={theme.colors.tint}
              style={
                uiStore.addPaymentMethodForm.isLoading
                  ? { ...styles.button, opacity: 0.7 }
                  : styles.button
              }
            >
              <Text style={styles.buttonText}>
                {uiStore.addPaymentMethodForm.isLoading
                  ? 'Adding...'
                  : 'Add Card'}
              </Text>
            </Glassmorphic>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <AppDialog
        visible={uiStore.addPaymentMethodForm.dialog.visible}
        type={
          uiStore.addPaymentMethodForm.dialog.type as
            | 'success'
            | 'error'
            | 'info'
        }
        title={uiStore.addPaymentMethodForm.dialog.title || undefined}
        message={uiStore.addPaymentMethodForm.dialog.message}
        onClose={() => uiStore.hideAddPaymentMethodDialog()}
      />
    </AnimatedBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
    },
    backButton: {
      padding: 4,
      marginLeft: -4,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '500',
    },
    content: {
      padding: 20,
      paddingBottom: 20,
    },
    formContainer: {
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: 'transparent',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkboxLabel: {
      fontSize: 16,
    },
    footer: {
      padding: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    buttonWrapper: {
      width: '100%',
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    mockCardsInfo: {
      padding: 10,
    },
    mockTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    mockCardItem: {
      paddingVertical: 4,
    },
  })
