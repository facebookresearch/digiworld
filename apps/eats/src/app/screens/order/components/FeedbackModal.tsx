import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { Button, Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useState } from 'react'
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface FeedbackModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    foodRating: number
    deliveryRating: number
    comment: string
  }) => void
  loading?: boolean
  orderId?: number
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loading,
  orderId,
}) => {
  const [foodRating, setFoodRating] = useState(0)
  const [deliveryRating, setDeliveryRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showHelper, setShowHelper] = useState(false)
  const { trackClick, trackContentChange } = useInteractionTracking(
    'OrderTracking',
    '/screens/order/order-tracking',
  )
  const { theme } = useTheme()
  const colors = theme.colors

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFoodRating(0)
      setDeliveryRating(0)
      setComment('')
      setShowHelper(false)
    }
  }, [visible])

  const isFormValid =
    foodRating > 0 && deliveryRating > 0 && comment.trim().length > 0

  const renderStars = (rating: number, setRating: (n: number) => void) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity
          key={i}
          onPress={() => {
            setRating(i)
            trackContentChange({
              action: 'rating_changed',
              rating: i,
              orderId,
              timestamp: Date.now(),
            })
          }}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={36}
            color={colors.palette.primary500}
            style={styles.starIcon}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  const handleButtonPress = () => {
    if (!isFormValid) {
      setShowHelper(true)
      trackContentChange({
        action: 'invalid_feedback_submission',
        orderId,
        timestamp: Date.now(),
      })
      return
    }

    setShowHelper(false)
    trackClick('submitFeedback')
    onSubmit({ foodRating, deliveryRating, comment })
  }

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.palette.overlay50,
    },
    keyboardAvoiding: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    modal: {
      width: '100%',
      height: SCREEN_HEIGHT * 0.6,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 16,
      backgroundColor: colors.palette.neutral100,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      position: 'relative',
    },
    topBarHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.palette.neutral300,
      alignSelf: 'center',
      marginBottom: 8,
    },
    closeIcon: {
      position: 'absolute',
      right: 0,
      top: -8,
      padding: 4,
      zIndex: 10,
    },
    title: {
      textAlign: 'center',
      marginBottom: 16,
      color: colors.text,
      fontSize: 24,
    },
    label: {
      marginTop: 16,
      marginBottom: 4,
      color: colors.text,
      fontSize: 16,
    },
    inputBox: { marginBottom: 16 },
    textInput: {
      borderWidth: 1,
      borderColor: colors.palette.neutral200,
      borderRadius: 12,
      padding: 12,
      minHeight: 100,
      color: colors.text,
      backgroundColor: colors.palette.neutral100,
      fontSize: 16,
    },
    buttonContainer: {
      marginTop: 'auto',
      paddingBottom: 8,
      width: '100%',
    },
    submitBtn: {
      borderRadius: 20,
      paddingVertical: 14,
      backgroundColor: colors.palette.primary500,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    helperText: {
      color: colors.palette.primary500,
      textAlign: 'center',
      marginTop: 8,
      fontSize: 14,
    },
    starsContainer: {
      flexDirection: 'row',
      marginTop: 8,
    },
    starIcon: {
      marginHorizontal: 2,
    },
  })

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.keyboardAvoiding}
        >
          <LinearGradient
            colors={[colors.palette.primary100, colors.palette.neutral100]}
            style={styles.modal}
          >
            <View style={styles.topBar}>
              <View style={styles.topBarHandle} />
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={28}
                  color={colors.palette.neutral700}
                />
              </TouchableOpacity>
            </View>
            <Text weight="bold" size="large" style={styles.title}>
              Rate Your Order
            </Text>
            <Text style={styles.label}>Food Rating</Text>
            {renderStars(foodRating, setFoodRating)}
            <Text style={styles.label}>Delivery Partner Rating</Text>
            {renderStars(deliveryRating, setDeliveryRating)}
            <Text style={styles.label}>Comments</Text>
            <View style={styles.inputBox}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add your thoughts here"
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.palette.neutral400}
                textAlignVertical="top"
                maxLength={50}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button style={styles.submitBtn} onPress={handleButtonPress}>
                <Text
                  weight="bold"
                  size="large"
                  style={{ color: colors.palette.neutral100 }}
                >
                  Submit
                </Text>
              </Button>
              {showHelper && !isFormValid && (
                <Text style={styles.helperText}>
                  Please fill all fields to submit your feedback.
                </Text>
              )}
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export default FeedbackModal
