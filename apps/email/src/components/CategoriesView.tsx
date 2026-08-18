import React, { useMemo } from 'react'
import { FlatList, TouchableOpacity, View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '@andojo/shared-theme'

interface CategoriesViewProps {
  selectedCategories: string[]
  setSelection: (item: string) => void
  isUpdateView?: boolean
}

const categoriesList = [
  // 'starred',
  'flagged',
  'updates',
  'work',
  'social',
  'important',
  'personal',
  'finance',
  'urgent',
]

export function CategoriesView({
  selectedCategories,
  setSelection,
  isUpdateView = false,
}: CategoriesViewProps) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(), [theme])

  return (
    <>
      <FlatList
        data={
          isUpdateView
            ? categoriesList.filter(
                item => item !== 'starred' && item !== 'flagged',
              )
            : categoriesList
        }
        renderItem={({ item }: any) => {
          const isSelected = selectedCategories.includes(item)
          // Use appropriate icons for starred/flagged
          let iconName: string
          if (item === 'starred') {
            iconName = isSelected ? 'star' : 'star-outline'
          } else if (item === 'flagged') {
            iconName = isSelected ? 'flag' : 'flag-outline'
          } else {
            iconName = isSelected ? 'checkbox' : 'checkbox-outline'
          }

          return (
            <TouchableOpacity onPress={() => setSelection(item)}>
              <View style={styles.checkboxContainer}>
                <Ionicons
                  name={iconName as any}
                  size={24}
                  color={
                    item === 'starred' && isSelected
                      ? theme.colors.palette.accent500
                      : item === 'flagged' && isSelected
                        ? theme.colors.palette.angry500
                        : isSelected
                          ? theme.colors.palette.primary500
                          : theme.colors.palette.neutral600
                  }
                />
                <Text
                  style={styles.formCatgLabel}
                  text={item}
                  preset="formLabel"
                />
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </>
  )
}

const createStyles = () =>
  StyleSheet.create({
    checkboxContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      alignItems: 'center',
    },
    formCatgLabel: {
      marginLeft: 5,
    },
  })
