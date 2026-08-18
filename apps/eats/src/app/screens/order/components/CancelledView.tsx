// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Button, Screen, Text, useTheme } from '@andojo/shared-theme'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

interface CancelledViewProps {
  onBackPress: () => void
  order: any
  items: any[]
}

export const CancelledView: React.FC<CancelledViewProps> = ({
  onBackPress,
  order,
  items,
}) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const { theme } = useTheme()
  const colors = theme.colors

  const styles = StyleSheet.create({
    cancelledContainer: {
      flex: 1,
    },
    cancelledIcon: {
      marginBottom: 24,
      alignSelf: 'center',
    },
    cancelledText: {
      color: colors.palette.neutral900,
      fontSize: 32,
      textAlign: 'center',
      marginBottom: 32,
      fontWeight: 'bold',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.palette.neutral200,
    },
    backButtonOverlay: {
      backgroundColor: colors.palette.primary500,
      borderRadius: 20,
      padding: 6,
      marginRight: 12,
      marginTop: 16,
    },
    cancelledBackButton: {
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
    },
    topContent: {
      alignItems: 'center',
      marginTop: 80,
      marginLeft: 16,
      marginRight: 16,
      justifyContent: 'center',
      backgroundColor: colors.palette.neutral100,
      padding: 32,
      borderRadius: 32,
      height: '45%',
    },
    orderCard: {
      backgroundColor: colors.palette.neutral100,
      borderRadius: 24,
      padding: 20,
      margin: 16,
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    orderTitle: {
      marginLeft: 8,
      color: colors.palette.neutral800,
    },
    orderMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.neutral200,
    },
    orderMetaText: {
      color: colors.palette.neutral600,
      fontSize: 14,
    },
    itemsContainer: {
      height: 120,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.palette.neutral200,
      borderRadius: 12,
      overflow: 'hidden',
    },
    itemsList: {
      flex: 1,
    },
    itemsListContent: {
      padding: 12,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 4,
    },
    itemInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemName: {
      color: colors.palette.neutral700,
      fontSize: 16,
    },
    itemQuantity: {
      color: colors.palette.neutral500,
      marginLeft: 8,
    },
    itemPrice: {
      color: colors.palette.neutral700,
      fontSize: 16,
    },
  })

  return (
    <Screen style={styles.cancelledContainer}>
      <LinearGradient
        colors={[colors.palette.primary400, colors.palette.primary500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Button
        style={[styles.backButtonOverlay, styles.cancelledBackButton]}
        LeftAccessory={() => (
          <MaterialIcons
            name="arrow-back"
            color={colors.palette.neutral100}
            size={24}
          />
        )}
        onPress={onBackPress}
      />
      <View style={styles.topContent}>
        <MaterialIcons
          name="cancel"
          size={120}
          color={colors.palette.angry400}
          style={styles.cancelledIcon}
        />
        <Text weight="bold" size="xxl" style={styles.cancelledText}>
          Order Cancelled!
        </Text>
      </View>
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Ionicons
            name="receipt-outline"
            size={24}
            color={colors.palette.primary500}
          />
          <Text weight="bold" size="large" style={styles.orderTitle}>
            Order Details
          </Text>
        </View>

        <View>
          <View style={styles.orderMeta}>
            <Text style={styles.orderMetaText}>{totalItems} items</Text>
            <Text style={styles.orderMetaText}>
              {format(new Date(order?.createdAt), 'MMM dd, yyyy')}
            </Text>
          </View>

          <View style={styles.itemsContainer}>
            <ScrollView
              style={styles.itemsList}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.itemsListContent}
              nestedScrollEnabled={true}
            >
              {items.map((item, _index) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.menuName}</Text>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ${(item.menuPrice * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.totalRow}>
            <Text weight="bold" size="large" style={{ color: colors.text }}>
              Total
            </Text>
            <Text weight="bold" size="large" style={{ color: colors.text }}>
              ${order?.total?.toFixed(2) ?? '0.00'}
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  )
}

export default CancelledView
