// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Glassmorphic, AppDialog } from '@/components'
import { useAppTheme } from '@andojo/shared-theme'

const EditListingScreen = observer(() => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { auctionStore, userStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'edit-listing',
    '/edit-listing/[id]',
  )

  const itemId = parseInt(id || '0', 10)
  const item = auctionStore.getItemById(itemId)

  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [categoryId, setCategoryId] = useState<number | null>(
    item?.categoryId || null,
  )
  const [price, setPrice] = useState(item?.price?.toString() || '')
  const [isAuction, setIsAuction] = useState(item?.isAuction || false)
  const [startingBid, setStartingBid] = useState(
    item?.startingBid?.toString() || '',
  )
  const [bidIncrement, setBidIncrement] = useState(
    item?.bidIncrement?.toString() || '1.00',
  )
  const [endDays, setEndDays] = useState('7')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1')
  const [isLoading, setIsLoading] = useState(false)
  const [dialog, setDialog] = useState<{
    visible: boolean
    type: 'success' | 'error' | 'info'
    title?: string
    message: string
    onClose?: () => void
  }>({ visible: false, type: 'info', message: '' })

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setDescription(item.description || '')
      setCategoryId(item.categoryId || null)
      setPrice(item.price?.toString() || '')
      setIsAuction(item.isAuction || false)
      setStartingBid(item.startingBid?.toString() || '')
      setBidIncrement(item.bidIncrement?.toString() || '1.00')
      setQuantity(item.quantity?.toString() || '1')

      // Calculate remaining days if auction
      if (item.isAuction && item.endTime) {
        const now = Math.floor(Date.now() / 1000)
        const remaining = item.endTime - now
        if (remaining > 0) {
          const days = Math.ceil(remaining / 86400)
          setEndDays(days.toString())
        }
      }
    }
  }, [item])

  useEffect(() => {
    if (userStore.isAuthenticated && userStore.user?.id) {
      // Only load data if not already loaded (prevents blocking tab switches)
      if (!auctionStore.dataLoaded) {
        auctionStore.loadAllData().catch(console.error)
      }
    }
  }, [userStore.isAuthenticated])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'edit-listing',
        route: `/edit-listing/${id}`,
      })
    }, [trackScreenMount, id]),
  )

  // Check if user owns this item
  if (item && userStore.user?.id !== item.sellerId) {
    return (
      <View style={styles.container}>
        <AppDialog
          visible={true}
          type="error"
          title="Access Denied"
          message="You can only edit your own listings"
          onClose={() => router.back()}
        />
      </View>
    )
  }

  const handleSubmit = async () => {
    if (!item) {
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Item not found',
        onClose: () =>
          setDialog({ visible: false, type: 'error', message: '' }),
      })
      return
    }

    if (!title.trim()) {
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a title',
        onClose: () =>
          setDialog({ visible: false, type: 'error', message: '' }),
      })
      return
    }

    if (!categoryId) {
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please select a category',
        onClose: () =>
          setDialog({ visible: false, type: 'error', message: '' }),
      })
      return
    }

    const priceNum = parseFloat(price)
    if (!priceNum || priceNum <= 0) {
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid price',
        onClose: () =>
          setDialog({ visible: false, type: 'error', message: '' }),
      })
      return
    }

    setIsLoading(true)
    try {
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        price: priceNum,
        auctionFlag: isAuction ? 1 : 0,
        quantity: parseInt(quantity) || 1,
      }

      if (isAuction) {
        const startingBidNum = parseFloat(startingBid)
        if (!startingBidNum || startingBidNum <= 0) {
          setDialog({
            visible: true,
            type: 'error',
            title: 'Error',
            message: 'Please enter a valid starting bid',
            onClose: () =>
              setDialog({ visible: false, type: 'error', message: '' }),
          })
          setIsLoading(false)
          return
        }

        updateData.startingBid = startingBidNum
        updateData.bidIncrement = parseFloat(bidIncrement) || 1.0

        const days = parseInt(endDays) || 7
        const now = Math.floor(Date.now() / 1000)
        updateData.endTime = now + days * 86400
      } else {
        // Clear auction fields when switching to buy-now
        updateData.startingBid = undefined
        updateData.bidIncrement = undefined
        updateData.endTime = undefined
      }

      await auctionStore.updateItem(itemId, updateData)
      await auctionStore.loadAllData(true) // Force reload after update

      setDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Listing updated successfully',
        onClose: () => {
          setDialog({ visible: false, type: 'success', message: '' })
          router.back()
        },
      })
    } catch (error: any) {
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update listing',
        onClose: () =>
          setDialog({ visible: false, type: 'error', message: '' }),
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: theme.colors.text }] as any}
          >
            Edit Listing
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
            style={styles.formCard}
          >
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter item title"
                placeholderTextColor={theme.colors.palette.neutral400}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your item..."
                placeholderTextColor={theme.colors.palette.neutral400}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {auctionStore.categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.categoryChip,
                        categoryId === category.id &&
                          styles.categoryChipSelected,
                        categoryId === category.id && {
                          backgroundColor: theme.colors.tint,
                        },
                      ]}
                    >
                      <Text
                        style={
                          [
                            styles.categoryChipText,
                            categoryId === category.id && {
                              color: theme.colors.palette.neutral100,
                            },
                            categoryId !== category.id && {
                              color: theme.colors.text,
                            },
                          ] as any
                        }
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Auction Toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Auction</Text>
                <Switch
                  value={isAuction}
                  onValueChange={setIsAuction}
                  trackColor={{
                    false: theme.colors.palette.neutral400,
                    true: theme.colors.tint,
                  }}
                  thumbColor={theme.colors.palette.neutral100}
                />
              </View>
            </View>

            {/* Price / Starting Bid */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isAuction ? 'Starting Bid *' : 'Price *'}
              </Text>
              <TextInput
                style={styles.input}
                value={isAuction ? startingBid : price}
                onChangeText={isAuction ? setStartingBid : setPrice}
                placeholder={isAuction ? 'Enter starting bid' : 'Enter price'}
                placeholderTextColor={theme.colors.palette.neutral400}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Auction-specific fields */}
            {isAuction && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bid Increment</Text>
                  <TextInput
                    style={styles.input}
                    value={bidIncrement}
                    onChangeText={setBidIncrement}
                    placeholder="1.00"
                    placeholderTextColor={theme.colors.palette.neutral400}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Duration (days)</Text>
                  <TextInput
                    style={styles.input}
                    value={endDays}
                    onChangeText={setEndDays}
                    placeholder="7"
                    placeholderTextColor={theme.colors.palette.neutral400}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                placeholderTextColor={theme.colors.palette.neutral400}
                keyboardType="number-pad"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.tint },
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Updating...' : 'Update Listing'}
              </Text>
            </TouchableOpacity>
          </Glassmorphic>
        </ScrollView>
      </SafeAreaView>

      <AppDialog
        visible={dialog.visible}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onClose={
          dialog.onClose ||
          (() => setDialog({ visible: false, type: 'info', message: '' }))
        }
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 100,
    },
    formCard: {
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.palette.neutral900,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: theme.colors.palette.neutral200,
    },
    textArea: {
      minHeight: 100,
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
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
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
    submitButton: {
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },
  })

export default EditListingScreen
