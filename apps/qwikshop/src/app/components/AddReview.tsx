// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useAppTheme, type Theme, spacing } from '@andojo/shared-theme'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'

interface AddReviewProps {
  productId: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const AddReview = observer(
  ({ productId, onSuccess, onCancel }: AddReviewProps) => {
    const { reviewStore, userStore } = useStores()
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    const { title, comment, rating } = reviewStore
    const [isSubmitting, setIsSubmitting] = useState(false)
    const titleInputRef = React.useRef<TextInput>(null)
    const commentInputRef = React.useRef<TextInput>(null)

    const handleSubmit = async () => {
      if (!userStore.user || !comment.trim()) return

      setIsSubmitting(true)
      try {
        await reviewStore.addReview({
          productId,
          userId: userStore.user.id,
          userName:
            userStore.user.firstName && userStore.user.lastName
              ? `${userStore.user.firstName} ${userStore.user.lastName}`
              : 'Anonymous',
          userAvatar: userStore.user.profilePicture || undefined,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
          isVerifiedPurchase: false,
        })

        onSuccess?.()
      } catch (error) {
        console.error('Failed to add review:', error)
      } finally {
        setIsSubmitting(false)
      }
    }

    useEffect(() => {
      const focusedField = reviewStore.focusedField
      if (focusedField) {
        const inputRef =
          focusedField === 'title' ? titleInputRef : commentInputRef
        inputRef.current?.focus()
      }
    }, [reviewStore.focusedField])

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Write a Review</Text>

        {/* Rating Selection */}
        <View style={styles.ratingContainer}>
          <Text style={styles.label}>Rating:</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => reviewStore.setReviewInput({ rating: star })}
                style={styles.starButton}
              >
                <MaterialIcons
                  name={star <= rating ? 'star' : 'star-border'}
                  size={32}
                  color={
                    star <= rating
                      ? theme.colors.palette.accent500
                      : theme.colors.palette.neutral400
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Review Title (optional)"
          value={title}
          onChangeText={text => reviewStore.setReviewInput({ title: text })}
          maxLength={100}
          placeholderTextColor={theme.colors.textDim}
          onFocus={() => reviewStore.setFocusedField('title')}
          ref={titleInputRef}
        />

        {/* Comment Input */}
        <TextInput
          style={styles.commentInput}
          placeholder="Write your review here..."
          value={comment}
          onChangeText={text => reviewStore.setReviewInput({ comment: text })}
          multiline
          maxLength={1000}
          placeholderTextColor={theme.colors.textDim}
          onFocus={() => reviewStore.setFocusedField('comment')}
          ref={commentInputRef}
        />

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              styles.submitButton,
              (!comment.trim() || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Text>
          </Pressable>
        </View>
      </View>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    ratingContainer: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    starButton: {
      padding: spacing.xs,
      marginRight: spacing.xs,
    },
    titleInput: {
      borderWidth: 1,
      borderColor: theme.colors.separator,
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.md,
      color: theme.colors.text,
      fontSize: 16,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: theme.colors.separator,
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.md,
      minHeight: 120,
      textAlignVertical: 'top',
      color: theme.colors.text,
      fontSize: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    submitButton: {
      backgroundColor: theme.colors.palette.accent500,
    },
    cancelButton: {
      backgroundColor: theme.colors.palette.neutral200,
    },
    submitButtonText: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.palette.neutral600,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  })
