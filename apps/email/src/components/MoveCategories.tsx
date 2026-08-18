// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useEffect, useState } from 'react'
import { Text } from './Text'
import {
  Modal,
  TouchableOpacity,
  View,
  Animated,
  StyleSheet,
} from 'react-native'
import { CategoriesView } from './CategoriesView'
import { createCommonStyles } from './commonStyles'
import { colors, useAppTheme } from '@andojo/shared-theme'
import { useToast } from './Toast'
import { mutations } from '@/db/mutations'
import { MailFolder } from '@/models/EmailModel'
import { useStores } from '@/models'
import { observer } from 'mobx-react-lite'

interface MoveCategoriesView {
  showCategories: boolean
  email: any
  refreshData?: (val: MailFolder) => void
}

export const MoveCategories = observer(function MoveCategories({
  showCategories,
  email,
  refreshData,
}: MoveCategoriesView) {
  const toast = useToast()
  const { theme } = useAppTheme()
  const commonStyles = React.useMemo(() => createCommonStyles(theme), [theme])
  const { uiStore } = useStores()
  const [selCategories, setSelCategories] = useState<string[]>([])

  useEffect(() => {
    if (showCategories) {
      setSelCategories([...(email?.labels || [])])
    }
  }, [showCategories, email])

  const onClose = () => {
    uiStore.setEmailMoveCategoriesOpen(null)
  }

  const setSelection = (item: string) => {
    const vals = [...selCategories]
    const index = vals.indexOf(item)

    if (index === -1) {
      vals.push(item)
    } else {
      vals.splice(index, 1)
    }

    setSelCategories([...vals])
  }

  const onConfirm = async () => {
    try {
      const result = await mutations.updateEmailLabels(
        parseInt(email.id),
        JSON.stringify(selCategories),
      )
      uiStore.setEmailMoveCategoriesOpen(null)

      if (refreshData) {
        refreshData(email.folder)
      }

      if (result.success) {
        toast.show({
          title: 'Updated categories successfully',
          preset: 'success',
          placement: 'top',
          duration: 2000,
        })
      } else {
        throw new Error('Failed to update categories')
      }
    } catch {
      toast.show({
        title: 'Failed to update categories',
        preset: 'error',
        placement: 'bottom',
        duration: 3000,
      })
    }
  }

  return (
    <>
      <Modal transparent visible={showCategories} animationType="fade">
        {/* close on backdrop press */}
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose}>
          <View style={styles.menuItems}>
            <Animated.View style={commonStyles.dialog}>
              <Text
                text="Update Categories"
                style={styles.labelText}
                preset="subheading"
              />
              <CategoriesView
                selectedCategories={selCategories}
                setSelection={setSelection}
                isUpdateView={true}
              />

              <View style={commonStyles.buttonContainer}>
                <TouchableOpacity
                  style={[commonStyles.button, commonStyles.cancelButton]}
                  onPress={() => {
                    onClose()
                  }}
                >
                  <Text text="Close" style={commonStyles.buttonText} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[commonStyles.button, commonStyles.confirmButton]}
                  onPress={onConfirm}
                >
                  <Text
                    text="Apply"
                    style={[
                      commonStyles.buttonText,
                      commonStyles.confirmButtonText,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
})

const styles = StyleSheet.create({
  menuItems: {
    alignItems: 'center',
    backgroundColor: colors.palette.overlay50,
    flex: 1,
    justifyContent: 'center',
  },
  labelText: {
    marginBottom: 20,
  },
})
