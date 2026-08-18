// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Screen } from '@/components'
import { useTransaction } from '@/hooks/useTransaction'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { memo, useCallback, useEffect, useState } from 'react'
import { Alert, Dimensions, Platform, StyleSheet } from 'react-native'
import { AmountScreen } from './_components/AmountScreen'
import { HeaderSection } from './_components/HeaderSection'
import { MethodScreen } from './_components/MethodScreen'
import { PinScreen } from './_components/PinScreen'

export const WithdrawScreen = memo(() => {
  const { theme } = useAppTheme()
  const { userStore, sessionStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const { createWithdrawalTransaction, verifyPin, isLoading } = useTransaction()
  const { width, height } = Dimensions.get('window')
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Withdraw', '/screens/payment/withdraw')
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

            // Track content change after state restoration
            trackContentChange({
              event: 'session_state_restored',
              restoredState: savedState,
              timestamp: Date.now(),
            })
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

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      // Track the screen mount with current state
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
  }, [trackClick])

  const handlePinChange = useCallback((value: string) => {
    setPin(value)
  }, [])

  const handlePinContinue = useCallback(async () => {
    trackClick('pin_continue')
    try {
      if (!userStore.currentUser?.email || !amount || !selectedMethod) {
        Alert.alert('Error', 'Missing required withdrawal details')
        return
      }

      const isVerified = await verifyPin(pin)
      if (!isVerified) {
        Alert.alert('Error', 'Invalid PIN. Please try again.')
        setPin('')
        return
      }

      const transaction = await createWithdrawalTransaction({
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
          pathname: '/screens/payment/withdrawal-success',
          params: {
            transactionId: transaction.id,
            sessionId, // Pass sessionId to next screen
          },
        })
      } else {
        // For failed transactions, show error
        throw new Error(transaction.error || 'Withdrawal failed')
      }
    } catch (error) {
      console.error('Withdrawal failed:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Withdrawal failed. Please try again.'

      if (errorMessage.includes('No active wallet')) {
        Alert.alert(
          'No Active Wallet',
          'Please ensure you have an active wallet before making a withdrawal.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        )
      } else if (errorMessage.includes('Insufficient balance')) {
        Alert.alert(
          'Insufficient Balance',
          'You do not have enough balance for this withdrawal.',
          [
            {
              text: 'OK',
              onPress: () => setAmount(''),
            },
          ],
        )
      } else {
        Alert.alert('Withdrawal Failed', errorMessage, [
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
    createWithdrawalTransaction,
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
        trackClick('exit_withdraw')
        router.back()
    }
  }, [currentStep])

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'amount':
        return (
          <AmountScreen
            amount={amount}
            onAmountChange={handleAmountChange}
            onQuickAmountPress={handleQuickAmountPress}
            onContinue={handleAmountContinue}
            type="withdrawal"
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
            type="withdrawal"
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
            type="withdrawal"
          />
        )
      default:
        return null
    }
  }

  const styles = createStyles(theme)

  return (
    <Screen preset="auto" style={styles.screen}>
      <HeaderSection
        currentStep={currentStep}
        onBack={handleBack}
        type="withdrawal"
      />

      {renderCurrentStep()}
    </Screen>
  )
})

WithdrawScreen.displayName = 'WithdrawScreen'

export default WithdrawScreen

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
  })
