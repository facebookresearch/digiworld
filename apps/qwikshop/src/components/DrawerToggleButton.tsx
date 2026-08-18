// Copyright (c) Meta Platforms, Inc. and affiliates.
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors } from '@andojo/shared-theme'
import { useDrawerStatus } from '@react-navigation/drawer'

export const DrawerToggleButton = observer(function DrawerToggleButton() {
  const { uiStore } = useStores()
  const isDrawerOpen = useDrawerStatus() === 'open'

  const toggleDrawer = () => {
    uiStore.setDrawerOpen(!isDrawerOpen)
  }

  return (
    <Pressable onPress={toggleDrawer}>
      <MaterialCommunityIcons
        name={isDrawerOpen ? 'close' : 'menu'}
        size={24}
        color={colors.palette.neutral100}
      />
    </Pressable>
  )
})
