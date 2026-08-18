import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'

export default function TermsScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking('Terms', '/terms')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'terms',
        route: '/terms',
      })
    }, []),
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {translate('termsAndConditions.headerTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>
          {translate('termsAndConditions.lastUpdated')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.acceptance.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.acceptance.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.serviceDescription.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.serviceDescription.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.userAccounts.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.userAccounts.text.0') + '\n'}
          {translate('termsAndConditions.sections.userAccounts.text.1') + '\n'}
          {translate('termsAndConditions.sections.userAccounts.text.2')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.subscription.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.subscription.text.0') + '\n'}
          {translate('termsAndConditions.sections.subscription.text.1') + '\n'}
          {translate('termsAndConditions.sections.subscription.text.2')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.contentUsage.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.contentUsage.text.0') + '\n'}
          {translate('termsAndConditions.sections.contentUsage.text.1') + '\n'}
          {translate('termsAndConditions.sections.contentUsage.text.2')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.userConduct.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.userConduct.text.0') + '\n'}
          {translate('termsAndConditions.sections.userConduct.text.1') + '\n'}
          {translate('termsAndConditions.sections.userConduct.text.2') + '\n'}
          {translate('termsAndConditions.sections.userConduct.text.3') + '\n'}
          {translate('termsAndConditions.sections.userConduct.text.4')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.availability.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.availability.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.termination.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.termination.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.changes.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.changes.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.contact.title')}
        </Text>
        <Text style={styles.text}>
          {translate('termsAndConditions.sections.contact.text')}
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    backButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    lastUpdated: {
      color: theme.colors.textDim,
      fontSize: 14,
      marginBottom: 24,
    },
    section: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 24,
      marginBottom: 12,
    },
    text: {
      color: theme.colors.textDim,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
    bottomPadding: {
      height: 40,
    },
  })
