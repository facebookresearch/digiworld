// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Button, Text } from '@andojo/shared-theme'
import { colors } from '@andojo/shared-theme/src/ThemeContext'
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
  onSubmit: (data: { rating: number; comment: string }) => void
  loading?: boolean
  isCancellation?: boolean
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isCancellation = false,
}) => {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showHelper, setShowHelper] = useState(false)

  useEffect(() => {
    if (visible) {
      setRating(0)
      setComment('')
      setShowHelper(false)
    }
  }, [visible])

  const isFormValid = isCancellation ? comment.trim().length > 0 : rating > 0

  const renderStars = (
    currentRating: number,
    setRatingFunc: (n: number) => void,
  ) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => setRatingFunc(i)}>
          <Ionicons
            name={i <= currentRating ? 'star' : 'star-outline'}
            size={36}
            color={colors.palette.primary400}
            style={styles.starIcon}
          />
        </TouchableOpacity>
      ))}
    </View>
  )

  const handleButtonPress = () => {
    if (!isFormValid) {
      setShowHelper(true)
      return
    }
    setShowHelper(false)
    onSubmit({ rating, comment })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'padding' })}
          style={styles.keyboardAvoiding}
        >
          <LinearGradient
            colors={[colors.palette.neutral700, colors.palette.neutral800]}
            style={styles.modal}
          >
            <View style={styles.topBar}>
              <View style={styles.topBarHandle} />
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={28}
                  color={colors.palette.neutral200}
                />
              </TouchableOpacity>
            </View>
            <Text weight="bold" size="large" style={styles.title}>
              {isCancellation ? 'Reason for Cancellation' : 'Rate Your Ride'}
            </Text>
            {!isCancellation && (
              <>
                <Text style={styles.label}>Driver Rating</Text>
                {renderStars(rating, setRating)}
              </>
            )}
            <Text style={styles.label}>
              {isCancellation ? 'Reason' : 'Comments'}
            </Text>
            <View style={styles.inputBox}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={
                  isCancellation
                    ? 'Provide the reason'
                    : 'Add your thoughts here'
                }
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.palette.neutral400}
                textAlignVertical="top"
                maxLength={150}
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
                  {isCancellation
                    ? 'Please provide a reason for cancellation.'
                    : 'Please provide a rating and a comment to submit.'}
                </Text>
              )}
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
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
    height: SCREEN_HEIGHT * 0.5,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
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
    color: colors.palette.neutral100,
    fontSize: 24,
  },
  label: {
    marginTop: 12,
    marginBottom: 12,
    color: colors.palette.neutral200,
    fontSize: 16,
  },
  inputBox: { marginBottom: 16 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.palette.neutral600,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    color: colors.palette.neutral100,
    backgroundColor: colors.palette.neutral700,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    paddingBottom: 8,
    width: '100%',
  },
  submitBtn: {
    borderRadius: 20,
    paddingVertical: 14,
    backgroundColor: colors.palette.primary400,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    color: colors.palette.primary400,
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

export default FeedbackModal
