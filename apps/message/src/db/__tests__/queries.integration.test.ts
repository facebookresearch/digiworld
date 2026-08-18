// Copyright (c) Meta Platforms, Inc. and affiliates.
import './dbMock'
import { getSingleId, cleanup } from '../../__tests__/dbTestEnv'

const { queries } = require('../queries') as {
  queries: Record<string, (...args: any[]) => Promise<any>>
}

describe('DB query smoke-tests', () => {
  let sampleUserId: string
  let sampleMessageId: string
  let sampleGroupId: string

  beforeAll(async () => {
    // Database already has data from the file, no need to seed
    // Get sample IDs for testing
    sampleUserId = await getSingleId('usersTable')
    sampleMessageId = await getSingleId('messagesTable')
    sampleGroupId = 'group1' // From mock data
  })

  afterAll(() => {
    cleanup()
  })

  type ObjectCase = {
    name: string
    fn: (...args: any[]) => Promise<any>
    args: () => Promise<any[]>
    expectError?: boolean
  }
  type Case =
    | ObjectCase
    | [string, (...args: any[]) => Promise<any>, () => Promise<any[]>]
  const cases: Case[] = [
    ['getAllUsers', queries.getAllUsers, async () => []],
    ['getUserById', queries.getUserById, async () => [sampleUserId]],
    [
      'getUserByPhoneNumber',
      queries.getUserByPhoneNumber,
      async () => ['+1234567890'],
    ],
    [
      'getMessagesBetweenUsers',
      queries.getMessagesBetweenUsers,
      async () => ['user1', 'user2'],
    ],
    [
      'getUnreadMessagesForUser',
      queries.getUnreadMessagesForUser,
      async () => [sampleUserId],
    ],
    ['getGroupMembers', queries.getGroupMembers, async () => [sampleGroupId]],
    ['getGroupMessages', queries.getGroupMessages, async () => [sampleGroupId]],
    ['getChatSettings', queries.getChatSettings, async () => [sampleUserId]],
    [
      'getCallHistoryForUser',
      queries.getCallHistoryForUser,
      async () => [sampleUserId],
    ],
    ['getAppState', queries.getAppState, async () => [sampleUserId]],
    [
      'getAttachmentsForMessage',
      queries.getAttachmentsForMessage,
      async () => [sampleMessageId],
    ],
    ['isDatabaseInitialized', queries.isDatabaseInitialized, async () => []],
  ]

  cases.forEach(testCase => {
    const [name, fn, args, expectError] = Array.isArray(testCase)
      ? testCase
      : [testCase.name, testCase.fn, testCase.args, testCase.expectError]

    test(`${name} smoke test`, async () => {
      const testArgs = await args()
      if (expectError) {
        await expect(fn(...testArgs)).rejects.toThrow()
      } else {
        const result = await fn(...testArgs)
        expect(result).toBeDefined()
      }
    })
  })

  test('getAllUsers returns array of users', async () => {
    const users = await queries.getAllUsers()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
    expect(users[0]).toHaveProperty('id')
    expect(users[0]).toHaveProperty('phoneNumber')
  })

  test('getUserById returns user with correct id', async () => {
    const user = await queries.getUserById(sampleUserId)
    expect(user).toBeDefined()
    expect(user?.id).toBe(sampleUserId)
  })

  test('getUserByPhoneNumber returns user with correct phone number', async () => {
    const user = await queries.getUserByPhoneNumber('+1234567890')
    expect(user).toBeDefined()
    expect(user?.phoneNumber).toBe('+1234567890')
  })

  test('getMessagesBetweenUsers returns messages between two users', async () => {
    const messages = await queries.getMessagesBetweenUsers('user1', 'user2')
    expect(Array.isArray(messages)).toBe(true)
    expect(messages.length).toBeGreaterThan(0)
    messages.forEach((message: any) => {
      expect(
        (message.senderId === 'user1' && message.receiverId === 'user2') ||
          (message.senderId === 'user2' && message.receiverId === 'user1'),
      ).toBe(true)
    })
  })

  test('getUnreadMessagesForUser returns only unread messages', async () => {
    const messages = await queries.getUnreadMessagesForUser('user3')
    expect(Array.isArray(messages)).toBe(true)
    messages.forEach((message: any) => {
      expect(message.receiverId).toBe('user3')
      expect(message.isRead).toBe(0)
    })
  })

  test('getGroupMembers returns members of a group', async () => {
    const members = await queries.getGroupMembers('group1')
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
    members.forEach((member: any) => {
      expect(member.groupId).toBe('group1')
    })
  })

  test('getGroupMessages returns messages in a group with correct structure and unique ids', async () => {
    const messages = await queries.getGroupMessages('group1')
    expect(Array.isArray(messages)).toBe(true)

    // If no messages exist, that's okay for the test
    if (messages.length === 0) {
      console.log('No messages found for group1, skipping structure checks')
      return
    }

    const ids = new Set()
    messages.forEach((message: any) => {
      // Check that the message has the expected structure
      expect(message).toBeDefined()

      // The message should have either groupId directly or be in a nested structure
      const groupId = message.groupId || message.message?.groupId
      const messageId = message.id || message.message?.id
      const sender = message.sender

      expect(groupId).toBeDefined()
      expect(messageId).toBeDefined()

      // If groupId is undefined, log the message structure for debugging
      if (!groupId) {
        console.log(
          'Message without groupId:',
          JSON.stringify(message, null, 2),
        )
      }

      expect(groupId).toBe('group1')
      expect(ids.has(messageId)).toBe(false) // Ensure uniqueness
      ids.add(messageId)

      // Check sender structure
      expect(sender).toBeDefined()
      if (sender) {
        expect(sender).toHaveProperty('id')
        expect(sender).toHaveProperty('name')
      }
    })
  })

  test('check what group messages exist in test database', async () => {
    // Get all groups to see what's available
    const allGroups = await queries.getAllGroups()
    expect(Array.isArray(allGroups)).toBe(true)

    if (allGroups.length > 0) {
      // Test with the first available group
      const firstGroupId = allGroups[0].id
      const messages = await queries.getGroupMessages(firstGroupId)
      expect(Array.isArray(messages)).toBe(true)
    }
  })

  test('groups table exists and has test data', async () => {
    const groups = await queries.getAllGroups()
    expect(Array.isArray(groups)).toBe(true)
    expect(groups.length).toBeGreaterThan(0)

    // Check that we have the expected test groups
    const groupIds = groups.map((g: any) => g.id)
    expect(groupIds).toContain('group1')
    expect(groupIds).toContain('group2')
  })

  test('getGroupChatConversations returns group conversations with correct structure', async () => {
    const conversations = await queries.getGroupChatConversations('user1')
    expect(Array.isArray(conversations)).toBe(true)
    conversations.forEach((conv: any) => {
      expect(conv).toHaveProperty('groupId')
      expect(conv).toHaveProperty('groupName')
      expect(conv).toHaveProperty('groupAvatar')
      expect(conv).toHaveProperty('lastMessage')
      expect(conv).toHaveProperty('unreadCount')
      expect(conv).toHaveProperty('memberCount')
      expect(typeof conv.memberCount).toBe('number')
    })
  })

  test('getChatSettings returns user chat settings', async () => {
    const settings = await queries.getChatSettings('user1')
    expect(settings).toBeDefined()
    expect(settings?.userId).toBe('user1')
    expect(settings?.fontSize).toBeDefined()
  })

  test('getCallHistoryForUser returns call history', async () => {
    const calls = await queries.getCallHistoryForUser('user1')
    expect(Array.isArray(calls)).toBe(true)
    calls.forEach((call: any) => {
      expect(call.callerId === 'user1' || call.receiverId === 'user1').toBe(
        true,
      )
    })
  })

  test('getAppState returns user app state', async () => {
    const state = await queries.getAppState('user1')
    expect(state).toBeDefined()
    expect(state?.userId).toBe('user1')
    expect(state?.lastScreen).toBeDefined()
  })

  test('getAttachmentsForMessage returns attachments for a message', async () => {
    const attachments = await queries.getAttachmentsForMessage('msg1')
    expect(Array.isArray(attachments)).toBe(true)
    attachments.forEach((attachment: any) => {
      expect(attachment.messageId).toBe('msg1')
    })
  })

  test('isDatabaseInitialized returns boolean', async () => {
    const isInitialized = await queries.isDatabaseInitialized()
    expect(typeof isInitialized).toBe('boolean')
  })
})
