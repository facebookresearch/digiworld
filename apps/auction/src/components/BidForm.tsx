import React, { useMemo } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { Text, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Glassmorphic } from './Glassmorphic'
import { useAppTheme } from '@andojo/shared-theme'

interface BidFormProps {
  item: {
    id: number
    currentPrice?: number | null
    startingBid?: number | null
    price: number
    bidIncrement?: number
    minNextBid?: number | null
  }
  currentBid?: number | null
  onBid: (amount: number) => Promise<void>
  isLoading?: boolean
}

export const BidForm = observer(
  ({ item, onBid, isLoading = false }: BidFormProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const { uiStore } = useStores()

    const currentPrice = item.currentPrice || item.startingBid || item.price
    // Minimum bid is just the current price (no increments)
    const minBid = currentPrice

    const formatPrice = (price: number) => {
      return `$${price.toFixed(2)}`
    }

    const handleBidChange = (text: string) => {
      // Remove non-numeric characters except decimal point
      const cleaned = text.replace(/[^0-9.]/g, '')
      uiStore.setBidAmount(cleaned)
      uiStore.setBidFormError(null)
    }

    const handleBid = async () => {
      const amount = parseFloat(uiStore.bidForm.bidAmount)

      if (!amount || isNaN(amount)) {
        uiStore.setBidFormError('Please enter a valid bid amount')
        return
      }

      if (amount < minBid) {
        uiStore.setBidFormError(`Minimum bid is ${formatPrice(minBid)}`)
        return
      }

      if (amount <= currentPrice) {
        uiStore.setBidFormError(
          `Bid must be higher than current price of ${formatPrice(currentPrice)}`,
        )
        return
      }

      try {
        await onBid(amount)
        uiStore.resetBidForm()
      } catch (err: any) {
        console.error(err)
        throw err
      }
    }

    const handleQuickBid = (increment: number) => {
      const newBid = currentPrice + increment
      uiStore.setBidAmount(newBid.toFixed(2))
      uiStore.setBidFormError(null)
    }

    return (
      <Glassmorphic
        borderRadius={26}
        padding={20}
        intensity={Platform.OS === 'ios' ? 75 : 90}
        backgroundColor={
          Platform.OS === 'ios'
            ? theme.colors.palette.secondary100
            : theme.colors.palette.neutral100
        }
        borderColor={theme.colors.palette.neutral300}
        borderWidth={1}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Place Your Bid</Text>
          <View style={styles.currentPriceContainer}>
            <Text style={styles.currentPriceLabel}>Current Price:</Text>
            <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
          </View>
        </View>

        <View style={styles.quickBids}>
          <Text style={styles.quickBidsLabel}>Quick Bid:</Text>
          <View style={styles.quickBidsRow}>
            {[1, 5, 10, 25].map(increment => (
              <TouchableOpacity
                key={increment}
                onPress={() => handleQuickBid(increment)}
                style={styles.quickBidButton}
                disabled={isLoading}
              >
                <Text style={styles.quickBidText}>+${increment}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Bid Amount</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.input}
              value={uiStore.bidForm.bidAmount}
              onChangeText={handleBidChange}
              placeholder={minBid.toFixed(2)}
              placeholderTextColor={theme.colors.palette.neutral400}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </View>
          {uiStore.bidForm.error && (
            <Text style={styles.errorText}>{uiStore.bidForm.error}</Text>
          )}
          <Text style={styles.minBidText}>
            Minimum bid: {formatPrice(minBid)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.bidButton, isLoading && styles.bidButtonDisabled]}
          onPress={handleBid}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <Text style={styles.bidButtonText}>Placing Bid...</Text>
          ) : (
            <>
              <Ionicons
                name="hammer-outline"
                size={20}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.bidButtonText}>Place Bid</Text>
            </>
          )}
        </TouchableOpacity>
      </Glassmorphic>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 16,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    currentPriceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    currentPriceLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    currentPrice: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    quickBids: {
      marginBottom: 20,
    },
    quickBidsLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 10,
    },
    quickBidsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickBidButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.palette.primary200,
      alignItems: 'center',
    },
    quickBidText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.palette.angry500,
      marginTop: 6,
    },
    minBidText: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginTop: 6,
    },
    bidButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
    },
    bidButtonDisabled: {
      opacity: 0.6,
    },
    bidButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })
