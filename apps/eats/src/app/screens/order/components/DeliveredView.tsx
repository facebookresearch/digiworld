import { queries } from '@/db/queries'
import { useStores } from '@/models/helpers/useStores'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Button, Screen, Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import FeedbackModal from './FeedbackModal'

interface DeliveredViewProps {
  onBackPress: () => void
  order: any
  items: any[]
  driver: any
  showFeedbackModal: boolean
  onFeedbackModalChange: (show: boolean) => void
}

const DeliveredView: React.FC<DeliveredViewProps> = observer(
  ({
    onBackPress,
    order,
    items,
    driver,
    showFeedbackModal,
    onFeedbackModalChange,
  }) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const [loading, setLoading] = useState(false)
    const { uiStore, sessionStore } = useStores()
    const { trackClick, trackContentChange } = useInteractionTracking(
      'OrderTracking',
      '/screens/order/order-tracking',
    )
    const { sessionId: urlSessionId } = useLocalSearchParams()
    const [currentSessionId, setCurrentSessionId] = useState<
      string | undefined
    >(urlSessionId as string)
    const { theme } = useTheme()
    const colors = theme.colors

    // Handle deep link session ID
    useEffect(() => {
      if (urlSessionId) {
        setCurrentSessionId(urlSessionId as string)
      }
    }, [urlSessionId])

    // Load feedback data and handle modal state
    useEffect(() => {
      if (order?.id) {
        // First try to get feedback from session
        if (currentSessionId) {
          const session = sessionStore.getSession(currentSessionId)
          const sessionInfo = session?.data as any
          const formData = sessionInfo?.sessionData?.formData || {}

          if (formData.feedback) {
            uiStore.setFeedback(order.id, formData.feedback)
            trackContentChange({
              action: 'feedback_loaded_from_session',
              orderId: order.id,
              hasFeedback: true,
              timestamp: Date.now(),
              sessionData: {
                formData: {
                  feedback: formData.feedback,
                  showFeedbackModal: formData.showFeedbackModal,
                  orderId: order.id,
                },
              },
            })
          }
        }

        // If no feedback in session, try to get from database
        if (!uiStore.feedbacks?.[order.id]) {
          queries.getFeedbackForOrder(order.id).then(fb => {
            uiStore.setFeedback(order.id, fb)
            if (fb) {
              trackContentChange({
                action: 'feedback_loaded_from_db',
                orderId: order.id,
                hasFeedback: true,
                timestamp: Date.now(),
                sessionData: {
                  formData: {
                    feedback: fb,
                    showFeedbackModal: false,
                    orderId: order.id,
                  },
                },
              })
            }
          })
        }
      }
    }, [order?.id, currentSessionId, showFeedbackModal])

    const handleSubmitFeedback = useCallback(
      async ({ foodRating, deliveryRating, comment }: any) => {
        setLoading(true)
        trackClick('submitFeedback')
        trackContentChange({
          action: 'feedback_submission_started',
          orderId: order.id,
          timestamp: Date.now(),
        })

        try {
          const feedback = {
            id: Date.now(),
            orderId: order.id,
            foodRating,
            deliveryRating,
            comment,
            createdAt: new Date().toISOString(),
          }

          await queries.insertFeedback(feedback)
          uiStore.setFeedback(order.id, feedback)

          trackContentChange({
            action: 'feedback_submission_success',
            orderId: order.id,
            timestamp: Date.now(),
          })

          onFeedbackModalChange(false)
        } catch (error) {
          console.error('Error submitting feedback:', error)
          trackContentChange({
            action: 'feedback_submission_error',
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          })
        } finally {
          setLoading(false)
        }
      },
      [
        order.id,
        currentSessionId,
        onFeedbackModalChange,
        trackClick,
        trackContentChange,
      ],
    )

    const handleRatePress = useCallback(() => {
      trackClick('rateOrder')
      onFeedbackModalChange(true)
    }, [onFeedbackModalChange])

    const handleCloseModal = useCallback(() => {
      trackClick('closeFeedbackModal')
      trackContentChange({
        action: 'feedback_modal_closed',
        orderId: order.id,
        timestamp: Date.now(),
      })
      onFeedbackModalChange(false)
    }, [order.id, onFeedbackModalChange])

    const feedback = order?.id ? uiStore.feedbacks?.[order.id] : null

    const renderStars = (rating: number) => (
      <View style={styles.column}>
        {[1, 2, 3, 4, 5].map(i => (
          <Ionicons
            key={i}
            name={i <= rating ? 'star' : 'star-outline'}
            size={20}
            color={colors.palette.primary500}
          />
        ))}
      </View>
    )

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.palette.primary100,
      },
      gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        flexGrow: 1,
        padding: 24,
      },
      contentContainer: {
        flex: 1,
      },
      successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      },
      checkmarkContainer: {
        position: 'relative',
      },
      checkmark: {
        zIndex: 2,
      },
      title: {
        color: colors.palette.neutral900,
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 8,
      },
      orderCard: {
        backgroundColor: colors.palette.neutral100,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        shadowColor: colors.palette.neutral900,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      },
      orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
      },
      orderTitle: {
        marginLeft: 8,
        color: colors.palette.neutral800,
      },
      orderInfo: {
        flex: 1,
      },
      orderMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.palette.neutral200,
      },
      orderMetaText: {
        color: colors.palette.neutral600,
        fontSize: 14,
      },
      itemsContainer: {
        height: 120,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.palette.neutral200,
        borderRadius: 12,
        overflow: 'hidden',
      },
      itemsList: {
        flex: 1,
      },
      itemsListContent: {
        padding: 12,
      },
      itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 4,
      },
      itemInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
      },
      itemName: {
        color: colors.palette.neutral700,
        fontSize: 16,
      },
      itemQuantity: {
        color: colors.palette.neutral500,
        marginLeft: 8,
      },
      itemPrice: {
        color: colors.palette.neutral700,
        fontSize: 16,
      },
      totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.palette.neutral200,
      },
      driverCard: {
        backgroundColor: colors.palette.neutral100,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
      },
      driverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
      },
      driverTitle: {
        marginLeft: 8,
        color: colors.palette.neutral800,
      },
      driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      driverAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.palette.primary500,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
      },
      driverInitials: {
        color: colors.palette.neutral100,
        fontSize: 20,
        fontWeight: 'bold',
      },
      driverDetails: {
        flex: 1,
      },
      driverName: {
        color: colors.palette.neutral800,
        marginBottom: 4,
      },
      driverContact: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
      },
      driverVehicle: {
        color: colors.palette.neutral600,
        marginLeft: 8,
      },
      buttonContainer: {
        padding: 24,
      },
      rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        paddingVertical: 16,
        paddingHorizontal: 32,
      },
      rateIcon: {
        marginRight: 8,
      },
      rateButtonText: {
        color: colors.palette.neutral100,
      },
      backButton: {
        position: 'absolute',
        top: 30,
        left: 16,
        zIndex: 10,
        backgroundColor: colors.palette.primary500,
        borderRadius: 20,
        padding: 6,
        marginRight: 12,
      },
      feedbackBox: {
        backgroundColor: colors.palette.neutral100,
        borderRadius: 24,
        padding: 20,
      },
      starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
      },
      ratingLabel: {
        marginRight: 8,
      },
      feedbackComment: {
        marginTop: 8,
      },
      column: {
        flexDirection: 'row',
      },
    })

    return (
      <Screen style={styles.container}>
        <LinearGradient
          colors={[colors.palette.primary400, colors.palette.primary500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />

        <Button
          style={styles.backButton}
          LeftAccessory={() => (
            <Ionicons
              name="arrow-back"
              color={colors.palette.neutral100}
              size={24}
            />
          )}
          onPress={onBackPress}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            <View style={styles.successContainer}>
              <View style={styles.checkmarkContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={120}
                  color={colors.palette.primary500}
                  style={styles.checkmark}
                />
              </View>
            </View>

            <Text weight="bold" size="xxl" style={styles.title}>
              Order Delivered!
            </Text>

            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Ionicons
                  name="receipt-outline"
                  size={24}
                  color={colors.palette.primary500}
                />
                <Text weight="bold" size="large" style={styles.orderTitle}>
                  Order Details
                </Text>
              </View>

              <View style={styles.orderInfo}>
                <View style={styles.orderMeta}>
                  <Text style={styles.orderMetaText}>{totalItems} items</Text>
                  <Text style={styles.orderMetaText}>
                    {format(new Date(order?.createdAt), 'MMM dd, yyyy')}
                  </Text>
                </View>

                <View style={styles.itemsContainer}>
                  <ScrollView
                    style={styles.itemsList}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.itemsListContent}
                    nestedScrollEnabled={true}
                  >
                    {items.map((item, _index) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.menuName}</Text>
                          <Text style={styles.itemQuantity}>
                            x{item.quantity}
                          </Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          ${(item.menuPrice * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.totalRow}>
                  <Text
                    weight="bold"
                    size="large"
                    style={{ color: colors.text }}
                  >
                    Total
                  </Text>
                  <Text
                    weight="bold"
                    size="large"
                    style={{ color: colors.text }}
                  >
                    ${order?.total?.toFixed(2) ?? '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {driver && (
              <View style={styles.driverCard}>
                <View style={styles.driverHeader}>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={colors.palette.primary500}
                  />
                  <Text weight="bold" size="large" style={styles.driverTitle}>
                    Delivery Partner
                  </Text>
                </View>

                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>
                      {driver.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.driverDetails}>
                    <Text weight="bold" size="medium" style={styles.driverName}>
                      {driver.name}
                    </Text>

                    <View style={styles.driverContact}>
                      <Ionicons
                        name="car-outline"
                        size={16}
                        color={colors.palette.neutral600}
                      />
                      <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Feedback Section */}
            {feedback && (
              <View style={styles.feedbackBox}>
                <Text weight="bold" size="large" style={{ color: colors.text }}>
                  Your Feedback
                </Text>
                <View style={styles.starsContainer}>
                  <Text style={[styles.ratingLabel, { color: colors.text }]}>
                    Food Rating:
                  </Text>
                  {renderStars(feedback.foodRating)}
                </View>
                <View style={styles.starsContainer}>
                  <Text style={[styles.ratingLabel, { color: colors.text }]}>
                    Delivery Partner Rating:
                  </Text>
                  {renderStars(feedback.deliveryRating)}
                </View>
                {feedback.comment ? (
                  <Text
                    style={[styles.feedbackComment, { color: colors.text }]}
                  >
                    Comment: {feedback.comment}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Rate Button and Modal */}
        {!feedback && (
          <View style={styles.buttonContainer}>
            <Button
              style={styles.rateButton}
              onPress={handleRatePress}
              gradientColors={[
                colors.palette.primary500,
                colors.palette.primary500,
              ]}
            >
              <Ionicons
                name="star"
                size={24}
                color={colors.palette.neutral100}
                style={styles.rateIcon}
              />
              <Text weight="bold" size="large" style={styles.rateButtonText}>
                Rate Your Experience
              </Text>
            </Button>
          </View>
        )}
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={handleCloseModal}
          onSubmit={handleSubmitFeedback}
          loading={loading}
          orderId={order.id}
        />
      </Screen>
    )
  },
)

export default DeliveredView
