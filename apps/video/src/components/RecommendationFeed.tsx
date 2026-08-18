import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ListRenderItem,
} from 'react-native'
import { useTheme } from '@andojo/shared-theme'
import { VideoCard } from '@/components'

const { width: screenWidth } = Dimensions.get('window')
const CARD_WIDTH = screenWidth * 0.7 // 70% of screen width
const CARD_SPACING = 12

interface Video {
  id: string
  title: string
  channelName: string
  views: string
  uploadTime: string
  duration: string
  viewCount: number
  thumbnailUrl: string
  channelAvatar: string
}

interface RecommendationFeedProps {
  title: string
  videos: Video[]
  onVideoPress?: (video: Video) => void
  onSeeAll?: () => void
}

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({
  title,
  videos,
  onVideoPress,
  onSeeAll,
}) => {
  const { theme } = useTheme()

  const renderVideoItem: ListRenderItem<Video> = ({ item, index }) => (
    <View
      style={[
        styles.videoCardContainer,
        index === 0 && styles.firstItem,
        index === videos.length - 1 && styles.lastItem,
      ]}
    >
      <VideoCard
        video={item}
        onPress={() => onVideoPress?.(item)}
        width={CARD_WIDTH}
      />
    </View>
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text
            style={[
              styles.seeAllText,
              { color: theme.colors.palette.primary100 },
            ]}
          >
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (videos.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={item => `${title}-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
      />
    </View>
  )
}

// Alternative component for 2-row horizontal carousel
export const RecommendationFeedTwoRow: React.FC<RecommendationFeedProps> = ({
  title,
  videos,
  onVideoPress,
  onSeeAll,
}) => {
  const { theme } = useTheme()
  const SMALL_CARD_WIDTH = screenWidth * 0.45 // Smaller cards for 2-row layout

  // Split videos into pairs for 2-row display
  const videoPairs = videos.reduce<Video[][]>((pairs, video, index) => {
    if (index % 2 === 0) {
      pairs.push([video])
    } else {
      pairs[pairs.length - 1].push(video)
    }
    return pairs
  }, [])

  const renderVideoPair: ListRenderItem<Video[]> = ({ item: pair, index }) => (
    <View
      style={[
        styles.pairContainer,
        { width: SMALL_CARD_WIDTH },
        index === 0 && styles.firstItem,
        index === videoPairs.length - 1 && styles.lastItem,
      ]}
    >
      {pair.map((video, pairIndex) => (
        <View
          key={video.id}
          style={[styles.smallVideoCard, pairIndex === 0 && styles.topCard]}
        >
          <VideoCard
            video={video}
            onPress={() => onVideoPress?.(video)}
            width={SMALL_CARD_WIDTH}
            hidePlaylistMenu={false}
          />
        </View>
      ))}
    </View>
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text
            style={[
              styles.seeAllText,
              { color: theme.colors.palette.primary100 },
            ]}
          >
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (videos.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={videoPairs}
        renderItem={renderVideoPair}
        keyExtractor={(item, index) => `${title}-pair-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={SMALL_CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={4}
        initialNumToRender={2}
        getItemLayout={(data, index) => ({
          length: SMALL_CARD_WIDTH + CARD_SPACING,
          offset: (SMALL_CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  videoCardContainer: {
    marginRight: CARD_SPACING,
  },
  firstItem: {
    marginLeft: 0,
  },
  lastItem: {
    marginRight: 16,
  },

  // Two-row specific styles
  pairContainer: {
    marginRight: CARD_SPACING,
    justifyContent: 'space-between',
  },
  smallVideoCard: {
    marginBottom: 8,
    flex: 1,
  },
  topCard: {
    marginBottom: 8,
  },
})

export default RecommendationFeed
