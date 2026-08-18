import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { colors } from '@andojo/shared-theme'
import { useStores } from '@/models'

interface AddReplyProps {
  reviewId: number
  productId: number
  onSuccess: () => void
  onCancel: () => void
}

export const AddReply = function AddReply({
  reviewId,
  productId,
  onSuccess,
  onCancel,
}: AddReplyProps) {
  const { reviewStore, userStore } = useStores()
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim() || !userStore.currentUser) return

    setIsSubmitting(true)
    try {
      await reviewStore.addReply(reviewId, {
        productId,
        userId: userStore.currentUser.id,
        userName: `${userStore.currentUser.firstName} ${userStore.currentUser.lastName}`,
        userAvatar: userStore.currentUser.profilePicture || '',
        comment: comment.trim(),
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to add reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={{ marginTop: 8, marginBottom: 16 }}>
      <TextInput
        style={{
          backgroundColor: colors.palette.neutral200,
          borderRadius: 8,
          padding: 12,
          minHeight: 80,
          color: colors.text,
          marginBottom: 8,
        }}
        placeholder="Write your reply..."
        placeholderTextColor={colors.textDim}
        multiline
        value={comment}
        onChangeText={setComment}
        editable={!isSubmitting}
      />
      <View
        style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}
      >
        <Pressable
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: colors.palette.neutral300,
          }}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: colors.palette.accent500,
            opacity: !comment.trim() || isSubmitting ? 0.5 : 1,
          }}
          onPress={handleSubmit}
          disabled={!comment.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.palette.neutral100} />
          ) : (
            <Text
              style={{ color: colors.palette.neutral100, fontWeight: '600' }}
            >
              Reply
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}
