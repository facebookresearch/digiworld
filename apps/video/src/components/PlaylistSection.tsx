import React, { useMemo, useEffect, useState, useRef } from 'react'
import { View, StyleSheet, FlatList, Pressable } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { VideoThumbnailImage } from './VideoImage'
import { useStores } from '@/models'

interface PlaylistSectionProps {
  playlist?: {
    id: number
    name: string
    videoIds: number[]
  }
  videos: {
    id: number
    title: string
    duration: number
    viewCount: number
    thumbnailUrl?: string
  }[]
  currentVideoId: number
  onVideoPress: (videoId: number) => void
  mode?: 'playlist' | 'recommended'
  title?: string
  recommendedVideoIds?: number[]
  onRecommendationsGenerated?: (videoIds: number[]) => void
}

export const PlaylistSection = observer(
  ({
    playlist,
    videos,
    currentVideoId,
    onVideoPress,
    mode = 'playlist',
    title,
    recommendedVideoIds = [],
    onRecommendationsGenerated,
  }: PlaylistSectionProps) => {
    const { theme } = useTheme()
    const { videoStore } = useStores()
    const [localGeneratedIds, setLocalGeneratedIds] = useState<number[]>([])
    const lastVideoIdRef = useRef<number | null>(null)

    // Generate recommendations in useEffect to avoid state updates during render
    useEffect(() => {
      if (
        mode === 'recommended' &&
        recommendedVideoIds.length === 0 &&
        videos.length > 0 &&
        onRecommendationsGenerated &&
        currentVideoId !== lastVideoIdRef.current
      ) {
        const availableVideos = videos.filter(v => v.id !== currentVideoId)
        if (availableVideos.length > 0) {
          const shuffled = [...availableVideos].sort(() => Math.random() - 0.5)
          const count = Math.floor(Math.random() * 6) + 5 // Random 5-10 videos
          const selectedVideos = shuffled.slice(0, count)
          const selectedIds = selectedVideos.map(v => v.id)
          lastVideoIdRef.current = currentVideoId
          setLocalGeneratedIds(selectedIds)
          // Call callback after render completes - this updates store state
          // Using setTimeout to ensure it's after the current render cycle
          setTimeout(() => {
            onRecommendationsGenerated(selectedIds)
          }, 0)
        }
      } else if (recommendedVideoIds.length > 0) {
        // Clear local state when store has values
        setLocalGeneratedIds([])
      }
    }, [
      mode,
      recommendedVideoIds.length,
      videos.length,
      currentVideoId,
      onRecommendationsGenerated,
    ])

    // Get videos based on mode
    const displayVideos = useMemo(() => {
      if (mode === 'playlist' && playlist) {
        return videoStore.playbackState.playlistOrder
          .map(videoId => videos.find(v => v.id === videoId))
          .filter(Boolean)
      } else {
        // For recommended mode, use stored IDs if available, otherwise use local generated ones
        const idsToUse =
          recommendedVideoIds.length > 0
            ? recommendedVideoIds
            : localGeneratedIds

        if (idsToUse.length > 0) {
          return idsToUse
            .map(videoId => videos.find(v => v.id === videoId))
            .filter(Boolean)
        }

        // Fallback: return empty array if no recommendations yet
        return []
      }
    }, [
      mode,
      playlist,
      videos,
      currentVideoId,
      recommendedVideoIds,
      localGeneratedIds,
    ])

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

    const renderVideoItem = ({ item, index }: { item: any; index: number }) => {
      const isCurrentVideo = item.id === currentVideoId

      return (
        <Pressable
          style={[
            styles.videoItem,
            { backgroundColor: theme.colors.palette.neutral300 },
            isCurrentVideo && {
              backgroundColor: theme.colors.palette.primary100,
              borderLeftWidth: 3,
              borderLeftColor: theme.colors.palette.primary200,
            },
          ]}
          onPress={() => onVideoPress(item.id)}
        >
          {mode === 'playlist' && (
            <View style={styles.indexContainer}>
              <Text
                style={[
                  styles.indexText,
                  {
                    color: isCurrentVideo
                      ? theme.colors.palette.neutral900
                      : theme.colors.palette.neutral600,
                  },
                ]}
              >
                {index + 1}
              </Text>
            </View>
          )}

          <View style={styles.thumbnailContainer}>
            <VideoThumbnailImage
              entityId={item.id}
              style={styles.thumbnail}
              thumbnailUrl={item.thumbnailUrl}
            />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          </View>

          <View style={styles.videoInfo}>
            <Text
              style={[
                styles.videoTitle,
                {
                  color:
                    mode === 'recommended'
                      ? theme.colors.palette.neutral900
                      : isCurrentVideo
                        ? theme.colors.palette.neutral900
                        : theme.colors.text,
                },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text
              style={[
                styles.videoStats,
                {
                  color:
                    mode === 'recommended'
                      ? theme.colors.palette.neutral900
                      : isCurrentVideo
                        ? theme.colors.palette.neutral900
                        : theme.colors.text,
                },
              ]}
            >
              {formatViews(item.viewCount)} views
            </Text>
          </View>

          {isCurrentVideo && (
            <View style={styles.playingIndicator}>
              <Ionicons
                name="play"
                size={16}
                color={theme.colors.palette.primary200}
              />
            </View>
          )}
        </Pressable>
      )
    }

    if (displayVideos.length === 0) {
      return null
    }

    const sectionTitle =
      title || (mode === 'playlist' ? playlist?.name : 'Recommended for you')
    const iconName = mode === 'playlist' ? 'list' : 'thumbs-up'

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.palette.neutral300 },
          ]}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name={iconName}
              size={20}
              color={theme.colors.palette.primary200}
            />
            <Text style={[styles.playlistTitle, { color: theme.colors.text }]}>
              {sectionTitle}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text
              style={[
                styles.videoCount,
                { color: theme.colors.palette.neutral700 },
              ]}
            >
              {displayVideos.length} videos
            </Text>
          </View>
        </View>

        <View style={styles.videoList}>
          <FlatList
            data={displayVideos}
            renderItem={renderVideoItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoCount: {
    fontSize: 14,
  },
  videoList: {
    marginTop: 8,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  videoItem: {
    width: 200,
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    flexDirection: 'column',
  },
  indexContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  indexText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  thumbnailContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 6,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 10,
  },
  playingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 4,
  },
})
