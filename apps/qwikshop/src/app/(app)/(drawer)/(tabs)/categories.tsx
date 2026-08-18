// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Text } from '@/components'
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'

import { MaterialIcons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useDrawerStatus } from '@react-navigation/drawer'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { LinearGradient } from 'react-native-linear-gradient'
import { useAppTheme, type Theme } from '@andojo/shared-theme'

interface Category {
  id: string
  name: string
  icon: string | null
  parentCategoryId: number | null
}

interface CategoryCardProps {
  category: Category
  onPress: (category: Category) => void
  theme: Theme
}

const CategoryCard = ({ category, onPress, theme }: CategoryCardProps) => {
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => onPress(category)}
    >
      <LinearGradient
        colors={[theme.colors.card, theme.colors.backgroundSecondary]}
        style={styles.categoryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.categoryIconContainer}>
          <MaterialIcons
            name={(category.icon as any) || 'category'}
            size={32}
            color={theme.colors.palette.primary600}
          />
        </View>
        <View style={styles.categoryTextContainer}>
          <Text style={styles.categoryName} numberOfLines={2}>
            {category.name}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.colors.palette.neutral400}
          />
        </View>
      </LinearGradient>
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
      .catch((error: any) => {
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
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={[styles.container, styles.centerContent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text>Loading categories...</Text>
      </LinearGradient>
    )
  }

  if (categoryStore.error) {
    return (
      <LinearGradient
        colors={[
          theme.colors.palette.primary100,
          theme.colors.backgroundSecondary,
        ]}
        style={[styles.container, styles.centerContent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text>Error: {categoryStore.error}</Text>
      </LinearGradient>
    )
  }

  const openDrawer = () => {
    // @ts-ignore
    navigation.openDrawer()
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
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
        ]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <MaterialIcons
            name="menu"
            size={24}
            color={theme.colors.palette.neutral100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <FlatList
        data={categoryStore.mainCategories}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }: { item: any }) => (
          <CategoryCard
            category={{
              id: String(item.id),
              name: item.name,
              icon: item.icon,
              parentCategoryId: item.parentCategoryId,
            }}
            onPress={handleCategoryPress}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.categoriesList}
      />
    </LinearGradient>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    menuButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    headerRight: {
      width: 40,
    },
    categoriesList: {
      padding: 16,
    },
    categoryCard: {
      marginBottom: 12,
      borderRadius: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    categoryGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 16,
    },
    categoryIconContainer: {
      backgroundColor: theme.colors.palette.primary100,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryTextContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
  })
