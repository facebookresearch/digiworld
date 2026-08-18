export interface User {
  id: string
  phoneNumber: string
  name?: string | null
  avatarUrl?: string | null
  lastLoggedIn?: number
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  messageType: string
  content?: string | null
  timestamp: number
  isRead: number
  isDelivered: number
}

export interface Attachment {
  id: string
  messageId: string
  fileType?: string | null
  filePath?: string | null
  preview?: string | null
}

export interface GroupMember {
  groupId: string
  userId: string
}

export interface GroupMessage {
  id: string
  groupId: string
  senderId: string
  messageType: string
  content?: string | null
  timestamp: number
  isReadBy?: string | null
  isDeliveredTo?: string | null
}

export interface ChatSettings {
  userId: string
  fontSize: string
  wallpaper?: string | null
  notificationTone: string
}

export interface CallHistory {
  id: string
  callerId: string
  receiverId: string
  callType: string
  duration?: number | null
  timestamp: number
  wasMissed: number
}

export interface AppState {
  userId: string
  lastScreen?: string | null
  lastOpenedTimestamp: number
  scrollPositions?: string | null
}
