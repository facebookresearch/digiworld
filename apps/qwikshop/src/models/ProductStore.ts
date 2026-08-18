// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'
import { queries } from '@/db/queries'
import { withSetPropAction } from './helpers/withSetPropAction'

export type Product = {
  id: number
  name: string
  description: string
  shortDescription: string
  price: number
  discountedPrice: number
  discountPercent: number
  imageUrl: string
  images: string[]
  categoryId: number
  categoryName: string
  subcategoryId: number
  subcategoryName?: string
  seller: string
  inStock: boolean
  stockCount: number
  rating: number
  reviewCount: number
  specs: string
  createdAt: string
  updatedAt: string
}

export const ProductModel = types.model('Product').props({
  id: types.number,
  name: types.string,
  description: types.string,
  price: types.number,
  discountedPrice: types.number,
  discountPercent: types.optional(types.number, 0),
  imageUrl: types.string,
  categoryId: types.number,
  categoryName: types.string,
  subcategoryId: types.number,
  seller: types.string,
  inStock: types.boolean,
  createdAt: types.string,
  updatedAt: types.string,
})

const normalizeProductSnapshot = (product: any): Product => {
  const price = Number(product?.price ?? 0)
  const discountedPrice = Number(
    product?.discountedPrice ?? product?.discounted_price ?? price,
  )

  return {
    id: Number(product?.id ?? 0),
    name: product?.name ?? '',
    description: product?.description ?? '',
    shortDescription:
      product?.shortDescription ?? product?.short_description ?? '',
    price,
    discountedPrice,
    discountPercent: Number(
      product?.discountPercent ?? product?.discount_percent ?? 0,
    ),
    imageUrl: product?.imageUrl ?? product?.image_url ?? '',
    images: Array.isArray(product?.images) ? product.images : [],
    categoryId: Number(product?.categoryId ?? product?.category_id ?? 0),
    categoryName: product?.categoryName ?? product?.category_name ?? '',
    subcategoryId: Number(
      product?.subcategoryId ?? product?.subcategory_id ?? 0,
    ),
    subcategoryName:
      product?.subcategoryName ?? product?.subcategory_name ?? '',
    seller: product?.seller ?? '',
    inStock: Boolean(product?.inStock ?? product?.in_stock),
    stockCount: Number(product?.stockCount ?? product?.stock_count ?? 0),
    rating: Number(product?.rating ?? 0),
    reviewCount: Number(product?.reviewCount ?? product?.review_count ?? 0),
    specs:
      typeof product?.specs === 'string'
        ? product.specs
        : JSON.stringify(product?.specs ?? {}),
    createdAt: String(product?.createdAt ?? product?.created_at ?? ''),
    updatedAt: String(product?.updatedAt ?? product?.updated_at ?? ''),
  }
}

export const ProductStore = types
  .model('ProductStore')
  .props({
    products: types.array(types.frozen()),
    selectedCategory: types.optional(
      types.union(types.literal('all'), types.number),
      'all',
    ),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    async loadProducts() {
      self.setProp('isLoading', true)
      self.setProp('error', null)
      try {
        const products = await queries.getProducts()
        if (products) {
          self.setProp('products', products.map(normalizeProductSnapshot))
        } else {
          self.setProp('error', 'Failed to load products')
        }
      } catch (error) {
        self.setProp('error', String(error))
      } finally {
        self.setProp('isLoading', false)
      }
    },

    async loadProductsByCategory(categoryId: number) {
      self.setProp('isLoading', true)
      self.setProp('error', null)
      try {
        const products = await queries.getProductsByCategory(categoryId)
        if (products) {
          self.setProp('products', products.map(normalizeProductSnapshot))
          self.setProp('selectedCategory', categoryId)
        } else {
          self.setProp('error', 'Failed to load products')
        }
      } catch (error) {
        self.setProp('error', String(error))
      } finally {
        self.setProp('isLoading', false)
      }
    },

    setSelectedCategory(categoryId: number | 'all') {
      self.setProp('selectedCategory', categoryId)
    },

    restore(data: any) {
      if (!data) return
      if (data.products) {
        self.products.replace(data.products.map(normalizeProductSnapshot))
      }
      if (data.isLoading !== undefined) self.isLoading = data.isLoading
      if (data.error !== undefined) self.error = data.error
    },
  }))
  .views(store => ({
    get categories() {
      const categories = new Set(store.products.map(p => p.categoryName))
      return ['all', ...Array.from(categories)]
    },

    get filteredProducts() {
      if (store.selectedCategory === 'all') return store.products
      return store.products.filter(
        product => product.categoryId === store.selectedCategory,
      )
    },

    getProductById(id: number) {
      return store.products.find(p => p.id === id)
    },
  }))

export interface ProductStoreModel extends Instance<typeof ProductStore> {}
export interface ProductStoreSnapshotOut
  extends SnapshotOut<typeof ProductStore> {}
export interface ProductStoreSnapshotIn
  extends SnapshotIn<typeof ProductStore> {}
