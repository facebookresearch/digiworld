import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { debounce } from 'lodash'

const CategoryBillersScreen = observer(() => {
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { category } = useLocalSearchParams()
  const [refreshing, setRefreshing] = useState(false)
  const { trackScreenMount } = useInteractionTracking(
    'Category Billers',
    `/bills/category/${category}`,
  )

  useEffect(() => {
    loadData()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Category Billers',
        route: `/bills/category/${category}`,
      })
    }, []),
  )

  const loadData = async () => {
    try {
      // await bankingStore.loadBillers()
      // await bankingStore.loadBills()
    } catch (error) {
      console.error('Error loading billers data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleBillerSelect = debounce((biller: any) => {
    // Check if user has existing bills for this biller
    const existingBill = bankingStore.bills.find(
      bill => bill.billerId === biller.id && bill.status === 'pending',
    )

    if (existingBill) {
      // If there's an existing bill, go to pay it
      router.push(`/bills/pay/${existingBill.id}`)
    } else {
      // If no existing bill, go to pay screen with biller info
      router.push(`/bills/pay/new?billerId=${biller.id}`)
    }
  }, 300)

  // Debounced bill payment navigation
  const handlePayBill = debounce((billId: number) => {
    router.push(`/bills/pay/${billId}`)
  }, 300)

  const categoryBillers = bankingStore.billers.filter(
    biller =>
      biller.category?.toLowerCase() ===
      ((category as string) || '')?.toLowerCase(),
  )

  // Get existing bills for this category
  const categoryBills = bankingStore.bills.filter(bill => {
    const biller = bankingStore.billers.find(b => b.id === bill.billerId)
    return (
      biller?.category?.toLowerCase() ===
        ((category as string) || '')?.toLowerCase() && bill.status === 'pending'
    )
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'utilities':
        return 'flash'
      case 'telecom':
        return 'phone-portrait'
      case 'insurance':
        return 'shield-checkmark'
      case 'finance':
        return 'card'
      case 'subscription':
        return 'tv'
      default:
        return 'business'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'utilities':
        return theme.colors.palette.secondary400
      case 'telecom':
        return theme.colors.palette.primary200
      case 'insurance':
        return theme.colors.palette.success400
      case 'finance':
        return theme.colors.palette.accent200
      case 'subscription':
        return theme.colors.palette.secondary200
      default:
        return theme.colors.palette.neutral400
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          preset="subheading"
          style={{ color: theme.colors.text as string }}
        >
          {((category as string) || '')?.charAt(0).toUpperCase() +
            ((category as string) || '')?.slice(1)}{' '}
          Billers
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Pending Bills Section */}
        {categoryBills.length > 0 && (
          <View style={styles.section}>
            <Text
              preset="subheading"
              style={{ color: theme.colors.text as string }}
            >
              Pending Bills
            </Text>
            {categoryBills.map(bill => {
              const biller = bankingStore.billers.find(
                b => b.id === bill.billerId,
              )
              return (
                <TouchableOpacity
                  key={`${bill.id}-${biller?.code || 'unknown'}`} // Combine bill ID and biller code for unique keys
                  style={[
                    styles.billCard,
                    { backgroundColor: (theme.colors as any).surface },
                  ]}
                  onPress={() => handlePayBill(bill.id)}
                >
                  <View style={styles.billerLeft}>
                    <View
                      style={[
                        styles.billerIcon,
                        {
                          backgroundColor:
                            getCategoryColor(biller?.category || '') + '15',
                        },
                      ]}
                    >
                      <Ionicons
                        name="receipt"
                        size={24}
                        color={getCategoryColor(biller?.category || '')}
                      />
                    </View>
                    <View style={styles.billerInfo}>
                      <Text
                        style={
                          [
                            styles.billerName,
                            { color: theme.colors.text },
                          ] as any
                        }
                      >
                        {biller?.name || 'Unknown Biller'}
                      </Text>
                      <Text
                        style={
                          [
                            styles.billAmount,
                            { color: theme.colors.palette.primary500 },
                          ] as any
                        }
                      >
                        ${bill.amount.toFixed(2)} due
                      </Text>
                    </View>
                  </View>
                  <View style={styles.payNowButton}>
                    <Text
                      style={
                        [
                          styles.payNowText,
                          { color: theme.colors.palette.primary500 },
                        ] as any
                      }
                    >
                      Pay Now
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textDim}
                    />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Available Billers Section */}
        <View style={styles.section}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Available Billers
          </Text>
          {categoryBillers.length > 0 ? (
            categoryBillers.map(biller => (
              <TouchableOpacity
                key={biller.id}
                style={[
                  styles.billerCard,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
                onPress={() => handleBillerSelect(biller)}
              >
                <View style={styles.billerLeft}>
                  <View
                    style={[
                      styles.billerIcon,
                      {
                        backgroundColor:
                          getCategoryColor(biller.category || '') + '15',
                      },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(biller.category || '') as any}
                      size={24}
                      color={getCategoryColor(biller.category || '')}
                    />
                  </View>
                  <View style={styles.billerInfo}>
                    <Text
                      style={
                        [styles.billerName, { color: theme.colors.text }] as any
                      }
                    >
                      {biller.name}
                    </Text>
                    <Text
                      style={
                        [
                          styles.billerDescription,
                          { color: theme.colors.textDim },
                        ] as any
                      }
                    >
                      {biller.description ||
                        biller.subcategory ||
                        'No description'}
                    </Text>
                    {biller.averageBillAmount && (
                      <Text
                        style={
                          [
                            styles.averageAmount,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        Avg: ${biller.averageBillAmount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={theme.colors.palette.primary500}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="business-outline"
                size={48}
                color={theme.colors.textDim}
              />
              <Text style={styles.emptyText}>No billers found</Text>
              <Text
                style={
                  [styles.emptySubtext, { color: theme.colors.textDim }] as any
                }
              >
                No {category} billers are available at the moment
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    section: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    billerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    billCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    billerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    billerIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    billerInfo: {
      flex: 1,
    },
    billerName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    billerDescription: {
      fontSize: 14,
      marginBottom: 2,
    },
    averageAmount: {
      fontSize: 12,
    },
    billAmount: {
      fontSize: 14,
      fontWeight: '600',
    },
    payNowButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    payNowText: {
      fontSize: 14,
      fontWeight: '600',
      marginRight: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
      color: theme.colors.textDim,
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
  })

export default CategoryBillersScreen
