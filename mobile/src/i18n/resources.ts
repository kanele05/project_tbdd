import enAdmin from './locales/en/admin.json';
import enAi from './locales/en/ai.json';
import enAuth from './locales/en/auth.json';
import enCart from './locales/en/cart.json';
import enCommon from './locales/en/common.json';
import enCourse from './locales/en/course.json';
import enErrors from './locales/en/errors.json';
import enHome from './locales/en/home.json';
import enLearning from './locales/en/learning.json';
import enMyCourses from './locales/en/myCourses.json';
import enNotification from './locales/en/notification.json';
import enProfile from './locales/en/profile.json';
import enProject from './locales/en/project.json';
import enQa from './locales/en/qa.json';
import enReview from './locales/en/review.json';
import enSearch from './locales/en/search.json';
import enSettings from './locales/en/settings.json';
import enStudio from './locales/en/studio.json';
import enTeacher from './locales/en/teacher.json';
import enTeaching from './locales/en/teaching.json';
import viAdmin from './locales/vi/admin.json';
import viAi from './locales/vi/ai.json';
import viAuth from './locales/vi/auth.json';
import viCart from './locales/vi/cart.json';
import viCommon from './locales/vi/common.json';
import viCourse from './locales/vi/course.json';
import viErrors from './locales/vi/errors.json';
import viHome from './locales/vi/home.json';
import viLearning from './locales/vi/learning.json';
import viMyCourses from './locales/vi/myCourses.json';
import viNotification from './locales/vi/notification.json';
import viProfile from './locales/vi/profile.json';
import viProject from './locales/vi/project.json';
import viQa from './locales/vi/qa.json';
import viReview from './locales/vi/review.json';
import viSearch from './locales/vi/search.json';
import viSettings from './locales/vi/settings.json';
import viStudio from './locales/vi/studio.json';
import viTeacher from './locales/vi/teacher.json';
import viTeaching from './locales/vi/teaching.json';

/**
 * One namespace per feature so several people can edit translations in parallel without touching
 * the same file. To add a namespace: create `locales/{en,vi}/<name>.json`, import both here and
 * add it to `resources` + `NAMESPACES`.
 */
export const NAMESPACES = [
  'common',
  'errors',
  'auth',
  'home',
  'search',
  'course',
  'cart',
  'learning',
  'qa',
  'review',
  'project',
  'teacher',
  'profile',
  'notification',
  'myCourses',
  'settings',
  'ai',
  'studio',
  'admin',
  'teaching',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE = 'common' satisfies Namespace;

export const resources = {
  en: {
    common: enCommon,
    errors: enErrors,
    auth: enAuth,
    home: enHome,
    search: enSearch,
    course: enCourse,
    cart: enCart,
    learning: enLearning,
    qa: enQa,
    review: enReview,
    project: enProject,
    teacher: enTeacher,
    profile: enProfile,
    notification: enNotification,
    myCourses: enMyCourses,
    settings: enSettings,
    ai: enAi,
    studio: enStudio,
    admin: enAdmin,
    teaching: enTeaching,
  },
  vi: {
    common: viCommon,
    errors: viErrors,
    auth: viAuth,
    home: viHome,
    search: viSearch,
    course: viCourse,
    cart: viCart,
    learning: viLearning,
    qa: viQa,
    review: viReview,
    project: viProject,
    teacher: viTeacher,
    profile: viProfile,
    notification: viNotification,
    myCourses: viMyCourses,
    settings: viSettings,
    ai: viAi,
    studio: viStudio,
    admin: viAdmin,
    teaching: viTeaching,
  },
} as const;
