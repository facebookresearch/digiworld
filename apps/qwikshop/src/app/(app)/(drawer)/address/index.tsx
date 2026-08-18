import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Text } from '@/components'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert } from '@/components/FancyAlert'
import LinearGradient from 'react-native-linear-gradient'

interface Address {
  id: number
  userId: number
  fullName: string
  street: string
  city: string
  state: string
  pincode: string
  phone: string | null
  isDefault: boolean
  country?: string | null
}

const ModernHeader = observer(() => {
  const { userStore } = useStores()
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

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
            colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']}
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
          <Text style={styles.headerTitle}>Your Addresses</Text>
          <Text style={styles.headerSubtitle}>
            {userStore.addresses.length} saved{' '}
            {userStore.addresses.length === 1 ? 'address' : 'addresses'}
          </Text>
        </View>

        {userStore.addresses.length < 3 && (
          <TouchableOpacity
            onPress={() => router.push('/address/new')}
            style={styles.addButton}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons
                name="add"
                size={24}
                color={theme.colors.palette.neutral100}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  )
})

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isOnlyAddress,
}: {
  address: Address
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
  onSetDefault: (address: Address) => void
  isOnlyAddress: boolean
}) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)

  return (
    <LinearGradient
      colors={[theme.colors.card, theme.colors.backgroundSecondary]}
      style={
        address.isDefault
          ? { ...styles.card, ...styles.defaultCard }
          : styles.card
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {address.isDefault && (
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={styles.defaultBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons
            name="star"
            size={12}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.defaultText}>Default</Text>
        </LinearGradient>
      )}

      <View style={styles.cardHeader}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary300,
            theme.colors.palette.primary400,
          ]}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons
            name="location-on"
            size={20}
            color={theme.colors.palette.neutral100}
          />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.name}>{address.fullName}</Text>
          <View style={styles.addressTypeChip}>
            <Text style={styles.addressTypeText}>
              {address.isDefault ? 'Primary Address' : 'Secondary Address'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.addressRow}>
          <MaterialIcons
            name="home"
            size={16}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.address}>{address.street}</Text>
        </View>
        <View style={styles.addressRow}>
          <MaterialIcons
            name="place"
            size={16}
            color={theme.colors.palette.neutral500}
          />
          <Text style={styles.address}>
            {address.city}, {address.state} {address?.country} {address.pincode}
          </Text>
        </View>
        {address.phone && (
          <View style={styles.addressRow}>
            <MaterialIcons
              name="phone"
              size={16}
              color={theme.colors.palette.neutral500}
            />
            <Text style={styles.phoneText}>{address.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(address)}
        >
          <MaterialIcons
            name="edit"
            size={18}
            color={theme.colors.palette.primary600}
          />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        {!address.isDefault && !isOnlyAddress && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onSetDefault(address)}
            >
              <MaterialIcons
                name="star"
                size={18}
                color={theme.colors.palette.accent600}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.palette.accent600 },
                ]}
              >
                Set Default
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(address)}
            >
              <MaterialIcons
                name="delete"
                size={18}
                color={theme.colors.palette.error600}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.palette.error600 },
                ]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  )
}

