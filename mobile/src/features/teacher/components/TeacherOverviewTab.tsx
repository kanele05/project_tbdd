import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { TeacherDetail } from '@/types/api';

export type TeacherOverviewTabProps = {
  teacher: TeacherDetail;
};

/** SC-18 OVERVIEW tab: the teacher's bio (the numbers and Follow live in the profile header). */
function TeacherOverviewTabBase({ teacher }: TeacherOverviewTabProps) {
  const { t } = useTranslation('teacher');
  return (
    <View style={styles.container}>
      <AppText variant="bodyLarge" color="textSecondary">
        {teacher.bio ? teacher.bio : t('overviewEmpty')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
  },
});

export const TeacherOverviewTab = memo(TeacherOverviewTabBase);
