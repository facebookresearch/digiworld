import React, { useEffect, useRef, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
} from 'react-native'
import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet'
import { useStores } from '@/models'
import { IPromoCode } from '@/models/PromoStore'
import {
  useAppTheme,
  type Theme,
  spacing,
  typography,
} from '@andojo/shared-theme'
import Modal from 'react-native-modal'

interface PromoCodeSheetProps {
  showModalBottomSheet: boolean
  setShowModalBottomSheet: React.Dispatch<boolean>
  onModalClose?: () => void
  bottomSheetRef: React.RefObject<BottomSheet>
  onApply: (promoCode: IPromoCode) => void
  isVisible: boolean
}
interface Section {
  title: string
  data: IPromoCode[]
}

export const PromoCodeSheet = observer(
  ({
    onApply,
    isVisible,
    showModalBottomSheet,
    onModalClose,
  }: PromoCodeSheetProps) => {
    const { theme } = useAppTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const { promoStore } = useStores()
    const { general, categorized } = promoStore.categorizedPromoCodes
    const bottomSheetModalRef = useRef<BottomSheetModal>(null)
    useEffect(() => {
      // When showOptimizedOffer is true then open the bottom-sheet modal
      if (showModalBottomSheet && bottomSheetModalRef.current) {
        setTimeout(() => {
          bottomSheetModalRef.current?.present()
        }, 2000)
      }
    }, [showModalBottomSheet, bottomSheetModalRef, onModalClose])

    const sections: Section[] = [
      {
        title: 'General Offers',
        data: general,
      },
      ...Object.entries(categorized).map(([category, promos]) => ({
        title: `${category} Offers`,
        data: promos,
      })),
    ]

    const renderItem = ({ item }: { item: IPromoCode }) => (
      <TouchableOpacity
        style={styles.promoItem}
        onPress={() => {
          onApply(item)
          bottomSheetModalRef.current?.dismiss()
        }}
      >
        <View style={styles.promoHeader}>
          <Text style={styles.promoCode}>{item.code}</Text>
          {item.isFirstOrderOnly && (
            <View style={styles.firstOrderBadge}>
              <Text style={styles.badgeText}>First Order Only</Text>
            </View>
          )}
        </View>
        <Text style={styles.promoDescription}>{item.description}</Text>
        <Text style={styles.promoTerms}>
          Min. order ${item.minPurchase} • Max discount ${item.maxDiscount}
        </Text>
      </TouchableOpacity>
    )

    const renderSectionHeader = ({ section }: { section: Section }) => (
      <Text style={styles.sectionTitle}>{section.title}</Text>
    )

    if (!isVisible) return null

    return (
      <Modal
        isVisible={showModalBottomSheet}
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideInDown"
        onBackButtonPress={() => {
          bottomSheetModalRef.current?.dismiss()
          onModalClose?.()
        }}
        onBackdropPress={() => {
          bottomSheetModalRef.current?.dismiss()
          onModalClose?.()
        }}
        style={styles.modalContainer}
      >
        <BottomSheetModalProvider>
          <View style={styles.bottomSheetBackground}>
            <Text style={styles.title}>Available Promo Codes</Text>
            <SectionList
              sections={sections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              keyExtractor={item => item.code}
            />
          </View>
        </BottomSheetModalProvider>
      </Modal>
    )
  },
)

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalContainer: {
      padding: 0,
      margin: 0,
    },
    bottomSheetBackground: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      height: '70%',
      marginTop: 250,
    },
    container: {
      flex: 1,
      padding: spacing.md,
    },
    title: {
      fontFamily: typography.fonts.spaceGrotesk.semiBold,
      fontSize: 24,
      marginBottom: spacing.md,
      color: theme.colors.text,
    },
    sectionTitle: {
      fontFamily: typography.fonts.spaceGrotesk.medium,
      fontSize: 18,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      color: theme.colors.textDim,
    },
    listContent: {
      paddingBottom: spacing.sm,
    },
    promoItem: {
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    promoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    promoCode: {
      fontFamily: typography.fonts.courier.normal,
      fontSize: 16,
      color: theme.colors.tint,
      fontWeight: '600',
    },
    firstOrderBadge: {
      backgroundColor: theme.colors.palette.primary100,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    badgeText: {
      fontFamily: typography.fonts.spaceGrotesk.medium,
      color: theme.colors.tint,
      fontSize: 12,
    },
    promoDescription: {
      fontFamily: typography.fonts.spaceGrotesk.normal,
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    promoTerms: {
      fontFamily: typography.fonts.spaceGrotesk.light,
      color: theme.colors.textDim,
      fontSize: 12,
    },
  })
