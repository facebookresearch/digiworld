import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native'
import { Text, useToast } from '@andojo/shared-theme'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { VideoThumbnailImage } from './VideoImage'

// Removed global width since we calculate it per component

interface VideoCardProps {
  video: {
    id: number | string
    title: string
    channelName?: string
    channelId?: number
    views?: string
    uploadTime?: string
    duration?: number | string
    thumbnail?: string
    channelAvatar?: string
    viewCount?: number
    thumbnailUrl?: string
    createdAt?: string
  }
  onPress?: () => void
  width?: number
  hidePlaylistMenu?: boolean
}

export const VideoCard = observer(
  ({ video, onPress, width, hidePlaylistMenu = false }: VideoCardProps) => {
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
      if (userStore?.user?.id) {
        e.stopPropagation()
        playlistStore.showAddToPlaylistModal(Number(video.id))
      } else {
        toast.show({
          preset: 'error',
          title: 'You need to login before adding this to playlist',
          placement: 'top',
        })
      }
    }

    const handleChannelPress = (e: any) => {
      e.stopPropagation()
      if (video.channelId) {
        router.push(`/channel/${video.channelId}`)
      }
    }

    const cardWidth = width || Dimensions.get('window').width / 2.3
    const cardHeight = cardWidth * (3 / 4)

    const formatDuration = (seconds?: number | string) => {
      if (!seconds) return '0:00'
      if (typeof seconds === 'string') return seconds
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatViews = (count?: number) => {
      if (!count) return '0'
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
      return count.toString()
    }

    return (
      <TouchableOpacity
        style={[styles.container, { width: cardWidth }]}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        <View style={[styles.imageContainer, { height: cardHeight }]}>
          <VideoThumbnailImage
            entityId={video.id}
            style={styles.thumbnail}
            thumbnailUrl={video.thumbnail}
          />

          {/* Gradient behind content */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* More options button */}
          {!hidePlaylistMenu && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={handleMorePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Text content overlay */}
          <View style={styles.textOverlay}>
            <Text style={styles.title} numberOfLines={2}>
              {video.title}
            </Text>

            <View style={styles.channelRow}>
              <TouchableOpacity
                style={styles.channelAvatar}
                onPress={handleChannelPress}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.channelInitial}>
                  {video?.channelName?.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
              <View style={styles.metaRow}>
                <TouchableOpacity
                  onPress={handleChannelPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Text style={styles.channelMetaText} numberOfLines={1}>
                    {video.channelName} • {formatViews(video.viewCount)} views
                  </Text>
                </TouchableOpacity>
                <View style={styles.durationContainer}>
                  <Ionicons name="time-outline" size={10} color="#fff" />
                  <Text style={styles.durationText}>
                    {formatDuration(video.duration)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1c62ff',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#ccc',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  moreButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(28, 98, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  channelMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})
