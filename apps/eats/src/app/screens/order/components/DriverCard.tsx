// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, AutoImage, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'

interface DriverCardProps {
  driver: any
  orderStatus: string | undefined
  onCall: () => void
  onMessage: () => void
}

const getInitials = (name: string) => {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  orderStatus,
  onCall,
  onMessage,
}) => {
  const { theme } = useTheme()
  const colors = theme.colors
  const driverInitials = getInitials(driver?.name || '')

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
    driverCard: {
      backgroundColor: colors.palette.neutral100,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarPlaceholder: {
      backgroundColor: colors.palette.primary500,
    },
    driverInfo: {
      flex: 1,
    },
    driverPhone: {
      color: colors.textDim,
    },
    driverButton: {
      backgroundColor: colors.palette.primary100,
      borderRadius: 20,
      padding: 8,
      marginLeft: 8,
      minWidth: 36,
      minHeight: 36,
    },
    assigningContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    assigningIcon: {
      marginBottom: 8,
    },
    assigningText: {
      color: colors.palette.primary500,
      textAlign: 'center',
      marginLeft: 16,
    },
  })

  const driverAvatar = driver?.avatar ? (
    <AutoImage source={{ uri: driver.avatar }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text
        size="large"
        weight="bold"
        style={{ color: colors.palette.neutral100 }}
      >
        {driverInitials}
      </Text>
    </View>
  )

  if (orderStatus === 'pending' || orderStatus === 'preparing') {
    return (
      <View style={[styles.card, styles.driverCard, styles.baseShadow]}>
        <View style={styles.assigningContainer}>
          <Ionicons
            name="person"
            size={32}
            color={colors.palette.primary500}
            style={styles.assigningIcon}
          />
          <Text weight="bold" size="large" style={styles.assigningText}>
            Assigning delivery partner shortly
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.card, styles.driverCard, styles.baseShadow]}>
      {driverAvatar}
      <View style={styles.driverInfo}>
        <Text weight="bold" size="large" style={{ color: colors.text }}>
          {driver?.name || 'Driver'}
        </Text>
        <Text size="small" style={styles.driverPhone}>
          Phone: {driver?.phone}
        </Text>
      </View>
      <Button
        style={styles.driverButton}
        LeftAccessory={() => (
          <Ionicons
            name="chatbubble-ellipses"
            color={colors.palette.primary500}
            size={22}
          />
        )}
        onPress={onMessage}
      />
      <Button
        style={styles.driverButton}
        LeftAccessory={() => (
          <Ionicons name="call" color={colors.palette.primary500} size={22} />
        )}
        onPress={onCall}
      />
    </View>
  )
}

export default DriverCard
