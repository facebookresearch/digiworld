// Copyright (c) Meta Platforms, Inc. and affiliates.
import { flow, Instance, SnapshotOut, types } from 'mobx-state-tree'
import { getActivePromoCodes } from '@/db/queries'

export interface IPromoCode {
  id: number
  code: string
  description: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minPurchase: number
  maxDiscount: number
  validFrom: string
  validUntil: string
  isActive: boolean
  usageLimit: number
  usageCount: number
  isFirstOrderOnly: boolean
  applicableCategories: string[]
  termsAndConditions: string[]
}

export const PromoStore = types
  .model('PromoStore')
  .props({
    promoCodes: types.array(types.frozen<IPromoCode>()),
    selectedPromoCode: types.maybeNull(types.frozen<IPromoCode>()),
    isPromoSheetVisible: types.optional(types.boolean, false),
  })
  .views(self => ({
    get availablePromoCodes() {
      const now = new Date()
      return self.promoCodes.filter(
        promo =>
          promo.isActive &&
          new Date(promo.validFrom) <= now &&
          new Date(promo.validUntil) >= now &&
          promo.usageCount < promo.usageLimit,
      )
    },

    get categorizedPromoCodes() {
      // Group by category for better UI organization
      const general: IPromoCode[] = []
      const categorized: Record<string, IPromoCode[]> = {}

      this.availablePromoCodes.forEach(promo => {
        if (!promo.applicableCategories?.length) {
          general.push(promo)
        } else {
          promo.applicableCategories.forEach(category => {
            if (!categorized[category]) {
              categorized[category] = []
            }
            categorized[category].push(promo)
          })
        }
      })

      return { general, categorized }
    },
  }))
  .actions(self => ({
    loadPromoCodes: flow(function* () {
      try {
        const promoCodes = yield getActivePromoCodes()
        self.promoCodes = promoCodes // this is allowed now
      } catch (error) {
        console.error('Failed to load promo codes:', error)
      }
    }),

    showPromoSheet() {
      self.isPromoSheetVisible = true
    },

    hidePromoSheet() {
      self.isPromoSheetVisible = false
    },

    selectPromoCode(code: IPromoCode | null) {
      self.selectedPromoCode = code
    },
  }))
export interface PromoStoreModel extends Instance<typeof PromoStore> {}
export interface PromoStoreSnapshot extends SnapshotOut<typeof PromoStore> {}
