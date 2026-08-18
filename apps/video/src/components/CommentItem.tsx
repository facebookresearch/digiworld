import React from 'react'
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'

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

/**
 * CommentItem renders a single comment with all its interactions
 *
 * Features:
 * - Shows comment content, username, timestamp
 * - Edit/Delete buttons for own comments
 * - Reply functionality (not in moderation mode)
 * - Hide button for video owners
 * - Moderation actions (hide/delete) for moderators
 * - Nested replies rendering via ReplyItem components
 *
 * Reply Structure:
 * Comment
 * ├── Comment Header (avatar, username, actions)
 * ├── Comment Content (or edit input)
 * ├── Comment Actions (reply, edit, view replies)
 * ├── Reply Input (if replying)
 * └── Replies Container
 *     ├── Replies Header (line + count)
 *     └── ReplyItem[] (each reply with same edit/delete functionality)
 */
interface CommentItemProps {
  comment: Comment
  isModerating: boolean
  isVideoOwner: boolean
  currentUserId?: number
  editingComment: number | null
  editText: string
  replyingTo: number | null
  replyText: string
  showReplies: { [key: number]: boolean }
  useTextActions?: boolean // true for text-based actions, false for icon-based
  onHideComment: (commentId: number) => void
  onDeleteComment: (commentId: number) => void
  onEditComment: (commentId: number, content: string) => void
  onSaveEdit: (commentId: number) => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  onReplyPress: (commentId: number) => void
  onReplyTextChange: (text: string) => void
  onAddReply: (parentId: number) => void
  onCancelReply: () => void
  onToggleReplies: (commentId: number) => Promise<void>
}