export default observer(function AddressBookScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setIsSessionLoaded] = useState(false)
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null)
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null)
  const toast = useToast()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('AddressBook', '/(app)/(drawer)/address')

  // Load session data if it exists
  useEffect(() => {
    if (sessionId) {
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data) {
        const sessionData = session.data as any
        console.log(
          'Session data received:',
          JSON.stringify(sessionData, null, 2),
        )

        if (sessionData.sessionData) {
          trackContentChange(sessionData.sessionData)
        }

        setIsSessionLoaded(true)
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    trackScreenMount({
      timestamp: Date.now(),
      addressCount: userStore.addresses.length,
      hasDefaultAddress: userStore.addresses.some(
        (addr: any) => addr.isDefault,
      ),
    })
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    try {
      setIsLoading(true)
      await userStore.loadAddressesFromDb()
      trackContentChange({
        addressesLoaded: true,
        count: userStore.addresses.length,
        hasDefault: userStore.addresses.some((addr: any) => addr.isDefault),
      })
    } catch (error) {
      console.log('Failed to load addresses', error)
      trackContentChange({ addressesLoaded: false, error: String(error) })
      toast.show({
        title: 'Failed to load addresses',
        preset: 'error',
        placement: 'top',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAddress = () => {
    trackClick('addNewAddress')
    // Simply navigate to new address form
    router.push('/address/new')
  }

  const handleEditAddress = (address: Address) => {
    trackClick('editAddress')
    // Pass the address ID for runtime editing
    router.push(`/address/${address.id}`)
  }

  const handleDeleteAddress = async (address: Address) => {
    trackClick('deleteAddressAttempt')

    try {
      // First check if this address is used in any pending orders
      const hasPendingOrders = await userStore.checkAddressHasPendingOrders(
        address.id,
      )

      if (hasPendingOrders) {
        trackContentChange({
          deleteAddressBlocked: true,
          reason: 'pending_orders',
        })
        toast.show({
          title: 'Address cannot be deleted',
          preset: 'error',
          placement: 'top',
          duration: 5000,
        })
        return
      }

      // If we get here, show the delete confirmation
      setAddressToDelete(address)
      setDeleteAddressId(address.id)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      trackContentChange({
        deleteAddressCheckFailed: true,
        error: errorMessage,
      })
      toast.show({
        title: 'Failed to check address status',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    }
  }

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return

    try {
      setIsProcessing(true)

      // Before deleting, create snapshots for completed orders
      await userStore.createAddressSnapshotsForCompletedOrders(
        addressToDelete.id,
      )

      // Now safe to delete
      await userStore.deleteAddress(addressToDelete.id)
      await userStore.loadAddressesFromDb()

      trackContentChange({
        deleteAddressSuccess: true,
        addressId: addressToDelete.id,
      })
      toast.show({
        title: 'Address deleted successfully',
        preset: 'success',
        placement: 'top',
        duration: 3000,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      trackContentChange({
        deleteAddressSuccess: false,
        addressId: addressToDelete.id,
        error: errorMessage,
      })
      toast.show({
        title: 'Failed to delete address',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
      setDeleteAddressId(null)
      setAddressToDelete(null)
    }
  }

  const handleSetDefault = async (address: Address) => {
    trackClick('setDefaultAddress')
    try {
      setIsProcessing(true)
      await userStore.setDefaultAddressLocally(address.id)
      trackContentChange({ setDefaultSuccess: true, addressId: address.id })
      toast.show({
        title: 'Default address updated',
        preset: 'success',
        placement: 'top',
        duration: 3000,
      })
    } catch (error) {
      trackContentChange({
        setDefaultSuccess: false,
        addressId: address.id,
        error: String(error),
      })
      toast.show({
        title: 'Failed to set default address',
        preset: 'error',
        placement: 'top',
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const EmptyAddressBook = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.palette.primary200,
        ]}
        style={styles.emptyIconContainer}
      >
        <MaterialIcons
          name="add-location"
          size={48}
          color={theme.colors.palette.primary600}
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Addresses Yet</Text>
      <Text style={styles.emptyText}>
        Add your delivery addresses to make checkout faster and easier
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={handleAddAddress}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.accent500,
            theme.colors.palette.accent600,
          ]}
          style={styles.addFirstButtonGradient}
        >
          <MaterialIcons
            name="add"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.addFirstButtonText}>Add Your First Address</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  if (isLoading) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary600,
          ]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.headerTitle}>Your Addresses</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.palette.primary500}
          />
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[
        theme.colors.palette.primary100,
        theme.colors.backgroundSecondary,
      ]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <LoadingOverlay visible={isProcessing} message="Processing..." />
      <ModernHeader />

      {userStore.addresses.length === 0 ? (
        <EmptyAddressBook />
      ) : (
        <>
          {/* Modern Stats Preview */}
          <LinearGradient
            colors={[
              theme.colors.palette.primary50,
              theme.colors.palette.primary100,
            ]}
            style={styles.statsPreview}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statItem}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={theme.colors.palette.primary600}
              />
              <Text style={styles.statNumber}>
                {userStore.addresses.length}
              </Text>
              <Text style={styles.statLabel}>Addresses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons
                name="star"
                size={20}
                color={theme.colors.palette.accent600}
              />
              <Text style={styles.statNumber}>
                {
                  userStore.addresses.filter((addr: any) => addr.isDefault)
                    .length
                }
              </Text>
              <Text style={styles.statLabel}>Default</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons
                name="add-circle"
                size={20}
                color={theme.colors.palette.success600}
              />
              <Text style={styles.statNumber}>
                {3 - userStore.addresses.length}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </LinearGradient>

          <FlatList
            data={userStore.addresses}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <AddressCard
                address={item}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                isOnlyAddress={userStore.addresses.length === 1}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <FancyAlert
        visible={deleteAddressId !== null}
        title="Delete Address"
        message="Are you sure you want to delete this address? If this address was used in completed orders, the order history will maintain a snapshot of the address details."
        icon="trash-outline"
        onClose={() => {
          setDeleteAddressId(null)
          setAddressToDelete(null)
          trackClick('deleteAddressCancelled')
        }}
        onConfirm={confirmDeleteAddress}
        confirmText="Delete"
        preset="error"
      />
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
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
    addButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    addButtonGradient: {
      padding: spacing.sm,
      borderRadius: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAddButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: 8,
    },

    // Modern Stats Preview
    statsPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    statNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      marginHorizontal: 12,
    },
    list: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    card: {
      marginBottom: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.lg,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    defaultCard: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary400,
      shadowOpacity: 0.15,
    },

    // Enhanced Card Header
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    addressTypeChip: {
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    addressTypeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.palette.primary600,
    },

    // Enhanced Content
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 8,
    },
    defaultBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 12,
    },
    defaultText: {
      color: theme.colors.palette.neutral100,
      fontSize: 11,
      fontWeight: '700',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    cardContent: {
      marginBottom: spacing.md,
      paddingLeft: spacing.xl,
    },
    address: {
      fontSize: 14,
      color: theme.colors.textDim,
      marginBottom: 4,
      lineHeight: 20,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    phoneText: {
      fontSize: 14,
      color: theme.colors.palette.secondary600,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap', // Allow buttons to wrap to next line
      justifyContent: 'flex-start', // Align buttons to start
      marginTop: spacing.md,
      gap: spacing.xs, // Smaller gap to fit more buttons
    },

    // Clean Action Buttons
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm, // Reduced padding
      paddingVertical: spacing.xs, // Reduced padding
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral100,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      gap: 4, // Smaller gap between icon and text
      flex: 1, // Allow buttons to share available space equally
      maxWidth: '32%', // Ensure buttons don't exceed 1/3 of width
      justifyContent: 'center', // Center content in button
    },
    actionText: {
      fontSize: 12, // Smaller font size to fit better
      fontWeight: '600',
      color: theme.colors.palette.primary600,
      textAlign: 'center', // Center align text
    },
    deleteButton: {
      backgroundColor: theme.colors.palette.error100,
      borderColor: theme.colors.palette.error300,
    },
    deleteText: {
      color: theme.colors.palette.error600,
      fontSize: 13,
      fontWeight: '600',
    },
    defaultButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.palette.accent100,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
    },
    defaultButtonText: {
      color: theme.colors.palette.accent600,
      fontSize: 13,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textDim,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    addFirstButton: {
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    addFirstButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 16,
    },
    addFirstButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '700',
    },
  })
