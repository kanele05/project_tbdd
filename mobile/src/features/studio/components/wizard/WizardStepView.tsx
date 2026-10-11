import { router } from 'expo-router';

import { useTranslation } from '@/i18n';

import type { CourseEditMode } from '../../editMode';
import type { useCourseWizard } from '../../useCourseWizard';
import { CourseEditModeNotice } from '../CourseEditModeNotice';
import { IdeaStep } from './IdeaStep';
import { IntroStep } from './IntroStep';
import { LessonsStep } from './LessonsStep';
import { PriceStep } from './PriceStep';
import { ReviewStep } from './ReviewStep';
import { WizardPage } from './WizardPage';

type Wizard = ReturnType<typeof useCourseWizard>;
type AiScope = 'all' | 'text';

export type WizardStepViewProps = {
  wizard: Wizard;
  mode: CourseEditMode;
};

function openAiDraft(courseId: string, topic: string, scope: AiScope): void {
  router.push({ pathname: '/studio/ai-draft', params: { courseId, topic, scope } });
}

/** The page of the current wizard step: its fields and the Back / Next (or submit) footer. */
export function WizardStepView({ wizard, mode }: WizardStepViewProps) {
  const { t } = useTranslation('studio');
  const { step, form, detail, isBusy } = wizard;
  const banner = (
    <CourseEditModeNotice
      mode={mode}
      isStartingRevision={wizard.isStartingRevision}
      onStartRevision={() => void wizard.startRevision()}
    />
  );
  const onBack = () => void wizard.back();
  const topic = () => form.getValues('title');
  const stepProps = { form, mode, isBusy };

  if (step === 'review') {
    return detail ? (
      <ReviewStep
        detail={detail}
        mode={mode}
        values={wizard.values}
        banner={banner}
        isBusy={isBusy}
        onSelectStep={(target) => void wizard.goTo(target)}
        onBack={onBack}
        saveAll={wizard.saveAll}
      />
    ) : null;
  }

  return (
    <WizardPage
      title={t(`wizard.${step}.title`)}
      hint={t(`wizard.${step}.hint`)}
      banner={banner}
      error={wizard.formError}
      backLabel={t('wizard.back')}
      onBack={onBack}
      primary={{
        title: t('wizard.next'),
        onPress: () => void wizard.next(),
        testID: 'wizard-next',
      }}
      isBusy={isBusy}
    >
      {step === 'idea' ? (
        <IdeaStep {...stepProps} onSuggest={() => openAiDraft(wizard.courseId, topic(), 'all')} />
      ) : null}
      {step === 'intro' ? (
        <IntroStep
          {...stepProps}
          onHelpWrite={() => openAiDraft(wizard.courseId, topic(), 'text')}
        />
      ) : null}
      {step === 'price' ? (
        <PriceStep
          {...stepProps}
          isPaid={wizard.isPaid}
          onPaidChange={wizard.setPaid}
          knownTags={wizard.knownTags}
        />
      ) : null}
      {step === 'lessons' && detail ? (
        <LessonsStep
          detail={detail}
          registerFlush={wizard.registerFlush}
          onSuggestOutline={() => openAiDraft(detail.id, topic(), 'all')}
        />
      ) : null}
    </WizardPage>
  );
}
