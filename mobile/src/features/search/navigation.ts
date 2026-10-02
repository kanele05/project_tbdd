import { router } from 'expo-router';

import type { CourseSection } from '@/types/api';

/** Route helpers shared by Home, Search, Course list and Profile (all routes live in `app/`). */

export type CourseListRouteParams = {
  categoryId?: string;
  section?: CourseSection;
  teacherId?: string;
  /** Optional header title; otherwise derived from `section` / the category name. */
  title?: string;
};

export function openCourse(courseId: string): void {
  router.push(`/course/${courseId}`);
}

export function openCourseList(params: CourseListRouteParams = {}): void {
  const query: Record<string, string> = {};
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.section) query.section = params.section;
  if (params.teacherId) query.teacherId = params.teacherId;
  if (params.title) query.title = params.title;
  router.push({ pathname: '/course-list', params: query });
}

export function openTeacher(teacherId: string): void {
  router.push(`/teacher/${teacherId}`);
}

export function openTopTeachers(): void {
  router.push('/teachers');
}

/** Switch to the Search tab (Home "View more" of Categories, "Explore courses" buttons). */
export function openSearchTab(): void {
  router.navigate('/search');
}
