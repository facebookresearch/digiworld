// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
} from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import { useStores } from '@/models'
import { IPromoCode } from '@/models/PromoStore'
import { spacing, useAppTheme } from '@andojo/shared-theme'
import Modal from 'react-native-modal'
import LinearGradient from 'react-native-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'

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
    console.log('📋 PromoCodeSheet props:', { isVisible, showModalBottomSheet })

    const { promoStore } = useStores()
    const { theme } = useAppTheme()
    const { general, categorized } = promoStore.categorizedPromoCodes
    const styles = useMemo(() => createStyles(theme), [theme])

    console.log('📦 Promo codes loaded:', {
      generalCount: general.length,
      categorizedCount: Object.keys(categorized).length,
    })

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
          onModalClose?.()
        }}
      >
        <LinearGradient
          colors={[
            theme.colors.card || '#FFFFFF',
            theme.colors.backgroundSecondary || '#FEFEFE',
          ]}
          style={styles.promoItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.promoHeader}>
            <View style={styles.promoCodeContainer}>
              <LinearGradient
                colors={[
                  theme.colors.palette.accent500,
                  theme.colors.palette.accent600,
                ]}
                style={styles.promoCodeBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="local-offer" size={16} color="#FFF" />
                <Text style={styles.promoCode}>{item.code}</Text>
              </LinearGradient>
              {item.isFirstOrderOnly && (
                <LinearGradient
                  colors={[
                    theme.colors.palette.secondary500,
                    theme.colors.palette.secondary600,
                  ]}
                  style={styles.firstOrderBadge}
                >
                  <Text style={styles.badgeText}>First Order</Text>
                </LinearGradient>
              )}
            </View>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={theme.colors.palette.primary500}
            />
          </View>

          <Text style={styles.promoDescription}>{item.description}</Text>

          <View style={styles.promoTermsContainer}>
            <View style={styles.termItem}>
              <MaterialIcons
                name="shopping-cart"
                size={14}
                color={theme.colors.palette.secondary500}
              />
              <Text style={styles.promoTerms}>Min. ${item.minPurchase}</Text>
            </View>
            <View style={styles.termItem}>
              <MaterialIcons
                name="savings"
                size={14}
                color={theme.colors.palette.success500}
              />
              <Text style={styles.promoTerms}>Max. ${item.maxDiscount}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )

    const renderSectionHeader = ({ section }: { section: Section }) => (
      <View style={styles.sectionHeaderContainer}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ]}
          style={styles.sectionHeaderGradient}
        >
          <MaterialIcons
            name="local-offer"
            size={20}
            color={theme.colors.palette.primary600}
          />
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </LinearGradient>
      </View>
    )

    if (!isVisible) return null

    return (
      <Modal
        isVisible={showModalBottomSheet}
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackButtonPress={() => {
          console.log('📱 Back button pressed')
          onModalClose?.()
        }}
        onBackdropPress={() => {
          console.log('👆 Backdrop pressed')
          onModalClose?.()
        }}
        style={styles.modalContainer}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
      >
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ]}
          style={styles.bottomSheetBackground}
        >
          {/* Modern Header */}
          <View
            style={[
              styles.sheetHeader,
              { backgroundColor: theme.colors.palette.primary300 },
            ]}
          >
            <View style={styles.headerContent}>
              <MaterialIcons
                name="local-offer"
                size={24}
                color={theme.colors.palette.neutral900}
              />
              <Text style={styles.title}>Available Promo Codes</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                onModalClose?.()
              }}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={theme.colors.palette.neutral900}
              />
            </TouchableOpacity>
          </View>

          <SectionList
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            keyExtractor={item => item.code}
            showsVerticalScrollIndicator={false}
          />
        </LinearGradient>
      </Modal>
    )
  },
)

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalContainer: {
      padding: 0,
      margin: 0,
    },
    bottomSheetBackground: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '75%',
      marginTop: '25%',
    },

    // Header Styles
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    // Section Header
    sectionHeaderContainer: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      marginHorizontal: spacing.md,
    },
    sectionHeaderGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.primary600,
    },

    // List Content
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },

    // Promo Item
    promoItem: {
      borderRadius: 16,
      marginBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    promoItemGradient: {
      borderRadius: 16,
      padding: spacing.md,
    },
    promoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    promoCodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    promoCodeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      gap: 4,
    },
    promoCode: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    firstOrderBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
    },
    promoDescription: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    promoTermsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    termItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    promoTerms: {
      fontSize: 12,
      color: theme.colors.textDim,
      fontWeight: '500',
    },
  })
