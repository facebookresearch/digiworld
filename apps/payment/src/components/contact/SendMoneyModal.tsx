import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native'
import { Text } from '@/components'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

interface SendMoneyModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  amount: string

  onAmountChange: (amount: string) => void
  dailyLimit?: number | null
  monthlyLimit?: number | null
}

export function SendMoneyModal({
  visible,
  onClose,
  onConfirm,
  amount,
  onAmountChange,
  dailyLimit,
  monthlyLimit,
}: SendMoneyModalProps) {
  const { theme } = useAppTheme()
  const styles = createStyles(theme)
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text
              text="Send Money"
              preset="heading"
              style={styles.modalTitle}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputContainer}>
              <Text text="Amount" size="sm" style={styles.inputLabel} />
              <View style={styles.amountInput}>
                <Text
                  text="$"
                  size="lg"
                  weight="bold"
                  style={styles.currencySymbol}
                />
                <TextInput
                  value={amount}
                  onChangeText={onAmountChange}
                  keyboardType="numeric"
                  placeholder="0.00"
                  style={styles.amountField}
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>
            </View>

            <View style={styles.confirmationText}>
              <Text
                text="Are you sure you want to send"
                size="sm"
                style={styles.confirmationLabel}
              />
              <Text
                text={`$${amount || '0.00'}`}
                size="xl"
                weight="bold"
                style={styles.confirmationAmount}
              />
              <Text
                text="to this contact?"
                size="sm"
                style={styles.confirmationLabel}
              />
            </View>

            {(dailyLimit !== undefined && dailyLimit !== null) ||
            (monthlyLimit !== undefined && monthlyLimit !== null) ? (
              <View style={styles.limitsContainer}>
                <Text
                  text="Transaction Limits"
                  size="sm"
                  weight="medium"
                  style={styles.limitsTitle}
                />
                {dailyLimit !== undefined && dailyLimit !== null && (
                  <View style={styles.limitRow}>
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={theme.colors.textDim}
                    />
                    <Text
                      text={`Daily Limit: $${dailyLimit.toLocaleString(
                        'en-US',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}`}
                      size="xs"
                      style={styles.limitText}
                    />
                  </View>
                )}
                {monthlyLimit !== undefined && monthlyLimit !== null && (
                  <View style={styles.limitRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={theme.colors.textDim}
                    />
                    <Text
                      text={`Monthly Limit: $${monthlyLimit.toLocaleString(
                        'en-US',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}`}
                      size="xs"
                      style={styles.limitText}
                    />
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, styles.modalButton]}
              onPress={onClose}
            >
              <Text text="Cancel" style={styles.cancelButtonText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, styles.modalButton]}
              onPress={onConfirm}
            >
              <LinearGradient
                colors={[
                  theme.colors.palette.primary400,
                  theme.colors.palette.secondary400,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={theme.colors.palette.neutral100}
                />
                <Text text="Confirm" style={styles.sendButtonText} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: metrics.medium,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: metrics.large,
    },
    modalTitle: {
      marginBottom: 0,
    },
    closeButton: {
      padding: metrics.small,
      width: 80,
    },
    modalBody: {
      gap: metrics.large,
    },
    inputContainer: {
      gap: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      padding: metrics.large,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    inputLabel: {
      color: theme.colors.textDim,
    },
    amountInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      paddingHorizontal: metrics.medium,
    },
    currencySymbol: {
      color: theme.colors.textDim,
      marginRight: metrics.small,
    },
    amountField: {
      flex: 1,
      fontSize: 24,
      color: theme.colors.text,
      paddingVertical: metrics.medium,
    },
    confirmationText: {
      alignItems: 'center',
      gap: metrics.tiny,
      backgroundColor: theme.colors.palette.neutral100,
      padding: metrics.large,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmationLabel: {
      color: theme.colors.textDim,
    },
    confirmationAmount: {
      color: theme.colors.palette.primary500,
      fontSize: 32,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: metrics.medium,
      marginTop: metrics.large,
    },
    modalButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      padding: metrics.medium,
    },
    sendButton: {
      flex: 2,
    },
    sendButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: metrics.medium,
      gap: metrics.small,
    },
    sendButtonText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: '600',
    },
    limitsContainer: {
      backgroundColor: theme.colors.palette.neutral100,
      padding: metrics.medium,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.palette.neutral200,
      marginTop: metrics.medium,
      gap: metrics.small,
    },
    limitsTitle: {
      color: theme.colors.text,
      marginBottom: metrics.tiny,
    },
    limitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
    },
    limitText: {
      color: theme.colors.textDim,
    },
  })
