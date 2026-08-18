import { db } from '@/db/index'
import { categories as categoriesTable } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const categoryService = {
  async getCategories() {
    const categories = await db.select().from(categoriesTable)
    return categories
  },

  async getCategoryById(id: string) {
    const category = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
    return category[0]
  },
}
