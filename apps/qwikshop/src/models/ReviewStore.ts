import { flow, Instance, SnapshotOut, types } from 'mobx-state-tree'
import { withSetPropAction } from './helpers/withSetPropAction'
import { queries } from '@/db/queries'
import type { InferSelectModel } from 'drizzle-orm'
import { reviews } from '@/db/schema'

export const ReviewModel = types.model('Review').props({
  id: types.identifierNumber,
  productId: types.number,
  userId: types.number,
  userName: types.string,
  userAvatar: types.maybeNull(types.string),
  parentReviewId: types.maybeNull(types.number),
  rating: types.maybeNull(types.number),
  title: types.maybeNull(types.string),
  comment: types.string,
  hasImage: types.boolean,
  imageUrl: types.maybeNull(types.string),
  likesCount: types.number,
  likedBy: types.array(types.number),
  replies: types.array(types.frozen()),
  replyCount: types.number,
  isVerifiedPurchase: types.boolean,
  status: types.string,
  reviewDate: types.string,
  createdAt: types.string,
  updatedAt: types.string,
})

type Review = InferSelectModel<typeof reviews>

const MAX_REPLIES_PER_REVIEW = 2

const reviewStoreProps = {
  reviews: types.map(types.frozen()),
  isLoading: types.optional(types.boolean, false),
}

