import React, { useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, type Theme } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models'
import { useRouter, Stack, useFocusEffect } from 'expo-router'
import { AnimatedBackground, Glassmorphic } from '@/components'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useAppTheme } from '@andojo/shared-theme'

export default observer(function PaymentMethodsScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { userStore, auctionStore } = useStores()
  const { trackScreenMount } = useInteractionTracking(
    'payment-methods',
    '/payments',
  )

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'payment-methods',
        route: '/payments',
      })
    }, [trackScreenMount]),
  )

  React.useEffect(() => {
    if (userStore.user) {
      auctionStore.loadUserPaymentMethods(userStore.user.id)
    }
  }, [userStore.user])

  const userPaymentMethods = userStore.user
    ? auctionStore.getUserPaymentMethods(userStore.user.id)
    : []

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cardWrapper}>
      <Glassmorphic
        borderRadius={16}
        padding={20}
        variant="strong"
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeContainer}>
            <Glassmorphic
              borderRadius={20}
              padding={10}
              variant="subtle"
              style={styles.cardIconContainer}
            >
              <Ionicons name="card" size={20} color={theme.colors.tint} />
            </Glassmorphic>
            <Text style={{ ...styles.cardType, color: theme.colors.text }}>
              {item.cardType}
            </Text>
          </View>
          {item.isDefault ? (
            <Glassmorphic
              borderRadius={8}
              padding={6}
              backgroundColor={theme.colors.tint}
              style={styles.defaultBadge}
            >
              <Text style={styles.defaultText}>Default</Text>
            </Glassmorphic>
          ) : (
            <TouchableOpacity
              onPress={() => auctionStore.setDefaultPaymentMethod(item.id)}
              activeOpacity={0.7}
            >
              <Text
                style={{ ...styles.makeDefaultText, color: theme.colors.tint }}
              >
                Make Default
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ ...styles.cardNumber, color: theme.colors.text }}>
          •••• •••• •••• {item.cardNumber.slice(-4)}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterItem}>
            <Text style={{ ...styles.label, color: theme.colors.textDim }}>
              Card Holder
            </Text>
            <Text style={{ ...styles.value, color: theme.colors.text }}>
              {item.cardHolderName}
            </Text>
          </View>
          <View style={styles.cardFooterItem}>
            <Text style={{ ...styles.label, color: theme.colors.textDim }}>
              Expires
            </Text>
            <Text style={{ ...styles.value, color: theme.colors.text }}>
              {item.expiry}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => auctionStore.removeUserPaymentMethod(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={theme.colors.palette.angry500}
          />
        </TouchableOpacity>
      </Glassmorphic>
    </View>
  )

  return (
    <AnimatedBackground>
      <Stack.Screen
        options={{ title: 'Payment Methods', headerBackTitle: 'Profile' }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={{ ...styles.headerTitle, color: theme.colors.text }}>
              Payment Methods
            </Text>
            <Text
              style={{ ...styles.headerSubtitle, color: theme.colors.textDim }}
            >
              Manage your payment cards
            </Text>
          </View>
        </View>
        <FlatList
          data={userPaymentMethods}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Glassmorphic
                borderRadius={26}
                padding={40}
                variant="strong"
                style={styles.emptyStateCard}
              >
                <Ionicons
                  name="card-outline"
                  size={64}
                  color={theme.colors.textDim}
                />
                <Text
                  style={{ ...styles.emptyTitle, color: theme.colors.text }}
                >
                  No Payment Methods
                </Text>
                <Text
                  style={{ ...styles.emptyText, color: theme.colors.textDim }}
                >
                  Add a credit card to make payments easier.
                </Text>
              </Glassmorphic>
            </View>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => router.push('/payments/add')}
            activeOpacity={0.8}
            style={styles.addButtonWrapper}
          >
            <Glassmorphic
              borderRadius={16}
              padding={16}
              backgroundColor={theme.colors.tint}
              style={styles.addButton}
            >
              <Ionicons
                name="add"
                size={24}
                color={theme.colors.palette.neutral100}
              />
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </Glassmorphic>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AnimatedBackground>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
    },
    backButton: {
      padding: 4,
      marginLeft: -4,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '500',
    },
    listContent: {
      padding: 20,
      paddingBottom: 100,
    },
    cardWrapper: {
      marginBottom: 16,
    },
    card: {
      width: '100%',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    cardTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardIconContainer: {
      marginRight: 0,
    },
    cardType: {
      fontSize: 18,
      fontWeight: '600',
    },
    defaultBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    defaultText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
    makeDefaultText: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardNumber: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 2,
      marginBottom: 20,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    cardFooterItem: {
      flex: 1,
    },
    label: {
      fontSize: 12,
      marginBottom: 4,
    },
    value: {
      fontSize: 14,
      fontWeight: '600',
    },
    deleteButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      padding: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      marginTop: 40,
    },
    emptyStateCard: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      width: '100%',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
    },
    footer: {
      padding: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    addButtonWrapper: {
      width: '100%',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })
