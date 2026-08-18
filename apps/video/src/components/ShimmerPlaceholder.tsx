import { View, StyleSheet, Dimensions, Platform } from 'react-native'
import { useTheme } from '@andojo/shared-theme'
import Shimmer from 'react-native-shimmer'

const { width } = Dimensions.get('window')

interface ShimmerPlaceholderProps {
  width?: number
  height?: number
  borderRadius?: number
  style?: any
}

export function ShimmerPlaceholder({
  width: customWidth,
  height,
  borderRadius = 12,
  style,
}: ShimmerPlaceholderProps) {
  const { theme } = useTheme()

  return (
    <Shimmer
      animating={true}
      style={[
        {
          width: customWidth || width,
          height,
          borderRadius,
          backgroundColor: theme.colors.palette.neutral400,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            width: customWidth || width,
            height,
            borderRadius,
            backgroundColor: theme.colors.palette.neutral400,
            opacity: 0.6,
          },
          style,
        ]}
      />
    </Shimmer>
  )
}

export function VideoCardSkeleton() {
  const { theme } = useTheme()
  const cardWidth = width - 32

  return (
    <View
      style={[
        styles.videoCardSkeleton,
        { backgroundColor: theme.colors.palette.neutral400 },
      ]}
    >
      <ShimmerPlaceholder
        width={cardWidth}
        height={(cardWidth * 9) / 16}
        borderRadius={16}
      />
      <View style={styles.videoCardContent}>
        <ShimmerPlaceholder width={40} height={40} borderRadius={20} />
        <View style={styles.videoCardInfo}>
          <ShimmerPlaceholder
            width={cardWidth - 120}
            height={16}
            borderRadius={8}
          />
          <View style={styles.videoCardMetadata}>
            <ShimmerPlaceholder width={140} height={14} borderRadius={6} />
            <ShimmerPlaceholder width={100} height={14} borderRadius={6} />
          </View>
        </View>
        <ShimmerPlaceholder width={32} height={32} borderRadius={8} />
      </View>
    </View>
  )
}

export function ChannelRowSkeleton() {
  return (
    <View style={styles.channelRowSkeleton}>
      <View style={styles.channelInfo}>
        <ShimmerPlaceholder width={50} height={50} borderRadius={25} />
        <View style={styles.channelDetails}>
          <ShimmerPlaceholder width={150} height={16} />
          <ShimmerPlaceholder width={100} height={14} />
        </View>
      </View>
      <View style={styles.latestVideo}>
        <ShimmerPlaceholder width={120} height={68} borderRadius={8} />
        <View style={styles.videoInfo}>
          <ShimmerPlaceholder width={180} height={14} />
          <ShimmerPlaceholder width={80} height={12} />
        </View>
      </View>
    </View>
  )
}

export function LibraryItemSkeleton() {
  return (
    <View style={styles.libraryItemSkeleton}>
      <ShimmerPlaceholder width={24} height={24} borderRadius={4} />
      <View style={styles.libraryItemText}>
        <ShimmerPlaceholder width={120} height={16} />
        <ShimmerPlaceholder width={80} height={14} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  videoCardSkeleton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  videoCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  videoCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoCardMetadata: {
    marginTop: 8,
    gap: 6,
  },
  channelRowSkeleton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  latestVideo: {
    flexDirection: 'row',
    marginLeft: 62,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    gap: 4,
  },
  libraryItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  libraryItemText: {
    marginLeft: 16,
    flex: 1,
    gap: 4,
  },
})