export const ReviewStoreModel = types
  .model('ReviewStore', {
    ...reviewStoreProps,
    isAddReviewVisible: types.optional(types.boolean, false),
    title: types.optional(types.string, ''),
    comment: types.optional(types.string, ''),
    focusedField: types.optional(types.string, ''),
    rating: types.optional(types.number, 5),
  })
  .actions(withSetPropAction)
  .actions(self => {
    function prepareReviewForStore(review: InferSelectModel<typeof reviews>) {
      return {
        ...review,
        hasImage: Boolean(review.hasImage),
        isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
        likedBy: Array.isArray(review.likedBy)
          ? review.likedBy.map(Number)
          : [],
        replies:
          typeof review.replies === 'string' ? JSON.parse(review.replies) : [],
      }
    }

    return {
      resetReviewForm() {
        self.title = ''
        self.comment = ''
        self.focusedField = ''
        self.isAddReviewVisible = false
        self.rating = 5
      },
      setFocusedField(field: string) {
        self.focusedField = field
      },

      setReviewInput({
        title,
        comment,
        rating,
      }: {
        title?: string
        comment?: string
        rating?: number
      }) {
        if (typeof title === 'string') self.title = title
        if (typeof comment === 'string') self.comment = comment
        if (typeof rating === 'number') self.rating = rating
      },

      showAddReview(show: boolean) {
        self.isAddReviewVisible = show
        if (!show) {
          self.title = ''
          self.comment = ''
          self.focusedField = ''
        }
      },

      loadProductReviews: flow(function* (productId: number, offset = 0) {
        self.setProp('isLoading', true)
        try {
          const results: Review[] = yield queries.getProductReviews(
            productId,
            offset,
          )
          const reviewsToUpdate = new Map()
          results.forEach((review: Review) => {
            reviewsToUpdate.set(
              review.id.toString(),
              prepareReviewForStore(review),
            )
          })
          self.reviews.merge(reviewsToUpdate)
        } catch (error) {
          console.error('Error loading reviews:', error)
        } finally {
          self.setProp('isLoading', false)
        }
      }),

      addReview: flow(function* (review: {
        productId: number
        userId: number
        userName: string
        userAvatar?: string
        rating: number
        title?: string
        comment: string
        hasImage?: boolean
        imageUrl?: string
        isVerifiedPurchase?: boolean
      }) {
        try {
          const result = yield queries.addReview(review)
          if (result) {
            self.reviews.set(String(result.id), prepareReviewForStore(result))
            self.title = ''
            self.comment = ''
            self.focusedField = ''
            self.isAddReviewVisible = false
            self.rating = 0
          }
          return result
        } catch (error) {
          console.error('[ReviewStore] Failed to add review:', error)
          throw error
        }
      }),

      addReply: flow(function* (
        parentReviewId: number,
        reply: {
          productId: number
          userId: number
          userName: string
          userAvatar?: string
          comment: string
        },
      ) {
        const parentReview = self.reviews.get(parentReviewId.toString())
        if (!parentReview) throw new Error('Parent review not found')

        if (parentReview.parentReviewId !== null) {
          throw new Error('Cannot reply to a reply')
        }

        const existingReplies = Array.from(self.reviews.values()).filter(
          r => r.parentReviewId === parentReviewId,
        )
        if (existingReplies.length >= MAX_REPLIES_PER_REVIEW) {
          throw new Error(
            `Maximum ${MAX_REPLIES_PER_REVIEW} replies allowed per review`,
          )
        }

        try {
          const result = yield queries.addReply(parentReviewId, reply)
          if (result) {
            const updates = new Map()
            updates.set(result.id.toString(), prepareReviewForStore(result))
            updates.set(parentReviewId.toString(), {
              ...parentReview,
              replyCount: parentReview.replyCount + 1,
            })
            self.reviews.merge(updates)
          }
          return result
        } catch (error) {
          console.error('[ReviewStore] Failed to add reply:', error)
          throw error
        }
      }),

      toggleLike: flow(function* (reviewId: number, userId: number) {
        const reviewKey = reviewId.toString()
        const review = self.reviews.get(reviewKey)
        if (!review) return

        try {
          const likedBy: number[] = Array.isArray(review.likedBy)
            ? review.likedBy.map(Number)
            : []
          const isLiked = likedBy.includes(userId)

          const newLikedBy = isLiked
            ? likedBy.filter(id => id !== userId)
            : [...likedBy, userId]

          self.reviews.set(reviewKey, {
            ...review,
            likesCount: isLiked
              ? Math.max(0, review.likesCount - 1)
              : review.likesCount + 1,
            likedBy: newLikedBy,
          })

          yield queries.toggleReviewLike(reviewId, userId)
        } catch (error) {
          console.error('Error toggling like:', error)

          if (review.productId) {
            const latestReviews: Review[] = yield queries.getProductReviews(
              review.productId,
              0,
            )
            const updatedReview = latestReviews.find(r => r.id === reviewId)
            if (updatedReview) {
              self.reviews.set(reviewKey, prepareReviewForStore(updatedReview))
            }
          }

          throw error
        }
      }),

      restore(snapshot: {
        reviews?: Record<string, any>
        isLoading?: boolean
        title?: string
        comment?: string
        focusedField?: string
        isAddReviewVisible?: boolean
        rating?: number
      }) {
        self.reviews.replace(snapshot.reviews || {})
        self.setProp('isLoading', snapshot.isLoading ?? false)
        self.title = snapshot.title ?? ''
        self.comment = snapshot.comment ?? ''
        self.focusedField = snapshot.focusedField ?? ''
        self.isAddReviewVisible = snapshot.isAddReviewVisible ?? false
        self.rating = snapshot.rating ?? 5
      },

      updateReview(reviewId: number, data: any) {
        const review = self.reviews.get(reviewId.toString())
        if (review) {
          self.reviews.set(reviewId.toString(), { ...review, ...data })
        }
      },
    }
  })
  .views(self => ({
    getProductReviews(productId: number) {
      const reviews = Array.from(self.reviews.values())
      const topLevelReviews = reviews.filter(
        review => review.productId === productId && !review.parentReviewId,
      )
      const repliesMap = new Map()

      reviews.forEach(review => {
        if (review.parentReviewId) {
          const replies = repliesMap.get(review.parentReviewId) || []
          replies.push({
            id: review.id,
            from: review.userName,
            text: review.comment,
            reviewDate: review.reviewDate,
          })
          repliesMap.set(review.parentReviewId, replies)
        }
      })

      return {
        reviews: topLevelReviews.map(review => {
          const storedReplies = review.replies || []
          const linkedReplies = repliesMap.get(review.id) || []
          return {
            ...review,
            replies: [...storedReplies, ...linkedReplies],
          }
        }),
        repliesMap,
      }
    },

    getReviewReplies(reviewId: number) {
      return Array.from(self.reviews.values()).filter(
        review => review.parentReviewId === reviewId,
      )
    },

    isReviewLiked(reviewId: number, userId: number) {
      const review = self.reviews.get(String(reviewId))
      return review ? review.likedBy.includes(userId) : false
    },

    get reviewFormState() {
      return {
        title: self.title,
        comment: self.comment,
        focusedField: self.focusedField,
      }
    },

    get getFocusedField() {
      return self.focusedField
    },
  }))

export interface ReviewStore extends Instance<typeof ReviewStoreModel> {}
export interface ReviewStoreSnapshot
  extends SnapshotOut<typeof ReviewStoreModel> {}
