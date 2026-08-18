// Group Chat Types
export interface GroupMessage {
  id: string
  groupId: string
  senderId: string
  messageType: string
  content: string
  timestamp: number
  isReadBy: string
  isDeliveredTo: string
  isEdited?: boolean
  sender?: {
    id: string
    name: string
    avatarUrl?: string
    phoneNumber: string
  }
}

export interface Group {
  id: string
  name: string
  description?: string
  avatarUrl?: string
  createdBy: string
  createdAt: number
  memberCount: number
}

export interface GroupMember {
  userId: string
  name: string
  avatarUrl?: string
}

export interface MessageGroup {
  date: string
  messages: GroupMessage[]
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: string
  preview: string
}

// Home Screen Types
export interface ChatConversation {
  id: string
  type: 'individual' | 'group'
  name: string
  avatarUrl?: string
  lastMessage: {
    id: string
    senderId: string
    receiverId?: string
    groupId?: string
    content: string
    timestamp: number
    isRead?: number
    isReadBy?: string
    messageType: string
  }
  unreadCount: number
  otherUser?: {
    id: string
    name: string
    avatarUrl?: string
    phoneNumber: string
  }
  memberCount?: number
}

// Groups Screen Types
export interface GroupWithMembers extends Group {
  members: string[]
  exitedAt?: number | null // Unix timestamp when user exited, null if still active
}

// Contact Types
export interface Contact {
  id?: string
  name?: string
  phoneNumbers?: {
    number: string
  }[]
  imageAvailable?: boolean
  image?: {
    uri: string
  }
}

export interface DatabaseUser {
  id: string
  phoneNumber: string
  name: string | null
  avatarUrl: string | null
  lastLoggedIn: number
}

export interface ContactItem {
  id: string
  name: string
  phoneNumber: string
  avatarUrl?: string
  type: 'database' | 'phone'
  originalData: Contact | DatabaseUser
}

export interface SectionData {
  title: string
  data: ContactItem[]
  type: 'database' | 'phone'
}

export interface InviteState {
  [key: string]: boolean
}
