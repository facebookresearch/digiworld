import {
  getLatestInteraction,
  useInteractionTracking,
} from '@andojo/shared-interaction-tracking'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { useStores } from '@/models'

const ProfileScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    userStore,
    profileStore: { profileState },
    sessionStore,
  } = useStores()
  const { trackScreenMount } = useInteractionTracking('Profile', '/profile')

  const fadeAnim = useRef(new Animated.Value(0)).current
  const sessionRestoredRef = useRef(false)
  const lastSessionTimeStampRef = useRef<string | string[] | undefined>(
    undefined,
  )

  // Available transit modes
  const transitModes = [
    { id: 'bus', name: 'Bus', icon: 'bus' },
    { id: 'train', name: 'Train', icon: 'train' },
    { id: 'subway', name: 'Subway', icon: 'subway' },
  ]

  const handleStopSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        profileState.setStopSearchResults([])
        return
      }

      try {
        profileState.setIsSearchingStops(true)
        const results = await queries.searchStops(searchTerm)
        profileState.setStopSearchResults(
          results.map(
            (stop: { id: string; name: string; description?: string }) => ({
              id: stop.id,
              name: stop.name,
              description: stop.description || undefined,
            }),
          ),
        )
      } catch (error) {
        console.error('Error searching stops:', error)
        profileState.setStopSearchResults([])
      } finally {
        profileState.setIsSearchingStops(false)
      }
    },
    [profileState],
  )

  // Restore state from session when navigating via deeplink
  useEffect(() => {
    const currentSessionTimeStamp = Array.isArray(params?.sessionTimeStamp)
      ? params?.sessionTimeStamp[0]
      : params?.sessionTimeStamp

    if (
      currentSessionTimeStamp &&
      currentSessionTimeStamp !== lastSessionTimeStampRef.current
    ) {
      sessionRestoredRef.current = false
      lastSessionTimeStampRef.current = currentSessionTimeStamp
    }

    if (params?.sessionTimeStamp && !sessionRestoredRef.current) {
      try {
        const session = sessionStore.getSession(params?.sessionId as string)

        if (session?.data?.sessionData) {
          const savedState = session.data.sessionData.formData as {
            showStopModal?: boolean
            stopModalType?: 'home' | 'work'
            stopSearchTerm?: string
            homeStopId?: string
            homeStopName?: string
            workStopId?: string
            workStopName?: string
            preferredModes?: string[]
          }

          if (savedState) {
            // Restore modal state if it was open
            if (
              typeof savedState.showStopModal === 'boolean' &&
              savedState.showStopModal &&
              savedState.stopModalType
            ) {
              profileState.openStopModal(savedState.stopModalType)
              if (savedState.stopSearchTerm) {
                profileState.setStopSearchTerm(savedState.stopSearchTerm)
                // Trigger search if search term exists
                handleStopSearch(savedState.stopSearchTerm)
              }
            }
            // Restore preferences if available
            if (savedState.homeStopId && savedState.homeStopName) {
              profileState.setHomeStop(
                savedState.homeStopId,
                savedState.homeStopName,
              )
            }
            if (savedState.workStopId && savedState.workStopName) {
              profileState.setWorkStop(
                savedState.workStopId,
                savedState.workStopName,
              )
            }
            if (savedState.preferredModes) {
              profileState.setPreferredModes(savedState.preferredModes)
            }
          }

          sessionRestoredRef.current = true
        }
      } catch (error) {
        console.error('Error restoring session state:', error)
        sessionRestoredRef.current = true
      }
    } else if (!params?.sessionTimeStamp) {
      sessionRestoredRef.current = true
    }
  }, [
    params?.sessionTimeStamp,
    params?.sessionId,
    sessionStore,
    profileState,
    handleStopSearch,
  ])

  useEffect(() => {
    trackScreenMount()

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    // Load preferences after session restoration
    if (sessionRestoredRef.current) {
      loadUserPreferences()
    }
  }, [fadeAnim, sessionRestoredRef.current])

  // Track screen focus with session data
  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Profile',
        route: '/profile',
        sessionTimeStamp: params?.sessionTimeStamp,
        homeStopId: profileState.homeStopId,
        homeStopName: profileState.homeStopName,
        workStopId: profileState.workStopId,
        workStopName: profileState.workStopName,
        preferredModes: profileState.preferredModes.slice(),
        notificationsEnabled: profileState.notificationsEnabled,
        locationEnabled: profileState.locationEnabled,
      })
      return () => {
        getLatestInteraction()
      }
    }, [params?.sessionTimeStamp]),
  )

  const loadUserPreferences = async () => {
    if (!userStore.user?.id) {
      return
    }

    try {
      const preferences = await queries.getUserPreferences(userStore.user.id)

      if (preferences) {
        // Load home stop from database if not already set in store
        if (preferences.homeStopId) {
          if (
            !profileState.homeStopId ||
            profileState.homeStopId !== preferences.homeStopId
          ) {
            const stop = await queries.getStopById(preferences.homeStopId)
            if (stop) {
              profileState.setHomeStop(stop.id, stop.name)
            }
          }
        }
        // Load work stop from database if not already set in store
        if (preferences.workStopId) {
          if (
            !profileState.workStopId ||
            profileState.workStopId !== preferences.workStopId
          ) {
            const stop = await queries.getStopById(preferences.workStopId)
            if (stop) {
              profileState.setWorkStop(stop.id, stop.name)
            }
          }
        }
        // Always load preferred modes from database (source of truth)
        if (
          preferences.preferredModes &&
          Array.isArray(preferences.preferredModes)
        ) {
          profileState.setPreferredModes(preferences.preferredModes)
        }
        // Notifications and location are client-side only, keep store values
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const handleOpenStopModal = useCallback(
    (type: 'home' | 'work') => {
      profileState.openStopModal(type)
      // If there's an existing search term, trigger search automatically
      if (
        profileState.stopSearchTerm &&
        profileState.stopSearchTerm.length >= 2
      ) {
        handleStopSearch(profileState.stopSearchTerm)
      }
    },
    [profileState, handleStopSearch],
  )

  const handleSelectStop = async (stop: { id: string; name: string }) => {
    if (!userStore.user?.id || !profileState.stopModalType) return

    try {
      const updateData: {
        homeStopId?: string
        workStopId?: string
      } = {}

      if (profileState.stopModalType === 'home') {
        updateData.homeStopId = stop.id
        profileState.setHomeStop(stop.id, stop.name)
      } else {
        updateData.workStopId = stop.id
        profileState.setWorkStop(stop.id, stop.name)
      }

      await mutations.createOrUpdateUserPreferences(
        userStore.user.id,
        updateData,
      )

      profileState.closeStopModal()
    } catch (error) {
      console.error('Error saving preference:', error)
      Alert.alert('Error', 'Failed to save preference. Please try again.')
    }
  }

  const handleTogglePreferredMode = async (modeId: string) => {
    if (!userStore.user?.id) return

    try {
      let updatedModes: string[]
      if (profileState.preferredModes.includes(modeId)) {
        // Remove mode
        updatedModes = profileState.preferredModes.filter(m => m !== modeId)
      } else {
        // Add mode
        updatedModes = [...profileState.preferredModes, modeId]
      }

      profileState.setPreferredModes(updatedModes)

      await mutations.createOrUpdateUserPreferences(userStore.user.id, {
        preferredModes: updatedModes,
      })
    } catch (error) {
      console.error('Error saving preferred modes:', error)
      Alert.alert('Error', 'Failed to save preference. Please try again.')
      // Revert on error
      await loadUserPreferences()
    }
  }

  const handleShowLines = useCallback(() => {
    router.push('/(tabs)/lines')
  }, [router])

  const handleShowHelp = useCallback(() => {
    router.push('/help')
  }, [router])

  const handleShowAbout = useCallback(() => {
    router.push('/about')
  }, [router])

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              profileState.setIsLoggingOut(true)

              // Perform logout
              userStore.logout()

              // Small delay for smooth transition
              await new Promise(resolve => setTimeout(resolve, 500))

              // Navigate to login
              router.replace('/(auth)/login')
            } catch (error) {
              console.error('Logout error:', error)
              Alert.alert('Error', 'Failed to log out. Please try again.', [
                { text: 'OK' },
              ])
            } finally {
              profileState.setIsLoggingOut(false)
            }
          },
        },
      ],
      { cancelable: true },
    )
  }

  const settingsSections = useMemo(
    () => [
      {
        title: 'Quick Access',
        items: [
          {
            id: 'home',
            label: 'Home Stop',
            value: profileState.homeStopName || 'Not set',
            icon: 'home',
            onPress: () => handleOpenStopModal('home'),
          },
          {
            id: 'work',
            label: 'Work Stop',
            value: profileState.workStopName || 'Not set',
            icon: 'briefcase',
            onPress: () => handleOpenStopModal('work'),
          },
        ],
      },
    ],
    [profileState.homeStopName, profileState.workStopName, handleOpenStopModal],
  )

  interface SettingItem {
    id: string
    label: string
    value: string
    icon: string
    onPress?: () => void
  }

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        activeOpacity={0.8}
        onPress={item.onPress}
        disabled={!item.onPress}
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIcon}>
            <Ionicons
              name={item.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={theme.colors.palette.primary600}
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text
              style={
                !item.value || item.value === 'Not set'
                  ? StyleSheet.flatten([
                      styles.settingValue,
                      styles.settingValueEmpty,
                    ])
                  : styles.settingValue
              }
            >
              {item.value || 'Not set'}
            </Text>
          </View>
        </View>
        {item.onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.palette.neutral500}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral100,
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header */}
            <Animated.View
              style={[
                styles.profileHeader,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <View style={styles.avatarInner}>
                    <Image
                      source={require('../../../assets/images/splash-icon.png')}
                      style={styles.avatarImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.userName}>
                {userStore.user?.username || 'Transit User'}
              </Text>
              <Text style={styles.userEmail}>
                {userStore.user?.email || 'user@transit.app'}
              </Text>
            </Animated.View>

            {/* Settings Sections */}
            {settingsSections.map(section => (
              <Animated.View
                key={section.title}
                style={[
                  styles.section,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((item, itemIndex) => (
                    <View key={item.id}>
                      {renderSettingItem(item)}
                      {itemIndex < section.items.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}

            {/* Preferred Modes Section */}
            <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
              <Text style={styles.sectionTitle}>Preferred Transit Modes</Text>
              <View style={styles.sectionCard}>
                <View style={styles.modesContainer}>
                  {transitModes.map((mode, index) => {
                    const isSelected = profileState.preferredModes.includes(
                      mode.id,
                    )
                    return (
                      <View key={mode.id}>
                        <TouchableOpacity
                          style={styles.modeItem}
                          activeOpacity={0.7}
                          onPress={() => handleTogglePreferredMode(mode.id)}
                        >
                          <View style={styles.modeLeft}>
                            <View
                              style={[
                                styles.modeIcon,
                                isSelected && styles.modeIconSelected,
                              ]}
                            >
                              <Ionicons
                                name={
                                  mode.icon as keyof typeof Ionicons.glyphMap
                                }
                                size={20}
                                color={
                                  isSelected
                                    ? theme.colors.palette.neutral100
                                    : theme.colors.palette.primary600
                                }
                              />
                            </View>
                            <Text style={styles.modeLabel}>{mode.name}</Text>
                          </View>
                          <View
                            style={[
                              styles.modeCheckbox,
                              isSelected && styles.modeCheckboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={theme.colors.palette.neutral100}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                        {index < transitModes.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    )
                  })}
                </View>
                <View style={styles.modesHintContainer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={theme.colors.palette.neutral600}
                  />
                  <Text style={styles.modesHint}>
                    Select your preferred modes for trip planning
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Toggles Section */}
            <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
              <Text style={styles.sectionTitle}>Notifications & Privacy</Text>
              <View style={styles.sectionCard}>
                <View style={styles.toggleItem}>
                  <View style={styles.toggleLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons
                        name="notifications"
                        size={20}
                        color={theme.colors.palette.secondary500}
                      />
                    </View>
                    <View>
                      <Text style={styles.toggleLabel}>Push Notifications</Text>
                      <Text style={styles.toggleSubtext}>
                        Get alerts for delays & arrivals
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={profileState.notificationsEnabled}
                    onValueChange={value =>
                      profileState.setNotificationsEnabled(value)
                    }
                    trackColor={{
                      false: theme.colors.palette.neutral400,
                      true: theme.colors.palette.secondary500,
                    }}
                    thumbColor={theme.colors.palette.neutral100}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.toggleItem}>
                  <View style={styles.toggleLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons
                        name="location"
                        size={20}
                        color={theme.colors.palette.primary400}
                      />
                    </View>
                    <View>
                      <Text style={styles.toggleLabel}>Location Services</Text>
                      <Text style={styles.toggleSubtext}>
                        Find nearby stops automatically
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={profileState.locationEnabled}
                    onValueChange={value =>
                      profileState.setLocationEnabled(value)
                    }
                    trackColor={{
                      false: theme.colors.palette.neutral400,
                      true: theme.colors.palette.primary400,
                    }}
                    thumbColor={theme.colors.palette.neutral100}
                  />
                </View>
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={handleShowLines}
              >
                <Ionicons
                  name="list"
                  size={22}
                  color={theme.colors.palette.primary400}
                />
                <Text
                  style={StyleSheet.flatten([
                    styles.actionButtonText,
                    styles.linesButtonText,
                  ])}
                >
                  Show Lines & Schedule
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.palette.neutral500}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={handleShowHelp}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={22}
                  color={theme.colors.palette.neutral700}
                />
                <Text style={styles.actionButtonText}>Help & Support</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.palette.neutral500}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={handleShowAbout}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.palette.neutral700}
                />
                <Text style={styles.actionButtonText}>About</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.palette.neutral500}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.logoutButton,
                  profileState.isLoggingOut && styles.logoutButtonDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleLogout}
                disabled={profileState.isLoggingOut}
              >
                {profileState.isLoggingOut ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.palette.primary400}
                    />
                    <Text
                      style={StyleSheet.flatten([
                        styles.actionButtonText,
                        styles.logoutText,
                      ])}
                    >
                      Logging out...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="log-out-outline"
                      size={22}
                      color={theme.colors.palette.primary400}
                    />
                    <Text
                      style={StyleSheet.flatten([
                        styles.actionButtonText,
                        styles.logoutText,
                      ])}
                    >
                      Log Out
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Version */}
            <Animated.View
              style={[styles.versionContainer, { opacity: fadeAnim }]}
            >
              <Text style={styles.versionText}>Andojo Transit v1.0.0</Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Stop Selection Modal */}
      <Modal
        visible={profileState.showStopModal}
        animationType="slide"
        onRequestClose={() => profileState.closeStopModal()}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => profileState.closeStopModal()}>
              <Ionicons
                name="close"
                size={28}
                color={theme.colors.palette.neutral900}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {profileState.stopModalType === 'home' ? 'Home' : 'Work'}{' '}
              Stop
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.palette.neutral500}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for stops..."
              placeholderTextColor={theme.colors.palette.neutral500}
              value={profileState.stopSearchTerm}
              onChangeText={text => {
                profileState.setStopSearchTerm(text)
                handleStopSearch(text)
              }}
              autoFocus
            />
            {profileState.isSearchingStops && (
              <ActivityIndicator
                size="small"
                color={theme.colors.palette.primary400}
              />
            )}
          </View>

          {profileState.isSearchingStops &&
          profileState.stopSearchResults.length === 0 ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator
                size="large"
                color={theme.colors.palette.primary400}
              />
              <Text style={styles.modalLoadingText}>Searching stops...</Text>
            </View>
          ) : profileState.stopSearchResults.length > 0 ? (
            <FlatList
              data={profileState.stopSearchResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stopResultItem}
                  onPress={() => handleSelectStop(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stopResultLeft}>
                    <Ionicons
                      name="location"
                      size={24}
                      color={theme.colors.palette.primary400}
                      style={styles.stopResultIcon}
                    />
                    <View style={styles.stopResultInfo}>
                      <Text style={styles.stopResultName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.stopResultDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalListContent}
            />
          ) : profileState.stopSearchTerm.length >= 2 ? (
            <View style={styles.modalEmptyContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={theme.colors.palette.neutral500}
              />
              <Text style={styles.modalEmptyText}>No stops found</Text>
              <Text style={styles.modalEmptySubtext}>
                Try a different search term
              </Text>
            </View>
          ) : (
            <View style={styles.modalEmptyContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={theme.colors.palette.neutral500}
              />
              <Text style={styles.modalEmptyText}>Search for stops</Text>
              <Text style={styles.modalEmptySubtext}>
                Type at least 2 characters to search
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 30,
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.palette.neutral300,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.palette.neutral400,
    },
    avatarInner: {
      width: 85,
      height: 85,
      borderRadius: 42.5,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: 60,
      height: 60,
    },
    userName: {
      fontSize: 24,
      color: theme.colors.palette.neutral800,
      marginBottom: 6,
    },
    userEmail: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      marginBottom: 12,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 15,
      color: theme.colors.palette.neutral800,
      marginBottom: 2,
    },
    settingValue: {
      fontSize: 13,
      color: theme.colors.palette.neutral600,
    },
    settingValueEmpty: {
      color: theme.colors.palette.neutral500,
      fontStyle: 'italic',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginHorizontal: 16,
    },
    toggleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    toggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 15,
      color: theme.colors.palette.neutral800,
      marginBottom: 2,
    },
    toggleSubtext: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    actionButtonText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.palette.neutral700,
      marginLeft: 12,
    },
    logoutButton: {
      backgroundColor: theme.colors.palette.angry100,
      borderColor: theme.colors.palette.angry200,
    },
    logoutButtonDisabled: {
      opacity: 0.6,
    },
    logoutText: {
      color: theme.colors.palette.primary400,
    },
    versionContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    versionText: {
      fontSize: 13,
      color: theme.colors.palette.neutral500,
    },
    linesButtonText: {
      color: theme.colors.palette.primary400,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.palette.neutral100,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral400,
    },
    modalHeaderSpacer: {
      width: 28,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.palette.neutral800,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.palette.neutral800,
      marginLeft: 12,
    },
    modalListContent: {
      paddingBottom: 20,
    },
    stopResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    stopResultLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    stopResultIcon: {
      marginRight: 12,
    },
    stopResultInfo: {
      flex: 1,
    },
    stopResultName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    stopResultDescription: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    modalLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    modalLoadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.palette.neutral600,
    },
    modalEmptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    modalEmptyText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.palette.neutral800,
    },
    modalEmptySubtext: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    modesContainer: {
      padding: 0,
    },
    modeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    modeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modeIconSelected: {
      backgroundColor: theme.colors.palette.primary300,
    },
    modeLabel: {
      fontSize: 15,
      color: theme.colors.palette.neutral800,
    },
    modeCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral400,
      backgroundColor: theme.colors.palette.neutral100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modeCheckboxSelected: {
      backgroundColor: theme.colors.palette.primary400,
      borderColor: theme.colors.palette.primary400,
    },
    modesHintContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.palette.neutral200,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.neutral300,
      gap: 8,
    },
    modesHint: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      flex: 1,
    },
  })

export default ProfileScreen
