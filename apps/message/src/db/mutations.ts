import { getDrizzle, isDatabaseReady } from '@/db'
import { eq, sql, and } from 'drizzle-orm'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { Asset } from 'expo-asset'
import { unzip } from 'react-native-zip-archive'
import {
  usersTable,
  messagesTable,
  attachmentsTable,
  groupMembersTable,
  groupMessagesTable,
  chatSettingsTable,
  callHistoryTable,
  appStateTable,
  groupsTable,
} from './schema'

// Import all mock data for writing to filesystem
import mockUsers from '../data/mockdata/mock-users.json'
import mockMessages from '../data/mockdata/mock-messages.json'
import mockAttachments from '../data/mockdata/mock-attachments.json'
import mockGroupMembers from '../data/mockdata/mock-group_members.json'
import mockGroupMessages from '../data/mockdata/mock-group_messages.json'
import mockChatSettings from '../data/mockdata/mock-chat_settings.json'
import mockCallHistory from '../data/mockdata/mock-call_history.json'
import mockAppState from '../data/mockdata/mock-app_state.json'
import mockGroups from '../data/mockdata/mock-groups.json'

// Type imports for insert shapes
type UserInsert = typeof usersTable.$inferInsert
type MessageInsert = typeof messagesTable.$inferInsert
type AttachmentInsert = typeof attachmentsTable.$inferInsert
type GroupInsert = typeof groupsTable.$inferInsert
type GroupMemberInsert = typeof groupMembersTable.$inferInsert
type GroupMessageInsert = typeof groupMessagesTable.$inferInsert
type ChatSettingsInsert = typeof chatSettingsTable.$inferInsert
type CallHistoryInsert = typeof callHistoryTable.$inferInsert
type AppStateInsert = typeof appStateTable.$inferInsert

// Write all mock data assets to filesystem (directory + preview assets)
async function ensureMockDataExists() {
  try {
    const baseDir = Platform.select({
      android: `${RNFS.ExternalDirectoryPath}/mockdata`,
      ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
      default: '',
    })

    // Create mockdata directory if it doesn't exist
    const dirExists = await RNFS.exists(baseDir)
    if (!dirExists) {
      await RNFS.mkdir(baseDir)
    }

    // Copy entire assets directory from bundle to filesystem (for previews)
    await copyAssetsDirectory(baseDir)
  } catch (error) {
    console.error('Error setting up mock data directory/assets:', error)
  }
}

// Copy entire assets directory from app bundle to filesystem
async function copyAssetsDirectory(baseDir: string) {
  try {
    // Create assets directory structure
    const assetsDir = `${baseDir}/assets`
    const mediaDir = `${assetsDir}/media`
    const previewsDir = `${mediaDir}/previews`

    await RNFS.mkdir(assetsDir).catch(() => {}) // Ignore if exists
    await RNFS.mkdir(mediaDir).catch(() => {}) // Ignore if exists
    await RNFS.mkdir(previewsDir).catch(() => {}) // Ignore if exists

    // Check if preview files already exist
    const previewFiles = [
      'audio_preview.mp3',
      'image_preview.png',
      'pdfpreview.pdf',
      'ppt_preview.pptx',
      'text_preview.txt',
      'video_preview.mp4',
      'xl_preview.xlsx',
    ]

    const allFilesExist = await Promise.all(
      previewFiles.map(filename => RNFS.exists(`${previewsDir}/${filename}`)),
    )

    if (allFilesExist.every(exists => exists)) {
      console.log('All preview files already exist')
      return
    }

    // Extract preview files from bundled ZIP (same approach as ryde app)
    try {
      console.log('Loading previews from bundled asset: previews.zip')
      const zipAsset = Asset.fromModule(require('../../assets/previews.zip'))
      await zipAsset.downloadAsync()

      if (zipAsset.localUri) {
        console.log('Extracting preview files to:', previewsDir)
        const result = await unzip(zipAsset.localUri, previewsDir)
        console.log('Successfully extracted preview files to:', result)
      } else {
        console.log('Failed to get local URI for previews.zip')
      }
    } catch (error) {
      console.log('Failed to extract preview files from bundle:', error)
      // Fallback: try external directory where Python script copies files
      const externalPath = `${RNFS.ExternalDirectoryPath}/mockdata/assets/media/previews`
      const externalExists = await RNFS.exists(externalPath)

      if (externalExists) {
        console.log('Copying preview files from external directory')
        for (const filename of previewFiles) {
          const sourcePath = `${externalPath}/${filename}`
          const destPath = `${previewsDir}/${filename}`
          const sourceExists = await RNFS.exists(sourcePath)

          if (sourceExists) {
            await RNFS.copyFile(sourcePath, destPath)
            console.log(`Copied preview file from external: ${filename}`)
          }
        }
      } else {
        console.log('No external preview files found')
      }
    }
  } catch (error) {
    console.error('Error copying preview assets:', error)
  }
}

