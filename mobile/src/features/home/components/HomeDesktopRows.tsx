import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { CourseCardDesktop } from '@/components/course';
import { getPageGutter } from '@/components/layout/pageGutter';
import { HoverRail } from '@/components/ui';
import { OwnedCourseCard } from '@/features/my-courses/components/OwnedCourseCard';
import { useMyCourses } from '@/features/my-courses/hooks';
import {
  openCourseList,
  openSearchTab,
  openTeacher,
  openTopTeachers,
} from '@/features/search/navigation';
import { useQuickCardActions } from '@/features/search/useQuickCardActions';
import { TeacherCard } from '@/features/teacher/components/TeacherCard';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import type {
  CategoryDto,
  CourseSummary,
  HomeResponse,
  MyCourseItem,
  TeacherSummary,
} from '@/types/api';

import { AiRecommendationsCard } from './AiRecommendationsCard';
import { CategoryChips } from './CategoryChips';
import { openLesson } from './ContinueRail';

const MAX_ROW_ITEMS = 12;
const AI_CARD_MAX_WIDTH = 880;

function courseKey(course: CourseSummary): string {
  return course.id;
}
function teacherKey(teacher: TeacherSummary): string {
  return teacher.id;
}
function itemKey(item: MyCourseItem): string {
  return item.course.id;
}

/** "Continue learning" row: courses in progress, newest activity first. Nothing while empty. */
function ContinueRow() {
  const { t } = useTranslation('home');
  const { data } = useMyCourses('ongoing');
  const items = (data ?? []).filter((item) => item.progressPercent < 100).slice(0, MAX_ROW_ITEMS);
  const renderItem = useCallback(
    (item: MyCourseItem, _index: number, width: number) => (
      <OwnedCourseCard item={item} width={width} onOpen={openLesson} />
    ),
    [],
  );
  if (items.length === 0) return null;
  return (
    <HoverRail
      title={t('continue.title')}
      data={items}
      keyExtractor={itemKey}
      renderItem={renderItem}
    />
  );
}

type CourseRowProps = {
  title: string;
  courses: readonly CourseSummary[];
  onViewMore: () => void;
  testID?: string;
};

/** A titled row of hover cards (price, rating, add to cart, save). */
function CourseRow({ title, courses, onViewMore, testID }: CourseRowProps) {
  const { onPress, onToggleBookmark, onAddToCart } = useQuickCardActions();
  const renderItem = useCallback(
    (course: CourseSummary, _index: number, width: number) => (
      <CourseCardDesktop
        course={course}
        width={width}
        onPress={onPress}
        onToggleBookmark={onToggleBookmark}
        onAddToCart={onAddToCart}
      />
    ),
    [onAddToCart, onPress, onToggleBookmark],
  );
  return (
    <HoverRail
      title={title}
      onViewMore={onViewMore}
      data={courses.slice(0, MAX_ROW_ITEMS)}
      keyExtractor={courseKey}
      renderItem={renderItem}
      testID={testID}
    />
  );
}

type TeacherRowProps = { title: string; teachers: readonly TeacherSummary[] };

const TeacherCell = memo(function TeacherCell({
  teacher,
  width,
}: {
  teacher: TeacherSummary;
  width: number;
}) {
  const handlePress = useCallback(() => openTeacher(teacher.id), [teacher.id]);
  return <TeacherCard teacher={teacher} onPress={handlePress} style={{ width }} />;
});

function TeacherRow({ title, teachers }: TeacherRowProps) {
  const renderItem = useCallback(
    (teacher: TeacherSummary, _index: number, width: number) => (
      <TeacherCell teacher={teacher} width={width} />
    ),
    [],
  );
  return (
    <HoverRail
      title={title}
      onViewMore={openTopTeachers}
      data={teachers}
      keyExtractor={teacherKey}
      renderItem={renderItem}
      extraColumns={1}
    />
  );
}

type HomeDesktopRowsProps = { home: HomeResponse; width: number };

/** Every Home section below the billboard as a Netflix row. An empty server list hides its row. */
export function HomeDesktopRows({ home, width }: HomeDesktopRowsProps) {
  const { t } = useTranslation('home');
  const gutter = getPageGutter(width);
  const handlePressCategory = useCallback(
    (category: CategoryDto) => openCourseList({ categoryId: category.id, title: category.name }),
    [],
  );
  return (
    <View style={{ gap: spacing.sm }}>
      <ContinueRow />
      {home.categories.length > 0 ? (
        <CategoryChips
          categories={home.categories}
          onPressCategory={handlePressCategory}
          onPressAll={openSearchTab}
          gutter={gutter}
        />
      ) : null}
      {home.popular.length > 0 ? (
        <CourseRow
          title={t('popular')}
          courses={home.popular}
          onViewMore={() => openCourseList({ section: 'popular' })}
          testID="row-popular"
        />
      ) : null}
      <View style={{ maxWidth: AI_CARD_MAX_WIDTH + gutter * 2 }}>
        <AiRecommendationsCard gutter={gutter} />
      </View>
      {home.recommended.length > 0 ? (
        <CourseRow
          title={t('recommended')}
          courses={home.recommended}
          onViewMore={() => openCourseList({ section: 'recommended' })}
        />
      ) : null}
      {home.inspires.length > 0 ? (
        <CourseRow
          title={t('inspires')}
          courses={home.inspires}
          onViewMore={() => openCourseList({ section: 'inspires' })}
        />
      ) : null}
      {home.topTeachers.length > 0 ? (
        <TeacherRow title={t('topTeachers')} teachers={home.topTeachers} />
      ) : null}
    </View>
  );
}
