import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'
import { queries } from '@/db/queries'
import { withSetPropAction } from './helpers/withSetPropAction'

export type Product = {
  id: number
  name: string
  description: string
  price: number
  discountedPrice: number
  imageUrl: string
  categoryId: number
  categoryName: string
  subcategoryId: number
  seller: string
  inStock: boolean
  createdAt: string
  updatedAt: string
}

export const ProductModel = types.model('Product').props({
  id: types.number,
  name: types.string,
  description: types.string,
  price: types.number,
  discountedPrice: types.number,
  imageUrl: types.string,
  categoryId: types.number,
  categoryName: types.string,
  subcategoryId: types.number,
  seller: types.string,
  inStock: types.boolean,
  createdAt: types.string,
  updatedAt: types.string,
})

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
          self.setProp('products', products)
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
          self.setProp('products', products)
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
      if (data.products) self.products.replace(data.products)
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
