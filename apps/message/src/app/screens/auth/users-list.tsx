import React, { useEffect, useState, useMemo } from 'react'
import { Screen, Text } from '@andojo/shared-theme/src/components'
import { queries } from '@/db/queries'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
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
  id: string
  name: string
  phoneNumber: string
  avatarUrl?: string
  lastLoggedIn: number
}

export default function UsersListScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
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

  const getLastFourDigits = (phoneNumber: string) => {
    return phoneNumber.slice(-4)
  }

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
            text={item.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()}
            style={styles.avatarText}
          />
        </View>
        <View style={styles.userDetails}>
          <Text
            text={item.name}
            size="medium"
            weight="bold"
            style={styles.userName}
          />
          <Text text={item.phoneNumber} size="small" style={styles.userPhone} />
          <View style={styles.otpContainer}>
            <Text text="OTP: " size="tiny" style={styles.otpLabel} />
            <Text
              text={getLastFourDigits(item.phoneNumber)}
              size="tiny"
              weight="bold"
              style={styles.otpValue}
            />
          </View>
        </View>
      </View>
      <View style={[styles.statusBadge, styles.statusBadgeActive]}>
        <Text text="ACTIVE" size="tiny" style={styles.statusText} />
      </View>
    </TouchableOpacity>
  )

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={['top', 'bottom']}
      style={styles.screen}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral800}
          />
        </TouchableOpacity>
        <Text text="Test Users" size="xl" weight="bold" style={styles.title} />
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Screen>
  )
}

const createStyles = (theme: Theme) =>
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
      borderBottomColor: theme.colors.palette.neutral200,
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
      color: theme.colors.palette.neutral800,
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
      backgroundColor: theme.colors.palette.primary500,
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
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    userPhone: {
      color: theme.colors.palette.neutral600,
      marginBottom: 2,
    },
    userEmail: {
      color: theme.colors.palette.neutral600,
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
    otpContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      backgroundColor: theme.colors.palette.neutral200,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    otpLabel: {
      color: theme.colors.palette.neutral600,
    },
    otpValue: {
      color: theme.colors.palette.primary500,
    },
    statusBadgeActive: {
      backgroundColor: theme.colors.palette.success400,
    },
    statusBadgeInactive: {
      backgroundColor: theme.colors.palette.warning500,
    },
  })
