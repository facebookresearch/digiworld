// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState } from 'react'
import { Screen, Text } from '@/components'
import { queries } from '@/db/queries'
import { useAppTheme } from '@andojo/shared-theme'
import { useRouter } from 'expo-router'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface User {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  status: string
}

export default function UsersListScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await queries.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      Alert.alert('Error', 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const styles = createStyles(theme)

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        // Pre-fill phone login with this user's number
        router.push({
          pathname: '/screens/auth/phone-login',
          params: { prefillPhone: item.phoneNumber },
        })
      }}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <Text
            text={`${item.firstName[0]}${item.lastName[0]}`}
            style={styles.avatarText}
          />
        </View>
        <View style={styles.userDetails}>
          <Text
            text={`${item.firstName} ${item.lastName}`}
            size="md"
            weight="bold"
            style={styles.userName}
          />
          <Text text={item.phoneNumber} size="sm" style={styles.userPhone} />
          <Text text={item.email} size="xs" style={styles.userEmail} />
        </View>
      </View>
      <View
        style={[
          styles.statusBadge,
          item.status === 'active' ? styles.statusActive : styles.statusWarning,
        ]}
      >
        <Text
          text={item.status.toUpperCase()}
          size="xs"
          style={styles.statusText}
        />
      </View>
    </TouchableOpacity>
  )

  return (
    <Screen preset="fixed" style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text text="Test Users" size="xl" weight="bold" style={styles.title} />
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.tint}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.separator,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text,
    },
    listContent: {
      padding: 16,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: theme.colors.palette.neutral100,
      fontSize: 20,
      fontWeight: 'bold',
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      color: theme.colors.text,
      marginBottom: 4,
    },
    userPhone: {
      color: theme.colors.textDim,
      marginBottom: 2,
    },
    userEmail: {
      color: theme.colors.textDim,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    statusText: {
      color: theme.colors.palette.neutral100,
      fontWeight: 'bold',
    },
    separator: {
      height: 12,
    },
    loader: {
      flex: 1,
    },
    statusActive: {
      backgroundColor: theme.colors.palette.secondary500,
    },
    statusWarning: {
      backgroundColor: theme.colors.palette.accent500,
    },
  })
