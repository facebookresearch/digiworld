// Copyright (c) Meta Platforms, Inc. and affiliates.
import { getDrizzle, isDatabaseReady } from '@/db'
import { sql, eq, and, or, desc, asc, lte } from 'drizzle-orm'
import {
  usersTable,
  messagesTable,
  attachmentsTable,
  groupsTable,
  groupMembersTable,
  groupMessagesTable,
  chatSettingsTable,
  callHistoryTable,
  appStateTable,
} from './schema'

// Helper function to get database instance with error handling
const getDb = () => {
  if (!isDatabaseReady()) {
    throw new Error('Database not available - may be resetting')
  }
  const db = getDrizzle()
  if (!db) {
    throw new Error('Database not available - may be resetting')
  }
  return db
}

export const queries = {
  // User queries
  async getAllUsers() {
    try {
      const db = getDb()
      return await db.select().from(usersTable).all()
    } catch (error) {
      console.error('Error getting all users:', error)
      return []
    }
  },

  async getUserById(id: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .get()
    } catch (error) {
      console.error('Error getting user by id:', error)
      return null
    }
  },

  async getUserByPhoneNumber(phoneNumber: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.phoneNumber, phoneNumber))
        .get()
    } catch (error) {
      console.error('Error getting user by phone number:', error)
      return null
    }
  },

  // Message queries
  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    currentUserId?: string,
  ) {
    try {
      const db = getDb()
      const allMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            or(
              and(
                eq(messagesTable.senderId, userId1),
                eq(messagesTable.receiverId, userId2),
              ),
              and(
                eq(messagesTable.senderId, userId2),
                eq(messagesTable.receiverId, userId1),
              ),
            ),
          ),
        )
        .orderBy(asc(messagesTable.timestamp))
        .all()

      // Filter out messages deleted by the current user only
      // If currentUserId is not provided, don't filter (backward compatibility)
      if (currentUserId) {
        return allMessages.filter((message: any) => {
          const deletedBy = message.deletedBy || ''
          if (!deletedBy) return true // Message not deleted by anyone

          // Use regex for faster matching
          const regex = new RegExp(`(^|,)${currentUserId}(,|$)`)
          return !regex.test(deletedBy) // Show message if current user hasn't deleted it
        })
      }

      // Backward compatibility: if no currentUserId, return all messages
      return allMessages
    } catch (error) {
      console.error('Error getting messages between users:', error)
      return []
    }
  },

  async getUnreadMessagesForUser(userId: string) {
    try {
      const db = getDb()
      const allUnreadMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.isRead, 0),
          ),
        )
        .all()

      // Filter out messages deleted by the current user
      return allUnreadMessages.filter((message: any) => {
        const deletedBy = message.deletedBy || ''
        if (!deletedBy) return true // Message not deleted by anyone

        // Use regex for faster matching
        const regex = new RegExp(`(^|,)${userId}(,|$)`)
        return !regex.test(deletedBy) // Show message if current user hasn't deleted it
      })
    } catch (error) {
      console.error('Error getting unread messages:', error)
      return []
    }
  },

  // Get unique chat conversations for a user
  async getChatConversations(userId: string) {
    try {
      const db = getDb()

      // Get all messages where the user is either sender or receiver
      const allMessages = await db
        .select()
        .from(messagesTable)
        .where(
          or(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.receiverId, userId),
          ),
        )
        .orderBy(desc(messagesTable.timestamp))
        .all()

      // Filter out messages deleted by the current user
      const visibleMessages = allMessages.filter((message: any) => {
        const deletedBy = message.deletedBy || ''
        if (!deletedBy) return true // Message not deleted by anyone

        // Use regex for faster matching
        const regex = new RegExp(`(^|,)${userId}(,|$)`)
        return !regex.test(deletedBy) // Show message if current user hasn't deleted it
      })

      // Create a map to store unique conversations
      const conversations = new Map<string, any>()

      // Only use visible messages (not deleted by current user) to build conversations
      for (const message of visibleMessages) {
        // Determine the other user in the conversation
        const otherUserId =
          message.senderId === userId ? message.receiverId : message.senderId

        // If we haven't seen this conversation yet, add it
        if (!conversations.has(otherUserId)) {
          conversations.set(otherUserId, {
            otherUserId,
            lastMessage: message,
            unreadCount: 0,
          })
        }
      }

      // Get unread messages count for each conversation (filter deleted messages)
      const unreadMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.isRead, 0),
          ),
        )
        .all()

      // Filter unread messages deleted by current user
      const visibleUnreadMessages = unreadMessages.filter((message: any) => {
        const deletedBy = message.deletedBy || ''
        if (!deletedBy) return true

        const regex = new RegExp(`(^|,)${userId}(,|$)`)
        return !regex.test(deletedBy)
      })

      // Count unread messages per conversation (only for visible messages)
      for (const message of visibleUnreadMessages) {
        const conversation = conversations.get(message.senderId)
        if (conversation) {
          conversation.unreadCount += 1
        }
      }

      // Convert to array and sort by last message timestamp
      const conversationsArray = Array.from(conversations.values()).sort(
        (a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp,
      )

      return conversationsArray
    } catch (error) {
      console.error('Error getting chat conversations:', error)
      return []
    }
  },

  // Group queries
  async getAllGroups() {
    try {
      const db = getDb()
      return await db.select().from(groupsTable).all()
    } catch (error) {
      console.error('Error getting all groups:', error)
      return []
    }
  },

  async getGroupById(id: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, id))
        .get()
    } catch (error) {
      console.error('Error getting group by id:', error)
      return null
    }
  },

  async getGroupsByUser(userId: string) {
    try {
      const db = getDb()
      const allGroups = await db
        .select({
          group: groupsTable,
          memberSince: groupMembersTable.groupId, // This will be the same for all members
        })
        .from(groupsTable)
        .innerJoin(
          groupMembersTable,
          eq(groupsTable.id, groupMembersTable.groupId),
        )
        .where(eq(groupMembersTable.userId, userId))
        .all()

      // Filter out groups deleted by the current user
      return allGroups.filter((item: any) => {
        const deletedBy = item.group.deletedBy || ''
        if (!deletedBy) return true // Group not deleted by anyone

        // Check if current user deleted this group
        const deletedByList = deletedBy
          .split(',')
          .map((id: string) => id.trim())
        return !deletedByList.includes(userId)
      })
    } catch (error) {
      console.error('Error getting groups by user:', error)
      return []
    }
  },

  async getActiveGroups() {
    try {
      const db = getDb()
      return await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.isActive, 1))
        .all()
    } catch (error) {
      console.error('Error getting active groups:', error)
      return []
    }
  },
  async getGroupMembers(groupId: string, includeExited: boolean = false) {
    try {
      const db = getDb()
      const allMembers = await db
        .select()
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, groupId))
        .all()

      // Filter out exited members unless includeExited is true
      if (!includeExited) {
        return allMembers.filter((member: any) => !member.exitedAt)
      }

      return allMembers
    } catch (error) {
      console.error('Error getting group members:', error)
      return []
    }
  },

  async getGroupMessages(
    groupId: string,
    userId?: string,
    exitedAt?: number | null,
  ) {
    try {
      const db = getDb()

      // Build WHERE conditions - filter at database level for better performance
      const conditions = [eq(groupMessagesTable.groupId, groupId)]

      // Add exit timestamp filter at database level (uses index, reduces data transfer)
      if (exitedAt) {
        conditions.push(lte(groupMessagesTable.timestamp, exitedAt))
      }

      const allMessages = await db
        .select({
          message: groupMessagesTable,
          sender: usersTable,
        })
        .from(groupMessagesTable)
        .leftJoin(usersTable, eq(groupMessagesTable.senderId, usersTable.id))
        .where(and(...conditions))
        .orderBy(asc(groupMessagesTable.timestamp))
        .all()

      // Filter out messages deleted by the current user (done in JS as deletedBy is comma-separated)
      // Optimized: Use regex for faster matching instead of split + map + includes
      if (userId) {
        return allMessages.filter((item: any) => {
          const deletedBy = item.message.deletedBy || ''
          if (!deletedBy) return true // Message not deleted by anyone

          // Regex matching is faster than split + includes for large deletion lists
          const regex = new RegExp(`(^|,)${userId}(,|$)`)
          return !regex.test(deletedBy)
        })
      }

      return allMessages
    } catch (error) {
      console.error('Error getting group messages:', error)
      return []
    }
  },

  // Check if user has exited a group and get exit timestamp
  async hasUserExitedGroup(groupId: string, userId: string) {
    try {
      const db = getDb()
      const member = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userId),
          ),
        )
        .get()

      return member?.exitedAt || null // Return exit timestamp or null
    } catch (error) {
      console.error('Error checking if user exited group:', error)
      return null
    }
  },

  // Chat settings queries
  async getChatSettings(userId: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(chatSettingsTable)
        .where(eq(chatSettingsTable.userId, userId))
        .get()
    } catch (error) {
      console.error('Error getting chat settings:', error)
      return null
    }
  },

  // Call history queries
  async getCallHistoryForUser(userId: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(callHistoryTable)
        .where(
          or(
            eq(callHistoryTable.callerId, userId),
            eq(callHistoryTable.receiverId, userId),
          ),
        )
        .orderBy(desc(callHistoryTable.timestamp))
        .all()
    } catch (error) {
      console.error('Error getting call history:', error)
      return []
    }
  },

  // App state queries
  async getAppState(userId: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(appStateTable)
        .where(eq(appStateTable.userId, userId))
        .get()
    } catch (error) {
      console.error('Error getting app state:', error)
      return null
    }
  },

  // Attachment queries
  async getAttachmentsForMessage(messageId: string) {
    try {
      const db = getDb()
      return await db
        .select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.messageId, messageId))
        .all()
    } catch (error) {
      console.error('Error getting attachments for message:', error)
      return []
    }
  },

  // Utility: Check if DB is initialized
  async isDatabaseInitialized() {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000
    while (retryCount < maxRetries) {
      try {
        const db = getDb()
        const result = await db
          .select({ count: sql`count(*)` })
          .from(usersTable)
          .get()
        const isInitialized = ((result as { count: number }).count ?? 0) > 0
        return isInitialized
      } catch (error: any) {
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    return false
  },

  // Get unique group chat conversations for a user
  async getGroupChatConversations(userId: string) {
    try {
      const db = getDb()

      // Get all groups where the user is a member
      const allUserGroups = await db
        .select({
          group: groupsTable,
          memberSince: groupMembersTable.groupId,
        })
        .from(groupsTable)
        .innerJoin(
          groupMembersTable,
          eq(groupsTable.id, groupMembersTable.groupId),
        )
        .where(eq(groupMembersTable.userId, userId))
        .all()

      // Filter out groups deleted by the current user
      const userGroups = allUserGroups.filter((item: any) => {
        const deletedBy = item.group.deletedBy || ''
        if (!deletedBy) return true // Group not deleted by anyone

        // Check if current user deleted this group
        const deletedByList = deletedBy
          .split(',')
          .map((id: string) => id.trim())
        return !deletedByList.includes(userId)
      })

      // Get the latest message for each group
      const groupConversations = []
      for (const groupData of userGroups) {
        const group = groupData.group
        // Get all messages for this group first
        const allGroupMessages = await db
          .select()
          .from(groupMessagesTable)
          .where(eq(groupMessagesTable.groupId, group.id))
          .orderBy(desc(groupMessagesTable.timestamp))
          .all()

        // Filter out messages deleted by the current user
        const visibleMessages = allGroupMessages.filter((message: any) => {
          const deletedBy = message.deletedBy || ''
          if (!deletedBy) return true // Message not deleted by anyone

          // Use regex for faster matching
          const regex = new RegExp(`(^|,)${userId}(,|$)`)
          return !regex.test(deletedBy) // Show message if current user hasn't deleted it
        })

        // Get the latest visible message (not deleted by current user)
        const latestMessage =
          visibleMessages.length > 0 ? visibleMessages[0] : null

        if (latestMessage) {
          // Get member count for this group (only active members, exclude exited)
          const allGroupMembers = await db
            .select()
            .from(groupMembersTable)
            .where(eq(groupMembersTable.groupId, group.id))
            .all()

          // Filter out exited members for accurate count
          const groupMembers = allGroupMembers.filter(
            (member: any) => !member.exitedAt,
          )

          // Filter unread messages that are not deleted by current user
          const unreadMessages = visibleMessages.filter(
            (message: { isReadBy: string }) => {
              const readBy = message.isReadBy || ''
              const readByArray = readBy
                .split(',')
                .filter((id: string) => id.trim() !== '')
              return !readByArray.includes(userId)
            },
          )

          console.log(
            'Group:',
            group.id,
            'total messages:',
            allGroupMessages.length,
            'members:',
            groupMembers.length,
            'unread messages count:',
            unreadMessages.length,
            'for user:',
            userId,
          )
          console.log(
            'Sample unread message isReadBy:',
            unreadMessages[0]?.isReadBy,
          )

          groupConversations.push({
            groupId: group.id,
            groupName: group.name,
            groupAvatar: group.avatarUrl,
            lastMessage: latestMessage,
            unreadCount: unreadMessages.length,
            memberCount: groupMembers.length, // Actual member count
          })
        }
      }

      // Sort by last message timestamp
      return groupConversations.sort(
        (a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp,
      )
    } catch (error) {
      console.error('Error getting group chat conversations:', error)
      return []
    }
  },

  // Get all chat conversations (individual + group) for a user, sorted by last message timestamp
  async getAllChatConversations(userId: string) {
    try {
      // Get individual chat conversations
      const individualConversations = await this.getChatConversations(userId)

      // Get group chat conversations
      const groupConversations = await this.getGroupChatConversations(userId)

      // Transform individual conversations to match unified format
      const transformedIndividual = individualConversations.map(conv => ({
        id: conv.otherUserId,
        type: 'individual' as const,
        name: '', // Will be populated with user details
        avatarUrl: '', // Will be populated with user details
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        otherUser: null, // Will be populated with user details
      }))

      // Transform group conversations to match unified format
      const transformedGroup = groupConversations.map(conv => ({
        id: conv.groupId,
        type: 'group' as const,
        name: conv.groupName,
        avatarUrl: conv.groupAvatar,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        memberCount: conv.memberCount,
      }))

      // Combine and sort by last message timestamp
      const allConversations = [
        ...transformedIndividual,
        ...transformedGroup,
      ].sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp)

      return allConversations
    } catch (error) {
      console.error('Error getting all chat conversations:', error)
      return []
    }
  },
}
