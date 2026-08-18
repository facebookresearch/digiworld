// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  TextInput,
  Switch,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import {
  Glassmorphic,
  BidForm,
  AuctionTimer,
  PaymentForm,
  ProductPlaceholder,
  AppDialog,
  FancyAlert,
} from '@/components'
import { useAppTheme } from '@andojo/shared-theme'

const ItemDetailScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { auctionStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'item-detail',
    `/item/${id}`,
  )

  const itemId = parseInt(id || '0', 10)
  const item = auctionStore.getItemById(itemId)
  const seller = item ? auctionStore.getUserById(item.sellerId) : null
  const category = item ? auctionStore.getCategoryById(item.categoryId) : null
  const allBids = item ? auctionStore.getBidsByItem(item.id) : []
  // Sort bids: highest amount first, then by time (most recent first for same amount)
  // Ensure only the highest bid shows as winning
  const sortedBids = allBids.slice().sort((a, b) => {
    // First sort by amount descending (highest first)
    if (b.bidAmount !== a.bidAmount) {
      return b.bidAmount - a.bidAmount
    }
    // If same amount, sort by time descending (most recent first)
    const aTime =
      a.bidTime || Math.floor(new Date(a.createdAt).getTime() / 1000)
    const bTime =
      b.bidTime || Math.floor(new Date(b.createdAt).getTime() / 1000)
    return bTime - aTime
  })

  // Use sorted bids, but only show first one as winning in the UI
  const bids = sortedBids
  // const userBids = userStore.user?.id
  //   ? bids.filter(b => b.userId === userStore.user!.id)
  //   : []
  const winningBid = item ? auctionStore.getWinningBid(item.id) : null
  const mockCards = auctionStore.mockCards.slice(0, 3)

  const userPaymentMethods = userStore.user
    ? auctionStore.getUserPaymentMethods(userStore.user.id)
    : []

  const availableCards =
    userPaymentMethods.length > 0
      ? userPaymentMethods.map(pm => ({
          id: pm.id,
          cardNumber: pm.cardNumber,
          lastFourDigits: pm.cardNumber.slice(-4),
        }))
      : mockCards.map(card => ({
          id: card.id,
          cardNumber: card.cardNumber,
          lastFourDigits: card.cardNumber.slice(-4),
        }))

  useEffect(() => {
    if (itemId && !item) {
      auctionStore.loadItemDetail(itemId).catch(console.error)
    }
  }, [itemId, item])

  useEffect(() => {
    if (item) {
      // Always update image from item when item changes
      const imageUrl = (item as any).imageUrl
      if (imageUrl) {
        // Check if it's a placeholder or real image
        const isPlaceholder =
          imageUrl.includes('example.com') ||
          imageUrl.startsWith('http://') ||
          imageUrl.startsWith('https://')
        if (!isPlaceholder) {
          // It's a base64 image - ensure proper format
          const formattedImage = imageUrl.startsWith('data:image')
            ? imageUrl
            : `data:image/jpeg;base64,${imageUrl}`
          uiStore.setItemImage(formattedImage)
        } else {
          uiStore.setItemImage(null)
        }
      } else {
        uiStore.setItemImage(null)
      }
      if (uiStore.itemDetailForm.showEditMode) {
        uiStore.setEditTitle(item.title || '')
        uiStore.setEditDescription(item.description || '')
        uiStore.setEditPrice(item.price?.toString() || '')
        uiStore.setEditStartingBid(item.startingBid?.toString() || '')
        uiStore.setEditBidIncrement(item.bidIncrement?.toString() || '1.00')
        uiStore.setEditQuantity(item.quantity?.toString() || '1')
        uiStore.setEditCategoryId(item.categoryId)
        uiStore.setEditIsAuction(item.auctionFlag === 1)

        // Calculate remaining days if auction
        if (item.auctionFlag === 1 && item.endTime) {
          const now = Math.floor(Date.now() / 1000)
          const remaining = item.endTime - now
          if (remaining > 0) {
            const days = Math.ceil(remaining / 86400)
            uiStore.setEditEndDays(days.toString())
          }
        }
      }
    }
  }, [item, uiStore.itemDetailForm.showEditMode])

  useEffect(() => {
    if (userStore.user) {
      auctionStore.loadUserPaymentMethods(userStore.user.id)
    }
  }, [userStore.user])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'item-detail',
        route: `/item/${id}`,
      })
    }, [trackScreenMount, id]),
  )

  // Cleanup: Reset form when component unmounts (not on focus loss)
  useEffect(() => {
    return () => {
      // Only reset form fields, not dialog state (dialog handles its own cleanup)
      // Use setTimeout to defer until after React's unmount phase completes
      setTimeout(() => {
        if (!uiStore.itemDetailForm.dialog.visible) {
          // Safe to reset everything if dialog is not visible
          uiStore.resetItemDetailForm()
          uiStore.resetItemForms()
        } else {
          // Dialog is visible - only reset form fields, leave dialog alone
          uiStore.setShowEditMode(false)
          uiStore.setIsEditing(false)
          uiStore.setShowDeleteConfirm(false)
          uiStore.setShowEndListingConfirm(false)
          uiStore.setIsBidding(false)
          uiStore.setIsBuying(false)
          uiStore.resetItemForms()
        }
      }, 100) // Small delay to ensure React unmount completes
    }
  }, []) // Empty deps - only run cleanup on unmount

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const handleBid = async (amount: number) => {
    if (!userStore.user?.id) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to place a bid',
        callbackAction: 'navigate_login',
      })
      return
    }

    uiStore.setIsBidding(true)
    try {
      await auctionStore.placeBid({
        itemId: item!.id,
        userId: userStore.user.id,
        bidAmount: amount,
      })
      // Reset bid form and show success dialog
      uiStore.resetBidForm()
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Your bid has been placed successfully!',
        callbackAction: 'refresh_item',
      })
    } catch (error: any) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to place bid',
      })
      console.error(error)
    } finally {
      uiStore.setIsBidding(false)
    }
  }

  const handleBuyNow = async (cardNumber: string) => {
    if (!userStore.user?.id) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to purchase',
        callbackAction: 'navigate_login',
      })
      return
    }

    uiStore.setIsBuying(true)
    try {
      await auctionStore.buyNow({
        itemId: item!.id,
        userId: userStore.user.id,
        quantity: 1,
        paymentCardNumber: cardNumber,
      })
      // Update listing status to 'sold' if item is sold out (already done in buyNow, but ensure UI updates)
      await auctionStore.loadAllData(true) // Force reload to update item status
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Purchase completed!',
        callbackAction: 'navigate_back',
      })
    } catch (error: any) {
      console.error('Buy Now: Error in handleBuyNow', error)
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Purchase failed',
      })
    } finally {
      uiStore.setIsBuying(false)
    }
  }

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        uiStore.setItemDetailDialog({
          visible: true,
          type: 'error',
          title: 'Permission Denied',
          message: 'Please grant camera roll permissions to upload images',
        })
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        // Convert to base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        const imageData = `data:image/jpeg;base64,${base64}`
        uiStore.setItemImage(imageData)
      }
    } catch (error: any) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to pick image',
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!item) return

    const {
      editTitle,
      editDescription,
      editCategoryId,
      editPrice,
      editIsAuction,
      editStartingBid,
      editBidIncrement,
      editEndDays,
      editQuantity,
      itemImage,
    } = uiStore.itemDetailForm

    if (!editTitle.trim()) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a title',
      })
      return
    }

    if (!editCategoryId) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please select a category',
      })
      return
    }

    const priceNum = parseFloat(editPrice)
    if (!priceNum || priceNum <= 0) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid price',
      })
      return
    }

    uiStore.setIsEditing(true)
    try {
      const updateData: any = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        categoryId: editCategoryId,
        price: priceNum,
        auctionFlag: editIsAuction ? 1 : 0,
        quantity: parseInt(editQuantity) || 1,
        imageUrl: itemImage || undefined,
      }

      if (editIsAuction) {
        const startingBidNum = parseFloat(editStartingBid)
        if (!startingBidNum || startingBidNum <= 0) {
          uiStore.setItemDetailDialog({
            visible: true,
            type: 'error',
            title: 'Error',
            message: 'Please enter a valid starting bid',
          })
          uiStore.setIsEditing(false)
          return
        }

        updateData.startingBid = startingBidNum
        updateData.bidIncrement = parseFloat(editBidIncrement) || 1.0

        const days = parseInt(editEndDays) || 7
        const now = Math.floor(Date.now() / 1000)
        updateData.endTime = now + days * 86400
      } else {
        updateData.startingBid = undefined
        updateData.bidIncrement = undefined
        updateData.endTime = undefined
      }

      await auctionStore.updateItem(item.id, updateData)
      await auctionStore.loadAllData(true) // Force reload after update
      // Reload item detail to get updated image
      await auctionStore.loadItemDetail(item.id)

      uiStore.setItemDetailDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Listing updated successfully',
        callbackAction: 'close_edit_mode',
      })
    } catch (error: any) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update listing',
      })
    } finally {
      uiStore.setIsEditing(false)
    }
  }

  const getEndListingMessage = () => {
    if (!item || item.auctionFlag !== 1) {
      return 'Are you sure you want to end this auction?'
    }

    const currentWinningBid = auctionStore.getWinningBid(item.id)
    if (!currentWinningBid) {
      return 'Are you sure you want to end this auction? There are no bids yet.'
    }

    const winner = auctionStore.getUserById(currentWinningBid.userId)
    const winnerName =
      winner?.name || winner?.username || `User ${currentWinningBid.userId}`
    const winningAmount = currentWinningBid.bidAmount

    // Check if there were multiple bids at the same amount (tie-breaker scenario)
    const allBidsForItem = auctionStore.getBidsByItem(item.id)
    const bidsAtSameAmount = allBidsForItem.filter(
      b => b.bidAmount === winningAmount && b.id !== currentWinningBid.id,
    )

    let message = `Are you sure you want to end this auction?\n\n`
    message += `Winner: ${winnerName}\n`
    message += `Winning Bid: $${winningAmount.toFixed(2)}\n\n`

    if (bidsAtSameAmount.length > 0) {
      message += `Note: ${bidsAtSameAmount.length + 1} bid(s) were placed at $${winningAmount.toFixed(2)}. `
      message += `The winner was determined by tie-breaker rules (earliest bid time wins).\n\n`
    }

    message += `The auction will be marked as expired`

    return message
  }

  const handleEndListing = async () => {
    if (!item) return
    uiStore.setShowEndListingConfirm(false)
    try {
      await auctionStore.endListing(item.id)
      await auctionStore.loadAllData(true) // Force reload after update
      await auctionStore.loadItemDetail(item.id)
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'success',
        title: 'Listing Ended',
        message: 'Your auction has been ended.',
      })
    } catch (error: any) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to end listing',
      })
    }
  }

  const handleDelete = async () => {
    if (!item) return
    uiStore.setShowDeleteConfirm(false)
    uiStore.setIsEditing(true)
    try {
      await auctionStore.deleteItem(item.id)
      await auctionStore.loadAllData(true) // Force reload after delete
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Listing deleted successfully',
        callbackAction: 'navigate_back',
      })
    } catch (error: any) {
      uiStore.setItemDetailDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete listing',
      })
    } finally {
      uiStore.setIsEditing(false)
    }
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
            theme.colors.palette.secondary100,
          ]}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={theme.colors.palette.neutral400}
            />
            <Text style={styles.errorText}>Item not found</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const isOwner = userStore.user?.id === item.sellerId
  // Check if bidding has closed (endTime passed) but auction hasn't been manually ended
  const biddingClosed =
    item.auctionFlag === 1 && item.endTime
      ? item.endTime < Math.floor(Date.now() / 1000)
      : false
  const canBid =
    item.auctionFlag === 1 &&
    item.status === 'active' &&
    !item.isExpired &&
    !biddingClosed &&
    !isOwner &&
    !uiStore.itemDetailForm.showEditMode
  const canBuy =
    item.auctionFlag === 0 &&
    item.status === 'active' &&
    !isOwner &&
    !uiStore.itemDetailForm.showEditMode

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
          theme.colors.palette.secondary100,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.backgroundOrbs}>
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
        </View>
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral700}
            />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {isOwner && !uiStore.itemDetailForm.showEditMode && (
              <>
                {item.status === 'active' && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => uiStore.setShowEndListingConfirm(true)}
                  >
                    <Ionicons
                      name="stop-circle"
                      size={24}
                      color={theme.colors.palette.angry400}
                    />
                  </TouchableOpacity>
                )}
                {/* Restart button hidden - functionality kept but UI hidden until we clarify behavior */}
                {/*
                {item && item.status === 'expired' && item.auctionFlag === 1 && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={async () => {
                      if (!item) return
                      try {
                        await auctionStore.restartAuction(item.id)
                        await auctionStore.loadAllData(true)
                        await auctionStore.loadItemDetail(item.id)
                        uiStore.setItemDetailDialog({
                          visible: true,
                          type: 'success',
                          title: 'Auction Restarted',
                          message:
                            'Your auction has been restarted and will end in 7 days.',
                        })
                      } catch (error: any) {
                        uiStore.setItemDetailDialog({
                          visible: true,
                          type: 'error',
                          title: 'Error',
                          message: error.message || 'Failed to restart auction',
                        })
                      }
                    }}
                  >
                    <Ionicons
                      name="play-circle"
                      size={24}
                      color={theme.colors.palette.success400}
                    />
                  </TouchableOpacity>
                )}
                */}
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => uiStore.setShowEditMode(true)}
                >
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={theme.colors.palette.neutral700}
                  />
                </TouchableOpacity>
              </>
            )}
            {isOwner && uiStore.itemDetailForm.showEditMode && (
              <>
                <TouchableOpacity
                  style={[styles.headerButton, styles.saveHeaderButton]}
                  onPress={handleSaveEdit}
                  disabled={uiStore.itemDetailForm.isEditing}
                >
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={
                      uiStore.itemDetailForm.isEditing
                        ? theme.colors.palette.neutral400
                        : theme.colors.palette.success400
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    uiStore.setShowEditMode(false)
                    uiStore.setIsEditing(false)
                  }}
                  disabled={uiStore.itemDetailForm.isEditing}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.palette.neutral700}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Image Placeholder */}
          <View style={styles.imageContainer}>
            <TouchableOpacity
              onPress={
                isOwner && uiStore.itemDetailForm.showEditMode
                  ? handlePickImage
                  : undefined
              }
              activeOpacity={
                isOwner && uiStore.itemDetailForm.showEditMode ? 0.8 : 1
              }
              style={styles.imagePlaceholder}
            >
              {uiStore.itemDetailForm.itemImage ? (
                <Image
                  source={{ uri: uiStore.itemDetailForm.itemImage }}
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
              {isOwner && uiStore.itemDetailForm.showEditMode && (
                <View style={styles.imageOverlay}>
                  <Ionicons
                    name="camera"
                    size={32}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.imageOverlayText}>
                    Tap to change image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Item Info */}
          <View style={styles.content}>
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
              style={styles.infoCard}
            >
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {category?.name || 'Uncategorized'}
                </Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}

              {!uiStore.itemDetailForm.showEditMode && (
                <>
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>
                        {item.auctionFlag === 1 ? 'Current Bid' : 'Price'}
                      </Text>
                      <Text style={styles.price}>
                        {formatPrice(
                          item.currentPrice || item.startingBid || item.price,
                        )}
                      </Text>
                    </View>
                    {item.auctionFlag === 1 && (
                      <View style={styles.bidInfo}>
                        <Ionicons
                          name="hammer-outline"
                          size={20}
                          color={theme.colors.palette.primary500}
                        />
                        <Text style={styles.bidCount}>{bids.length} bids</Text>
                      </View>
                    )}
                  </View>

                  {item.auctionFlag === 1 && item.endTime && (
                    <View style={styles.timerContainer}>
                      <AuctionTimer
                        endTime={item.endTime}
                        size="medium"
                        showLabel={true}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Seller Info */}
              {seller && (
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerLeft}>
                    <View style={styles.sellerAvatar}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={theme.colors.palette.primary500}
                      />
                    </View>
                    <View>
                      <Text style={styles.sellerName}>
                        {seller.name || seller.username}
                      </Text>
                      {seller.sellerRating > 0 && (
                        <View style={styles.ratingRow}>
                          <Ionicons
                            name="star"
                            size={14}
                            color={
                              theme.colors.palette.warning500 ||
                              theme.colors.palette.accent500
                            }
                          />
                          <Text style={styles.rating}>
                            {seller.sellerRating.toFixed(1)} (
                            {seller.totalSales} sales)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </Glassmorphic>

            {/* Bidding Section */}
            {canBid && !uiStore.itemDetailForm.showEditMode && (
              <BidForm
                item={item}
                currentBid={item.currentBid}
                onBid={handleBid}
                isLoading={uiStore.itemDetailForm.isBidding}
              />
            )}

            {/* Buy Now Section */}
            {canBuy && !uiStore.itemDetailForm.showEditMode && (
              <PaymentForm
                amount={item.price}
                onPayment={handleBuyNow}
                isLoading={uiStore.itemDetailForm.isBuying}
                availableCards={availableCards}
              />
            )}

            {/* Owner View / Edit Mode */}
            {isOwner && (
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
                style={styles.ownerCard}
              >
                {!uiStore.itemDetailForm.showEditMode ? (
                  <>
                    <Text style={styles.ownerTitle}>Your Listing</Text>
                    <Text style={styles.ownerText}>
                      This is your item. You cannot bid on your own listings.
                    </Text>
                    {item.status === 'sold' && winningBid && (
                      <View style={styles.soldInfo}>
                        <Ionicons
                          name="trophy"
                          size={24}
                          color={theme.colors.palette.success500}
                        />
                        <Text style={styles.soldText}>
                          Sold for {formatPrice(winningBid.bidAmount)}
                        </Text>
                      </View>
                    )}
                    {item.status === 'active' && (
                      <View style={styles.ownerActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => uiStore.setShowEditMode(true)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={theme.colors.palette.neutral100}
                          />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => uiStore.setShowDeleteConfirm(true)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={theme.colors.palette.neutral100}
                          />
                          <Text style={styles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View>
                    <Text style={styles.ownerTitle}>Edit Listing</Text>

                    {/* Edit Form Fields */}
                    <View style={styles.editForm}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Title *</Text>
                        <TextInput
                          style={styles.input}
                          value={uiStore.itemDetailForm.editTitle}
                          onChangeText={uiStore.setEditTitle}
                          placeholder="Enter item title"
                          placeholderTextColor={theme.colors.palette.neutral400}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          value={uiStore.itemDetailForm.editDescription}
                          onChangeText={uiStore.setEditDescription}
                          placeholder="Describe your item..."
                          placeholderTextColor={theme.colors.palette.neutral400}
                          multiline
                          numberOfLines={3}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={styles.categoryContainer}>
                            {auctionStore.categories.map(cat => (
                              <TouchableOpacity
                                key={cat.id}
                                onPress={() =>
                                  uiStore.setEditCategoryId(cat.id)
                                }
                                style={[
                                  styles.categoryChip,
                                  uiStore.itemDetailForm.editCategoryId ===
                                    cat.id && styles.categoryChipSelected,
                                  uiStore.itemDetailForm.editCategoryId ===
                                    cat.id && {
                                    backgroundColor: theme.colors.tint,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    ...styles.categoryChipText,
                                    color:
                                      uiStore.itemDetailForm.editCategoryId ===
                                      cat.id
                                        ? theme.colors.palette.neutral100
                                        : theme.colors.text,
                                  }}
                                >
                                  {cat.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      <View style={styles.inputGroup}>
                        <View style={styles.switchRow}>
                          <Text style={styles.label}>Auction</Text>
                          <Switch
                            value={uiStore.itemDetailForm.editIsAuction}
                            onValueChange={uiStore.setEditIsAuction}
                            trackColor={{
                              false: theme.colors.palette.neutral400,
                              true: theme.colors.tint,
                            }}
                            thumbColor={theme.colors.palette.neutral100}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                          {uiStore.itemDetailForm.editIsAuction
                            ? 'Starting Bid *'
                            : 'Price *'}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={
                            uiStore.itemDetailForm.editIsAuction
                              ? uiStore.itemDetailForm.editStartingBid
                              : uiStore.itemDetailForm.editPrice
                          }
                          onChangeText={
                            uiStore.itemDetailForm.editIsAuction
                              ? uiStore.setEditStartingBid
                              : uiStore.setEditPrice
                          }
                          placeholder={
                            uiStore.itemDetailForm.editIsAuction
                              ? 'Enter starting bid'
                              : 'Enter price'
                          }
                          placeholderTextColor={theme.colors.palette.neutral400}
                          keyboardType="decimal-pad"
                        />
                      </View>

                      {uiStore.itemDetailForm.editIsAuction && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bid Increment</Text>
                            <TextInput
                              style={styles.input}
                              value={uiStore.itemDetailForm.editBidIncrement}
                              onChangeText={uiStore.setEditBidIncrement}
                              placeholder="1.00"
                              placeholderTextColor={
                                theme.colors.palette.neutral400
                              }
                              keyboardType="decimal-pad"
                            />
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>Duration (days)</Text>
                            <TextInput
                              style={styles.input}
                              value={uiStore.itemDetailForm.editEndDays}
                              onChangeText={uiStore.setEditEndDays}
                              placeholder="7"
                              placeholderTextColor={
                                theme.colors.palette.neutral400
                              }
                              keyboardType="number-pad"
                            />
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </Glassmorphic>
            )}

            {/* Recent Bids */}
            {item.auctionFlag === 1 &&
              bids.length > 0 &&
              !uiStore.itemDetailForm.showEditMode && (
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
                  style={styles.bidsCard}
                >
                  <Text style={styles.sectionTitle}>Recent Bids</Text>
                  {bids.slice(0, 5).map((bid, index) => {
                    const bidder = auctionStore.getUserById(bid.userId)
                    // Only the first (highest) bid should show as winning
                    const isWinning = index === 0
                    // Show "Won" if auction has ended/expired (not just timer expired)
                    const hasEnded = item.status === 'expired'
                    return (
                      <View
                        key={bid.id}
                        style={[
                          styles.bidRow,
                          index < Math.min(5, bids.length) - 1 &&
                            styles.bidRowBorder,
                        ]}
                      >
                        <View style={styles.bidLeft}>
                          <View style={styles.bidAvatar}>
                            <Ionicons
                              name="person"
                              size={16}
                              color={theme.colors.palette.primary500}
                            />
                          </View>
                          <View>
                            <Text style={styles.bidderName}>
                              {bidder?.name || bidder?.username || 'Anonymous'}
                              {isWinning && (
                                <Text style={styles.winningBadge}>
                                  {' '}
                                  • {hasEnded ? 'Won' : 'Winning'}
                                </Text>
                              )}
                            </Text>
                            <Text style={styles.bidTime}>
                              {new Date(bid.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.bidAmount}>
                          {formatPrice(bid.bidAmount)}
                        </Text>
                      </View>
                    )
                  })}
                </Glassmorphic>
              )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <AppDialog
        visible={uiStore.itemDetailForm.dialog.visible}
        type={
          uiStore.itemDetailForm.dialog.type as 'success' | 'error' | 'info'
        }
        title={uiStore.itemDetailForm.dialog.title || undefined}
        message={uiStore.itemDetailForm.dialog.message}
        onClose={() => {
          const action = uiStore.itemDetailForm.dialog.callbackAction

          // Defer state update to avoid React errors during event handler
          setTimeout(() => {
            uiStore.hideItemDetailDialog()

            // Handle callback actions after state update
            if (action === 'navigate_login') {
              setTimeout(() => router.push('/(auth)/login'), 0)
            } else if (action === 'navigate_back') {
              setTimeout(() => router.back(), 0)
            } else if (action === 'close_edit_mode') {
              uiStore.setShowEditMode(false)
              uiStore.setIsEditing(false)
            }
          }, 0)
        }}
        autoClose={false}
      />
      <FancyAlert
        visible={uiStore.itemDetailForm.showEndListingConfirm}
        title="End Auction"
        message={getEndListingMessage()}
        confirmText="End Auction"
        cancelText="Cancel"
        onConfirm={handleEndListing}
        onClose={() => uiStore.setShowEndListingConfirm(false)}
        preset="warning"
      />
      <FancyAlert
        visible={uiStore.itemDetailForm.showDeleteConfirm}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => uiStore.setShowDeleteConfirm(false)}
        preset="delete"
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    backgroundOrbs: {
      ...StyleSheet.absoluteFillObject,
    },
    orb: {
      position: 'absolute',
      borderRadius: 200,
      opacity: 0.15,
    },
    orb1: {
      width: 400,
      height: 400,
      backgroundColor: theme.colors.palette.neutral100,
      top: -50,
      right: -50,
    },
    orb2: {
      width: 320,
      height: 320,
      backgroundColor: theme.colors.palette.neutral100,
      bottom: -40,
      left: -40,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backButton: {
      padding: 8,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      padding: 8,
    },
    saveHeaderButton: {
      backgroundColor: theme.colors.palette.success200,
      borderRadius: 8,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    imageContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    imagePlaceholder: {
      width: '100%',
      height: 300,
      borderRadius: 26,
      backgroundColor: theme.colors.palette.primary100,
      overflow: 'hidden',
      position: 'relative',
    },
    content: {
      paddingHorizontal: 20,
      gap: 16,
    },
    infoCard: {
      marginBottom: 0,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginBottom: 12,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
      letterSpacing: -0.6,
    },
    description: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      lineHeight: 24,
      marginBottom: 20,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    priceLabel: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
      marginBottom: 4,
    },
    price: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
      letterSpacing: -0.8,
    },
    bidInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    bidCount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    timerContainer: {
      marginBottom: 20,
    },
    sellerInfo: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
    },
    sellerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sellerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rating: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    ownerCard: {
      marginTop: 0,
    },
    ownerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    ownerText: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginBottom: 12,
    },
    soldInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    soldText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.success500,
    },
    bidsCard: {
      marginTop: 0,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 16,
    },
    bidRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    bidRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    bidLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    bidAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bidderName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    winningBadge: {
      fontSize: 12,
      color: theme.colors.palette.success500,
      fontWeight: '600',
    },
    bidTime: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginTop: 2,
    },
    bidAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.primary500,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    errorText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginTop: 16,
      marginBottom: 24,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
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
      backgroundColor: theme.colors.palette.overlay50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    imageOverlayText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
    },
    ownerActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      flex: 1,
      justifyContent: 'center',
    },
    editButton: {
      backgroundColor: theme.colors.palette.primary500,
    },
    deleteButton: {
      backgroundColor: theme.colors.palette.angry500,
    },
    actionButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
    },
    editForm: {
      marginTop: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: theme.colors.palette.neutral200,
      color: theme.colors.palette.neutral900,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    categoryContainer: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral300,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    categoryChipSelected: {
      borderColor: 'transparent',
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    editActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
    },
    cancelButtonText: {
      color: theme.colors.palette.neutral900,
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default ItemDetailScreen
