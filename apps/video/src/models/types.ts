export interface User {
  id: number
  email: string
  name: string
  settings?: {
    theme?: string
    language?: string
    notifications?: boolean
  }
  emailSettings?: {
    marketing?: boolean
    updates?: boolean
  }
  role?: 'user' | 'admin'
  createdAt?: string
  updatedAt?: string
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
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

export interface Artist {
  id: number
  name: string
  bio?: string
  followers: number
  monthlyListeners: number
  rating?: number
  profilePicture?: string
  createdAt: string
  updatedAt: string
}

export interface Album {
  id: number
  title: string
  artistId: number
  releaseYear: number
  genre: string
  rating: number
  totalTracks: number
  coverArt?: string
  createdAt: string
  updatedAt: string
}

export interface Song {
  id: number
  title: string
  artistId: number
  albumId: number
  duration: number
  genre: string
  releaseYear: number
  filePath: string
  coverArt?: string
  playCount: number
  rating?: number
  album?: Album
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
}

export interface Playlist {
  id: number
  name: string
  description?: string
  userId: number
  coverArt?: string
  createdAt: string
  updatedAt: string
}
