// Copyright (c) Meta Platforms, Inc. and affiliates.
import {
  types,
  flow,
  Instance,
  cast,
  getRoot,
  getSnapshot,
} from 'mobx-state-tree'
import { queries as videoQueries } from '@/db/queries'
import { withSetPropAction } from './helpers/withSetPropAction'

export const CommentModel = types.model('Comment', {
  id: types.identifierNumber,
  videoId: types.number,
  userId: types.number,
  content: types.string,
  parentId: types.maybeNull(types.number),
  username: types.string,
  status: types.optional(types.enumeration(['visible', 'hidden']), 'visible'),
  isEdited: types.optional(types.boolean, false),
  replyCount: types.optional(types.number, 0),
  createdAt: types.string,
  updatedAt: types.string,
})

export const EditingCommentModel = types.model('EditingComment', {
  id: types.number,
  content: types.string,
  originalContent: types.string,
})

export const ReplyingToModel = types
  .model('ReplyingTo', {
    commentId: types.number,
    username: types.string,
    content: types.string,
  })

  // Add action to update reply content
  .actions(self => ({
    updateContent: (content: string) => {
      self.content = content
    },
  }))

type CommentInstance = Instance<typeof CommentModel>

export const CommentStoreModel = types
  .model('CommentStore', {
    comments: types.array(CommentModel),
    currentVideoId: types.maybeNull(types.number),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),

    // Runtime state for editing and replying
    editingComment: types.maybeNull(EditingCommentModel),
    replyingTo: types.maybeNull(ReplyingToModel),

    // New comment state
    newComment: types.optional(types.string, ''),
    newCommentFocused: types.optional(types.boolean, false),

    // UI state
    showReplies: types.optional(types.map(types.boolean), {}), // commentId -> boolean
    loadingReplies: types.optional(types.map(types.boolean), {}), // commentId -> boolean
  })
  .views(self => ({
    get topLevelComments(): CommentInstance[] {
      return self.comments.filter(comment => comment.parentId === null)
    },

    getRepliesForComment(commentId: number): CommentInstance[] {
      return self.comments.filter(comment => comment.parentId === commentId)
    },

    getActualReplyCount(commentId: number): number {
      return self.comments.filter(comment => comment.parentId === commentId)
        .length
    },

    getCommentById(commentId: number): CommentInstance | undefined {
      return self.comments.find(comment => comment.id === commentId)
    },

    get isEditingComment(): boolean {
      return self.editingComment !== null
    },

    get isReplyingToComment(): boolean {
      return self.replyingTo !== null
    },

    isShowingReplies(commentId: number): boolean {
      return self.showReplies.get(commentId.toString()) || false
    },

    isLoadingReplies(commentId: number): boolean {
      return self.loadingReplies.get(commentId.toString()) || false
    },

    get commentsForCurrentVideo(): CommentInstance[] {
      if (!self.currentVideoId) return []
      return self.comments.filter(
        comment => comment.videoId === self.currentVideoId,
      )
    },

    get visibleCommentsForCurrentVideo(): CommentInstance[] {
      return self.commentsForCurrentVideo.filter(
        comment => comment.status === 'visible',
      )
    },

    get showRepliesObject(): { [key: number]: boolean } {
      return Object.fromEntries(
        Array.from(self.showReplies.entries()).map(([key, value]) => [
          parseInt(key),
          value,
        ]),
      )
    },
  }))
  .actions(withSetPropAction)
  .actions(self => {
    const setError = (err: any) => {
      self.error = err instanceof Error ? err.message : String(err)
    }

    const clearError = () => {
      self.error = null
    }

    // Load comments for a specific video
    const loadCommentsForVideo = flow(function* (videoId: number) {
      try {
        self.isLoading = true
        self.currentVideoId = videoId
        clearError()

        const allComments = yield videoQueries.getCommentsForVideo(videoId)

        // Validate database response
        if (!allComments || !Array.isArray(allComments)) {
          throw new Error(
            `Failed to load comments for video ${videoId} - response is null or not an array`,
          )
        }

        // Filter and validate comments before adding to store
        const validComments = allComments.filter((comment: any) => {
          const hasRequiredFields =
            comment.id &&
            comment.videoId &&
            comment.userId &&
            comment.content !== undefined &&
            comment.username &&
            comment.createdAt &&
            comment.updatedAt
          if (!hasRequiredFields) {
            console.warn('Skipping invalid comment:', comment)
          }
          return hasRequiredFields
        })

        self.comments.replace(cast(validComments))
        console.log(
          `CommentStore: Successfully loaded ${validComments.length} comments for video ${videoId}`,
        )

        // Auto-expand replies for comments that have them (optional UX improvement)
        // This makes replies immediately available without additional loading
      } catch (e) {
        console.error('CommentStore: loadCommentsForVideo failed:', e)
        setError(e)
        throw e // Propagate error to restore method
      } finally {
        self.isLoading = false
      }
    })

    // Load replies for a specific comment (now mostly a no-op since replies are pre-loaded)
    const loadRepliesForComment = flow(function* (commentId: number) {
      try {
        self.loadingReplies.set(commentId.toString(), true)
        clearError()

        // Replies are already loaded with the main comments, so just check if they exist
        const existingReplies = self.getRepliesForComment(commentId)

        // If no replies exist, try to fetch them (fallback for edge cases)
        if (existingReplies.length === 0) {
          const replies = yield videoQueries.getRepliesForComment(commentId)

          // Validate and filter replies
          const validReplies = replies.filter((reply: any) => {
            const hasRequiredFields =
              reply.id &&
              reply.videoId &&
              reply.userId &&
              reply.content !== undefined &&
              reply.username &&
              reply.createdAt &&
              reply.updatedAt
            if (!hasRequiredFields) {
              console.warn('Skipping invalid reply:', reply)
            }
            return hasRequiredFields
          })

          validReplies.forEach((reply: any) => {
            if (!self.comments.find(c => c.id === reply.id)) {
              self.comments.push(cast(reply))
            }
          })
        }
      } catch (e) {
        setError(e)
      } finally {
        self.loadingReplies.set(commentId.toString(), false)
      }
    })

    // Add a new comment
    const addComment = flow(function* (videoId: number, content: string) {
      try {
        const rootStore = getRoot(self)
        const user = rootStore.userStore?.user
        if (!user) throw new Error('Must be logged in to comment')

        clearError()
        const newComment = yield videoQueries.addComment({
          videoId,
          userId: user.id,
          content,
          parentId: null,
        })

        self.comments.unshift(cast(newComment))
        clearNewComment() // Clear the new comment state after successful submission
        return newComment
      } catch (e) {
        setError(e)
        throw e
      }
    })

    // Add a reply to a comment
    const addReply = flow(function* (
      videoId: number,
      parentId: number,
      content: string,
    ) {
      try {
        const rootStore = getRoot(self)
        const user = rootStore.userStore?.user
        if (!user) throw new Error('Must be logged in to reply')

        clearError()
        const reply = yield videoQueries.addReply({
          videoId,
          userId: user.id,
          content,
          parentId,
        })

        self.comments.push(cast(reply))

        // No need to manually update replyCount since we use getActualReplyCount
        // which calculates from the actual loaded replies

        // Clear replying state and reset focus
        self.replyingTo = null
        self.newCommentFocused = false

        return reply
      } catch (e) {
        setError(e)
        throw e
      }
    })

    // Start editing a comment
    const startEditingComment = (commentId: number) => {
      const comment = self.getCommentById(commentId)
      if (!comment) return

      const rootStore = getRoot(self)
      const userId = rootStore.userStore?.user?.id

      // Only allow editing own comments
      if (comment.userId !== userId) {
        setError('You can only edit your own comments')
        return
      }

      self.editingComment = {
        id: commentId,
        content: comment.content,
        originalContent: comment.content,
      }
      self.newCommentFocused = false // Reset focus when editing
    }

    // Cancel editing
    const cancelEditingComment = () => {
      self.editingComment = null
      self.newCommentFocused = false // Reset focus when canceling edit
    }

    // Update editing comment content
    const updateEditingContent = (content: string) => {
      if (self.editingComment) {
        self.editingComment.content = content
      }
    }

    // Save edited comment
    const saveEditedComment = flow(function* () {
      if (!self.editingComment) return

      try {
        clearError()
        const result = yield videoQueries.updateCommentContent(
          self.editingComment.id,
          getRoot(self).userStore?.user?.id,
          self.editingComment.content,
        )

        if (result.status) {
          const comment = self.getCommentById(self.editingComment.id)
          if (comment) {
            comment.content = self.editingComment.content
            comment.isEdited = true
          }
          self.editingComment = null
          self.newCommentFocused = false // Reset focus after saving
        } else {
          setError(result.message || 'Failed to update comment')
        }
      } catch (e) {
        setError(e)
      }
    })

    // Start replying to a comment
    const startReplyingToComment = (commentId: number) => {
      const comment = self.getCommentById(commentId)
      if (!comment) return

      self.replyingTo = {
        commentId,
        username: comment.username,
        content: '', // Empty content for new reply
      }
      self.newCommentFocused = false // Reset focus when replying
    }

    // Cancel replying
    const cancelReplying = () => {
      self.replyingTo = null
      self.newCommentFocused = false // Reset focus when canceling reply
    }

    // Update reply content
    const updateReplyContent = (content: string) => {
      if (self.replyingTo) {
        self.replyingTo.updateContent(content)
      }
    }

    // New comment management
    const setNewComment = (content: string) => {
      self.newComment = content
    }

    const setNewCommentFocused = (focused: boolean) => {
      self.newCommentFocused = focused
    }

    const clearNewComment = () => {
      self.newComment = ''
      self.newCommentFocused = false
    }

    // Delete a comment
    const deleteComment = flow(function* (commentId: number) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Must be logged in')

        clearError()
        const result = yield videoQueries.deleteComment(commentId, userId)

        if (result.status) {
          // Remove comment and its replies from store
          // Use getSnapshot to safely access properties before replace
          // This avoids accessing detached nodes during the replace operation
          const snapshot = getSnapshot(self.comments)
          const commentsToKeep = snapshot.filter(
            (c: any) => c.id !== commentId && c.parentId !== commentId,
          )
          self.comments.replace(cast(commentsToKeep))

          // Reset focus after deletion
          self.newCommentFocused = false

          // No need to manually update replyCount since we use getActualReplyCount
          // which calculates from the actual loaded replies
        } else {
          setError(result.message || 'Failed to delete comment')
        }
      } catch (e) {
        setError(e)
      }
    })

    // Set comment status (for moderation)
    const setCommentStatus = flow(function* (
      commentId: number,
      status: 'visible' | 'hidden',
    ) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Must be logged in')

        clearError()
        const result = yield videoQueries.setCommentStatus(
          commentId,
          userId,
          status,
        )

        if (result.status) {
          const comment = self.getCommentById(commentId)
          if (comment) {
            comment.status = status
          }
        } else {
          setError(result.message || 'Failed to update comment status')
        }
      } catch (e) {
        setError(e)
      }
    })

    // Toggle replies visibility
    const toggleRepliesVisibility = flow(function* (commentId: number) {
      const isShowing = self.isShowingReplies(commentId)

      if (!isShowing) {
        // Replies should already be loaded, but fallback to loading if needed
        const existingReplies = self.getRepliesForComment(commentId)
        if (existingReplies.length === 0) {
          yield loadRepliesForComment(commentId)
        }
        self.showReplies.set(commentId.toString(), true)
      } else {
        self.showReplies.set(commentId.toString(), false)
      }
    })

    // Clear all comments (useful for logout or switching videos)
    const clearComments = () => {
      self.comments.clear()
      self.currentVideoId = null
      self.editingComment = null
      self.replyingTo = null
      self.showReplies.clear()
      self.loadingReplies.clear()
      clearNewComment() // Clear new comment state
      clearError()
    }

    // Set comments enabled for video (video owner only)
    const setCommentsEnabled = flow(function* (
      videoId: number,
      enabled: boolean,
    ) {
      try {
        const rootStore = getRoot(self)
        const userId = rootStore.userStore?.user?.id
        if (!userId) throw new Error('Must be logged in')

        clearError()
        const result = yield videoQueries.setCommentsEnabled(
          videoId,
          userId,
          enabled,
        )

        if (!result.status) {
          setError(result.message || 'Failed to update comments setting')
        }

        return result
      } catch (e) {
        setError(e)
        throw e
      }
    })

    // Test helper action (only for testing)
    const _addTestComment = (comment: any) => {
      self.comments.push(cast(comment))
    }

    return {
      // Loading and data management
      loadCommentsForVideo,
      loadRepliesForComment,
      clearComments,

      // Comment operations
      addComment,
      addReply,
      deleteComment,
      setCommentStatus,
      setCommentsEnabled,

      // Editing operations
      startEditingComment,
      cancelEditingComment,
      updateEditingContent,
      saveEditedComment,

      // Reply operations
      startReplyingToComment,
      cancelReplying,
      updateReplyContent,

      // New comment operations
      setNewComment,
      setNewCommentFocused,
      clearNewComment,

      // UI operations
      toggleRepliesVisibility,

      // Utility
      clearError,

      // Test helpers (only for testing)
      _addTestComment,
      _setShowReplies: (commentId: string, visible: boolean) => {
        self.showReplies.set(commentId, visible)
      },
      _setReplyingTo: (replyingTo: any) => {
        self.replyingTo = replyingTo
      },
      _setEditingComment: (editingComment: any) => {
        self.editingComment = editingComment
      },

      // Internal self-management restore - handles both volatile state and data reloading
      restore: flow(function* (data: any) {
        try {
          console.log(
            'CommentStore: Starting internal self-managed restoration',
            data,
          )

          // Phase 1: Restore volatile state immediately
          if (data.currentVideoId !== undefined) {
            self.currentVideoId = data.currentVideoId
          }

          if (data.editingComment) {
            self.editingComment = cast(data.editingComment)
          }

          if (data.replyingTo) {
            self.replyingTo = cast(data.replyingTo)
          }

          if (data.showReplies) {
            self.showReplies.replace(cast(data.showReplies))
          }

          if (data.loadingReplies) {
            self.loadingReplies.replace(cast(data.loadingReplies))
          }
          if (data.newComment) {
            self.newComment = data.newComment || ''
          }
          if (data.newCommentFocused) {
            self.newCommentFocused = data.newCommentFocused || false
          }

          console.log(
            'CommentStore: Volatile state restored, loading comments from DB',
          )

          // Phase 2: Reload comments for current video if needed
          if (data.currentVideoId) {
            yield loadCommentsForVideo(data.currentVideoId)
          }

          console.log('CommentStore: Restoration completed successfully')
        } catch (error) {
          console.error('CommentStore: Restoration failed:', error)
          clearComments()
          throw error
        }
      }),
    }
  })

export type ICommentStore = Instance<typeof CommentStoreModel>

export const createCommentStore = () =>
  CommentStoreModel.create({
    comments: [],
    currentVideoId: null,
    isLoading: false,
    error: null,
    editingComment: null,
    replyingTo: null,
    newComment: '',
    newCommentFocused: false,
    showReplies: {},
    loadingReplies: {},
  })
