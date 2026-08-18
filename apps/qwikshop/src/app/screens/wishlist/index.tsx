import React, { useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Text, ProductCard } from '@/components'
import { useStores } from '@/models'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ModernHeader = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore } = useStores()
  const wishlistCount = userStore.currentUser?.wishlistIds?.length || 0

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ]}
      style={styles.headerContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <LinearGradient
            colors={[
              `${theme.colors.palette.neutral100}33`,
              `${theme.colors.palette.neutral100}1A`,
            ]}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <Text style={styles.headerSubtitle}>
            {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved
          </Text>
        </View>
      </View>
    </LinearGradient>
  )
})

export const WishlistScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, productStore, cartStore } = useStores()
  const [refreshing, setRefreshing] = React.useState(false)
  const insets = useSafeAreaInsets()
  const scrollY = React.useRef(new Animated.Value(0)).current

  // Get wishlist products by filtering products based on wishlist IDs
  const wishlistProducts = React.useMemo(() => {
    const wishlistIds = userStore.currentUser?.wishlistIds || []
    return productStore.products.filter(product =>
      wishlistIds.includes(product.id),
    )
  }, [userStore.currentUser?.wishlistIds, productStore.products])

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await productStore.loadProducts()
    } catch (error) {
      console.error('Failed to refresh wishlist:', error)
    } finally {
      setRefreshing(false)
    }
  }, [productStore])

  const handleProductPress = (product: any) => {
    router.push(`/screens/product/${product.id}`)
  }

  const handleAddToCart = (product: any) => {
    cartStore.addItem(product.id, 1)
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      cartStore.removeItem(productId)
    } else {
      cartStore.updateQuantity(productId, quantity)
    }
  }

  const handleWishlisting = (productId: number) => {
    userStore.handleWishlisting(productId)
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary400,
            theme.colors.palette.primary500,
          ]}
          style={styles.emptyIconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons
            name="favorite-border"
            size={48}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>
      </View>

      <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Discover amazing products and save them to your wishlist for later
      </Text>

      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          router.back()
        }}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={styles.emptyActionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons
            name="explore"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.emptyActionText}>Explore Products</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  const renderProduct = ({ item }: { item: any; index: number }) => (
    <Animated.View
      style={[
        styles.productContainer,
        {
          opacity: scrollY.interpolate({
            inputRange: [0, 100],
            outputRange: [1, 0.8],
            extrapolate: 'clamp',
          }),
        },
      ]}
    >
      <View style={styles.productWrapper}>
        <ProductCard
          product={item}
          onPress={handleProductPress}
          handleAddToCart={handleAddToCart}
          handleUpdateQuantity={handleUpdateQuantity}
          handleWishlisting={handleWishlisting}
        />
      </View>
    </Animated.View>
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ModernHeader />

        {wishlistProducts.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.contentContainer}>
            <Animated.FlatList
              data={wishlistProducts}
              renderItem={renderProduct}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              contentContainerStyle={[
                styles.listContainer,
                { paddingBottom: insets.bottom + 80 },
              ]}
              columnWrapperStyle={styles.row}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false },
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary500]}
                  tintColor={theme.colors.primary500}
                  progressBackgroundColor={theme.colors.palette.neutral100}
                />
              }
            />
          </View>
        )}
      </LinearGradient>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      flex: 1,
    },

    // Header Styles
    headerContainer: {
      paddingTop: 50,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    backButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: spacing.md,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral200,
      fontWeight: '500',
      marginTop: 2,
    },
    shopButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    shopButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },

    // Content Styles
    contentContainer: {
      flex: 1,
    },
    quickActionsContainer: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionsGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    quickAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    quickActionDivider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: spacing.md,
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },

    // List Styles
    listContainer: {
      padding: spacing.md,
    },
    row: {
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    productContainer: {
      flex: 1,
      marginHorizontal: spacing.xs,
      marginBottom: spacing.md,
    },
    productWrapper: {
      position: 'relative',
      flex: 1,
    },
    wishlistOverlay: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      zIndex: 10,
    },
    removeButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    removeButtonGradient: {
      padding: 6,
      borderRadius: 12,
    },

    // Empty State Styles
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: 24,
      width: '100%',
      maxWidth: 320,
    },
    emptyIconContainer: {
      marginBottom: spacing.lg,
      borderRadius: 32,
      overflow: 'hidden',
    },
    emptyIconGradient: {
      padding: spacing.lg,
      borderRadius: 32,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    emptyActionButton: {
      borderRadius: 25,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    emptyActionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderRadius: 25,
    },
    emptyActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },

    // Floating Action Button
    fabContainer: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      zIndex: 100,
    },
    fab: {
      borderRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    fabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderRadius: 28,
    },
    fabText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default WishlistScreen
