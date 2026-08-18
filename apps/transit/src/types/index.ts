export interface Song {
  id: string
  title: string
  duration: number
  artist?: Artist
  album?: Album
}

export interface Artist {
  id: string
  name: string
  monthlyListeners: number
  image?: string
}

export interface Album {
  id: string
  title: string
  artist: Artist
  songs: Song[]
  image?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  songs: Song[]
  image?: string
  createdAt: Date
  updatedAt: Date
}

export type SearchResults = {
  songs: Song[]
  artists: Artist[]
  albums: Album[]
  playlists: Playlist[]
}