export const CommentItem: React.FC<CommentItemProps> = observer(
  ({
    comment,
    isModerating,
    isVideoOwner: _isVideoOwner,
    currentUserId,
    editingComment,
    editText,
    replyingTo,
    replyText,
    showReplies,
    useTextActions = true,
    onHideComment,
    onDeleteComment,
    onEditComment,
    onSaveEdit,
    onCancelEdit,
    onEditTextChange,
    onReplyPress,
    onReplyTextChange,
    onAddReply,
    onCancelReply,
    onToggleReplies,
  }) => {
    const { theme } = useTheme()

    // Helper function to format time
    const formatTime = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      )

      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`

      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours}h ago`

      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) return `${diffInDays}d ago`

      return date.toLocaleDateString()
    }

    const isHidden = comment.status === 'hidden'
    const isCommentOwner = currentUserId && comment.userId === currentUserId

    // Helper functions for actions
    const handleHidePress = (commentId: number) => {
      onHideComment(commentId)
    }

    const handleDeletePress = (commentId: number) => {
      onDeleteComment(commentId)
    }

    // Get hide/show icon and color based on current status
    const getHideIcon = (status: 'visible' | 'hidden') => {
      return status === 'hidden' ? 'eye-off-outline' : 'eye-outline'
    }

    const getHideIconColor = (status: 'visible' | 'hidden') => {
      return status === 'hidden'
        ? theme.colors.palette.neutral700
        : theme.colors.palette.primary200
    }

    return (
      <View
        style={[
          styles.commentItem,
          { backgroundColor: theme.colors.palette.neutral300 },
        ]}
      >
        <View style={styles.commentHeader}>
          <View style={styles.channelAvatar}>
            <Text style={styles.channelInitial}>
              {comment.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentInfo}>
            <View style={styles.usernameRow}>
              <Text
                style={[styles.commentUsername, { color: theme.colors.text }]}
              >
                {comment.username}
              </Text>
              {comment.isEdited && (
                <Text
                  style={[
                    styles.editedIndicator,
                    { color: theme.colors.palette.neutral600 },
                  ]}
                >
                  (Edited)
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.commentTime,
                { color: theme.colors.palette.neutral700 },
              ]}
            >
              {formatTime(comment.createdAt)}
            </Text>
          </View>

          {/* Moderation actions */}
          {isModerating && (
            <View style={styles.moderationActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleHidePress(comment.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={getHideIcon(comment.status)}
                  size={16}
                  color={getHideIconColor(comment.status)}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeletePress(comment.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.colors.palette.angry500}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Edit comment input */}
        {editingComment === comment.id ? (
          <View style={styles.editCommentContainer}>
            <TextInput
              style={[
                styles.editCommentInput,
                {
                  backgroundColor: theme.colors.palette.neutral400,
                  color: theme.colors.text,
                  borderColor: theme.colors.palette.neutral500,
                },
              ]}
              value={editText}
              onChangeText={onEditTextChange}
              placeholder="Edit your comment..."
              placeholderTextColor={theme.colors.palette.neutral700}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={onCancelEdit}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.cancelEditText,
                    { color: theme.colors.palette.neutral700 },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveEditButton,
                  {
                    backgroundColor: editText.trim()
                      ? theme.colors.palette.primary200
                      : theme.colors.palette.neutral500,
                    opacity: editText.trim() ? 1 : 0.6,
                  },
                ]}
                onPress={() => onSaveEdit(comment.id)}
                disabled={!editText.trim()}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.saveEditText, { color: theme.colors.text }]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Comment content or hidden message */}
            {isHidden && !isModerating ? (
              <View style={styles.hiddenCommentContent}>
                <Text
                  style={[
                    styles.hiddenCommentText,
                    { color: theme.colors.palette.neutral700 },
                  ]}
                >
                  This comment is hidden by the uploader
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.commentContent, { color: theme.colors.text }]}
              >
                {comment.content}
              </Text>
            )}

            <View style={styles.commentActions}>
              {/* Reply button - only show if not moderating */}
              {!isModerating && (
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => onReplyPress(comment.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.replyButtonText,
                      { color: theme.colors.palette.neutral700 },
                    ]}
                  >
                    Reply
                  </Text>
                </TouchableOpacity>
              )}

              {/* Edit button - only for own comments, not moderating, and not hidden */}
              {!isModerating && !isHidden && isCommentOwner && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onEditComment(comment.id, comment.content)}
                  activeOpacity={0.8}
                >
                  {useTextActions ? (
                    <Text
                      style={[
                        styles.editActionText,
                        { color: theme.colors.palette.neutral700 },
                      ]}
                    >
                      Edit
                    </Text>
                  ) : (
                    <Ionicons
                      name="pencil-outline"
                      size={16}
                      color={theme.colors.palette.neutral700}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* Delete button - only for own comments and not moderating (works for hidden comments too) */}
              {!isModerating && isCommentOwner && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePress(comment.id)}
                  activeOpacity={0.8}
                >
                  {useTextActions ? (
                    <Text
                      style={[
                        styles.deleteActionText,
                        { color: theme.colors.palette.angry500 },
                      ]}
                    >
                      Delete
                    </Text>
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.colors.palette.angry500}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* Show/Hide replies button */}
              {comment.replyCount > 0 && (
                <TouchableOpacity
                  style={styles.viewRepliesButton}
                  onPress={async () => await onToggleReplies(comment.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      showReplies[comment.id] ? 'chevron-up' : 'chevron-down'
                    }
                    size={18}
                    color={theme.colors.palette.primary200}
                  />
                  <Text
                    style={[
                      styles.viewRepliesText,
                      { color: theme.colors.palette.primary200 },
                    ]}
                  >
                    {showReplies[comment.id]
                      ? `Hide ${comment.replyCount} replies`
                      : `${isModerating ? 'Show' : 'View'} ${comment.replyCount} replies`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Reply input - only show if not moderating */}
        {!isModerating && replyingTo === comment.id && (
          <View style={styles.replyInput}>
            <View style={styles.replyInputHeader}>
              <Text
                style={[
                  styles.replyingToText,
                  { color: theme.colors.palette.neutral700 },
                ]}
              >
                Replying to @{comment.username}
              </Text>
            </View>
            <View style={styles.replyInputRow}>
              <View style={styles.replyAvatar}>
                <Text style={styles.replyAvatarText}>
                  {currentUserId ? 'Y' : 'G'}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.replyTextInput,
                  {
                    backgroundColor: theme.colors.palette.neutral400,
                    color: theme.colors.text,
                    borderColor: theme.colors.palette.neutral500,
                  },
                ]}
                value={replyText}
                onChangeText={onReplyTextChange}
                placeholder="Add a reply..."
                placeholderTextColor={theme.colors.palette.neutral700}
                multiline
                autoFocus
              />
            </View>
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={styles.cancelReplyButton}
                onPress={onCancelReply}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.cancelReplyText,
                    { color: theme.colors.palette.neutral700 },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitReplyButton,
                  {
                    backgroundColor: replyText.trim()
                      ? theme.colors.palette.primary200
                      : theme.colors.palette.neutral500,
                    opacity: replyText.trim() ? 1 : 0.6,
                  },
                ]}
                onPress={() => onAddReply(comment.id)}
                disabled={!replyText.trim()}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.submitReplyText, { color: theme.colors.text }]}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Replies - show for both moderating and non-moderating modes
          Rendering structure:
          CommentItem (main comment)
          └── repliesContainer
              ├── repliesHeader (line + count)
              └── ReplyItem[] (each reply rendered as ReplyItem)
                  ├── replyHeader (avatar + username + actions)
                  ├── editCommentContainer (if editing)
                  └── replyContent (reply text)
      */}
        {showReplies[comment.id] && comment.replies && (
          <View style={styles.repliesContainer}>
            <View style={styles.repliesHeader}>
              <View style={styles.repliesLine} />
              <Text
                style={[
                  styles.repliesCount,
                  { color: theme.colors.palette.neutral600 },
                ]}
              >
                {comment.replies.length} replies
              </Text>
            </View>
            {comment.replies.map(reply => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                parentId={comment.id}
                isModerating={isModerating}
                currentUserId={currentUserId}
                editingComment={editingComment}
                editText={editText}
                useTextActions={useTextActions}
                formatTime={formatTime}
                onHideComment={onHideComment}
                onDeleteComment={onDeleteComment}
                onEditComment={onEditComment}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onEditTextChange={onEditTextChange}
                onReplyPress={onReplyPress}
              />
            ))}
          </View>
        )}
      </View>
    )
  },
)

