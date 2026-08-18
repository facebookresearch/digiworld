// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Text } from '@/components'
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useAppTheme, Theme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const screenWidth = Dimensions.get('window').width
const CARD_WIDTH = (screenWidth - 48) / 3 // 3-column layout
const CARD_HEIGHT = (CARD_WIDTH / 3) * 4 // 3:4 aspect ratio

interface Category {
  id: string
  name: string
  icon: string | null
  parentCategoryId: number | null
}

interface CategoryCardProps {
  category: Category
  onPress: (category: Category) => void
  styles: ReturnType<typeof createStyles>
}

const CategoryCard = ({ category, onPress, styles }: CategoryCardProps) => {
  const { theme } = useAppTheme()
  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => onPress(category)}
    >
      <Text style={styles.categoryName} numberOfLines={3}>
        {category.name}
      </Text>
      <MaterialIcons
        name={(category.icon as any) || 'category'}
        size={50}
        color={theme.colors.palette.primary500}
      />
    </TouchableOpacity>
  )
}

export default observer(function CategoriesScreen() {
  const router = useRouter()
  const { sessionId, timeStamp } = useLocalSearchParams()
  const { categoryStore, sessionStore, uiStore } = useStores()
  const navigation = useNavigation()
  const isDrawerOpen = useDrawerStatus() === 'open'
  const lastRefreshRef = useRef(0)
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking('Categories', '/(app)/(drawer)/(tabs)/categories')

  useFocusEffect(
    useCallback(() => {
      // Set screen title
      router.setParams({ title: 'Categories' })
    }, [router]),
  )

  useEffect(() => {
    // First try to restore from session if sessionId exists
    if (sessionId) {
      const sessionData = sessionStore.getSession(sessionId as string)
      if (sessionData?.data) {
        const formData = sessionData.data.sessionData?.formData
        console.log('Restoring categories session:', sessionData)
        // @ts-ignore
        if (!isDrawerOpen && formData?.isDrawerOpen) {
          // @ts-ignore
          navigation.openDrawer()
        }
        // @ts-ignore
        trackContentChange(formData)
      }
    }
  }, [sessionId, timeStamp])

  useEffect(() => {
    categoryStore
      .loadCategories()
      .then(() => {
        trackContentChange({
          categoriesLoaded: true,
          categoryCount: categoryStore.categories.length,
        })
      })
      .catch(error => {
        trackContentChange({
          categoriesLoaded: false,
          error: String(error),
        })
      })
  }, [])

  useFocusEffect(
    useCallback(() => {
      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Categories',
        route: '/(app)/(drawer)/(tabs)/categories',
      })
    }, []),
  )

  // Track drawer state changes
  useEffect(() => {
    trackContentChange({
      drawerStateChanged: true,
      isDrawerOpen,
    })
  }, [isDrawerOpen])

  // Refresh data when mockDataAppendTime changes (after dbrefresh)
  useEffect(() => {
    if (uiStore.mockDataAppendTime > lastRefreshRef.current) {
      lastRefreshRef.current = uiStore.mockDataAppendTime
      console.log('🔄 Refreshing categories after dbrefresh...')
      categoryStore.loadCategories().catch(err => {
        console.error('Error refreshing categories:', err)
      })
    }
  }, [uiStore.mockDataAppendTime, categoryStore])

  const handleCategoryPress = (category: Category) => {
    trackClick('categorySelected')
    router.push(`/screens/category/${category.id}`)
  }

  if (categoryStore.isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading categories...</Text>
      </View>
    )
  }

  if (categoryStore.error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Error: {categoryStore.error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categoryStore.mainCategories}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CategoryCard
            category={{
              id: String(item.id),
              name: item.name,
              icon: item.icon,
              parentCategoryId: item.parentCategoryId,
            }}
            onPress={handleCategoryPress}
            styles={styles}
          />
        )}
        numColumns={3}
        contentContainerStyle={styles.categoriesGrid}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoriesGrid: {
      padding: 12,
      justifyContent: 'center',
    },
    categoryCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 8,
      backgroundColor: theme.colors.palette.neutral100,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral300,
      marginVertical: 10,
      gap: 10,
      marginRight: 10,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
      textAlign: 'center',
      flexShrink: 1,
    },
  })
