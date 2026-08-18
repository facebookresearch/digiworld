// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, type Theme } from '@andojo/shared-theme'
import { useAppTheme } from '@andojo/shared-theme'

interface AuctionTimerProps {
  endTime: number // Unix timestamp
  onExpire?: () => void
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
}

export function AuctionTimer({
  endTime,
  onExpire,
  showLabel = true,
  size = 'medium',
}: AuctionTimerProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = Math.max(0, endTime - now)
      setTimeRemaining(remaining)

      if (remaining === 0 && onExpire) {
        onExpire()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [endTime, onExpire])

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'Ended'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // More readable format: "6 days 23 hours" instead of "167h"
    if (days > 0) {
      const remainingHours = Math.floor((seconds % 86400) / 3600)
      if (remainingHours > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`
      }
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    if (hours > 0) {
      const remainingMinutes = Math.floor((seconds % 3600) / 60)
      if (remainingMinutes > 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} ${remainingMinutes === 1 ? 'min' : 'mins'}`
      }
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    }
    if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ${secs}s`
    }
    return `${secs}s`
  }

  const isUrgent = timeRemaining !== null && timeRemaining < 3600 // Less than 1 hour
  const isVeryUrgent = timeRemaining !== null && timeRemaining < 300 // Less than 5 minutes

  const fontSize = size === 'small' ? 11 : size === 'large' ? 16 : 13
  const iconSize = size === 'small' ? 12 : size === 'large' ? 18 : 14

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={[styles.label, { fontSize: fontSize - 2 }]}>
          Time Remaining:
        </Text>
      )}
      <View
        style={[
          styles.timerContainer,
          isUrgent && styles.timerUrgent,
          isVeryUrgent && styles.timerVeryUrgent,
        ]}
      >
        <Ionicons
          name="time-outline"
          size={iconSize}
          color={
            isVeryUrgent
              ? theme.colors.palette.angry500
              : isUrgent
                ? (theme.colors.palette as any).warning500 ||
                  theme.colors.palette.warning400
                : theme.colors.palette.neutral600
          }
        />
        <Text
          style={[
            styles.timerText,
            { fontSize },
            { fontWeight: '700' }, // Make time bold for better visibility
            isVeryUrgent && { color: theme.colors.palette.angry500 },
            isUrgent &&
              !isVeryUrgent && {
                color:
                  (theme.colors.palette as any).warning500 ||
                  theme.colors.palette.warning400,
              },
            !isUrgent &&
              !isVeryUrgent && {
                color: theme.colors.tint, // Use theme tint color for normal state to highlight
              },
          ]}
        >
          {formatTime(timeRemaining)}
        </Text>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'flex-start',
    },
    label: {
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 4,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.primary100,
    },
    timerUrgent: {
      backgroundColor: theme.colors.palette.warning100,
    },
    timerVeryUrgent: {
      backgroundColor: theme.colors.palette.angry100,
    },
    timerText: {
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
  })
