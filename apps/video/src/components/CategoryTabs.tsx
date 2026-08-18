// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  View,
} from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import LinearGradient from 'react-native-linear-gradient'
import { VideoCategories } from '@/db/queries'

interface CategoryTabsProps {
  categories: VideoCategories[]
  selectedCategory: VideoCategories
  onCategorySelect: (category: VideoCategories) => void
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onCategorySelect,
}: CategoryTabsProps) {
  const { theme } = useTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {categories.map(category => {
        const isSelected = category.name === selectedCategory.name

        const tabContent = isSelected ? (
          <LinearGradient
            colors={[
              theme.colors.palette.primary200,
              theme.colors.palette.primary300,
            ]}
            style={styles.selectedTab}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text
              style={[styles.tabText, styles.selectedTabText]}
              text={category.name}
            />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.tab,
              {
                backgroundColor: theme.colors.palette.neutral300,
                borderColor: theme.colors.palette.neutral500,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.palette.neutral800 },
              ]}
              text={category.name}
            />
          </View>
        )

        return (
          <TouchableOpacity
            key={category.id}
            style={styles.tabContainer}
            onPress={() => onCategorySelect(category)}
            activeOpacity={0.5}
          >
            {tabContent}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 80,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  tabContainer: {
    marginRight: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  selectedTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    ...Platform.select({
      ios: {
        shadowColor: '#1c62ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
})
