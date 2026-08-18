// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '@/components'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { spacing, useAppTheme, type Theme } from '@andojo/shared-theme'

interface ProgressStepsProps {
  currentStep: number
  steps: string[]
  onStepPress: (step: number) => void
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStep,
  steps,
  onStepPress,
}) => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressWrapper}>
        <LinearGradient
          colors={[
            `${theme.colors.palette.neutral100 || '#FFFFFF'}FA`,
            `${theme.colors.palette.neutral100 || '#FFFFFF'}F5`,
          ]}
          style={styles.progressCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Checkout Progress</Text>
            <Text style={styles.progressSubtitle}>Step {currentStep} of 3</Text>
          </View>

          <View style={styles.stepsRow}>
            {[1, 2, 3].map((step, index) => (
              <View key={step} style={styles.stepContainer}>
                <TouchableOpacity
                  style={[
                    styles.stepCircle,
                    step <= currentStep && styles.stepCircleActive,
                  ]}
                  onPress={() => onStepPress(step)}
                >
                  {step < currentStep ? (
                    <LinearGradient
                      colors={[
                        theme.colors.palette.success500,
                        theme.colors.palette.success600,
                      ]}
                      style={styles.stepCircleGradient}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFF"
                      />
                    </LinearGradient>
                  ) : step === currentStep ? (
                    <LinearGradient
                      colors={[
                        theme.colors.palette.accent500,
                        theme.colors.palette.accent600,
                      ]}
                      style={styles.stepCircleGradient}
                    >
                      <View style={styles.currentStepIndicator}>
                        <Text style={styles.stepNumber}>{step}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveStepCircle}>
                      <Text style={styles.inactiveStepNumber}>{step}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.stepLabelContainer}>
                  <Text
                    style={[
                      styles.stepLabel,
                      step <= currentStep && styles.stepLabelActive,
                      step === currentStep && styles.stepLabelCurrent,
                    ]}
                  >
                    {steps[step - 1]}
                  </Text>
                  {step === currentStep && (
                    <View style={styles.currentStepDot} />
                  )}
                </View>

                {index < 2 && (
                  <LinearGradient
                    colors={
                      step < currentStep
                        ? [
                            theme.colors.palette.success100,
                            theme.colors.palette.success200,
                          ]
                        : [
                            theme.colors.palette.neutral300,
                            theme.colors.palette.neutral400,
                          ]
                    }
                    style={styles.stepConnector}
                  />
                )}
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    progressContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    progressWrapper: {
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    progressCard: {
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressHeader: {
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral800,
      marginBottom: 2,
    },
    progressSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    stepsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    stepContainer: {
      alignItems: 'center',
      flex: 1,
      position: 'relative',
    },
    stepCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginBottom: spacing.xs,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    stepCircleActive: {
      shadowColor: theme.colors.palette.success500,
      shadowOpacity: 0.3,
    },
    stepCircleGradient: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentStepIndicator: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inactiveStepCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.neutral200,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.palette.neutral300,
    },
    stepNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.palette.neutral900,
    },
    inactiveStepNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral500,
    },
    stepLabelContainer: {
      alignItems: 'center',
      minHeight: 32,
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.neutral600,
      textAlign: 'center',
      marginBottom: 2,
    },
    stepLabelActive: {
      color: theme.colors.palette.primary600,
    },
    stepLabelCurrent: {
      color: theme.colors.palette.accent600,
      fontWeight: '700',
    },
    currentStepDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.palette.accent500,
    },
    stepConnector: {
      position: 'absolute',
      top: 20,
      left: '70%',
      right: '-40%',
      height: 2,
      borderRadius: 1,
    },
  })
