// Copyright (c) Meta Platforms, Inc. and affiliates.
export interface User {
  id: number
  email: string
  password: string // In real app, this should be hashed
  firstName: string
  lastName: string
  displayName: string
  avatar?: string
  phoneNumber?: string
  dateOfBirth?: string
  role: 'user' | 'admin'
  settings: UserSettings
  emailSettings: EmailSettings
  createdAt: string
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  themeVariant: 'classic' | 'modern' | 'minimal'
  language: string
  notifications: boolean
  twoFactorEnabled: boolean
}

export interface EmailSettings {
  signature?: string
  emailsPerPage: number
  autoReadReceipts: boolean
  defaultReplyTo?: string
  vacationAutoReplyEnabled: boolean
  vacationAutoReplyMessage?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
  token?: string
}

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
  status: 'received' | 'sent' | 'draft'
  attachments: {
    name: string
    type: string
    size: number
    url: string
  }[]
  labels: string[]
  is_draft: boolean
  thread_id: string
  folder: 'inbox' | 'sent' | 'draft' | 'trash'
  priority: 'low' | 'normal' | 'high'
  cc: string[]
  bcc: string[]
}
