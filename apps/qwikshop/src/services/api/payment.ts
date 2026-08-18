// Copyright (c) Meta Platforms, Inc. and affiliates.
import { db } from '@/db'
import { eq, and } from 'drizzle-orm'
import { paymentMethods } from '@/db/schema'
import { queries } from '@/db/queries'
import { PaymentMethodType } from '@/models/UserStore'

type PaymentMethodInput = Omit<
  PaymentMethodType,
  'id' | 'userId' | 'isDefault' | 'createdAt' | 'updatedAt'
>

export const paymentService = {
  async getUserPaymentMethods(userId: number) {
    return queries.getAllUserPaymentMethods(userId)
  },

  async createPaymentMethod(userId: number, method: PaymentMethodInput) {
    const result = await db
      .insert(paymentMethods)
      .values({
        userId,
        type: method.type,
        cardType: method.cardType,
        nameOnCard: method.nameOnCard,
        cardNumber: method.cardNumber,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        billingAddressId: method.billingAddressId,
        isDefault: 0,
      })
      .returning()
    return result[0]
  },

  async updatePaymentMethod(
    methodId: number,
    userId: number,
    method: PaymentMethodInput,
  ) {
    await db
      .update(paymentMethods)
      .set({
        type: method.type,
        cardType: method.cardType,
        nameOnCard: method.nameOnCard,
        cardNumber: method.cardNumber,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        billingAddressId: method.billingAddressId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(paymentMethods.id, methodId), eq(paymentMethods.userId, userId)),
      )
  },

  async deletePaymentMethod(methodId: number, userId: number) {
    await db
      .delete(paymentMethods)
      .where(
        and(eq(paymentMethods.id, methodId), eq(paymentMethods.userId, userId)),
      )
  },

  async setDefaultPaymentMethod(methodId: number, userId: number) {
    // First, set all payment methods to non-default
    await db
      .update(paymentMethods)
      .set({ isDefault: 0, updatedAt: new Date() })
      .where(eq(paymentMethods.userId, userId))

    // Then set the selected payment method as default
    await db
      .update(paymentMethods)
      .set({ isDefault: 1, updatedAt: new Date() })
      .where(
        and(eq(paymentMethods.id, methodId), eq(paymentMethods.userId, userId)),
      )
  },
}
