import { Button } from '@/components/ui/Button';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';

import { getCurriculumTarget } from '../../editMode';
import type { FlushCurriculum } from '../../useCourseWizard';
import { CurriculumContent } from '../CurriculumContent';

export type LessonsStepProps = {
  detail: StudioCourseDetailDto;
  registerFlush: (flush: FlushCurriculum | null) => void;
  /** Opens the AI draft sheet (SC-27) to propose an outline. */
  onSuggestOutline: () => void;
};

/**
 * Step 4 - the curriculum editor of SC-25 (sections, lessons, revision mode of a published
 * course). The AI outline needs a draft / rejected course because it creates sections.
 */
export function LessonsStep({ detail, registerFlush, onSuggestOutline }: LessonsStepProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  return (
    <>
      {getCurriculumTarget(detail) === 'course' ? (
        <Button
          title={t('wizard.lessons.aiOutline')}
          variant="outline"
          leftAdornment={<SparklesIcon size={18} color={colors.primaryText} />}
          onPress={onSuggestOutline}
          fullWidth
          testID="lessons-ai-outline"
        />
      ) : null}
      <CurriculumContent detail={detail} registerFlush={registerFlush} />
    </>
  );
}
