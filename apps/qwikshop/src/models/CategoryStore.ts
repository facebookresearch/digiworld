// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { categoryService } from '@/services/api/category'

export const CategoryModel = types.model('Category').props({
  id: types.number,
  name: types.string,
  icon: types.maybeNull(types.string),
  parentCategoryId: types.maybeNull(types.number),
})

export const CategoryStore = types
  .model('CategoryStore')
  .props({
    categories: types.array(types.frozen()),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .actions(self => ({
    setCategories(categories: any[]) {
      self.categories.replace(categories)
    },

    setIsLoading(value: boolean) {
      self.isLoading = value
    },

    setError(value: string | null) {
      self.error = value
    },

    async loadCategories() {
      try {
        const categories = await categoryService.getCategories()
        this.setCategories(categories)
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    },

    restore(data: any) {
      if (!data) return
      if (data.categories) self.categories.replace(data.categories)
      if (data.isLoading !== undefined) self.isLoading = data.isLoading
      if (data.error !== undefined) self.error = data.error
    },
  }))
  .views(store => ({
    get mainCategories() {
      return store.categories.filter(category => !category.parentCategoryId)
    },

    getSubcategories(parentId: number) {
      return store.categories.filter(
        category => category.parentCategoryId === parentId,
      )
    },

    getCategoryById(id: number) {
      return store.categories.find(category => category.id === id)
    },
  }))

export interface CategoryStoreModel extends Instance<typeof CategoryStore> {}
export interface CategoryStoreSnapshotOut
  extends SnapshotOut<typeof CategoryStore> {}
export interface CategoryStoreSnapshotIn
  extends SnapshotIn<typeof CategoryStore> {}
