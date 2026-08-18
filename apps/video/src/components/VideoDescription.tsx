import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, useTheme, useToast } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { useStores } from '@/models/helpers/useStores'

interface VideoDescriptionProps {
  video: {
    id: number
    title: string
    description?: string
    viewCount: number
    createdAt: string
    likeCount?: number
    channelId: number
  }
  channel: {
    id: number
    name: string
    subscriberCount?: number
    userId: number
  } | null
  isLiked: boolean
  likeCount: number
  onLikePress: () => void
}

export function VideoDescription({
  video,
  channel,
  isLiked,
  likeCount,
  onLikePress,
}: VideoDescriptionProps) {
  const { theme } = useTheme()
  const { userStore } = useStores()
  const router = useRouter()
  const toast = useToast()
  const [showFullDescription] = useState(true)

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }

  const handleLikePress = () => {
    if (!userStore.isAuthenticated) {
      toast.show({
        preset: 'error',
        title: 'You need to login to like this video',
        placement: 'top',
      })
      return
    }
    onLikePress()
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Video Title */}
      <Text
        style={[styles.title, { color: theme.colors.text }]}
        text={video.title}
        numberOfLines={2}
      />

      {/* Video Stats */}
      <View style={styles.statsRow}>
        <Text
          style={[styles.stats, { color: theme.colors.palette.neutral700 }]}
          text={`${formatViewCount(video.viewCount)} views • ${formatDate(video.createdAt)}`}
        />
      </View>

      {/* Channel Info with Like Button */}
      <View style={styles.channelContainer}>
        <TouchableOpacity
          style={styles.channelInfo}
          onPress={() => {
            if (channel?.id) {
              router.push(`/channel/${channel.id}`)
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.channelAvatar}>
            <Text style={styles.channelInitial}>
              {channel?.name?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.channelDetails}>
            <Text
              style={[styles.channelName, { color: theme.colors.text }]}
              text={channel?.name || 'Unknown Channel'}
              numberOfLines={1}
            />
            <Text
              style={[
                styles.subscriberCount,
                { color: theme.colors.palette.neutral700 },
              ]}
              text={`${formatViewCount(channel?.subscriberCount || 0)} subscribers`}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.likeButton,
            { backgroundColor: theme.colors.palette.neutral200 },
          ]}
          onPress={handleLikePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={
              isLiked ? theme.colors.palette.primary200 : theme.colors.text
            }
          />
          <Text
            style={[
              styles.likeText,
              {
                color: isLiked
                  ? theme.colors.palette.primary200
                  : theme.colors.text,
              },
            ]}
            text={formatViewCount(likeCount)}
          />
        </TouchableOpacity>

        {/* Subscribe Button - Commented out for now */}
        {/*
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: theme.colors.palette.primary200 }
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.subscribeText, { color: 'white' }]}
            text="Subscribe"
          />
        </TouchableOpacity>
        */}
      </View>

      {/* Video Description */}
      {video.description && video.description.trim().length > 0 && (
        <View
          style={[
            styles.descriptionContainer,
            { backgroundColor: theme.colors.palette.neutral200 },
          ]}
        >
          <Text
            style={[styles.description, { color: theme.colors.text }]}
            text={video.description}
            numberOfLines={showFullDescription ? undefined : 3}
          />
          {/* {video.description.length > 150 && (
            <TouchableOpacity
              onPress={() => setShowFullDescription(!showFullDescription)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.showMoreText,
                  { color: theme.colors.palette.neutral700 },
                ]}
                text={showFullDescription ? 'Show less' : 'Show more'}
              />
            </TouchableOpacity>
          )} */}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 8,
  },
  statsRow: {
    marginBottom: 16,
  },
  stats: {
    fontSize: 14,
    fontWeight: '400',
  },
  channelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelDetails: {
    marginLeft: 12,
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 13,
    fontWeight: '400',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  likeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  subscribeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  subscribeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionContainer: {
    padding: 12,
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  channelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28, 98, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
})
