// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const AllBillsScreen = observer(() => {
  const { bankingStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('All Bills', '/bills/all')

  // Get state from UIStore
  const { refreshing, filter } = uiStore.allBillsFilter

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    trackScreenMount({
      date: Date.now(),
      screenName: 'All Bills',
      route: '/bills/all',
    })
  }, [])

  const loadData = async () => {
    try {
      await bankingStore.loadBills()
      await bankingStore.loadBillers()
      await bankingStore.loadScheduledPayments()
    } catch (error) {
      console.error('Error loading bills data:', error)
    }
  }

  const onRefresh = async () => {
    uiStore.setAllBillsRefreshing(true)
    await loadData()
    uiStore.setAllBillsRefreshing(false)
  }

  const handlePayBill = (bill: any) => {
    router.push(`/bills/pay/${bill.id}`)
  }

  const getFilteredBills = () => {
    switch (filter) {
      case 'pending':
        return bankingStore.bills.filter(b => b.status === 'pending')
      case 'paid':
        return bankingStore.bills.filter(b => b.status === 'paid')
      case 'overdue':
        return bankingStore.bills.filter(b => b.status === 'overdue')
      case 'scheduled':
        // Convert scheduled payments to bill-like format for display
        return bankingStore.scheduledPayments.map(sp => ({
          id: sp.id,
          userId: sp.userId,
          billerId: sp.billerId,
          amount: sp.amount,
          status: 'scheduled',
          dueDate: sp.scheduledDate || sp.createdAt,
          createdAt: sp.scheduledDate || sp.createdAt,
        }))
      default:
        return bankingStore.bills
    }
  }

  const filteredBills = getFilteredBills()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.palette.accent400
      case 'paid':
        return theme.colors.palette.success400
      case 'overdue':
        return theme.colors.palette.angry400
      case 'scheduled':
        return theme.colors.palette.primary500
      default:
        return theme.colors.textDim
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time'
      case 'paid':
        return 'checkmark-circle'
      case 'overdue':
        return 'warning'
      case 'scheduled':
        return 'calendar'
      default:
        return 'help-circle'
    }
  }

  return (
    <View
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
          All Bills
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'paid', label: 'Paid' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'scheduled', label: 'Scheduled' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                filter === tab.key && styles.activeFilterTab,
                {
                  backgroundColor:
                    filter === tab.key
                      ? theme.colors.palette.primary500
                      : (theme.colors as any).surface,
                },
              ]}
              onPress={() => uiStore.setAllBillsFilter(tab.key as any)}
            >
              <Text
                style={
                  [
                    styles.filterTabText,
                    {
                      color:
                        filter === tab.key
                          ? theme.colors.palette.neutral100
                          : theme.colors.text,
                    },
                  ] as any
                }
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.billsList}>
          {filteredBills.length > 0 ? (
            filteredBills.map((bill: any) => {
              const biller = bankingStore.billers.find(
                b => b.id === bill.billerId,
              )
              return (
                <TouchableOpacity
                  key={bill.id}
                  style={[
                    styles.billCard,
                    {
                      backgroundColor: (theme.colors as any).surface,
                    },
                  ]}
                  onPress={() =>
                    bill.status === 'pending' && handlePayBill(bill)
                  }
                  disabled={bill.status !== 'pending'}
                  activeOpacity={bill.status === 'pending' ? 0.7 : 1}
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
                          [styles.billName, { color: theme.colors.text }] as any
                        }
                      >
                        {biller?.name || 'Unknown Biller'}
                      </Text>
                      <Text
                        style={
                          [
                            styles.billAmount,
                            { color: theme.colors.textDim },
                          ] as any
                        }
                      >
                        ${bill.amount.toFixed(2)}
                      </Text>
                      {bill.dueDate && (
                        <Text
                          style={
                            [
                              styles.billDueDate,
                              { color: theme.colors.textDim },
                            ] as any
                          }
                        >
                          Due: {new Date(bill.dueDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.billRight}>
                    <View style={styles.statusContainer}>
                      <Ionicons
                        name={getStatusIcon(bill.status) as any}
                        size={16}
                        color={getStatusColor(bill.status)}
                      />
                      <Text
                        style={
                          [
                            styles.statusText,
                            { color: getStatusColor(bill.status) },
                          ] as any
                        }
                      >
                        {bill.status.charAt(0).toUpperCase() +
                          bill.status.slice(1)}
                      </Text>
                    </View>

                    {bill.status === 'pending' && (
                      <Text style={styles.payButton}>Pay Now</Text>
                    )}

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.textDim}
                    />
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={styles.emptyState}>
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
                No bills found
              </Text>
              <Text
                style={
                  [styles.emptySubtext, { color: theme.colors.textDim }] as any
                }
              >
                {filter === 'all'
                  ? 'Add payees to start managing your bills'
                  : `No ${filter} bills at the moment`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    filterContainer: {
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    filterTab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 12,
    },
    activeFilterTab: {
      // Styling handled by backgroundColor in component
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
    },
    billsList: {
      paddingHorizontal: 24,
    },
    billCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    billLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    billIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    billInfo: {
      flex: 1,
    },
    billName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    billAmount: {
      fontSize: 14,
      marginBottom: 2,
    },
    billDueDate: {
      fontSize: 12,
    },
    billRight: {
      alignItems: 'flex-end',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    payButton: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
      color: theme.colors.palette.primary500,
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
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
  })

export default AllBillsScreen
