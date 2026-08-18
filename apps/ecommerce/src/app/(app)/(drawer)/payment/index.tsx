import React, { useState, useEffect, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Header, Text } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Fontisto, MaterialIcons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert } from '@/components/FancyAlert'

export default observer(function PaymentMethodsScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setIsLoading] = useState(true)
  const [, setIsSessionLoaded] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null)
  const toast = useToast()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('PaymentMethods', '/(app)/(drawer)/payment')

  // Load session data if it exists
  useEffect(() => {
    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData) {
          trackContentChange(sessionData.sessionData)
        }

        setIsSessionLoaded(true)
      }
    }
  }, [sessionId, timeStamp])

  // Track screen mount and load data
  useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      paymentMethodCount: userStore.paymentMethods.length,
      hasDefaultMethod: userStore.paymentMethods.some(
        method => method.isDefault,
      ),
    })
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true)
      await userStore.loadPaymentMethodsFromDb()
      trackContentChange({
        paymentMethodsLoaded: true,
        count: userStore.paymentMethods.length,
        hasDefault: userStore.paymentMethods.some(method => method.isDefault),
      })
    } catch (error) {
      console.log('Failed to load payment methods', error)
      trackContentChange({ paymentMethodsLoaded: false, error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPayment = () => {
    trackClick('addNewPayment')
    if (userStore.paymentMethods.length >= 2) {
      trackContentChange({ maxLimitReached: true })
      toast.show({
        title: 'Maximum 2 payment methods allowed',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
      return
    }
    router.push('/payment/new')
  }

  const handleSetDefault = async (id: number) => {
    trackClick('setDefaultPayment')
    try {
      setIsProcessing(true)
      await userStore.setDefaultPaymentMethod(id)
      trackContentChange({ setDefaultSuccess: true, paymentMethodId: id })
      toast.show({
        title: 'Default payment method updated',
        preset: 'success',
        placement: 'top',
        duration: 3000,
      })
    } catch (error) {
      trackContentChange({
        setDefaultSuccess: false,
        paymentMethodId: id,
        error: String(error),
      })
      toast.show({
        title: 'Failed to set default payment method',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (id: number) => {
    trackClick('deletePaymentAttempt')
    setDeletePaymentId(id)
  }

  const confirmDeletePayment = async () => {
    if (!deletePaymentId) return

    try {
      setIsProcessing(true)
      await userStore.deletePaymentMethod(deletePaymentId)
      trackContentChange({
        deletePaymentSuccess: true,
        paymentMethodId: deletePaymentId,
      })
      toast.show({
        title: 'Payment method deleted',
        preset: 'success',
        placement: 'top',
        duration: 3000,
      })
    } catch (error) {
      trackContentChange({
        deletePaymentSuccess: false,
        paymentMethodId: deletePaymentId,
        error: String(error),
      })
      toast.show({
        title: 'Failed to delete payment method',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
      setDeletePaymentId(null)
    }
  }

  const renderPaymentMethod = (method: any) => {
    return (
      <View
        key={method.id}
        style={[styles.card, method.isDefault && styles.cardDefault]}
      >
        <View style={styles.cardHeader}>
          <Fontisto
            name={method.cardType?.toLowerCase().split(' ').join('-') as any}
            size={24}
            color={theme.colors.palette.neutral600}
          />
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardNumber}>
            XXXX XXXX XXX {method.cardNumber?.slice(-4) || ''}
          </Text>
          <Text style={styles.cardName}>{method.nameOnCard}</Text>
          <Text style={styles.cardExpiry}>
            Expires {method.expiryMonth}/{method.expiryYear}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {!method.isDefault && userStore.paymentMethods.length >= 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <Text style={styles.actionButtonText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          {!method.isDefault && userStore.paymentMethods.length > 1 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(method.id)}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const EmptyPaymentMethods = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="credit-card"
        size={64}
        color={theme.colors.palette.neutral400}
      />
      <Text style={styles.emptyTitle}>No Payment Methods Yet</Text>
      <Text style={styles.emptyText}>
        Your payment methods will show up here once you add them
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={handleAddPayment}
      >
        <Text style={styles.addFirstButtonText}>
          Add Your First Payment Method
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isProcessing} message="Processing..." />
      <Header
        title="Payment Methods"
        leftIcon="back"
        onLeftPress={() => router.back()}
        RightActionComponent={
          userStore.paymentMethods.length < 2 ? (
            <TouchableOpacity
              onPress={handleAddPayment}
              style={styles.headerAddButton}
            >
              <MaterialIcons
                name="add"
                size={24}
                color={theme.colors.palette.primary500}
              />
            </TouchableOpacity>
          ) : undefined
        }
      />
      {userStore.paymentMethods.length === 0 ? (
        <EmptyPaymentMethods />
      ) : (
        <>
          <FlatList
            style={styles.content}
            data={userStore.paymentMethods}
            renderItem={({ item }) => renderPaymentMethod(item)}
            keyExtractor={item => item?.id?.toString()}
            contentContainerStyle={styles.contentContainer}
          />
          {userStore.paymentMethods.length < 2 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPayment}
              >
                <Text style={styles.addButtonText}>Add New Payment Method</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <FancyAlert
        visible={deletePaymentId !== null}
        title="Delete Payment Method"
        message="Are you sure you want to delete this payment method?"
        icon="trash-outline"
        onClose={() => {
          setDeletePaymentId(null)
          trackClick('deletePaymentCancelled')
        }}
        onConfirm={confirmDeletePayment}
        confirmText="Delete"
        preset="error"
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      display: 'flex',
      position: 'relative',
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      marginBottom: 80,
    },
    contentContainer: {
      padding: spacing.lg,
    },
    headerAddButton: {
      padding: spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardDefault: {
      borderColor: theme.colors.palette.primary500,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    defaultBadge: {
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    defaultText: {
      color: theme.colors.palette.primary500,
      fontSize: 12,
      fontWeight: '500',
    },
    cardBody: {
      marginBottom: spacing.md,
    },
    cardNumber: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral900,
      marginBottom: spacing.xs,
    },
    cardName: {
      fontSize: 14,
      color: theme.colors.palette.neutral700,
      marginBottom: spacing.xs,
    },
    cardExpiry: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    actionButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.primary100,
    },
    actionButtonText: {
      color: theme.colors.palette.primary500,
      fontSize: 14,
      fontWeight: '500',
    },
    deleteButton: {
      backgroundColor: theme.colors.palette.angry100,
    },
    deleteButtonText: {
      color: theme.colors.palette.angry500,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral200,
    },
    addButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    addButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    addFirstButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    addFirstButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })
