// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, StyleSheet, Pressable, TouchableOpacity } from 'react-native'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { VideoThumbnailImage } from './VideoImage'

interface HorizontalVideoCardProps {
  video: {
    id: number
    title: string
    description?: string
    duration: number
    viewCount: number
    thumbnailUrl?: string
    createdAt?: string
    watchedAt?: string
  }
  onPress?: () => void
  onMorePress?: () => void
  showWatchTime?: boolean
  hidePlaylistMenu?: boolean
}

export const HorizontalVideoCard = observer(
  ({
    video,
    onPress,
    onMorePress,
    showWatchTime = false,
    hidePlaylistMenu = false,
  }: HorizontalVideoCardProps) => {
    const { theme } = useTheme()
    const router = useRouter()
    const { playlistStore, userStore } = useStores()
    const toast = useToast()

    const handlePress = () => {
      if (onPress) {
        onPress()
      } else {
        router.push(`/video/${video.id}`)
      }
    }

    const handleMorePress = (e: any) => {
      e.stopPropagation()
      if (onMorePress) {
        onMorePress()
      } else {
        if (userStore?.user?.id) {
          playlistStore.showAddToPlaylistModal(video.id)
        } else {
          toast.show({
            preset: 'error',
            title: 'You need to login before adding this to playlist',
            placement: 'top',
          })
        }
      }
    }

    const formatDuration = (seconds: number) => {
      if (!seconds) return '00:00'
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')
      const secs = (seconds % 60).toString().padStart(2, '0')
      return `${mins}:${secs}`
    }

    const formatViews = (count: number): string => {
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`
      }
      return count.toString()
    }

    const formatTimeAgo = (dateString: string) => {
      // Ensure UTC if missing timezone
      const safeString = dateString.endsWith('Z')
        ? dateString
        : `${dateString}Z`
      const date = new Date(safeString)
      const now = new Date()

      const diffInMs = now.getTime() - date.getTime()
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      const diffInHours = Math.floor(diffInMinutes / 60)
      const diffInDays = Math.floor(diffInHours / 24)

      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInHours < 24) return `${diffInHours}h ago`
      if (diffInDays < 7) return `${diffInDays}d ago`
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
      return `${Math.floor(diffInDays / 30)}mo ago`
    }
    return (
      <Pressable
        style={[
          styles.container,
          { backgroundColor: theme.colors.palette.neutral400 },
        ]}
        onPress={handlePress}
      >
        <View style={styles.thumbnailContainer}>
          <VideoThumbnailImage
            entityId={video.id}
            style={styles.thumbnail}
            thumbnailUrl={video.thumbnailUrl}
          />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(video.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.videoInfo}>
          <Text
            style={[styles.videoTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {video.title}
          </Text>

          <View style={styles.videoMeta}>
            <Text
              style={[
                styles.videoStats,
                { color: theme.colors.palette.neutral700 },
              ]}
            >
              {formatViews(video.viewCount)} views
            </Text>
            {showWatchTime && video.watchedAt && (
              <Text
                style={[
                  styles.videoStats,
                  { color: theme.colors.palette.neutral700 },
                ]}
              >
                Watched {formatTimeAgo(video.watchedAt)}
              </Text>
            )}
            {!showWatchTime && video.createdAt && (
              <Text
                style={[
                  styles.videoStats,
                  { color: theme.colors.palette.neutral700 },
                ]}
              >
                {formatTimeAgo(video.createdAt)}
              </Text>
            )}
          </View>

          <Text
            style={[
              styles.videoDescription,
              { color: theme.colors.palette.neutral700 },
            ]}
            numberOfLines={2}
          >
            {video.description ?? 'No description available'}
          </Text>
        </View>

        {!hidePlaylistMenu && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleMorePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={16}
              color={theme.colors.palette.neutral600}
            />
          </TouchableOpacity>
        )}
      </Pressable>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#1c62ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  videoMeta: {
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    marginBottom: 2,
  },
  videoDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  moreButton: {
    padding: 8,
    justifyContent: 'flex-start',
  },
})
