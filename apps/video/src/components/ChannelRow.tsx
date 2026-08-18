import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Text, useTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import LinearGradient from 'react-native-linear-gradient'
import { useRouter } from 'expo-router'
import { ImagePlaceholder } from './ImagePlaceholder'
import { VideoThumbnailImage } from './VideoImage'

interface ChannelRowProps {
  channel: {
    id: string
    name: string
    avatar: string
    subscribers: string
    description?: string
    isLive?: boolean
    latestVideo?: {
      title: string
      uploadTime: string
      thumbnail: string
    }
  }
}

export function ChannelRow({ channel }: ChannelRowProps) {
  const { theme } = useTheme()
  const router = useRouter()

  const handlePress = () => {
    if (channel.id) {
      router.push(`/channel/${channel.id}`)
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.palette.neutral300 },
      ]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* Channel Info */}
      <View style={styles.channelInfo}>
        <View style={styles.avatarContainer}>
          <ImagePlaceholder
            width={52}
            height={52}
            borderRadius={26}
            type="avatar"
            fallbackText={channel.name}
          />
          <View
            style={[
              styles.avatarBorder,
              { borderColor: theme.colors.palette.primary200 },
            ]}
          />
        </View>

        <View style={styles.channelDetails}>
          <View style={styles.channelHeader}>
            <Text
              style={[styles.channelName, { color: theme.colors.text }]}
              text={channel.name}
              numberOfLines={1}
            />
            {channel.isLive && (
              <LinearGradient
                colors={[
                  theme.colors.palette.angry100,
                  theme.colors.palette.angry300,
                ]}
                style={[
                  styles.liveBadge,
                  Platform.OS === 'ios' && {
                    shadowColor: theme.colors.palette.angry100,
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.liveIndicator}>
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: theme.colors.palette.neutral900 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveText,
                      { color: theme.colors.palette.neutral900 },
                    ]}
                    text="LIVE"
                  />
                </View>
              </LinearGradient>
            )}
          </View>

          <View style={styles.subscriberRow}>
            <Ionicons
              name="people-outline"
              size={14}
              color={theme.colors.palette.neutral700}
            />
            <Text
              style={[
                styles.subscribers,
                { color: theme.colors.palette.neutral700 },
              ]}
              text={`${channel.subscribers} subscribers`}
            />
          </View>

          {channel.description && (
            <Text
              style={[styles.description, { color: theme.colors.text }]}
              text={channel.description}
              numberOfLines={2}
            />
          )}
        </View>
      </View>

      {/* Latest Video (Optional) */}
      {channel.latestVideo && (
        <View style={styles.latestVideo}>
          <View style={styles.thumbnailContainer}>
            <VideoThumbnailImage
              entityId={channel.id}
              style={{
                width: 120,
                height: 68,
                borderRadius: 12,
              }}
              thumbnailUrl={channel.latestVideo.thumbnail}
            />
            <LinearGradient
              colors={['transparent', theme.colors.palette.overlay50]}
              style={styles.thumbnailOverlay}
            />
          </View>

          <View style={styles.videoInfo}>
            <Text
              style={[styles.videoTitle, { color: theme.colors.text }]}
              text={channel.latestVideo.title}
              numberOfLines={2}
            />
            <View style={styles.uploadTimeRow}>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.colors.palette.neutral700}
              />
              <Text
                style={[
                  styles.uploadTime,
                  { color: theme.colors.palette.neutral700 },
                ]}
                text={channel.latestVideo.uploadTime}
              />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    opacity: 0.3,
  },
  channelDetails: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  channelName: {
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
    flex: 1,
  },
  liveBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subscriberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscribers: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 13,
    marginTop: 4,
  },
  latestVideo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  uploadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadTime: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
})
