// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { debounce } from 'lodash'

const AddPayeeScreen = observer(() => {
  const { bankingStore, uiStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sessionTimeStamp } = useLocalSearchParams()
  const { trackScreenMount } = useInteractionTracking(
    'Add Payee',
    '/bills/add-payee',
  )

  // Get form state from UIStore
  const { searchQuery, isLoading, currentFocused } = uiStore.addPayeeForm
  const searchInputRef = useRef<TextInput>(null)

  // Category selection state

  useEffect(() => {
    const fetchBillers = async () => {
      uiStore.setAddPayeeLoading(true)
      try {
        await loadBillers()
      } catch (error) {
        console.error('Error loading billers:', error)
      } finally {
        uiStore.setAddPayeeLoading(false)
      }
    }

    fetchBillers()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      trackScreenMount({
        date: Date.now(),
        screenName: 'Add Payee',
        route: '/bills/add-payee',
      })
    }, []),
  )

  // Focus restoration for sessionTimeStamp
  useEffect(() => {
    if (sessionTimeStamp) {
      const focusedElement = currentFocused
      if (focusedElement === 'search') {
        setTimeout(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.setSelection(
            searchQuery.length,
            searchQuery.length,
          )
        }, 100)
      }
    }
  }, [sessionTimeStamp, currentFocused, searchQuery])

  const loadBillers = async () => {
    try {
      await bankingStore.loadBillers()
    } catch (error) {
      console.error('Error loading billers:', error)
    }
  }

  const handleManualEntry = debounce(() => {
    router.push('/bills/manual-payee-entry')
  }, 300)

  const filteredBillers = bankingStore.billers.filter(
    biller =>
      biller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biller.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleBillerSelect = debounce((biller: any) => {
    // setSelectedBiller(biller)
    const existingBill = bankingStore.bills.find(
      bill => bill.billerId === biller.id && bill.status === 'pending',
    )

    if (existingBill) {
      // If there's an existing bill, go to pay it
      router.push(`/bills/pay/${existingBill.id}`)
    } else {
      // If no existing bill, go to pay screen with biller info
      router.push(`/bills/pay/new?billerId=${biller.id}`)
    }
  }, 300)

  const textStyle = (additionalStyles: object = {}) => ({
    ...additionalStyles,
    fontSize: 16,
    fontWeight: '600' as const, // Explicitly cast to valid TextStyle fontWeight
  })

  const getCategoryColor = (category: string | null): string => {
    if (!category) return theme.colors.palette.neutral400
    switch (category) {
      case 'utilities':
        return theme.colors.palette.secondary400
      case 'telecom':
        return theme.colors.palette.primary200
      case 'insurance':
        return theme.colors.palette.success400
      case 'finance':
        return theme.colors.palette.accent200
      case 'subscription':
        return theme.colors.palette.accent500
      default:
        return theme.colors.palette.neutral400
    }
  }

  const getCategoryIcon = (category: string | null): string => {
    if (!category) return 'business'
    switch (category) {
      case 'utilities':
        return 'flash'
      case 'telecom':
        return 'phone-portrait'
      case 'insurance':
        return 'shield-checkmark'
      case 'finance':
        return 'card'
      case 'subscription':
        return 'tv'
      default:
        return 'business'
    }
  }

  const renderManualEntryCard = () => (
    <TouchableOpacity
      style={[
        styles.manualEntryCard,
        { backgroundColor: (theme.colors as any).surface },
      ]}
      onPress={handleManualEntry}
    >
      <View style={styles.manualEntryLeft}>
        <View
          style={[
            styles.manualEntryIcon,
            { backgroundColor: theme.colors.palette.accent400 + '15' },
          ]}
        >
          <Ionicons
            name="create"
            size={24}
            color={theme.colors.palette.accent400}
          />
        </View>
        <View style={styles.manualEntryInfo}>
          <Text
            style={
              [styles.manualEntryTitle, { color: theme.colors.text }] as any
            }
          >
            Add Payee Manually
          </Text>
          <Text
            style={
              [
                styles.manualEntrySubtitle,
                { color: theme.colors.textDim },
              ] as any
            }
          >
            Can't find your payee? Add it manually
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={textStyle({ color: theme.colors.textDim })}>
          Loading...
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          preset="subheading"
          style={{ color: theme.colors.text as string }}
        >
          Add Payee
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textDim }] as any}>
          Search for a payee or add manually
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: (theme.colors as any).surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textDim}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search payees..."
            placeholderTextColor={theme.colors.textDim}
            value={searchQuery}
            onChangeText={uiStore.setAddPayeeSearchQuery}
            onFocus={() => uiStore.setAddPayeeFocused('search')}
            onBlur={() => uiStore.setAddPayeeFocused(null)}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Manual Entry Option */}
        <View style={styles.section}>{renderManualEntryCard()}</View>

        {/* Search Results */}
        <View style={styles.section}>
          <Text
            preset="subheading"
            style={{ color: theme.colors.text as string }}
          >
            Available Payees
          </Text>
          {filteredBillers.length > 0 ? (
            filteredBillers.map(biller => (
              <TouchableOpacity
                key={biller.id}
                style={[
                  styles.billerCard,
                  { backgroundColor: (theme.colors as any).surface },
                ]}
                onPress={() => handleBillerSelect(biller)}
              >
                <View style={styles.billerLeft}>
                  <View
                    style={[
                      styles.billerIcon,
                      {
                        backgroundColor:
                          getCategoryColor(biller.category) + '15',
                      },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(biller.category) as any}
                      size={24}
                      color={getCategoryColor(biller.category)}
                    />
                  </View>
                  <View style={styles.billerInfo}>
                    <Text
                      style={
                        [styles.billerName, { color: theme.colors.text }] as any
                      }
                    >
                      {biller.name}
                    </Text>
                    <Text
                      style={
                        [
                          styles.billerCategory,
                          { color: theme.colors.textDim },
                        ] as any
                      }
                    >
                      {biller.category && (
                        <Text>
                          {biller.category.charAt(0).toUpperCase() +
                            biller.category.slice(1)}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textDim}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={theme.colors.textDim} />
              <Text
                style={
                  [styles.emptyText, { color: theme.colors.textDim }] as any
                }
              >
                {searchQuery
                  ? 'No payees found'
                  : 'Start typing to search payees'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    backButton: {
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
    },
    searchContainer: {
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    section: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    manualEntryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
    },
    manualEntryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    manualEntryIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    manualEntryInfo: {
      flex: 1,
    },
    manualEntryTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    manualEntrySubtitle: {
      fontSize: 14,
    },
    billerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    billerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    billerIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    billerInfo: {
      flex: 1,
    },
    billerName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    billerCategory: {
      fontSize: 14,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    formContainer: {
      paddingHorizontal: 24,
    },
    inputGroup: {
      marginBottom: 10,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    submitButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 40,
    },
    disabledButton: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    categorySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIconSmall: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    categoryText: {
      fontSize: 16,
    },
    categoryDropdown: {
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
      maxHeight: 200,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.overlay20,
    },
    categoryOptionText: {
      fontSize: 16,
      flex: 1,
    },
    warningBox: {
      padding: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
  })

export default AddPayeeScreen
