// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { Text, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { Glassmorphic } from './Glassmorphic'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { useAppTheme } from '@andojo/shared-theme'

const { width } = Dimensions.get('window')

interface ItemCardProps {
  item: {
    id: number
    title: string
    price: number
    currentPrice?: number | null
    startingBid?: number | null
    isAuction?: boolean
    bidCount?: number
    timeRemaining?: number | null
    sellerId?: number
    status?: string
    imageUrl?: string | null
    categoryId?: number
  }
  seller?: {
    name?: string | null
    username?: string
  } | null
  category?: {
    name?: string
    code?: string
  } | null
  onPress: (itemId: number) => void
  size?: 'small' | 'medium' | 'large'
  showSeller?: boolean
  showCategory?: boolean
  showStatus?: boolean
}

export const ItemCard = observer(function ItemCard({
  item,
  seller,
  category,
  onPress,
  size = 'medium',
  showSeller = true,
  showCategory = false,
  showStatus = false,
}: ItemCardProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { auctionStore } = useStores()

  // Calculate bid count dynamically from actual bids (same as detail page)
  const isAuction = item.isAuction || (item as any).auctionFlag === 1
  const actualBidCount = isAuction
    ? auctionStore.getBidsByItem(item.id).length
    : 0
  // Use actual bid count if available, otherwise fall back to item.bidCount
  const bidCount = actualBidCount > 0 ? actualBidCount : (item.bidCount ?? 0)

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const formatTimeRemaining = (seconds: number | null) => {
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

  const cardWidth =
    size === 'small'
      ? (width - 54) / 2
      : size === 'large'
        ? width - 40
        : (width - 54) / 2
  const imageHeight = size === 'small' ? 120 : size === 'large' ? 240 : 140
  // Fixed height based on size to ensure consistent card heights
  // Increased height slightly to accommodate badges and better spacing
  const cardHeight = size === 'small' ? 260 : size === 'large' ? 400 : 300

  // Check if imageUrl is a placeholder or a real image (base64)
  const isPlaceholderImage =
    !item.imageUrl ||
    item.imageUrl.includes('example.com') ||
    item.imageUrl.startsWith('http://') ||
    item.imageUrl.startsWith('https://')

  const imageUri =
    item.imageUrl && !isPlaceholderImage
      ? item.imageUrl.startsWith('data:image')
        ? item.imageUrl
        : `data:image/jpeg;base64,${item.imageUrl}`
      : null

  return (
    <TouchableOpacity onPress={() => onPress(item.id)} activeOpacity={0.8}>
      <Glassmorphic
        borderRadius={26}
        padding={0}
        variant="strong"
        style={[styles.itemCard, { width: cardWidth, height: cardHeight }]}
      >
        <View style={[styles.itemImagePlaceholder, { height: imageHeight }]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <ProductPlaceholder
              seed={`${item.id}-${item.title}`}
              borderRadius={12}
              itemId={item.id}
            />
          )}
          {/* Overlay badges on image */}
          <View style={styles.imageOverlay}>
            {(showCategory && category) || showStatus ? (
              <View style={styles.overlayBadges}>
                {showCategory && category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {category.name || category.code}
                    </Text>
                  </View>
                )}
                {showStatus && item.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'active'
                            ? theme.colors.palette.success500 + 'E6'
                            : item.status === 'sold'
                              ? theme.colors.palette.primary500 + 'E6'
                              : theme.colors.palette.neutral500 + 'E6',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: theme.colors.palette.neutral100,
                        },
                      ]}
                    />
                    <Text style={styles.statusTextOverlay}>
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.contentTop}>
            <Text
              style={[
                styles.itemTitle,
                { color: theme.colors.text },
                size === 'small' && styles.itemTitleSmall,
                size === 'large' && styles.itemTitleLarge,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          <View style={styles.contentBottom}>
            <View style={styles.itemPriceRow}>
              <Text
                style={[
                  styles.itemPrice,
                  { color: theme.colors.tint },
                  size === 'small' && styles.itemPriceSmall,
                  size === 'large' && styles.itemPriceLarge,
                ]}
              >
                {formatPrice(
                  item.currentPrice || item.startingBid || item.price,
                )}
              </Text>
              {isAuction ? (
                <View
                  style={[
                    styles.bidBadge,
                    { backgroundColor: theme.colors.tint },
                  ]}
                >
                  <Ionicons
                    name="hammer-outline"
                    size={10}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text
                    style={[
                      styles.bidCount,
                      { color: theme.colors.palette.neutral100 },
                    ]}
                  >
                    {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
                  </Text>
                </View>
              ) : (
                <View style={styles.buyNowBadge}>
                  <Text style={styles.buyNowText}>Buy Now</Text>
                </View>
              )}
            </View>
            {isAuction &&
              item.timeRemaining != null &&
              item.timeRemaining > 0 && (
                <View style={styles.timeRemainingRow}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={
                      item.timeRemaining < 300
                        ? theme.colors.palette.angry500
                        : item.timeRemaining < 3600
                          ? (theme.colors.palette as any).warning500 ||
                            theme.colors.palette.warning400
                          : theme.colors.tint
                    }
                  />
                  <Text
                    style={[
                      styles.timeRemaining,
                      {
                        fontWeight: '700',
                        color:
                          item.timeRemaining < 300
                            ? theme.colors.palette.angry500
                            : item.timeRemaining < 3600
                              ? (theme.colors.palette as any).warning500 ||
                                theme.colors.palette.warning400
                              : theme.colors.tint,
                      },
                    ]}
                  >
                    {formatTimeRemaining(item.timeRemaining)} left
                  </Text>
                </View>
              )}
            {showSeller && seller && (
              <Text
                style={[styles.sellerName, { color: theme.colors.textDim }]}
                numberOfLines={1}
              >
                by {seller.name || seller.username}
              </Text>
            )}
          </View>
        </View>
      </Glassmorphic>
    </TouchableOpacity>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    itemCard: {
      overflow: 'hidden',
      justifyContent: 'space-between',
    },
    itemImagePlaceholder: {
      width: '100%',
      backgroundColor: 'transparent',
      overflow: 'hidden',
      position: 'relative',
    },
    itemImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: 8,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    overlayBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    itemInfo: {
      padding: 12,
      flex: 1,
      justifyContent: 'space-between',
      minHeight: 0,
    },
    contentTop: {
      flexShrink: 1,
    },
    contentBottom: {
      marginTop: 8,
      flexShrink: 0,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 0,
      minHeight: 36,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    itemTitleSmall: {
      fontSize: 12,
      minHeight: 32,
      lineHeight: 18,
      marginBottom: 0,
    },
    itemTitleLarge: {
      fontSize: 18,
      minHeight: 50,
      lineHeight: 24,
      marginBottom: 0,
    },
    itemPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    itemPrice: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    itemPriceSmall: {
      fontSize: 16,
    },
    itemPriceLarge: {
      fontSize: 24,
    },
    bidBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    bidCount: {
      fontSize: 10,
      fontWeight: '600',
    },
    buyNowBadge: {
      backgroundColor: theme.colors.palette.angry500,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    buyNowText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      letterSpacing: 0.2,
    },
    timeRemainingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 8,
      marginTop: 4,
    },
    timeRemaining: {
      fontSize: 11,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    sellerName: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 4,
      letterSpacing: 0.1,
    },
    categoryBadge: {
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      letterSpacing: 0.2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusTextOverlay: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
  })
