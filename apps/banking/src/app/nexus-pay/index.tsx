// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FancyAlert } from '@/components/FancyAlert'
import { debounce } from 'lodash'

const NexusPayScreen = observer(() => {
  const { bankingStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking('nexus-pay', '/nexus-pay')

  const searchRef = useRef<TextInput>(null)

  // Load Zelle contacts on mount
  useEffect(() => {
    bankingStore.loadZelleContacts()
  }, [])

  useEffect(() => {
    if (sessionTimeStamp) {
      if (bankingStore.zelleSearchCurrentFocused) {
        setTimeout(() => {
          searchRef.current?.focus()
          searchRef.current?.setSelection(
            bankingStore.zelleSearchQuery.length,
            bankingStore.zelleSearchQuery.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp])

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'nexus-pay',
        route: '/nexus-pay',
      })
      return () => {
        // Nexus Pay screen unfocused
      }
    }, [trackScreenMount]),
  )

  const handleAddContact = () => {
    router.push('/nexus-pay/add-contact')
  }

  const handleContactPress = debounce((contact: any) => {
    // Check if contact is enrolled in Nexus Pay
    if (!contact.isEnrolled) {
      bankingStore.showAlert({
        title: 'Contact Not Enrolled',
        message: `${contact.contactName} is not registered for Nexus Pay. Please ask them to register for Nexus Pay to send money.`,
        preset: 'warning',
      })
      return
    }

    // Navigate to send money screen
    router.push({
      // @ts-ignore
      pathname: `/nexus-pay/${contact.id}`,
    })
  }, 300)

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    const words = name
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
    if (words.length === 0) return 'U'
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase()
  }

  // Helper function to format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone || typeof phone !== 'string') return ''
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone // Return original if not 10 digits
  }

  const toggleFavorite = async (contact: any) => {
    try {
      await bankingStore.updateZelleContact(contact.id, {
        isFavorite: !contact.isFavorite,
      })
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Compact render for favorite contacts
  const renderFavoriteContact = ({ item: contact }: { item: any }) => {
    // Debug logging to identify problematic contacts
    if (!contact || typeof contact !== 'object') {
      console.warn('Invalid favorite contact data:', contact)
      return null
    }

    return (
      <TouchableOpacity
        style={styles.favoriteContactItem}
        onPress={() => handleContactPress(contact)}
      >
        <View
          style={[
            styles.favoriteAvatar,
            { backgroundColor: theme.colors.palette.primary400 + '20' },
          ]}
        >
          <Text
            style={{
              ...styles.favoriteInitial,
              color: theme.colors.palette.primary400,
            }}
          >
            {getInitials(contact.contactName)}
          </Text>
        </View>
        <Text
          style={{
            ...styles.favoriteName,
            color: theme.colors.text as string,
          }}
          numberOfLines={2}
        >
          {contact.contactName || 'Unknown'}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderContact = ({ item: contact }: { item: any }) => {
    // Debug logging to identify problematic contacts
    if (!contact || typeof contact !== 'object') {
      console.warn('Invalid contact data:', contact)
      return null
    }

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          { backgroundColor: (theme.colors as any).surface },
        ]}
        onPress={() => handleContactPress(contact)}
      >
        <View style={styles.contactLeft}>
          <View
            style={[
              styles.contactAvatar,
              { backgroundColor: theme.colors.palette.primary400 + '20' },
            ]}
          >
            <Text
              style={{
                ...styles.contactInitial,
                color: theme.colors.palette.primary400,
              }}
            >
              {getInitials(contact.contactName || 'U')}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text
              style={{
                ...styles.contactName,
                color: theme.colors.text as string,
              }}
            >
              {contact.contactName || 'Unknown Contact'}
            </Text>
            {(() => {
              const hasEmail =
                contact.contactEmail && String(contact.contactEmail).trim()
              const hasPhone =
                contact.contactPhone && String(contact.contactPhone).trim()

              if (!hasEmail && !hasPhone) {
                return (
                  <Text
                    style={{
                      ...styles.contactDetail,
                      color: theme.colors.textDim as string,
                    }}
                  >
                    No contact info
                  </Text>
                )
              }

              return (
                <>
                  {hasEmail && (
                    <Text
                      style={{
                        ...styles.contactDetail,
                        color: theme.colors.textDim as string,
                      }}
                    >
                      {String(contact.contactEmail)}
                    </Text>
                  )}
                  {hasPhone && (
                    <Text
                      style={{
                        ...styles.contactDetail,
                        color: theme.colors.textDim as string,
                      }}
                    >
                      {formatPhoneNumber(String(contact.contactPhone))}
                    </Text>
                  )}
                </>
              )
            })()}
          </View>
        </View>
        <View style={styles.contactRight}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(contact)}
          >
            <Ionicons
              name={contact.isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={
                contact.isFavorite
                  ? theme.colors.palette.angry400
                  : theme.colors.textDim
              }
            />
          </TouchableOpacity>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textDim}
          />
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={theme.colors.textDim} />
      <Text
        style={{
          ...styles.emptyTitle,
          color: theme.colors.text as string,
        }}
      >
        No Contacts Yet
      </Text>
      <Text
        style={{
          ...styles.emptySubtitle,
          color: theme.colors.textDim as string,
        }}
      >
        Add your first contact to start sending money with Nexus Pay
      </Text>
      <TouchableOpacity
        style={[
          styles.addFirstContactButton,
          { backgroundColor: theme.colors.palette.primary400 },
        ]}
        onPress={handleAddContact}
      >
        <Text style={styles.addFirstContactButtonText}>
          Add Your First Contact
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Nexus Pay
          </Text>
          <Text
            preset="default"
            style={{ color: theme.colors.textDim as string }}
          >
            Send money instantly to friends and family
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: (theme.colors as any).surface,
              borderColor: bankingStore.zelleSearchCurrentFocused
                ? theme.colors.palette.primary500
                : 'transparent',
            },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={
              bankingStore.zelleSearchCurrentFocused
                ? theme.colors.palette.primary500
                : theme.colors.textDim
            }
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: theme.colors.text as string }]}
            placeholder="Search contacts..."
            placeholderTextColor={theme.colors.textDim}
            value={bankingStore.zelleSearchQuery}
            onChangeText={bankingStore.setZelleSearchQuery}
            onFocus={() => bankingStore.setZelleSearchFocused(true)}
            onBlur={() => bankingStore.setZelleSearchFocused(false)}
          />
          {bankingStore.zelleSearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => bankingStore.setZelleSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textDim}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contacts List */}
      <View style={styles.contactsSection}>
        {bankingStore.favoriteZelleContacts.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text
              style={{
                ...styles.sectionTitle,
                color: theme.colors.text as string,
              }}
            >
              Favorites
            </Text>
            <FlatList
              data={bankingStore.favoriteZelleContacts}
              renderItem={renderFavoriteContact}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favoritesContainer}
            />
          </View>
        )}

        <View style={styles.allContactsSection}>
          <View style={styles.contactsHeader}>
            <Text
              style={{
                ...styles.sectionTitle,
                color: theme.colors.text as string,
              }}
            >
              {bankingStore.favoriteZelleContacts.length > 0
                ? 'All Contacts'
                : 'Contacts'}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddContact}
            >
              <Ionicons
                name="person-add"
                size={18}
                color={theme.colors.palette.primary400}
              />
              <Text
                style={{
                  ...styles.addButtonText,
                  color: theme.colors.palette.primary400,
                }}
              >
                Add New
              </Text>
            </TouchableOpacity>
          </View>

          {bankingStore.isLoadingZelleContacts ? (
            <View style={styles.loadingState}>
              <Text
                style={{
                  ...styles.loadingText,
                  color: theme.colors.textDim as string,
                }}
              >
                Loading contacts...
              </Text>
            </View>
          ) : bankingStore.filteredZelleContacts.length > 0 ? (
            <FlatList
              data={bankingStore.filteredZelleContacts}
              renderItem={renderContact}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={true}
              style={styles.contactsList}
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      </View>

      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title || undefined}
        message={bankingStore.alertState.message}
        preset={
          bankingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => bankingStore.hideAlert()}
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginRight: 16,
      marginTop: 4,
    },
    headerContent: {
      flex: 1,
    },
    contactsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    searchSection: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 2,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    clearButton: {
      marginLeft: 8,
    },

    contactsSection: {
      flex: 1,
      paddingHorizontal: 24,
    },
    favoritesSection: {
      marginBottom: 24,
    },
    favoritesContainer: {
      paddingVertical: 8,
      gap: 12,
    },
    favoriteContactItem: {
      alignItems: 'center',
      width: 80,
      paddingVertical: 8,
    },
    favoriteAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    favoriteInitial: {
      fontSize: 20,
      fontWeight: '600',
    },
    favoriteName: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 14,
    },
    allContactsSection: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    contactsList: {
      flex: 1,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    contactLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    contactInitial: {
      fontSize: 18,
      fontWeight: '600',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    contactDetail: {
      fontSize: 14,
      marginBottom: 2,
    },
    lastSent: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    contactRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    favoriteButton: {
      padding: 4,
    },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    addFirstContactButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    addFirstContactButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    loadingState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
    },
  })

export default NexusPayScreen
