import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Header, Screen, Text } from '@/components'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useAppTheme, Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { useToast } from '@/components/Toast'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { MaterialIcons } from '@expo/vector-icons'
import { FancyAlert } from '@/components/FancyAlert'

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

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isOnlyAddress,
  theme,
}: {
  address: Address
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
  onSetDefault: (address: Address) => void
  isOnlyAddress: boolean
  theme: Theme
}) => {
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.card, address.isDefault && styles.defaultCard]}>
      {address.isDefault && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultText}>Default</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.name}>{address.fullName}</Text>
        <Text style={styles.address}>{address.street}</Text>
        <Text style={styles.address}>
          {address.city}, {address.state} {address?.country} {address.pincode}
        </Text>
        {address.phone && (
          <Text style={styles.address}>Phone: {address.phone}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(address)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        {!address.isDefault && !isOnlyAddress && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(address)}
            >
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.defaultButton]}
              onPress={() => onSetDefault(address)}
            >
              <Text style={[styles.actionText, styles.defaultButtonText]}>
                Set as Default
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

export default observer(function AddressBookScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setIsSessionLoaded] = useState(false)
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null)
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null)
  const toast = useToast()

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
      hasDefaultAddress: userStore.addresses.some(addr => addr.isDefault),
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
        hasDefault: userStore.addresses.some(addr => addr.isDefault),
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
      <MaterialIcons
        name="location-on"
        size={64}
        color={theme.colors.palette.neutral400}
      />
      <Text style={styles.emptyTitle}>No Addresses Yet</Text>
      <Text style={styles.emptyText}>
        Your addresses will show up here once you add them
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={handleAddAddress}
      >
        <Text style={styles.addFirstButtonText}>Add Your First Address</Text>
      </TouchableOpacity>
    </View>
  )

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
        />
      </Screen>
    )
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isProcessing} message="Processing..." />
      <Header
        title="Your Addresses"
        leftIcon="back"
        onLeftPress={() => router.back()}
      />
      {userStore.addresses.length === 0 ? (
        <EmptyAddressBook />
      ) : (
        <>
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
                theme={theme}
              />
            )}
            contentContainerStyle={styles.list}
          />
          {userStore.addresses.length < 3 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddAddress}
              >
                <Text style={styles.addButtonText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          )}
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
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      display: 'flex',
      position: 'relative',
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.xs,
      marginRight: spacing.md,
    },
    addButtonText: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
      textAlign: 'center',
    },
    list: {
      padding: spacing.md,
    },
    card: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      elevation: 2,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    defaultCard: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    defaultBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: spacing.sm,
    },
    defaultText: {
      color: theme.colors.palette.neutral100,
      fontSize: 12,
      fontWeight: '600',
    },
    cardContent: {
      marginBottom: spacing.md,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: spacing.xs,
      color: theme.colors.text,
    },
    address: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: spacing.xxs,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: spacing.sm,
    },
    actionButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: spacing.xs,
      backgroundColor: theme.colors.palette.neutral200,
    },
    actionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    defaultButton: {
      backgroundColor: theme.colors.palette.primary500,
    },
    defaultButtonText: {
      color: theme.colors.palette.neutral100,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      padding: spacing.sm,
      flex: 200,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    addFirstButton: {
      backgroundColor: theme.colors.palette.primary500,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    addFirstButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })
