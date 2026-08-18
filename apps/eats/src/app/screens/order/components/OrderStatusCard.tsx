// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useMemo } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { OrderStatus } from '@/app/constants/orderStatus'

interface OrderStatusCardProps {
  orderStatus: string | undefined
  items: any[]
  orderTotal: number
  refreshEnabled: boolean
  onRefresh: () => void
}

const delayMessages = [
  { label: 'Arriving in 20 minutes', icon: 'time-outline' },
  {
    label: 'Order Delayed! Arriving in 30 minutes',
    icon: 'alert-circle-outline',
  },
  {
    label: 'Arriving earlier than expected – in 10 minutes',
    icon: 'flash-outline',
  },
]

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  orderStatus,
  items,
  orderTotal,
  refreshEnabled,
  onRefresh,
}) => {
  const { theme } = useTheme()
  const colors = theme.colors

  const statusSteps = [
    {
      key: OrderStatus.Pending,
      icon: (
        <Ionicons name="list" size={20} color={colors.palette.neutral100} />
      ),
    },
    {
      key: OrderStatus.Preparing,
      icon: (
        <Ionicons
          name="restaurant"
          size={20}
          color={colors.palette.neutral100}
        />
      ),
    },
    {
      key: OrderStatus.OutForDelivery,
      icon: (
        <Ionicons name="bicycle" size={20} color={colors.palette.neutral100} />
      ),
    },
    {
      key: OrderStatus.Delivered,
      icon: (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={colors.palette.neutral100}
        />
      ),
    },
  ]

  const progressStatus =
    orderStatus === OrderStatus.Assigned ? OrderStatus.Preparing : orderStatus
  const currentStep = statusSteps.findIndex(s => s.key === progressStatus)

  // Local state for delay simulation
  const [delayState, setDelayState] = useState(0)

  // Calculate estimated time for pending
  const estimatedTime = useMemo(() => {
    const now = new Date()
    const end = new Date(now.getTime() + 30 * 60000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(now.getHours())}:${pad(now.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`
  }, [])

  // Message and icon for preparing
  const delayMsg = delayMessages[delayState % delayMessages.length]

  const handleDelayIconPress = () => {
    setDelayState(s => (s + 1) % delayMessages.length)
  }

  const styles = StyleSheet.create({
    baseShadow: {
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      borderRadius: 24,
      marginHorizontal: 16,
      marginTop: 8,
      padding: 16,
    },
    statusOrderCard: {
      backgroundColor: colors.palette.neutral100,
    },
    deliveryTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressTitle: {
      marginBottom: 2,
    },
    progressSubtitle: {
      color: colors.textDim,
      marginBottom: 4,
      marginLeft: 4,
      marginTop: 4,
    },
    refreshIcon: {
      marginLeft: 8,
    },
    progressBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      marginHorizontal: 8,
    },
    progressStep: {
      width: 32,
      height: 32,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressStepActive: {
      backgroundColor: colors.palette.primary500,
    },
    progressStepInactive: {
      backgroundColor: colors.palette.primary100,
    },
    progressStepCurrent: {
      borderWidth: 2,
      borderColor: colors.palette.primary500,
    },
    progressConnector: {
      height: 8,
      flex: 1,
      backgroundColor: colors.palette.primary500,
      marginHorizontal: 2,
      borderRadius: 4,
    },
    progressConnectorActive: {
      backgroundColor: colors.palette.primary500,
    },
    progressConnectorInactive: {
      backgroundColor: colors.palette.primary300,
    },
    orderDetailsScroll: {
      maxHeight: 100,
    },
    orderDetailsTitle: {
      marginBottom: 8,
      marginTop: 8,
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
    },
    orderItemText: {
      flex: 2,
    },
    orderTotalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral200,
      paddingTop: 8,
    },
    iconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    delayIconButton: {
      marginRight: 8,
    },
    delayMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  })

  return (
    <View style={[styles.card, styles.statusOrderCard, styles.baseShadow]}>
      <View style={styles.deliveryTimeRow}>
        <Text
          weight="bold"
          size="medium"
          style={[styles.progressTitle, { color: colors.text }]}
        >
          Your Delivery Time
        </Text>
        <View style={styles.iconContainer}>
          {orderStatus !== OrderStatus.Pending && (
            <TouchableOpacity
              onPress={handleDelayIconPress}
              style={styles.delayIconButton}
            >
              <Ionicons
                name={'time-outline'}
                size={20}
                color={colors.palette.primary500}
              />
            </TouchableOpacity>
          )}
          {orderStatus !== OrderStatus.Delivered &&
            orderStatus !== OrderStatus.Cancelled && (
              <Ionicons
                name="refresh"
                size={22}
                color={
                  refreshEnabled
                    ? colors.palette.primary500
                    : colors.palette.neutral300
                }
                style={styles.refreshIcon}
                onPress={refreshEnabled ? onRefresh : undefined}
              />
            )}
        </View>
      </View>
      {/* Estimated time or delay simulation */}
      {orderStatus === OrderStatus.Pending && (
        <Text size="small" style={styles.progressSubtitle}>
          Estimated {estimatedTime}
        </Text>
      )}
      {orderStatus !== OrderStatus.Pending && (
        <View style={styles.delayMessageContainer}>
          <Ionicons
            name={delayMsg.icon as any}
            size={20}
            color={colors.palette.primary500}
          />
          <Text size="medium" style={styles.progressSubtitle}>
            {delayMsg.label}
          </Text>
        </View>
      )}
      {/* Progress bar and order details as before */}
      {orderStatus !== OrderStatus.Cancelled && (
        <View style={styles.progressBarRow}>
          {statusSteps.map((step, idx) => (
            <React.Fragment key={step.key}>
              <View
                style={[
                  styles.progressStep,
                  idx <= currentStep
                    ? styles.progressStepActive
                    : styles.progressStepInactive,
                  idx === currentStep ? styles.progressStepCurrent : null,
                ]}
              >
                {step.icon}
              </View>
              {idx < statusSteps.length - 1 && (
                <View
                  style={[
                    styles.progressConnector,
                    idx < currentStep
                      ? styles.progressConnectorActive
                      : styles.progressConnectorInactive,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      <ScrollView style={styles.orderDetailsScroll}>
        <Text
          weight="bold"
          size="large"
          style={[styles.orderDetailsTitle, { color: colors.text }]}
        >
          Order Details
        </Text>
        {items.map(item => (
          <View key={item.id} style={styles.orderRow}>
            <Text style={[styles.orderItemText, { color: colors.text }]}>
              {item.menuName} x{item.quantity}
            </Text>
          </View>
        ))}
        <View style={styles.orderTotalRow}>
          <Text weight="bold" size="large" style={{ color: colors.text }}>
            Order Total
          </Text>
          <Text weight="bold" size="large" style={{ color: colors.text }}>
            ${orderTotal?.toFixed(2) ?? '0.00'}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

export default OrderStatusCard