const ReplyItem: React.FC<{
  reply: Comment
  parentId: number
  isModerating: boolean
  currentUserId?: number
  editingComment: number | null
  editText: string
  useTextActions?: boolean
  formatTime: (dateString: string) => string
  onHideComment: (commentId: number) => void
  onDeleteComment: (commentId: number) => void
  onEditComment: (commentId: number, content: string) => void
  onSaveEdit: (commentId: number) => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  onReplyPress: (commentId: number) => void
}> = observer(
  ({
    reply,
    parentId,
    isModerating,
    currentUserId,
    editingComment,
    editText,
    useTextActions = true,
    formatTime,
    onHideComment,
    onDeleteComment,
    onEditComment,
    onSaveEdit,
    onCancelEdit,
    onEditTextChange,
    onReplyPress,
  }) => {
    const { theme } = useTheme()

    const isReplyHidden = reply.status === 'hidden'
    const isReplyOwner = currentUserId && reply.userId === currentUserId

    // Helper functions for actions
    const handleHidePress = () => {
      onHideComment(reply.id)
    }

    const handleDeletePress = () => {
      onDeleteComment(reply.id)
    }

    // Get hide/show icon and color based on current status
    const getHideIcon = (status: 'visible' | 'hidden') => {
      return status === 'hidden' ? 'eye-off-outline' : 'eye-outline'
    }

    const getHideIconColor = (status: 'visible' | 'hidden') => {
      return status === 'hidden'
        ? theme.colors.palette.neutral700
        : theme.colors.palette.primary200
    }

    return (
      <View style={styles.replyItem}>
        {isReplyHidden && !isModerating ? (
          <>
            <View style={styles.replyHeader}>
              <View style={styles.replyAvatar}>
                <Text style={styles.replyAvatarText}>
                  {reply.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.replyInfo}>
                <View style={styles.replyUsernameRow}>
                  <Text
                    style={[styles.replyUsername, { color: theme.colors.text }]}
                  >
                    {reply.username}
                  </Text>
                  {reply.isEdited && (
                    <Text
                      style={[
                        styles.replyEditedIndicator,
                        { color: theme.colors.palette.neutral600 },
                      ]}
                    >
                      (Edited)
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.replyTime,
                    { color: theme.colors.palette.neutral700 },
                  ]}
                >
                  {formatTime(reply.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.hiddenReplyContent}>
              <Text
                style={[
                  styles.hiddenReplyText,
                  { color: theme.colors.palette.neutral700 },
                ]}
              >
                This comment is hidden by the uploader
              </Text>
            </View>

            {/* Reply actions for hidden replies */}
            <View style={styles.replyBottomActions}>
              {/* Reply button - only show if not moderating */}
              {!isModerating && (
                <TouchableOpacity
                  style={styles.replyToReplyButton}
                  onPress={() => onReplyPress(parentId)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.replyToReplyText,
                      { color: theme.colors.palette.neutral700 },
                    ]}
                  >
                    Reply
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete button - only for own replies and not moderating */}
              {!isModerating && isReplyOwner && (
                <TouchableOpacity
                  style={styles.replyActionButton}
                  onPress={handleDeletePress}
                  activeOpacity={0.8}
                >
                  {useTextActions ? (
                    <Text
                      style={[
                        styles.replyDeleteAction,
                        { color: theme.colors.palette.angry500 },
                      ]}
                    >
                      Delete
                    </Text>
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={14}
                      color={theme.colors.palette.angry500}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.replyHeader}>
              <View style={styles.channelAvatar}>
                <Text style={styles.channelInitial}>
                  {reply.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.replyInfo}>
                <View style={styles.replyUsernameRow}>
                  <Text
                    style={[styles.replyUsername, { color: theme.colors.text }]}
                  >
                    {reply.username}
                  </Text>
                  {reply.isEdited && (
                    <Text
                      style={[
                        styles.replyEditedIndicator,
                        { color: theme.colors.palette.neutral600 },
                      ]}
                    >
                      (Edited)
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.replyTime,
                    { color: theme.colors.palette.neutral700 },
                  ]}
                >
                  {formatTime(reply.createdAt)}
                </Text>
              </View>

              <View style={styles.replyActions}>
                {/* Moderation actions for replies */}
                {isModerating && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleHidePress}
                      activeOpacity={0.8}
                    >
                      {useTextActions ? (
                        <Text
                          style={[
                            styles.replyActionText,
                            { color: theme.colors.palette.neutral700 },
                          ]}
                        >
                          {reply.status === 'hidden' ? 'Show' : 'Hide'}
                        </Text>
                      ) : (
                        <Ionicons
                          name={getHideIcon(reply.status)}
                          size={14}
                          color={getHideIconColor(reply.status)}
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleDeletePress}
                      activeOpacity={0.8}
                    >
                      {useTextActions ? (
                        <Text
                          style={[
                            styles.replyDeleteAction,
                            { color: theme.colors.palette.angry500 },
                          ]}
                        >
                          Delete
                        </Text>
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color={theme.colors.palette.angry500}
                        />
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Edit reply input */}
            {editingComment === reply.id ? (
              <View style={styles.editCommentContainer}>
                <TextInput
                  style={[
                    styles.editCommentInput,
                    {
                      backgroundColor: theme.colors.palette.neutral400,
                      color: theme.colors.text,
                      borderColor: theme.colors.palette.neutral500,
                    },
                  ]}
                  value={editText}
                  onChangeText={onEditTextChange}
                  placeholder="Edit your reply..."
                  placeholderTextColor={theme.colors.palette.neutral700}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={onCancelEdit}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.cancelEditText,
                        { color: theme.colors.palette.neutral700 },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveEditButton,
                      {
                        backgroundColor: editText.trim()
                          ? theme.colors.palette.primary200
                          : theme.colors.palette.neutral500,
                        opacity: editText.trim() ? 1 : 0.6,
                      },
                    ]}
                    onPress={() => onSaveEdit(reply.id)}
                    disabled={!editText.trim()}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.saveEditText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text
                  style={[styles.replyContent, { color: theme.colors.text }]}
                >
                  {reply.content}
                </Text>

                {/* Reply actions below content */}
                <View style={styles.replyBottomActions}>
                  {/* Reply button - only show if not moderating */}
                  {!isModerating && (
                    <TouchableOpacity
                      style={styles.replyToReplyButton}
                      onPress={() => onReplyPress(parentId)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.replyToReplyText,
                          { color: theme.colors.palette.neutral700 },
                        ]}
                      >
                        Reply
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Edit button - only for own replies, not moderating, and not hidden */}
                  {!isModerating && !isReplyHidden && isReplyOwner && (
                    <TouchableOpacity
                      style={styles.replyActionButton}
                      onPress={() => onEditComment(reply.id, reply.content)}
                      activeOpacity={0.8}
                    >
                      {useTextActions ? (
                        <Text
                          style={[
                            styles.replyActionText,
                            { color: theme.colors.palette.neutral700 },
                          ]}
                        >
                          Edit
                        </Text>
                      ) : (
                        <Ionicons
                          name="pencil-outline"
                          size={14}
                          color={theme.colors.palette.neutral700}
                        />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Delete button - only for own replies and not moderating (works for hidden replies too) */}
                  {!isModerating && isReplyOwner && (
                    <TouchableOpacity
                      style={styles.replyActionButton}
                      onPress={handleDeletePress}
                      activeOpacity={0.8}
                    >
                      {useTextActions ? (
                        <Text
                          style={[
                            styles.replyDeleteAction,
                            { color: theme.colors.palette.angry500 },
                          ]}
                        >
                          Delete
                        </Text>
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color={theme.colors.palette.angry500}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </View>
    )
  },
)

const styles = StyleSheet.create({
  commentItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  hiddenCommentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  hiddenCommentText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  editedIndicator: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  commentTime: {
    fontSize: 12,
    marginTop: 2,
  },
  moderationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  replyButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyDeleteAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    gap: 4,
  },
  viewRepliesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editCommentContainer: {
    marginTop: 8,
  },
  editCommentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveEditText: {
    fontSize: 14,
    fontWeight: '600',
  },
  channelAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(28, 98, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(28, 98, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  replyInput: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  replyInputHeader: {
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  replyTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelReplyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  submitReplyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 8,
  },
  repliesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  repliesLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  repliesCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyItem: {
    marginBottom: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  hiddenReplyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 32,
    marginBottom: 4,
  },
  hiddenReplyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  replyInfo: {
    flex: 1,
  },
  replyUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyEditedIndicator: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  replyTime: {
    fontSize: 11,
    marginTop: 1,
  },
  replyContent: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 32,
  },
  replyBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    marginTop: 4,
    gap: 16,
  },
  replyToReplyButton: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  replyToReplyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
})
