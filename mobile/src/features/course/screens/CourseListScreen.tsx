import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, EmptyState, ScreenHeader } from '@/components/ui';
import { CourseResults } from '@/features/search/components/CourseResults';
import { DesktopCourseResults } from '@/features/search/components/DesktopCourseResults';
import { useCategories, type CoursesInfiniteParams } from '@/features/search/hooks';
import { openSearchTab } from '@/features/search/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { CourseSection } from '@/types/api';

type CourseListRouteParams = {
  categoryId?: string | string[];
  section?: string | string[];
  teacherId?: string | string[];
  title?: string | string[];
};

function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

function isCourseSection(value: string | undefined): value is CourseSection {
  return value === 'popular' || value === 'recommended' || value === 'inspires';
}

/**
 * SC-08 Course list: courses of a category (`categoryId`), a Home "View more" group (`section`) or
 * a teacher (`teacherId`). Same layout and infinite list as the Search results.
 */
export function CourseListScreen() {
  const { t } = useTranslation(['search', 'common']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const routeParams = useLocalSearchParams<CourseListRouteParams>();
  const categoryId = firstParam(routeParams.categoryId);
  const teacherId = firstParam(routeParams.teacherId);
  const sectionParam = firstParam(routeParams.section);
  const section = isCourseSection(sectionParam) ? sectionParam : undefined;
  const customTitle = firstParam(routeParams.title);

  const { data: categories } = useCategories();
  const categoryName = categories?.find((category) => category.id === categoryId)?.name;
  const title = customTitle ?? (section ? t(`list.${section}`) : categoryName) ?? t('list.all');

  const params = useMemo<CoursesInfiniteParams>(() => {
    const next: CoursesInfiniteParams = {};
    if (categoryId) next.categoryId = categoryId;
    if (teacherId) next.teacherId = teacherId;
    if (section) next.section = section;
    return next;
  }, [categoryId, teacherId, section]);

  const emptyState = (
    <EmptyState
      icon="book-open"
      title={t('empty.title')}
      message={t('list.emptyMessage')}
      actionLabel={t('common:actions.exploreCourses')}
      onAction={openSearchTab}
    />
  );

  if (isWide) {
    return (
      <View style={styles.screen}>
        <DesktopCourseResults
          params={params}
          topContent={
            <AppText variant="h1" accessibilityRole="header" style={styles.desktopTitle}>
              {title}
            </AppText>
          }
          emptyState={emptyState}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <CourseResults
        params={params}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        emptyState={emptyState}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  desktopTitle: { marginBottom: spacing.xl },
}));
