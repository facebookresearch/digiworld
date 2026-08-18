// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Text } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useToast } from '@/components/Toast'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Fontisto, MaterialIcons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert } from '@/components/FancyAlert'
import LinearGradient from 'react-native-linear-gradient'

const { width } = Dimensions.get('window')

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
        (method: any) => method.isDefault,
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
        hasDefault: userStore.paymentMethods.some(
          (method: any) => method.isDefault,
        ),
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

  const getCardGradient = (cardType: string) => {
    switch (cardType?.toLowerCase()) {
      case 'visa':
        return ['#1A1F71', '#0F4C75']
      case 'mastercard':
        return ['#EB001B', '#FF5F00']
      case 'amex':
      case 'american express':
        return ['#006FCF', '#0099CC']
      default:
        return [
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]
    }
  }

  const getCardIcon = (cardType: string) => {
    switch (cardType?.toLowerCase()) {
      case 'visa':
        return 'visa'
      case 'mastercard':
        return 'mastercard'
      case 'amex':
      case 'american express':
        return 'american-express'
      default:
        return 'credit-card'
    }
  }

  const renderPaymentMethod = ({ item: method }: { item: any }) => {
    return (
      <View style={styles.cardContainer}>
        {/* Credit Card Design */}
        <LinearGradient
          colors={getCardGradient(method.cardType)}
          style={styles.creditCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardChip}>
              <MaterialIcons
                name="memory"
                size={24}
                color="rgba(255,255,255,0.8)"
              />
            </View>
            <View style={styles.cardTypeContainer}>
              <Fontisto
                name={getCardIcon(method.cardType) as any}
                size={32}
                color="rgba(255,255,255,0.9)"
              />
            </View>
          </View>

          {/* Card Number */}
          <View style={styles.cardNumberSection}>
            <Text style={styles.cardNumber}>
              •••• •••• •••• {method.cardNumber?.slice(-4) || '****'}
            </Text>
          </View>

          {/* Card Content Container */}
          <View style={styles.cardContent}>
            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>CARD HOLDER</Text>
                <Text style={styles.cardName}>
                  {method.nameOnCard?.toUpperCase() || 'NAME'}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>EXPIRES</Text>
                <Text style={styles.cardExpiry}>
                  {method.expiryMonth?.padStart(2, '0')}/{method.expiryYear}
                </Text>
              </View>
            </View>

            {/* Action Buttons on Card */}
            <View style={styles.cardActionButtons}>
              {!method.isDefault && userStore.paymentMethods.length >= 1 && (
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleSetDefault(method.id)}
                >
                  <View style={styles.actionButtonBackground}>
                    <MaterialIcons
                      name="star-border"
                      size={18}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </TouchableOpacity>
              )}

              {!method.isDefault && userStore.paymentMethods.length > 1 && (
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleDelete(method.id)}
                >
                  <View
                    style={[
                      styles.actionButtonBackground,
                      styles.deleteActionButton,
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Edit Button */}
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={() => router.push(`/payment/${method.id}`)}
              >
                <View style={styles.actionButtonBackground}>
                  <MaterialIcons
                    name="edit"
                    size={18}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Default Badge */}
          {method.isDefault && (
            <LinearGradient
              colors={[
                theme.colors.palette.secondary500,
                theme.colors.palette.secondary600,
              ]}
              style={styles.defaultBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons
                name="star"
                size={16}
                color={theme.colors.palette.neutral900}
              />
              <Text style={styles.defaultText}>DEFAULT</Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </View>
    )
  }

  const EmptyPaymentMethods = () => (
    <View style={styles.emptyContainer}>
      {/* Animated Card Stack */}
      <View style={styles.emptyCardStack}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={[styles.emptyCard, styles.emptyCard3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <LinearGradient
          colors={[
            theme.colors.palette.primary400,
            theme.colors.palette.primary500,
          ]}
          style={[styles.emptyCard, styles.emptyCard2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <LinearGradient
          colors={[
            theme.colors.palette.primary400,
            theme.colors.palette.primary500,
          ]}
          style={[styles.emptyCard, styles.emptyCard1]}
        >
          <MaterialIcons
            name="add"
            size={32}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>
      </View>

      <Text style={styles.emptyTitle}>No Payment Methods Yet</Text>
      <Text style={styles.emptyText}>
        Add your cards for faster, secure checkout. Your payment info is
        encrypted and safe.
      </Text>

      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={handleAddPayment}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.accent500,
            theme.colors.palette.accent600,
          ]}
          style={styles.addFirstButtonGradient}
        >
          <MaterialIcons
            name="add-card"
            size={24}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.addFirstButtonText}>Add Your First Card</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary100,
        theme.colors.backgroundSecondary,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <LoadingOverlay visible={isProcessing} message="Processing..." />

      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Payment Methods</Text>
        {userStore.paymentMethods.length < 2 && (
          <TouchableOpacity
            onPress={handleAddPayment}
            style={styles.headerAddButton}
          >
            <MaterialIcons
              name="add"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {userStore.paymentMethods.length === 0 ? (
        <EmptyPaymentMethods />
      ) : (
        <>
          {/* Modern Stats Preview */}
          <LinearGradient
            colors={[theme.colors.card, theme.colors.backgroundSecondary]}
            style={styles.statsPreview}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statItem}>
              <MaterialIcons
                name="credit-card"
                size={20}
                color={theme.colors.palette.primary600}
              />
              <Text style={styles.statNumber}>
                {userStore.paymentMethods.length}
              </Text>
              <Text style={styles.statLabel}>Cards</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons
                name="security"
                size={20}
                color={theme.colors.palette.success600}
              />
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Secure</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons
                name="add-circle"
                size={20}
                color={theme.colors.palette.accent600}
              />
              <Text style={styles.statNumber}>
                {2 - userStore.paymentMethods.length}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </LinearGradient>

          <FlatList
            data={userStore.paymentMethods}
            renderItem={renderPaymentMethod}
            keyExtractor={item => item?.id?.toString()}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          />

          {userStore.paymentMethods.length < 2 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPayment}
              >
                <LinearGradient
                  colors={[
                    theme.colors.palette.primary600,
                    theme.colors.palette.primary700,
                  ]}
                  style={styles.addButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons
                    name="add-card"
                    size={20}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.addButtonText}>Add Another Card</Text>
                </LinearGradient>
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
    </LinearGradient>
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
      paddingTop: 50,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    headerAddButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: 8,
    },

    // Modern Stats Preview
    statsPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    statNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      marginHorizontal: 12,
    },

    // Credit Card Styles
    cardContainer: {
      marginBottom: spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 15,
    },
    creditCard: {
      width: width - 32,
      minHeight: Math.max(200, width * 0.55), // Minimum height, allows content to expand
      borderRadius: 20,
      padding: width < 350 ? 16 : 24, // Smaller padding on small screens
      position: 'relative',
      justifyContent: 'space-between', // Distribute content evenly
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    cardChip: {
      width: 45,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    cardTypeContainer: {
      alignItems: 'flex-end',
    },
    cardNumberSection: {
      marginBottom: 28,
    },
    cardNumber: {
      fontSize: width < 350 ? 20 : 24, // Smaller font on small screens
      fontWeight: '600',
      color: 'rgba(255,255,255,0.95)',
      letterSpacing: width < 350 ? 2 : 3, // Reduced letter spacing on small screens
      fontFamily: 'monospace',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cardContent: {
      flex: 1, // Take remaining space
      justifyContent: 'flex-end', // Push content to bottom
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12, // Space between footer and action buttons
    },
    cardInfo: {
      flex: 1,
    },
    cardLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '700',
      marginBottom: 6,
      letterSpacing: 1.2,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    cardName: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.95)',
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    cardExpiry: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.95)',
      fontWeight: '600',
      fontFamily: 'monospace',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    defaultBadge: {
      position: 'absolute',
      top: 70, // Moved down to avoid overlapping with card type icon
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    defaultText: {
      color: theme.colors.palette.neutral900,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // Action Buttons on Card
    cardActionButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end', // Align buttons to the right
      gap: 8,
      marginTop: 8, // Space from the card footer
      paddingHorizontal: 4, // Small padding from edges
    },
    cardActionButton: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    actionButtonBackground: {
      width: 36, // Smaller buttons for better fit
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    deleteActionButton: {
      backgroundColor: 'rgba(255,0,0,0.2)',
      borderColor: 'rgba(255,0,0,0.3)',
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyCardStack: {
      position: 'relative',
      width: 200,
      height: 120,
      marginBottom: spacing.xl,
    },
    emptyCard: {
      position: 'absolute',
      width: 180,
      height: 110,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard1: {
      top: 0,
      left: 10,
      zIndex: 3,
    },
    emptyCard2: {
      top: 5,
      left: 5,
      zIndex: 2,
    },
    emptyCard3: {
      top: 10,
      left: 0,
      zIndex: 1,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    addFirstButton: {
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    addFirstButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 16,
    },
    addFirstButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },

    // Footer
    footer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    addButton: {
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    addButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: 16,
    },
    addButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },
  })