// Helper function to read mock data from filesystem
async function readJSONFile(filename: string) {
  try {
    // Ensure mock data directory and assets exist first
    await ensureMockDataExists()

    const baseDir = Platform.select({
      android: `${RNFS.ExternalDirectoryPath}/mockdata`,
      ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
      default: '',
    })
    const filePath = `${baseDir}/${filename}`
    const exists = await RNFS.exists(filePath)

    if (exists) {
      console.log(`Reading ${filename} from storage`)
      const content = await RNFS.readFile(filePath, 'utf8')
      return JSON.parse(content)
    }

    console.log(`File ${filename} not found in storage, using bundled data`)

    // Fallback to bundled mock data (match pattern used in flightbooking app)
    switch (filename) {
      case 'mock-users.json':
        return mockUsers
      case 'mock-messages.json':
        return mockMessages
      case 'mock-attachments.json':
        return mockAttachments
      case 'mock-group_members.json':
        return mockGroupMembers
      case 'mock-group_messages.json':
        return mockGroupMessages
      case 'mock-chat_settings.json':
        return mockChatSettings
      case 'mock-call_history.json':
        return mockCallHistory
      case 'mock-app_state.json':
        return mockAppState
      case 'mock-groups.json':
        return mockGroups
      default:
        console.error(`Unknown mock data file: ${filename}`)
        return null
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return null
  }
}

const getDb = () => {
  if (!isDatabaseReady()) throw new Error('Database not available')
  const db = getDrizzle()
  if (!db) throw new Error('Database not available')
  return db
}

export const mutations = {
  async initializeDatabase() {
    try {
      const db = getDb()
      // Check if database is already initialized
      const existingUsers = await db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .get()
      if (existingUsers && (existingUsers as { count: number }).count > 0) {
        return { success: true, skipped: true }
      }

      // Read mock data
      const users = await readJSONFile('mock-users.json')
      const messages = await readJSONFile('mock-messages.json')
      const attachments = await readJSONFile('mock-attachments.json')
      const groups = await readJSONFile('mock-groups.json')
      const groupMembers = await readJSONFile('mock-group_members.json')
      const groupMessages = await readJSONFile('mock-group_messages.json')
      const chatSettings = await readJSONFile('mock-chat_settings.json')
      const callHistory = await readJSONFile('mock-call_history.json')
      const appState = await readJSONFile('mock-app_state.json')

      if (!users) {
        throw new Error('Failed to load mock users data')
      }

      // Batch insert mock data (flightbooking-style batching instead of per-row inserts)
      try {
        // Users (required)
        if (Array.isArray(users) && users.length > 0) {
          await db
            .insert(usersTable)
            .values(users as any)
            .run()
        }

        // Groups
        if (Array.isArray(groups) && groups.length > 0) {
          await db
            .insert(groupsTable)
            .values(groups as any)
            .run()
        }

        // Messages
        if (Array.isArray(messages) && messages.length > 0) {
          await db
            .insert(messagesTable)
            .values(messages as any)
            .run()
        }

        // Attachments
        if (Array.isArray(attachments) && attachments.length > 0) {
          await db
            .insert(attachmentsTable)
            .values(attachments as any)
            .run()
        }

        // Group Members
        if (Array.isArray(groupMembers) && groupMembers.length > 0) {
          await db
            .insert(groupMembersTable)
            .values(groupMembers as any)
            .run()
        }

        // Group Messages
        if (Array.isArray(groupMessages) && groupMessages.length > 0) {
          await db
            .insert(groupMessagesTable)
            .values(groupMessages as any)
            .run()
        }

        // Chat Settings
        if (Array.isArray(chatSettings) && chatSettings.length > 0) {
          await db
            .insert(chatSettingsTable)
            .values(chatSettings as any)
            .run()
        }

        // Call History
        if (Array.isArray(callHistory) && callHistory.length > 0) {
          await db
            .insert(callHistoryTable)
            .values(callHistory as any)
            .run()
        }

        // App State
        if (Array.isArray(appState) && appState.length > 0) {
          await db
            .insert(appStateTable)
            .values(appState as any)
            .run()
        }

        return { success: true }
      } catch (insertError) {
        console.error(
          'Batch insert failed during database initialization:',
          insertError,
        )
        throw insertError
      }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  // Users CRUD
  async createUser(userData: UserInsert) {
    try {
      const db = getDb()
      const result = await db.insert(usersTable).values(userData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create user:', error)
      return { success: false, error }
    }
  },

  async updateUser(id: string, userData: Partial<UserInsert>) {
    try {
      const db = getDb()
      await db.update(usersTable).set(userData).where(eq(usersTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user:', error)
      return { success: false, error }
    }
  },

  async deleteUser(id: string) {
    try {
      const db = getDb()
      await db.delete(usersTable).where(eq(usersTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete user:', error)
      return { success: false, error }
    }
  },

  // Messages CRUD
  async createMessage(messageData: MessageInsert) {
    try {
      const db = getDb()
      const result = await db.insert(messagesTable).values(messageData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create message:', error)
      return { success: false, error }
    }
  },

  async updateMessage(id: string, messageData: Partial<MessageInsert>) {
    try {
      const db = getDb()
      await db
        .update(messagesTable)
        .set(messageData)
        .where(eq(messagesTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update message:', error)
      return { success: false, error }
    }
  },

  async deleteMessage(id: string, userId: string) {
    try {
      const db = getDb()

      // Get the current message to check deletedBy field
      const message = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.id, id))
        .get()

      if (!message) {
        return { success: false, error: 'Message not found' }
      }

      // Get current deletedBy list (comma-separated user IDs)
      const currentDeletedBy = message.deletedBy || ''
      const deletedByList = currentDeletedBy
        ? currentDeletedBy.split(',').filter((id: string) => id.trim() !== '')
        : []

      // Add current user to deletedBy list if not already present
      if (!deletedByList.includes(userId)) {
        deletedByList.push(userId)
      }

      // Update message with new deletedBy list
      const updatedDeletedBy = deletedByList.join(',')
      await db
        .update(messagesTable)
        .set({ deletedBy: updatedDeletedBy })
        .where(eq(messagesTable.id, id))

      return { success: true }
    } catch (error) {
      console.error('Failed to delete message:', error)
      return { success: false, error }
    }
  },

  // Mark all messages as read for individual chat
  async markIndividualMessagesAsRead(userId: string, otherUserId: string) {
    try {
      const db = getDb()
      await db
        .update(messagesTable)
        .set({ isRead: 1 })
        .where(
          and(
            eq(messagesTable.senderId, otherUserId),
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.isRead, 0),
          ),
        )
      return { success: true }
    } catch (error) {
      console.error('Failed to mark individual messages as read:', error)
      return { success: false, error }
    }
  },

  // Mark all messages as read for group chat
  async markGroupMessagesAsRead(groupId: string, userId: string) {
    try {
      const db = getDb()

      // Get all messages for this group
      const allMessages = await db
        .select()
        .from(groupMessagesTable)
        .where(eq(groupMessagesTable.groupId, groupId))
        .all()

      console.log(
        'Total messages in group:',
        allMessages.length,
        'for group:',
        groupId,
      )
      // Filter messages that are not read by current user
      const unreadMessages = allMessages.filter(
        (message: { isReadBy: string }) => {
          const readBy = message.isReadBy || ''
          const readByArray = readBy
            .split(',')
            .filter((id: string) => id.trim() !== '')
          const isReadByCurrentUser = readByArray.includes(userId)

          console.log(
            'Message:',
            message,
            'isReadBy:',
            readBy,
            'readByArray:',
            readByArray,
            'isReadByCurrentUser:',
            isReadByCurrentUser,
          )

          return !isReadByCurrentUser
        },
      )

      console.log(
        'Found unread messages:',
        unreadMessages.length,
        'for group:',
        groupId,
        'user:',
        userId,
      )

      // Update each unread message to include the current user in isReadBy
      for (const message of unreadMessages) {
        const currentReadBy = message.isReadBy || ''
        const updatedReadBy = currentReadBy
          ? `${currentReadBy},${userId}`
          : userId

        console.log(
          'Updating message:',
          message.id,
          'from:',
          currentReadBy,
          'to:',
          updatedReadBy,
        )

        await db
          .update(groupMessagesTable)
          .set({ isReadBy: updatedReadBy })
          .where(eq(groupMessagesTable.id, message.id))
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to mark group messages as read:', error)
      return { success: false, error }
    }
  },

  // Attachments CRUD
  async createAttachment(attachmentData: AttachmentInsert) {
    try {
      const db = getDb()
      const result = await db.insert(attachmentsTable).values(attachmentData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create attachment:', error)
      return { success: false, error }
    }
  },

  async updateAttachment(
    id: string,
    attachmentData: Partial<AttachmentInsert>,
  ) {
    try {
      const db = getDb()
      await db
        .update(attachmentsTable)
        .set(attachmentData)
        .where(eq(attachmentsTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update attachment:', error)
      return { success: false, error }
    }
  },

  async deleteAttachment(id: string) {
    try {
      const db = getDb()
      await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      return { success: false, error }
    }
  },

  // Groups CRUD
  async createGroup(groupData: GroupInsert) {
    try {
      const db = getDb()
      const result = await db.insert(groupsTable).values(groupData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create group:', error)
      return { success: false, error }
    }
  },

  async updateGroup(id: string, groupData: Partial<GroupInsert>) {
    try {
      const db = getDb()
      await db.update(groupsTable).set(groupData).where(eq(groupsTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update group:', error)
      return { success: false, error }
    }
  },

  async deleteGroup(id: string, userId: string) {
    try {
      const db = getDb()

      // Get the current group to check deletedBy field
      const group = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, id))
        .get()

      if (!group) {
        return { success: false, error: 'Group not found' }
      }

      // Get current deletedBy list (comma-separated user IDs)
      const currentDeletedBy = group.deletedBy || ''
      const deletedByList = currentDeletedBy
        ? currentDeletedBy.split(',').filter((id: string) => id.trim() !== '')
        : []

      // Add current user to deletedBy list if not already present
      if (!deletedByList.includes(userId)) {
        deletedByList.push(userId)
      }

      // Update group with new deletedBy list (soft delete)
      const updatedDeletedBy = deletedByList.join(',')
      await db
        .update(groupsTable)
        .set({ deletedBy: updatedDeletedBy })
        .where(eq(groupsTable.id, id))

      // Also mark all group messages as deleted by this user
      // Get all group messages for this group
      const allGroupMessages = await db
        .select()
        .from(groupMessagesTable)
        .where(eq(groupMessagesTable.groupId, id))
        .all()

      // Update each message's deletedBy field
      for (const message of allGroupMessages) {
        const messageDeletedBy = message.deletedBy || ''
        const messageDeletedByList = messageDeletedBy
          ? messageDeletedBy.split(',').filter((id: string) => id.trim() !== '')
          : []

        // Add current user to deletedBy list if not already present
        if (!messageDeletedByList.includes(userId)) {
          messageDeletedByList.push(userId)
        }

        // Update message with new deletedBy list
        const updatedMessageDeletedBy = messageDeletedByList.join(',')
        await db
          .update(groupMessagesTable)
          .set({ deletedBy: updatedMessageDeletedBy })
          .where(eq(groupMessagesTable.id, message.id))
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to delete group:', error)
      return { success: false, error }
    }
  },

  // Group Members CRUD
  async createGroupMember(memberData: GroupMemberInsert) {
    try {
      const db = getDb()

      // Ensure required fields are present
      if (!memberData.groupId || !memberData.userId) {
        return { success: false, error: 'groupId and userId are required' }
      }

      // Check if member already exists (even if exited)
      const existingMember = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, memberData.groupId),
            eq(groupMembersTable.userId, memberData.userId),
          ),
        )
        .get()

      if (existingMember) {
        // Member exists - update exitedAt to null to re-add them
        await db
          .update(groupMembersTable)
          .set({ exitedAt: null })
          .where(
            and(
              eq(groupMembersTable.groupId, memberData.groupId),
              eq(groupMembersTable.userId, memberData.userId),
            ),
          )
      } else {
        // Member doesn't exist - insert new record
        await db.insert(groupMembersTable).values({
          groupId: memberData.groupId,
          userId: memberData.userId,
          exitedAt: null, // Explicitly set to null for new members
        })
      }

      // Remove user ID from deletedBy in groups table if present
      const group = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, memberData.groupId))
        .get()

      if (group && group.deletedBy) {
        const deletedByList = group.deletedBy
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id !== memberData.userId && id !== '')

        const updatedDeletedBy =
          deletedByList.length > 0 ? deletedByList.join(',') : null

        await db
          .update(groupsTable)
          .set({ deletedBy: updatedDeletedBy })
          .where(eq(groupsTable.id, memberData.groupId))
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to create group member:', error)
      return { success: false, error }
    }
  },

  async deleteGroupMember(groupId: string, userId: string) {
    try {
      const db = getDb()
      // Mark member as exited instead of deleting
      await db
        .update(groupMembersTable)
        .set({ exitedAt: Math.floor(Date.now() / 1000) })
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userId),
          ),
        )
      return { success: true }
    } catch (error) {
      console.error('Failed to delete group member:', error)
      return { success: false, error }
    }
  },

  // Exit group (same as deleteGroupMember but more explicit)
  async exitGroup(groupId: string, userId: string) {
    return this.deleteGroupMember(groupId, userId)
  },

  // Group Messages CRUD
  async createGroupMessage(messageData: GroupMessageInsert) {
    try {
      const db = getDb()
      const result = await db.insert(groupMessagesTable).values(messageData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create group message:', error)
      return { success: false, error }
    }
  },

  async updateGroupMessage(
    id: string,
    messageData: Partial<GroupMessageInsert>,
  ) {
    try {
      const db = getDb()
      await db
        .update(groupMessagesTable)
        .set(messageData)
        .where(eq(groupMessagesTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update group message:', error)
      return { success: false, error }
    }
  },

  async deleteGroupMessage(id: string, userId: string) {
    try {
      const db = getDb()

      // Get the current message to check deletedBy field
      const message = await db
        .select()
        .from(groupMessagesTable)
        .where(eq(groupMessagesTable.id, id))
        .get()

      if (!message) {
        return { success: false, error: 'Message not found' }
      }

      // Get current deletedBy list (comma-separated user IDs)
      const currentDeletedBy = message.deletedBy || ''
      const deletedByList = currentDeletedBy
        ? currentDeletedBy.split(',').filter((id: string) => id.trim() !== '')
        : []

      // Add current user to deletedBy list if not already present
      if (!deletedByList.includes(userId)) {
        deletedByList.push(userId)
      }

      // Update message with new deletedBy list
      const updatedDeletedBy = deletedByList.join(',')
      await db
        .update(groupMessagesTable)
        .set({ deletedBy: updatedDeletedBy })
        .where(eq(groupMessagesTable.id, id))

      return { success: true }
    } catch (error) {
      console.error('Failed to delete group message:', error)
      return { success: false, error }
    }
  },

  // Chat Settings CRUD
  async createChatSettings(settingsData: ChatSettingsInsert) {
    try {
      const db = getDb()
      const result = await db.insert(chatSettingsTable).values(settingsData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create chat settings:', error)
      return { success: false, error }
    }
  },

  async updateChatSettings(
    userId: string,
    settingsData: Partial<ChatSettingsInsert>,
  ) {
    try {
      const db = getDb()
      await db
        .update(chatSettingsTable)
        .set(settingsData)
        .where(eq(chatSettingsTable.userId, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update chat settings:', error)
      return { success: false, error }
    }
  },

  async deleteChatSettings(userId: string) {
    try {
      const db = getDb()
      await db
        .delete(chatSettingsTable)
        .where(eq(chatSettingsTable.userId, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete chat settings:', error)
      return { success: false, error }
    }
  },

  // Call History CRUD
  async createCallHistory(callData: CallHistoryInsert) {
    try {
      const db = getDb()
      const result = await db.insert(callHistoryTable).values(callData)
      console.log('Call history created:', { callData, result })
      return { success: true, id: callData.id }
    } catch (error) {
      console.error('Failed to create call history:', error)
      return { success: false, error }
    }
  },

  async updateCallHistory(id: string, callData: Partial<CallHistoryInsert>) {
    try {
      const db = getDb()
      await db
        .update(callHistoryTable)
        .set(callData)
        .where(eq(callHistoryTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to update call history:', error)
      return { success: false, error }
    }
  },

  async deleteCallHistory(id: string) {
    try {
      const db = getDb()
      await db.delete(callHistoryTable).where(eq(callHistoryTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete call history:', error)
      return { success: false, error }
    }
  },

  // App State CRUD
  async createAppState(stateData: AppStateInsert) {
    try {
      const db = getDb()
      const result = await db.insert(appStateTable).values(stateData)
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to create app state:', error)
      return { success: false, error }
    }
  },

  async updateAppState(userId: string, stateData: Partial<AppStateInsert>) {
    try {
      const db = getDb()
      await db
        .update(appStateTable)
        .set(stateData)
        .where(eq(appStateTable.userId, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update app state:', error)
      return { success: false, error }
    }
  },

  async deleteAppState(userId: string) {
    try {
      const db = getDb()
      await db.delete(appStateTable).where(eq(appStateTable.userId, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete app state:', error)
      return { success: false, error }
    }
  },
}
