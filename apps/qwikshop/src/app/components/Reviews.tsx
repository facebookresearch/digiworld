import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { useAppTheme, type Theme } from '@andojo/shared-theme'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { format, enUS } from 'date-fns'
import { useStores } from '@/models'
import { AddReview } from './AddReview'

interface ReviewProps {
  id: number
  productId: number
  userName: string
  userAvatar?: string | null
  rating: number
  title?: string | null
  comment: string
  reviewDate: string
  likesCount: number
  isVerifiedPurchase: boolean
  parentReviewId?: number | null
  replies?: {
    id: number
    from: string
    text: string
    reviewDate: string
  }[]
  likedBy: number[]
}

interface ReplyType {
  id: number
  from: string
  text: string
  date: string
}

const StarRating = ({ rating, theme }: { rating: number; theme: Theme }) => {
  return (
    <View style={createStyles(theme).starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <MaterialIcons
          key={star}
          name={star <= rating ? 'star' : 'star-border'}
          size={16}
          color={
            star <= rating
              ? theme.colors.palette.accent500
              : theme.colors.palette.neutral400
          }
          style={createStyles(theme).starIcon}
        />
      ))}
    </View>
  )
}

const ReviewCard = observer(function ReviewCard({
  review,
}: {
  review: ReviewProps
}) {
  const { reviewStore, userStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [isLiking, setIsLiking] = useState(false)

  // Get the current review from the store to ensure reactivity
  const currentReview = reviewStore.reviews.get(review.id.toString())
  const isLiked = useMemo(
    () => currentReview?.likedBy?.includes(userStore.user?.id || 0) || false,
    [currentReview?.likedBy, userStore.user?.id],
  )
  useEffect(() => {
    return () => {
      reviewStore.resetReviewForm()
    }
  }, [])
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Invalid date'
      }
      return format(date, 'MMM d, yyyy', { locale: enUS })
    } catch (error) {
      console.warn('Error formatting date:', error)
      return 'Invalid date'
    }
  }, [])

  const formattedDate = formatDate(review.reviewDate)

  const handleToggleLike = async () => {
    if (!userStore.isAuthenticated || isLiking || !userStore.user?.id) return
    setIsLiking(true)
    try {
      await reviewStore.toggleLike(review.id, userStore.user.id)
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLiking(false)
    }
  }

  // If we don't have the current review data, use the passed review prop
  const displayReview = currentReview || review
  return (
    <View style={styles.reviewCard}>
      {/* User Info & Rating */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserInfo}>
          <Text style={styles.userName}>{displayReview.userName}</Text>
          <View style={styles.ratingContainer}>
            <StarRating rating={displayReview.rating} theme={theme} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>
        {displayReview.isVerifiedPurchase && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Verified Purchase</Text>
          </View>
        )}
      </View>

      {/* Review Content */}
      {displayReview.title && (
        <Text style={styles.reviewTitle}>{displayReview.title}</Text>
      )}
      <Text style={styles.reviewComment}>{displayReview.comment}</Text>

      {/* Helpful Button */}
      <View style={styles.helpfulContainer}>
        <TouchableOpacity
          style={[styles.helpfulButton, isLiked && styles.helpfulButtonActive]}
          onPress={handleToggleLike}
          disabled={isLiking}
        >
          <MaterialCommunityIcons
            name={isLiked ? 'thumb-up' : 'thumb-up-outline'}
            size={16}
            color={
              isLiked ? theme.colors.palette.accent500 : theme.colors.textDim
            }
          />
          {isLiking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="small"
                color={
                  isLiked
                    ? theme.colors.palette.accent500
                    : theme.colors.textDim
                }
              />
            </View>
          ) : (
            <Text
              style={[styles.helpfulText, isLiked && styles.helpfulTextActive]}
            >
              Helpful ({displayReview.likesCount})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Seller Replies */}
      {displayReview?.replies?.map((reply: ReplyType) => (
        <View key={reply.id} style={styles.replyCard}>
          <View style={styles.replyHeader}>
            <MaterialCommunityIcons
              name="store"
              size={16}
              color={theme.colors.palette.accent500}
            />
            <Text style={styles.replyFrom}>Reply from {reply.from}</Text>
          </View>
          <Text style={styles.replyText}>{reply.text}</Text>
          <Text style={styles.replyDate}>{formatDate(reply.date)}</Text>
        </View>
      ))}
    </View>
  )
})

