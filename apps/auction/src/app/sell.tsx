import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
  Image,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { Glassmorphic, AppDialog, ProductPlaceholder } from '@/components'
import { useInputRefs } from '@/hooks/useInputRefs'
import { useAppTheme } from '@andojo/shared-theme'

const SellScreen = observer(() => {
  const { auctionStore, userStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('sell', '/sell')
  const { registerRef, focusFieldAtEnd } = useInputRefs()

  // Create refs for each input field
  const titleRef = useRef<TextInput>(null)
  const descriptionRef = useRef<TextInput>(null)
  const priceRef = useRef<TextInput>(null)
  const startingBidRef = useRef<TextInput>(null)
  const endDaysRef = useRef<TextInput>(null)

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
      trackScreenMount()
      // Register refs when screen comes into focus
      registerRef('title', titleRef.current)
      registerRef('description', descriptionRef.current)
      registerRef('price', priceRef.current)
      registerRef('startingBid', startingBidRef.current)
      registerRef('endDays', endDaysRef.current)
    }, [trackScreenMount, registerRef, uiStore]),
  )

  useEffect(() => {
    return () => {
      uiStore.resetSellForm()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'sell',
        route: '/sell',
      })
    }, []),
  )

  // Handle focus restoration from deeplink/session
  useEffect(() => {
    const focusedField = uiStore.sellForm.currentFocused
    if (focusedField) {
      const value = uiStore.sellForm[
        focusedField as keyof typeof uiStore.sellForm
      ] as string
      setTimeout(() => {
        focusFieldAtEnd(focusedField, value)
      }, 300)
    }
  }, [uiStore.sellForm.currentFocused, focusFieldAtEnd])

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        uiStore.setSellDialog({
          visible: true,
          type: 'error',
          title: 'Permission Denied',
          message: 'Please grant camera roll permissions to upload images',
        })
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        uiStore.setSellItemImage(imageData)
      }
    } catch (error: any) {
      uiStore.setSellDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to pick image',
      })
    }
  }

  const handleSubmit = async () => {
    const {
      title,
      description,
      categoryId,
      price,
      isAuction,
      startingBid,
      endDays,
      quantity,
      itemImage,
    } = uiStore.sellForm

    if (!userStore.user?.id) {
      uiStore.setSellDialog({
        visible: true,
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to list an item',
        callbackAction: 'navigate_login',
      })
      return
    }

    if (!title.trim()) {
      uiStore.setSellDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a title',
      })
      return
    }

    if (!categoryId) {
      uiStore.setSellDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please select a category',
      })
      return
    }

    // Validate price/starting bid based on listing type
    let priceNum: number
    if (!isAuction) {
      // For buy-now items, validate price
      priceNum = parseFloat(price)
      if (!priceNum || priceNum <= 0) {
        uiStore.setSellDialog({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Please enter a valid price',
        })
        return
      }
    } else {
      // For auction items, validate starting bid and use it as price
      const startingBidNum = parseFloat(startingBid)
      if (!startingBidNum || startingBidNum <= 0) {
        uiStore.setSellDialog({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Please enter a valid starting bid',
        })
        return
      }
      // Use starting bid as the price for auctions
      priceNum = startingBidNum
    }

    try {
      const endTime = isAuction
        ? Math.floor(Date.now() / 1000) + parseInt(endDays) * 86400
        : undefined

      await auctionStore.listItem({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId!,
        sellerId: userStore.user.id,
        price: priceNum,
        auctionFlag: isAuction ? 1 : 0,
        startingBid: isAuction ? parseFloat(startingBid) : undefined,
        // bidIncrement defaults to 1.0 in backend
        endTime,
        quantity: parseInt(quantity) || 1,
        imageUrl: itemImage || undefined,
      })

      uiStore.setSellDialog({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Item listed successfully!',
        callbackAction: 'success_list_item',
      })
    } catch (error: any) {
      uiStore.setSellDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to list item',
      })
      console.error(error)
    }
  }

  if (!userStore.isAuthenticated || !userStore.user) {
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
          <View style={styles.emptyState}>
            <Ionicons
              name="person-outline"
              size={64}
              color={theme.colors.palette.neutral400}
            />
            <Text style={styles.emptyText}>Please sign in to list an item</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInButton}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

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
          <Text style={styles.headerTitle}>List New Item</Text>
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
            {/* Image Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Image</Text>
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.8}
                style={styles.imageContainer}
              >
                {uiStore.sellForm.itemImage ? (
                  <Image
                    source={{ uri: uiStore.sellForm.itemImage }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ProductPlaceholder seed="new-item" borderRadius={12} />
                  </View>
                )}
                <View style={styles.imageOverlay}>
                  <Ionicons
                    name="camera"
                    size={32}
                    color={theme.colors.palette.neutral100}
                  />
                  <Text style={styles.imageOverlayText}>
                    {uiStore.sellForm.itemImage
                      ? 'Tap to change'
                      : 'Tap to add image'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                ref={titleRef}
                style={styles.input}
                value={uiStore.sellForm.title}
                onChangeText={uiStore.setSellTitle}
                onFocus={() => uiStore.setSellFocused('title')}
                onBlur={() => uiStore.setSellFocused(null)}
                placeholder="Enter item title"
                placeholderTextColor={theme.colors.palette.neutral400}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                ref={descriptionRef}
                style={[styles.input, styles.textArea]}
                value={uiStore.sellForm.description}
                onChangeText={uiStore.setSellDescription}
                onFocus={() => uiStore.setSellFocused('description')}
                onBlur={() => uiStore.setSellFocused(null)}
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
                {auctionStore.categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => uiStore.setSellCategoryId(category.id)}
                    style={[
                      styles.categoryChip,
                      uiStore.sellForm.categoryId === category.id &&
                        styles.categoryChipSelected,
                    ]}
                  >
                    <Text
                      style={
                        uiStore.sellForm.categoryId === category.id
                          ? {
                              ...styles.categoryChipText,
                              ...styles.categoryChipTextSelected,
                            }
                          : styles.categoryChipText
                      }
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Listing Type */}
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Auction</Text>
                  <Text style={styles.switchSubtext}>
                    Set starting bid and end time
                  </Text>
                </View>
                <Switch
                  value={uiStore.sellForm.isAuction}
                  onValueChange={uiStore.setSellIsAuction}
                  trackColor={{
                    false: theme.colors.palette.neutral400,
                    true: theme.colors.palette.primary500,
                  }}
                  thumbColor={theme.colors.palette.neutral100}
                />
              </View>
            </View>

            {/* Price / Starting Bid */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {uiStore.sellForm.isAuction ? 'Starting Bid *' : 'Price *'}
              </Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  ref={uiStore.sellForm.isAuction ? startingBidRef : priceRef}
                  style={styles.priceInputField}
                  value={
                    uiStore.sellForm.isAuction
                      ? uiStore.sellForm.startingBid
                      : uiStore.sellForm.price
                  }
                  onChangeText={
                    uiStore.sellForm.isAuction
                      ? uiStore.setSellStartingBid
                      : uiStore.setSellPrice
                  }
                  onFocus={() =>
                    uiStore.setSellFocused(
                      uiStore.sellForm.isAuction ? 'startingBid' : 'price',
                    )
                  }
                  onBlur={() => uiStore.setSellFocused(null)}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.palette.neutral400}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Auction-specific fields */}
            {uiStore.sellForm.isAuction && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Auction Duration (days)</Text>
                <TextInput
                  ref={endDaysRef}
                  style={styles.input}
                  value={uiStore.sellForm.endDays}
                  onChangeText={uiStore.setSellEndDays}
                  onFocus={() => uiStore.setSellFocused('endDays')}
                  onBlur={() => uiStore.setSellFocused(null)}
                  placeholder="7"
                  placeholderTextColor={theme.colors.palette.neutral400}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={auctionStore.isLoading}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.submitButtonText}>
                {auctionStore.isLoading ? 'Listing...' : 'List Item'}
              </Text>
            </TouchableOpacity>
          </Glassmorphic>
        </ScrollView>
      </SafeAreaView>
      <AppDialog
        visible={uiStore.sellForm.dialog.visible}
        type={uiStore.sellForm.dialog.type as 'success' | 'error' | 'info'}
        title={uiStore.sellForm.dialog.title || undefined}
        message={uiStore.sellForm.dialog.message}
        onClose={() => {
          const action = uiStore.sellForm.dialog.callbackAction
          uiStore.hideSellDialog()

          // Handle callback actions
          if (action === 'navigate_login') {
            router.push('/(auth)/login')
          } else if (action === 'success_list_item') {
            uiStore.resetSellForm()
            router.back()
          }
        }}
        autoClose={uiStore.sellForm.dialog.type === 'success'}
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.5,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    formCard: {
      marginHorizontal: 20,
      marginTop: 8,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginBottom: 10,
    },
    input: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary100,
      marginRight: 10,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.palette.primary200,
      borderColor: theme.colors.palette.primary500,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
    },
    categoryChipTextSelected: {
      color: theme.colors.palette.primary500,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    switchSubtext: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      marginTop: 4,
    },
    priceInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      marginRight: 8,
    },
    priceInputField: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.palette.primary500,
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
      marginTop: 8,
    },
    submitButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral900,
      marginTop: 16,
      marginBottom: 24,
      textAlign: 'center',
    },
    signInButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 16,
    },
    signInButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    imageContainer: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: theme.colors.palette.primary100,
      borderWidth: 1,
      borderColor: theme.colors.palette.primary300,
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay50,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    imageOverlayText: {
      color: theme.colors.palette.neutral100,
      fontSize: 14,
      fontWeight: '600',
    },
  })

export default SellScreen
