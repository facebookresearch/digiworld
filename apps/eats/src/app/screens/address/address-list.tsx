import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Screen, Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'

function formatAddress(item: any) {
  // Compose address as in the screenshot, defensively
  let line = (item.addressLine1 ?? '') || ''
  if (item.addressLine2) line += `, ${item.addressLine2 ?? ''}`
  if (item.city || item.state || item.postalCode) {
    line += `, ${item.city ?? ''}${item.city && item.state ? ', ' : ''}${item.state ?? ''} ${item.postalCode ?? ''}`
  }
  return line.trim()
}

const AddressListScreen = observer(() => {
  const { userStore, sessionStore } = useStores()
  const { sessionId, sessionTimeStamp } = useLocalSearchParams()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const itemRefs = useRef<{ [key: string]: View | null }>({})
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('AddressList', '/screens/address/address-list')
  const { theme } = useTheme()
  const colors = theme.colors

  // Mapping of label to icon config
  const ICONS: Record<string, { name: string; color: string }> = {
    HOME: { name: 'home', color: colors.palette.accent400 },
    OFFICE: { name: 'briefcase', color: colors.palette.secondary400 },
    OTHER: { name: 'location', color: colors.palette.primary600 },
  }

  // Separate styles for View and Text components
  const viewStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.transparent,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.palette.primary300,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      elevation: 2,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.neutral100,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
      position: 'relative',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    iconBtn: {
      marginLeft: 10,
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -60,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.palette.primary100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    optionsMenu: {
      position: 'absolute',
      backgroundColor: colors.palette.neutral100,
      borderRadius: 12,
      padding: 8,
      width: 120,
      shadowColor: colors.palette.neutral900,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    listContainer: {
      flex: 1,
      position: 'relative',
    },
    menuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.palette.primary100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
    },
    listContent: {
      paddingBottom: 100,
    },
    fabContainer: {
      position: 'absolute',
      right: 20,
      bottom: 120,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.palette.primary600,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: colors.palette.primary600,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    flexContainer: {
      flex: 1,
    },
  })

  const textStyles = StyleSheet.create({
    headerText: {
      fontSize: 22,
      color: colors.palette.neutral600,
    },
    label: {
      fontSize: 15,
      marginBottom: 2,
      color: colors.text,
    },
    address: {
      fontSize: 13,
      color: colors.textDim,
    },
    emptyText: {
      color: colors.textDim,
      marginTop: 2,
    },
    menuText: {
      fontSize: 14,
      color: colors.text,
    },
    defaultText: {
      fontSize: 12,
      color: colors.palette.primary600,
      marginLeft: 2,
    },
  })

  console.log('sessionTimeStamp', sessionTimeStamp)

  // Load session data if exists
  useEffect(() => {
    if (sessionTimeStamp) {
      userStore.fetchAddresses()
      console.log('sessionTimeStamp', sessionTimeStamp)
      const session = sessionStore.getSession(sessionId as string)
      if (session?.data?.sessionData) {
        const formData = session.data.sessionData.formData as any
        console.log('formData', formData)
        if (formData) {
          // Restore complete address list if available (this takes precedence for rollback)
          if (formData.addressList) {
            // Replace the entire address list with the restored state
            // This ensures we get the original state, not the edited state
            userStore.setAddresses(formData.addressList)
          } else if (formData.addressData) {
            // Only use addressData if addressList is not available
            const existingAddressIndex = userStore.addresses.findIndex(
              addr => addr.id === formData.addressData.id,
            )
            if (existingAddressIndex !== -1) {
              // Update the existing address with restored data
              userStore.updateAddress(
                formData.addressData.id,
                formData.addressData,
              )
            }
          }

          // Only restore UI state specific to address list screen
          if (formData.selectedAddress) {
            setSelectedAddress(formData.selectedAddress)
          }
          if (formData.showOptions) {
            setShowOptions(true)
            setMenuPosition(formData.menuPosition || { top: 0, right: 0 })
          }

          // Clear any form data that belongs to other screens to prevent conflicts
          if (formData.addressLine1 || formData.addressLine2 || formData.city) {
            // This form data belongs to add-address screen, not address-list screen
            // We should not restore it here to avoid conflicts
            console.log(
              'Ignoring form data from add-address screen in address-list',
            )
          }
        }
      }
    }
  }, [sessionTimeStamp, sessionStore, userStore.addresses])

  // Track screen mount with initial data
  useEffect(() => {
    trackScreenMount({
      addressCount: userStore.addresses.length,
      addressList: userStore.addresses.toJSON(),
      deletingId,
      hasDefaultAddress: userStore.addresses.some(addr => addr.isDefault === 1),
      timestamp: Date.now(),
    })
  }, [userStore.addresses])

  const handleAddAddress = useCallback(() => {
    trackClick('addAddress')
    trackContentChange({
      action: 'add_address_click',
      addressList: userStore.addresses.toJSON(),
      timestamp: Date.now(),
    })
    router.push('/screens/address/add-address')
  }, [userStore.addresses])

  const handleEditAddress = useCallback(
    (address: any) => {
      trackClick('editAddress')
      trackContentChange({
        action: 'edit_address',
        addressId: address.id,
        addressLabel: address.label,
        timestamp: Date.now(),
      })
      router.push({
        pathname: '/screens/address/add-address',
        params: {
          address: JSON.stringify(address),
          sessionId: sessionId as string,
        },
      })
    },
    [sessionId],
  )

  const handleDeleteAddress = useCallback(
    async (addressId: number) => {
      try {
        setDeletingId(addressId)
        trackClick('deleteAddress')
        trackContentChange({
          action: 'delete_address',
          addressId,
          addressList: userStore.addresses.toJSON(),
          timestamp: Date.now(),
        })
        await userStore.deleteAddress(addressId)
      } catch (error) {
        console.error('Failed to delete address:', error)
        trackContentChange({
          action: 'delete_address_error',
          addressId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        })
      } finally {
        setDeletingId(null)
      }
    },
    [userStore],
  )

  const handleMorePress = useCallback((address: any) => {
    const ref = itemRefs.current[address.id]
    if (ref) {
      ref.measureInWindow((_x, y, _width, _height) => {
        setSelectedAddress(address)
        setMenuPosition({
          top: y,
          right: 16,
        })
        setShowOptions(true)
        trackClick('moreOptions')
        trackContentChange({
          action: 'show_options',
          addressId: address.id,
          addressLabel: address.label,
          timestamp: Date.now(),
          formData: {
            selectedAddress: address,
            showOptions: true,
            menuPosition: { top: y, right: 16 },
          },
        })
      })
    }
  }, [])

  const handleEdit = useCallback(() => {
    setShowOptions(false)
    console.log('handleEdit - selectedAddress:', selectedAddress)
    if (selectedAddress) {
      handleEditAddress(selectedAddress)
    } else {
      console.error('selectedAddress is null or undefined')
    }
  }, [selectedAddress, handleEditAddress])

  const handleDelete = useCallback(() => {
    setShowOptions(false)
    handleDeleteAddress(selectedAddress.id)
  }, [selectedAddress, handleDeleteAddress])

  const handleOverlayPress = useCallback(() => {
    setShowOptions(false)
    // Don't clear selectedAddress when closing options menu
    // This allows the edit functionality to work properly after rollback
    trackClick('closeOptions')
    trackContentChange({
      action: 'close_options',
      timestamp: Date.now(),
      formData: {
        selectedAddress, // Keep the selectedAddress
        showOptions: false,
      },
    })
  }, [selectedAddress])

  const handleAddressSelect = useCallback(
    (address: any) => {
      trackClick('selectAddress')
      trackContentChange({
        action: 'select_address',
        addressId: address.id,
        addressLabel: address.label,
        isDefault: address.isDefault === 1,
        timestamp: Date.now(),
        formData: {
          selectedAddress: address,
        },
      })
      userStore.setSelectedAddress(address)
      router.push('/(tabs)/home')
    },
    [userStore],
  )

  const renderAddress = ({ item }: { item: any }) => {
    const iconKey = ((item.label ?? '') || '').toUpperCase()
    const icon = ICONS[iconKey] || ICONS.HOME

    return (
      <TouchableOpacity
        onPress={() => handleAddressSelect(item)}
        activeOpacity={0.7}
      >
        <View
          ref={ref => (itemRefs.current[item.id] = ref)}
          style={viewStyles.card}
        >
          <View
            style={[
              viewStyles.iconContainer,
              { backgroundColor: icon.color + '22' },
            ]}
          >
            <Ionicons name={icon.name as any} size={28} color={icon.color} />
          </View>
          <View style={viewStyles.flexContainer}>
            <View style={viewStyles.labelContainer}>
              <Text weight="bold" style={textStyles.label}>
                {((item.label ?? '') || '').toUpperCase()}
              </Text>
              {item.isDefault === 1 && (
                <View style={viewStyles.defaultBadge}>
                  <Text style={textStyles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={textStyles.address}>{formatAddress(item)}</Text>
          </View>
          <TouchableOpacity
            style={viewStyles.iconBtn}
            onPress={e => {
              e.stopPropagation()
              handleMorePress(item)
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={colors.textDim}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  const Header = () => (
    <View style={viewStyles.headerRow}>
      <TouchableOpacity
        style={viewStyles.backBtn}
        onPress={() => router.replace('/(tabs)/home')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color={colors.palette.neutral100}
        />
      </TouchableOpacity>
      <Text size="xl" style={textStyles.headerText}>
        Saved Addresses
      </Text>
    </View>
  )

  const EmptyState = () => (
    <View style={viewStyles.emptyContainer}>
      <View style={viewStyles.emptyIconCircle}>
        <Ionicons
          name="location-outline"
          size={40}
          color={colors.palette.primary300}
        />
      </View>
      <Text size="large" weight="bold" style={textStyles.emptyText}>
        No address added yet
      </Text>
    </View>
  )

  return (
    <Screen style={viewStyles.container} safeAreaEdges={['top']}>
      <Header />
      <View style={viewStyles.listContainer}>
        <FlatList
          data={userStore.addresses}
          keyExtractor={item => item.id.toString()}
          renderItem={renderAddress}
          contentContainerStyle={viewStyles.listContent}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          ListEmptyComponent={<EmptyState />}
        />
        {showOptions && selectedAddress && (
          <TouchableOpacity
            style={viewStyles.menuOverlay}
            activeOpacity={1}
            onPress={handleOverlayPress}
          >
            <View
              style={[
                viewStyles.optionsMenu,
                { top: menuPosition.top, right: menuPosition.right },
              ]}
            >
              <TouchableOpacity
                style={viewStyles.menuItem}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.palette.primary600}
                />
                <Text style={textStyles.menuText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={viewStyles.menuItem}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.palette.angry500}
                />
                <Text
                  style={{
                    ...textStyles.menuText,
                    color: colors.palette.angry500,
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>
      <View style={viewStyles.fabContainer}>
        <TouchableOpacity
          style={viewStyles.fab}
          onPress={handleAddAddress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.palette.neutral100} />
        </TouchableOpacity>
      </View>
    </Screen>
  )
})

export default AddressListScreen
