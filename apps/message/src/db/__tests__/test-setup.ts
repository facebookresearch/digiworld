import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from '../schema'

// Create in-memory database for testing
export function createTestDatabase() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })

  // Run migrations if you have them
  // migrate(db, { migrationsFolder: './src/db/migrations' });

  return { db, sqlite }
}

// Mock data helpers for message app
export const mockUsers = [
  {
    id: 'user1',
    phoneNumber: '+1234567890',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar1.jpg',
    lastLoggedIn: Date.now(),
  },
  {
    id: 'user2',
    phoneNumber: '+0987654321',
    name: 'User Two',
    avatarUrl: null,
    lastLoggedIn: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 'user3',
    phoneNumber: '+1122334455',
    name: 'User Three',
    avatarUrl: 'https://example.com/avatar3.jpg',
    lastLoggedIn: Date.now() - 3600000, // 1 hour ago
  },
]

export const mockMessages = [
  {
    id: 'msg1',
    senderId: 'user1',
    receiverId: 'user2',
    messageType: 'text',
    content: 'Hello, how are you?',
    timestamp: Date.now() - 3600000, // 1 hour ago
    isRead: 1,
    isDelivered: 1,
  },
  {
    id: 'msg2',
    senderId: 'user2',
    receiverId: 'user1',
    messageType: 'text',
    content: 'I am good, thanks!',
    timestamp: Date.now() - 1800000, // 30 minutes ago
    isRead: 1,
    isDelivered: 1,
  },
  {
    id: 'msg3',
    senderId: 'user1',
    receiverId: 'user3',
    messageType: 'text',
    content: 'Unread message',
    timestamp: Date.now() - 600000, // 10 minutes ago
    isRead: 0,
    isDelivered: 1,
  },
]

export const mockAttachments = [
  {
    id: 'att1',
    messageId: 'msg1',
    fileType: 'image',
    filePath: '/path/to/image.jpg',
    preview: 'data:image/jpeg;base64,preview-data',
  },
  {
    id: 'att2',
    messageId: 'msg2',
    fileType: 'document',
    filePath: '/path/to/document.pdf',
    preview: null,
  },
]

export const mockGroupMembers = [
  {
    groupId: 'group1',
    userId: 'user1',
  },
  {
    groupId: 'group1',
    userId: 'user2',
  },
  {
    groupId: 'group1',
    userId: 'user3',
  },
]

export const mockGroupMessages = [
  {
    id: 'gmsg1',
    groupId: 'group1',
    senderId: 'user1',
    messageType: 'text',
    content: 'Hello everyone!',
    timestamp: Date.now() - 7200000, // 2 hours ago
    isReadBy: 'user1,user2',
    isDeliveredTo: 'user1,user2,user3',
  },
  {
    id: 'gmsg2',
    groupId: 'group1',
    senderId: 'user2',
    messageType: 'text',
    content: 'Hi there!',
    timestamp: Date.now() - 3600000, // 1 hour ago
    isReadBy: 'user1,user2,user3',
    isDeliveredTo: 'user1,user2,user3',
  },
]

export const mockChatSettings = [
  {
    userId: 'user1',
    fontSize: 'medium',
    wallpaper: 'default',
    notificationTone: 'default',
  },
  {
    userId: 'user2',
    fontSize: 'large',
    wallpaper: 'custom.jpg',
    notificationTone: 'custom.mp3',
  },
]

export const mockCallHistory = [
  {
    id: 'call1',
    callerId: 'user1',
    receiverId: 'user2',
    callType: 'voice',
    duration: 300, // 5 minutes
    timestamp: Date.now() - 86400000, // 1 day ago
    wasMissed: 0,
  },
  {
    id: 'call2',
    callerId: 'user2',
    receiverId: 'user1',
    callType: 'video',
    duration: 0,
    timestamp: Date.now() - 7200000, // 2 hours ago
    wasMissed: 1,
  },
]

export const mockAppState = [
  {
    userId: 'user1',
    lastScreen: 'ChatList',
    lastOpenedTimestamp: Date.now(),
    scrollPositions: JSON.stringify({ ChatList: 0, Chat: 100 }),
  },
  {
    userId: 'user2',
    lastScreen: 'Settings',
    lastOpenedTimestamp: Date.now() - 3600000, // 1 hour ago
    scrollPositions: JSON.stringify({ Settings: 0 }),
  },
]

// Helper to seed test database
export async function seedTestDatabase(db: any) {
  // Insert users
  for (const user of mockUsers) {
    await db.insert(schema.usersTable).values(user)
  }

  // Insert messages
  for (const message of mockMessages) {
    await db.insert(schema.messagesTable).values(message)
  }

  // Insert attachments
  for (const attachment of mockAttachments) {
    await db.insert(schema.attachmentsTable).values(attachment)
  }

  // Insert group members
  for (const member of mockGroupMembers) {
    await db.insert(schema.groupMembersTable).values(member)
  }

  // Insert group messages
  for (const message of mockGroupMessages) {
    await db.insert(schema.groupMessagesTable).values(message)
  }

  // Insert chat settings
  for (const setting of mockChatSettings) {
    await db.insert(schema.chatSettingsTable).values(setting)
  }

  // Insert call history
  for (const call of mockCallHistory) {
    await db.insert(schema.callHistoryTable).values(call)
  }

  // Insert app state
  for (const state of mockAppState) {
    await db.insert(schema.appStateTable).values(state)
  }
}

// Simple test to prevent "no tests" error
describe('test-setup', () => {
  test('should provide test utilities', () => {
    expect(typeof createTestDatabase).toBe('function')
    expect(typeof seedTestDatabase).toBe('function')
    expect(mockUsers).toBeDefined()
    expect(mockMessages).toBeDefined()
  })
})
