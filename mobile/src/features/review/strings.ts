/** Copy of the review feature (English, matching the design). */
export const REVIEW_STRINGS = {
  allReviewsTitle: 'Reviews',
  viewAll: 'View all',
  writeReview: 'Write a review',
  editReview: 'Edit your review',
  allFilter: 'All',
  noReviewsTitle: 'No reviews yet',
  noReviewsMessage: 'Be the first to share what you think about this course.',
  noReviewsForRating: (stars: number) => `No ${stars}-star reviews yet`,
  noReviewsForRatingMessage: 'Try another rating to see more reviews.',
  loadFailed: "Couldn't load the reviews",
  writeTitle: 'Write a review',
  yourRating: 'Your rating',
  yourReview: 'Your review',
  reviewPlaceholder: 'Share your experience with this course',
  submit: 'Submit',
  saved: 'Thanks! Your review was saved.',
  ratingRequired: 'Select a rating from 1 to 5 stars',
  contentMin: 'Write at least 10 characters',
  contentMax: 'Your review can have at most 1000 characters',
  closeForm: 'Close',
  loadMyReviewFailed: "Couldn't load your review",
  summaryTitle: 'Ratings',
} as const;

export const REVIEW_MIN_LENGTH = 10;
export const REVIEW_MAX_LENGTH = 1000;
