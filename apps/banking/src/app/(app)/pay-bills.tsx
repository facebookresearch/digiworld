// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const PayBillsScreen = observer(() => {
  const { bankingStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [refreshing, setRefreshing] = useState(false)
  const { trackScreenMount } = useInteractionTracking(
    'pay-bills-screen',
    '/pay-bills',
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      await bankingStore.loadBillers()
      // await bankingStore.loadUserBillers()
      await bankingStore.loadBills()
      await bankingStore.loadScheduledPayments()
    } catch (error) {
      console.error('Error loading bills data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleAddPayee = debounce(() => {
    router.push('/bills/add-payee')
  }, 300)

  const handlePayBill = debounce((bill: any) => {
    router.push(`/bills/pay/${bill.id}`)
  }, 300)

  const handleViewAllBills = debounce(() => {
    router.push('/bills/all')
  }, 300)

  const handleSchedulePayment = debounce(() => {
    router.push('/bills/schedule-payment')
  }, 300)

  const handleCategoryNavigation = debounce((categoryName: string) => {
    router.push(`/bills/category/${categoryName.toLowerCase()}`)
  }, 300)

  const billCategories = [
    {
      id: 1,
      name: 'Utilities',
      icon: 'flash',
      color: theme.colors.palette.secondary400,
      count: bankingStore.billers.filter(b => b.category === 'utilities')
        .length,
    },
    {
      id: 2,
      name: 'Telecom',
      icon: 'phone-portrait',
      color: theme.colors.palette.primary200,
      count: bankingStore.billers.filter(b => b.category === 'telecom').length,
    },
    {
      id: 3,
      name: 'Insurance',
      icon: 'shield-checkmark',
      color: theme.colors.palette.success400,
      count: bankingStore.billers.filter(b => b.category === 'insurance')
        .length,
    },
    {
      id: 4,
      name: 'Finance',
      icon: 'card',
      color: theme.colors.palette.accent200,
      count: bankingStore.billers.filter(b => b.category === 'finance').length,
    },
    {
      id: 5,
      name: 'Subscription',
      icon: 'tv',
      color: theme.colors.palette.accent400,
      count: bankingStore.billers.filter(b => b.category === 'subscription')
        .length,
    },
    {
      id: 6,
      name: 'Others',
      icon: 'ellipsis-horizontal',
      color: theme.colors.palette.neutral400,
      count: bankingStore.billers.filter(
        b =>
          ![
            'utilities',
            'telecom',
            'insurance',
            'finance',
            'subscription',
          ].includes(b.category || ''),
      ).length,
    },
  ]

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'pay-bills-screen',
        route: '/pay-bills',
      })

      uiStore.resetAllForms()
      uiStore.resetDialogs()
    }, []),
  )

  const pendingBills = bankingStore.pendingBills.slice(0, 5)
  // const scheduledBills = bankingStore.bills.filter(
  //   b => b.status === 'scheduled',
  // )

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text
          preset="subheading"
          style={{ color: theme.colors.text as string }}
        >
          Pay Bills
        </Text>
        <Text
          preset="default"
          style={{ color: theme.colors.textDim as string }}
        >
          Manage your bill payments
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: (theme.colors as any).surface },
              ]}
              onPress={handleAddPayee}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: theme.colors.palette.primary200 + '15' },
                ]}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={theme.colors.palette.primary200}
                />
              </View>
              <Text
                style={[styles.actionText, { color: theme.colors.text }] as any}
              >
                Add Payee
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: (theme.colors as any).surface },
              ]}
              onPress={handleSchedulePayment}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: theme.colors.palette.success400 + '15' },
                ]}
              >
                <Ionicons
                  name="calendar"
                  size={24}
                  color={theme.colors.palette.success400}
                />
              </View>
              <Text
                style={[styles.actionText, { color: theme.colors.text }] as any}
              >
                Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bill Categories */}
        <View style={styles.section}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Categories
          </Text>
          <FlatList
            data={billCategories}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item: category }) => (
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
                onPress={() => handleCategoryNavigation(category.name)}
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color + '15' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={24}
                      color={category.color}
                    />
                  </View>
                  <View>
                    <Text
                      style={
                        [
                          styles.categoryName,
                          { color: theme.colors.text },
                        ] as any
                      }
                    >
                      {category.name}
                    </Text>
                    <Text
                      style={
                        [
                          styles.categoryCount,
                          { color: theme.colors.textDim },
                        ] as any
                      }
                    >
                      {category.count} payee{category.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textDim}
                />
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Pending Bills */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text
              preset="subheading"
              style={{ color: theme.colors.text as string }}
            >
              Pending Bills
            </Text>
            <TouchableOpacity onPress={handleViewAllBills}>
              <Text
                style={
                  [
                    styles.seeAllText,
                    { color: theme.colors.palette.primary500 },
                  ] as any
                }
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.billsContainer,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            {pendingBills.length > 0 ? (
              <FlatList
                data={pendingBills}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item: bill }) => {
                  const biller = bankingStore.billers.find(
                    b => b.id === bill.billerId,
                  )
                  return (
                    <TouchableOpacity
                      style={styles.billItem}
                      onPress={() => handlePayBill(bill)}
                    >
                      <View style={styles.billLeft}>
                        <View
                          style={[
                            styles.billIcon,
                            {
                              backgroundColor:
                                theme.colors.palette.primary200 + '15',
                            },
                          ]}
                        >
                          <Ionicons
                            name="receipt"
                            size={20}
                            color={theme.colors.palette.primary200}
                          />
                        </View>
                        <View style={styles.billInfo}>
                          <Text
                            style={
                              [
                                styles.billName,
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
                          size={16}
                          color={theme.colors.textDim}
                        />
                      </View>
                    </TouchableOpacity>
                  )
                }}
              />
            ) : (
              <View style={styles.emptyBills}>
                <Ionicons
                  name="receipt-outline"
                  size={48}
                  color={theme.colors.textDim}
                />
                <Text
                  style={
                    [styles.emptyText, { color: theme.colors.textDim }] as any
                  }
                >
                  No pending bills
                </Text>
                <Text
                  style={
                    [
                      styles.emptySubtext,
                      { color: theme.colors.textDim },
                    ] as any
                  }
                >
                  Add payees to start managing your bills
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Scheduled Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              preset="subheading"
              style={{ color: theme.colors.text as string }}
            >
              Scheduled Payments
            </Text>
            <TouchableOpacity onPress={handleSchedulePayment}>
              <Text
                style={
                  [
                    styles.seeAllText,
                    { color: theme.colors.palette.primary500 },
                  ] as any
                }
              >
                Schedule New
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.billsContainer,
              { backgroundColor: (theme.colors as any).surface },
            ]}
          >
            {bankingStore.scheduledPayments.length > 0 ? (
              <FlatList
                data={bankingStore.scheduledPayments.slice(0, 3)}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item: scheduledPayment }) => {
                  const biller = bankingStore.billers.find(
                    b => b.id === scheduledPayment.billerId,
                  )
                  const scheduledDate = new Date(scheduledPayment.scheduledDate)
                  return (
                    <View style={styles.billItem}>
                      <View style={styles.billLeft}>
                        <View
                          style={[
                            styles.billIcon,
                            {
                              backgroundColor:
                                theme.colors.palette.success400 + '15',
                            },
                          ]}
                        >
                          <Ionicons
                            name="calendar"
                            size={20}
                            color={theme.colors.palette.success400}
                          />
                        </View>
                        <View style={styles.billInfo}>
                          <Text
                            style={
                              [
                                styles.billName,
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
                                { color: theme.colors.palette.success400 },
                              ] as any
                            }
                          >
                            ${scheduledPayment.amount.toFixed(2)} •{' '}
                            {scheduledDate.toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.payNowButton}>
                        <Text
                          style={
                            [
                              styles.payNowText,
                              { color: theme.colors.palette.success400 },
                            ] as any
                          }
                        >
                          Scheduled
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.colors.textDim}
                        />
                      </View>
                    </View>
                  )
                }}
              />
            ) : (
              <View style={styles.emptyBills}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={theme.colors.textDim}
                />
                <Text
                  style={
                    [styles.emptyText, { color: theme.colors.textDim }] as any
                  }
                >
                  No scheduled payments
                </Text>
                <Text
                  style={
                    [
                      styles.emptySubtext,
                      { color: theme.colors.textDim },
                    ] as any
                  }
                >
                  Schedule future payments for convenience
                </Text>
              </View>
            )}
          </View>
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
    section: {
      paddingHorizontal: 24,
      marginTop: 16,
    },
    lastSection: {
      paddingBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAllText: {
      fontSize: 16,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: 16,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    categoryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    categoryCount: {
      fontSize: 14,
    },
    billsContainer: {
      borderRadius: 16,
      padding: 20,
    },
    billItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    billLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    billIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    billInfo: {
      flex: 1,
    },
    billName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
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
    emptyBills: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
  })

export default PayBillsScreen
