// Copyright (c) Meta Platforms, Inc. and affiliates.
export interface User {
  id: number
  email: string
  password: string
  pin: string
  pinAttempts: number
  pinLockedUntil: string | null
  firstName: string
  lastName: string
  displayName: string
  phoneNumber: string
  createdAt: string
  updatedAt: string
  settings: UserSettings
  status: 'active' | 'inactive' | 'suspended'
  kycVerified: number
  dailyLimit: number
  monthlyLimit: number
  role: 'user' | 'admin'
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  transactionLimit?: number
  preferredCurrency?: string
}

export interface Wallet {
  id: number
  userId: number
  balance: number
  currency: string
  type: 'personal' | 'business'
  status: 'active' | 'inactive' | 'frozen'
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: number
  senderWalletId: number
  receiverWalletId: number
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  type: 'transfer' | 'deposit' | 'withdrawal'
  pinVerified: number
  pinVerifiedAt?: string
  reference?: string
  description?: string
  createdAt: string
  updatedAt: string
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
