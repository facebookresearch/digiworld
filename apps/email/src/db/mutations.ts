import { sql, eq } from 'drizzle-orm'
import { db } from '@/db'
import { usersTable, emailsTable, serializeSettings } from './schema'
import { MailFolder } from '@/models/EmailModel'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

import dummyUsers from '../data/mock-users.json'
import mockEmails from '../data/mock-emails.json'

const bundledMocks = {
  'mock-users.json': dummyUsers,
  'mock-emails.json': mockEmails,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

export const mutations = {
  async initializeDatabase(shouldCheckExistingData: boolean = true) {
    try {
      // Check if database is already initialized
      const existingUsers = await db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .get()

      if (
        shouldCheckExistingData &&
        existingUsers &&
        (existingUsers as { count: number }).count > 0
      ) {
        return { success: true, skipped: true }
      }

      const users = await readJSONFile('mock-users.json')
      const emails = await readJSONFile('mock-emails.json')
      console.log('users', users.length)
      console.log('emails', emails.length)

      // Insert in transaction
      try {
        await db.transaction(async (tx: any) => {
          await tx
            .insert(usersTable)
            .values(
              users.map((user: any) => ({
                id: parseInt(user.id.toString()),
                email: user.email,
                password: user.password,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber ?? '',
                dateOfBirth: user.dateOfBirth ?? '',
                role: user.role,
                settings: serializeSettings(user.settings),
                emailSettings: serializeSettings(user.emailSettings),
                createdAt: user.createdAt,
              })),
            )
            .run()

          await tx
            .insert(emailsTable)
            .values(
              emails.map((email: any) => ({
                id: parseInt(email.id),
                sender: email.sender,
                receiver: JSON.stringify(email.receiver),
                subject: email.subject ?? '',
                preview: email.preview ?? '',
                body: email.body ?? '',
                timestamp: email.timestamp,
                unread: email.unread ? 1 : 0,
                read: email.read ? 1 : 0,
                status: email.status,
                attachments: JSON.stringify(email.attachments ?? []),
                labels: JSON.stringify(email.labels ?? []),
                isDraft: email.isDraft ? 1 : 0,
                threadId: email.threadId,
                folder: email.folder,
                priority: email.priority,
                cc: JSON.stringify(email.cc ?? []),
                bcc: JSON.stringify(email.bcc ?? []),
              })),
            )
            .run()
        })

        return { success: true }
      } catch (txError) {
        console.error('Transaction failed:', txError)
        throw txError
      }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      return { success: false, error }
    }
  },

  async addUser(userData: Omit<typeof usersTable.$inferInsert, 'id'>) {
    try {
      const result = await db.insert(usersTable).values({
        ...userData,
        createdAt: new Date().toISOString(),
      })
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to add user:', error)
      return { success: false, error }
    }
  },

  async addEmail(emailData: Omit<typeof emailsTable.$inferInsert, 'id'>) {
    try {
      const result = await db.insert(emailsTable).values({
        ...emailData,
        timestamp: emailData.timestamp || new Date().toISOString(),
      })
      return { success: true, id: result.lastInsertRowId }
    } catch (error) {
      console.error('Failed to add email:', error)
      return { success: false, error }
    }
  },

  async updateEmailStatus(
    emailId: number,
    updates: Partial<typeof emailsTable.$inferSelect>,
  ) {
    try {
      await db
        .update(emailsTable)
        .set(updates)
        .where(eq(emailsTable.id, emailId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update email:', error)
      return { success: false, error }
    }
  },

  async moveEmailToFolder(emailId: number, folder: MailFolder) {
    try {
      await db
        .update(emailsTable)
        .set({
          folder,
          timestamp: new Date().toISOString(),
        })
        .where(eq(emailsTable.id, emailId))
      return { success: true }
    } catch (error) {
      console.error('Failed to move email:', error)
      return { success: false, error }
    }
  },

  async updateEmailLabels(emailId: number, labels: string) {
    try {
      await db
        .update(emailsTable)
        .set({
          labels,
          // Don't update timestamp - labels changes shouldn't affect email order
        })
        .where(eq(emailsTable.id, emailId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update email labels:', error)
      return { success: false, error }
    }
  },

  async updateUserProfile(
    userId: number,
    updates: {
      firstName?: string
      lastName?: string
      displayName?: string
      email?: string
      phoneNumber?: string
      dateOfBirth?: string
      avatar?: string
    },
  ) {
    try {
      const setFields: Record<string, any> = {}
      if (updates.firstName !== undefined) {
        setFields.firstName = updates.firstName
      }
      if (updates.lastName !== undefined) setFields.lastName = updates.lastName
      if (updates.displayName !== undefined) {
        setFields.displayName = updates.displayName
      }
      if (updates.email !== undefined) setFields.email = updates.email
      if (updates.phoneNumber !== undefined) {
        setFields.phoneNumber = updates.phoneNumber
      }
      if (updates.dateOfBirth !== undefined) {
        setFields.dateOfBirth = updates.dateOfBirth
      }
      if (updates.avatar !== undefined) setFields.avatar = updates.avatar

      if (Object.keys(setFields).length === 0) {
        return { success: true }
      }

      await db
        .update(usersTable)
        .set(setFields)
        .where(eq(usersTable.id, userId))
      return { success: true }
    } catch (error) {
      console.error('Failed to update user profile:', error)
      return { success: false, error }
    }
  },

  async deleteEmail(emailId: string | number) {
    try {
      const id = typeof emailId === 'string' ? parseInt(emailId) : emailId
      if (isNaN(id)) {
        throw new Error('Invalid email ID')
      }
      await db.delete(emailsTable).where(eq(emailsTable.id, id))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete email:', error)
      return { success: false, error }
    }
  },

  /**
   * Delete an entire email thread (all emails with the same thread_id)
   * This implements Gmail/Outlook-like behavior where deleting a conversation
   * removes all emails in that thread.
   *
   * @param threadId - The thread_id of the emails to delete
   * @returns Promise with success status
   */
  async deleteEmailThread(threadId: string) {
    try {
      if (!threadId) {
        throw new Error('Invalid thread ID')
      }
      const result = await db
        .delete(emailsTable)
        .where(eq(emailsTable.threadId, threadId))
      return { success: true, deletedCount: result.changes }
    } catch (error) {
      console.error('Failed to delete email thread:', error)
      return { success: false, error }
    }
  },

  /**
   * Move an entire email thread to a different folder
   * This implements Gmail/Outlook-like behavior where moving/archiving/trashing
   * a conversation affects all emails in that thread.
   *
   * @param threadId - The thread_id of the emails to move
   * @param folder - The destination folder
   * @returns Promise with success status
   */
  async moveEmailThreadToFolder(threadId: string, folder: MailFolder) {
    try {
      if (!threadId) {
        throw new Error('Invalid thread ID')
      }
      const result = await db
        .update(emailsTable)
        .set({
          folder,
          timestamp: new Date().toISOString(),
        })
        .where(eq(emailsTable.threadId, threadId))
      return { success: true, updatedCount: result.changes }
    } catch (error) {
      console.error('Failed to move email thread:', error)
      return { success: false, error }
    }
  },
}
