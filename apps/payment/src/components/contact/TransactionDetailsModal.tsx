import { Text } from '@/components'
import { Transaction } from '@/models/types'
import { metrics, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback } from 'react'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'

interface TransactionDetailsModalProps {
  visible: boolean
  onClose: () => void
  transaction: Transaction | null
}

export const TransactionDetailsModal = ({
  visible,
  onClose,
  transaction,
}: TransactionDetailsModalProps) => {
  const { theme } = useAppTheme()
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  const formatTime = useCallback((date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: theme.colors.palette.success100,
          text: theme.colors.palette.success500,
          icon: 'checkmark-circle',
        }
      case 'failed':
        return {
          bg: theme.colors.palette.angry400,
          text: theme.colors.palette.angry500,
          icon: 'close-circle',
        }
      case 'pending':
        return {
          bg: theme.colors.palette.accent400,
          text: theme.colors.palette.accent500,
          icon: 'time',
        }
      default:
        return {
          bg: theme.colors.palette.neutral200,
          text: theme.colors.palette.neutral500,
          icon: 'help-circle',
        }
    }
  }, [])

  if (!transaction) return null

  const styles = createStyles(theme)
  const isOutgoing = transaction.type === 'transfer'
  const statusTheme = getStatusColor(transaction.status)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[
              theme.colors.palette.primary400,
              theme.colors.palette.secondary400,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.palette.neutral100}
                />
              </TouchableOpacity>
              <Text
                text="Transaction Details"
                style={styles.headerTitle}
                weight="bold"
              />
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.statusSection}>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={statusTheme.icon as any}
                  size={24}
                  color={statusTheme.text}
                />
                <Text
                  text={transaction.status}
                  style={[styles.statusText, { color: statusTheme.text }]}
                  weight="medium"
                />
              </View>
            </View>

            <View style={styles.amountSection}>
              <LinearGradient
                colors={
                  isOutgoing
                    ? [
                        theme.colors.palette.primary400,
                        theme.colors.palette.primary500,
                      ]
                    : [
                        theme.colors.palette.secondary400,
                        theme.colors.palette.secondary500,
                      ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.amountContainer}
              >
                <Text
                  text={`${transaction.amount} ${transaction.currency}`}
                  style={styles.amountText}
                  weight="bold"
                />
                <Text
                  text={
                    isOutgoing
                      ? `Sent ${transaction.status}`
                      : `Received ${transaction.status}`
                  }
                  style={styles.typeText}
                />
              </LinearGradient>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text text="Date" style={styles.detailLabel} />
                <Text
                  text={formatDate(transaction.createdAt)}
                  style={styles.detailValue}
                />
              </View>

              <View style={styles.detailRow}>
                <Text text="Time" style={styles.detailLabel} />
                <Text
                  text={formatTime(transaction.createdAt)}
                  style={styles.detailValue}
                />
              </View>

              <View style={styles.detailRow}>
                <Text text="Transaction ID" style={styles.detailLabel} />
                <Text text={`#${transaction.id}`} style={styles.detailValue} />
              </View>

              {transaction.pinVerified === 1 && (
                <View style={styles.detailRow}>
                  <Text text="PIN Verified" style={styles.detailLabel} />
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={theme.colors.palette.success500}
                    />
                    <Text text="Verified" style={styles.verifiedText} />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.palette.neutral100,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    header: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingVertical: metrics.medium,
      paddingHorizontal: metrics.medium,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      color: theme.colors.palette.neutral100,
      fontSize: 20,
      marginLeft: metrics.medium,
    },
    closeButton: {
      padding: metrics.small,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 16,
    },
    content: {
      padding: metrics.medium,
    },
    amountSection: {
      marginBottom: metrics.large,
    },
    amountContainer: {
      padding: metrics.large,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    amountText: {
      color: theme.colors.palette.neutral100,
      fontSize: 32,
      lineHeight: 40,
      marginVertical: metrics.small,
    },
    typeText: {
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      opacity: 0.9,
    },
    detailsSection: {
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 16,
      padding: metrics.medium,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: metrics.small,
    },
    detailLabel: {
      color: theme.colors.textDim,
      fontSize: 16,
    },
    detailValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    statusSection: {
      alignItems: 'center',
      marginBottom: metrics.medium,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      borderRadius: 16,
      gap: metrics.small,
    },
    statusText: {
      fontSize: 16,
      textTransform: 'capitalize',
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.tiny,
      backgroundColor: theme.colors.palette.success100,
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.tiny,
      borderRadius: 12,
    },
    verifiedText: {
      color: theme.colors.palette.success500,
      fontSize: 14,
      fontWeight: '500',
    },
  })
