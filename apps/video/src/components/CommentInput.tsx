// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useStores } from '@/models'

interface CommentInputProps {
  isAuthenticated: boolean
  userName?: string
  newComment: string
  shouldFocus?: boolean
  onCommentChange: (text: string) => void
  onSubmitComment: () => void
  onLoginPrompt: () => void
  onFocus?: () => void
}

export interface CommentInputRef {
  focus: () => void
  blur: () => void
}

export const CommentInput = forwardRef<CommentInputRef, CommentInputProps>(
  (
    {
      isAuthenticated,
      userName,
      newComment,
      onCommentChange,
      onSubmitComment,
      onLoginPrompt,
      onFocus,
    },
    ref,
  ) => {
    const { theme } = useTheme()
    const commentInputRef = useRef<TextInput>(null)
    const { commentStore } = useStores()

    useImperativeHandle(ref, () => ({
      focus: () => commentInputRef.current?.focus(),
      blur: () => commentInputRef.current?.blur(),
    }))

    useEffect(() => {
      if (commentStore.newCommentFocused) {
        const text = commentStore.newComment
        commentInputRef?.current?.setNativeProps({
          selection: {
            start: text.length,
            end: text.length,
          },
        })
        setTimeout(() => {
          if (commentInputRef.current) {
            commentInputRef.current.focus()
          }
        }, 1000)
      }
    }, [commentStore.newCommentFocused])

    const handleInputPress = () => {
      if (!isAuthenticated) {
        onLoginPrompt()
        return
      }
      commentInputRef.current?.focus()
    }

    const handleFocus = () => {
      onFocus?.()
    }
    const onBlur = () => {
      commentStore.setNewCommentFocused(false)
    }

    return (
      <View
        style={[
          styles.addCommentContainer,
          { backgroundColor: theme.colors.palette.neutral300 },
        ]}
      >
        <View style={styles.replyAvatar}>
          <Text style={styles.replyAvatarText}>
            {userName ? userName.charAt(0).toUpperCase() : 'G'}
          </Text>
        </View>
        {isAuthenticated ? (
          <>
            <TextInput
              ref={commentInputRef}
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.colors.palette.neutral400,
                  color: theme.colors.text,
                  borderColor: theme.colors.palette.neutral500,
                },
              ]}
              value={newComment}
              onChangeText={onCommentChange}
              onFocus={handleFocus}
              onBlur={onBlur}
              placeholder="Add a comment..."
              placeholderTextColor={theme.colors.palette.neutral700}
              selection={{
                start: commentStore.newComment.length,
                end: commentStore.newComment.length,
              }}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.submitCommentButton,
                {
                  backgroundColor: newComment.trim()
                    ? theme.colors.palette.primary200
                    : theme.colors.palette.neutral500,
                  opacity: newComment.trim() ? 1 : 0.6,
                },
              ]}
              onPress={onSubmitComment}
              disabled={!newComment.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.loginPromptInput,
              {
                backgroundColor: theme.colors.palette.neutral400,
                borderColor: theme.colors.palette.neutral500,
              },
            ]}
            onPress={handleInputPress}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.loginPromptText,
                { color: theme.colors.palette.neutral700 },
              ]}
            >
              Login to add a comment
            </Text>
            <Ionicons
              name="log-in-outline"
              size={16}
              color={theme.colors.palette.neutral700}
            />
          </TouchableOpacity>
        )}
      </View>
    )
  },
)

const styles = StyleSheet.create({
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(28, 98, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  loginPromptInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  loginPromptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  submitCommentButton: {
    padding: 8,
    borderRadius: 8,
  },
})
