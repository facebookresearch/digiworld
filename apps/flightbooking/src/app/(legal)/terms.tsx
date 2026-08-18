// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useEffect, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { translate } from '@/i18n/translate'

export default function TermsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('Terms', '/terms')

  useEffect(() => {
    trackScreenMount()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.palette.neutral900}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {translate('termsAndConditions.headerTitle')}
        </Text>
        <View style={styles.backButton} />
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backButton: {
      padding: 8,
    },
    bottomPadding: {
      height: 40,
    },
    container: {
      backgroundColor: theme.colors.palette.neutral200,
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      color: theme.colors.palette.neutral900,
      fontSize: 20,
      fontWeight: '600',
    },
    lastUpdated: {
      color: theme.colors.palette.neutral800,
      fontSize: 14,
      marginBottom: 24,
    },
    section: {
      color: theme.colors.palette.neutral900,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 24,
    },
    text: {
      color: theme.colors.palette.neutral800,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
  })
