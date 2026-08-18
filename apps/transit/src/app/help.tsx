// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, typography, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import LinearGradient from 'react-native-linear-gradient'
import { useMemo, useEffect, useRef } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HelpScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Help', '/help')
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    trackScreenMount()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const faqItems = [
    {
      id: '1',
      question: 'How do I plan a trip?',
      answer:
        'Simply enter your starting point and destination in the Plan tab. The app will show you the best route options with estimated travel times and fares.',
    },
    {
      id: '2',
      question: 'How do I save my favorite routes?',
      answer:
        'After planning a trip, you can save it by tapping the bookmark icon. Saved routes will appear in the Saved tab for quick access.',
    },
    {
      id: '3',
      question: 'How do I find nearby stops?',
      answer:
        'The Nearby tab automatically shows stops close to your location. You can filter by transportation mode (bus, train, subway) to see specific options.',
    },
    {
      id: '4',
      question: 'What do service alerts mean?',
      answer:
        'Service alerts notify you about delays, route changes, or service disruptions. Check the Alerts tab regularly for the latest updates.',
    },
    {
      id: '5',
      question: 'How do I set my home and work stops?',
      answer:
        'Go to your Profile tab, then tap on "Home Stop" or "Work Stop" to search and select your preferred stops. This makes trip planning faster.',
    },
    {
      id: '6',
      question: 'Can I see real-time arrival times?',
      answer:
        "Yes! When you view a stop, you'll see real-time arrival information for all vehicles serving that stop, including the next arrival times.",
    },
  ]

  const supportOptions = [
    {
      id: '1',
      title: 'Contact Support',
      description: 'Get help from our support team',
      icon: 'mail-outline',
      color: theme.colors.palette.primary400,
    },
    {
      id: '2',
      title: 'Report an Issue',
      description: 'Let us know about problems or bugs',
      icon: 'bug-outline',
      color: theme.colors.palette.primary500,
    },
    {
      id: '3',
      title: 'Suggest a Feature',
      description: 'Share your ideas for improvement',
      icon: 'bulb-outline',
      color: theme.colors.palette.primary300,
    },
    {
      id: '4',
      title: 'View Tutorial',
      description: 'Learn how to use the app',
      icon: 'school-outline',
      color: theme.colors.palette.secondary400,
    },
  ]

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
            <Text style={styles.headerTitle}>Help & Support</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
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
              <View style={styles.heroIcon}>
                <Ionicons
                  name="help-circle"
                  size={64}
                  color={theme.colors.palette.primary400}
                />
              </View>
              <Text style={styles.heroTitle}>How can we help you?</Text>
              <Text style={styles.heroSubtitle}>
                Find answers to common questions or get in touch with our
                support team
              </Text>
            </Animated.View>

            {/* Support Options */}
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
              <Text style={styles.sectionTitle}>Get Support</Text>
              <View style={styles.optionsGrid}>
                {supportOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionCard}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.optionIconContainer,
                        { backgroundColor: `${option.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={28}
                        color={option.color}
                      />
                    </View>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* FAQ Section */}
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
              <Text style={styles.sectionTitle}>
                Frequently Asked Questions
              </Text>
              <View style={styles.faqContainer}>
                {faqItems.map((item, index) => (
                  <View key={item.id} style={styles.faqItem}>
                    <View style={styles.faqHeader}>
                      <View style={styles.faqIcon}>
                        <Ionicons
                          name="help-circle-outline"
                          size={20}
                          color={theme.colors.palette.primary400}
                        />
                      </View>
                      <Text style={styles.faqQuestion}>{item.question}</Text>
                    </View>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                    {index < faqItems.length - 1 && (
                      <View style={styles.faqDivider} />
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Contact Section */}
            <Animated.View
              style={[
                styles.contactSection,
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
              <View style={styles.contactCard}>
                <Ionicons
                  name="mail"
                  size={32}
                  color={theme.colors.palette.primary400}
                />
                <Text style={styles.contactTitle}>Still need help?</Text>
                <Text style={styles.contactDescription}>
                  Our support team is available 24/7 to assist you with any
                  questions or concerns.
                </Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.contactButtonText}>Contact Support</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={theme.colors.palette.neutral100}
                  />
                </TouchableOpacity>
              </View>
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
    heroIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.palette.primary100,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    heroTitle: {
      fontSize: 28,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginBottom: 12,
      textAlign: 'center',
    },
    heroSubtitle: {
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
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    optionCard: {
      width: '48%',
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
    optionIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    optionTitle: {
      fontSize: 15,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral800,
      marginBottom: 6,
      textAlign: 'center',
    },
    optionDescription: {
      fontSize: 12,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 18,
    },
    faqContainer: {
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
    faqItem: {
      padding: 20,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    faqIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    faqQuestion: {
      flex: 1,
      fontSize: 16,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral800,
      lineHeight: 24,
    },
    faqAnswer: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
      lineHeight: 22,
      marginLeft: 32,
    },
    faqDivider: {
      height: 1,
      backgroundColor: theme.colors.palette.neutral300,
      marginTop: 20,
    },
    contactSection: {
      marginTop: 8,
      marginBottom: 20,
    },
    contactCard: {
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
    contactTitle: {
      fontSize: 22,
      fontFamily: typography.primary.bold,
      color: theme.colors.palette.neutral800,
      marginTop: 16,
      marginBottom: 8,
    },
    contactDescription: {
      fontSize: 15,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary400,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      gap: 8,
      shadowColor: theme.colors.palette.primary400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    contactButtonText: {
      fontSize: 16,
      fontFamily: typography.primary.semiBold,
      color: theme.colors.palette.neutral100,
    },
  })
