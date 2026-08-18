import { useEffect, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Text, type Theme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '@andojo/shared-theme'
import i18n from 'i18next'
import { translate } from '@/i18n/translate'

export default function TermsScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { trackScreenMount } = useInteractionTracking('Terms', '/terms')

  useEffect(() => {
    trackScreenMount()
  }, [])

  const flattenToStrings = (input: any): string[] => {
    if (input === null || input === undefined) return []
    if (
      typeof input === 'string' ||
      typeof input === 'number' ||
      typeof input === 'boolean'
    ) {
      return [String(input)]
    }
    if (Array.isArray(input)) return input.flatMap(i => flattenToStrings(i))
    if (typeof input === 'object') {
      const keys = Object.keys(input)
      const allNumeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k))
      const orderedKeys = allNumeric
        ? keys.sort((a, b) => Number(a) - Number(b))
        : keys
      return orderedKeys.flatMap(k => flattenToStrings((input as any)[k]))
    }
    return [String(input)]
  }

  const renderText = (key: string) => {
    try {
      const val: any = i18n.t(key, { returnObjects: true })
      if (val === key || val === undefined || val === null) {
        // If translation not found, return empty string or the key
        return ''
      }
      const parts = flattenToStrings(val)
      return parts.join('\n')
    } catch (error) {
      console.warn(`Translation error for key ${key}:`, error)
      return ''
    }
  }

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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
          {renderText('termsAndConditions.sections.acceptance.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.serviceDescription.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.serviceDescription.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.userAccounts.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.userAccounts.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.subscription.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.subscription.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.contentUsage.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.contentUsage.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.userConduct.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.userConduct.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.availability.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.availability.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.termination.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.termination.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.changes.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.changes.text')}
        </Text>

        <Text style={styles.section}>
          {translate('termsAndConditions.sections.contact.title')}
        </Text>
        <Text style={styles.text}>
          {renderText('termsAndConditions.sections.contact.text')}
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
