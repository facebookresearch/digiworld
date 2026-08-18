import { colors, spacing, Theme, useAppTheme } from '@andojo/shared-theme'
import { MaterialIcons } from '@expo/vector-icons'
import {
  View,
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native'

const StepIndicator = ({
  currentStep,
  steps,
  onStepPress,
}: {
  currentStep: number
  steps: string[]
  onStepPress: (step: number) => void
}) => {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.stepIndicatorContainer}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isActive = currentStep === stepNumber
        const isCompleted = currentStep > stepNumber
        const canNavigate = stepNumber < currentStep // Can only go back to previous steps

        return (
          <View key={step} style={styles.stepWrapper}>
            <View style={styles.stepLine}>
              <Animated.View
                style={[
                  styles.line,
                  index === 0 && { left: '50%' },
                  index === steps.length - 1 && { right: '50%' },
                  isCompleted && styles.completedLine,
                ]}
              />
            </View>
            <TouchableOpacity
              onPress={() => canNavigate && onStepPress(stepNumber)}
              disabled={!canNavigate}
              style={styles.stepTouchable}
            >
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.activeStepCircle,
                  isCompleted && styles.completedStepCircle,
                ]}
              >
                {isCompleted ? (
                  <MaterialIcons
                    name="check"
                    size={18}
                    color={colors.palette.neutral100}
                  />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.activeStepNumber,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isCompleted) && styles.activeStepLabel,
                ]}
              >
                {step}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })}
    </View>
  )
}
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stepIndicatorContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.separator,
    },
    stepWrapper: {
      flex: 1,
      alignItems: 'center',
      position: 'relative',
    },
    stepTouchable: {
      alignItems: 'center',
    },
    stepLine: {
      position: 'absolute',
      top: 16,
      left: 0,
      right: 0,
      height: 2,
    },
    line: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '100%',
      backgroundColor: theme.colors.separator,
    },
    completedLine: {
      backgroundColor: theme.colors.palette.primary500,
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.separator,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    activeStepCircle: {
      borderColor: theme.colors.palette.primary500,
      backgroundColor: theme.colors.palette.primary500,
    },
    completedStepCircle: {
      backgroundColor: theme.colors.palette.primary500,
      borderColor: theme.colors.palette.primary500,
    },
    stepNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    activeStepNumber: {
      color: theme.colors.palette.neutral100,
    },
    stepLabel: {
      fontSize: 13,
      color: theme.colors.textDim,
      textAlign: 'center',
    },
    activeStepLabel: {
      color: theme.colors.palette.primary500,
      fontWeight: '500',
    },
  })

export default StepIndicator
