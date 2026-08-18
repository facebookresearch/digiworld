// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Screen } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useTransaction } from '@/hooks/useTransaction'
import { useStores } from '@/models/helpers/useStores'
import { useAppTheme } from '@andojo/shared-theme'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { memo, useCallback, useEffect, useState } from 'react'
import { Alert, Dimensions, Platform, StyleSheet } from 'react-native'
import { AmountScreen } from './_components/AmountScreen'
import { HeaderSection } from './_components/HeaderSection'
import { MethodScreen } from './_components/MethodScreen'
import { PinScreen } from './_components/PinScreen'

export const AddMoneyScreen = memo(() => {
  const { theme } = useAppTheme()
  const { userStore, sessionStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { createDepositeTransaction, verifyPin, isLoading } = useTransaction()
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('AddMoney', '/screens/payment/add-money')
  const [currentStep, setCurrentStep] = useState<'amount' | 'method' | 'pin'>(
    'amount',
  )
  const [amount, setAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [pin, setPin] = useState('')

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      const session = sessionStore.getSession(sessionId as string)

      if (session?.data?.sessionData) {
        const savedState = session.data.sessionData.formData as any

        // Restore state from session if needed
        if (savedState) {
          try {
            // Restore UI states with safety checks
            if (savedState.currentStep) {
              setCurrentStep(savedState.currentStep)
            }
            if (savedState.amount !== undefined) {
              setAmount(String(savedState.amount))
            }
            if (savedState.selectedMethod) {
              setSelectedMethod(savedState.selectedMethod)
            }
          } catch (error) {
            console.error('Error restoring session state:', error)
          }
        }
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [sessionTimeStamp, sessionStore])

  // Save state to session when changes occur

  // Track screen mount and restore state
  useFocusEffect(
    useCallback(() => {
      // First, track the screen mount
      trackScreenMount({
        currentStep,
        hasAmount: !!amount,
        hasSelectedMethod: !!selectedMethod,
        selectedMethod,
        amount,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
        sessionId,
      })

      // If we have a session, check if we need to restore any state
    }, [
      currentStep,
      amount,
      selectedMethod,
      sessionId,
      width,
      height,
      trackScreenMount,
    ]),
  )

  const handleAmountChange = (text: string) => {
    // Only allow numbers and a single decimal point
    const filtered = text.replace(/[^0-9.]/g, '')

    // Ensure only one decimal point
    const parts = filtered.split('.')
    if (parts.length > 2) return

    // Limit to 2 decimal places
    if (parts.length > 1 && parts[1].length > 2) return

    setAmount(filtered)
    trackContentChange({
      event: 'amount_changed',
      amount: filtered,
      timestamp: Date.now(),
    })
  }

  const handleQuickAmountPress = useCallback((value: string) => {
    setAmount(value)
    trackClick('quick_amount_selected')
    trackContentChange({
      event: 'quick_amount_selected',
      amount: value,
      timestamp: Date.now(),
    })
  }, [])

  const handleAmountContinue = useCallback(() => {
    trackClick('amount_continue')
    setCurrentStep('method')
  }, [])

  const handleMethodSelect = useCallback((methodId: string) => {
    trackClick(`method_selected_${methodId}`)
    setSelectedMethod(methodId)
  }, [])

  const handleMethodContinue = useCallback(() => {
    trackClick('method_continue')
    setCurrentStep('pin')
  }, [])

  const handlePinChange = useCallback((value: string) => {
    setPin(value)
  }, [])

  const handlePinContinue = useCallback(async () => {
    trackClick('pin_continue')
    try {
      if (!userStore.currentUser?.email || !amount || !selectedMethod) {
        Alert.alert('Error', 'Missing required transaction details')
        return
      }

      const isVerified = await verifyPin(pin)
      if (!isVerified) {
        Alert.alert('Error', 'Invalid PIN. Please try again.')
        setPin('')
        return
      }

      const transaction = await createDepositeTransaction({
        amount: parseFloat(amount),
        method: selectedMethod,
        email: userStore.currentUser.email,
        pinVerified: 1,
        pinVerifiedAt: new Date().toISOString(),
      })

      // Check if transaction ID exists
      if (!transaction.id) {
        throw new Error('Transaction created but no ID returned')
      }

      // Handle different transaction statuses
      if (transaction.success) {
        router.replace({
          pathname: '/screens/payment/deposit-success',
          params: {
            transactionId: transaction.id,
            sessionId, // Pass sessionId to next screen
          },
        })
      } else {
        // For failed transactions, show error
        throw new Error(transaction.error || 'Transaction failed')
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Transaction failed. Please try again.'

      if (errorMessage.includes('No active wallet')) {
        Alert.alert(
          'No Active Wallet',
          'Please ensure you have an active wallet before making a transaction.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        )
      } else {
        Alert.alert('Transaction Failed', errorMessage, [
          {
            text: 'OK',
            onPress: () => setPin(''),
          },
        ])
      }
    }
  }, [
    amount,
    selectedMethod,
    pin,
    userStore.currentUser?.email,
    createDepositeTransaction,
    verifyPin,
    sessionId,
    trackClick,
  ])

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'method':
        trackClick('back_to_amount')
        setCurrentStep('amount')
        break
      case 'pin':
        trackClick('back_to_method')
        setCurrentStep('method')
        break
      default:
        trackClick('exit_add_money')
        router.back()
    }
  }, [currentStep, trackClick])

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'amount':
        return (
          <AmountScreen
            amount={amount}
            onAmountChange={handleAmountChange}
            onQuickAmountPress={handleQuickAmountPress}
            onContinue={handleAmountContinue}
          />
        )
      case 'method':
        return (
          <MethodScreen
            amount={amount}
            selectedMethod={selectedMethod}
            onMethodSelect={handleMethodSelect}
            onBack={handleBack}
            onContinue={handleMethodContinue}
            isLoading={isLoading}
          />
        )
      case 'pin':
        return (
          <PinScreen
            pin={pin}
            onPinChange={handlePinChange}
            onBack={handleBack}
            onContinue={handlePinContinue}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  const styles = createStyles(theme)

  return (
    <Screen preset="auto" style={styles.screen}>
      <HeaderSection currentStep={currentStep} onBack={handleBack} />

      {renderCurrentStep()}
    </Screen>
  )
})

AddMoneyScreen.displayName = 'AddMoneyScreen'

export default AddMoneyScreen

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
  })
