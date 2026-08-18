// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'react-native-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'
import { FancyAlert } from '@/components/FancyAlert'
import { debounce } from 'lodash'

export default observer(function CreditCardTermsScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { bankingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'creditCardTerms',
    '/credit-card/terms',
  )

  useEffect(() => {
    trackScreenMount({
      timeStamp: Date.now(),
      screen: 'creditCardTerms',
      route: '/credit-card/terms',
    })

    return () => {
      // Only reset if user is canceling/going back, not proceeding to discovery
    }
  }, [])

  const handleApply = debounce(() => {
    if (!bankingStore.creditCardTermsAccepted) {
      bankingStore.showAlert({
        title: translate('common.error'),
        message: translate('creditCardTerms.pleaseAcceptTerms'),
        preset: 'error',
      })
      return
    }

    if (!bankingStore.currentSession?.userId) {
      bankingStore.showAlert({
        title: translate('common.error'),
        message: translate('creditCardTerms.loginRequired'),
        preset: 'error',
      })
      return
    }

    // Reset discovery state and navigate to discovery screen
    bankingStore.resetDiscoveryState()
    router.push('/credit-card/discovery')
  }, 300)

  const handleCancel = () => {
    bankingStore.resetCreditCardTermsState()
    router.back()
  }

  const renderSimpleSection = (
    sectionKey: string,
    titleKey: any,
    textKey: any,
  ) => {
    const title = translate(titleKey)
    const text = translate(textKey)

    return (
      <View key={sectionKey} style={styles.section}>
        <Text
          style={
            [styles.sectionTitle, { color: theme.colors.text as string }] as any
          }
        >
          {title}
        </Text>
        <Text
          style={
            [styles.sectionText, { color: theme.colors.text as string }] as any
          }
        >
          {text}
        </Text>
      </View>
    )
  }

  const renderArraySection = (
    sectionKey: string,
    titleKey: any,
    textKeyBase: any,
    itemCount: number,
  ) => {
    const title = translate(titleKey)
    const textItems = []

    for (let i = 0; i < itemCount; i++) {
      textItems.push(translate(`${textKeyBase}.${i}` as any))
    }

    const text = textItems.join('\n')

    return (
      <View key={sectionKey} style={styles.section}>
        <Text
          style={
            [styles.sectionTitle, { color: theme.colors.text as string }] as any
          }
        >
          {title}
        </Text>
        <Text
          style={
            [styles.sectionText, { color: theme.colors.text as string }] as any
          }
        >
          {text}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral200,
        ]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back-outline"
              size={24}
              color={theme.colors.palette.neutral900}
            />
          </TouchableOpacity>
          <Text preset="subheading" style={styles.headerTitle}>
            {translate('creditCardTerms.headerTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.termsContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Text
                style={
                  [
                    styles.lastUpdated,
                    { color: theme.colors.textDim as string },
                  ] as any
                }
              >
                {translate('creditCardTerms.lastUpdated', {
                  date: new Date().toLocaleDateString(),
                })}
              </Text>

              {renderSimpleSection(
                'introduction',
                'creditCardTerms.sections.introduction.title',
                'creditCardTerms.sections.introduction.text',
              )}
              {renderArraySection(
                'creditLimit',
                'creditCardTerms.sections.creditLimit.title',
                'creditCardTerms.sections.creditLimit.text',
                4,
              )}
              {renderArraySection(
                'interestRatesAndFees',
                'creditCardTerms.sections.interestRatesAndFees.title',
                'creditCardTerms.sections.interestRatesAndFees.text',
                6,
              )}
              {renderArraySection(
                'paymentTerms',
                'creditCardTerms.sections.paymentTerms.title',
                'creditCardTerms.sections.paymentTerms.text',
                4,
              )}
              {renderArraySection(
                'billingAndStatements',
                'creditCardTerms.sections.billingAndStatements.title',
                'creditCardTerms.sections.billingAndStatements.text',
                4,
              )}
              {renderArraySection(
                'cardUsage',
                'creditCardTerms.sections.cardUsage.title',
                'creditCardTerms.sections.cardUsage.text',
                4,
              )}
              {renderArraySection(
                'rewardsProgram',
                'creditCardTerms.sections.rewardsProgram.title',
                'creditCardTerms.sections.rewardsProgram.text',
                4,
              )}
              {renderArraySection(
                'securityAndFraud',
                'creditCardTerms.sections.securityAndFraud.title',
                'creditCardTerms.sections.securityAndFraud.text',
                4,
              )}
              {renderArraySection(
                'creditReporting',
                'creditCardTerms.sections.creditReporting.title',
                'creditCardTerms.sections.creditReporting.text',
                3,
              )}
              {renderArraySection(
                'changesToTerms',
                'creditCardTerms.sections.changesToTerms.title',
                'creditCardTerms.sections.changesToTerms.text',
                3,
              )}
              {renderArraySection(
                'accountClosure',
                'creditCardTerms.sections.accountClosure.title',
                'creditCardTerms.sections.accountClosure.text',
                4,
              )}
              {renderArraySection(
                'disputeResolution',
                'creditCardTerms.sections.disputeResolution.title',
                'creditCardTerms.sections.disputeResolution.text',
                3,
              )}
              {renderArraySection(
                'contactInformation',
                'creditCardTerms.sections.contactInformation.title',
                'creditCardTerms.sections.contactInformation.text',
                4,
              )}
              {renderArraySection(
                'legalCompliance',
                'creditCardTerms.sections.legalCompliance.title',
                'creditCardTerms.sections.legalCompliance.text',
                4,
              )}

              <Text
                style={
                  [
                    styles.agreementText,
                    { color: theme.colors.text as string },
                  ] as any
                }
              >
                {translate('creditCardTerms.sections.agreement.text')}
              </Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => bankingStore.toggleCreditCardTermsAcceptance()}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: bankingStore.creditCardTermsAccepted
                        ? theme.colors.palette.primary400
                        : 'transparent',
                      borderColor: bankingStore.creditCardTermsAccepted
                        ? theme.colors.palette.primary400
                        : theme.colors.palette.neutral500,
                    },
                  ]}
                >
                  {bankingStore.creditCardTermsAccepted && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.palette.neutral100}
                    />
                  )}
                </View>
                <Text
                  style={
                    [
                      styles.checkboxText,
                      { color: theme.colors.text as string },
                    ] as any
                  }
                >
                  {translate('creditCardTerms.acceptTerms')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Terms Acceptance */}
          <View
            style={[
              styles.acceptanceContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.palette.neutral300 },
                ]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    [
                      styles.buttonText,
                      { color: theme.colors.text as string },
                    ] as any
                  }
                >
                  {translate('creditCardTerms.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.applyButton,
                  {
                    backgroundColor: bankingStore.creditCardTermsAccepted
                      ? theme.colors.palette.primary400
                      : theme.colors.palette.neutral400,
                    opacity: bankingStore.creditCardTermsAccepted ? 1 : 0.6,
                  },
                ]}
                onPress={handleApply}
                activeOpacity={0.8}
                disabled={!bankingStore.creditCardTermsAccepted}
              >
                <Text style={styles.applyButtonText}>
                  {translate('creditCardTerms.applyNow')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* FancyAlert Component */}
      <FancyAlert
        visible={bankingStore.alertState.visible}
        title={bankingStore.alertState.title}
        message={bankingStore.alertState.message}
        preset={bankingStore.alertState.preset as any}
        onClose={() => bankingStore.hideAlert()}
        onConfirm={bankingStore.alertState.showConfirm ? () => {} : undefined}
        confirmText={bankingStore.alertState.confirmText}
        cancelText={bankingStore.alertState.cancelText}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'space-between',
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
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    contentContainer: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    scrollView: {
      flex: 1,
    },
    termsContainer: {
      padding: 20,
    },
    lastUpdated: {
      fontSize: 14,
      marginBottom: 24,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    sectionText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'left',
    },
    agreementText: {
      marginTop: 8,
      marginBottom: 20,
    },
    acceptanceContainer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.palette.overlay20,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxText: {
      fontSize: 16,
      fontWeight: '500',
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      // backgroundColor set dynamically
    },
    applyButton: {
      // backgroundColor set dynamically
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.neutral100,
    },
  })
