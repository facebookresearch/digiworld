// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  ListRenderItem,
  ScrollView,
} from 'react-native'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'expo-router'

import { CommentItem } from './CommentItem'
import { CommentInput, CommentInputRef } from './CommentInput'
import { EmptyCommentsState } from './EmptyCommentsState'
import { FancyAlert } from './FancyAlert'
import { useStores } from '@/models/helpers/useStores'

interface Comment {
  id: number
  userId: number
  username: string
  content: string
  status: 'visible' | 'hidden'
  parentId: number | null
  createdAt: string
  isEdited: boolean
  replyCount: number
  replies?: Comment[]
}

interface CommentSectionProps {
  videoId: number
  isCommentsEnabled: boolean
  isModerating?: boolean
  isVideoOwner?: boolean
  useTextActions?: boolean // true for text-based actions, false for icon-based
  renderAsScrollableContent?: boolean // true to render as Views instead of FlatList
}

export const CommentSection = observer(function CommentSection({
  videoId,
  isCommentsEnabled,
  isModerating = false,
  isVideoOwner = false,
  useTextActions = true, // Default to text-based actions
  renderAsScrollableContent = false,
}: CommentSectionProps) {
  const { theme } = useTheme()
  const { userStore, commentStore, uiStore } = useStores()
  const router = useRouter()
  const toast = useToast()
  const scrollViewRef = useRef<ScrollView>(null)
  const flatListRef = useRef<FlatList>(null)
  const commentRefs = useRef<{ [key: number]: View | null }>({})
  const commentInputRef = useRef<CommentInputRef>(null)

  useEffect(() => {
    if (isCommentsEnabled || isModerating) {
      loadComments()
    }
    // Reset comment section state on unmount
    return () => {
      commentStore.clearComments()
      uiStore.resetDialogs()
    }
  }, [videoId]) // Remove isCommentsEnabled and isModerating from deps

  const loadComments = useCallback(async () => {
    try {
      await commentStore.loadCommentsForVideo(videoId)
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }, [videoId, commentStore])

  const loadReplies = useCallback(
    async (commentId: number) => {
      try {
        await commentStore.loadRepliesForComment(commentId)
      } catch (error) {
        console.error('Failed to load replies:', error)
      }
    },
    [commentStore],
  )

  const handleAddComment = useCallback(async () => {
    if (!userStore.isAuthenticated) {
      toast.show({
        preset: 'error',
        title: 'You need to login to add a comment',
        placement: 'top',
      })
      return
    }

    if (!commentStore.newComment.trim()) return

    try {
      await commentStore.addComment(videoId, commentStore.newComment.trim())

      // Auto-scroll to the new comment after a short delay
      setTimeout(() => {
        if (renderAsScrollableContent && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true })
        } else if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true })
        }
      }, 100)
    } catch (error) {
      toast.show({
        preset: 'error',
        title: 'Failed to add comment',
        placement: 'top',
      })
    }
  }, [
    userStore.isAuthenticated,
    commentStore.newComment,
    commentStore,
    videoId,
    renderAsScrollableContent,
    toast,
  ])

  const handleAddReply = useCallback(
    async (parentId: number) => {
      if (!userStore.isAuthenticated) {
        toast.show({
          preset: 'error',
          title: 'You need to login to reply to a comment',
          placement: 'top',
        })
        return
      }

      if (!commentStore.replyingTo) return

      try {
        await commentStore.addReply(
          videoId,
          parentId,
          commentStore.replyingTo.content,
        )
        commentStore.cancelReplying()

        // Ensure replies are visible for the parent comment
        if (!commentStore.isShowingReplies(parentId)) {
          await commentStore.toggleRepliesVisibility(parentId)
        }

        // Auto-scroll to the parent comment after adding reply
        setTimeout(() => {
          const commentIndex = commentStore.topLevelComments.findIndex(
            c => c.id === parentId,
          )
          if (commentIndex !== -1) {
            if (renderAsScrollableContent && commentRefs.current[parentId]) {
              commentRefs.current[parentId]?.measureInWindow((x, y) => {
                scrollViewRef.current?.scrollTo({ y: y - 100, animated: true })
              })
            } else if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: commentIndex,
                animated: true,
                viewPosition: 0.3,
              })
            }
          }
        }, 100)
      } catch (error) {
        toast.show({
          preset: 'error',
          title: 'Failed to add reply',
          placement: 'top',
        })
      }
    },
    [
      userStore.isAuthenticated,
      commentStore,
      videoId,
      loadReplies,
      router,
      renderAsScrollableContent,
      toast,
    ],
  )

  const handleReplyPress = useCallback(
    (commentId: number) => {
      if (!userStore.isAuthenticated) {
        toast.show({
          preset: 'error',
          title: 'You need to login to reply to a comment',
          placement: 'top',
        })
        return
      }
      commentStore.startReplyingToComment(commentId)

      // Auto-scroll to the comment being replied to
      setTimeout(() => {
        const commentIndex = commentStore.topLevelComments.findIndex(
          c => c.id === commentId,
        )
        if (commentIndex !== -1) {
          if (renderAsScrollableContent && commentRefs.current[commentId]) {
            commentRefs.current[commentId]?.measureInWindow((x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 100, animated: true })
            })
          } else if (flatListRef.current) {
            flatListRef.current.scrollToIndex({
              index: commentIndex,
              animated: true,
              viewPosition: 0.3,
            })
          }
        }
      }, 100)
    },
    [
      userStore.isAuthenticated,
      router,
      commentStore,
      renderAsScrollableContent,
      toast,
    ],
  )

  const handleLoginPrompt = useCallback(() => {
    toast.show({
      preset: 'error',
      title: 'You need to login to add a comment',
      placement: 'top',
    })
  }, [toast])

  const handleCommentInputFocus = useCallback(() => {
    commentStore.setNewCommentFocused(true)
  }, [commentStore])

  const handleHideComment = useCallback(
    async (commentId: number) => {
      if (!isModerating && !isVideoOwner) return

      // Find the comment to determine current status
      const comment = commentStore.getCommentById(commentId)

      if (!comment) return

      // Always show dialog for hide/show actions to prevent accidental changes
      uiStore.showHideCommentDialog(commentId)
    },
    [isVideoOwner, commentStore, uiStore],
  )

  const handleDeleteComment = useCallback(
    async (commentId: number) => {
      // Allow deletion for moderators or users deleting their own comments
      const comment = commentStore.getCommentById(commentId)

      const canDelete =
        isModerating ||
        (userStore.user && comment && comment.userId === userStore.user.id)
      console.log(canDelete)
      if (!canDelete) return

      // Always show dialog for delete actions to prevent accidental deletions
      uiStore.showDeleteCommentDialog(commentId)
    },
    [isModerating, userStore.user, commentStore, uiStore],
  )

  const handleEditComment = useCallback(
    (commentId: number) => {
      commentStore.startEditingComment(commentId)
    },
    [commentStore],
  )

  const handleSaveEdit = useCallback(async () => {
    try {
      await commentStore.saveEditedComment()
    } catch (error) {
      toast.show({
        preset: 'error',
        title: 'Failed to edit comment',
        placement: 'top',
      })
    }
  }, [commentStore, loadComments])

  const handleCancelEdit = useCallback(() => {
    commentStore.cancelEditingComment()
  }, [commentStore])

  const handleToggleReplies = useCallback(
    async (commentId: number) => {
      await commentStore.toggleRepliesVisibility(commentId)
    },
    [commentStore],
  )

  const handleCancelReply = useCallback(() => {
    commentStore.cancelReplying()
  }, [commentStore])

  // Dialog action handlers
  const confirmHideAction = useCallback(async () => {
    if (!uiStore.actionCommentId) return

    const comment = commentStore.getCommentById(uiStore.actionCommentId)
    if (!comment) return

    try {
      const newStatus = comment.status === 'hidden' ? 'visible' : 'hidden'
      await commentStore.setCommentStatus(uiStore.actionCommentId, newStatus)
    } catch (error) {
      toast.show({
        preset: 'error',
        title: 'Failed to update comment visibility',
        placement: 'top',
      })
    }

    uiStore.hideHideCommentDialog()
  }, [uiStore.actionCommentId, commentStore, uiStore])

  const confirmDeleteAction = useCallback(async () => {
    if (!uiStore.actionCommentId) return

    try {
      await commentStore.deleteComment(uiStore.actionCommentId)
    } catch (error) {
      toast.show({
        preset: 'error',
        title: 'Failed to delete comment',
        placement: 'top',
      })
    }

    uiStore.hideDeleteCommentDialog()
  }, [uiStore.actionCommentId, commentStore, uiStore])

  const cancelDialog = useCallback(() => {
    uiStore.hideHideCommentDialog()
    uiStore.hideDeleteCommentDialog()
  }, [uiStore])

  const renderComment: ListRenderItem<Comment> = useCallback(
    ({ item: comment }) => {
      // Get fresh comment data from store to ensure reactivity
      const freshComment = commentStore.getCommentById(comment.id) || comment

      // Get replies from the store (keep as MobX observables)
      const replies = commentStore.getRepliesForComment(comment.id)
      const actualReplyCount = commentStore.getActualReplyCount(comment.id)

      // Create a reactive comment object that preserves MobX observability
      const commentWithReplies = {
        ...freshComment, // Spread the MobX observable to preserve reactivity
        replyCount: actualReplyCount, // Override with actual count
        replies, // Keep replies as MobX observables
      }

      return (
        <CommentItem
          comment={commentWithReplies}
          isModerating={isModerating}
          isVideoOwner={isVideoOwner}
          currentUserId={userStore.user?.id}
          editingComment={commentStore.editingComment?.id || null}
          editText={commentStore.editingComment?.content || ''}
          replyingTo={commentStore.replyingTo?.commentId || null}
          replyText={commentStore.replyingTo?.content || ''}
          showReplies={commentStore.showRepliesObject}
          useTextActions={useTextActions}
          onHideComment={handleHideComment}
          onDeleteComment={handleDeleteComment}
          onEditComment={handleEditComment}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onEditTextChange={commentStore.updateEditingContent}
          onReplyPress={handleReplyPress}
          onReplyTextChange={commentStore.updateReplyContent}
          onAddReply={handleAddReply}
          onCancelReply={handleCancelReply}
          onToggleReplies={handleToggleReplies}
        />
      )
    },
    [
      commentStore,
      isModerating,
      isVideoOwner,
      userStore.user?.id,
      commentStore.editingComment?.id,
      commentStore.editingComment?.content,
      commentStore.replyingTo?.commentId,
      commentStore.replyingTo?.content,
      commentStore.showRepliesObject,
      useTextActions,
      handleHideComment,
      handleDeleteComment,
      handleEditComment,
      handleSaveEdit,
      handleCancelEdit,
      handleReplyPress,
      commentStore.updateReplyContent,
      handleAddReply,
      handleCancelReply,
      handleToggleReplies,
    ],
  )

  const keyExtractor = useCallback((item: any) => item.id.toString(), [])

  const ListHeaderComponent = useCallback(
    () => (
      <View>
        <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
          Comments ({commentStore.topLevelComments.length})
        </Text>
        {!isModerating && (
          <CommentInput
            ref={commentInputRef}
            isAuthenticated={userStore.isAuthenticated}
            userName={userStore.user?.name}
            newComment={commentStore.newComment}
            shouldFocus={commentStore.newCommentFocused}
            onCommentChange={commentStore.setNewComment}
            onSubmitComment={handleAddComment}
            onLoginPrompt={handleLoginPrompt}
            onFocus={handleCommentInputFocus}
          />
        )}
      </View>
    ),
    [
      theme.colors.text,
      commentStore.topLevelComments.length,
      isModerating,
      userStore.isAuthenticated,
      userStore.user?.name,
      commentStore.newComment,
      commentStore.newCommentFocused,
      commentStore.setNewComment,
      handleAddComment,
      handleLoginPrompt,
      handleCommentInputFocus,
    ],
  )

  if (!isCommentsEnabled && !isModerating) {
    return <EmptyCommentsState />
  }

  if (renderAsScrollableContent) {
    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.commentsSection}
        showsVerticalScrollIndicator={false}
      >
        {/* Comments Header */}
        <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
          Comments ({commentStore.topLevelComments.length})
        </Text>
        {!isModerating && (
          <CommentInput
            ref={commentInputRef}
            isAuthenticated={userStore.isAuthenticated}
            userName={userStore.user?.name}
            newComment={commentStore.newComment}
            shouldFocus={commentStore.newCommentFocused}
            onCommentChange={commentStore.setNewComment}
            onSubmitComment={handleAddComment}
            onLoginPrompt={handleLoginPrompt}
            onFocus={handleCommentInputFocus}
          />
        )}

        {/* Render comments as Views */}
        {commentStore.topLevelComments.map(comment => {
          const freshComment =
            commentStore.getCommentById(comment.id) || comment
          const replies = commentStore.getRepliesForComment(comment.id)
          const actualReplyCount = commentStore.getActualReplyCount(comment.id)

          const commentWithReplies = {
            ...freshComment,
            replyCount: actualReplyCount,
            replies,
          }

          return (
            <View
              key={comment.id}
              ref={ref => {
                commentRefs.current[comment.id] = ref
              }}
            >
              <CommentItem
                comment={commentWithReplies}
                isModerating={isModerating}
                isVideoOwner={isVideoOwner}
                currentUserId={userStore.user?.id}
                editingComment={commentStore.editingComment?.id || null}
                editText={commentStore.editingComment?.content || ''}
                replyingTo={commentStore.replyingTo?.commentId || null}
                replyText={commentStore.replyingTo?.content || ''}
                showReplies={commentStore.showRepliesObject}
                useTextActions={useTextActions}
                onHideComment={handleHideComment}
                onDeleteComment={handleDeleteComment}
                onEditComment={handleEditComment}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditTextChange={commentStore.updateEditingContent}
                onReplyPress={handleReplyPress}
                onReplyTextChange={commentStore.updateReplyContent}
                onAddReply={handleAddReply}
                onCancelReply={handleCancelReply}
                onToggleReplies={handleToggleReplies}
              />
            </View>
          )
        })}

        {/* Hide/Show Dialog */}
        <FancyAlert
          visible={uiStore.toggleCommentDialog}
          title={(() => {
            const comment = commentStore.getCommentById(
              uiStore.actionCommentId || 0,
            )
            return comment?.status === 'hidden'
              ? 'Show Comment'
              : 'Hide Comment'
          })()}
          message={(() => {
            const comment = commentStore.getCommentById(
              uiStore.actionCommentId || 0,
            )
            return comment?.status === 'hidden'
              ? 'Are you sure you want to show this comment? It will be visible to all users.'
              : 'Are you sure you want to hide this comment? It will be hidden from other users but the author can still see and delete it.'
          })()}
          preset={(() => {
            const comment = commentStore.getCommentById(
              uiStore.actionCommentId || 0,
            )
            return comment?.status === 'hidden' ? 'success' : 'warning'
          })()}
          confirmText={(() => {
            const comment = commentStore.getCommentById(
              uiStore.actionCommentId || 0,
            )
            return comment?.status === 'hidden' ? 'Show' : 'Hide'
          })()}
          onConfirm={confirmHideAction}
          onClose={cancelDialog}
        />

        {/* Delete Dialog */}
        <FancyAlert
          visible={uiStore.deleteCommentDialogVisible}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          preset="delete"
          confirmText="Delete"
          onConfirm={confirmDeleteAction}
          onClose={cancelDialog}
        />
      </ScrollView>
    )
  }

  return (
    <View style={styles.commentsSection}>
      <FlatList
        ref={flatListRef}
        data={commentStore.topLevelComments}
        renderItem={renderComment}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        nestedScrollEnabled={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        extraData={commentStore.comments.length} // Force re-render when comments change
        onScrollToIndexFailed={info => {
          // Handle scroll to index failure gracefully
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            })
          }, 100)
        }}
      />

      {/* Hide/Show Dialog */}
      <FancyAlert
        visible={uiStore.toggleCommentDialog}
        title={(() => {
          const comment = commentStore.getCommentById(
            uiStore.actionCommentId || 0,
          )
          return comment?.status === 'hidden' ? 'Show Comment' : 'Hide Comment'
        })()}
        message={(() => {
          const comment = commentStore.getCommentById(
            uiStore.actionCommentId || 0,
          )
          return comment?.status === 'hidden'
            ? 'Are you sure you want to show this comment? It will be visible to all users.'
            : 'Are you sure you want to hide this comment? It will be hidden from other users but the author can still see and delete it.'
        })()}
        preset={(() => {
          const comment = commentStore.getCommentById(
            uiStore.actionCommentId || 0,
          )
          return comment?.status === 'hidden' ? 'success' : 'warning'
        })()}
        confirmText={(() => {
          const comment = commentStore.getCommentById(
            uiStore.actionCommentId || 0,
          )
          return comment?.status === 'hidden' ? 'Show' : 'Hide'
        })()}
        onConfirm={confirmHideAction}
        onClose={cancelDialog}
      />

      {/* Delete Dialog */}
      <FancyAlert
        visible={uiStore.deleteCommentDialogVisible}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        preset="delete"
        confirmText="Delete"
        onConfirm={confirmDeleteAction}
        onClose={cancelDialog}
      />
    </View>
  )
})
const styles = StyleSheet.create({
  commentsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
})
