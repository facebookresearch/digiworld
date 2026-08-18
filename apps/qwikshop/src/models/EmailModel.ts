export interface EmailAttachment {
  name: string
  type: string
  size: number
  url: string
}

export type MailFolder = 'inbox' | 'sent' | 'trash' | 'draft' | 'archived'
export type EmailPriority = 'high' | 'normal' | 'low'
export type EmailStatus = 'sent' | 'received' | 'draft'

export interface Email {
  id: string
  sender: string
  receiver: string[]
  subject: string
  preview: string
  body: string
  timestamp: string
  unread: boolean
  read: boolean
  status: EmailStatus
  attachments: EmailAttachment[]
  labels: string[]
  is_draft: boolean
  thread_id: string
  folder: MailFolder
  priority: EmailPriority
  cc: string[]
  bcc: string[]
}

export function mapDatabaseEmailToModel(data: any): Email {
  try {
    // Parse JSON strings if they're strings
    const receiver =
      typeof data.receiver === 'string'
        ? JSON.parse(data.receiver)
        : data.receiver || []

    const cc = typeof data.cc === 'string' ? JSON.parse(data.cc) : data.cc || []

    const bcc =
      typeof data.bcc === 'string' ? JSON.parse(data.bcc) : data.bcc || []

    const attachments =
      typeof data.attachments === 'string'
        ? JSON.parse(data.attachments)
        : data.attachments || []

    const labels =
      typeof data.labels === 'string'
        ? JSON.parse(data.labels)
        : data.labels || []

    return {
      id: data.id,
      sender: data.sender,
      receiver,
      cc,
      bcc,
      subject: data.subject || '',
      preview: data.preview || '',
      body: data.body || '',
      timestamp: data.timestamp,
      unread: Boolean(data.unread),
      read: Boolean(data.read),
      status: data.status || '',
      attachments,
      labels,
      is_draft: Boolean(data.isDraft),
      thread_id: data.threadId || '',
      folder: data.folder || 'inbox',
      priority: data.priority || 'normal',
    }
  } catch (error) {
    console.error('Error mapping database email to model:', error)
    throw error
  }
}
