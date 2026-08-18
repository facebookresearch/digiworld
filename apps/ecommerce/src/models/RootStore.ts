// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotOut, types } from 'mobx-state-tree'
import { CategoryStore } from './CategoryStore'
import { ProductStore } from './ProductStore'
import { UserStore } from './UserStore'
import { CartStore } from './CartStore'
import { OrderStore } from './OrderStore'
import { UIStore } from './UIStore'
import { SessionStore } from './SessionStore'
import { ReviewStoreModel } from './ReviewStore'
import { PromoStore } from './PromoStore'
import { AuthStoreModel } from './AuthStore'

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model('RootStore').props({
  categoryStore: types.optional(CategoryStore, {}),
  productStore: types.optional(ProductStore, {}),
  authStore: types.optional(AuthStoreModel, {}),
  userStore: types.optional(UserStore, {}),
  cartStore: types.optional(CartStore, {}),
  orderStore: types.optional(OrderStore, {}),
  uiStore: types.optional(UIStore, {}),
  sessionStore: types.optional(SessionStore, {}),
  reviewStore: types.optional(ReviewStoreModel, {}),
  promoStore: types.optional(PromoStore, {}),
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
