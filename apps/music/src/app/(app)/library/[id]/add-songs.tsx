// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SongImage } from '@/components/MusicImage'

const SongItem = observer(
  ({ song, onAdd }: { song: any; onAdd: () => void }) => {
    const { musicStore } = useStores()

    return (
      <View style={styles.songItem}>
        <SongImage entityId={song.id} style={styles.songImage} />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.songArtist}>
            {musicStore.artists.find(a => a.id === song.artistId)?.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={24} color="#1DB954" />
        </TouchableOpacity>
      </View>
    )
  },
)

export default observer(function AddSongsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { musicStore } = useStores()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const playlist = musicStore.playlists.find(p => p.id === Number(id))
  const existingSongIds = new Set(playlist?.songs?.map(s => s.id) || [])

  const filteredSongs = musicStore.songs.filter(song => {
    if (existingSongIds.has(song.id)) return false
    if (!searchQuery.trim()) return true
    return (
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      musicStore.artists
        .find(a => a.id === song.artistId)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  })

  const handleAddSong = async (songId: number) => {
    if (isAdding || !playlist) return

    try {
      setIsAdding(true)
      // TODO: Implement add song to playlist functionality in MusicStore
      await musicStore.addSongToPlaylist(playlist.id, songId)
    } catch (error) {
      console.error('Failed to add song:', error)
    } finally {
      setIsAdding(false)
    }
  }

  if (!playlist) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Songs</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#B3B3B3" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          placeholderTextColor="#B3B3B3"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#B3B3B3" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredSongs}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <SongItem song={item} onAdd={() => handleAddSong(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121719',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121719',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    height: 24,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  songImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  addButton: {
    padding: 4,
  },
})
