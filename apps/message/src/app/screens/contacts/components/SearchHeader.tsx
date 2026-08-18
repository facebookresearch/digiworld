import React, { useMemo } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (text: string) => void
  onClearSearch: () => void
  onBack: () => void
  placeholder?: string
}

const SearchHeader = React.memo(
  ({
    searchQuery,
    onSearchChange,
    onClearSearch,
    onBack,
    placeholder = 'Search contacts...',
  }: SearchHeaderProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.palette.neutral500}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.palette.neutral500}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={onClearSearch}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.palette.neutral500}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral900,
      paddingVertical: 8,
    },
    clearButton: {
      padding: 4,
    },
  })

export default SearchHeader
