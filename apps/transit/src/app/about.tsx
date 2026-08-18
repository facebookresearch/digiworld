import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AboutScreen() {
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('About', '/about')
  const fadeAnim = useRef(new Animated.Value(0)).current
  const { theme } = useAppTheme()

  useEffect(() => {
    trackScreenMount()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const features = [
    {
      id: '1',
      title: 'Real-Time Tracking',
      description: 'Get live updates on vehicle locations and arrival times',
      icon: 'time-outline',
      color: theme.colors.palette.primary400,
    },
    {
      id: '2',
      title: 'Smart Route Planning',
      description: 'Find the fastest and most convenient routes',
      icon: 'map-outline',
      color: theme.colors.palette.primary300,
    },
    {
      id: '3',
      title: 'Service Alerts',
      description: 'Stay informed about delays and service changes',
      icon: 'notifications-outline',
      color: theme.colors.palette.primary500,
    },
    {
      id: '4',
      title: 'Save Favorites',
      description: 'Quick access to your frequently used routes',
      icon: 'bookmarks-outline',
      color: theme.colors.palette.secondary400,
    },
  ]

  const teamMembers = [
    {
      id: '1',
      name: 'Development Team',
      role: 'Building the future of transit',
      icon: 'code-slash-outline',
    },
    {
      id: '2',
      name: 'Design Team',
      role: 'Creating beautiful experiences',
      icon: 'color-palette-outline',
    },
    {
      id: '3',
      name: 'Support Team',
      role: 'Here to help you',
      icon: 'people-outline',
    },
  ]

  const styles = useMemo(() => createStyles(theme), [theme])

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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.palette.neutral800}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* App Info Section */}
            <Animated.View
              style={[
                styles.heroSection,
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
              <View style={styles.appIconContainer}>
                <View style={styles.appIcon}>
                  <Ionicons
                    name="bus"
                    size={64}
                    color={theme.colors.palette.primary400}
                  />
                </View>
              </View>
              <Text style={styles.appName}>Andojo Transit</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
              <Text style={styles.appDescription}>
                Your all-in-one transit companion. Plan trips, track vehicles,
                and stay informed about service updates.
              </Text>
            </Animated.View>

            {/* Features Section */}
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresContainer}>
                {features.map(feature => (
                  <View key={feature.id} style={styles.featureCard}>
                    <View
                      style={[
                        styles.featureIconContainer,
                        { backgroundColor: `${feature.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={feature.icon as any}
                        size={28}
                        color={feature.color}
                      />
                    </View>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Mission Section */}
            <Animated.View
              style={[
                styles.missionSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.missionCard}>
                <Ionicons
                  name="rocket-outline"
                  size={40}
                  color={theme.colors.palette.primary400}
                />
                <Text style={styles.missionTitle}>Our Mission</Text>
                <Text style={styles.missionText}>
                  To make public transportation more accessible, convenient, and
                  enjoyable for everyone. We believe that getting around your
                  city should be simple, reliable, and stress-free.
                </Text>
              </View>
            </Animated.View>

            {/* Team Section */}
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Our Team</Text>
              <View style={styles.teamContainer}>
                {teamMembers.map(member => (
                  <View key={member.id} style={styles.teamCard}>
                    <View style={styles.teamIconContainer}>
                      <Ionicons
                        name={member.icon as any}
                        size={32}
                        color={theme.colors.palette.primary400}
                      />
                    </View>
                    <Text style={styles.teamName}>{member.name}</Text>
                    <Text style={styles.teamRole}>{member.role}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Legal Section */}
            <Animated.View
              style={[
                styles.legalSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.legalTitle}>Legal</Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity style={styles.legalLink} activeOpacity={0.7}>
                  <Text style={styles.legalLinkText}>Terms of Service</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </TouchableOpacity>
                <View style={styles.legalDivider} />
                <TouchableOpacity style={styles.legalLink} activeOpacity={0.7}>
                  <Text style={styles.legalLinkText}>Privacy Policy</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </TouchableOpacity>
                <View style={styles.legalDivider} />
                <TouchableOpacity style={styles.legalLink} activeOpacity={0.7}>
                  <Text style={styles.legalLinkText}>Open Source Licenses</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.palette.neutral500}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.footerText}>
                Made with ❤️ by the Andojo Team
              </Text>
              <Text style={styles.footerCopyright}>
                © 2024 Andojo Transit. All rights reserved.
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      backgroundColor: theme.colors.palette.neutral100,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.palette.neutral300,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 30,
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    appIconContainer: {
      marginBottom: 24,
    },
    appIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.palette.primary200,
    },
    appName: {
      fontSize: 32,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginBottom: 8,
    },
    appVersion: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      marginBottom: 16,
    },
    appDescription: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginBottom: 16,
    },
    featuresContainer: {
      gap: 12,
    },
    featureCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    featureIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    featureTitle: {
      fontSize: 18,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral800,
      marginBottom: 6,
    },
    featureDescription: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      lineHeight: 20,
    },
    missionSection: {
      marginBottom: 32,
    },
    missionCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    missionTitle: {
      fontSize: 22,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginTop: 16,
      marginBottom: 12,
    },
    missionText: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 24,
    },
    teamContainer: {
      gap: 12,
    },
    teamCard: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    teamIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    teamName: {
      fontSize: 16,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral800,
      marginBottom: 4,
    },
    teamRole: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
    },
    legalSection: {
      marginBottom: 32,
    },
    legalTitle: {
      fontSize: 20,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginBottom: 16,
    },
    legalLinks: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral400,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    legalLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    legalLinkText: {
      fontSize: 15,
      color: theme.colors.palette.neutral700,
    },
    legalDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginLeft: 16,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    footerText: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      marginBottom: 8,
    },
    footerCopyright: {
      fontSize: 13,
      color: theme.colors.palette.neutral500,
    },
  })
