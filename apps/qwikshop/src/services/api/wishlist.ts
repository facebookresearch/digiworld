// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db'
import { and, eq } from 'drizzle-orm'
import { wishlists } from '@/db/schema'
export const getWishlistIds = async (userId: number): Promise<number[]> => {
  const wishlistItems = await db
    .select()
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
  return wishlistItems.map((item: any) => item.productId)
}

export const addToWishlist = async (userId: number, productId: number) => {
  await db.insert(wishlists).values({
    userId,
    productId,
  })
}

export const removeFromWishlist = async (userId: number, productId: number) => {
  await db
    .delete(wishlists)
    .where(
      and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)),
    )
}
