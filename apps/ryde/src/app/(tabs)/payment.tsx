import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Screen, Text, Icon, useAppTheme, Theme } from '@andojo/shared-theme'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { queries } from '@/db/queries'
import { mutations } from '@/db/mutations'
import { userPaymentMethods } from '@/db/schema'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { observer } from 'mobx-react-lite'

type PaymentMethod = typeof userPaymentMethods.$inferSelect

const PaymentMethodsScreen = () => {
  const { theme } = useAppTheme()
  const { userStore, sessionStore, uiStore } = useStores()
  const router = useRouter()
  const styles = createStyles(theme.colors)
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Payment', '/(tabs)/payment')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()

  const userId = userStore.currentUser?.id

  // Load session data from interaction tracking
  useEffect(() => {
    if (sessionTimeStamp) {
      try {
        const session = sessionStore.getSession()
        const sessionInfo = session?.data as any

        if (sessionInfo?.sessionData?.formData) {
          const formData = sessionInfo.sessionData.formData

          console.log('Restoring Payment from session:', {
            paymentMethodsCount: formData.paymentMethods?.length || 0,
            lastUpdated: formData.lastUpdated,
          })

          // Restore payment methods data if available
          if (
            formData.paymentMethods &&
            Array.isArray(formData.paymentMethods)
          ) {
            setPaymentMethods(formData.paymentMethods)
          }

          // Restore loading states
          if (typeof formData.loading === 'boolean') {
            setLoading(formData.loading)
          }

          if (typeof formData.error === 'string') {
            setError(formData.error)
          }
        }
      } catch (error) {
        console.error('Error loading Payment session data:', error)
      }
    }
  }, [sessionTimeStamp, sessionStore, sessionId])

  // State saving is now handled directly in fetchPaymentMethods

  // Save initial state to session when component mounts
  useEffect(() => {
    if (sessionId && paymentMethods.length > 0 && !sessionTimeStamp) {
      console.log('Saving initial payment methods state to session:', {
        paymentMethodsCount: paymentMethods.length,
      })

      trackContentChange({
        paymentMethods, // Save the actual payment methods array
        loading,
        error,
        lastUpdated: Date.now(),
        screen: 'Payment',
        route: '/(tabs)/payment',
        paymentMethodsCount: paymentMethods.length,
      })
    }
  }, [paymentMethods, loading, error, sessionId, sessionTimeStamp])

  const fetchPaymentMethods = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setError('You must be logged in to view payment methods.')
      return
    }

    try {
      setLoading(true)

      const methods = await queries.getPaymentMethodsForUser(userId)
      setPaymentMethods(methods)
      setError(null)

      // Save payment methods data to session immediately after fetch
      console.log('Saving payment methods data to session after fetch:', {
        paymentMethodsCount: methods.length,
        sessionId,
      })

      trackContentChange({
        paymentMethods: methods, // Save the actual payment methods array
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        screen: 'Payment',
        route: '/(tabs)/payment',
        paymentMethodsCount: methods.length,
      })
    } catch (e) {
      setError('Failed to fetch payment methods.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial data fetch only when not restoring from session
  useEffect(() => {
    if (!sessionTimeStamp) {
      fetchPaymentMethods()
    }
  }, [userId, sessionTimeStamp, fetchPaymentMethods])

  useEffect(() => {
    fetchPaymentMethods()
  }, [uiStore.mockDataAppendTime])

  useEffect(() => {
    trackScreenMount({ timestamp: Date.now() })
  }, [])

  const handleSetDefault = async (paymentMethodId: number) => {
    if (!userId) {
      setError('You must be logged in to perform this action.')
      return
    }

    const result = await mutations.setDefaultUserPaymentMethod(
      userId,
      paymentMethodId,
    )
    if (result.success) {
      // Refresh the list to show the new default
      fetchPaymentMethods()
    } else {
      setError('Failed to set default payment method.')
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Payment',
        route: '/(tabs)/payment',
      })
    }, [trackScreenMount]),
  )

  const handleAddNewPaymentMethod = async (
    type: 'credit_card' | 'digital_wallet',
  ) => {
    if (!userId) {
      setError('You must be logged in to perform this action.')
      return
    }

    const newMethod =
      type === 'credit_card'
        ? {
            provider: ['Visa', 'Mastercard', 'Amex'][
              Math.floor(Math.random() * 3)
            ],
            accountNumber: Math.random().toString().slice(2, 6).toString(),
            type: 'credit_card' as const,
          }
        : {
            provider: 'PayPal',
            accountNumber: '••••' + Math.random().toString().slice(2, 6),
            type: 'digital_wallet' as const,
          }

    const result = await mutations.createUserPaymentMethod({
      ...newMethod,
      userId,
    })

    if (result.success) {
      fetchPaymentMethods()
    } else {
      setError('Failed to add new payment method.')
    }
  }

  const renderItem = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.itemContainer}>
      <Icon
        icon={item.type === 'credit_card' ? 'settings' : 'menu'}
        size={24}
        color={theme.colors.tint}
        style={styles.icon}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.providerText}>
          {item.provider} ({item.accountNumber})
        </Text>
        {item.isDefault ? (
          <Text style={styles.defaultText}>Default</Text>
        ) : (
          <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderListFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={styles.footerHeader}>Add a payment method</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddNewPaymentMethod('credit_card')}
      >
        <Text style={styles.addButtonText}>Add Credit/Debit Card</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddNewPaymentMethod('digital_wallet')}
      >
        <Text style={styles.addButtonText}>Link PayPal</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.neutral700,
          theme.colors.palette.neutral800,
        ]}
        style={styles.gradient}
      >
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </LinearGradient>
    )
  }

  if (error) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.neutral700,
          theme.colors.palette.neutral800,
        ]}
        style={styles.gradient}
      >
        <Text style={styles.errorText}>{error}</Text>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.neutral700,
        theme.colors.palette.neutral800,
      ]}
      style={styles.gradient}
    >
      <Screen style={styles.container} safeAreaEdges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              trackClick('backButton')
              router.back()
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Payment Methods</Text>
        </View>
        <FlatList
          data={paymentMethods}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Your Saved Methods</Text>
          }
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.listContent}
        />
      </Screen>
    </LinearGradient>
  )
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    backButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.palette.neutral200,
    },
    listHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.palette.neutral200,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 10,
    },
    listContent: {
      paddingBottom: 20,
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral800,
      padding: 16,
      marginHorizontal: 16,
      borderRadius: 8,
      marginBottom: 12,
    },
    icon: {
      marginRight: 16,
    },
    detailsContainer: {
      flex: 1,
    },
    providerText: {
      fontSize: 16,
      color: colors.palette.neutral100,
      marginBottom: 4,
    },
    defaultText: {
      fontSize: 14,
      color: colors.tint,
    },
    setDefaultText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: 'bold',
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
    },
    footerContainer: {
      marginTop: 24,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 24,
    },
    footerHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.palette.neutral200,
      marginBottom: 16,
    },
    addButton: {
      backgroundColor: colors.palette.neutral800,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
    },
    addButtonText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    gradient: {
      flex: 1,
    },
  })

export default observer(PaymentMethodsScreen)
