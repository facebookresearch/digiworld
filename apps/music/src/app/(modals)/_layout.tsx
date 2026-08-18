// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Stack, usePathname } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { observer } from 'mobx-react-lite'
import { MiniPlayer } from '@/components/MiniPlayer'

export default observer(function ModalLayout() {
  const pathname = usePathname()
  // Show miniplayer only on detail pages, not on full player screen
  // Detail pages have '/detail/' in the pathname, full player screen is just /(modals)/[id]
  const showMiniPlayer = pathname.includes('/detail/')

  return (
    <>
      <Stack
        screenOptions={{
          presentation: 'modal', // makes it modal-style
          animation: 'slide_from_bottom', // smooth transition
          headerShown: false, // hide default header
          gestureEnabled: true, // allow swipe to close (if desired)
        }}
      />
      {showMiniPlayer && (
        <View style={styles.miniPlayer}>
          <MiniPlayer />
        </View>
      )}
    </>
  )
})

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: 20, // Adjusted for modal overlay (no tab bar visible)
    left: 0,
    right: 0,
    zIndex: 1000,
  },
})
