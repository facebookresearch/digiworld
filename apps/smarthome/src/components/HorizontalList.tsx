import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { Text, useAppTheme } from '@andojo/shared-theme'
import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'

import { translate } from '@/i18n/translate'

type Item = {
  id: number
  title?: string
  name?: string
  artistId?: number
  artistName?: string
  monthlyListeners?: number
  songIds?: number[]
}

interface Props {
  type: 'artists' | 'albums' | 'songs' | 'playlists'
  data: Item[]
  onItemPress: (id: number) => void
  onPlayPress?: (id: number) => void
  getArtistName?: (artistId: number) => string | undefined
}

// const getEntityType = (type: Props["type"]): EntityType => {
//   switch (type) {
//     case "artists":
//       return EntityType.ARTISTS
//     case "albums":
//       return EntityType.ALBUMS
//     case "songs":
//       return EntityType.SONGS
//     case "playlists":
//       return EntityType.PLAYLISTS
//     default:
//       return EntityType.SONGS
//   }
// }

export const HorizontalList: React.FC<Props> = ({
  type,
  data,
  onItemPress,
  onPlayPress,
  getArtistName,
}) => {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: 5,
        },
        item: {
          marginRight: 16,
        },
        playButton: {
          bottom: 70,
          position: 'absolute',
          right: 0,
        },
        subtitle: {
          color: theme.colors.textDim,
          fontSize: 12,
        },
        textContainer: {
          flex: 1,
        },
        title: {
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: '500',
          marginBottom: 4,
        },
      }),
    [theme],
  )

  const renderItem = ({ item }: { item: Item }) => {
    const imageSize = type === 'artists' ? 120 : 140
    // const entityType = getEntityType(type)

    let subtitle = ''
    if (type === 'artists' && item.monthlyListeners) {
      // @ts-ignore
      subtitle = translate('library.details.monthlyListeners', {
        // count: formatNumber(item.monthlyListeners),
      })
    } else if ((type === 'albums' || type === 'playlists') && item.songIds) {
      subtitle = `${item.songIds.length} ${translate(item.songIds.length === 1 ? 'library.song' : 'library.songs')}`
    } else if (type === 'songs' && item.artistId && getArtistName) {
      subtitle = getArtistName(item.artistId) || ''
    }

    // const imageStyle: ImageStyle = {
    //   width: imageSize,
    //   height: imageSize,
    //   borderRadius: type === "artists" ? imageSize / 2 : 4,
    // }

    return (
      <TouchableOpacity
        style={[styles.item, { width: imageSize }]}
        onPress={() => onItemPress(item.id)}
      >
        {/* <MusicImage style={imageStyle} entityType={entityType} entityId={item.id.toString()} /> */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {onPlayPress && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlayPress(item.id)}
          >
            <Ionicons
              name="play-circle"
              size={32}
              color={theme.colors.palette.success500}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      renderItem={renderItem}
      keyExtractor={(item: Item) => String(item.id)}
      contentContainerStyle={styles.container}
    />
  )
}
