import React, { useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { useStores } from '@/models'
import { Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Glassmorphic, ItemCard } from '@/components'
import { debounce } from 'lodash'
import { useAppTheme } from '@andojo/shared-theme'

const InventoryScreen = observer(() => {
  const { userStore, auctionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('inventory', '/inventory')

  useEffect(() => {
    if (userStore.isAuthenticated && userStore.user?.id) {
      // Only load data if not already loaded (prevents blocking tab switches)
      if (!auctionStore.dataLoaded) {
        auctionStore.loadAllData().catch(console.error)
      }
    }
  }, [userStore.isAuthenticated, userStore.user?.id])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'inventory',
        route: '/inventory',
      })
    }, [trackScreenMount]),
  )

  const handleItemPress = debounce((itemId: number) => {
    router.push(`/item/${itemId}`)
  }, 300)

  // Get user's purchased items from transactions
  const userPurchases = userStore.user?.id
    ? auctionStore.getPurchasesByUser(userStore.user.id)
    : []

  const purchasedItems = userPurchases
    .map(txn => {
      if (txn.itemId) {
        return auctionStore.getItemById(txn.itemId)
      }
      return null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

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
            <Text style={styles.emptyText}>
              Please sign in to view your inventory
            </Text>
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
          <View>
            <Text style={styles.headerTitle}>My Inventory</Text>
            <Text style={styles.headerSubtitle}>Items you've purchased</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {purchasedItems.length > 0 ? (
            <View style={styles.itemsGrid}>
              {purchasedItems.map(item => {
                const seller = auctionStore.getUserById(item.sellerId)
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    seller={seller || undefined}
                    onPress={handleItemPress}
                    size="medium"
                    showSeller={true}
                  />
                )
              })}
            </View>
          ) : (
            <Glassmorphic
              borderRadius={26}
              padding={40}
              intensity={Platform.OS === 'ios' ? 70 : 85}
              backgroundColor={
                Platform.OS === 'ios'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.85)'
              }
              borderColor="rgba(255, 255, 255, 0.45)"
              borderWidth={1}
              style={styles.emptyState}
            >
              <Ionicons
                name="cube-outline"
                size={64}
                color={theme.colors.palette.neutral400}
              />
              <Text style={styles.emptyText}>No items in inventory</Text>
              <Text style={styles.emptySubtext}>
                Start bidding or buying items to build your collection
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/pay-bills')}
                style={styles.browseButton}
              >
                <Text style={styles.browseButtonText}>Browse Items</Text>
              </TouchableOpacity>
            </Glassmorphic>
          )}
        </ScrollView>
      </SafeAreaView>
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
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      letterSpacing: -0.6,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      fontWeight: '500',
    },
    scrollContent: {
      paddingBottom: 100,
      paddingHorizontal: 20,
    },
    itemsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      marginTop: 40,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 24,
    },
    browseButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
    },
    browseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    signInButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 8,
    },
    signInButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
  })

export default InventoryScreen