const RatingSummary = observer(function RatingSummary({
  totalReviews,
  averageRating,
  ratingDistribution,
}: {
  totalReviews: number
  averageRating: number
  ratingDistribution: number[]
}) {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const maxCount = Math.max(...ratingDistribution)

  return (
    <View style={styles.ratingSummaryContainer}>
      <View style={styles.ratingHeader}>
        <View style={styles.averageRatingContainer}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <StarRating rating={Math.round(averageRating)} theme={theme} />
          <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
        </View>
        <View style={styles.distributionContainer}>
          {[5, 4, 3, 2, 1].map(rating => (
            <View key={rating} style={styles.ratingRow}>
              <Text style={styles.ratingNumber}>{rating}</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingFill,
                    {
                      width: `${(ratingDistribution[rating - 1] / maxCount) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>
                {ratingDistribution[rating - 1]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
})

export interface ReviewsProps {
  productId: number
}

export const Reviews = observer(function Reviews({ productId }: ReviewsProps) {
  const { reviewStore, userStore } = useStores()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { isAddReviewVisible } = reviewStore
  const listRef = useRef<FlatList<any>>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Load reviews when component mounts
  useEffect(() => {
    console.log('Loading reviews for product:', productId)
    reviewStore.loadProductReviews(productId)
  }, [productId])

  const { reviews } = useMemo(() => {
    return reviewStore.getProductReviews(productId)
  }, [reviewStore.reviews.size, productId])

  const ratingDistribution = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0]
    reviews.forEach(review => {
      if (review.rating) {
        distribution[review.rating - 1]++
      }
    })
    return distribution
  }, [reviews])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
    return sum / reviews.length
  }, [reviews])

  const renderItem = useCallback(({ item: review }: { item: ReviewProps }) => {
    return <ReviewCard review={review} />
  }, [])

  const handleAddReviewSuccess = () => {
    reviewStore.showAddReview(false)
    reviewStore.loadProductReviews(productId)
  }

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y
    setShowBackToTop(offsetY > 200)
  }, [])

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [])

  if (reviews.length === 0 && !isAddReviewVisible) {
    return (
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>What Customers Say</Text>
          {userStore.isAuthenticated && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => reviewStore.showAddReview(true)}
            >
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.noReviewsText}>No reviews yet</Text>
        {isAddReviewVisible && (
          <AddReview
            productId={productId}
            onSuccess={handleAddReviewSuccess}
            onCancel={() => reviewStore.showAddReview(false)}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            What Customers Say ({reviews.length} Reviews)
          </Text>
          {userStore.isAuthenticated && !isAddReviewVisible && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => reviewStore.showAddReview(true)}
            >
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAddReviewVisible && (
          <AddReview
            productId={productId}
            onSuccess={handleAddReviewSuccess}
            onCancel={() => reviewStore.showAddReview(false)}
          />
        )}

        <RatingSummary
          totalReviews={reviews.length}
          averageRating={averageRating}
          ratingDistribution={ratingDistribution}
        />
      </View>

      <FlatList
        ref={listRef}
        data={reviews}
        renderItem={renderItem}
        style={styles.flashList}
        contentContainerStyle={styles.flashListContent}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (reviews.length >= 10) {
            reviewStore.loadProductReviews(productId, reviews.length)
          }
        }}
        onScroll={handleScroll}
      />

      {showBackToTop && (
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-upward"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.backToTopText}>Back to Top</Text>
        </TouchableOpacity>
      )}
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    headerContainer: {
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      flexWrap: 'wrap',
      gap: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    writeReviewButton: {
      backgroundColor: theme.colors.palette.accent500,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    writeReviewText: {
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    noReviewsText: {
      color: theme.colors.textDim,
      marginBottom: 16,
    },
    reviewCard: {
      backgroundColor: theme.colors.background,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    reviewUserInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    starContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    starIcon: {
      marginRight: 2,
    },
    dateText: {
      marginLeft: 8,
      color: theme.colors.textDim,
      fontSize: 12,
    },
    verifiedBadge: {
      backgroundColor: theme.colors.palette.accent500 + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    verifiedText: {
      color: theme.colors.palette.accent500,
      fontSize: 12,
      fontWeight: '500',
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.text,
    },
    reviewComment: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    helpfulContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    helpfulButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.separator,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      minWidth: 100,
    },
    helpfulButtonActive: {
      backgroundColor: theme.colors.palette.accent500 + '15',
    },
    helpfulText: {
      marginLeft: 6,
      color: theme.colors.textDim,
      fontSize: 12,
    },
    helpfulTextActive: {
      color: theme.colors.palette.accent500,
    },
    loadingContainer: {
      marginLeft: 6,
      width: 40,
      alignItems: 'center',
    },
    replyCard: {
      marginTop: 12,
      marginLeft: 24,
      padding: 12,
      backgroundColor: theme.colors.palette.neutral200,
      borderRadius: 8,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.palette.accent500,
    },
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    replyFrom: {
      marginLeft: 6,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.accent500,
    },
    replyText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    replyDate: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textDim,
    },
    backToTopButton: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      backgroundColor: theme.colors.palette.accent500,
      padding: 12,
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
    },
    backToTopText: {
      marginLeft: 8,
      color: theme.colors.palette.neutral100,
      fontWeight: '600',
    },
    flashList: {
      flex: 1,
    },
    flashListContent: {
      padding: 16,
      paddingBottom: 72,
    },
    ratingSummaryContainer: {
      backgroundColor: theme.colors.background,
      padding: 16,
      marginBottom: 16,
      borderRadius: 12,
    },
    ratingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    averageRatingContainer: {
      alignItems: 'center',
      marginRight: 16,
    },
    averageRating: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    totalReviews: {
      marginTop: 4,
      color: theme.colors.textDim,
      fontSize: 12,
    },
    distributionContainer: {
      flex: 1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    ratingNumber: {
      width: 24,
      color: theme.colors.textDim,
    },
    ratingBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.separator,
      marginHorizontal: 8,
      borderRadius: 2,
    },
    ratingFill: {
      height: '100%',
      backgroundColor: theme.colors.palette.accent500,
      borderRadius: 2,
    },
    ratingCount: {
      width: 32,
      color: theme.colors.textDim,
      fontSize: 12,
    },
  })
