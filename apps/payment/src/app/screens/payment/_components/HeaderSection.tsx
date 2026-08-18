// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { memo } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from '@/components'
import { colors } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

interface HeaderSectionProps {
  currentStep: 'amount' | 'method' | 'pin'
  onBack?: () => void
  type?: 'deposit' | 'withdrawal'
}

interface StepIndicatorProps {
  stepNumber: number
  label: string
  isActive: boolean
  isCompleted: boolean
}

const StepIndicator = memo<StepIndicatorProps>(
  ({ stepNumber, label, isActive, isCompleted }) => (
    <View style={styles.stepIndicator}>
      <View
        style={[
          styles.circle,
          isActive && styles.activeCircle,
          isCompleted && styles.completedCircle,
        ]}
      >
        {isCompleted ? (
          <Ionicons
            name="checkmark"
            size={16}
            color={colors.palette.neutral100}
          />
        ) : (
          <Text
            text={stepNumber.toString()}
            style={[styles.stepNumber, isActive && styles.activeStepNumber]}
          />
        )}
      </View>
      <Text
        text={label}
        size="xs"
        style={[
          styles.stepLabel,
          isActive && styles.activeStepLabel,
          isCompleted && styles.completedStepLabel,
        ]}
      />
    </View>
  ),
)

const StepLine = memo<{ isCompleted: boolean }>(({ isCompleted }) => (
  <View style={[styles.stepLine, isCompleted && styles.completedStepLine]} />
))

export const HeaderSection = memo<HeaderSectionProps>(
  ({ currentStep, onBack, type = 'deposit' }) => {
    const insets = useSafeAreaInsets()

    // Define gradient colors based on transaction type
    const gradientColors =
      type === 'deposit'
        ? ([colors.palette.primary400, colors.palette.primary500] as [
            string,
            string,
          ])
        : ([colors.palette.angry300, colors.palette.angry400] as [
            string,
            string,
          ])

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.backButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.palette.neutral100}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <Text
            text={type === 'withdrawal' ? 'Withdraw Money' : 'Add Money'}
            preset="heading"
            style={[styles.title, onBack && styles.titleWithButton]}
          />

          {onBack && <View style={styles.placeholder} />}
        </View>

        <View style={styles.stepsContainer}>
          <StepIndicator
            stepNumber={1}
            label="Amount"
            isActive={currentStep === 'amount'}
            isCompleted={currentStep === 'method' || currentStep === 'pin'}
          />
          <StepLine
            isCompleted={currentStep === 'method' || currentStep === 'pin'}
          />
          <StepIndicator
            stepNumber={2}
            label="Method"
            isActive={currentStep === 'method'}
            isCompleted={currentStep === 'pin'}
          />
          <StepLine isCompleted={currentStep === 'pin'} />
          <StepIndicator
            stepNumber={3}
            label="PIN"
            isActive={currentStep === 'pin'}
            isCompleted={false}
          />
        </View>
      </LinearGradient>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    color: colors.palette.neutral100,
    textAlign: 'center',
    fontSize: 28,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleWithButton: {
    marginHorizontal: 8,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepIndicator: {
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeCircle: {
    backgroundColor: colors.palette.neutral100,
    borderColor: colors.palette.neutral200,
  },
  completedCircle: {
    backgroundColor: colors.palette.secondary400,
    borderColor: colors.palette.secondary500,
  },
  stepNumber: {
    color: colors.palette.neutral100,
    fontSize: 14,
    fontWeight: '600',
  },
  activeStepNumber: {
    color: colors.palette.primary500,
  },
  stepLabel: {
    color: colors.palette.neutral300,
    marginTop: 4,
    fontSize: 12,
  },
  activeStepLabel: {
    color: colors.palette.neutral100,
    fontWeight: '600',
  },
  completedStepLabel: {
    color: colors.palette.secondary400,
    fontWeight: '500',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  completedStepLine: {
    backgroundColor: colors.palette.secondary400,
  },
})

export default HeaderSection
