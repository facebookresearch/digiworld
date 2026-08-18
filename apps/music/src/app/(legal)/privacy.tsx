// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'

export default function PrivacyScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  const { trackScreenMount } = useInteractionTracking('Privacy', '/privacy')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'privacy',
        route: '/privacy',
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
          {translate('privacyPolicy.headerTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>
          {translate('privacyPolicy.lastUpdated')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.introduction.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.introduction.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.informationWeCollect.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.informationWeCollect.text.0') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.1') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.2') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.3') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.4') +
            '\n\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.5') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.6') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.7') +
            '\n'}
          {translate('privacyPolicy.sections.informationWeCollect.text.8')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.howWeUseInfo.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.howWeUseInfo.text.0') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.1') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.2') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.3') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.4') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.5') + '\n'}
          {translate('privacyPolicy.sections.howWeUseInfo.text.6')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.informationSharing.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.informationSharing.text.0') + '\n'}
          {translate('privacyPolicy.sections.informationSharing.text.1') + '\n'}
          {translate('privacyPolicy.sections.informationSharing.text.2') + '\n'}
          {translate('privacyPolicy.sections.informationSharing.text.3')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.dataSecurity.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.dataSecurity.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.yourRights.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.yourRights.text.0') + '\n'}
          {translate('privacyPolicy.sections.yourRights.text.1') + '\n'}
          {translate('privacyPolicy.sections.yourRights.text.2') + '\n'}
          {translate('privacyPolicy.sections.yourRights.text.3') + '\n'}
          {translate('privacyPolicy.sections.yourRights.text.4') + '\n'}
          {translate('privacyPolicy.sections.yourRights.text.5')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.cookies.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.cookies.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.children.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.children.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.international.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.international.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.changes.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.changes.text')}
        </Text>

        <Text style={styles.section}>
          {translate('privacyPolicy.sections.contact.title')}
        </Text>
        <Text style={styles.text}>
          {translate('privacyPolicy.sections.contact.text')}
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
