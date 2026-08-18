import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Screen, Text, useTheme, Theme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { LinearGradient } from 'expo-linear-gradient'

export default function TermsScreen() {
  const router = useRouter()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Terms of Use',
    '/(tabs)/terms',
  )
  const { theme } = useTheme()
  const colors = theme.colors
  const styles = createStyles(colors)

  React.useEffect(() => {
    trackScreenMount({ timestamp: Date.now() })
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      const { trackScreenMount } = useInteractionTracking(
        'Terms of Use',
        '/(tabs)/terms',
      )

      // Track screen mount when focused
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'Terms of Use',
        route: '/(tabs)/terms',
      })
    }, [router]),
  )

  return (
    <LinearGradient
      colors={[colors.palette.neutral700, colors.palette.neutral800]}
      style={styles.container}
    >
      <Screen style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              trackClick('backButton')
              router.back()
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.palette.neutral100}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Use</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

          <Text style={styles.section}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using the Andojo Ryde mobile application ("App"),
            you accept and agree to be bound by the terms and provision of this
            agreement. If you do not agree to abide by the above, please do not
            use this service.
          </Text>

          <Text style={styles.section}>2. Service Description</Text>
          <Text style={styles.text}>
            Andojo Ryde is a ride-sharing platform that connects passengers with
            drivers for transportation services. The App facilitates booking,
            payment, and communication between users and drivers. We do not
            provide transportation services directly but act as an intermediary
            platform.
          </Text>

          <Text style={styles.section}>3. User Accounts</Text>
          <Text style={styles.text}>
            You must create an account to use our services. You are responsible
            for maintaining the confidentiality of your account information and
            for all activities that occur under your account.{'\n'}
            You must provide accurate, current, and complete information during
            registration and keep your account information updated.{'\n'}
            You are responsible for all charges and activities that occur under
            your account.
          </Text>

          <Text style={styles.section}>4. Ride Booking and Payment</Text>
          <Text style={styles.text}>
            All ride bookings are subject to driver availability and acceptance.
            {'\n'}
            Payment is processed through the App using secure payment methods.
            Prices are calculated based on distance, time, and current demand.
            {'\n'}
            Cancellation fees may apply if you cancel a ride after a driver has
            been assigned.
          </Text>

          <Text style={styles.section}>5. User Conduct and Safety</Text>
          <Text style={styles.text}>
            You agree to behave respectfully and safely during rides.
            Harassment, violence, or inappropriate behavior will result in
            immediate account termination.{'\n'}
            You must provide accurate pickup and destination information.{'\n'}
            You are responsible for your own safety and the safety of your
            belongings during rides.{'\n'}
            Smoking, eating, or causing damage to vehicles is prohibited.{'\n'}
            You must comply with all applicable laws and regulations during
            rides.
          </Text>

          <Text style={styles.section}>6. Maps and Location Services</Text>
          <Text style={styles.text}>
            Our App uses OpenStreetMap data for navigation and location
            services. OpenStreetMap data is provided under the Open Database
            License (ODbL).
            {'\n'}
            Location data is used solely for ride booking, navigation, and
            service improvement purposes.{'\n'}
            We collect only necessary location information required for ride
            operations and do not track your location when not actively using
            the service.{'\n'}
            You can control location permissions through your device settings.
          </Text>

          <Text style={styles.section}>7. Driver Services</Text>
          <Text style={styles.text}>
            Drivers are independent contractors, not employees of Andojo Ryde.
            {'\n'}
            We conduct background checks on drivers, but we cannot guarantee
            their conduct or vehicle condition.{'\n'}
            Drivers are responsible for maintaining valid licenses, insurance,
            and vehicle safety standards.
          </Text>

          <Text style={styles.section}>8. Service Availability</Text>
          <Text style={styles.text}>
            Service availability depends on driver availability in your area. We
            do not guarantee that rides will be available at all times or in all
            locations.
          </Text>

          <Text style={styles.section}>9. Limitation of Liability</Text>
          <Text style={styles.text}>
            Andojo Ryde is not liable for any damages, injuries, or losses that
            occur during rides. Our liability is limited to the amount you paid
            for the specific ride service.
          </Text>

          <Text style={styles.section}>10. Privacy and Data</Text>
          <Text style={styles.text}>
            We collect and process personal data as described in our Privacy
            Policy. By using the App, you consent to such processing.{'\n'}
            Location data is used only for ride operations and is not shared
            with third parties except as required by law.{'\n'}
            You can request deletion of your account and associated data at any
            time.
          </Text>

          <Text style={styles.section}>11. Termination</Text>
          <Text style={styles.text}>
            We may terminate or suspend your account at any time for violations
            of these terms or for any other reason at our discretion.
          </Text>

          <Text style={styles.section}>12. Changes to Terms</Text>
          <Text style={styles.text}>
            We may modify these terms at any time. Continued use of the App
            after changes constitutes acceptance of the new terms.
          </Text>

          <Text style={styles.section}>13. Contact Information</Text>
          <Text style={styles.text}>
            For questions about these terms or our services, please contact us
            at support@andojoryde.com
          </Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </Screen>
    </LinearGradient>
  )
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.palette.neutral800,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.palette.neutral800,
      marginTop: 20,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.palette.neutral100,
    },
    backButton: {
      position: 'relative',
      top: 0,
      left: 0,
      zIndex: 10,
      backgroundColor: colors.palette.overlay20,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    lastUpdated: {
      color: colors.palette.neutral400,
      fontSize: 14,
      marginBottom: 24,
    },
    section: {
      color: colors.palette.primary400,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 24,
      marginBottom: 12,
    },
    text: {
      color: colors.palette.neutral200,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
    bottomPadding: {
      height: 40,
    },
  })
