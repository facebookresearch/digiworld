import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'react-native-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useAppTheme, Text, type Theme } from '@andojo/shared-theme'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { translate } from '@/i18n/translate'
import { debounce } from 'lodash'

export default observer(function CreditCardDiscoveryScreen() {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { bankingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking(
    'creditCardDiscovery',
    '/credit-card/discovery',
  )

  // Use store state instead of local state
  const currentStep = bankingStore.discoveryCurrentStep
  const isComplete = bankingStore.discoveryIsComplete
  const cardConfig = bankingStore.discoveryCardConfig

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const rippleAnim = useRef(new Animated.Value(0)).current
  const successAnim = useRef(new Animated.Value(0)).current

  const steps = [
    translate('creditCardDiscovery.steps.reviewingProfile'),
    translate('creditCardDiscovery.steps.checkingCreditScore'),
    translate('creditCardDiscovery.steps.waitingApproval'),
  ]

  useEffect(() => {
    trackScreenMount({
      timeStamp: Date.now(),
      screen: 'creditCardDiscovery',
      route: '/credit-card/discovery',
    })

    // Initialize discovery state in store
    const initializeDiscovery = async () => {
      await bankingStore.initializeDiscovery()
    }
    initializeDiscovery()

    startAnimations()
    startDiscoveryProcess()

    // Cleanup when component unmounts
    return () => {
      bankingStore.resetDiscoveryState()
    }
  }, [])

  const startAnimations = useCallback(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )
    pulseAnimation.start()

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    )
    rotateAnimation.start()

    // Ripple animation
    const rippleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    )
    rippleAnimation.start()
  }, [fadeAnim, scaleAnim, slideAnim, pulseAnim, rotateAnim, rippleAnim])

  const startDiscoveryProcess = useCallback(() => {
    const interval = setInterval(() => {
      const nextStep = bankingStore.discoveryCurrentStep + 1
      if (nextStep < steps.length) {
        bankingStore.setDiscoveryCurrentStep(nextStep)
      } else {
        clearInterval(interval)
        // After all steps, show success
        setTimeout(() => {
          bankingStore.setDiscoveryIsComplete(true)
          startSuccessAnimation()
        }, 2000)
      }
    }, 2000)
  }, [steps.length, bankingStore])

  const startSuccessAnimation = useCallback(() => {
    Animated.spring(successAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [successAnim])

  const handleReadyToUse = debounce(async () => {
    try {
      if (!bankingStore.currentSession?.userId) {
        return
      }

      // Use card config from store
      if (!bankingStore.discoveryCardConfig) {
        throw new Error('No card configuration available for your tier')
      }

      // Get the current user's name
      const currentUser = bankingStore.users.find(
        u => u.id === bankingStore.currentSession?.userId,
      )
      const cardholderName =
        currentUser?.username || currentUser?.username || 'Cardholder'

      console.log(bankingStore.discoveryCardConfig, 'data')
      await bankingStore.applyCreditCard({
        userId: bankingStore.currentSession?.userId,
        cardholderName,
        creditLimit: bankingStore.discoveryCardConfig.creditLimit,
        apr: bankingStore.discoveryCardConfig.apr,
        annualFee: bankingStore.discoveryCardConfig.annualFee,
      })

      // Reset discovery state and navigate back
      bankingStore.resetDiscoveryState()
      router.replace('/cards')
    } catch (error) {
      console.error('Error creating credit card:', error)
      // Reset discovery state and navigate back even if there's an error
      bankingStore.resetDiscoveryState()
      router.replace('/cards')
    }
  }, 300)

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={[
          theme.colors.palette.primary500,
          theme.colors.palette.primary600,
          theme.colors.palette.accent500,
        ]}
        locations={[0, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      {/* Subtle Pattern Overlay */}
      <View style={styles.patternOverlay} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {!isComplete ? (
            <>
              {/* Processing Animation */}
              <View style={styles.animationContainer}>
                {/* Enhanced Ripple Effect */}
                <View style={styles.rippleContainer}>
                  <Animated.View
                    style={[
                      styles.ripple,
                      {
                        transform: [
                          {
                            scale: rippleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 3],
                            }),
                          },
                        ],
                        opacity: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 0],
                        }),
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.ripple,
                      styles.rippleSecondary,
                      {
                        transform: [
                          {
                            scale: rippleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 2.2],
                            }),
                          },
                        ],
                        opacity: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0],
                        }),
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.ripple,
                      styles.rippleTertiary,
                      {
                        transform: [
                          {
                            scale: rippleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.8],
                            }),
                          },
                        ],
                        opacity: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.2, 0],
                        }),
                      },
                    ]}
                  />
                </View>

                {/* Enhanced Central Icon */}
                <Animated.View
                  style={[
                    styles.centralIcon,
                    {
                      transform: [{ scale: pulseAnim }, { rotate: spin }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.palette.primary500,
                      theme.colors.palette.primary600,
                      theme.colors.palette.accent500,
                    ]}
                    style={styles.iconGradient}
                  >
                    <Ionicons
                      name="card-outline"
                      size={64}
                      color={theme.colors.palette.neutral100}
                    />
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* Enhanced Step Display */}
              <View style={styles.stepContainer}>
                <View style={styles.stepCard}>
                  <Text
                    preset="subheading"
                    style={{ color: theme.colors.text as string }}
                  >
                    {steps[currentStep]}
                  </Text>

                  {/* Modern Progress Indicator */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressDots}>
                      {steps.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.progressDot,
                            index <= currentStep && styles.progressDotActive,
                          ]}
                        />
                      ))}
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <Animated.View
                          style={[
                            styles.progressFill,
                            {
                              width: `${((currentStep + 1) / steps.length) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <Text style={styles.progressText}>
                      {currentStep + 1} of {steps.length}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* Enhanced Success State */
            <Animated.View
              style={[
                styles.successContainer,
                {
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Success Content Card */}
              <View style={styles.successCard}>
                {/* Success Icon with Glow Effect */}
                <View style={styles.successIconContainer}>
                  <View style={styles.successIconGlow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={120}
                      color={theme.colors.palette.success500}
                    />
                  </View>
                </View>
                <Text preset="subheading" style={styles.successTitle}>
                  {translate('creditCardDiscovery.success.congratulations')}
                </Text>
                <Text style={styles.successSubtitle}>
                  {translate('creditCardDiscovery.success.approved')}
                </Text>
                <Text style={styles.successDescription}>
                  {translate('creditCardDiscovery.success.benefits')}
                </Text>

                {/* Credit Limit Highlight */}
                <View style={styles.creditLimitCard}>
                  <Text style={styles.creditLimitLabel}>{'Credit Card'}</Text>
                  <Text style={styles.creditLimitAmount}>
                    {cardConfig?.creditLimit
                      ? `$${cardConfig.creditLimit.toLocaleString()}`
                      : '$15,000'}
                  </Text>
                  <Text style={styles.creditLimitSubtext}>
                    Credit Limit - Available immediately
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.readyButton}
                  onPress={handleReadyToUse}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.palette.success300,
                      theme.colors.palette.success500,
                    ]}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.readyButtonText}>
                      {translate('creditCardDiscovery.success.readyToUse')}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={theme.colors.palette.neutral100}
                      style={styles.buttonIcon}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
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
    patternOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.palette.overlay20,
      opacity: 0.8,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    animationContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 280,
      marginBottom: 80,
    },
    rippleContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ripple: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.palette.overlay20,
    },
    rippleSecondary: {
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.colors.palette.overlay50,
    },
    rippleTertiary: {
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: theme.colors.palette.overlay20,
    },
    centralIcon: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 12,
    },
    iconGradient: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.palette.neutral400,
    },
    stepContainer: {
      alignItems: 'center',
      width: '100%',
    },
    stepCard: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 20,
      padding: 28,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    stepText: {
      textAlign: 'center',
      marginBottom: 32,
      letterSpacing: 0.5,
    },
    progressSection: {
      alignItems: 'center',
      width: '100%',
    },
    progressDots: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 12,
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.palette.primary200,
    },
    progressDotActive: {
      backgroundColor: theme.colors.palette.primary500,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    progressBarContainer: {
      width: '100%',
      marginBottom: 16,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.palette.primary200,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.palette.primary500,
      borderRadius: 2,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    progressText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.palette.primary500,
      letterSpacing: 0.5,
    },
    successContainer: {
      alignItems: 'center',
      width: '100%',
    },
    successIconContainer: {
      marginBottom: 40,
    },
    successIconGlow: {
      shadowColor: theme.colors.palette.success500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
    },
    successCard: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 20,
      padding: 32,
      width: '100%',
      alignItems: 'center',
      marginBottom: 40,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    successTitle: {
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: 0.5,
    },
    successSubtitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.palette.success400,
      textAlign: 'center',
      marginBottom: 20,
      letterSpacing: 0.3,
    },
    successDescription: {
      fontSize: 16,
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
      paddingHorizontal: 8,
      letterSpacing: 0.2,
    },
    creditLimitCard: {
      backgroundColor: theme.colors.palette.success100,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.palette.success200,
    },
    creditLimitLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral700,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    creditLimitAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.colors.palette.success400,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    creditLimitSubtext: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
      letterSpacing: 0.3,
    },
    readyButton: {
      borderRadius: 16,
      shadowColor: theme.colors.palette.success400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      marginTop: 16,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 18,
      borderRadius: 16,
    },
    readyButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
      marginRight: 8,
      letterSpacing: 0.5,
    },
    buttonIcon: {
      marginLeft: 4,
    },
  })
