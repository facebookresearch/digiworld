import { createCommentStore } from '../models/CommentStore'

// Mock the database queries
jest.mock('../db/queries', () => ({
  queries: {
    getRepliesForComment: jest.fn().mockResolvedValue([]),
    getCommentsForVideo: jest.fn().mockResolvedValue([]),
    addComment: jest.fn().mockResolvedValue({ id: 1 }),
    addReply: jest.fn().mockResolvedValue({ id: 2 }),
    deleteComment: jest.fn().mockResolvedValue({ status: true }),
    setCommentStatus: jest.fn().mockResolvedValue({ status: true }),
    updateCommentContent: jest.fn().mockResolvedValue({ status: true }),
  },
}))

describe('CommentStore', () => {
  let commentStore: any

  beforeEach(() => {
    commentStore = createCommentStore()
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      expect(commentStore.comments.length).toBe(0)
      expect(commentStore.currentVideoId).toBeNull()
      expect(commentStore.isLoading).toBe(false)
      expect(commentStore.error).toBeNull()
      expect(commentStore.editingComment).toBeNull()
      expect(commentStore.replyingTo).toBeNull()
    })
  })

  describe('views', () => {
    beforeEach(() => {
      // Add some test comments using the test helper action
      commentStore._addTestComment({
        id: 1,
        videoId: 1,
        userId: 1,
        content: 'Top level comment',
        parentId: null,
        username: 'user1',
        status: 'visible',
        isEdited: false,
        replyCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      commentStore._addTestComment({
        id: 2,
        videoId: 1,
        userId: 2,
        content: 'Reply to comment 1',
        parentId: 1,
        username: 'user2',
        status: 'visible',
        isEdited: false,
        replyCount: 0,
        createdAt: '2024-01-01T01:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z',
      })

      commentStore._addTestComment({
        id: 3,
        videoId: 1,
        userId: 3,
        content: 'Another reply to comment 1',
        parentId: 1,
        username: 'user3',
        status: 'hidden',
        isEdited: true,
        replyCount: 0,
        createdAt: '2024-01-01T02:00:00Z',
        updatedAt: '2024-01-01T02:00:00Z',
      })

      commentStore.setProp('currentVideoId', 1)
    })

    it('should return top level comments', () => {
      const topLevel = commentStore.topLevelComments
      expect(topLevel.length).toBe(1)
      expect(topLevel[0].id).toBe(1)
      expect(topLevel[0].parentId).toBeNull()
    })

    it('should return replies for a comment', () => {
      const replies = commentStore.getRepliesForComment(1)
      expect(replies.length).toBe(2)
      expect(replies[0].parentId).toBe(1)
      expect(replies[1].parentId).toBe(1)
    })

    it('should return actual reply count', () => {
      const actualCount = commentStore.getActualReplyCount(1)
      expect(actualCount).toBe(2) // Should match the actual number of replies loaded
    })

    it('should find comment by id', () => {
      const comment = commentStore.getCommentById(2)
      expect(comment).toBeDefined()
      expect(comment.content).toBe('Reply to comment 1')
    })

    it('should return comments for current video', () => {
      const videoComments = commentStore.commentsForCurrentVideo
      expect(videoComments.length).toBe(3)
      expect(videoComments.every((c: any) => c.videoId === 1)).toBe(true)
    })

    it('should return only visible comments for current video', () => {
      const visibleComments = commentStore.visibleCommentsForCurrentVideo
      expect(visibleComments.length).toBe(2)
      expect(visibleComments.every((c: any) => c.status === 'visible')).toBe(
        true,
      )
    })

    it('should track editing state', () => {
      expect(commentStore.isEditingComment).toBe(false)

      commentStore._setEditingComment({
        id: 1,
        content: 'Editing...',
        originalContent: 'Original content',
      })

      expect(commentStore.isEditingComment).toBe(true)
    })

    it('should track replying state', () => {
      expect(commentStore.isReplyingToComment).toBe(false)

      commentStore._setReplyingTo({
        commentId: 1,
        username: 'user1',
        content: 'Original comment',
      })

      expect(commentStore.isReplyingToComment).toBe(true)
    })

    it('should convert showReplies map to object', () => {
      commentStore._setShowReplies('1', true)
      commentStore._setShowReplies('2', false)

      const repliesObject = commentStore.showRepliesObject
      expect(repliesObject[1]).toBe(true)
      expect(repliesObject[2]).toBe(false)
    })
  })

  describe('actions', () => {
    it('should start editing a comment', () => {
      // Add a comment first using test helper
      commentStore._addTestComment({
        id: 1,
        videoId: 1,
        userId: 1,
        content: 'Test comment',
        parentId: null,
        username: 'user1',
        status: 'visible',
        isEdited: false,
        replyCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      // Mock root store with user
      const mockRootStore = {
        userStore: {
          user: { id: 1 },
        },
      }

      // Mock getRoot to return our mock root store
      const originalGetRoot = require('mobx-state-tree').getRoot
      require('mobx-state-tree').getRoot = jest.fn(() => mockRootStore)

      commentStore.startEditingComment(1)

      expect(commentStore.editingComment).toBeDefined()
      expect(commentStore.editingComment.id).toBe(1)
      expect(commentStore.editingComment.content).toBe('Test comment')
      expect(commentStore.editingComment.originalContent).toBe('Test comment')

      // Restore original getRoot
      require('mobx-state-tree').getRoot = originalGetRoot
    })

    it('should cancel editing', () => {
      commentStore._setEditingComment({
        id: 1,
        content: 'Editing...',
        originalContent: 'Original',
      })

      commentStore.cancelEditingComment()
      expect(commentStore.editingComment).toBeNull()
    })

    it('should update editing content', () => {
      commentStore._setEditingComment({
        id: 1,
        content: 'Original',
        originalContent: 'Original',
      })

      commentStore.updateEditingContent('Updated content')
      expect(commentStore.editingComment.content).toBe('Updated content')
    })

    it('should start replying to a comment', () => {
      commentStore._addTestComment({
        id: 1,
        videoId: 1,
        userId: 1,
        content: 'Original comment',
        parentId: null,
        username: 'user1',
        status: 'visible',
        isEdited: false,
        replyCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      commentStore.startReplyingToComment(1)

      expect(commentStore.replyingTo).toBeDefined()
      expect(commentStore.replyingTo.commentId).toBe(1)
      expect(commentStore.replyingTo.username).toBe('user1')
      expect(commentStore.replyingTo.content).toBe('') // Changed: now empty for new reply
    })

    it('should cancel replying', () => {
      commentStore._setReplyingTo({
        commentId: 1,
        username: 'user1',
        content: 'Original',
      })

      commentStore.cancelReplying()
      expect(commentStore.replyingTo).toBeNull()
    })

    it('should update reply content', () => {
      // First add a comment to reply to
      commentStore._addTestComment({
        id: 1,
        videoId: 1,
        userId: 1,
        content: 'Original comment',
        parentId: null,
        username: 'user1',
        status: 'visible',
        isEdited: false,
        replyCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      // Start replying to set up the replyingTo state
      commentStore.startReplyingToComment(1)

      // Now update the reply content
      commentStore.updateReplyContent('Updated reply content')
      expect(commentStore.replyingTo.content).toBe('Updated reply content')
    })

    it('should toggle replies visibility', async () => {
      expect(commentStore.isShowingReplies(1)).toBe(false)

      await commentStore.toggleRepliesVisibility(1)
      expect(commentStore.isShowingReplies(1)).toBe(true)

      await commentStore.toggleRepliesVisibility(1)
      expect(commentStore.isShowingReplies(1)).toBe(false)
    })

    it('should clear all comments', () => {
      commentStore._addTestComment({
        id: 1,
        videoId: 1,
        userId: 1,
        content: 'Test',
        parentId: null,
        username: 'user1',
        status: 'visible',
        isEdited: false,
        replyCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      commentStore.setProp('currentVideoId', 1)
      commentStore._setEditingComment({
        id: 1,
        content: 'test',
        originalContent: 'test',
      })
      commentStore._setReplyingTo({
        commentId: 1,
        username: 'user',
        content: 'test',
      })

      // Set some replies visibility to test that it's preserved
      commentStore._setShowReplies('1', true)

      commentStore.clearComments()

      expect(commentStore.comments.length).toBe(0)
      expect(commentStore.currentVideoId).toBeNull()
      expect(commentStore.editingComment).toBeNull()
      expect(commentStore.replyingTo).toBeNull()
      expect(commentStore.isShowingReplies(1)).toBe(false)
    })

    it('should clear error', () => {
      commentStore.setProp('error', 'Test error')
      commentStore.clearError()
      expect(commentStore.error).toBeNull()
    })
  })
})
