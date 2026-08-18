import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Screen, Text, Button, ListView } from '@/components'
import { colors, spacing } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'
import { queries } from '@/db/queries'

interface UserListItem {
  email: string
  password: string
  displayName: string | ''
}

export default function UserListScreen() {
  const router = useRouter()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    queries
      .getAllUsers()
      .then(data => setUsers(data as UserListItem[]))
      .finally(() => setIsLoading(false))
  }, [])

  const renderItem = ({ item }: { item: UserListItem }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <Text text={item.displayName} preset="subheading" style={styles.name} />
      </View>
      <View style={styles.userDetails}>
        <Text text={`Email: ${item.email}`} style={styles.detail} />
        <Text text={`Password: ${item.password}`} style={styles.detail} />
      </View>
    </View>
  )

  return (
    <Screen preset="scroll" safeAreaEdges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Button
          text="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text text="Test Accounts" preset="subheading" style={styles.title} />
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}>
            <Text text="Loading users..." />
          </View>
        ) : (
          <ListView
            data={users}
            renderItem={renderItem}
            estimatedItemSize={100}
            keyExtractor={item => item.email}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  backButton: {
    marginRight: spacing.sm,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  detail: {
    color: colors.textDim,
    fontSize: 15,
    marginVertical: 2,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.palette.neutral100,
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    padding: spacing.md,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  list: {
    flexGrow: 1,
    padding: spacing.sm,
  },
  name: {
    marginBottom: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  separator: {
    height: spacing.sm,
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  userCard: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  userDetails: {
    padding: spacing.sm,
  },
  userHeader: {
    backgroundColor: colors.palette.neutral200,
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    padding: spacing.sm,
  },
})
