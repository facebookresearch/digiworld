import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native'
import { Screen, Text } from '@/components'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { mutations } from '@/db/mutations'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

const { width, height } = Dimensions.get('window')

export default function TransactionLimitsScreen() {
  const { userStore, sessionStore } = useStores()
  const { theme } = useAppTheme()
  const params = useLocalSearchParams()
  const { trackScreenMount, trackClick, trackContentChange } =
    useInteractionTracking(
      'TransactionLimits',
      '/screens/settings/TransactionLimits',
    )

  // Session parameters
  const sessionId =
    typeof params.sessionId === 'string' ? params.sessionId : null
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  const [dailyLimit, setDailyLimit] = useState(
    userStore.transactionLimits?.dailyLimit?.toFixed(2) || '0.00',
  )
  const [monthlyLimit, setMonthlyLimit] = useState(
    userStore.transactionLimits?.monthlyLimit?.toFixed(2) || '0.00',
  )
  const [isEditing, setIsEditing] = useState(false)

  // Load session data if exists
  useEffect(() => {
    if (params.sessionTimeStamp) {
      try {
        const session = sessionStore.getSession(sessionId as string)

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as any
          if (savedState) {
            // Restore state from session
            if (savedState.dailyLimit !== undefined) {
              setDailyLimit(savedState.dailyLimit)
            }
            if (savedState.monthlyLimit !== undefined) {
              setMonthlyLimit(savedState.monthlyLimit)
            }
            if (savedState.isEditing !== undefined) {
              setIsEditing(savedState.isEditing)
            }

            trackContentChange({
              event: 'session_state_restored',
              restoredValues: {
                hasDaily: !!savedState.dailyLimit,
                hasMonthly: !!savedState.monthlyLimit,
              },
              timestamp: Date.now(),
            })
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error)
      }
      setIsSessionLoaded(true)
    } else if (!isSessionLoaded) {
      setIsSessionLoaded(true)
    }
  }, [params.sessionTimeStamp, sessionStore])

  // Track screen mount
  useFocusEffect(
    useCallback(() => {
      // Track the screen mount with current state
      trackScreenMount({
        dailyLimit,
        monthlyLimit,
        isEditing,
        timestamp: Date.now(),
        platform: Platform.OS,
        screenDimensions: {
          width,
          height,
        },
        sessionId,
      })
    }, [dailyLimit, monthlyLimit, isEditing, sessionId, width, height]),
  )

  const handleSave = async () => {
    if (!userStore.userProfile?.id) return

    trackClick('save_limits')
    try {
      const result = await mutations.updateUser(userStore.userProfile.id, {
        dailyLimit: Number(dailyLimit),
        monthlyLimit: Number(monthlyLimit),
      })

      if (result.success) {
        userStore.updateUserProfile({
          dailyLimit: Number(dailyLimit),
          monthlyLimit: Number(monthlyLimit),
        })
        Alert.alert('Success', 'Transaction limits updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        trackContentChange({
          event: 'limits_update_failed',
          success: false,
          timestamp: Date.now(),
        })
        Alert.alert('Error', 'Failed to update transaction limits')
      }
    } catch (error) {
      console.error('Error updating limits:', error)
      trackContentChange({
        event: 'limits_update_error',
        success: false,
        timestamp: Date.now(),
      })
      Alert.alert('Error', 'Failed to update transaction limits')
    }
  }

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '')
    return Number(numericValue).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const handleLimitChange = (text: string, setter: (value: string) => void) => {
    const numericValue = text.replace(/[^0-9.]/g, '')
    setter(numericValue)
    setIsEditing(true)

    trackContentChange({
      event: 'limit_value_changed',
      timestamp: Date.now(),
    })
  }

  const styles = createStyles(theme)

  return (
    <Screen preset="scroll" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary400,
            theme.colors.palette.secondary400,
          ]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              trackClick('back_button')
              router.back()
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.palette.neutral100}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text
              text="Transaction Limits"
              preset="heading"
              style={styles.title}
            />
            <Text
              text="Set your spending limits"
              size="xs"
              style={styles.subtitle}
            />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.limitCard}>
            <View style={styles.limitHeader}>
              <View style={styles.limitIcon}>
                <Ionicons
                  name="timer-outline"
                  size={24}
                  color={theme.colors.palette.primary500}
                />
              </View>
              <View style={styles.limitInfo}>
                <Text
                  text="Daily Limit"
                  preset="subheading"
                  style={styles.limitTitle}
                />
                <Text
                  text="Maximum amount you can spend per day"
                  size="xs"
                  style={styles.limitDescription}
                />
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text text="$" style={styles.currencySymbol} />
              <TextInput
                style={styles.input}
                value={formatCurrency(dailyLimit)}
                onChangeText={value => {
                  trackClick('edit_daily_limit')
                  handleLimitChange(value, setDailyLimit)
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textDim}
              />
            </View>
          </View>

          <View style={styles.limitCard}>
            <View style={styles.limitHeader}>
              <View style={styles.limitIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={theme.colors.palette.secondary500}
                />
              </View>
              <View style={styles.limitInfo}>
                <Text
                  text="Monthly Limit"
                  preset="subheading"
                  style={styles.limitTitle}
                />
                <Text
                  text="Maximum amount you can spend per month"
                  size="xs"
                  style={styles.limitDescription}
                />
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text text="$" style={styles.currencySymbol} />
              <TextInput
                style={styles.input}
                value={formatCurrency(monthlyLimit)}
                onChangeText={value => {
                  trackClick('edit_monthly_limit')
                  handleLimitChange(value, setMonthlyLimit)
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textDim}
              />
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={[
                  theme.colors.palette.primary500,
                  theme.colors.palette.secondary500,
                ]}
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text text="Save Changes" style={styles.saveButtonText} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Screen>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingTop: metrics.xl + metrics.medium,
      paddingBottom: metrics.large,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: metrics.medium,
    },
    title: {
      color: theme.colors.palette.neutral100,
      fontSize: 24,
      fontWeight: '600',
    },
    subtitle: {
      color: theme.colors.palette.neutral200,
      marginTop: 2,
    },
    content: {
      flex: 1,
      padding: metrics.medium,
      gap: metrics.medium,
    },
    limitCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.medium,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    limitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: metrics.medium,
    },
    limitIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: metrics.medium,
    },
    limitInfo: {
      flex: 1,
    },
    limitTitle: {
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: 4,
    },
    limitDescription: {
      color: theme.colors.textDim,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: metrics.borderRadiusMedium,
      paddingHorizontal: metrics.medium,
      height: 56,
    },
    currencySymbol: {
      fontSize: 24,
      color: theme.colors.text,
      marginRight: metrics.small,
    },
    input: {
      flex: 1,
      fontSize: 24,
      color: theme.colors.text,
      height: '100%',
      padding: 0,
    },
    saveButton: {
      marginTop: metrics.medium,
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
    },
    saveGradient: {
      paddingVertical: metrics.medium,
      alignItems: 'center',
    },
    saveButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
  })
