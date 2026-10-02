/**
 * Shared UI strings (English, matching the design). Screen-specific copy may live next to the
 * screen, but anything reused across features belongs here (CLAUDE.md §2).
 */
export const STRINGS = {
  appName: 'E-Learning',

  tabs: {
    home: 'Home',
    search: 'Search',
    myCourses: 'My Courses',
    profile: 'Profile',
  },

  common: {
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    done: 'Done',
    close: 'Close',
    back: 'Back',
    viewMore: 'View more',
    viewAll: 'View all',
    seeMore: 'See more',
    seeLess: 'See less',
    loading: 'Loading...',
    lessons: 'lessons',
    free: 'Free',
    exploreCourses: 'Explore courses',
    bookmark: 'Save course',
    removeBookmark: 'Remove from saved courses',
  },

  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'No internet connection. Please check your network and try again.',
    timeout: 'The request took too long. Please try again.',
    offline: "You're offline",
    sessionExpired: 'Your session has expired. Please log in again.',
    boundaryTitle: 'Something went wrong',
    boundaryMessage: 'The app ran into an unexpected problem. You can try again.',
    loadFailedTitle: "Couldn't load this content",
  },

  empty: {
    defaultTitle: 'Nothing here yet',
  },

  auth: {
    welcomeBack: 'Welcome back!',
    loginSubtitle: 'Log in to continue learning',
    login: 'Log in',
    register: 'Create account',
    createAccountTitle: 'Create your account',
    createAccountSubtitle: 'Start learning with thousands of courses',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    haveAccount: 'Already have an account?',
    logout: 'Log out',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },

  offline: {
    banner: "You're offline - showing saved data",
  },
} as const;

/** User-facing messages for server error codes (PLAN.md §9.4). Falls back to the server message. */
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  UNAUTHORIZED: STRINGS.errors.sessionExpired,
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_TAKEN: 'This email is already registered.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_ENROLLED: 'Enroll in this course to unlock this content.',
  COURSE_NOT_FOUND: 'This course could not be found.',
  LESSON_NOT_FOUND: 'This lesson could not be found.',
  TEACHER_NOT_FOUND: 'This teacher could not be found.',
  QUESTION_NOT_FOUND: 'This question could not be found.',
  ALREADY_ENROLLED: "You're already enrolled in this course.",
  ALREADY_IN_CART: 'This course is already in your cart.',
  FREE_COURSE: 'This course is free - enroll directly.',
  PAID_COURSE: 'This course is not free.',
  CART_EMPTY: 'Your cart is empty.',
  CANNOT_FOLLOW_SELF: "You can't follow yourself.",
  FILE_TOO_LARGE: 'This file is too large (max 10 MB).',
  UNSUPPORTED_FILE_TYPE: 'This file type is not supported.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  PAYMENT_FAILED: 'Payment failed. Your cart is unchanged — please try again.',
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: 'This action conflicts with existing data. Please refresh and try again.',
  PAYLOAD_TOO_LARGE: 'The request is too large.',
  INTERNAL_ERROR: STRINGS.errors.generic,
  NETWORK_ERROR: STRINGS.errors.network,
  TIMEOUT: STRINGS.errors.timeout,
  OFFLINE: STRINGS.errors.offline,
};
