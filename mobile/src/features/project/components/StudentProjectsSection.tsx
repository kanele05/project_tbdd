import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, Button, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { ProjectSubmissionDto } from '@/types/api';

import { PROJECT_CARD_HEIGHT, PROJECT_CARD_WIDTH, ProjectCard } from './ProjectCard';

export type StudentProjectsSectionProps = {
  /** Total number of submissions of the course (title: "12 Student Projects"). */
  count: number;
  submissions: readonly ProjectSubmissionDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

function keyOf(item: ProjectSubmissionDto): string {
  return item.id;
}

function Separator() {
  return <View style={styles.separator} />;
}

/**
 * "{n} Student Projects" + a horizontal list of the newest projects (max 10). The "View more" link
 * of the design is intentionally hidden: the full list is a Could-have (PLAN.md SC-15).
 */
export function StudentProjectsSection({
  count,
  submissions,
  isLoading,
  isError,
  onRetry,
}: StudentProjectsSectionProps) {
  const { t } = useTranslation(['project', 'common']);
  const renderItem = useCallback(
    ({ item }: { item: ProjectSubmissionDto }) => <ProjectCard submission={item} />,
    [],
  );

  let body;
  if (isLoading) {
    body = (
      <View style={styles.skeletons}>
        <Skeleton width={PROJECT_CARD_WIDTH} height={PROJECT_CARD_HEIGHT} borderRadius={16} />
        <Skeleton width={PROJECT_CARD_WIDTH} height={PROJECT_CARD_HEIGHT} borderRadius={16} />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.row}>
        <AppText variant="body" color="textSecondary" style={styles.flex}>
          {t('studentProjectsFailed')}
        </AppText>
        <Button title={t('common:actions.retry')} variant="ghost" size="sm" onPress={onRetry} />
      </View>
    );
  } else if (!submissions || submissions.length === 0) {
    body = (
      <AppText variant="body" color="textSecondary">
        {t('noProjects')}
      </AppText>
    );
  } else {
    body = (
      <FlatList
        horizontal
        data={submissions as ProjectSubmissionDto[]}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        showsHorizontalScrollIndicator={false}
        // Let the cards bleed to the screen edges (the tab has 20 dp padding).
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  return (
    <View style={styles.section}>
      <AppText variant="h3" accessibilityRole="header">
        {t('studentProjects', { count })}
      </AppText>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { marginHorizontal: -layout.screenPaddingX },
  listContent: { paddingHorizontal: layout.screenPaddingX },
  separator: { width: layout.railGap },
  skeletons: { flexDirection: 'row', gap: layout.railGap },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
});
