// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import React, { useMemo } from 'react'
import {
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'

interface DropdownListProps {
  data: any[]
  renderItem: (item: any) => React.ReactNode
  onSelect: (item: any) => void
  selectedItem?: any
  keyExtractor: (item: any) => string
  maxHeight?: number
  style?: object
}

const DropdownList: React.FC<DropdownListProps> = ({
  data,
  renderItem,
  onSelect,
  selectedItem,
  keyExtractor,
  maxHeight = 200,
  style,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <ScrollView
      nestedScrollEnabled
      style={[styles.dropdownContainer, { maxHeight }, style]}
    >
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              selectedItem === item && styles.selectedItem,
            ]}
            onPress={() => onSelect(item)}
          >
            {renderItem(item)}
          </TouchableOpacity>
        )}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      />
    </ScrollView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    dropdownContainer: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'scroll',
      backgroundColor: theme.colors.palette.neutral100,
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    selectedItem: {
      backgroundColor: theme.colors.palette.neutral300,
    },
  })

export default DropdownList
