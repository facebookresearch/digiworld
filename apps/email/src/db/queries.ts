import { eq, and, like, sql, or } from 'drizzle-orm'
import { db, reopenConnection } from '@/db'
import { usersTable, emailsTable, deserializeSettings } from './schema'
import type { UserSettings, EmailSettings } from './schema'
import { Email, mapDatabaseEmailToModel, MailFolder } from '@/models/EmailModel'

export const queries = {
  async getUserByEmail(email: string) {
    try {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .get()

      if (!user) return null

      return {
        ...user,
        id: Number(user.id),
        settings: deserializeSettings<UserSettings>(user.settings),
        emailSettings: deserializeSettings<EmailSettings>(user.emailSettings),
      }
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  },

  getEmailsByFolderQuery(folder: MailFolder | 'all', userEmail: string) {
    if (folder === 'all') {
      return {
        baseQuery: db
          .select()
          .from(emailsTable)
          .where(
            and(
              or(
                and(
                  eq(emailsTable.folder, 'inbox'),
                  like(emailsTable.receiver, `%${userEmail}%`),
                  eq(emailsTable.status, 'received'),
                ),
                and(
                  eq(emailsTable.folder, 'sent'),
                  eq(emailsTable.sender, userEmail),
                  eq(emailsTable.status, 'sent'),
                ),
                and(
                  eq(emailsTable.folder, 'draft'),
                  eq(emailsTable.sender, userEmail),
                  eq(emailsTable.status, 'draft'),
                ),
                eq(emailsTable.folder, 'archived'),
              ),
            ),
          )
          .orderBy(sql`${emailsTable.timestamp} DESC`),
      }
    }

    // For specific folders
    const conditions = []

    if (folder === 'inbox') {
      conditions.push(
        like(emailsTable.receiver, `%${userEmail}%`),
        eq(emailsTable.status, 'received'),
      )
    } else if (folder === 'sent') {
      conditions.push(
        eq(emailsTable.sender, userEmail),
        eq(emailsTable.status, 'sent'),
      )
    } else if (folder === 'draft') {
      conditions.push(
        eq(emailsTable.sender, userEmail),
        eq(emailsTable.status, 'draft'),
      )
    } else {
      // For archived or other folders
      conditions.push(
        or(
          eq(emailsTable.sender, userEmail),
          like(emailsTable.receiver, `%${userEmail}%`),
        ),
      )
    }

    return {
      baseQuery: db
        .select()
        .from(emailsTable)
        .where(and(eq(emailsTable.folder, folder), ...conditions))
        .orderBy(sql`${emailsTable.timestamp} DESC`),
    }
  },

  async getEmailsByFolder(
    folder: MailFolder,
    userId: string,
  ): Promise<Email[]> {
    try {
      const emails = await this.getEmailsByFolderQuery(
        folder,
        userId,
      ).baseQuery.all()
      return emails.map(mapDatabaseEmailToModel)
    } catch (error) {
      console.error('Failed to get emails:', error)
      return []
    }
  },

  async isDatabaseInitialized() {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000

    while (retryCount < maxRetries) {
      try {
        // Check if db is accessible
        if (!db) {
          console.error('Database instance is not available')

          // Try to reconnect
          await reopenConnection()
          await new Promise(resolve => setTimeout(resolve, 500))

          if (!db) {
            throw new Error(
              'Failed to get database instance after reconnection',
            )
          }
        }

        // Test the connection with a simple query
        const result = await db
          .select({ count: sql`count(*)` })
          .from(usersTable)
          .get()

        const isInitialized = ((result as { count: number }).count ?? 0) > 0
        return isInitialized
      } catch (error: any) {
        console.error(
          `Failed to check database (attempt ${retryCount + 1}/${maxRetries}):`,
          error,
        )

        if (error.message?.includes('Access to closed resource')) {
          try {
            await reopenConnection()
            // Add a small delay to ensure connection is ready
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (reconnectError) {
            console.error('Failed to reconnect to database:', reconnectError)
          }
        }

        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    console.error(
      'Max retry attempts reached for database initialization check',
    )
    return false
  },

  async getAllUsers() {
    try {
      const users = await db
        .select({
          email: usersTable.email,
          password: usersTable.password,
          displayName: usersTable.displayName,
        })
        .from(usersTable)
        .all()

      return users
    } catch (error) {
      console.error('Failed to get users:', error)
      return []
    }
  },

  getAllFolderCountsQuery(userEmail: string) {
    return db
      .select({
        inbox: sql<number>`count(case when folder = 'inbox' and status = 'received' and receiver LIKE ${`%${userEmail}%`} then 1 end)`,
        sent: sql<number>`count(case when folder = 'sent' and status = 'sent' and sender = ${userEmail} then 1 end)`,
        draft: sql<number>`count(case when folder = 'draft' and status = 'draft' and sender = ${userEmail} then 1 end)`,
        trash: sql<number>`count(case when folder = 'trash' and (sender = ${userEmail} or receiver LIKE ${`%${userEmail}%`}) then 1 end)`,
      })
      .from(emailsTable)
  },

  async searchUsers(searchText: string) {
    try {
      const users = await db
        .select({
          email: usersTable.email,
          displayName: usersTable.displayName,
        })
        .from(usersTable)
        .where(
          or(
            like(usersTable.email, `%${searchText}%`),
            like(usersTable.displayName, `%${searchText}%`),
          ),
        )
        .limit(5)
        .all()

      return users
    } catch (error) {
      console.error('Failed to search users:', error)
      return []
    }
  },

  async getEmailById(emailId: string) {
    try {
      const email = await db
        .select()
        .from(emailsTable)
        .where(eq(emailsTable.id, Number(emailId)))
        .get()

      return email
    } catch (error) {
      console.error('Failed to get email:', error)
      return null
    }
  },

  getEmailByIdQuery(emailId: number) {
    return db.select().from(emailsTable).where(eq(emailsTable.id, emailId))
  },
}
