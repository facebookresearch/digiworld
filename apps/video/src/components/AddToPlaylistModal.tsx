// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'
import { Text as CustomText, useTheme, useToast } from '@andojo/shared-theme'

export const AddToPlaylistModal = observer(() => {
  const { theme } = useTheme()
  const { playlistStore } = useStores()
  const toast = useToast()

  const { addToPlaylistModal } = playlistStore
  const { isVisible, selectedVideoId } = addToPlaylistModal

  const handleAddToPlaylist = async (playlistId: number) => {
    if (selectedVideoId) {
      const res = await playlistStore.addVideoToPlaylist(
        playlistId,
        selectedVideoId,
      )
      console.log(res)
      toast.show({
        title: res?.message,
        preset: res?.success ? 'success' : 'error',
        placement: 'top',
      })
      playlistStore.hideAddToPlaylistModal()
    }
  }

  const handleClose = () => {
    playlistStore.hideAddToPlaylistModal()
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.palette.neutral300 },
          ]}
        >
          <CustomText
            style={[
              styles.modalTitle,
              { color: theme.colors.palette.neutral900 },
            ]}
          >
            Add to Playlist
          </CustomText>
          <FlatList
            data={playlistStore.playlists}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.playlistItem,
                  { borderBottomColor: theme.colors.palette.neutral600 },
                ]}
                onPress={() => handleAddToPlaylist(item.id)}
              >
                <CustomText
                  style={[
                    styles.playlistItemText,
                    { color: theme.colors.palette.neutral900 },
                  ]}
                >
                  {item.name}
                </CustomText>
              </TouchableOpacity>
            )}
            keyExtractor={(item: any) => item.id.toString()}
            style={styles.playlistList}
          />
          <TouchableOpacity
            style={[
              styles.modalButton,
              styles.cancelButton,
              { backgroundColor: theme.colors.palette.primary200 },
            ]}
            onPress={handleClose}
          >
            <CustomText
              style={[
                styles.buttonTextLight,
                { color: theme.colors.palette.neutral200 },
              ]}
            >
              Cancel
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
})

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {},
  buttonTextLight: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  playlistList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  playlistItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  playlistItemText: {
    fontSize: 16,
  },
})
